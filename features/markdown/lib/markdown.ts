// ============================================================================
// Forgeworks - Markdown Utilities
// ============================================================================

/**
 * Strip Markdown syntax and return plain text.
 *
 * Intended for:
 * - compact UI labels
 * - cards
 * - table cells
 * - previews where rich formatting is not needed
 */
export function stripMarkdownToText(md?: string | null): string {
  if (!md) {
    return "";
  }

  let text = String(md);

  // Images: ![alt](url) -> alt
  text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "$1");

  // Links: [label](url) -> label
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

  // Forgeworks custom colors:
  // [text]{#06b6d4} -> text
  text = text.replace(/\[([^\]]+)\]\{#[0-9a-fA-F]{3,8}\}/g, "$1");

  // Fenced code blocks
  text = text.replace(/`{3}[\s\S]*?`{3}/g, " ");

  // Inline code
  text = text.replace(/`([^`]+)`/g, "$1");

  // Headings
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");

  // Blockquotes
  text = text.replace(/^\s{0,3}>\s?/gm, "");

  // Horizontal rules
  text = text.replace(
    /^\s{0,3}(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/gm,
    " ",
  );

  // Bullet lists
  text = text.replace(/^\s{0,3}[-*+]\s+/gm, "");

  // Numbered lists
  text = text.replace(/^\s{0,3}\d+\.\s+/gm, "");

  // Bold / italic / strike
  text = text.replace(/\*\*|__|\*|_|~~/g, "");

  return text.replace(/\s+/g, " ").trim();
}
