export const MARKDOWN_IMAGE_CONTEXTS = [
  "form",
  "bot",
  "profile",
  "creator-page",
  "resource",
  "community",
  "changelog",
  "generic",
] as const;

export type MarkdownImageContext = (typeof MARKDOWN_IMAGE_CONTEXTS)[number];

export const MARKDOWN_ASSETS_BUCKET = "markdown-assets";

export const MAX_MARKDOWN_IMAGE_SIZE = 5 * 1024 * 1024;

export const MARKDOWN_ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
] as const;
