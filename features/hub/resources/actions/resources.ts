"use server";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

import {
  createResourceExcerpt,
  createResourceSlug,
} from "@/features/hub/resources/lib/resource-utils";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";

export type ResourceSuggestionInput = {
  sectionId: string | null;
  title: string;
  summary: string;
  url: string;
  label: string;

  submissionType?: "create" | "update";
  targetEntryId?: string | null;
};

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_IMPORT_REDIRECTS = 5;
const IMPORT_TIMEOUT_MS = 10_000;

const MIN_BROAD_EXTRACTION_LENGTH = 800;
const BROAD_EXTRACTION_RATIO = 1.75;

type ResourceStaffRole = "owner" | "moderator";

async function requireResourceStaff() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) {
    return {
      supabase,
      userId: null,
      role: null as ResourceStaffRole | null,
      error: "Unauthenticated",
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("staff_role, is_blocked")
    .eq("id", access.user.id)
    .maybeSingle();

  if (error) {
    return {
      supabase,
      userId: access.user.id,
      role: null as ResourceStaffRole | null,
      error: error.message,
    };
  }

  if (profile?.is_blocked) {
    return {
      supabase,
      userId: access.user.id,
      role: null as ResourceStaffRole | null,
      error: "Account is blocked",
    };
  }

  const role =
    profile?.staff_role === "owner" || profile?.staff_role === "moderator"
      ? profile.staff_role
      : null;

  if (!role) {
    return {
      supabase,
      userId: access.user.id,
      role: null as ResourceStaffRole | null,
      error: "Forbidden",
    };
  }

  return {
    supabase,
    userId: access.user.id,
    role,
    error: null,
  };
}

function normalizeResourceUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    const parsed = new URL(withProtocol);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function isUnsafeHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  if (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost")
  ) {
    return true;
  }

  if (
    /^127\./.test(normalized) ||
    /^10\./.test(normalized) ||
    /^192\.168\./.test(normalized) ||
    /^169\.254\./.test(normalized)
  ) {
    return true;
  }

  const private172 = /^172\.(\d{1,3})\./.exec(normalized);

  if (private172) {
    const second = Number(private172[1]);

    if (second >= 16 && second <= 31) {
      return true;
    }
  }

  return false;
}

function isUnsafeIpAddress(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.startsWith("::ffff:")) {
    const mappedIpv4 = normalized.slice("::ffff:".length);

    if (isIP(mappedIpv4) === 4) {
      return isUnsafeIpAddress(mappedIpv4);
    }
  }

  const version = isIP(normalized);

  if (version === 4) {
    const parts = normalized.split(".").map(Number);

    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
      return true;
    }

    const [a, b] = parts;

    // 0.0.0.0/8
    if (a === 0) return true;

    // 10.0.0.0/8
    if (a === 10) return true;

    // 100.64.0.0/10
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 127.0.0.0/8
    if (a === 127) return true;

    // 169.254.0.0/16
    if (a === 169 && b === 254) return true;

    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;

    // IETF protocol assignments
    if (a === 192 && b === 0 && parts[2] === 0) return true;

    // Documentation ranges
    if (a === 192 && b === 0 && parts[2] === 2) return true;
    if (a === 198 && b === 51 && parts[2] === 100) return true;
    if (a === 203 && b === 0 && parts[2] === 113) return true;

    // Benchmarking range 198.18.0.0/15
    if (a === 198 && (b === 18 || b === 19)) return true;

    // Multicast + reserved
    if (a >= 224) return true;

    return false;
  }

  if (version === 6) {
    if (normalized === "::" || normalized === "::1") {
      return true;
    }

    // Unique local addresses fc00::/7
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
      return true;
    }

    // Link-local fe80::/10
    if (
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    ) {
      return true;
    }

    // Multicast ff00::/8
    if (normalized.startsWith("ff")) {
      return true;
    }

    return false;
  }

  return true;
}

async function validateImportUrl(value: string) {
  const parsed = new URL(value);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("UNSAFE_IMPORT_URL");
  }

  if (isUnsafeHostname(parsed.hostname)) {
    throw new Error("UNSAFE_IMPORT_URL");
  }

  const literalIpVersion = isIP(parsed.hostname);

  if (literalIpVersion !== 0) {
    if (isUnsafeIpAddress(parsed.hostname)) {
      throw new Error("UNSAFE_IMPORT_URL");
    }

    return parsed;
  }

  let addresses: Array<{
    address: string;
    family: number;
  }>;

  try {
    addresses = await lookup(parsed.hostname, {
      all: true,
      verbatim: true,
    });
  } catch {
    throw new Error("IMPORT_DNS_FAILED");
  }

  if (
    addresses.length === 0 ||
    addresses.some((address) => isUnsafeIpAddress(address.address))
  ) {
    throw new Error("UNSAFE_IMPORT_URL");
  }

  return parsed;
}

function isRedirectStatus(status: number) {
  return [301, 302, 303, 307, 308].includes(status);
}

async function fetchImportPage(initialUrl: string, signal: AbortSignal) {
  let currentUrl = initialUrl;

  for (
    let redirectCount = 0;
    redirectCount <= MAX_IMPORT_REDIRECTS;
    redirectCount++
  ) {
    await validateImportUrl(currentUrl);

    const response = await fetch(currentUrl, {
      redirect: "manual",

      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ForgeworksResourceImporter/1.0)",

        Accept: "text/html,application/xhtml+xml",
      },

      signal,

      cache: "no-store",
    });

    if (!isRedirectStatus(response.status)) {
      return {
        response,
        finalUrl: currentUrl,
      };
    }

    if (redirectCount >= MAX_IMPORT_REDIRECTS) {
      throw new Error("TOO_MANY_REDIRECTS");
    }

    const location = response.headers.get("location");

    if (!location) {
      throw new Error("INVALID_REDIRECT");
    }

    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new Error("TOO_MANY_REDIRECTS");
}

function createResourceTurndown(baseUrl: string) {
  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
  });

  turndown.addRule("preserveLineBreaks", {
    filter: "br",

    replacement(_content, node) {
      const nextSibling = node.nextSibling;

      // Consecutive <br> tags usually represent deliberate extra spacing.
      if (
        nextSibling &&
        nextSibling.nodeType === 1 &&
        (nextSibling as HTMLElement).tagName === "BR"
      ) {
        return "  \n\n";
      }

      // Standard Markdown hard line break.
      return "  \n";
    },
  });

  // ------------------------------------------------------------------------
  // Links
  //
  // Preserve the visible text even if the URL itself is unusable.
  // ------------------------------------------------------------------------

  turndown.addRule("safeLinks", {
    filter: "a",

    replacement(content, node) {
      const element = node as HTMLAnchorElement;

      const text = content;
      const visibleText = text.trim();

      const href = element.getAttribute("href")?.trim();

      // No href: preserve whatever visible content existed.
      if (!href) {
        return text;
      }

      try {
        const resolved = new URL(href, baseUrl);

        // Unsupported/dangerous protocol:
        // keep the text, discard only the link.
        if (!["http:", "https:"].includes(resolved.protocol)) {
          return text;
        }

        // Link without visible text.
        if (!visibleText) {
          return resolved.toString();
        }

        const escapedUrl = resolved
          .toString()
          .replace(/\(/g, "\\(")
          .replace(/\)/g, "\\)");

        return `[${visibleText}](${escapedUrl})`;
      } catch {
        return text;
      }
    },
  });

  // ------------------------------------------------------------------------
  // Images
  //
  // Do not hotlink external images yet.
  // Keep useful ALT text instead.
  // ------------------------------------------------------------------------

  turndown.addRule("externalImagesAsText", {
    filter: "img",

    replacement(_content, node) {
      const element = node as HTMLImageElement;

      const alt = element.getAttribute("alt")?.trim();

      return alt || "";
    },
  });

  // ------------------------------------------------------------------------
  // Picture
  // ------------------------------------------------------------------------

  turndown.addRule("picture", {
    filter: "picture",

    replacement(content) {
      return content;
    },
  });

  // ------------------------------------------------------------------------
  // Buttons
  //
  // Remove interactivity but preserve visible text.
  // ------------------------------------------------------------------------

  turndown.addRule("buttonAsText", {
    filter: "button",

    replacement(content) {
      return content.trim();
    },
  });

  // ------------------------------------------------------------------------
  // Details / Summary
  // ------------------------------------------------------------------------

  turndown.addRule("details", {
    filter: "details",

    replacement(content) {
      const trimmed = content.trim();

      return trimmed ? `\n\n${trimmed}\n\n` : "";
    },
  });

  turndown.addRule("summary", {
    filter: "summary",

    replacement(content) {
      const trimmed = content.trim();

      return trimmed ? `**${trimmed}**\n\n` : "";
    },
  });

  // ------------------------------------------------------------------------
  // Media
  // ------------------------------------------------------------------------

  turndown.addRule("mediaAsText", {
    filter: ["video", "audio"],

    replacement(content, node) {
      const element = node as HTMLElement;

      const text = content.trim();

      if (text) {
        return text;
      }

      return element.getAttribute("title")?.trim() || "";
    },
  });

  // ------------------------------------------------------------------------
  // Truly unwanted content
  // ------------------------------------------------------------------------

  turndown.remove(["script", "style", "iframe", "form", "noscript", "source"]);

  return turndown;
}

function normalizeImportedMarkdown(value: string) {
  let markdown = value
    // Normalize operating-system line endings only.
    .replace(/\r\n?/g, "\n")

    // Replace non-breaking spaces with normal spaces.
    .replace(/\u00a0/g, " ");

  // Do NOT:
  // - strip trailing spaces
  // - collapse repeated blank lines
  // - collapse soft breaks
  //
  // Markdown may use trailing spaces for hard line breaks,
  // and repeated blank lines can be meaningful to the imported content.

  if (markdown.length > 100_000) {
    markdown = markdown.slice(0, 100_000);
  }

  return markdown;
}

export async function submitResourceSuggestion(input: ResourceSuggestionInput) {
  try {
    const supabase = await createClient();
    const access = await getCurrentUserAccess(supabase);

    if (!access.user) {
      return {
        success: false,
        error: "You must be signed in to suggest a resource.",
      };
    }

    const submissionType = input.submissionType || "create";
    const targetEntryId = input.targetEntryId || null;

    const title = input.title.trim();
    const summary = input.summary.trim();
    const label = input.label.trim();

    const normalizedUrl = input.url.trim()
      ? normalizeResourceUrl(input.url)
      : null;

    if (!title) {
      return {
        success: false,
        error: "Enter a title.",
      };
    }

    if (title.length > 160) {
      return {
        success: false,
        error: "Title is too long.",
      };
    }

    if (input.url.trim() && !normalizedUrl) {
      return {
        success: false,
        error: "Enter a valid HTTP or HTTPS URL.",
      };
    }

    if (!summary && !normalizedUrl) {
      return {
        success: false,
        error: "Add some content or provide a URL.",
      };
    }

    let sectionId: string | null = null;

    if (input.sectionId) {
      const { data: section, error: sectionError } = await supabase
        .from("hub_resource_sections")
        .select("id")
        .eq("id", input.sectionId)
        .eq("is_published", true)
        .maybeSingle();

      if (sectionError) {
        return {
          success: false,
          error: "Could not verify the selected category.",
        };
      }

      if (!section) {
        return {
          success: false,
          error: "That category is not available.",
        };
      }

      sectionId = section.id;
    }

    if (submissionType === "update") {
      if (!targetEntryId) {
        return {
          success: false,
          error: "Missing resource to update.",
        };
      }

      const { data: targetEntry, error: targetError } = await supabase
        .from("hub_resource_entries")
        .select("id, contributor_user_id")
        .eq("id", targetEntryId)
        .maybeSingle();

      if (targetError || !targetEntry) {
        return {
          success: false,
          error: "Resource not found.",
        };
      }

      if (targetEntry.contributor_user_id !== access.user.id) {
        return {
          success: false,
          error: "You cannot edit this resource.",
        };
      }

      const { data: existingPending } = await supabase
        .from("hub_resource_submissions")
        .select("id")
        .eq("user_id", access.user.id)
        .eq("target_entry_id", targetEntryId)
        .eq("submission_type", "update")
        .eq("status", "pending")
        .maybeSingle();

      if (existingPending) {
        return {
          success: false,
          error: "You already have changes awaiting review for this resource.",
        };
      }
    }

    const { error } = await supabase.from("hub_resource_submissions").insert({
      user_id: access.user.id,

      suggested_section_id: sectionId,

      title,

      summary: summary || null,

      url: normalizedUrl,

      label: label || null,

      status: "pending",

      submission_type: submissionType,

      target_entry_id: submissionType === "update" ? targetEntryId : null,
    });

    if (error) {
      console.error("Resource suggestion insert failed:", error);

      if (error.code === "23505") {
        return {
          success: false,
          error: "You already have changes awaiting review for this resource.",
        };
      }

      return {
        success: false,
        error: "Could not submit the resource suggestion.",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Resource suggestion failed:", error);

    return {
      success: false,
      error: "Could not submit the resource suggestion.",
    };
  }
}

export type ImportedResourceMetadata = {
  siteName: string | null;
  author: string | null;
  excerpt: string | null;
  publishedTime: string | null;
  language: string | null;
  extractionMode: "readability" | "broad";
  wordCount: number;
};

export type ImportResourceResult =
  | {
      success: true;
      resource: {
        title: string;
        summary: string;
        url: string;
        metadata: ImportedResourceMetadata;
      };
    }
  | {
      success: false;
      error: string;
    };

export async function importResourceFromUrl(
  rawUrl: string,
): Promise<ImportResourceResult> {
  try {
    const supabase = await createClient();
    const access = await getCurrentUserAccess(supabase);

    if (!access.user) {
      return {
        success: false,
        error: "You must be signed in to import a resource.",
      };
    }

    const normalizedUrl = normalizeResourceUrl(rawUrl);

    if (!normalizedUrl) {
      return {
        success: false,
        error: "Enter a valid HTTP or HTTPS URL.",
      };
    }

    // ----------------------------------------------------------------------
    // Fetch safely
    // ----------------------------------------------------------------------

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, IMPORT_TIMEOUT_MS);

    let response: Response;

    let finalUrl: string;

    try {
      const fetched = await fetchImportPage(normalizedUrl, controller.signal);

      response = fetched.response;

      finalUrl = fetched.finalUrl;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return {
        success: false,
        error: `The page returned HTTP ${response.status}.`,
      };
    }

    // ----------------------------------------------------------------------
    // Content type
    // ----------------------------------------------------------------------

    const contentType = response.headers.get("content-type") || "";

    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      return {
        success: false,
        error: "That URL does not appear to be a web page.",
      };
    }

    // ----------------------------------------------------------------------
    // Size before reading
    // ----------------------------------------------------------------------

    const contentLength = Number(response.headers.get("content-length") || 0);

    if (contentLength > MAX_IMPORT_BYTES) {
      return {
        success: false,
        error: "That page is too large to import automatically.",
      };
    }

    const html = await response.text();

    if (html.length > MAX_IMPORT_BYTES) {
      return {
        success: false,
        error: "That page is too large to import automatically.",
      };
    }

    // ----------------------------------------------------------------------
    // Readability extraction
    // ----------------------------------------------------------------------

    const readabilityDom = new JSDOM(html, {
      url: finalUrl,
    });

    const reader = new Readability(readabilityDom.window.document);

    const article = reader.parse();

    const readabilityContent = article?.content?.trim() || "";

    const readabilityText = article?.textContent?.trim() || "";

    // ----------------------------------------------------------------------
    // Broader fallback
    //
    // Readability is intentionally aggressive. Resource lists,
    // documentation and link-heavy pages can lose useful content.
    //
    // Build a second untouched DOM and inspect its main content.
    // ----------------------------------------------------------------------

    const broadDom = new JSDOM(html, {
      url: finalUrl,
    });

    const broadDocument = broadDom.window.document;

    const broadRoot =
      broadDocument.querySelector("main") ||
      broadDocument.querySelector("article") ||
      broadDocument.querySelector('[role="main"]') ||
      broadDocument.body;

    const broadContent = broadRoot?.innerHTML?.trim() || "";

    const broadText = broadRoot?.textContent?.trim() || "";

    if (!readabilityContent && !broadContent) {
      return {
        success: false,
        error:
          "Forgeworks could not find readable content on that page. You can still paste the content manually.",
      };
    }

    // ----------------------------------------------------------------------
    // Decide which extraction is better
    // ----------------------------------------------------------------------

    let extractionMode: "readability" | "broad" = "readability";

    let selectedContent = readabilityContent;

    const readabilityLength = readabilityText.length;

    const broadLength = broadText.length;

    const readabilityLooksIncomplete =
      broadLength >= MIN_BROAD_EXTRACTION_LENGTH &&
      (readabilityLength === 0 ||
        broadLength > readabilityLength * BROAD_EXTRACTION_RATIO);

    if (!readabilityContent || readabilityLooksIncomplete) {
      selectedContent = broadContent;

      extractionMode = "broad";
    }

    // ----------------------------------------------------------------------
    // HTML → Markdown
    // ----------------------------------------------------------------------

    const turndown = createResourceTurndown(finalUrl);

    const rawMarkdown = turndown.turndown(selectedContent);

    const markdown = normalizeImportedMarkdown(rawMarkdown);

    if (!markdown) {
      return {
        success: false,
        error:
          "Forgeworks found the page, but could not extract useful written content from it.",
      };
    }

    // ----------------------------------------------------------------------
    // Metadata
    // ----------------------------------------------------------------------

    const wordCount = markdown
      .replace(/[`*_>#\[\]()~-]/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;

    return {
      success: true,

      resource: {
        title: article?.title?.trim() || broadDocument.title?.trim() || "",

        summary: markdown,

        // Use the final URL after redirects.
        url: finalUrl,

        metadata: {
          siteName: article?.siteName?.trim() || null,

          author: article?.byline?.trim() || null,

          excerpt: article?.excerpt?.trim() || null,

          publishedTime: article?.publishedTime || null,

          language: article?.lang || broadDocument.documentElement.lang || null,

          extractionMode,

          wordCount,
        },
      },
    };
  } catch (error) {
    console.error("Resource import failed:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: "The page took too long to respond.",
      };
    }

    if (error instanceof Error && error.message === "UNSAFE_IMPORT_URL") {
      return {
        success: false,
        error: "That URL cannot be imported.",
      };
    }

    if (error instanceof Error && error.message === "IMPORT_DNS_FAILED") {
      return {
        success: false,
        error: "Could not resolve that website.",
      };
    }

    if (error instanceof Error && error.message === "TOO_MANY_REDIRECTS") {
      return {
        success: false,
        error: "That page redirects too many times.",
      };
    }

    if (error instanceof Error && error.message === "INVALID_REDIRECT") {
      return {
        success: false,
        error: "That page returned an invalid redirect.",
      };
    }

    return {
      success: false,
      error: "Could not import that page.",
    };
  }
}

export type ResourceSubmissionReviewInput = {
  submissionId: string;

  sectionId: string;

  title: string;

  summary: string;

  url: string;

  label: string;

  reviewNotes?: string;
};

export async function listPendingResourceSubmissions() {
  const access = await requireResourceStaff();

  if (access.error) {
    return {
      success: false,
      error: access.error,
      submissions: [],
    };
  }

  const { supabase } = access;

  const { data, error } = await supabase
    .from("hub_resource_submissions")
    .select(
      `
      id,
      user_id,
      suggested_section_id,
      title,
      summary,
      url,
      label,
      status,
      submission_type,
      target_entry_id,
      created_at,
      contributor:profiles!hub_resource_submissions_user_id_fkey(
        username,
        display_name,
        avatar_url
      )
    `,
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load resource submissions:", error);

    return {
      success: false,
      error: error.message,
      submissions: [],
    };
  }

  return {
    success: true,
    submissions: data || [],
  };
}

export async function approveResourceSubmission(
  input: ResourceSubmissionReviewInput,
) {
  const access = await requireResourceStaff();

  if (access.error || !access.userId) {
    return {
      success: false,
      error: access.error || "Forbidden",
    };
  }

  const { supabase, userId } = access;

  const title = input.title.trim();
  const summary = input.summary.trim();
  const label = input.label.trim();

  const normalizedUrl = input.url.trim()
    ? normalizeResourceUrl(input.url)
    : null;

  if (!input.sectionId) {
    return {
      success: false,
      error: "Choose a category before approving.",
    };
  }

  if (!title) {
    return {
      success: false,
      error: "Title is required.",
    };
  }

  if (input.url.trim() && !normalizedUrl) {
    return {
      success: false,
      error: "Enter a valid URL.",
    };
  }

  const { data: submission, error: submissionError } = await supabase
    .from("hub_resource_submissions")
    .select("*")
    .eq("id", input.submissionId)
    .eq("status", "pending")
    .maybeSingle();

  if (submissionError || !submission) {
    return {
      success: false,
      error: "Pending submission not found.",
    };
  }

  const { data: section } = await supabase
    .from("hub_resource_sections")
    .select("id")
    .eq("id", input.sectionId)
    .maybeSingle();

  if (!section) {
    return {
      success: false,
      error: "Selected category does not exist.",
    };
  }

  if (submission.submission_type === "update") {
    if (!submission.target_entry_id) {
      return {
        success: false,
        error: "Update submission has no target resource.",
      };
    }

    const { data: targetEntry, error: targetError } = await supabase
      .from("hub_resource_entries")
      .select("id, contributor_user_id")
      .eq("id", submission.target_entry_id)
      .maybeSingle();

    if (targetError || !targetEntry) {
      return {
        success: false,
        error: "Target resource no longer exists.",
      };
    }

    if (targetEntry.contributor_user_id !== submission.user_id) {
      return {
        success: false,
        error: "Contributor does not own the target resource.",
      };
    }

    const { error: updateError } = await supabase
      .from("hub_resource_entries")
      .update({
        section_id: input.sectionId,
        title,
        excerpt: createResourceExcerpt(summary) || null,
        summary: summary || null,
        url: normalizedUrl,
        label: label || null,
      });
  } else {
    const { data: lastEntry } = await supabase
      .from("hub_resource_entries")
      .select("sort_order")
      .eq("section_id", input.sectionId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = (lastEntry?.sort_order ?? -1) + 1;

    const { error: insertError } = await supabase
      .from("hub_resource_entries")
      .insert({
        section_id: input.sectionId,

        title,

        summary: summary || null,

        url: normalizedUrl,

        label: label || null,

        contributor_user_id: submission.user_id,

        slug: createResourceSlug(title),

        excerpt: createResourceExcerpt(summary) || null,

        resource_type: "other",

        source_submission_id: submission.id,

        sort_order: nextSortOrder,

        is_platform_pinned: false,

        is_published: true,
      });

    if (insertError) {
      return {
        success: false,
        error: insertError.message,
      };
    }
  }

  const { error: reviewError } = await supabase
    .from("hub_resource_submissions")
    .update({
      status: "approved",

      reviewed_by: userId,

      reviewed_at: new Date().toISOString(),

      review_notes: input.reviewNotes?.trim() || null,
    })
    .eq("id", submission.id)
    .eq("status", "pending");

  if (reviewError) {
    return {
      success: false,
      error: reviewError.message,
    };
  }

  return {
    success: true,
  };
}

export async function rejectResourceSubmission(
  submissionId: string,
  reviewNotes: string,
) {
  const access = await requireResourceStaff();

  if (access.error || !access.userId) {
    return {
      success: false,
      error: access.error || "Forbidden",
    };
  }

  const { supabase, userId } = access;

  const { error } = await supabase
    .from("hub_resource_submissions")
    .update({
      status: "rejected",

      reviewed_by: userId,

      reviewed_at: new Date().toISOString(),

      review_notes: reviewNotes.trim() || null,
    })
    .eq("id", submissionId)
    .eq("status", "pending");

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
  };
}
