/** Ephemeral reader preview. This never writes to a bot, account, or browser storage. */
export type PronounKey = "they" | "she" | "he" | "custom";
export type Pronouns = {
  subj: string;
  obj: string;
  poss: string;
  poss_pr: string;
  refl: string;
};

export const PRONOUN_PRESETS: Record<Exclude<PronounKey, "custom">, Pronouns> = {
  they: { subj: "they", obj: "them", poss: "their", poss_pr: "theirs", refl: "themselves" },
  she: { subj: "she", obj: "her", poss: "her", poss_pr: "hers", refl: "herself" },
  he: { subj: "he", obj: "him", poss: "his", poss_pr: "his", refl: "himself" },
};

/** Escape user-provided text so it cannot become markdown syntax, links, images or HTML. */
function escapeMarkdown(value: string) {
  return value.replace(/[\\`*_{}\[\]()#+.!|>~<\-]/g, "\\$&");
}

const MACRO = /\{\{\s*(user|subj|obj|poss|poss_pr|refl)\s*\}\}/gi;
const ANY_MACRO = /\{\{\s*([^{}\n]{1,60}?)\s*\}\}/g;

export function previewGreeting(source: string, name: string, pronouns: Pronouns) {
  const replacements: Record<string, string> = {
    user: name.trim() || "User",
    subj: pronouns.subj.trim(),
    obj: pronouns.obj.trim(),
    poss: pronouns.poss.trim(),
    poss_pr: pronouns.poss_pr.trim(),
    refl: pronouns.refl.trim(),
  };
  const text = source.replace(MACRO, (full, key: string) => {
    const value = replacements[key.toLowerCase()];
    return value || full;
  });
  const markdown = source.replace(MACRO, (full, key: string) => {
    const value = replacements[key.toLowerCase()];
    return value ? escapeMarkdown(value) : full;
  });
  const unresolved = [...new Set(Array.from(markdown.matchAll(ANY_MACRO), (match) => match[1].trim().toLowerCase() === "char" ? null : match[0]).filter((value): value is string => value !== null))];
  return { markdown, text, unresolved };
}
