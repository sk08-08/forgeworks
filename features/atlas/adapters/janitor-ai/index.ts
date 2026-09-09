import type {
  ForgeKnowledgeEntry,
  ForgeLorebookEntryConfig,
} from "../../fkf/fkf-types";
import type { JanitorLorebookEntry } from "./types";

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(String).map((item) => item.trim()).filter(Boolean)));
}

export function inferJanitorEntryType(entry: JanitorLorebookEntry): string {
  const category = String(entry.category || "").toLowerCase();
  if (category === "place") return "location";
  if (category === "character") return "character";
  if (category === "timeline" || category === "event") return "event";
  return category || "lore";
}

export function janitorEntryToForgeEntry(
  entry: JanitorLorebookEntry,
  entryId: string,
  index = 0,
): ForgeKnowledgeEntry {
  return {
    id: entryId,
    title: String(entry.name || `Entry ${index + 1}`),
    type: inferJanitorEntryType(entry),
    content: String(entry.content || ""),
    aliases: uniqueStrings(entry.key),
    tags: uniqueStrings(entry.tags),
    extensions: {
      sourceFormat: "janitor-ai",
      sourceMetadata: entry,
    },
  };
}

export function janitorEntryToLorebookConfig(
  source: JanitorLorebookEntry,
  entryId: string,
  index = 0,
): ForgeLorebookEntryConfig {
  const extensionDepth = source.extensions && Number.isFinite(Number(source.extensions.depth))
    ? Number(source.extensions.depth)
    : undefined;
  const extensionProbability = source.extensions && Number.isFinite(Number(source.extensions.probability))
    ? Number(source.extensions.probability)
    : undefined;
  const depth = Number.isFinite(Number(source.depth)) ? Number(source.depth) : extensionDepth;
  const probability = Number.isFinite(Number(source.probability))
    ? Number(source.probability)
    : extensionProbability ?? 100;

  return {
    entryId,
    enabled: source.enabled !== false,
    activation: {
      mode: source.constant
        ? "always"
        : String(source.activationMode || "").toLowerCase().includes("conditional")
          ? "conditional"
          : "keywords",
      primaryKeys: uniqueStrings(source.key),
      secondaryKeys: uniqueStrings(source.keysecondary),
      caseSensitive: Boolean(source.case_sensitive),
      matchWholeWords: source.matchWholeWords !== false,
    },
    insertion: {
      priority: Number.isFinite(Number(source.priority)) ? Number(source.priority) : index,
      ...(depth === undefined ? {} : { depth }),
    },
    probability,
    adapterMetadata: {
      sourceFormat: "janitor-ai",
      raw: source,
    },
  };
}

export function forgeEntryToJanitorEntry(input: {
  entry: ForgeKnowledgeEntry;
  config: ForgeLorebookEntryConfig;
  sortOrder: number;
}): JanitorLorebookEntry {
  const raw = input.config.adapterMetadata?.raw;
  const preserved = raw && typeof raw === "object" && !Array.isArray(raw)
    ? { ...(raw as JanitorLorebookEntry) }
    : {};
  const preservedExtensions = preserved.extensions && typeof preserved.extensions === "object"
    ? { ...preserved.extensions }
    : {};
  const insertionOrder = Number.isFinite(Number(preserved.insertion_order))
    ? Number(preserved.insertion_order)
    : input.sortOrder;
  const probability = input.config.probability ?? 100;
  const depth = input.config.insertion.depth;

  return {
    ...preserved,
    name: input.entry.title,
    content: input.entry.content,
    category: preserved.category ?? input.entry.type,
    enabled: input.config.enabled,
    constant: input.config.activation.mode === "always",
    activationMode: input.config.activation.mode,
    key: input.config.activation.primaryKeys,
    keysecondary: input.config.activation.secondaryKeys,
    case_sensitive: input.config.activation.caseSensitive,
    matchWholeWords: input.config.activation.matchWholeWords,
    priority: input.config.insertion.priority,
    insertion_order: insertionOrder,
    ...(depth === undefined ? {} : { depth }),
    probability,
    tags: input.entry.tags ?? [],
    extensions: {
      ...preservedExtensions,
      ...(depth === undefined ? {} : { depth }),
      probability,
    },
  };
}
