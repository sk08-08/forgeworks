/** External destinations: owner-managed metadata, never an embed or internal path. */
import { normalizeCreatorPageHttpUrl } from "@/features/creator-pages/lib/creator-page-links";

export type BotExternalLink = { platform: string; label?: string; url: string };
export const MAX_BOT_EXTERNAL_LINKS = 10;
export const BOT_PLATFORMS = [
  "Janitor AI",
  "Saucepan",
  "Character.AI",
  "Chub AI",
  "Other",
] as const;

export function validateBotExternalLinks(value: unknown): {
  links: BotExternalLink[];
  error: string | null;
} {
  if (value == null) return { links: [], error: null };
  if (!Array.isArray(value) || value.length > MAX_BOT_EXTERNAL_LINKS)
    return {
      links: [],
      error: `Add no more than ${MAX_BOT_EXTERNAL_LINKS} external platforms.`,
    };
  const links: BotExternalLink[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index++) {
    const entry = value[index];
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      return { links: [], error: `Platform ${index + 1} is invalid.` };
    const raw = entry as Record<string, unknown>;
    if (
      typeof raw.url !== "string" ||
      typeof raw.platform !== "string" ||
      (raw.label != null && typeof raw.label !== "string")
    )
      return { links: [], error: `Platform ${index + 1} is invalid.` };
    const platform = raw.platform.trim();
    const label = typeof raw.label === "string" ? raw.label.trim() : "";
    const inputUrl = raw.url.trim();
    if (!inputUrl)
      return {
        links: [],
        error: `Enter a URL for platform ${index + 1}, or remove it.`,
      };
    if (
      !platform ||
      platform.length > 60 ||
      /[\u0000-\u001f\u007f]/.test(platform) ||
      label.length > 80 ||
      /[\u0000-\u001f\u007f]/.test(label)
    )
      return {
        links: [],
        error: `Check the platform name and label for link ${index + 1}.`,
      };
    if (inputUrl.length > 2048 || /[\s\u0000-\u001f\u007f]/.test(inputUrl))
      return {
        links: [],
        error: `Link ${index + 1} must not contain spaces and must be at most 2048 characters.`,
      };
    const parsed = normalizeCreatorPageHttpUrl(inputUrl, {
      allowEmpty: false,
      label: "bot URL",
    });
    if (!parsed.valid || !parsed.href)
      return {
        links: [],
        error: `Link ${index + 1} must be an HTTP or HTTPS URL.`,
      };
    try {
      const url = new URL(parsed.href);
      if (
        !url.hostname ||
        url.username ||
        url.password ||
        url.toString().length > 2048
      )
        return {
          links: [],
          error: `Link ${index + 1} contains invalid credentials or is too long.`,
        };
      const normalized = url.toString();
      if (seen.has(normalized))
        return {
          links: [],
          error: "The same destination was added more than once.",
        };
      seen.add(normalized);
      links.push({ platform, ...(label ? { label } : {}), url: normalized });
    } catch {
      return { links: [], error: `Link ${index + 1} is invalid.` };
    }
  }
  return { links, error: null };
}

/** Reads untrusted JSONB for display; invalid saved rows yield no links. */
export function getDisplayBotExternalLinks(value: unknown): BotExternalLink[] {
  const result = validateBotExternalLinks(value);
  return result.error ? [] : result.links;
}
