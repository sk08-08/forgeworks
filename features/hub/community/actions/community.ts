"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import { MARKDOWN_ASSETS_BUCKET } from "@/features/markdown/config/markdown-assets-config";

export type CommunitySubmissionType =
  | "record_create"
  | "record_edit"
  | "source"
  | "timeline_update"
  | "correction"
  | "archive_request"
  | "removal_request";

export type CommunityCategory =
  | "moderation"
  | "creator_concern"
  | "platform_change"
  | "policy"
  | "safety_privacy"
  | "bug_reliability"
  | "community_update"
  | "other";

export type CommunityStatus =
  | "open"
  | "developing"
  | "acknowledged"
  | "resolved"
  | "partially_resolved"
  | "unresolved"
  | "archived";

export type CommunityEvidenceStatus =
  | "reported"
  | "corroborated"
  | "official_response"
  | "confirmed";

export type CommunityImpact = "low" | "moderate" | "high";

export type CommunityDatePrecision = "date" | "datetime";

export type CommunitySourceType =
  | "community"
  | "official"
  | "platform"
  | "social"
  | "article"
  | "other";

export type SubmitCommunitySubmissionInput = {
  submissionType: CommunitySubmissionType;
  targetRecordId?: string | null;

  title?: string;
  summary?: string;
  content?: string;

  suggestedCategory?: CommunityCategory | null;
  suggestedStatus?: CommunityStatus | null;
  suggestedEvidenceStatus?: CommunityEvidenceStatus | null;
  suggestedImpact?: CommunityImpact | null;
  suggestedOccurredAt?: string | null;
  suggestedOccurredAtPrecision?: CommunityDatePrecision | null;
  suggestedContentWarning?: string | null;

  sourceName?: string;
  sourceUrl?: string;
  sourceArchiveUrl?: string;
  sourceType?: CommunitySourceType | null;
  sourceNote?: string;
  sourcePublishedAt?: string | null;

  updateTitle?: string;
  updateBody?: string;
  updateOccurredAt?: string | null;

  details?: string;

  baseRevision?: number | null;

  markdownAssetKey?: string | null;
  markdownAssetPaths?: string[];
};

export type CommunityReviewSubmission = {
  id: string;
  user_id: string;
  submission_type: CommunitySubmissionType;
  target_record_id: string | null;

  title: string | null;
  summary: string | null;
  content: string | null;

  suggested_category: CommunityCategory | null;
  suggested_status: CommunityStatus | null;
  suggested_evidence_status: CommunityEvidenceStatus | null;
  suggested_impact: CommunityImpact | null;
  suggested_occurred_at: string | null;
  suggested_occurred_at_precision: CommunityDatePrecision | null;
  suggested_content_warning: string | null;

  source_name: string | null;
  source_url: string | null;
  source_archive_url: string | null;
  source_type: CommunitySourceType | null;
  source_note: string | null;
  source_published_at: string | null;

  update_title: string | null;
  update_body: string | null;
  update_occurred_at: string | null;

  details: string | null;

  base_revision: number | null;
  markdown_asset_key: string | null;
  markdown_asset_paths: string[];

  review_status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;

  created_at: string;
  updated_at: string;

  contributor: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;

  target: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    content: string | null;
    category: CommunityCategory;
    status: CommunityStatus;
    evidence_status: CommunityEvidenceStatus;
    impact: CommunityImpact | null;
    occurred_at: string | null;
    occurred_at_precision: CommunityDatePrecision;
    content_warning: string | null;
    is_published: boolean;
    contributor_user_id: string | null;
    revision: number;
    markdown_asset_paths: string[];
    source_submission_id: string | null;
  } | null;
};

export type ReviewCommunitySubmissionInput = {
  submissionId: string;
  decision: "approve" | "reject";
  reviewNote?: string;
  confirmStale?: boolean;
  archiveMode?: "archive" | "remove";
};

export type UpdateCommunityRecordDirectInput = {
  recordId: string;
  title?: string;
  summary?: string;
  content?: string;
  category?: CommunityCategory;
  status?: CommunityStatus;
  evidenceStatus?: CommunityEvidenceStatus;
  impact?: CommunityImpact | null;
  occurredAt?: string | null;
  occurredAtPrecision?: CommunityDatePrecision | null;
  contentWarning?: string | null;
  statusNote?: string | null;
  evidenceNote?: string | null;
  isPublished?: boolean;
  isFeatured?: boolean;
  featuredOrder?: number;
  markdownAssetPaths?: string[];
};

export type CreateCommunitySourceDirectInput = {
  recordId: string;
  sourceName: string;
  sourceUrl: string;
  sourceArchiveUrl?: string | null;
  sourceType?: CommunitySourceType | null;
  sourceNote?: string | null;
  sourcePublishedAt?: string | null;
};

export type CreateCommunityTimelineUpdateDirectInput = {
  recordId: string;
  title: string;
  body?: string | null;
  occurredAt: string;
  markdownAssetPaths?: string[];
};

const SUBMISSION_TYPES = new Set<CommunitySubmissionType>([
  "record_create",
  "record_edit",
  "source",
  "timeline_update",
  "correction",
  "archive_request",
  "removal_request",
]);

const CATEGORIES = new Set<CommunityCategory>([
  "moderation",
  "creator_concern",
  "platform_change",
  "policy",
  "safety_privacy",
  "bug_reliability",
  "community_update",
  "other",
]);

const STATUSES = new Set<CommunityStatus>([
  "open",
  "developing",
  "acknowledged",
  "resolved",
  "partially_resolved",
  "unresolved",
  "archived",
]);

const EVIDENCE_STATUSES = new Set<CommunityEvidenceStatus>([
  "reported",
  "corroborated",
  "official_response",
  "confirmed",
]);

const IMPACTS = new Set<CommunityImpact>(["low", "moderate", "high"]);

const SOURCE_TYPES = new Set<CommunitySourceType>([
  "community",
  "official",
  "platform",
  "social",
  "article",
  "other",
]);

function cleanText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  return text.slice(0, maxLength);
}

function normalizeUrl(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
      ? raw
      : `https://${raw}`;

    const parsed = new URL(withProtocol);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeOptionalDate(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function inferDatePrecision(
  rawValue: unknown,
  requested?: CommunityDatePrecision | null,
): CommunityDatePrecision {
  if (requested === "date" || requested === "datetime") {
    return requested;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(String(rawValue ?? "").trim())
    ? "date"
    : "datetime";
}

function exceedsLength(value: unknown, maxLength: number) {
  return String(value ?? "").trim().length > maxLength;
}

function uniqueAssetPaths(paths: unknown) {
  if (!Array.isArray(paths)) {
    return [];
  }

  return Array.from(
    new Set(paths.map((path) => String(path || "").trim()).filter(Boolean)),
  ).slice(0, 30);
}

function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "community-record"
  );
}

async function createUniqueCommunitySlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
) {
  const base = slugify(title);

  const { data, error } = await supabase
    .from("hub_community_records")
    .select("slug")
    .like("slug", `${base}%`);

  if (error) {
    throw error;
  }

  const used = new Set((data || []).map((row) => row.slug));

  if (!used.has(base)) {
    return base;
  }

  let suffix = 2;

  while (used.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

async function getTargetRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recordId: string,
) {
  const { data, error } = await supabase
    .from("hub_community_records")
    .select(
      `
        id,
        slug,
        title,
        summary,
        content,
        category,
        status,
        evidence_status,
        impact,
        occurred_at,
        occurred_at_precision,
        content_warning,
        is_published,
        contributor_user_id,
        revision,
        markdown_asset_paths,
        source_submission_id
      `,
    )
    .eq("id", recordId)
    .maybeSingle();

  if (error) {
    return {
      record: null,
      error: error.message,
    };
  }

  if (!data) {
    return {
      record: null,
      error: "That community record no longer exists.",
    };
  }

  return {
    record: data,
    error: null,
  };
}

async function removeCommunitySubmissionAssets(
  ownerUserId: string,
  inputPaths: unknown,
  preservePaths: unknown = [],
) {
  const paths = uniqueAssetPaths(inputPaths);
  const preserved = new Set(uniqueAssetPaths(preservePaths));
  const ownerPrefix = `${ownerUserId}/community/`;

  const removable = paths.filter(
    (path) =>
      path.startsWith(ownerPrefix) &&
      !path.includes("..") &&
      !preserved.has(path),
  );

  if (removable.length === 0) {
    return {
      success: true,
    };
  }

  const admin = await createAdminClient();

  if (!admin) {
    return {
      success: false,
      error: "Admin storage client is unavailable.",
    };
  }

  const { error } = await admin.storage
    .from(MARKDOWN_ASSETS_BUCKET)
    .remove(removable);

  if (error) {
    console.warn("Community Markdown asset cleanup failed:", error);

    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
  };
}

async function removeObsoleteCommunityRecordAssets(
  inputPaths: unknown,
  preservePaths: unknown = [],
) {
  const paths = uniqueAssetPaths(inputPaths);
  const preserved = new Set(uniqueAssetPaths(preservePaths));

  const removable = paths.filter(
    (path) =>
      /^[^/]+\/community\//.test(path) &&
      !path.includes("..") &&
      !preserved.has(path),
  );

  if (removable.length === 0) {
    return { success: true };
  }

  const admin = await createAdminClient();

  if (!admin) {
    return {
      success: false,
      error: "Admin storage client is unavailable.",
    };
  }

  const { error } = await admin.storage
    .from(MARKDOWN_ASSETS_BUCKET)
    .remove(removable);

  if (error) {
    console.warn("Community record asset cleanup failed:", error);

    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

async function requireStaff() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user || !access.isStaff) {
    return {
      supabase,
      access,
      error: "You do not have permission to review Community submissions.",
    };
  }

  return {
    supabase,
    access,
    error: null,
  };
}

export async function createCommunityRecordDirect(
  input: Omit<
    SubmitCommunitySubmissionInput,
    "submissionType" | "targetRecordId" | "baseRevision"
  >,
) {
  try {
    const auth = await requireStaff();

    if (auth.error || !auth.access.user) {
      return {
        success: false,
        error: auth.error || "Not authorized.",
      };
    }

    if (exceedsLength(input.title, 180)) {
      return {
        success: false,
        error: "Record titles can be up to 180 characters.",
      };
    }

    const title = cleanText(input.title, 180);
    const summary = cleanText(input.summary, 1200);
    const content = cleanText(input.content, 50_000);

    const category =
      input.suggestedCategory && CATEGORIES.has(input.suggestedCategory)
        ? input.suggestedCategory
        : null;

    const status =
      input.suggestedStatus && STATUSES.has(input.suggestedStatus)
        ? input.suggestedStatus
        : "open";

    const evidenceStatus =
      input.suggestedEvidenceStatus &&
      EVIDENCE_STATUSES.has(input.suggestedEvidenceStatus)
        ? input.suggestedEvidenceStatus
        : "reported";

    const impact =
      input.suggestedImpact && IMPACTS.has(input.suggestedImpact)
        ? input.suggestedImpact
        : null;

    const occurredAt = normalizeOptionalDate(input.suggestedOccurredAt);
    const occurredAtPrecision = inferDatePrecision(
      input.suggestedOccurredAt,
      input.suggestedOccurredAtPrecision,
    );
    const contentWarning = cleanText(input.suggestedContentWarning, 500);
    const markdownAssetPaths = uniqueAssetPaths(input.markdownAssetPaths);

    if (!title) {
      return { success: false, error: "Enter a record title." };
    }

    if (!summary) {
      return { success: false, error: "Add a short summary." };
    }

    if (!content) {
      return { success: false, error: "Add context for the record." };
    }

    if (!category) {
      return { success: false, error: "Choose a category." };
    }

    if (exceedsLength(input.sourceName, 120)) {
      return {
        success: false,
        error: "Source names can be up to 120 characters.",
      };
    }

    const sourceName = cleanText(input.sourceName, 120);
    const rawSourceUrl = String(input.sourceUrl ?? "").trim();
    const sourceUrl = rawSourceUrl ? normalizeUrl(rawSourceUrl) : null;

    const rawArchiveUrl = String(input.sourceArchiveUrl ?? "").trim();
    const sourceArchiveUrl = rawArchiveUrl ? normalizeUrl(rawArchiveUrl) : null;

    const sourceType =
      input.sourceType && SOURCE_TYPES.has(input.sourceType)
        ? input.sourceType
        : "community";

    const sourceNote = cleanText(input.sourceNote, 3000);
    const sourcePublishedAt = normalizeOptionalDate(input.sourcePublishedAt);

    const hasPrimarySource = Boolean(
      sourceName ||
      rawSourceUrl ||
      rawArchiveUrl ||
      sourceNote ||
      input.sourcePublishedAt,
    );

    if (hasPrimarySource && !sourceName) {
      return {
        success: false,
        error: "Enter a name for the primary source.",
      };
    }

    if (hasPrimarySource && (!rawSourceUrl || !sourceUrl)) {
      return {
        success: false,
        error: "Enter a valid HTTP or HTTPS URL for the primary source.",
      };
    }

    if (rawArchiveUrl && !sourceArchiveUrl) {
      return {
        success: false,
        error: "Enter a valid archive URL.",
      };
    }

    const slug = await createUniqueCommunitySlug(auth.supabase, title);
    const now = new Date().toISOString();

    const { data: record, error: recordError } = await auth.supabase
      .from("hub_community_records")
      .insert({
        slug,
        title,
        summary,
        content,
        category,
        status,
        evidence_status: evidenceStatus,
        impact,
        occurred_at: occurredAt,
        occurred_at_precision: occurredAtPrecision,
        content_warning: contentWarning,
        is_featured: false,
        featured_order: 0,
        is_published: true,
        published_at: now,
        contributor_user_id: auth.access.user.id,
        revision: 1,
        markdown_asset_paths: markdownAssetPaths,
        last_reviewed_by: auth.access.user.id,
        last_reviewed_at: now,
        source_submission_id: null,
        updated_at: now,
      })
      .select("id, slug")
      .single();

    if (recordError || !record) {
      throw recordError || new Error("Could not create the Community record.");
    }

    if (hasPrimarySource && sourceName && sourceUrl) {
      const { error: sourceError } = await auth.supabase
        .from("hub_community_record_sources")
        .insert({
          record_id: record.id,
          source_name: sourceName,
          source_url: sourceUrl,
          archive_url: sourceArchiveUrl,
          source_type: sourceType,
          note: sourceNote,
          published_at: sourcePublishedAt,
          contributor_user_id: auth.access.user.id,
          sort_order: 0,
          is_published: true,
          source_submission_id: null,
          updated_at: now,
        });

      if (sourceError) {
        // Keep direct creation all-or-nothing from the staff user's perspective.
        await auth.supabase
          .from("hub_community_records")
          .delete()
          .eq("id", record.id);

        throw sourceError;
      }
    }

    return {
      success: true,
      recordId: record.id,
      slug: record.slug,
    };
  } catch (error) {
    console.error("Direct Community record creation failed:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not create the Community record.",
    };
  }
}

export async function updateCommunityRecordDirect(
  input: UpdateCommunityRecordDirectInput,
) {
  try {
    const auth = await requireStaff();

    if (auth.error || !auth.access.user) {
      return { success: false, error: auth.error || "Not authorized." };
    }

    const recordId = String(input.recordId || "").trim();

    if (!recordId) {
      return { success: false, error: "Record is required." };
    }

    const { data: current, error: currentError } = await auth.supabase
      .from("hub_community_records")
      .select(
        "id, title, summary, content, category, status, evidence_status, impact, occurred_at, occurred_at_precision, content_warning, status_note, evidence_note, is_published, published_at, is_featured, featured_order, revision, markdown_asset_paths",
      )
      .eq("id", recordId)
      .maybeSingle();

    if (currentError) throw currentError;
    if (!current) return { success: false, error: "Record not found." };

    if (input.title !== undefined && exceedsLength(input.title, 180)) {
      return {
        success: false,
        error: "Record titles can be up to 180 characters.",
      };
    }

    const nextTitle =
      input.title === undefined ? current.title : cleanText(input.title, 180);
    const nextSummary =
      input.summary === undefined
        ? current.summary
        : cleanText(input.summary, 1200);
    const nextContent =
      input.content === undefined
        ? current.content
        : cleanText(input.content, 50_000);

    if (!nextTitle) return { success: false, error: "Enter a record title." };
    if (!nextSummary) return { success: false, error: "Add a short summary." };
    if (!nextContent) return { success: false, error: "Add record context." };

    const nextCategory =
      input.category === undefined
        ? current.category
        : CATEGORIES.has(input.category)
          ? input.category
          : null;

    const nextStatus =
      input.status === undefined
        ? current.status
        : STATUSES.has(input.status)
          ? input.status
          : null;

    const nextEvidence =
      input.evidenceStatus === undefined
        ? current.evidence_status
        : EVIDENCE_STATUSES.has(input.evidenceStatus)
          ? input.evidenceStatus
          : null;

    if (!nextCategory || !nextStatus || !nextEvidence) {
      return { success: false, error: "Invalid Community record metadata." };
    }

    const nextImpact =
      input.impact === undefined
        ? current.impact
        : input.impact === null
          ? null
          : IMPACTS.has(input.impact)
            ? input.impact
            : null;

    const requestedPublished =
      input.isPublished === undefined
        ? current.is_published
        : input.isPublished;

    // Archived records are always hidden from public Community.
    const nextPublished =
      nextStatus === "archived" ? false : requestedPublished;

    const now = new Date().toISOString();

    const { error } = await auth.supabase
      .from("hub_community_records")
      .update({
        title: nextTitle,
        summary: nextSummary,
        content: nextContent,
        category: nextCategory,
        status: nextStatus,
        evidence_status: nextEvidence,
        impact: nextImpact,
        occurred_at:
          input.occurredAt === undefined
            ? current.occurred_at
            : normalizeOptionalDate(input.occurredAt),
        occurred_at_precision:
          input.occurredAt === undefined
            ? current.occurred_at_precision
            : inferDatePrecision(input.occurredAt, input.occurredAtPrecision),
        content_warning:
          input.contentWarning === undefined
            ? current.content_warning
            : cleanText(input.contentWarning, 500),
        status_note:
          input.statusNote === undefined
            ? current.status_note
            : cleanText(input.statusNote, 1500),
        evidence_note:
          input.evidenceNote === undefined
            ? current.evidence_note
            : cleanText(input.evidenceNote, 1500),
        is_published: nextPublished,
        published_at:
          nextPublished && !current.published_at ? now : current.published_at,
        is_featured:
          nextStatus !== "archived" &&
          nextPublished &&
          (input.isFeatured === undefined
            ? current.is_featured
            : input.isFeatured),
        featured_order:
          nextStatus === "archived"
            ? 0
            : input.featuredOrder === undefined
              ? current.featured_order
              : Math.max(
                  0,
                  Math.min(999, Math.trunc(input.featuredOrder || 0)),
                ),
        revision: Number(current.revision || 0) + 1,
        markdown_asset_paths:
          input.markdownAssetPaths === undefined
            ? current.markdown_asset_paths
            : uniqueAssetPaths(input.markdownAssetPaths),
        last_reviewed_by: auth.access.user.id,
        last_reviewed_at: now,
        updated_at: now,
      })
      .eq("id", recordId);

    if (error) throw error;

    let cleanupWarning: string | undefined;

    if (input.markdownAssetPaths !== undefined) {
      const cleanup = await removeObsoleteCommunityRecordAssets(
        current.markdown_asset_paths,
        input.markdownAssetPaths,
      );

      if (!cleanup.success) {
        cleanupWarning =
          cleanup.error ||
          "The record was saved, but some old images could not be removed.";
      }
    }

    return { success: true, cleanupWarning };
  } catch (error) {
    console.error("Direct Community record update failed:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not update the Community record.",
    };
  }
}

export async function deleteCommunityCommentDirect(commentIdInput: string) {
  try {
    const auth = await requireStaff();

    if (auth.error || !auth.access.user) {
      return { success: false, error: auth.error || "Not authorized." };
    }

    const commentId = String(commentIdInput || "").trim();

    if (!commentId) {
      return { success: false, error: "Comment is required." };
    }

    const { data: comment, error: commentError } = await auth.supabase
      .from("hub_community_record_comments")
      .select("id, deleted_at")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError) throw commentError;

    if (!comment) {
      return { success: false, error: "Comment not found." };
    }

    if (comment.deleted_at) {
      return { success: true, alreadyDeleted: true };
    }

    const now = new Date().toISOString();

    /*
     * Comments already have a deleted_at column and public queries exclude
     * deleted rows, so staff deletion is intentionally a soft delete. This
     * preserves moderation/audit context without leaving the comment visible.
     */
    const { error } = await auth.supabase
      .from("hub_community_record_comments")
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .eq("id", commentId)
      .is("deleted_at", null);

    if (error) throw error;

    return { success: true, alreadyDeleted: false };
  } catch (error) {
    console.error("Direct Community comment deletion failed:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not delete the Community comment.",
    };
  }
}

export async function archiveCommunityRecordDirect(recordIdInput: string) {
  try {
    const auth = await requireStaff();

    if (auth.error || !auth.access.user) {
      return { success: false, error: auth.error || "Not authorized." };
    }

    const recordId = String(recordIdInput || "").trim();

    if (!recordId) {
      return { success: false, error: "Record is required." };
    }

    const { data: current, error: currentError } = await auth.supabase
      .from("hub_community_records")
      .select("id, status, is_featured, revision")
      .eq("id", recordId)
      .maybeSingle();

    if (currentError) throw currentError;
    if (!current) return { success: false, error: "Record not found." };

    if (current.status === "archived") {
      return { success: true, alreadyArchived: true };
    }

    const now = new Date().toISOString();

    const { error } = await auth.supabase
      .from("hub_community_records")
      .update({
        status: "archived",
        is_published: false,
        is_featured: false,
        featured_order: 0,
        revision: Number(current.revision || 0) + 1,
        last_reviewed_by: auth.access.user.id,
        last_reviewed_at: now,
        updated_at: now,
      })
      .eq("id", recordId);

    if (error) throw error;

    return { success: true, alreadyArchived: false };
  } catch (error) {
    console.error("Direct Community record archive failed:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not archive the Community record.",
    };
  }
}

export async function unarchiveCommunityRecordDirect(recordIdInput: string) {
  try {
    const auth = await requireStaff();

    if (auth.error || !auth.access.user) {
      return { success: false, error: auth.error || "Not authorized." };
    }

    const recordId = String(recordIdInput || "").trim();

    if (!recordId) {
      return { success: false, error: "Record is required." };
    }

    const { data: current, error: currentError } = await auth.supabase
      .from("hub_community_records")
      .select("id, status, revision")
      .eq("id", recordId)
      .maybeSingle();

    if (currentError) throw currentError;
    if (!current) return { success: false, error: "Record not found." };

    if (current.status !== "archived") {
      return { success: true, alreadyRestored: true };
    }

    const now = new Date().toISOString();

    const { error } = await auth.supabase
      .from("hub_community_records")
      .update({
        status: "open",
        is_published: true,
        is_featured: false,
        featured_order: 0,
        revision: Number(current.revision || 0) + 1,
        last_reviewed_by: auth.access.user.id,
        last_reviewed_at: now,
        updated_at: now,
      })
      .eq("id", recordId);

    if (error) throw error;

    return { success: true, alreadyRestored: false };
  } catch (error) {
    console.error("Direct Community record restore failed:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not restore the Community record.",
    };
  }
}

export async function deleteCommunityRecordDirect(recordIdInput: string) {
  try {
    const auth = await requireStaff();

    if (auth.error || !auth.access.user) {
      return { success: false, error: auth.error || "Not authorized." };
    }

    const recordId = String(recordIdInput || "").trim();

    if (!recordId) {
      return { success: false, error: "Record is required." };
    }

    /*
     * Collect every managed Markdown asset that will become unreachable when
     * the record is deleted. Related rows use ON DELETE CASCADE, but Storage
     * objects are not database rows and need explicit cleanup.
     */
    const [recordResult, updatesResult, submissionsResult] = await Promise.all([
      auth.supabase
        .from("hub_community_records")
        .select("id, markdown_asset_paths")
        .eq("id", recordId)
        .maybeSingle(),

      auth.supabase
        .from("hub_community_record_updates")
        .select("markdown_asset_paths")
        .eq("record_id", recordId),

      auth.supabase
        .from("hub_community_submissions")
        .select("markdown_asset_paths")
        .eq("target_record_id", recordId),
    ]);

    if (recordResult.error) throw recordResult.error;
    if (updatesResult.error) throw updatesResult.error;
    if (submissionsResult.error) throw submissionsResult.error;

    if (!recordResult.data) {
      return { success: false, error: "Record not found." };
    }

    const assetPaths = uniqueAssetPaths([
      ...(recordResult.data.markdown_asset_paths || []),
      ...(updatesResult.data || []).flatMap(
        (row: any) => row.markdown_asset_paths || [],
      ),
      ...(submissionsResult.data || []).flatMap(
        (row: any) => row.markdown_asset_paths || [],
      ),
    ]);

    /*
     * The Community foreign keys that point at records are ON DELETE CASCADE,
     * so deleting this row also removes its sources, timeline updates,
     * comments, helpful marks, relations and target submissions.
     */
    const { error: deleteError } = await auth.supabase
      .from("hub_community_records")
      .delete()
      .eq("id", recordId);

    if (deleteError) throw deleteError;

    let cleanupWarning: string | undefined;

    if (assetPaths.length > 0) {
      const cleanup = await removeObsoleteCommunityRecordAssets(assetPaths, []);

      if (!cleanup.success) {
        cleanupWarning =
          cleanup.error ||
          "The record was deleted, but some uploaded images could not be removed.";
      }
    }

    return { success: true, cleanupWarning };
  } catch (error) {
    console.error("Direct Community record deletion failed:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not delete the Community record.",
    };
  }
}

export async function createCommunitySourceDirect(
  input: CreateCommunitySourceDirectInput,
) {
  try {
    const auth = await requireStaff();

    if (auth.error || !auth.access.user) {
      return { success: false, error: auth.error || "Not authorized." };
    }

    if (exceedsLength(input.sourceName, 120)) {
      return {
        success: false,
        error: "Source names can be up to 120 characters.",
      };
    }

    const sourceName = cleanText(input.sourceName, 120);
    const rawSourceUrl = String(input.sourceUrl || "").trim();
    const sourceUrl = normalizeUrl(rawSourceUrl);

    const rawArchiveUrl = String(input.sourceArchiveUrl || "").trim();
    const archiveUrl = rawArchiveUrl ? normalizeUrl(rawArchiveUrl) : null;

    const sourceType =
      input.sourceType && SOURCE_TYPES.has(input.sourceType)
        ? input.sourceType
        : "community";

    if (!sourceName) return { success: false, error: "Enter a source name." };

    if (!sourceUrl) {
      return {
        success: false,
        error: "Enter a valid HTTP or HTTPS source URL.",
      };
    }

    if (rawArchiveUrl && !archiveUrl) {
      return { success: false, error: "Enter a valid archive URL." };
    }

    const now = new Date().toISOString();

    const { error } = await auth.supabase
      .from("hub_community_record_sources")
      .insert({
        record_id: input.recordId,
        source_name: sourceName,
        source_url: sourceUrl,
        archive_url: archiveUrl,
        source_type: sourceType,
        note: cleanText(input.sourceNote, 3000),
        published_at: normalizeOptionalDate(input.sourcePublishedAt),
        contributor_user_id: auth.access.user.id,
        sort_order: 0,
        is_published: true,
        source_submission_id: null,
        updated_at: now,
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Direct Community source creation failed:", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not add the source.",
    };
  }
}

export async function createCommunityTimelineUpdateDirect(
  input: CreateCommunityTimelineUpdateDirectInput,
) {
  try {
    const auth = await requireStaff();

    if (auth.error || !auth.access.user) {
      return { success: false, error: auth.error || "Not authorized." };
    }

    if (exceedsLength(input.title, 180)) {
      return {
        success: false,
        error: "Update titles can be up to 180 characters.",
      };
    }

    const title = cleanText(input.title, 180);
    const occurredAt = normalizeOptionalDate(input.occurredAt);

    if (!title) return { success: false, error: "Enter an update title." };
    if (!occurredAt) {
      return { success: false, error: "Choose when the update occurred." };
    }

    const now = new Date().toISOString();

    const { error } = await auth.supabase
      .from("hub_community_record_updates")
      .insert({
        record_id: input.recordId,
        title,
        body: cleanText(input.body, 30_000),
        occurred_at: occurredAt,
        source_id: null,
        contributor_user_id: auth.access.user.id,
        sort_order: 0,
        is_published: true,
        markdown_asset_paths: uniqueAssetPaths(input.markdownAssetPaths),
        source_submission_id: null,
        updated_at: now,
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Direct Community timeline update failed:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not add the timeline update.",
    };
  }
}

export async function submitCommunitySubmission(
  input: SubmitCommunitySubmissionInput,
) {
  try {
    const supabase = await createClient();
    const access = await getCurrentUserAccess(supabase);

    if (!access.user) {
      return {
        success: false,
        error: "You must be signed in to contribute.",
      };
    }

    const submissionType = input.submissionType;

    if (!SUBMISSION_TYPES.has(submissionType)) {
      return {
        success: false,
        error: "Invalid contribution type.",
      };
    }

    const targetRecordId = cleanText(input.targetRecordId, 100) || null;
    const requiresTarget = submissionType !== "record_create";

    if (requiresTarget && !targetRecordId) {
      return {
        success: false,
        error: "This contribution needs a target record.",
      };
    }

    if (submissionType === "record_create" && targetRecordId) {
      return {
        success: false,
        error: "A new record cannot target an existing record.",
      };
    }

    let targetRecord: {
      id: string;
      contributor_user_id: string | null;
      revision: number;
      is_published: boolean;
    } | null = null;

    if (targetRecordId) {
      const targetResult = await getTargetRecord(supabase, targetRecordId);

      if (targetResult.error || !targetResult.record) {
        return {
          success: false,
          error: targetResult.error || "Could not verify the target record.",
        };
      }

      targetRecord = targetResult.record;
    }

    const ownerOnly =
      submissionType === "record_edit" ||
      submissionType === "archive_request" ||
      submissionType === "removal_request";

    if (ownerOnly && targetRecord?.contributor_user_id !== access.user.id) {
      return {
        success: false,
        error:
          submissionType === "record_edit"
            ? "Only the contributor can submit an edit for this record."
            : "Only the contributor can request archival or removal of this record.",
      };
    }

    if (
      submissionType === "record_edit" ||
      submissionType === "archive_request" ||
      submissionType === "removal_request"
    ) {
      const { data: existingPending, error: pendingError } = await supabase
        .from("hub_community_submissions")
        .select("id")
        .eq("user_id", access.user.id)
        .eq("submission_type", submissionType)
        .eq("target_record_id", targetRecordId!)
        .eq("review_status", "pending")
        .limit(1);

      if (pendingError) {
        return {
          success: false,
          error: "Could not check your pending contributions.",
        };
      }

      if ((existingPending || []).length > 0) {
        return {
          success: false,
          error:
            submissionType === "record_edit"
              ? "You already have a pending edit for this record."
              : "You already have a pending archive/removal request for this record.",
        };
      }
    }

    if (
      (submissionType === "record_create" ||
        submissionType === "record_edit") &&
      exceedsLength(input.title, 180)
    ) {
      return {
        success: false,
        error: "Record titles can be up to 180 characters.",
      };
    }

    const title = cleanText(input.title, 180);
    const summary = cleanText(input.summary, 1200);
    const content = cleanText(input.content, 50_000);

    const suggestedCategory =
      input.suggestedCategory && CATEGORIES.has(input.suggestedCategory)
        ? input.suggestedCategory
        : null;

    const suggestedStatus =
      input.suggestedStatus && STATUSES.has(input.suggestedStatus)
        ? input.suggestedStatus
        : null;

    const suggestedEvidenceStatus =
      input.suggestedEvidenceStatus &&
      EVIDENCE_STATUSES.has(input.suggestedEvidenceStatus)
        ? input.suggestedEvidenceStatus
        : null;

    const suggestedImpact =
      input.suggestedImpact && IMPACTS.has(input.suggestedImpact)
        ? input.suggestedImpact
        : null;

    const suggestedOccurredAt = normalizeOptionalDate(
      input.suggestedOccurredAt,
    );
    const suggestedOccurredAtPrecision = inferDatePrecision(
      input.suggestedOccurredAt,
      input.suggestedOccurredAtPrecision,
    );

    const suggestedContentWarning = cleanText(
      input.suggestedContentWarning,
      500,
    );

    if (
      submissionType === "record_create" ||
      submissionType === "record_edit"
    ) {
      if (!title) {
        return {
          success: false,
          error: "Enter a record title.",
        };
      }

      if (!summary) {
        return {
          success: false,
          error: "Add a short summary.",
        };
      }

      if (!content) {
        return {
          success: false,
          error: "Add context for the record.",
        };
      }

      if (!suggestedCategory) {
        return {
          success: false,
          error: "Choose a category.",
        };
      }
    }

    if (
      (submissionType === "source" || submissionType === "record_create") &&
      exceedsLength(input.sourceName, 120)
    ) {
      return {
        success: false,
        error: "Source names can be up to 120 characters.",
      };
    }

    const sourceName = cleanText(input.sourceName, 120);
    const rawSourceUrl = String(input.sourceUrl ?? "").trim();
    const sourceUrl = normalizeUrl(rawSourceUrl);

    const rawArchiveUrl = String(input.sourceArchiveUrl ?? "").trim();
    const sourceArchiveUrl = rawArchiveUrl ? normalizeUrl(rawArchiveUrl) : null;

    const sourceType =
      input.sourceType && SOURCE_TYPES.has(input.sourceType)
        ? input.sourceType
        : null;

    const sourceNote = cleanText(input.sourceNote, 3000);
    const sourcePublishedAt = normalizeOptionalDate(input.sourcePublishedAt);

    const hasInitialSource =
      submissionType === "record_create" &&
      Boolean(
        sourceName ||
        rawSourceUrl ||
        rawArchiveUrl ||
        sourceNote ||
        input.sourcePublishedAt,
      );

    if (submissionType === "source" || hasInitialSource) {
      if (!sourceName) {
        return {
          success: false,
          error:
            submissionType === "source"
              ? "Enter a source name."
              : "Enter a name for the primary source.",
        };
      }

      if (!rawSourceUrl || !sourceUrl) {
        return {
          success: false,
          error:
            submissionType === "source"
              ? "Enter a valid HTTP or HTTPS source URL."
              : "Enter a valid HTTP or HTTPS URL for the primary source.",
        };
      }

      if (rawArchiveUrl && !sourceArchiveUrl) {
        return {
          success: false,
          error: "Enter a valid archive URL.",
        };
      }
    }

    if (
      submissionType === "timeline_update" &&
      exceedsLength(input.updateTitle, 180)
    ) {
      return {
        success: false,
        error: "Update titles can be up to 180 characters.",
      };
    }

    const updateTitle = cleanText(input.updateTitle, 180);
    const updateBody = cleanText(input.updateBody, 30_000);
    const updateOccurredAt = normalizeOptionalDate(input.updateOccurredAt);

    if (submissionType === "timeline_update") {
      if (!updateTitle) {
        return {
          success: false,
          error: "Enter a title for the update.",
        };
      }

      if (!updateOccurredAt) {
        return {
          success: false,
          error: "Choose when the update occurred.",
        };
      }
    }

    const details = cleanText(input.details, 12_000);

    if (
      (submissionType === "correction" ||
        submissionType === "archive_request" ||
        submissionType === "removal_request") &&
      !details
    ) {
      return {
        success: false,
        error:
          submissionType === "correction"
            ? "Explain what should be corrected."
            : "Explain why you want this record archived or removed.",
      };
    }

    const markdownAssetKey = cleanText(input.markdownAssetKey, 100);

    const markdownAssetPaths = uniqueAssetPaths(input.markdownAssetPaths);

    const baseRevision = Number.isFinite(input.baseRevision)
      ? Number(input.baseRevision)
      : targetRecord && Number.isFinite(targetRecord.revision)
        ? targetRecord.revision
        : null;

    const { data: submission, error } = await supabase
      .from("hub_community_submissions")
      .insert({
        user_id: access.user.id,
        submission_type: submissionType,
        target_record_id: targetRecordId,

        title:
          submissionType === "record_create" || submissionType === "record_edit"
            ? title
            : null,

        summary:
          submissionType === "record_create" || submissionType === "record_edit"
            ? summary
            : null,

        content:
          submissionType === "record_create" || submissionType === "record_edit"
            ? content
            : null,

        suggested_category:
          submissionType === "record_create" || submissionType === "record_edit"
            ? suggestedCategory
            : null,

        suggested_status:
          submissionType === "record_edit" ? suggestedStatus : null,

        suggested_evidence_status:
          submissionType === "record_edit" ? suggestedEvidenceStatus : null,

        suggested_impact:
          submissionType === "record_create" || submissionType === "record_edit"
            ? suggestedImpact
            : null,

        suggested_occurred_at:
          submissionType === "record_create" || submissionType === "record_edit"
            ? suggestedOccurredAt
            : null,

        suggested_occurred_at_precision:
          submissionType === "record_create" || submissionType === "record_edit"
            ? suggestedOccurredAtPrecision
            : null,

        suggested_content_warning:
          submissionType === "record_create" || submissionType === "record_edit"
            ? suggestedContentWarning
            : null,

        source_name:
          submissionType === "source" || submissionType === "record_create"
            ? sourceName
            : null,

        source_url:
          submissionType === "source" || submissionType === "record_create"
            ? sourceUrl
            : null,

        source_archive_url:
          submissionType === "source" || submissionType === "record_create"
            ? sourceArchiveUrl
            : null,

        source_type:
          submissionType === "source" || submissionType === "record_create"
            ? sourceType || "community"
            : null,

        source_note:
          submissionType === "source" || submissionType === "record_create"
            ? sourceNote
            : null,

        source_published_at:
          submissionType === "source" || submissionType === "record_create"
            ? sourcePublishedAt
            : null,

        update_title: submissionType === "timeline_update" ? updateTitle : null,

        update_body: submissionType === "timeline_update" ? updateBody : null,

        update_occurred_at:
          submissionType === "timeline_update" ? updateOccurredAt : null,

        details:
          submissionType === "correction" ||
          submissionType === "archive_request" ||
          submissionType === "removal_request"
            ? details
            : null,

        base_revision:
          submissionType === "record_edit" ||
          submissionType === "correction" ||
          submissionType === "timeline_update" ||
          submissionType === "source" ||
          submissionType === "archive_request" ||
          submissionType === "removal_request"
            ? baseRevision
            : null,

        markdown_asset_key: markdownAssetKey,
        markdown_asset_paths: markdownAssetPaths,
        review_status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Community submission insert failed:", error);

      return {
        success: false,
        error: error.message || "Could not submit your contribution.",
      };
    }

    return {
      success: true,
      submissionId: submission.id,
    };
  } catch (error) {
    console.error("Community submission failed:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not submit your contribution.",
    };
  }
}

export async function getPendingCommunitySubmissions() {
  try {
    const auth = await requireStaff();

    if (auth.error) {
      return {
        success: false,
        error: auth.error,
        submissions: [] as CommunityReviewSubmission[],
      };
    }

    const { data, error } = await auth.supabase
      .from("hub_community_submissions")
      .select(
        `
          id,
          user_id,
          submission_type,
          target_record_id,
          title,
          summary,
          content,
          suggested_category,
          suggested_status,
          suggested_evidence_status,
          suggested_impact,
          suggested_occurred_at,
          suggested_occurred_at_precision,
          suggested_content_warning,
          source_name,
          source_url,
          source_archive_url,
          source_type,
          source_note,
          source_published_at,
          update_title,
          update_body,
          update_occurred_at,
          details,
          base_revision,
          markdown_asset_key,
          markdown_asset_paths,
          review_status,
          reviewed_by,
          review_note,
          reviewed_at,
          created_at,
          updated_at,
          contributor:profiles!hub_community_submissions_user_id_fkey(
            username,
            display_name,
            avatar_url
          ),
          target:hub_community_records!hub_community_submissions_target_record_id_fkey(
            id,
            slug,
            title,
            summary,
            content,
            category,
            status,
            evidence_status,
            impact,
            occurred_at,
            occurred_at_precision,
            content_warning,
            is_published,
            contributor_user_id,
            revision,
            markdown_asset_paths,
            source_submission_id
          )
        `,
      )
      .eq("review_status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const submissions = (data || []).map((row: any) => ({
      ...row,
      contributor: Array.isArray(row.contributor)
        ? (row.contributor[0] ?? null)
        : row.contributor,
      target: Array.isArray(row.target) ? (row.target[0] ?? null) : row.target,
      markdown_asset_paths: Array.isArray(row.markdown_asset_paths)
        ? row.markdown_asset_paths
        : [],
    })) as CommunityReviewSubmission[];

    return {
      success: true,
      submissions,
    };
  } catch (error) {
    console.error("Failed to load Community review queue:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not load Community submissions.",
      submissions: [] as CommunityReviewSubmission[],
    };
  }
}

export async function reviewCommunitySubmission(
  input: ReviewCommunitySubmissionInput,
) {
  try {
    const auth = await requireStaff();

    if (auth.error || !auth.access.user) {
      return {
        success: false,
        error: auth.error || "Not authorized.",
      };
    }

    const submissionId = cleanText(input.submissionId, 100);

    if (!submissionId) {
      return {
        success: false,
        error: "Invalid submission.",
      };
    }

    const reviewNote = cleanText(input.reviewNote, 5000);
    const reviewedAt = new Date().toISOString();

    const { data: submission, error: submissionError } = await auth.supabase
      .from("hub_community_submissions")
      .select("*")
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError) {
      throw submissionError;
    }

    if (!submission) {
      return {
        success: false,
        error: "Submission not found.",
      };
    }

    if (submission.review_status !== "pending") {
      return {
        success: false,
        error: "This submission has already been reviewed.",
      };
    }

    if (input.decision === "reject") {
      const { error } = await auth.supabase
        .from("hub_community_submissions")
        .update({
          review_status: "rejected",
          reviewed_by: auth.access.user.id,
          review_note: reviewNote,
          reviewed_at: reviewedAt,
          updated_at: reviewedAt,
        })
        .eq("id", submission.id)
        .eq("review_status", "pending");

      if (error) {
        throw error;
      }

      let preservePaths: string[] = [];

      if (submission.target_record_id) {
        const targetResult = await getTargetRecord(
          auth.supabase,
          submission.target_record_id,
        );

        preservePaths = uniqueAssetPaths(
          targetResult.record?.markdown_asset_paths,
        );
      }

      const cleanup = await removeCommunitySubmissionAssets(
        submission.user_id,
        submission.markdown_asset_paths,
        preservePaths,
      );

      return {
        success: true,
        decision: "rejected" as const,
        cleanupWarning: cleanup.success
          ? undefined
          : cleanup.error || "Could not remove rejected submission images.",
      };
    }

    const type = submission.submission_type as CommunitySubmissionType;

    let target: Awaited<ReturnType<typeof getTargetRecord>>["record"] | null =
      null;

    if (type !== "record_create") {
      if (!submission.target_record_id) {
        return {
          success: false,
          error: "This submission no longer has a target record.",
        };
      }

      const targetResult = await getTargetRecord(
        auth.supabase,
        submission.target_record_id,
      );

      if (targetResult.error || !targetResult.record) {
        return {
          success: false,
          error: targetResult.error || "The target record could not be loaded.",
        };
      }

      target = targetResult.record;
    }

    const hasRevisionDrift =
      type !== "record_create" &&
      !!target &&
      submission.base_revision !== null &&
      submission.base_revision !== target.revision;

    const requiresStaleConfirmation =
      type === "record_edit" && hasRevisionDrift;

    if (requiresStaleConfirmation && !input.confirmStale) {
      return {
        success: false,
        code: "STALE_REVISION",
        stale: true,
        currentRevision: target!.revision,
        baseRevision: submission.base_revision,
        error:
          "This edit was based on an older revision. Confirm the stale review before approving.",
      };
    }

    /*
     * Claim the pending row before materializing it. This prevents two staff
     * sessions from approving the same submission at the same time without
     * adding a public "processing" review state.
     */
    const { data: claimedSubmission, error: claimError } = await auth.supabase
      .from("hub_community_submissions")
      .update({
        reviewed_by: auth.access.user.id,
        reviewed_at: reviewedAt,
        updated_at: reviewedAt,
      })
      .eq("id", submission.id)
      .eq("review_status", "pending")
      .is("reviewed_at", null)
      .select("id")
      .maybeSingle();

    if (claimError) {
      throw claimError;
    }

    if (!claimedSubmission) {
      return {
        success: false,
        error:
          "This submission is already being reviewed in another staff session. Refresh the queue.",
      };
    }

    try {
      if (type === "record_create") {
        const { data: alreadyCreated, error: alreadyCreatedError } =
          await auth.supabase
            .from("hub_community_records")
            .select("id")
            .eq("source_submission_id", submission.id)
            .maybeSingle();

        if (alreadyCreatedError) {
          throw alreadyCreatedError;
        }

        if (!alreadyCreated) {
          const title = String(submission.title || "").trim();

          if (!title) {
            throw new Error("The submitted record has no title.");
          }

          const slug = await createUniqueCommunitySlug(auth.supabase, title);

          const { error: insertRecordError } = await auth.supabase
            .from("hub_community_records")
            .insert({
              slug,
              title,
              summary: submission.summary,
              content: submission.content,
              category: submission.suggested_category || "other",
              status: "open",
              evidence_status: "reported",
              impact: submission.suggested_impact,
              occurred_at: submission.suggested_occurred_at,
              occurred_at_precision:
                submission.suggested_occurred_at_precision || "datetime",
              content_warning: submission.suggested_content_warning,
              is_featured: false,
              featured_order: 0,
              is_published: true,
              published_at: reviewedAt,
              contributor_user_id: submission.user_id,
              revision: 1,
              markdown_asset_paths: uniqueAssetPaths(
                submission.markdown_asset_paths,
              ),
              last_reviewed_by: auth.access.user.id,
              last_reviewed_at: reviewedAt,
              source_submission_id: submission.id,
              updated_at: reviewedAt,
            });

          if (insertRecordError) {
            throw insertRecordError;
          }
        }

        if (submission.source_name && submission.source_url) {
          const { data: createdRecord, error: createdRecordError } =
            await auth.supabase
              .from("hub_community_records")
              .select("id")
              .eq("source_submission_id", submission.id)
              .single();

          if (createdRecordError) {
            throw createdRecordError;
          }

          const {
            data: existingPrimarySource,
            error: existingPrimarySourceError,
          } = await auth.supabase
            .from("hub_community_record_sources")
            .select("id")
            .eq("source_submission_id", submission.id)
            .maybeSingle();

          if (existingPrimarySourceError) {
            throw existingPrimarySourceError;
          }

          if (!existingPrimarySource) {
            const { error: primarySourceError } = await auth.supabase
              .from("hub_community_record_sources")
              .insert({
                record_id: createdRecord.id,
                source_name: submission.source_name,
                source_url: submission.source_url,
                archive_url: submission.source_archive_url,
                source_type: submission.source_type || "community",
                note: submission.source_note,
                published_at: submission.source_published_at,
                contributor_user_id: submission.user_id,
                sort_order: 0,
                is_published: true,
                source_submission_id: submission.id,
                updated_at: reviewedAt,
              });

            if (primarySourceError) {
              throw primarySourceError;
            }
          }
        }
      } else if (type === "record_edit") {
        if (!target) {
          throw new Error("Target record missing.");
        }

        if (target.source_submission_id !== submission.id) {
          const { error: updateRecordError } = await auth.supabase
            .from("hub_community_records")
            .update({
              title: submission.title || target.title,
              summary: submission.summary,
              content: submission.content,
              category: submission.suggested_category || target.category,
              status: submission.suggested_status || target.status,
              evidence_status:
                submission.suggested_evidence_status || target.evidence_status,
              impact: submission.suggested_impact,
              occurred_at: submission.suggested_occurred_at,
              occurred_at_precision:
                submission.suggested_occurred_at_precision ||
                target.occurred_at_precision ||
                "datetime",
              content_warning: submission.suggested_content_warning,
              revision: target.revision + 1,
              markdown_asset_paths: uniqueAssetPaths(
                submission.markdown_asset_paths,
              ),
              last_reviewed_by: auth.access.user.id,
              last_reviewed_at: reviewedAt,
              source_submission_id: submission.id,
              updated_at: reviewedAt,
            })
            .eq("id", target.id);

          if (updateRecordError) {
            throw updateRecordError;
          }

          await removeCommunitySubmissionAssets(
            submission.user_id,
            target.markdown_asset_paths,
            submission.markdown_asset_paths,
          );
        }
      } else if (type === "source") {
        const { data: existingSource, error: existingSourceError } =
          await auth.supabase
            .from("hub_community_record_sources")
            .select("id")
            .eq("source_submission_id", submission.id)
            .maybeSingle();

        if (existingSourceError) {
          throw existingSourceError;
        }

        if (!existingSource) {
          if (!submission.source_name || !submission.source_url) {
            throw new Error("The submitted source is incomplete.");
          }

          const { error: insertSourceError } = await auth.supabase
            .from("hub_community_record_sources")
            .insert({
              record_id: submission.target_record_id,
              source_name: submission.source_name,
              source_url: submission.source_url,
              archive_url: submission.source_archive_url,
              source_type: submission.source_type || "community",
              note: submission.source_note,
              published_at: submission.source_published_at,
              contributor_user_id: submission.user_id,
              sort_order: 0,
              is_published: true,
              source_submission_id: submission.id,
              updated_at: reviewedAt,
            });

          if (insertSourceError) {
            throw insertSourceError;
          }
        }
      } else if (type === "timeline_update") {
        const { data: existingUpdate, error: existingUpdateError } =
          await auth.supabase
            .from("hub_community_record_updates")
            .select("id")
            .eq("source_submission_id", submission.id)
            .maybeSingle();

        if (existingUpdateError) {
          throw existingUpdateError;
        }

        if (!existingUpdate) {
          if (!submission.update_title || !submission.update_occurred_at) {
            throw new Error("The submitted timeline update is incomplete.");
          }

          const { error: insertUpdateError } = await auth.supabase
            .from("hub_community_record_updates")
            .insert({
              record_id: submission.target_record_id,
              title: submission.update_title,
              body: submission.update_body,
              occurred_at: submission.update_occurred_at,
              source_id: null,
              contributor_user_id: submission.user_id,
              sort_order: 0,
              is_published: true,
              markdown_asset_paths: uniqueAssetPaths(
                submission.markdown_asset_paths,
              ),
              source_submission_id: submission.id,
              updated_at: reviewedAt,
            });

          if (insertUpdateError) {
            throw insertUpdateError;
          }
        }
      } else if (type === "archive_request" || type === "removal_request") {
        if (!target) {
          throw new Error("Target record missing.");
        }

        if (target.source_submission_id !== submission.id) {
          const shouldRemove =
            type === "removal_request" || input.archiveMode === "remove";

          const { error: archiveError } = await auth.supabase
            .from("hub_community_records")
            .update({
              status: "archived",
              is_published: shouldRemove ? false : target.is_published,
              revision: target.revision + 1,
              last_reviewed_by: auth.access.user.id,
              last_reviewed_at: reviewedAt,
              source_submission_id: submission.id,
              updated_at: reviewedAt,
            })
            .eq("id", target.id);

          if (archiveError) {
            throw archiveError;
          }
        }
      } else if (type === "correction") {
        /*
         * A correction only contains an explanation, not a structured patch.
         * Approving it records that staff accepted/reviewed the correction.
         * The actual record edit can be applied separately through staff record
         * management without inventing field changes from free-form text.
         */
        if (target) {
          const { error: touchError } = await auth.supabase
            .from("hub_community_records")
            .update({
              last_reviewed_by: auth.access.user.id,
              last_reviewed_at: reviewedAt,
              updated_at: reviewedAt,
            })
            .eq("id", target.id);

          if (touchError) {
            throw touchError;
          }
        }
      } else {
        throw new Error("Unsupported submission type.");
      }

      const { error: reviewError } = await auth.supabase
        .from("hub_community_submissions")
        .update({
          review_status: "approved",
          reviewed_by: auth.access.user.id,
          review_note: reviewNote,
          reviewed_at: reviewedAt,
          updated_at: reviewedAt,
        })
        .eq("id", submission.id)
        .eq("review_status", "pending");

      if (reviewError) {
        throw reviewError;
      }

      return {
        success: true,
        decision: "approved" as const,
        revisionDrift: hasRevisionDrift,
      };
    } catch (materializeError) {
      /*
       * Release the claim when a normal materialization error is caught so
       * staff can retry instead of leaving the submission locked.
       */
      await auth.supabase
        .from("hub_community_submissions")
        .update({
          reviewed_by: null,
          reviewed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", submission.id)
        .eq("review_status", "pending")
        .eq("reviewed_by", auth.access.user.id);

      throw materializeError;
    }
  } catch (error) {
    console.error("Community submission review failed:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not review the Community submission.",
    };
  }
}
