// Creator Page link normalization for external, internal, and same-page links.

import { normalizeHttpUrl } from "@/lib/safe-url";

export type CreatorPageLinkKind =
  | "empty"
  | "external"
  | "internal"
  | "anchor"
  | "invalid";

export type CreatorPageLinkResult = {
  raw: string;
  href: string | null;
  kind: CreatorPageLinkKind;
  valid: boolean;
  message: string;
};

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const UNSAFE_SCHEME = /^(?:javascript|data|vbscript|file):/i;

function invalid(raw: string, message: string): CreatorPageLinkResult {
  return { raw, href: null, kind: "invalid", valid: false, message };
}

function normalizeInternal(raw: string): CreatorPageLinkResult {
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return invalid(raw, "Use a Forgeworks path starting with a single /.");
  }

  if (CONTROL_CHARS.test(raw)) {
    return invalid(raw, "This path contains invalid characters.");
  }

  return {
    raw,
    href: raw,
    kind: "internal",
    valid: true,
    message: "Forgeworks page",
  };
}

function normalizeAnchor(raw: string): CreatorPageLinkResult {
  if (!/^#[A-Za-z0-9][A-Za-z0-9\-_.:]*$/.test(raw)) {
    return invalid(raw, "Use an anchor like #characters or #chapter-2.");
  }

  return {
    raw,
    href: raw,
    kind: "anchor",
    valid: true,
    message: "Section on this page",
  };
}

export function normalizeCreatorPageHref(
  value: unknown,
): CreatorPageLinkResult {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return {
      raw: "",
      href: "",
      kind: "empty",
      valid: true,
      message: "No destination",
    };
  }

  if (CONTROL_CHARS.test(raw) || UNSAFE_SCHEME.test(raw)) {
    return invalid(raw, "This link is not allowed.");
  }

  if (raw.startsWith("#")) return normalizeAnchor(raw);
  if (raw.startsWith("/")) return normalizeInternal(raw);

  const normalized = normalizeHttpUrl(raw);

  if (!normalized) {
    return invalid(raw, "Enter a valid HTTP or HTTPS URL.");
  }

  return {
    raw,
    href: normalized,
    kind: "external",
    valid: true,
    message: normalized,
  };
}

export function normalizeCreatorPageHttpUrl(
  value: unknown,
  options: { allowEmpty?: boolean; label?: string } = {},
): CreatorPageLinkResult {
  const raw = String(value ?? "").trim();

  if (!raw && options.allowEmpty !== false) {
    return {
      raw: "",
      href: "",
      kind: "empty",
      valid: true,
      message: options.label ? `No ${options.label}` : "No URL",
    };
  }

  if (!raw || CONTROL_CHARS.test(raw) || UNSAFE_SCHEME.test(raw)) {
    return invalid(
      raw,
      `Enter a valid HTTP or HTTPS ${options.label || "URL"}.`,
    );
  }

  const normalized = normalizeHttpUrl(raw);

  if (!normalized) {
    return invalid(
      raw,
      `Enter a valid HTTP or HTTPS ${options.label || "URL"}.`,
    );
  }

  return {
    raw,
    href: normalized,
    kind: "external",
    valid: true,
    message: normalized,
  };
}

export function normalizeCreatorSectionAnchor(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function getCreatorSectionAnchor(section: {
  id: string;
  config?: Record<string, unknown> | null;
}): string {
  const configured = normalizeCreatorSectionAnchor(section.config?.anchorId);

  if (configured) return configured;

  const compactId = String(section.id || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10)
    .toLowerCase();

  return `section-${compactId || "block"}`;
}

export function inferCreatorPageLinkMode(
  value: unknown,
): "external" | "internal" | "anchor" {
  const raw = String(value ?? "").trim();

  if (raw.startsWith("#")) return "anchor";
  if (raw.startsWith("/") && !raw.startsWith("//")) return "internal";
  return "external";
}

export function normalizeCreatorPageLinkForMode(
  value: unknown,
  mode: "external" | "internal" | "anchor",
): CreatorPageLinkResult {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return {
      raw: "",
      href: "",
      kind: "empty",
      valid: true,
      message: "No destination",
    };
  }

  if (mode === "anchor") {
    return normalizeAnchor(raw.startsWith("#") ? raw : `#${raw}`);
  }

  if (mode === "internal") {
    return normalizeInternal(raw.startsWith("/") ? raw : `/${raw}`);
  }

  return normalizeCreatorPageHref(raw);
}
