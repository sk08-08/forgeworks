import type { BotVersionSnapshot } from "@/features/bots/types/bot-types";
import type { BotCollaborationField } from "@/features/bots/lib/collaboration-permissions";
import type { WorkspaceBotValues } from "./collaboration-types";

export type DiffChunkType = "equal" | "added" | "removed";

export interface DiffChunk {
  type: DiffChunkType;
  value: string;
}

export interface ArrayDiff {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export const BOT_DIFF_FIELDS = [
  "name",
  "chat_name",
  "short_description",
  "personality",
  "first_message",
  "alternate_greetings",
  "scenario",
  "example_dialogues",
  "tags",
  "rating",
  "image_url",
  "hide_sensitive_fields",
] as const satisfies readonly BotCollaborationField[];

export function normalizeVersionSnapshot(
  snapshot: BotVersionSnapshot,
): WorkspaceBotValues {
  return {
    name: snapshot.name || "",
    chat_name: snapshot.chat_name || "",
    short_description: snapshot.short_description || "",
    personality: snapshot.personality || "",
    first_message: snapshot.first_message || "",
    alternate_greetings: Array.isArray(snapshot.alternate_greetings)
      ? snapshot.alternate_greetings
      : [],
    scenario: snapshot.scenario || "",
    example_dialogues: snapshot.example_dialogues || "",
    tags: Array.isArray(snapshot.tags) ? snapshot.tags : [],
    rating: snapshot.rating === "NSFW" ? "NSFW" : "SFW",
    image_url: snapshot.image_url || "",
    hide_sensitive_fields: snapshot.hide_sensitive_fields === true,
  };
}

export function diffValueEquals(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
  }
  return left === right;
}

export function changedFieldsBetween(
  before: WorkspaceBotValues,
  after: WorkspaceBotValues,
): BotCollaborationField[] {
  return BOT_DIFF_FIELDS.filter(
    (field) => !diffValueEquals(before[field], after[field]),
  );
}

export function diffStringArrays(before: unknown, after: unknown): ArrayDiff {
  const left = Array.isArray(before)
    ? before.filter((value): value is string => typeof value === "string")
    : [];
  const right = Array.isArray(after)
    ? after.filter((value): value is string => typeof value === "string")
    : [];

  const remainingRight = [...right];
  const unchanged: string[] = [];
  const removed: string[] = [];

  for (const value of left) {
    const index = remainingRight.indexOf(value);
    if (index >= 0) {
      unchanged.push(value);
      remainingRight.splice(index, 1);
    } else {
      removed.push(value);
    }
  }

  return { added: remainingRight, removed, unchanged };
}

function tokenizeText(value: string): string[] {
  if (!value) return [];

  if (value.includes("\n")) {
    const lines = value.match(/.*(?:\n|$)/g)?.filter(Boolean) ?? [];
    if (lines.length <= 700) return lines;
  }

  const words = value.match(/\s+|[^\s]+/g) ?? [];
  if (words.length <= 700) return words;

  const sentences = value.match(/[^.!?\n]+[.!?\n]*\s*/g) ?? [];
  if (sentences.length <= 700) return sentences;

  return [value];
}

export function diffText(before: unknown, after: unknown): DiffChunk[] {
  const leftText = String(before ?? "");
  const rightText = String(after ?? "");

  if (leftText === rightText) {
    return leftText ? [{ type: "equal", value: leftText }] : [];
  }

  const left = tokenizeText(leftText);
  const right = tokenizeText(rightText);

  if (left.length === 1 && right.length === 1) {
    return [
      ...(leftText ? [{ type: "removed" as const, value: leftText }] : []),
      ...(rightText ? [{ type: "added" as const, value: rightText }] : []),
    ];
  }

  const rows = left.length + 1;
  const cols = right.length + 1;
  const table = Array.from({ length: rows }, () => new Uint16Array(cols));

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        left[i] === right[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const chunks: DiffChunk[] = [];
  const push = (type: DiffChunkType, value: string) => {
    if (!value) return;
    const previous = chunks[chunks.length - 1];
    if (previous?.type === type) previous.value += value;
    else chunks.push({ type, value });
  };

  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      push("equal", left[i]);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      push("removed", left[i]);
      i += 1;
    } else {
      push("added", right[j]);
      j += 1;
    }
  }
  while (i < left.length) push("removed", left[i++]);
  while (j < right.length) push("added", right[j++]);

  return chunks;
}
