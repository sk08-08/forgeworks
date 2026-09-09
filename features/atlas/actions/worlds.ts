"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import type { AtlasEntryKind } from "@/features/atlas/types/atlas-types";

export type AtlasWorldVisibility = "private" | "public";

export type AtlasWorldRecord = {
  id: string;
  title: string;
  slug: string;
  description: string;
  loreSummary: string;
  visibility: AtlasWorldVisibility;
  iconName: string | null;
  accentColor: string | null;
  entryCount: number;
  botCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AtlasWorldEntryLink = {
  id: string;
  title: string;
  entryType: AtlasEntryKind;
  linked: boolean;
};

export type AtlasWorldBotLink = {
  id: string;
  name: string;
  shortDescription: string | null;
  rating: string | null;
  imageUrl: string | null;
  linked: boolean;
};

export type AtlasWorldPropertyDefinition = {
  id: string;
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

type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const allowedEntryKinds: AtlasEntryKind[] = [
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

const allowedPropertyTypes: AtlasWorldPropertyDefinition["valueType"][] = [
  "text",
  "number",
  "boolean",
  "date",
  "select",
  "multi_select",
  "entry_reference",
  "url",
];

function normalizeEntryKind(value: unknown): AtlasEntryKind {
  return allowedEntryKinds.includes(value as AtlasEntryKind)
    ? (value as AtlasEntryKind)
    : "note";
}

function normalizePropertyType(value: unknown): AtlasWorldPropertyDefinition["valueType"] {
  return allowedPropertyTypes.includes(value as AtlasWorldPropertyDefinition["valueType"])
    ? (value as AtlasWorldPropertyDefinition["valueType"])
    : "text";
}

function normalizeSlugBase(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "world"
  );
}

function normalizePropertyKey(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 72) || "property"
  );
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

async function createUniqueWorldSlug(supabase: any, userId: string, title: string) {
  const base = normalizeSlugBase(title);
  const { data, error } = await supabase
    .from("atlas_worlds")
    .select("slug")
    .eq("user_id", userId)
    .like("slug", `${base}%`);

  if (error) throw error;

  const used = new Set((data ?? []).map((row: any) => row.slug));
  if (!used.has(base)) return base;

  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `${base}-${index}`;
    if (!used.has(candidate)) return candidate;
  }

  return `${base}-${Date.now()}`;
}

function mapWorld(row: any, entryCount = 0, botCount = 0): AtlasWorldRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? "",
    loreSummary: row.lore_summary ?? "",
    visibility: row.visibility === "public" ? "public" : "private",
    iconName: row.icon_name ?? null,
    accentColor: row.accent_color ?? null,
    entryCount,
    botCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadWorldCounts(supabase: any, worldIds: string[]) {
  const entryCounts = new Map<string, number>();
  const botCounts = new Map<string, number>();

  if (worldIds.length === 0) return { entryCounts, botCounts };

  const [entryLinks, botLinks] = await Promise.all([
    supabase.from("atlas_world_entries").select("world_id").in("world_id", worldIds),
    supabase.from("atlas_world_bots").select("world_id").in("world_id", worldIds),
  ]);

  if (entryLinks.error) throw entryLinks.error;
  if (botLinks.error) throw botLinks.error;

  for (const row of entryLinks.data ?? []) {
    entryCounts.set(row.world_id, (entryCounts.get(row.world_id) ?? 0) + 1);
  }

  for (const row of botLinks.data ?? []) {
    botCounts.set(row.world_id, (botCounts.get(row.world_id) ?? 0) + 1);
  }

  return { entryCounts, botCounts };
}

export async function listAtlasWorldsAction(): Promise<Result<AtlasWorldRecord[]>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const { data, error } = await supabase
      .from("atlas_worlds")
      .select(
        "id,title,slug,description,lore_summary,visibility,icon_name,accent_color,created_at,updated_at",
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const rows = data ?? [];
    const { entryCounts, botCounts } = await loadWorldCounts(
      supabase,
      rows.map((row: any) => row.id),
    );

    return {
      success: true,
      data: rows.map((row: any) =>
        mapWorld(row, entryCounts.get(row.id) ?? 0, botCounts.get(row.id) ?? 0),
      ),
    };
  } catch (error: any) {
    console.error("Failed to list Atlas worlds:", error);
    return { success: false, error: error?.message || "Could not load Atlas worlds." };
  }
}

export async function getAtlasWorldAction(worldId: string): Promise<Result<AtlasWorldRecord>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const { data, error } = await supabase
      .from("atlas_worlds")
      .select(
        "id,title,slug,description,lore_summary,visibility,icon_name,accent_color,created_at,updated_at",
      )
      .eq("id", worldId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, error: "World not found." };

    const { entryCounts, botCounts } = await loadWorldCounts(supabase, [worldId]);
    return {
      success: true,
      data: mapWorld(
        data,
        entryCounts.get(worldId) ?? 0,
        botCounts.get(worldId) ?? 0,
      ),
    };
  } catch (error: any) {
    console.error("Failed to load Atlas world:", error);
    return { success: false, error: error?.message || "Could not load this World." };
  }
}

export async function createAtlasWorldAction(input: {
  title: string;
  description?: string;
}): Promise<Result<{ id: string }>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const title = input.title.trim();
    if (!title) return { success: false, error: "Give the World a title." };
    if (title.length > 160) return { success: false, error: "World titles can be up to 160 characters." };

    const slug = await createUniqueWorldSlug(supabase, userId, title);
    const description = (input.description ?? "").trim().slice(0, 10_000);

    const { data, error } = await supabase
      .from("atlas_worlds")
      .insert({
        user_id: userId,
        title,
        slug,
        // Temporary compatibility values for the old public Atlas consumers.
        // V2 treats a World as a neutral context/workspace, not as this legacy kind.
        visibility: "private",
        description,
        lore_summary: "",
        metadata: {},
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath("/atlas");
    revalidatePath("/atlas/worlds");
    return { success: true, data: { id: data.id } };
  } catch (error: any) {
    console.error("Failed to create Atlas world:", error);
    return { success: false, error: error?.message || "Could not create the World." };
  }
}

export async function updateAtlasWorldAction(input: {
  id: string;
  title: string;
  description: string;
  loreSummary: string;
  visibility: AtlasWorldVisibility;
}): Promise<Result<AtlasWorldRecord>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const title = input.title.trim();
    if (!title) return { success: false, error: "Give the World a title." };
    if (title.length > 160) return { success: false, error: "World titles can be up to 160 characters." };

    const { data, error } = await supabase
      .from("atlas_worlds")
      .update({
        title,
        description: input.description.slice(0, 10_000),
        lore_summary: input.loreSummary.slice(0, 500_000),
        visibility: input.visibility === "public" ? "public" : "private",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select(
        "id,title,slug,description,lore_summary,visibility,icon_name,accent_color,created_at,updated_at",
      )
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, error: "World not found or no longer available." };

    const { entryCounts, botCounts } = await loadWorldCounts(supabase, [input.id]);

    revalidatePath("/atlas");
    revalidatePath("/atlas/worlds");
    revalidatePath(`/atlas/worlds/${input.id}`);
    return {
      success: true,
      data: mapWorld(
        data,
        entryCounts.get(input.id) ?? 0,
        botCounts.get(input.id) ?? 0,
      ),
    };
  } catch (error: any) {
    console.error("Failed to update Atlas world:", error);
    return { success: false, error: error?.message || "Could not save the World." };
  }
}

export async function deleteAtlasWorldAction(worldId: string): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const ownership = await supabase
      .from("atlas_worlds")
      .select("id")
      .eq("id", worldId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (ownership.error) throw ownership.error;
    if (!ownership.data) return { success: false, error: "World not found." };

    // Deleting a World detaches knowledge. It never deletes the Entries themselves.
    const cleanup = await Promise.all([
      supabase.from("atlas_world_entries").delete().eq("world_id", worldId),
      supabase.from("atlas_world_bots").delete().eq("world_id", worldId),
      supabase.from("atlas_property_definitions").delete().eq("world_id", worldId),
    ]);

    const cleanupError = cleanup.find((result) => result.error)?.error;
    if (cleanupError) throw cleanupError;

    const { error } = await supabase
      .from("atlas_worlds")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", worldId)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) throw error;

    revalidatePath("/atlas");
    revalidatePath("/atlas/worlds");
    revalidatePath("/atlas/entries");
    return { success: true, data: null };
  } catch (error: any) {
    console.error("Failed to delete Atlas world:", error);
    return { success: false, error: error?.message || "Could not delete the World." };
  }
}

export async function getAtlasWorldConnectionsAction(worldId: string): Promise<
  Result<{
    entries: AtlasWorldEntryLink[];
    bots: AtlasWorldBotLink[];
    properties: AtlasWorldPropertyDefinition[];
  }>
> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const world = await supabase
      .from("atlas_worlds")
      .select("id")
      .eq("id", worldId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (world.error) throw world.error;
    if (!world.data) return { success: false, error: "World not found." };

    const [entriesResult, entryLinksResult, botsResult, botLinksResult, propertiesResult] =
      await Promise.all([
        supabase
          .from("atlas_entries")
          .select("id,title,entry_type")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("title"),
        supabase.from("atlas_world_entries").select("entry_id").eq("world_id", worldId),
        supabase
          .from("bots")
          .select("id,name,short_description,rating,image_url")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("name"),
        supabase.from("atlas_world_bots").select("bot_id").eq("world_id", worldId),
        supabase
          .from("atlas_property_definitions")
          .select("id,key,name,value_type,options,sort_order")
          .eq("user_id", userId)
          .eq("world_id", worldId)
          .order("sort_order")
          .order("created_at"),
      ]);

    const firstError = [
      entriesResult.error,
      entryLinksResult.error,
      botsResult.error,
      botLinksResult.error,
      propertiesResult.error,
    ].find(Boolean);
    if (firstError) throw firstError;

    const linkedEntryIds = new Set((entryLinksResult.data ?? []).map((row: any) => row.entry_id));
    const linkedBotIds = new Set((botLinksResult.data ?? []).map((row: any) => row.bot_id));

    return {
      success: true,
      data: {
        entries: (entriesResult.data ?? []).map((row: any) => ({
          id: row.id,
          title: row.title,
          entryType: normalizeEntryKind(row.entry_type),
          linked: linkedEntryIds.has(row.id),
        })),
        bots: (botsResult.data ?? []).map((row: any) => ({
          id: row.id,
          name: row.name,
          shortDescription: row.short_description ?? null,
          rating: row.rating ?? null,
          imageUrl: row.image_url ?? null,
          linked: linkedBotIds.has(row.id),
        })),
        properties: (propertiesResult.data ?? []).map((row: any) => ({
          id: row.id,
          key: row.key,
          name: row.name,
          valueType: normalizePropertyType(row.value_type),
          options:
            row.options && typeof row.options === "object" && !Array.isArray(row.options)
              ? row.options
              : {},
          sortOrder: row.sort_order ?? 0,
        })),
      },
    };
  } catch (error: any) {
    console.error("Failed to load World connections:", error);
    return { success: false, error: error?.message || "Could not load World connections." };
  }
}

export async function setAtlasWorldEntryLinkAction(input: {
  worldId: string;
  entryId: string;
  linked: boolean;
}): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const [world, entry] = await Promise.all([
      supabase
        .from("atlas_worlds")
        .select("id")
        .eq("id", input.worldId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("atlas_entries")
        .select("id")
        .eq("id", input.entryId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle(),
    ]);

    if (world.error) throw world.error;
    if (entry.error) throw entry.error;
    if (!world.data || !entry.data) return { success: false, error: "World or Entry not found." };

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

    revalidatePath("/atlas/worlds");
    revalidatePath(`/atlas/worlds/${input.worldId}`);
    revalidatePath(`/atlas/entries/${input.entryId}`);
    return { success: true, data: null };
  } catch (error: any) {
    console.error("Failed to update World Entry link:", error);
    return { success: false, error: error?.message || "Could not update the Entry link." };
  }
}

export async function setAtlasWorldBotLinkAction(input: {
  worldId: string;
  botId: string;
  linked: boolean;
}): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const [world, bot] = await Promise.all([
      supabase
        .from("atlas_worlds")
        .select("id")
        .eq("id", input.worldId)
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

    if (world.error) throw world.error;
    if (bot.error) throw bot.error;
    if (!world.data || !bot.data) return { success: false, error: "World or Bot not found." };

    const { error } = input.linked
      ? await supabase
          .from("atlas_world_bots")
          .upsert(
            { world_id: input.worldId, bot_id: input.botId, sort_order: 0 },
            { onConflict: "world_id,bot_id" },
          )
      : await supabase
          .from("atlas_world_bots")
          .delete()
          .eq("world_id", input.worldId)
          .eq("bot_id", input.botId);

    if (error) throw error;

    revalidatePath("/atlas/worlds");
    revalidatePath(`/atlas/worlds/${input.worldId}`);
    return { success: true, data: null };
  } catch (error: any) {
    console.error("Failed to update World Bot link:", error);
    return { success: false, error: error?.message || "Could not update the Bot link." };
  }
}

export async function createAtlasWorldPropertyAction(input: {
  worldId: string;
  name: string;
  valueType: AtlasWorldPropertyDefinition["valueType"];
  choices?: string[];
}): Promise<Result<AtlasWorldPropertyDefinition>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const world = await supabase
      .from("atlas_worlds")
      .select("id")
      .eq("id", input.worldId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (world.error) throw world.error;
    if (!world.data) return { success: false, error: "World not found." };

    const name = input.name.trim();
    if (!name) return { success: false, error: "Give the property a name." };
    if (name.length > 100) return { success: false, error: "Property names can be up to 100 characters." };

    const valueType = normalizePropertyType(input.valueType);
    const baseKey = normalizePropertyKey(name);

    const { data: existing, error: existingError } = await supabase
      .from("atlas_property_definitions")
      .select("key")
      .eq("user_id", userId)
      .eq("world_id", input.worldId)
      .like("key", `${baseKey}%`);

    if (existingError) throw existingError;
    const used = new Set((existing ?? []).map((row: any) => row.key));
    let key = baseKey;
    for (let index = 2; used.has(key); index += 1) key = `${baseKey}_${index}`;

    const choices = Array.from(
      new Set((input.choices ?? []).map((item) => item.trim()).filter(Boolean)),
    ).slice(0, 100);

    const options =
      valueType === "select" || valueType === "multi_select" ? { choices } : {};

    const { data, error } = await supabase
      .from("atlas_property_definitions")
      .insert({
        user_id: userId,
        world_id: input.worldId,
        key,
        name,
        value_type: valueType,
        options,
        sort_order: 0,
      })
      .select("id,key,name,value_type,options,sort_order")
      .single();

    if (error) throw error;

    revalidatePath(`/atlas/worlds/${input.worldId}`);
    return {
      success: true,
      data: {
        id: data.id,
        key: data.key,
        name: data.name,
        valueType: normalizePropertyType(data.value_type),
        options:
          data.options && typeof data.options === "object" && !Array.isArray(data.options)
            ? (data.options as Record<string, unknown>)
            : {},
        sortOrder: data.sort_order ?? 0,
      },
    };
  } catch (error: any) {
    console.error("Failed to create World property:", error);
    return { success: false, error: error?.message || "Could not create the property." };
  }
}

export async function deleteAtlasWorldPropertyAction(input: {
  worldId: string;
  propertyId: string;
}): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const { error } = await supabase
      .from("atlas_property_definitions")
      .delete()
      .eq("id", input.propertyId)
      .eq("world_id", input.worldId)
      .eq("user_id", userId);

    if (error) throw error;
    revalidatePath(`/atlas/worlds/${input.worldId}`);
    return { success: true, data: null };
  } catch (error: any) {
    console.error("Failed to delete World property:", error);
    return { success: false, error: error?.message || "Could not remove the property." };
  }
}
