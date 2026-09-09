"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import type { AtlasEntryKind } from "@/features/atlas/types/atlas-types";

export type AtlasEntryRecord = {
  id: string;
  title: string;
  entryType: AtlasEntryKind;
  content: string;
  aliases: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AtlasEntryOption = Pick<
  AtlasEntryRecord,
  "id" | "title" | "entryType"
>;

export type AtlasEntryRelationRecord = {
  id: string;
  sourceEntryId: string;
  targetEntryId: string;
  relationType: string;
  label: string | null;
  inverseLabel: string | null;
  target: AtlasEntryOption | null;
};

export type AtlasEntryWorldLink = {
  id: string;
  title: string;
  linked: boolean;
};

export type AtlasEntryBotLink = {
  id: string;
  name: string;
  linked: boolean;
};

export type AtlasEntryCollectionLink = {
  id: string;
  title: string;
  linked: boolean;
};

export type AtlasEntryLorebookLink = {
  id: string;
  title: string;
  linked: boolean;
};

type Result<T> = { success: true; data: T } | { success: false; error: string };

const allowedKinds: AtlasEntryKind[] = [
  "character",
  "location",
  "faction",
  "organization",
  "event",
  "object",
  "species",
  "concept",
  "lore",
  "note",
  "custom",
];

function normalizeKind(value: unknown): AtlasEntryKind {
  return allowedKinds.includes(value as AtlasEntryKind)
    ? (value as AtlasEntryKind)
    : "note";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 100);
}

async function getOwnerContext() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  const userId = access.user?.id ?? null;

  if (!userId || access.isBlocked) {
    return { supabase, userId: null };
  }

  return { supabase, userId };
}

function mapEntry(row: any): AtlasEntryRecord {
  return {
    id: row.id,
    title: row.title,
    entryType: normalizeKind(row.entry_type),
    content: row.content ?? "",
    aliases: normalizeStringArray(row.aliases),
    tags: normalizeStringArray(row.tags),
    metadata:
      row.metadata &&
      typeof row.metadata === "object" &&
      !Array.isArray(row.metadata)
        ? row.metadata
        : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAtlasEntriesAction(): Promise<
  Result<AtlasEntryRecord[]>
> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId)
      return { success: false, error: "You must be signed in to use Atlas." };

    const { data, error } = await supabase
      .from("atlas_entries")
      .select(
        "id,title,entry_type,content,aliases,tags,metadata,created_at,updated_at",
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: (data ?? []).map(mapEntry) };
  } catch (error: any) {
    console.error("Failed to list Atlas entries:", error);
    return {
      success: false,
      error: error?.message || "Could not load Atlas entries.",
    };
  }
}

export async function getAtlasEntryAction(
  entryId: string,
): Promise<Result<AtlasEntryRecord>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId)
      return { success: false, error: "You must be signed in to use Atlas." };

    const { data, error } = await supabase
      .from("atlas_entries")
      .select(
        "id,title,entry_type,content,aliases,tags,metadata,created_at,updated_at",
      )
      .eq("id", entryId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, error: "Entry not found." };
    return { success: true, data: mapEntry(data) };
  } catch (error: any) {
    console.error("Failed to load Atlas entry:", error);
    return {
      success: false,
      error: error?.message || "Could not load this Atlas entry.",
    };
  }
}

export async function createAtlasEntryAction(input: {
  title: string;
  entryType: AtlasEntryKind;
}): Promise<Result<{ id: string }>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId)
      return { success: false, error: "You must be signed in to use Atlas." };

    const title = input.title.trim();
    if (!title) return { success: false, error: "Give the entry a title." };
    if (title.length > 160)
      return {
        success: false,
        error: "Entry titles can be up to 160 characters.",
      };

    const entryType = normalizeKind(input.entryType);

    const { data, error } = await supabase
      .from("atlas_entries")
      .insert({
        user_id: userId,
        title,
        entry_type: entryType,
        content: "",
        aliases: [],
        tags: [],
        metadata: {},
        source_metadata: {},
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath("/atlas");
    revalidatePath("/atlas/entries");
    return { success: true, data: { id: data.id } };
  } catch (error: any) {
    console.error("Failed to create Atlas entry:", error);
    return {
      success: false,
      error: error?.message || "Could not create the Atlas entry.",
    };
  }
}

export async function updateAtlasEntryAction(input: {
  id: string;
  title: string;
  entryType: AtlasEntryKind;
  content: string;
  aliases: string[];
  tags: string[];
}): Promise<Result<AtlasEntryRecord>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId)
      return { success: false, error: "You must be signed in to use Atlas." };

    const title = input.title.trim();
    if (!title) return { success: false, error: "Give the entry a title." };
    if (title.length > 160)
      return {
        success: false,
        error: "Entry titles can be up to 160 characters.",
      };

    const entryType = normalizeKind(input.entryType);
    const aliases = normalizeStringArray(input.aliases);
    const tags = normalizeStringArray(input.tags);
    const content = input.content.slice(0, 500_000);

    const { data, error } = await supabase
      .from("atlas_entries")
      .update({
        title,
        entry_type: entryType,
        content,
        aliases,
        tags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select(
        "id,title,entry_type,content,aliases,tags,metadata,created_at,updated_at",
      )
      .maybeSingle();

    if (error) throw error;
    if (!data)
      return {
        success: false,
        error: "Entry not found or no longer available.",
      };

    revalidatePath("/atlas");
    revalidatePath("/atlas/entries");
    revalidatePath(`/atlas/entries/${input.id}`);
    return { success: true, data: mapEntry(data) };
  } catch (error: any) {
    console.error("Failed to update Atlas entry:", error);
    return {
      success: false,
      error: error?.message || "Could not save the Atlas entry.",
    };
  }
}

export async function deleteAtlasEntryAction(
  entryId: string,
): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId)
      return { success: false, error: "You must be signed in to use Atlas." };

    const cleanup = await Promise.all([
      supabase.from("atlas_world_entries").delete().eq("entry_id", entryId),
      supabase
        .from("atlas_collection_entries")
        .delete()
        .eq("entry_id", entryId),
      supabase.from("atlas_lorebook_entries").delete().eq("entry_id", entryId),
      supabase.from("atlas_entry_bots").delete().eq("entry_id", entryId),
      supabase
        .from("atlas_entry_property_values")
        .delete()
        .eq("entry_id", entryId),
      supabase
        .from("atlas_relations")
        .delete()
        .eq("user_id", userId)
        .or(`source_entry_id.eq.${entryId},target_entry_id.eq.${entryId}`),
    ]);

    const cleanupError = cleanup.find((result) => result.error)?.error;
    if (cleanupError) throw cleanupError;

    const { error } = await supabase
      .from("atlas_entries")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entryId)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) throw error;
    revalidatePath("/atlas");
    revalidatePath("/atlas/entries");
    return { success: true, data: null };
  } catch (error: any) {
    console.error("Failed to delete Atlas entry:", error);
    return {
      success: false,
      error: error?.message || "Could not delete the Atlas entry.",
    };
  }
}

export async function getAtlasEntryConnectionsAction(entryId: string): Promise<
  Result<{
    entryOptions: AtlasEntryOption[];
    relations: AtlasEntryRelationRecord[];
    worlds: AtlasEntryWorldLink[];
    collections: AtlasEntryCollectionLink[];
    lorebooks: AtlasEntryLorebookLink[];
    bots: AtlasEntryBotLink[];
  }>
> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId)
      return { success: false, error: "You must be signed in to use Atlas." };

    const [
      entriesResult,
      relationsResult,
      worldsResult,
      worldLinksResult,
      collectionsResult,
      collectionLinksResult,
      lorebooksResult,
      lorebookLinksResult,
      botsResult,
      botLinksResult,
    ] = await Promise.all([
      supabase
        .from("atlas_entries")
        .select("id,title,entry_type")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .neq("id", entryId)
        .order("title"),
      supabase
        .from("atlas_relations")
        .select(
          "id,source_entry_id,target_entry_id,relation_type,label,inverse_label",
        )
        .eq("user_id", userId)
        .eq("source_entry_id", entryId)
        .order("created_at"),
      supabase
        .from("atlas_worlds")
        .select("id,title")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("title"),
      supabase
        .from("atlas_world_entries")
        .select("world_id")
        .eq("entry_id", entryId),
      supabase
        .from("atlas_collections")
        .select("id,title")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("title"),
      supabase
        .from("atlas_collection_entries")
        .select("collection_id")
        .eq("entry_id", entryId),
      supabase
        .from("atlas_lorebooks")
        .select("id,title")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("title"),
      supabase
        .from("atlas_lorebook_entries")
        .select("lorebook_id")
        .eq("entry_id", entryId),
      supabase
        .from("bots")
        .select("id,name")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("atlas_entry_bots")
        .select("bot_id")
        .eq("entry_id", entryId),
    ]);

    const firstError = [
      entriesResult.error,
      relationsResult.error,
      worldsResult.error,
      worldLinksResult.error,
      collectionsResult.error,
      collectionLinksResult.error,
      lorebooksResult.error,
      lorebookLinksResult.error,
      botsResult.error,
      botLinksResult.error,
    ].find(Boolean);
    if (firstError) throw firstError;

    const options: AtlasEntryOption[] = (entriesResult.data ?? []).map(
      (row: any) => ({
        id: row.id,
        title: row.title,
        entryType: normalizeKind(row.entry_type),
      }),
    );
    const optionMap = new Map(options.map((item) => [item.id, item]));
    const linkedWorldIds = new Set(
      (worldLinksResult.data ?? []).map((row: any) => row.world_id),
    );
    const linkedCollectionIds = new Set(
      (collectionLinksResult.data ?? []).map((row: any) => row.collection_id),
    );
    const linkedLorebookIds = new Set(
      (lorebookLinksResult.data ?? []).map((row: any) => row.lorebook_id),
    );
    const linkedBotIds = new Set(
      (botLinksResult.data ?? []).map((row: any) => row.bot_id),
    );

    return {
      success: true,
      data: {
        entryOptions: options,
        relations: (relationsResult.data ?? []).map((row: any) => ({
          id: row.id,
          sourceEntryId: row.source_entry_id,
          targetEntryId: row.target_entry_id,
          relationType: row.relation_type,
          label: row.label,
          inverseLabel: row.inverse_label,
          target: optionMap.get(row.target_entry_id) ?? null,
        })),
        worlds: (worldsResult.data ?? []).map((row: any) => ({
          id: row.id,
          title: row.title,
          linked: linkedWorldIds.has(row.id),
        })),
        collections: (collectionsResult.data ?? []).map((row: any) => ({
          id: row.id,
          title: row.title,
          linked: linkedCollectionIds.has(row.id),
        })),
        lorebooks: (lorebooksResult.data ?? []).map((row: any) => ({
          id: row.id,
          title: row.title,
          linked: linkedLorebookIds.has(row.id),
        })),
        bots: (botsResult.data ?? []).map((row: any) => ({
          id: row.id,
          name: row.name,
          linked: linkedBotIds.has(row.id),
        })),
      },
    };
  } catch (error: any) {
    console.error("Failed to load Atlas connections:", error);
    return {
      success: false,
      error: error?.message || "Could not load entry connections.",
    };
  }
}

export async function createAtlasRelationAction(input: {
  sourceEntryId: string;
  targetEntryId: string;
  relationType: string;
  label?: string;
  inverseLabel?: string;
}): Promise<Result<AtlasEntryRelationRecord>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId)
      return { success: false, error: "You must be signed in to use Atlas." };
    if (input.sourceEntryId === input.targetEntryId) {
      return { success: false, error: "An entry cannot relate to itself." };
    }

    const relationType = input.relationType
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .slice(0, 80);
    if (!relationType)
      return { success: false, error: "Choose a relation type." };

    const { data, error } = await supabase
      .from("atlas_relations")
      .insert({
        user_id: userId,
        source_entry_id: input.sourceEntryId,
        target_entry_id: input.targetEntryId,
        relation_type: relationType,
        label: input.label?.trim().slice(0, 120) || null,
        inverse_label: input.inverseLabel?.trim().slice(0, 120) || null,
        metadata: {},
      })
      .select(
        "id,source_entry_id,target_entry_id,relation_type,label,inverse_label",
      )
      .single();

    if (error) throw error;

    const { data: target } = await supabase
      .from("atlas_entries")
      .select("id,title,entry_type")
      .eq("id", input.targetEntryId)
      .eq("user_id", userId)
      .maybeSingle();

    revalidatePath(`/atlas/entries/${input.sourceEntryId}`);
    return {
      success: true,
      data: {
        id: data.id,
        sourceEntryId: data.source_entry_id,
        targetEntryId: data.target_entry_id,
        relationType: data.relation_type,
        label: data.label,
        inverseLabel: data.inverse_label,
        target: target
          ? {
              id: target.id,
              title: target.title,
              entryType: normalizeKind(target.entry_type),
            }
          : null,
      },
    };
  } catch (error: any) {
    console.error("Failed to create Atlas relation:", error);
    return {
      success: false,
      error: error?.message || "Could not create the relation.",
    };
  }
}

export async function deleteAtlasRelationAction(
  relationId: string,
): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId)
      return { success: false, error: "You must be signed in to use Atlas." };

    const { error } = await supabase
      .from("atlas_relations")
      .delete()
      .eq("id", relationId)
      .eq("user_id", userId);
    if (error) throw error;
    return { success: true, data: null };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Could not remove the relation.",
    };
  }
}

export async function setAtlasEntryWorldLinkAction(input: {
  entryId: string;
  worldId: string;
  linked: boolean;
}): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId)
      return { success: false, error: "You must be signed in to use Atlas." };

    const world = await supabase
      .from("atlas_worlds")
      .select("id")
      .eq("id", input.worldId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (world.error) throw world.error;
    if (!world.data) return { success: false, error: "World not found." };

    const entry = await supabase
      .from("atlas_entries")
      .select("id")
      .eq("id", input.entryId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (entry.error) throw entry.error;
    if (!entry.data) return { success: false, error: "Entry not found." };

    const { error } = input.linked
      ? await supabase
          .from("atlas_world_entries")
          .upsert(
            { world_id: input.worldId, entry_id: input.entryId },
            { onConflict: "world_id,entry_id" },
          )
      : await supabase
          .from("atlas_world_entries")
          .delete()
          .eq("world_id", input.worldId)
          .eq("entry_id", input.entryId);

    if (error) throw error;
    revalidatePath(`/atlas/entries/${input.entryId}`);
    return { success: true, data: null };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Could not update the World link.",
    };
  }
}

export async function setAtlasEntryBotLinkAction(input: {
  entryId: string;
  botId: string;
  linked: boolean;
}): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId)
      return { success: false, error: "You must be signed in to use Atlas." };

    const [entry, bot] = await Promise.all([
      supabase
        .from("atlas_entries")
        .select("id")
        .eq("id", input.entryId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("bots")
        .select("id")
        .eq("id", input.botId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle(),
    ]);
    if (entry.error) throw entry.error;
    if (bot.error) throw bot.error;
    if (!entry.data || !bot.data)
      return { success: false, error: "Entry or bot not found." };

    const { error } = input.linked
      ? await supabase
          .from("atlas_entry_bots")
          .upsert(
            { entry_id: input.entryId, bot_id: input.botId },
            { onConflict: "entry_id,bot_id" },
          )
      : await supabase
          .from("atlas_entry_bots")
          .delete()
          .eq("entry_id", input.entryId)
          .eq("bot_id", input.botId);

    if (error) throw error;
    revalidatePath(`/atlas/entries/${input.entryId}`);
    return { success: true, data: null };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Could not update the bot link.",
    };
  }
}

export async function setAtlasEntryLorebookLinkAction(input: {
  entryId: string;
  lorebookId: string;
  linked: boolean;
}): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId)
      return { success: false, error: "You must be signed in to use Atlas." };

    const [entry, lorebook] = await Promise.all([
      supabase
        .from("atlas_entries")
        .select("id,title,aliases")
        .eq("id", input.entryId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("atlas_lorebooks")
        .select("id")
        .eq("id", input.lorebookId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle(),
    ]);
    if (entry.error) throw entry.error;
    if (lorebook.error) throw lorebook.error;
    if (!entry.data || !lorebook.data)
      return { success: false, error: "Entry or Lorebook not found." };

    if (input.linked) {
      const last = await supabase
        .from("atlas_lorebook_entries")
        .select("sort_order")
        .eq("lorebook_id", input.lorebookId)
        .order("sort_order", { ascending: false })
        .limit(1);
      if (last.error) throw last.error;
      const sortOrder = (last.data?.[0]?.sort_order ?? -1) + 1;
      const primaryKeys = Array.from(
        new Set([
          entry.data.title,
          ...normalizeStringArray(entry.data.aliases),
        ]),
      )
        .filter(Boolean)
        .slice(0, 20);
      const result = await supabase.from("atlas_lorebook_entries").upsert(
        {
          lorebook_id: input.lorebookId,
          entry_id: input.entryId,
          sort_order: sortOrder,
          enabled: true,
          activation: {
            mode: "keywords",
            primaryKeys,
            secondaryKeys: [],
            caseSensitive: false,
            matchWholeWords: true,
          },
          insertion: { priority: sortOrder },
          probability: 100,
          adapter_metadata: {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "lorebook_id,entry_id" },
      );
      if (result.error) throw result.error;
    } else {
      const result = await supabase
        .from("atlas_lorebook_entries")
        .delete()
        .eq("lorebook_id", input.lorebookId)
        .eq("entry_id", input.entryId);
      if (result.error) throw result.error;
    }

    revalidatePath(`/atlas/entries/${input.entryId}`);
    revalidatePath(`/atlas/lorebooks/${input.lorebookId}`);
    return { success: true, data: null };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Could not update the Lorebook link.",
    };
  }
}

export async function setAtlasEntryCollectionLinkAction(input: {
  entryId: string;
  collectionId: string;
  linked: boolean;
}): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId)
      return { success: false, error: "You must be signed in to use Atlas." };

    const [entry, collection] = await Promise.all([
      supabase
        .from("atlas_entries")
        .select("id")
        .eq("id", input.entryId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("atlas_collections")
        .select("id")
        .eq("id", input.collectionId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle(),
    ]);
    if (entry.error) throw entry.error;
    if (collection.error) throw collection.error;
    if (!entry.data || !collection.data)
      return { success: false, error: "Entry or Collection not found." };

    const { error } = input.linked
      ? await supabase.from("atlas_collection_entries").upsert(
          {
            collection_id: input.collectionId,
            entry_id: input.entryId,
            sort_order: 0,
          },
          { onConflict: "collection_id,entry_id" },
        )
      : await supabase
          .from("atlas_collection_entries")
          .delete()
          .eq("collection_id", input.collectionId)
          .eq("entry_id", input.entryId);

    if (error) throw error;
    revalidatePath(`/atlas/entries/${input.entryId}`);
    revalidatePath(`/atlas/collections/${input.collectionId}`);
    revalidatePath("/atlas/collections");
    return { success: true, data: null };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Could not update the Collection link.",
    };
  }
}

export type AtlasEntryPropertyDefinition = {
  id: string;
  worldId: string;
  worldTitle: string;
  key: string;
  name: string;
  valueType:
    | "text"
    | "number"
    | "boolean"
    | "date"
    | "select"
    | "multi_select"
    | "entry_reference"
    | "url";
  options: Record<string, unknown>;
  sortOrder: number;
};

export type AtlasEntryPropertyState = {
  definitions: AtlasEntryPropertyDefinition[];
  values: Record<string, unknown>;
  entryOptions: AtlasEntryOption[];
};

const atlasPropertyTypes: AtlasEntryPropertyDefinition["valueType"][] = [
  "text",
  "number",
  "boolean",
  "date",
  "select",
  "multi_select",
  "entry_reference",
  "url",
];

function normalizeAtlasPropertyType(
  value: unknown,
): AtlasEntryPropertyDefinition["valueType"] {
  return atlasPropertyTypes.includes(
    value as AtlasEntryPropertyDefinition["valueType"],
  )
    ? (value as AtlasEntryPropertyDefinition["valueType"])
    : "text";
}

function normalizePropertyValue(
  definition: Pick<AtlasEntryPropertyDefinition, "valueType" | "options">,
  value: unknown,
): unknown {
  switch (definition.valueType) {
    case "number": {
      if (value === null || value === undefined || value === "") return null;
      const parsed = typeof value === "number" ? value : Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case "boolean":
      return Boolean(value);
    case "multi_select": {
      const choices = Array.isArray(definition.options.choices)
        ? definition.options.choices.filter(
            (item): item is string => typeof item === "string",
          )
        : [];
      const incoming = Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
      return Array.from(
        new Set(
          incoming.filter(
            (item) => choices.length === 0 || choices.includes(item),
          ),
        ),
      );
    }
    case "select": {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      const choices = Array.isArray(definition.options.choices)
        ? definition.options.choices.filter(
            (item): item is string => typeof item === "string",
          )
        : [];
      return choices.length === 0 || choices.includes(trimmed) ? trimmed : null;
    }
    case "entry_reference":
    case "date":
    case "url":
    case "text":
    default:
      return typeof value === "string"
        ? value.trim().slice(0, 20_000) || null
        : null;
  }
}

export async function getAtlasEntryPropertiesAction(
  entryId: string,
): Promise<Result<AtlasEntryPropertyState>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId)
      return { success: false, error: "You must be signed in to use Atlas." };

    const entryResult = await supabase
      .from("atlas_entries")
      .select("id")
      .eq("id", entryId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (entryResult.error) throw entryResult.error;
    if (!entryResult.data) return { success: false, error: "Entry not found." };

    const worldLinksResult = await supabase
      .from("atlas_world_entries")
      .select("world_id")
      .eq("entry_id", entryId);
    if (worldLinksResult.error) throw worldLinksResult.error;

    const worldIds = Array.from(
      new Set(
        (worldLinksResult.data ?? [])
          .map((row: any) => row.world_id)
          .filter(Boolean),
      ),
    );

    const entriesPromise = supabase
      .from("atlas_entries")
      .select("id,title,entry_type")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("title");

    if (worldIds.length === 0) {
      const entriesResult = await entriesPromise;
      if (entriesResult.error) throw entriesResult.error;
      return {
        success: true,
        data: {
          definitions: [],
          values: {},
          entryOptions: (entriesResult.data ?? []).map((row: any) => ({
            id: row.id,
            title: row.title,
            entryType: normalizeKind(row.entry_type),
          })),
        },
      };
    }

    const [worldsResult, definitionsResult, valuesResult, entriesResult] =
      await Promise.all([
        supabase
          .from("atlas_worlds")
          .select("id,title")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .in("id", worldIds),
        supabase
          .from("atlas_property_definitions")
          .select("id,world_id,key,name,value_type,options,sort_order")
          .eq("user_id", userId)
          .in("world_id", worldIds)
          .order("sort_order")
          .order("name"),
        supabase
          .from("atlas_entry_property_values")
          .select("property_definition_id,value")
          .eq("entry_id", entryId)
          .eq("user_id", userId),
        entriesPromise,
      ]);

    const firstError = [
      worldsResult.error,
      definitionsResult.error,
      valuesResult.error,
      entriesResult.error,
    ].find(Boolean);
    if (firstError) throw firstError;

    const worldMap = new Map(
      (worldsResult.data ?? []).map((row: any) => [row.id, row.title]),
    );
    const values: Record<string, unknown> = {};
    for (const row of valuesResult.data ?? []) {
      values[(row as any).property_definition_id] = (row as any).value;
    }

    return {
      success: true,
      data: {
        definitions: (definitionsResult.data ?? []).map((row: any) => ({
          id: row.id,
          worldId: row.world_id,
          worldTitle: worldMap.get(row.world_id) ?? "World",
          key: row.key,
          name: row.name,
          valueType: normalizeAtlasPropertyType(row.value_type),
          options:
            row.options &&
            typeof row.options === "object" &&
            !Array.isArray(row.options)
              ? (row.options as Record<string, unknown>)
              : {},
          sortOrder: row.sort_order ?? 0,
        })),
        values,
        entryOptions: (entriesResult.data ?? []).map((row: any) => ({
          id: row.id,
          title: row.title,
          entryType: normalizeKind(row.entry_type),
        })),
      },
    };
  } catch (error: any) {
    console.error("Failed to load Atlas entry properties:", error);
    return {
      success: false,
      error: error?.message || "Could not load entry properties.",
    };
  }
}

export async function saveAtlasEntryPropertyValuesAction(input: {
  entryId: string;
  values: Array<{ propertyDefinitionId: string; value: unknown }>;
}): Promise<Result<Record<string, unknown>>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId)
      return { success: false, error: "You must be signed in to use Atlas." };

    const entryResult = await supabase
      .from("atlas_entries")
      .select("id")
      .eq("id", input.entryId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (entryResult.error) throw entryResult.error;
    if (!entryResult.data) return { success: false, error: "Entry not found." };

    const worldLinksResult = await supabase
      .from("atlas_world_entries")
      .select("world_id")
      .eq("entry_id", input.entryId);
    if (worldLinksResult.error) throw worldLinksResult.error;
    const worldIds = Array.from(
      new Set(
        (worldLinksResult.data ?? [])
          .map((row: any) => row.world_id)
          .filter(Boolean),
      ),
    );

    const requestedIds = Array.from(
      new Set(
        input.values.map((item) => item.propertyDefinitionId).filter(Boolean),
      ),
    );
    if (requestedIds.length === 0) return { success: true, data: {} };
    if (worldIds.length === 0) {
      return {
        success: false,
        error: "This Entry is not linked to a World with properties.",
      };
    }

    const definitionsResult = await supabase
      .from("atlas_property_definitions")
      .select("id,world_id,value_type,options")
      .eq("user_id", userId)
      .in("id", requestedIds)
      .in("world_id", worldIds);
    if (definitionsResult.error) throw definitionsResult.error;

    const definitions = new Map(
      (definitionsResult.data ?? []).map((row: any) => [
        row.id,
        {
          valueType: normalizeAtlasPropertyType(row.value_type),
          options:
            row.options &&
            typeof row.options === "object" &&
            !Array.isArray(row.options)
              ? (row.options as Record<string, unknown>)
              : {},
        },
      ]),
    );

    if (definitions.size !== requestedIds.length) {
      return {
        success: false,
        error: "One or more properties are no longer available to this Entry.",
      };
    }

    const normalized: Record<string, unknown> = {};
    for (const item of input.values) {
      const definition = definitions.get(item.propertyDefinitionId);
      if (!definition) continue;
      normalized[item.propertyDefinitionId] = normalizePropertyValue(
        definition,
        item.value,
      );
    }

    const upsertRows = Object.entries(normalized).map(
      ([propertyDefinitionId, value]) => ({
        entry_id: input.entryId,
        property_definition_id: propertyDefinitionId,
        user_id: userId,
        value: value as any,
        updated_at: new Date().toISOString(),
      }),
    );

    if (upsertRows.length > 0) {
      const { error } = await supabase
        .from("atlas_entry_property_values")
        .upsert(upsertRows, { onConflict: "entry_id,property_definition_id" });
      if (error) throw error;
    }

    revalidatePath(`/atlas/entries/${input.entryId}`);
    return { success: true, data: normalized };
  } catch (error: any) {
    console.error("Failed to save Atlas entry properties:", error);
    return {
      success: false,
      error: error?.message || "Could not save entry properties.",
    };
  }
}
