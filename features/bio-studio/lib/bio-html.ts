import type {
  BioDiagnostic,
  BioStats,
  JaiBioImportPackage,
} from "../types/bio-types";

const SCRIPT_BLOCK_RE = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const SCRIPT_TAG_RE = /<script\b[^>]*\/?>/gi;
const INLINE_HANDLER_RE = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URL_RE =
  /\s+(href|src|xlink:href|action)\s*=\s*(['"]?)\s*javascript:[^\s>]*\2/gi;

export function stripBioJavaScript(source: string) {
  return String(source || "")
    .replace(SCRIPT_BLOCK_RE, "")
    .replace(SCRIPT_TAG_RE, "")
    .replace(INLINE_HANDLER_RE, "")
    .replace(JS_URL_RE, "");
}

export function sanitizeBioForPreview(source: string) {
  return stripBioJavaScript(source);
}

/**
 * Rewrite tag whitespace without touching quoted attributes. In export mode,
 * ordinary source-text newlines become spaces and HTML comments are omitted;
 * pre/code/textarea/style contents remain intact. The regular format path
 * still retains text nodes byte-for-byte. Not a security sanitizer.
 */
function mapBioTags(
  source: string,
  transform: (tag: string) => string,
  options?: { exportMode?: boolean },
) {
  const normalizeText = (text: string) =>
    options?.exportMode ? text.replace(/[ \t]*\r?\n[ \t]*/g, " ") : text;
  let output = "";
  let index = 0;
  let rawTag: string | null = null;

  while (index < source.length) {
    if (rawTag) {
      const remainder = source.slice(index);
      const closing = new RegExp(`<\\s*\\/\\s*${rawTag}\\b`, "i").exec(
        remainder,
      );
      if (!closing) return output + remainder;
      const end = index + closing.index;
      output += source.slice(index, end);
      index = end;
      rawTag = null;
    }

    const open = source.indexOf("<", index);
    if (open < 0) return output + normalizeText(source.slice(index));
    output += normalizeText(source.slice(index, open));

    // Comments, CDATA, doctypes and processing instructions remain untouched.
    if (source.startsWith("<!--", open)) {
      const end = source.indexOf("-->", open + 4);
      if (end < 0) return output + source.slice(open);
      if (!options?.exportMode) output += source.slice(open, end + 3);
      index = end + 3;
      continue;
    }
    if (source.startsWith("<![CDATA[", open)) {
      const end = source.indexOf("]]>", open + 9);
      if (end < 0) return output + source.slice(open);
      output += source.slice(open, end + 3);
      index = end + 3;
      continue;
    }
    if (!/^<\/?[a-z][\w:-]*(?=[\s/>])/i.test(source.slice(open))) {
      output += "<";
      index = open + 1;
      continue;
    }

    let quote = "";
    let end = open + 1;
    for (; end < source.length; end++) {
      const char = source[end];
      if (quote) {
        if (char === quote) quote = "";
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === ">") {
        break;
      }
    }
    if (end >= source.length) return output + source.slice(open);

    const tag = source.slice(open, end + 1);
    output += transform(tag);
    index = end + 1;

    const name = /^<([a-z][\w:-]*)/i.exec(tag)?.[1]?.toLowerCase();
    if (
      name &&
      ["script", "style", "pre", "textarea", "code"].includes(name) &&
      !/\/\s*>$/.test(tag)
    ) {
      rawTag = name;
    }
  }
  return output;
}

function rewriteTagWhitespace(
  tag: string,
  multiline: boolean,
  exportMode = false,
) {
  // Attribute strings (including CSS, URLs and literal >) remain unchanged.
  if (!/^<[a-z]/i.test(tag)) return tag;
  const name = /^<([a-z][\w:-]*)/i.exec(tag);
  if (!name) return tag;

  const start = name[0].length;
  let quote = "";
  let out = tag.slice(0, start);
  let attributes = 0;

  for (let i = start; i < tag.length; i++) {
    const char = tag[i];
    if (quote) {
      // Multi-line inline CSS must not introduce new Markdown source lines.
      // In HTML attributes, an ordinary source newline is whitespace.
      out += exportMode && (char === "\n" || char === "\r") ? " " : char;
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      out += char;
      continue;
    }
    if (!/\s/.test(char)) {
      out += char;
      continue;
    }
    let end = i;
    while (end < tag.length && /\s/.test(tag[end])) end++;
    const next = tag[end] || "";
    const prev = out.at(-1) || "";
    const attributeBoundary =
      next !== "" &&
      next !== ">" &&
      next !== "/" &&
      next !== "=" &&
      prev !== "=" &&
      prev !== "/";
    if (attributeBoundary) {
      attributes++;
      out += multiline ? "\n  " : " ";
    } else if (next === "=" || prev === "=") {
      // Removing spaces around '=' is valid only inside a tag and not quotes.
      if (multiline) out += " ";
    } else if (multiline) {
      out += tag.slice(i, end);
    }
    i = end - 1;
  }

  // Do not unnecessarily reformat a tag with a single attribute.
  return multiline && attributes < 2 ? tag : out;
}

/**
 * Export-only normalizer for JAI's Markdown wrapper. It never alters the
 * original document held by Bio Studio. Preserves quoted attributes/URLs and
 * raw content in pre/code/textarea/style while removing comments and replacing
 * ordinary source newlines with spaces outside tags. Do not run on the editor
 * value or assume this is an HTML security sanitizer.
 */
export function prepareBioForJai(source: string) {
  return mapBioTags(
    stripBioJavaScript(source),
    (tag) => rewriteTagWhitespace(tag, false, true),
    { exportMode: true },
  ).trim();
}

export function basicMinifyBioHtml(source: string) {
  return prepareBioForJai(source);
}

export function formatBioHtml(source: string) {
  // Formatting attributes only deliberately avoids creating text nodes between
  // tags. A full prettifier would change inline spacing and preformatted bios.
  return mapBioTags(String(source || ""), (tag) =>
    rewriteTagWhitespace(tag, true),
  );
}

function utf8Length(value: string) {
  return new TextEncoder().encode(String(value)).byteLength;
}

export function getBioStats(source: string, output: string): BioStats {
  const sourceBytes = utf8Length(source);
  const outputBytes = utf8Length(output);
  const savedBytes = Math.max(0, sourceBytes - outputBytes);
  const savedPercent = sourceBytes > 0 ? (savedBytes / sourceBytes) * 100 : 0;

  return {
    sourceBytes,
    outputBytes,
    savedBytes,
    savedPercent,
  };
}

export function analyzeBioHtml(source: string): BioDiagnostic[] {
  const html = String(source || "");
  const diagnostics: BioDiagnostic[] = [];

  if (!html.trim()) {
    return [
      {
        id: "empty",
        level: "info",
        title: "Nothing to preview yet",
        detail: "Import a JAI bio or start writing HTML.",
      },
    ];
  }

  if (/<script\b/i.test(html)) {
    diagnostics.push({
      id: "script",
      level: "warning",
      title: "Script tags will be removed",
      detail: "Executable JavaScript is never included in preview or export.",
    });
  }

  if (/\son[a-z]+\s*=/i.test(html)) {
    diagnostics.push({
      id: "handlers",
      level: "warning",
      title: "Inline event handlers will be removed",
      detail: "Attributes such as onclick and onload are not preserved.",
    });
  }

  if (/javascript:/i.test(html)) {
    diagnostics.push({
      id: "javascript-url",
      level: "warning",
      title: "javascript: URLs will be removed",
    });
  }

  if (/\bwidth\s*:\s*\d{3,}px/i.test(html)) {
    diagnostics.push({
      id: "fixed-width",
      level: "warning",
      title: "Large fixed widths detected",
      detail:
        "Pixel widths can overflow narrow JAI layouts. Prefer max-width:100% or responsive units.",
    });
  }

  if (/<iframe\b/i.test(html)) {
    diagnostics.push({
      id: "iframe",
      level: "info",
      title: "Embedded iframe detected",
      detail:
        "The Bio Studio preview is sandboxed; third-party embeds may behave differently on JanitorAI.",
    });
  }

  if (utf8Length(html) > 100 * 1024) {
    diagnostics.push({
      id: "large-source",
      level: "warning",
      title: "Large HTML source",
      detail:
        "This bio is over 100 KiB. Consider simplifying repeated inline styles before publishing.",
    });
  }

  const tags = html.match(/<[a-z][^>]*>/gi)?.length ?? 0;

  diagnostics.push({
    id: "parsed",
    level: "info",
    title: `${tags} HTML element${tags === 1 ? "" : "s"} detected`,
  });

  diagnostics.push({
    id: "preview",
    level: "info",
    title: "Preview isolated",
    detail: "The bio renders inside a sandboxed iframe.",
  });

  return diagnostics;
}

export function parseBioImportInput(input: string): {
  html: string;
  package: JaiBioImportPackage | null;
} {
  const raw = String(input || "").trim();
  if (!raw) return { html: "", package: null };

  try {
    const parsed = JSON.parse(raw) as Partial<JaiBioImportPackage>;
    if (
      parsed &&
      parsed.forgeworks === "jai-bio" &&
      parsed.version === 1 &&
      typeof parsed.html === "string"
    ) {
      return {
        html: parsed.html,
        package: parsed as JaiBioImportPackage,
      };
    }
  } catch {
    // Raw HTML is a valid import path.
  }

  return { html: raw, package: null };
}
