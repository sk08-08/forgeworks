"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import type { AtlasEntryKind } from "@/features/atlas/types/atlas-types";

export type AtlasOverviewStats = {
  entries: number;
  worlds: number;
  collections: number;
  lorebooks: number;
};

export type AtlasRecentItem = {
  id: string;
  title: string;
  kind: "entry" | "world" | "collection" | "lorebook";
  href: string;
  updatedAt: string;
  entryType?: AtlasEntryKind;
  description?: string;
};

export type AtlasOverviewData = {
  stats: AtlasOverviewStats;
  recent: AtlasRecentItem[];
};

export type AtlasSearchResult = {
  id: string;
  title: string;
  kind: "entry" | "world" | "collection" | "lorebook";
  href: string;
  subtitle: string;
  entryType?: AtlasEntryKind;
};

type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

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

function normalizeEntryKind(value: unknown): AtlasEntryKind {
  return allowedKinds.includes(value as AtlasEntryKind)
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

function compactDescription(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  return normalized.length > 110 ? `${normalized.slice(0, 107)}...` : normalized;
}

export async function getAtlasOverviewAction(): Promise<Result<AtlasOverviewData>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) {
      return { success: false, error: "You must be signed in to use Atlas." };
    }

    const [entries, worlds, collections, lorebooks] = await Promise.all([
      supabase
        .from("atlas_entries")
        .select("id,title,entry_type,content,updated_at", { count: "exact" })
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("atlas_worlds")
        .select("id,title,description,lore_summary,updated_at", { count: "exact" })
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("atlas_collections")
        .select("id,title,description,updated_at", { count: "exact" })
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("atlas_lorebooks")
        .select("id,title,description,updated_at", { count: "exact" })
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

    for (const result of [entries, worlds, collections, lorebooks]) {
      if (result.error) throw result.error;
    }

    const recent: AtlasRecentItem[] = [
      ...(entries.data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        kind: "entry" as const,
        href: `/atlas/entries/${row.id}`,
        updatedAt: row.updated_at,
        entryType: normalizeEntryKind(row.entry_type),
        description: compactDescription(row.content, "Atlas entry"),
      })),
      ...(worlds.data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        kind: "world" as const,
        href: `/atlas/worlds/${row.id}`,
        updatedAt: row.updated_at,
        description: compactDescription(row.description ?? row.lore_summary, "World"),
      })),
      ...(collections.data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        kind: "collection" as const,
        href: `/atlas/collections/${row.id}`,
        updatedAt: row.updated_at,
        description: compactDescription(row.description, "Collection"),
      })),
      ...(lorebooks.data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        kind: "lorebook" as const,
        href: `/atlas/lorebooks/${row.id}`,
        updatedAt: row.updated_at,
        description: compactDescription(row.description, "Lorebook"),
      })),
    ]
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 8);

    return {
      success: true,
      data: {
        stats: {
          entries: entries.count ?? 0,
          worlds: worlds.count ?? 0,
          collections: collections.count ?? 0,
          lorebooks: lorebooks.count ?? 0,
        },
        recent,
      },
    };
  } catch (error: any) {
    console.error("Failed to load Atlas overview:", error);
    return { success: false, error: error?.message || "Could not load Atlas overview." };
  }
}

export async function searchAtlasAction(rawQuery: string): Promise<Result<AtlasSearchResult[]>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) {
      return { success: false, error: "You must be signed in to use Atlas." };
    }

    const query = rawQuery.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
    if (query.length < 2) return { success: true, data: [] };

    const pattern = `%${query}%`;
    const [entries, worlds, collections, lorebooks] = await Promise.all([
      supabase
        .from("atlas_entries")
        .select("id,title,entry_type")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .ilike("title", pattern)
        .order("updated_at", { ascending: false })
        .limit(6),
      supabase
        .from("atlas_worlds")
        .select("id,title,description")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .ilike("title", pattern)
        .order("updated_at", { ascending: false })
        .limit(4),
      supabase
        .from("atlas_collections")
        .select("id,title,description")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .ilike("title", pattern)
        .order("updated_at", { ascending: false })
        .limit(4),
      supabase
        .from("atlas_lorebooks")
        .select("id,title,description")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .ilike("title", pattern)
        .order("updated_at", { ascending: false })
        .limit(4),
    ]);

    for (const result of [entries, worlds, collections, lorebooks]) {
      if (result.error) throw result.error;
    }

    const results: AtlasSearchResult[] = [
      ...(entries.data ?? []).map((row: any) => {
        const entryType = normalizeEntryKind(row.entry_type);
        return {
          id: row.id,
          title: row.title,
          kind: "entry" as const,
          href: `/atlas/entries/${row.id}`,
          subtitle: entryType.replaceAll("_", " "),
          entryType,
        };
      }),
      ...(worlds.data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        kind: "world" as const,
        href: `/atlas/worlds/${row.id}`,
        subtitle: "World",
      })),
      ...(collections.data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        kind: "collection" as const,
        href: `/atlas/collections/${row.id}`,
        subtitle: "Collection",
      })),
      ...(lorebooks.data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        kind: "lorebook" as const,
        href: `/atlas/lorebooks/${row.id}`,
        subtitle: "Lorebook",
      })),
    ];

    return { success: true, data: results.slice(0, 16) };
  } catch (error: any) {
    console.error("Failed to search Atlas:", error);
    return { success: false, error: error?.message || "Could not search Atlas." };
  }
}
