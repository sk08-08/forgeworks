"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import type { AtlasEntryKind } from "@/features/atlas/types/atlas-types";

export type AtlasCollectionRecord = {
  id: string;
  title: string;
  description: string;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AtlasCollectionEntryLink = {
  id: string;
  title: string;
  entryType: AtlasEntryKind;
  linked: boolean;
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

function normalizeEntryKind(value: unknown): AtlasEntryKind {
  return allowedEntryKinds.includes(value as AtlasEntryKind)
    ? (value as AtlasEntryKind)
    : "note";
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

function mapCollection(row: any, entryCount = 0): AtlasCollectionRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    entryCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadCollectionCounts(supabase: any, collectionIds: string[]) {
  const counts = new Map<string, number>();
  if (collectionIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("atlas_collection_entries")
    .select("collection_id")
    .in("collection_id", collectionIds);
  if (error) throw error;

  for (const row of data ?? []) {
    counts.set(row.collection_id, (counts.get(row.collection_id) ?? 0) + 1);
  }
  return counts;
}

export async function listAtlasCollectionsAction(): Promise<Result<AtlasCollectionRecord[]>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const { data, error } = await supabase
      .from("atlas_collections")
      .select("id,title,description,created_at,updated_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    const counts = await loadCollectionCounts(supabase, rows.map((row: any) => row.id));
    return {
      success: true,
      data: rows.map((row: any) => mapCollection(row, counts.get(row.id) ?? 0)),
    };
  } catch (error: any) {
    console.error("Failed to list Atlas collections:", error);
    return { success: false, error: error?.message || "Could not load Atlas collections." };
  }
}

export async function getAtlasCollectionAction(
  collectionId: string,
): Promise<Result<AtlasCollectionRecord>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const { data, error } = await supabase
      .from("atlas_collections")
      .select("id,title,description,created_at,updated_at")
      .eq("id", collectionId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { success: false, error: "Collection not found." };

    const counts = await loadCollectionCounts(supabase, [collectionId]);
    return { success: true, data: mapCollection(data, counts.get(collectionId) ?? 0) };
  } catch (error: any) {
    console.error("Failed to load Atlas collection:", error);
    return { success: false, error: error?.message || "Could not load this Collection." };
  }
}

export async function createAtlasCollectionAction(input: {
  title: string;
  description?: string;
}): Promise<Result<{ id: string }>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const title = input.title.trim();
    if (!title) return { success: false, error: "Give the Collection a title." };
    if (title.length > 160) return { success: false, error: "Collection titles can be up to 160 characters." };

    const { data, error } = await supabase
      .from("atlas_collections")
      .insert({
        user_id: userId,
        title,
        description: (input.description ?? "").trim().slice(0, 20_000),
        metadata: {},
      })
      .select("id")
      .single();
    if (error) throw error;

    revalidatePath("/atlas");
    revalidatePath("/atlas/collections");
    return { success: true, data: { id: data.id } };
  } catch (error: any) {
    console.error("Failed to create Atlas collection:", error);
    return { success: false, error: error?.message || "Could not create the Collection." };
  }
}

export async function updateAtlasCollectionAction(input: {
  id: string;
  title: string;
  description: string;
}): Promise<Result<AtlasCollectionRecord>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const title = input.title.trim();
    if (!title) return { success: false, error: "Give the Collection a title." };
    if (title.length > 160) return { success: false, error: "Collection titles can be up to 160 characters." };

    const { data, error } = await supabase
      .from("atlas_collections")
      .update({
        title,
        description: input.description.slice(0, 20_000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select("id,title,description,created_at,updated_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { success: false, error: "Collection not found or no longer available." };

    const counts = await loadCollectionCounts(supabase, [input.id]);
    revalidatePath("/atlas");
    revalidatePath("/atlas/collections");
    revalidatePath(`/atlas/collections/${input.id}`);
    return { success: true, data: mapCollection(data, counts.get(input.id) ?? 0) };
  } catch (error: any) {
    console.error("Failed to update Atlas collection:", error);
    return { success: false, error: error?.message || "Could not save the Collection." };
  }
}

export async function deleteAtlasCollectionAction(collectionId: string): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const ownership = await supabase
      .from("atlas_collections")
      .select("id")
      .eq("id", collectionId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (ownership.error) throw ownership.error;
    if (!ownership.data) return { success: false, error: "Collection not found." };

    const links = await supabase
      .from("atlas_collection_entries")
      .delete()
      .eq("collection_id", collectionId);
    if (links.error) throw links.error;

    const { error } = await supabase
      .from("atlas_collections")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", collectionId)
      .eq("user_id", userId)
      .is("deleted_at", null);
    if (error) throw error;

    revalidatePath("/atlas");
    revalidatePath("/atlas/collections");
    return { success: true, data: null };
  } catch (error: any) {
    console.error("Failed to delete Atlas collection:", error);
    return { success: false, error: error?.message || "Could not delete the Collection." };
  }
}

export async function getAtlasCollectionEntriesAction(
  collectionId: string,
): Promise<Result<AtlasCollectionEntryLink[]>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const collection = await supabase
      .from("atlas_collections")
      .select("id")
      .eq("id", collectionId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (collection.error) throw collection.error;
    if (!collection.data) return { success: false, error: "Collection not found." };

    const [entriesResult, linksResult] = await Promise.all([
      supabase
        .from("atlas_entries")
        .select("id,title,entry_type")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("title"),
      supabase
        .from("atlas_collection_entries")
        .select("entry_id")
        .eq("collection_id", collectionId),
    ]);
    if (entriesResult.error) throw entriesResult.error;
    if (linksResult.error) throw linksResult.error;

    const linkedIds = new Set((linksResult.data ?? []).map((row: any) => row.entry_id));
    return {
      success: true,
      data: (entriesResult.data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        entryType: normalizeEntryKind(row.entry_type),
        linked: linkedIds.has(row.id),
      })),
    };
  } catch (error: any) {
    console.error("Failed to load Collection entries:", error);
    return { success: false, error: error?.message || "Could not load Collection entries." };
  }
}

export async function setAtlasCollectionEntryLinkAction(input: {
  collectionId: string;
  entryId: string;
  linked: boolean;
}): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };

    const [collection, entry] = await Promise.all([
      supabase
        .from("atlas_collections")
        .select("id")
        .eq("id", input.collectionId)
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
    if (collection.error) throw collection.error;
    if (entry.error) throw entry.error;
    if (!collection.data || !entry.data) return { success: false, error: "Collection or Entry not found." };

    const { error } = input.linked
      ? await supabase
          .from("atlas_collection_entries")
          .upsert(
            { collection_id: input.collectionId, entry_id: input.entryId, sort_order: 0 },
            { onConflict: "collection_id,entry_id" },
          )
      : await supabase
          .from("atlas_collection_entries")
          .delete()
          .eq("collection_id", input.collectionId)
          .eq("entry_id", input.entryId);
    if (error) throw error;

    revalidatePath("/atlas/collections");
    revalidatePath(`/atlas/collections/${input.collectionId}`);
    revalidatePath(`/atlas/entries/${input.entryId}`);
    return { success: true, data: null };
  } catch (error: any) {
    console.error("Failed to update Collection Entry link:", error);
    return { success: false, error: error?.message || "Could not update the Collection." };
  }
}
