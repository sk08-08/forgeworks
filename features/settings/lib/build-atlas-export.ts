import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import {
  fetchAllPages,
  fetchAllPagesInChunks,
} from "@/features/settings/lib/export-utils";
import type {
  ForgeKnowledgeCollection,
  ForgeKnowledgeEntry,
  ForgeKnowledgeLorebook,
  ForgeKnowledgePackage,
  ForgeKnowledgeRelation,
  ForgeKnowledgeWorld,
  ForgeLorebookActivationMode,
} from "@/features/atlas/fkf/fkf-types";
import {
  FORGE_KNOWLEDGE_FORMAT,
  FORGE_KNOWLEDGE_VERSION,
} from "@/features/atlas/fkf/fkf-schema";

type JsonObject = Record<string, unknown>;

type EntryRow = {
  id: string;
  title: string;
  entry_type: string | null;
  kind: string | null;
  content: string | null;
  body: string | null;
  aliases: string[] | null;
  tags: string[] | null;
  metadata: JsonObject | null;
  source_format: string | null;
  source_metadata: JsonObject | null;
  created_at: string;
  updated_at: string;
};

type WorldRow = {
  id: string;
  title: string;
  description: string | null;
  icon_name: string | null;
  accent_color: string | null;
  cover_url: string | null;
  visibility: "private" | "public";
  metadata: JsonObject | null;
};

type CollectionRow = {
  id: string;
  title: string;
  description: string | null;
  icon_name: string | null;
  accent_color: string | null;
  metadata: JsonObject | null;
};

type LorebookRow = {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  format_version: number | null;
  metadata: JsonObject | null;
  source_format: string | null;
  source_metadata: JsonObject | null;
};

type WorldEntryRow = {
  world_id: string;
  entry_id: string;
  sort_order: number;
};

type WorldBotRow = {
  world_id: string;
  bot_id: string;
  sort_order: number;
};

type CollectionEntryRow = {
  collection_id: string;
  entry_id: string;
  sort_order: number;
};

type LorebookEntryRow = {
  lorebook_id: string;
  entry_id: string;
  sort_order: number;
  enabled: boolean;
  activation: JsonObject | null;
  insertion: JsonObject | null;
  probability: number | string | null;
  adapter_metadata: JsonObject | null;
};

type RelationRow = {
  id: string;
  source_entry_id: string;
  target_entry_id: string;
  relation_type: string;
  label: string | null;
  inverse_label: string | null;
  metadata: JsonObject | null;
};

type PropertyDefinitionRow = {
  id: string;
  world_id: string;
  key: string;
  name: string;
  value_type: string;
  options: unknown;
  sort_order: number;
};

type PropertyValueRow = {
  entry_id: string;
  property_definition_id: string;
  value: unknown;
};

type EntryBotRow = {
  entry_id: string;
  bot_id: string;
  sort_order: number;
};

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeActivationMode(value: unknown): ForgeLorebookActivationMode {
  return value === "always" || value === "conditional" ? value : "keywords";
}

function pushGrouped<T>(map: Map<string, T[]>, key: string, value: T) {
  const current = map.get(key);
  if (current) current.push(value);
  else map.set(key, [value]);
}

function sortByOrder<T extends { sort_order: number }>(
  rows: T[] | undefined,
): T[] {
  return [...(rows ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

function buildEntryProperties(
  entryId: string,
  propertyValuesByEntry: Map<string, PropertyValueRow[]>,
  propertyDefinitionById: Map<string, PropertyDefinitionRow>,
): Record<string, unknown> | undefined {
  const values = propertyValuesByEntry.get(entryId) ?? [];
  if (values.length === 0) return undefined;

  const result: Record<string, unknown> = {};
  const usedKeys = new Set<string>();

  for (const row of values) {
    const definition = propertyDefinitionById.get(row.property_definition_id);
    if (!definition) continue;

    // A single Entry may belong to multiple Worlds whose schemas reuse the
    // same property key. Namespace only collisions so normal FKF stays clean
    // while still guaranteeing that no value is lost.
    let exportKey = definition.key;
    if (usedKeys.has(exportKey)) {
      exportKey = `${definition.world_id}.${definition.key}`;
    }

    usedKeys.add(exportKey);
    result[exportKey] = row.value;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export async function buildCurrentUserAtlasExport(): Promise<
  | { success: true; data: ForgeKnowledgePackage }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();
    const access = await getCurrentUserAccess(supabase);

    if (!access.user) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = access.user.id;

    const [
      entries,
      worlds,
      collections,
      lorebooks,
      relations,
      propertyDefinitions,
    ] = await Promise.all([
      fetchAllPages(
        "Atlas entries",
        async (from, to) =>
          await supabase
            .from("atlas_entries")
            .select(
              "id,title,entry_type,kind,content,body,aliases,tags,metadata,source_format,source_metadata,created_at,updated_at",
            )
            .eq("user_id", userId)
            .is("deleted_at", null)
            .order("created_at", { ascending: true })
            .range(from, to),
      ) as Promise<EntryRow[]>,
      fetchAllPages(
        "Atlas worlds",
        async (from, to) =>
          await supabase
            .from("atlas_worlds")
            .select(
              "id,title,description,icon_name,accent_color,cover_url,visibility,metadata",
            )
            .eq("user_id", userId)
            .is("deleted_at", null)
            .order("created_at", { ascending: true })
            .range(from, to),
      ) as Promise<WorldRow[]>,
      fetchAllPages(
        "Atlas collections",
        async (from, to) =>
          await supabase
            .from("atlas_collections")
            .select("id,title,description,icon_name,accent_color,metadata")
            .eq("user_id", userId)
            .is("deleted_at", null)
            .order("created_at", { ascending: true })
            .range(from, to),
      ) as Promise<CollectionRow[]>,
      fetchAllPages(
        "Atlas lorebooks",
        async (from, to) =>
          await supabase
            .from("atlas_lorebooks")
            .select(
              "id,title,description,summary,format_version,metadata,source_format,source_metadata",
            )
            .eq("user_id", userId)
            .is("deleted_at", null)
            .order("created_at", { ascending: true })
            .range(from, to),
      ) as Promise<LorebookRow[]>,
      fetchAllPages(
        "Atlas relations",
        async (from, to) =>
          await supabase
            .from("atlas_relations")
            .select(
              "id,source_entry_id,target_entry_id,relation_type,label,inverse_label,metadata",
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: true })
            .range(from, to),
      ) as Promise<RelationRow[]>,
      fetchAllPages(
        "Atlas property definitions",
        async (from, to) =>
          await supabase
            .from("atlas_property_definitions")
            .select("id,world_id,key,name,value_type,options,sort_order")
            .eq("user_id", userId)
            .order("sort_order", { ascending: true })
            .range(from, to),
      ) as Promise<PropertyDefinitionRow[]>,
    ]);

    const entryIds = entries.map((row) => row.id);
    const worldIds = worlds.map((row) => row.id);
    const collectionIds = collections.map((row) => row.id);
    const lorebookIds = lorebooks.map((row) => row.id);

    const [
      worldEntries,
      worldBots,
      collectionEntries,
      lorebookEntries,
      propertyValues,
      entryBots,
    ] = await Promise.all([
      fetchAllPagesInChunks(
        "Atlas world entries",
        worldIds,
        async (ids, from, to) =>
          await supabase
            .from("atlas_world_entries")
            .select("world_id,entry_id,sort_order")
            .in("world_id", ids)
            .order("sort_order", { ascending: true })
            .range(from, to),
      ) as Promise<WorldEntryRow[]>,
      fetchAllPagesInChunks(
        "Atlas world bots",
        worldIds,
        async (ids, from, to) =>
          await supabase
            .from("atlas_world_bots")
            .select("world_id,bot_id,sort_order")
            .in("world_id", ids)
            .order("sort_order", { ascending: true })
            .range(from, to),
      ) as Promise<WorldBotRow[]>,
      fetchAllPagesInChunks(
        "Atlas collection entries",
        collectionIds,
        async (ids, from, to) =>
          await supabase
            .from("atlas_collection_entries")
            .select("collection_id,entry_id,sort_order")
            .in("collection_id", ids)
            .order("sort_order", { ascending: true })
            .range(from, to),
      ) as Promise<CollectionEntryRow[]>,
      fetchAllPagesInChunks(
        "Atlas lorebook entries",
        lorebookIds,
        async (ids, from, to) =>
          await supabase
            .from("atlas_lorebook_entries")
            .select(
              "lorebook_id,entry_id,sort_order,enabled,activation,insertion,probability,adapter_metadata",
            )
            .in("lorebook_id", ids)
            .order("sort_order", { ascending: true })
            .range(from, to),
      ) as Promise<LorebookEntryRow[]>,
      fetchAllPagesInChunks(
        "Atlas property values",
        entryIds,
        async (ids, from, to) =>
          await supabase
            .from("atlas_entry_property_values")
            .select("entry_id,property_definition_id,value")
            .eq("user_id", userId)
            .in("entry_id", ids)
            .order("created_at", { ascending: true })
            .range(from, to),
      ) as Promise<PropertyValueRow[]>,
      fetchAllPagesInChunks(
        "Atlas entry bots",
        entryIds,
        async (ids, from, to) =>
          await supabase
            .from("atlas_entry_bots")
            .select("entry_id,bot_id,sort_order")
            .in("entry_id", ids)
            .order("sort_order", { ascending: true })
            .range(from, to),
      ) as Promise<EntryBotRow[]>,
    ]);

    const worldEntriesByWorld = new Map<string, WorldEntryRow[]>();
    const worldBotsByWorld = new Map<string, WorldBotRow[]>();
    const collectionEntriesByCollection = new Map<
      string,
      CollectionEntryRow[]
    >();
    const lorebookEntriesByLorebook = new Map<string, LorebookEntryRow[]>();
    const propertyValuesByEntry = new Map<string, PropertyValueRow[]>();
    const entryBotsByEntry = new Map<string, EntryBotRow[]>();

    for (const row of worldEntries)
      pushGrouped(worldEntriesByWorld, row.world_id, row);
    for (const row of worldBots)
      pushGrouped(worldBotsByWorld, row.world_id, row);
    for (const row of collectionEntries)
      pushGrouped(collectionEntriesByCollection, row.collection_id, row);
    for (const row of lorebookEntries)
      pushGrouped(lorebookEntriesByLorebook, row.lorebook_id, row);
    for (const row of propertyValues)
      pushGrouped(propertyValuesByEntry, row.entry_id, row);
    for (const row of entryBots)
      pushGrouped(entryBotsByEntry, row.entry_id, row);

    const propertyDefinitionById = new Map(
      propertyDefinitions.map((row) => [row.id, row] as const),
    );

    const fkfEntries: ForgeKnowledgeEntry[] = entries.map((entry) => {
      const botIds = sortByOrder(entryBotsByEntry.get(entry.id)).map(
        (row) => row.bot_id,
      );
      const sourceMetadata = asObject(entry.source_metadata);
      const metadata = asObject(entry.metadata);

      const extensions: JsonObject = {};
      if (Object.keys(metadata).length > 0) extensions.metadata = metadata;
      if (entry.source_format) extensions.sourceFormat = entry.source_format;
      if (Object.keys(sourceMetadata).length > 0)
        extensions.sourceMetadata = sourceMetadata;
      if (botIds.length > 0) extensions.botIds = botIds;

      return {
        id: entry.id,
        title: entry.title,
        type: entry.entry_type ?? "note",
        content: entry.content ?? "",
        aliases: entry.aliases ?? [],
        tags: entry.tags ?? [],
        properties: buildEntryProperties(
          entry.id,
          propertyValuesByEntry,
          propertyDefinitionById,
        ),
        extensions: Object.keys(extensions).length > 0 ? extensions : undefined,
      };
    });

    const fkfWorlds: ForgeKnowledgeWorld[] = worlds.map((world) => {
      const entryIdsForWorld = sortByOrder(
        worldEntriesByWorld.get(world.id),
      ).map((row) => row.entry_id);
      const botIdsForWorld = sortByOrder(worldBotsByWorld.get(world.id)).map(
        (row) => row.bot_id,
      );

      const extensions: JsonObject = {};
      if (world.icon_name) extensions.iconName = world.icon_name;
      if (world.accent_color) extensions.accentColor = world.accent_color;
      if (world.cover_url) extensions.coverUrl = world.cover_url;
      extensions.visibility = world.visibility;
      if (world.metadata && Object.keys(world.metadata).length > 0)
        extensions.metadata = world.metadata;

      return {
        id: world.id,
        title: world.title,
        description: world.description ?? undefined,
        entryIds: entryIdsForWorld,
        botIds: botIdsForWorld.length > 0 ? botIdsForWorld : undefined,
        extensions: Object.keys(extensions).length > 0 ? extensions : undefined,
      };
    });

    const fkfCollections: ForgeKnowledgeCollection[] = collections.map(
      (collection) => {
        const extensions: JsonObject = {};
        if (collection.icon_name) extensions.iconName = collection.icon_name;
        if (collection.accent_color)
          extensions.accentColor = collection.accent_color;
        if (collection.metadata && Object.keys(collection.metadata).length > 0)
          extensions.metadata = collection.metadata;

        return {
          id: collection.id,
          title: collection.title,
          description: collection.description ?? undefined,
          entryIds: sortByOrder(
            collectionEntriesByCollection.get(collection.id),
          ).map((row) => row.entry_id),
          extensions:
            Object.keys(extensions).length > 0 ? extensions : undefined,
        };
      },
    );

    const fkfLorebooks: ForgeKnowledgeLorebook[] = lorebooks.map((lorebook) => {
      const extensions: JsonObject = {};
      if (lorebook.format_version != null)
        extensions.atlasFormatVersion = lorebook.format_version;
      if (lorebook.metadata && Object.keys(lorebook.metadata).length > 0)
        extensions.metadata = lorebook.metadata;
      if (lorebook.source_format)
        extensions.sourceFormat = lorebook.source_format;
      if (
        lorebook.source_metadata &&
        Object.keys(lorebook.source_metadata).length > 0
      )
        extensions.sourceMetadata = lorebook.source_metadata;

      return {
        id: lorebook.id,
        title: lorebook.title,
        description: lorebook.description ?? lorebook.summary ?? undefined,
        entries: sortByOrder(lorebookEntriesByLorebook.get(lorebook.id)).map(
          (link) => {
            const activation = asObject(link.activation);
            const insertion = asObject(link.insertion);

            return {
              entryId: link.entry_id,
              enabled: link.enabled,
              activation: {
                mode: normalizeActivationMode(activation.mode),
                primaryKeys: asStringArray(activation.primaryKeys),
                secondaryKeys: asStringArray(activation.secondaryKeys),
                caseSensitive: activation.caseSensitive === true,
                matchWholeWords: activation.matchWholeWords === true,
              },
              insertion: {
                priority: asFiniteNumber(insertion.priority, 0),
                ...(insertion.depth == null
                  ? {}
                  : { depth: asFiniteNumber(insertion.depth, 0) }),
              },
              ...(link.probability == null
                ? {}
                : { probability: asFiniteNumber(link.probability, 100) }),
              ...(link.adapter_metadata &&
              Object.keys(link.adapter_metadata).length > 0
                ? { adapterMetadata: link.adapter_metadata }
                : {}),
            };
          },
        ),
        extensions: Object.keys(extensions).length > 0 ? extensions : undefined,
      };
    });

    const fkfRelations: ForgeKnowledgeRelation[] = relations.map(
      (relation) => ({
        id: relation.id,
        sourceEntryId: relation.source_entry_id,
        targetEntryId: relation.target_entry_id,
        type: relation.relation_type,
        label: relation.label ?? undefined,
        inverseLabel: relation.inverse_label ?? undefined,
        metadata: relation.metadata ?? undefined,
      }),
    );

    const packageExtensions: JsonObject = {
      atlas: {
        propertyDefinitions: propertyDefinitions.map((definition) => ({
          id: definition.id,
          worldId: definition.world_id,
          key: definition.key,
          name: definition.name,
          valueType: definition.value_type,
          options: definition.options,
          sortOrder: definition.sort_order,
        })),
      },
    };

    const data: ForgeKnowledgePackage = {
      format: FORGE_KNOWLEDGE_FORMAT,
      version: FORGE_KNOWLEDGE_VERSION,
      metadata: {
        title: "Atlas workspace export",
        createdAt: new Date().toISOString(),
        generator: "Forgeworks Atlas",
      },
      entries: fkfEntries,
      worlds: fkfWorlds,
      collections: fkfCollections,
      relations: fkfRelations,
      lorebooks: fkfLorebooks,
      extensions: packageExtensions,
    };

    return { success: true, data };
  } catch (error) {
    console.error("Atlas FKF export failed:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not build the Atlas Forge Knowledge export",
    };
  }
}
