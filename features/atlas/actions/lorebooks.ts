"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import type { AtlasEntryKind } from "@/features/atlas/types/atlas-types";
import type {
  ForgeKnowledgePackage,
  ForgeLorebookActivationMode,
} from "@/features/atlas/fkf/fkf-types";

export type AtlasLorebookRecord = {
  id: string;
  title: string;
  description: string;
  entryCount: number;
  enabledCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AtlasLorebookEntryRecord = {
  entryId: string;
  title: string;
  entryType: AtlasEntryKind;
  content: string;
  aliases: string[];
  tags: string[];
  sortOrder: number;
  enabled: boolean;
  activationMode: ForgeLorebookActivationMode;
  primaryKeys: string[];
  secondaryKeys: string[];
  caseSensitive: boolean;
  matchWholeWords: boolean;
  priority: number;
  depth: number | null;
  probability: number | null;
};

export type AtlasLorebookEntryCandidate = {
  id: string;
  title: string;
  entryType: AtlasEntryKind;
  linked: boolean;
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

function normalizeKind(value: unknown): AtlasEntryKind {
  return allowedKinds.includes(value as AtlasEntryKind)
    ? (value as AtlasEntryKind)
    : "note";
}

function normalizeStrings(value: unknown): string[] {
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

function normalizeActivation(value: unknown): {
  mode: ForgeLorebookActivationMode;
  primaryKeys: string[];
  secondaryKeys: string[];
  caseSensitive: boolean;
  matchWholeWords: boolean;
} {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const mode = ["keywords", "always", "conditional"].includes(String(source.mode))
    ? (String(source.mode) as ForgeLorebookActivationMode)
    : "keywords";
  return {
    mode,
    primaryKeys: normalizeStrings(source.primaryKeys),
    secondaryKeys: normalizeStrings(source.secondaryKeys),
    caseSensitive: source.caseSensitive === true,
    matchWholeWords: source.matchWholeWords !== false,
  };
}

function normalizeInsertion(value: unknown): { priority: number; depth?: number } {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const priority = Number.isFinite(Number(source.priority)) ? Number(source.priority) : 0;
  const depth = Number.isFinite(Number(source.depth)) ? Number(source.depth) : undefined;
  return { priority, ...(depth === undefined ? {} : { depth }) };
}

function legacyKindFor(entryType: AtlasEntryKind) {
  if (["character", "location", "note"].includes(entryType)) return entryType;
  if (entryType === "event") return "timeline";
  return "lore";
}

function inferImportedEntryType(source: Record<string, unknown>): AtlasEntryKind {
  const category = String(source.category ?? "").trim().toLowerCase();
  if (category === "character") return "character";
  if (["place", "location"].includes(category)) return "location";
  if (["event", "timeline"].includes(category)) return "event";
  if (["faction", "organization", "species", "object", "concept", "note", "lore"].includes(category)) {
    return normalizeKind(category);
  }
  return "lore";
}

async function getOwnerContext() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  const userId = access.user?.id ?? null;
  if (!userId || access.isBlocked) return { supabase, userId: null };
  return { supabase, userId };
}

async function assertLorebookOwner(supabase: any, userId: string, lorebookId: string) {
  const result = await supabase
    .from("atlas_lorebooks")
    .select("id,title,description,summary,created_at,updated_at")
    .eq("id", lorebookId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data ?? null;
}

async function loadLorebookCounts(supabase: any, lorebookIds: string[]) {
  const counts = new Map<string, { total: number; enabled: number }>();
  if (lorebookIds.length === 0) return counts;
  const { data, error } = await supabase
    .from("atlas_lorebook_entries")
    .select("lorebook_id,enabled")
    .in("lorebook_id", lorebookIds);
  if (error) throw error;
  for (const row of data ?? []) {
    const current = counts.get(row.lorebook_id) ?? { total: 0, enabled: 0 };
    current.total += 1;
    if (row.enabled !== false) current.enabled += 1;
    counts.set(row.lorebook_id, current);
  }
  return counts;
}

function mapLorebook(row: any, counts = { total: 0, enabled: 0 }): AtlasLorebookRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? row.summary ?? "",
    entryCount: counts.total,
    enabledCount: counts.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAtlasLorebooksAction(): Promise<Result<AtlasLorebookRecord[]>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };
    const { data, error } = await supabase
      .from("atlas_lorebooks")
      .select("id,title,description,summary,created_at,updated_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const rows = data ?? [];
    const counts = await loadLorebookCounts(supabase, rows.map((row: any) => row.id));
    return {
      success: true,
      data: rows.map((row: any) => mapLorebook(row, counts.get(row.id))),
    };
  } catch (error: any) {
    console.error("Failed to list Atlas lorebooks:", error);
    return { success: false, error: error?.message || "Could not load Atlas lorebooks." };
  }
}

export async function getAtlasLorebookAction(lorebookId: string): Promise<Result<AtlasLorebookRecord>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };
    const row = await assertLorebookOwner(supabase, userId, lorebookId);
    if (!row) return { success: false, error: "Lorebook not found." };
    const counts = await loadLorebookCounts(supabase, [lorebookId]);
    return { success: true, data: mapLorebook(row, counts.get(lorebookId)) };
  } catch (error: any) {
    console.error("Failed to load Atlas lorebook:", error);
    return { success: false, error: error?.message || "Could not load this Lorebook." };
  }
}

export async function createAtlasLorebookAction(input: {
  title: string;
  description?: string;
}): Promise<Result<{ id: string }>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };
    const title = input.title.trim();
    if (!title) return { success: false, error: "Give the Lorebook a title." };
    if (title.length > 160) return { success: false, error: "Lorebook titles can be up to 160 characters." };
    const description = (input.description ?? "").trim().slice(0, 20_000);
    const { data, error } = await supabase
      .from("atlas_lorebooks")
      .insert({
        user_id: userId,
        title,
        summary: description,
        description,
        format_version: 1,
        metadata: {},
        source_metadata: {},
      })
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/atlas");
    revalidatePath("/atlas/lorebooks");
    return { success: true, data: { id: data.id } };
  } catch (error: any) {
    console.error("Failed to create Atlas lorebook:", error);
    return { success: false, error: error?.message || "Could not create the Lorebook." };
  }
}

export async function updateAtlasLorebookAction(input: {
  id: string;
  title: string;
  description: string;
}): Promise<Result<AtlasLorebookRecord>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };
    const title = input.title.trim();
    if (!title) return { success: false, error: "Give the Lorebook a title." };
    const description = input.description.slice(0, 20_000);
    const { data, error } = await supabase
      .from("atlas_lorebooks")
      .update({
        title,
        summary: description,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select("id,title,description,summary,created_at,updated_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { success: false, error: "Lorebook not found." };
    const counts = await loadLorebookCounts(supabase, [input.id]);
    revalidatePath("/atlas/lorebooks");
    revalidatePath(`/atlas/lorebooks/${input.id}`);
    return { success: true, data: mapLorebook(data, counts.get(input.id)) };
  } catch (error: any) {
    console.error("Failed to update Atlas lorebook:", error);
    return { success: false, error: error?.message || "Could not save the Lorebook." };
  }
}

export async function deleteAtlasLorebookAction(lorebookId: string): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };
    const lorebook = await assertLorebookOwner(supabase, userId, lorebookId);
    if (!lorebook) return { success: false, error: "Lorebook not found." };
    const links = await supabase.from("atlas_lorebook_entries").delete().eq("lorebook_id", lorebookId);
    if (links.error) throw links.error;
    const { error } = await supabase
      .from("atlas_lorebooks")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", lorebookId)
      .eq("user_id", userId)
      .is("deleted_at", null);
    if (error) throw error;
    revalidatePath("/atlas");
    revalidatePath("/atlas/lorebooks");
    return { success: true, data: null };
  } catch (error: any) {
    console.error("Failed to delete Atlas lorebook:", error);
    return { success: false, error: error?.message || "Could not delete the Lorebook." };
  }
}

export async function getAtlasLorebookEntriesAction(lorebookId: string): Promise<
  Result<{ entries: AtlasLorebookEntryRecord[]; candidates: AtlasLorebookEntryCandidate[] }>
> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };
    const lorebook = await assertLorebookOwner(supabase, userId, lorebookId);
    if (!lorebook) return { success: false, error: "Lorebook not found." };
    const [entriesResult, linksResult] = await Promise.all([
      supabase
        .from("atlas_entries")
        .select("id,title,entry_type,content,aliases,tags")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("title"),
      supabase
        .from("atlas_lorebook_entries")
        .select("entry_id,sort_order,enabled,activation,insertion,probability")
        .eq("lorebook_id", lorebookId)
        .order("sort_order"),
    ]);
    if (entriesResult.error) throw entriesResult.error;
    if (linksResult.error) throw linksResult.error;
    const entryMap = new Map((entriesResult.data ?? []).map((row: any) => [row.id, row]));
    const linkedIds = new Set((linksResult.data ?? []).map((row: any) => row.entry_id));
    const entries: AtlasLorebookEntryRecord[] = (linksResult.data ?? [])
      .map((link: any) => {
        const row = entryMap.get(link.entry_id);
        if (!row) return null;
        const activation = normalizeActivation(link.activation);
        const insertion = normalizeInsertion(link.insertion);
        return {
          entryId: row.id,
          title: row.title,
          entryType: normalizeKind(row.entry_type),
          content: row.content ?? "",
          aliases: normalizeStrings(row.aliases),
          tags: normalizeStrings(row.tags),
          sortOrder: link.sort_order ?? 0,
          enabled: link.enabled !== false,
          activationMode: activation.mode,
          primaryKeys: activation.primaryKeys,
          secondaryKeys: activation.secondaryKeys,
          caseSensitive: activation.caseSensitive,
          matchWholeWords: activation.matchWholeWords,
          priority: insertion.priority,
          depth: insertion.depth ?? null,
          probability: link.probability == null ? null : Number(link.probability),
        } satisfies AtlasLorebookEntryRecord;
      })
      .filter(Boolean) as AtlasLorebookEntryRecord[];
    const candidates = (entriesResult.data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      entryType: normalizeKind(row.entry_type),
      linked: linkedIds.has(row.id),
    }));
    return { success: true, data: { entries, candidates } };
  } catch (error: any) {
    console.error("Failed to load Lorebook entries:", error);
    return { success: false, error: error?.message || "Could not load Lorebook entries." };
  }
}

export async function setAtlasLorebookEntryLinkAction(input: {
  lorebookId: string;
  entryId: string;
  linked: boolean;
}): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };
    const lorebook = await assertLorebookOwner(supabase, userId, input.lorebookId);
    if (!lorebook) return { success: false, error: "Lorebook not found." };
    const entry = await supabase
      .from("atlas_entries")
      .select("id,title,aliases")
      .eq("id", input.entryId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (entry.error) throw entry.error;
    if (!entry.data) return { success: false, error: "Entry not found." };
    if (input.linked) {
      const last = await supabase
        .from("atlas_lorebook_entries")
        .select("sort_order")
        .eq("lorebook_id", input.lorebookId)
        .order("sort_order", { ascending: false })
        .limit(1);
      if (last.error) throw last.error;
      const sortOrder = (last.data?.[0]?.sort_order ?? -1) + 1;
      const aliases = normalizeStrings(entry.data.aliases);
      const primaryKeys = Array.from(new Set([entry.data.title, ...aliases])).filter(Boolean).slice(0, 20);
      const { error } = await supabase.from("atlas_lorebook_entries").upsert({
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
      }, { onConflict: "lorebook_id,entry_id" });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("atlas_lorebook_entries")
        .delete()
        .eq("lorebook_id", input.lorebookId)
        .eq("entry_id", input.entryId);
      if (error) throw error;
    }
    revalidatePath(`/atlas/lorebooks/${input.lorebookId}`);
    revalidatePath(`/atlas/entries/${input.entryId}`);
    return { success: true, data: null };
  } catch (error: any) {
    console.error("Failed to update Lorebook membership:", error);
    return { success: false, error: error?.message || "Could not update Lorebook membership." };
  }
}

export async function updateAtlasLorebookEntryConfigAction(input: {
  lorebookId: string;
  entryId: string;
  enabled: boolean;
  activationMode: ForgeLorebookActivationMode;
  primaryKeys: string[];
  secondaryKeys: string[];
  caseSensitive: boolean;
  matchWholeWords: boolean;
  priority: number;
  depth: number | null;
  probability: number | null;
}): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };
    const lorebook = await assertLorebookOwner(supabase, userId, input.lorebookId);
    if (!lorebook) return { success: false, error: "Lorebook not found." };
    const mode = ["keywords", "always", "conditional"].includes(input.activationMode)
      ? input.activationMode
      : "keywords";
    const probability = input.probability == null
      ? null
      : Math.min(100, Math.max(0, Number(input.probability)));
    const insertion: Record<string, number> = {
      priority: Number.isFinite(input.priority) ? input.priority : 0,
    };
    if (input.depth != null && Number.isFinite(input.depth)) insertion.depth = input.depth;
    const { error } = await supabase
      .from("atlas_lorebook_entries")
      .update({
        enabled: input.enabled,
        activation: {
          mode,
          primaryKeys: normalizeStrings(input.primaryKeys),
          secondaryKeys: normalizeStrings(input.secondaryKeys),
          caseSensitive: input.caseSensitive,
          matchWholeWords: input.matchWholeWords,
        },
        insertion,
        probability,
        updated_at: new Date().toISOString(),
      })
      .eq("lorebook_id", input.lorebookId)
      .eq("entry_id", input.entryId);
    if (error) throw error;
    revalidatePath(`/atlas/lorebooks/${input.lorebookId}`);
    return { success: true, data: null };
  } catch (error: any) {
    console.error("Failed to update Lorebook entry config:", error);
    return { success: false, error: error?.message || "Could not save the Lorebook entry settings." };
  }
}

export async function reorderAtlasLorebookEntriesAction(input: {
  lorebookId: string;
  entryIds: string[];
}): Promise<Result<null>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };
    const lorebook = await assertLorebookOwner(supabase, userId, input.lorebookId);
    if (!lorebook) return { success: false, error: "Lorebook not found." };
    const entryIds = Array.from(new Set(input.entryIds)).slice(0, 2000);
    for (let index = 0; index < entryIds.length; index += 1) {
      const { error } = await supabase
        .from("atlas_lorebook_entries")
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq("lorebook_id", input.lorebookId)
        .eq("entry_id", entryIds[index]);
      if (error) throw error;
    }
    revalidatePath(`/atlas/lorebooks/${input.lorebookId}`);
    return { success: true, data: null };
  } catch (error: any) {
    console.error("Failed to reorder Lorebook entries:", error);
    return { success: false, error: error?.message || "Could not reorder the Lorebook." };
  }
}

async function buildLorebookExportData(supabase: any, userId: string, lorebookId: string) {
  const lorebook = await assertLorebookOwner(supabase, userId, lorebookId);
  if (!lorebook) throw new Error("Lorebook not found.");
  const links = await supabase
    .from("atlas_lorebook_entries")
    .select("entry_id,sort_order,enabled,activation,insertion,probability,adapter_metadata")
    .eq("lorebook_id", lorebookId)
    .order("sort_order");
  if (links.error) throw links.error;
  const entryIds = (links.data ?? []).map((row: any) => row.entry_id);
  const entries = entryIds.length === 0
    ? { data: [], error: null }
    : await supabase
        .from("atlas_entries")
        .select("id,title,entry_type,content,aliases,tags,metadata,source_format,source_metadata")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .in("id", entryIds);
  if (entries.error) throw entries.error;
  type LorebookExportEntryRow = {
    id: string;
    title: string;
    entry_type: string | null;
    content: string | null;
    aliases: string[] | null;
    tags: string[] | null;
    metadata: Record<string, unknown> | null;
    source_format: string | null;
    source_metadata: Record<string, unknown> | null;
  };

  const entryMap = new Map<string, LorebookExportEntryRow>(
    ((entries.data ?? []) as LorebookExportEntryRow[]).map((row) => [row.id, row]),
  );
  return { lorebook, links: links.data ?? [], entryMap };
}

export async function exportAtlasLorebookFkfAction(lorebookId: string): Promise<Result<ForgeKnowledgePackage>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };
    const { lorebook, links, entryMap } = await buildLorebookExportData(supabase, userId, lorebookId);
    const entryIds = links.map((row: any) => row.entry_id);
    const relationsResult = entryIds.length < 2
      ? { data: [], error: null }
      : await supabase
          .from("atlas_relations")
          .select("id,source_entry_id,target_entry_id,relation_type,label,inverse_label,metadata")
          .eq("user_id", userId)
          .in("source_entry_id", entryIds)
          .in("target_entry_id", entryIds);
    if (relationsResult.error) throw relationsResult.error;
    const pkg: ForgeKnowledgePackage = {
      format: "forge-knowledge",
      version: 1,
      metadata: {
        title: lorebook.title,
        description: lorebook.description ?? lorebook.summary ?? "",
        createdAt: lorebook.created_at,
        updatedAt: lorebook.updated_at,
        generator: "Atlas",
      },
      entries: entryIds.map((id: string) => entryMap.get(id)).filter(Boolean).map((row: any) => ({
        id: row.id,
        title: row.title,
        type: normalizeKind(row.entry_type),
        content: row.content ?? "",
        aliases: normalizeStrings(row.aliases),
        tags: normalizeStrings(row.tags),
        extensions: {
          metadata: row.metadata ?? {},
          sourceFormat: row.source_format ?? undefined,
          sourceMetadata: row.source_metadata ?? {},
        },
      })),
      worlds: [],
      collections: [],
      relations: (relationsResult.data ?? []).map((row: any) => ({
        id: row.id,
        sourceEntryId: row.source_entry_id,
        targetEntryId: row.target_entry_id,
        type: row.relation_type,
        label: row.label ?? undefined,
        inverseLabel: row.inverse_label ?? undefined,
        metadata: row.metadata ?? {},
      })),
      lorebooks: [{
        id: lorebook.id,
        title: lorebook.title,
        description: lorebook.description ?? lorebook.summary ?? "",
        entries: links.map((row: any) => {
          const activation = normalizeActivation(row.activation);
          const insertion = normalizeInsertion(row.insertion);
          return {
            entryId: row.entry_id,
            enabled: row.enabled !== false,
            activation,
            insertion,
            probability: row.probability == null ? undefined : Number(row.probability),
            adapterMetadata: row.adapter_metadata ?? {},
          };
        }),
      }],
    };
    return { success: true, data: pkg };
  } catch (error: any) {
    console.error("Failed to export FKF lorebook:", error);
    return { success: false, error: error?.message || "Could not export this Lorebook as FKF." };
  }
}

export async function exportAtlasLorebookJanitorAction(lorebookId: string): Promise<Result<Record<string, unknown>[]>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };
    const { links, entryMap } = await buildLorebookExportData(supabase, userId, lorebookId);
    const output = links.map((link: any, index: number) => {
      const entry = entryMap.get(link.entry_id);
      if (!entry) return null;
      const activation = normalizeActivation(link.activation);
      const insertion = normalizeInsertion(link.insertion);
      const adapterMetadata = link.adapter_metadata && typeof link.adapter_metadata === "object"
        ? link.adapter_metadata as Record<string, unknown>
        : {};
      const raw = adapterMetadata.raw && typeof adapterMetadata.raw === "object" && !Array.isArray(adapterMetadata.raw)
        ? { ...(adapterMetadata.raw as Record<string, unknown>) }
        : {};
      const rawExtensions = raw.extensions && typeof raw.extensions === "object" && !Array.isArray(raw.extensions)
        ? { ...(raw.extensions as Record<string, unknown>) }
        : {};
      const probability = link.probability == null ? 100 : Number(link.probability);
      const depth = insertion.depth;
      const insertionOrder = Number.isFinite(Number(raw.insertion_order))
        ? Number(raw.insertion_order)
        : link.sort_order ?? index;
      return {
        ...raw,
        id: raw.id ?? index,
        name: entry.title,
        content: entry.content ?? "",
        category: raw.category ?? normalizeKind(entry.entry_type ?? "note"),
        comment: raw.comment ?? "",
        enabled: link.enabled !== false,
        constant: activation.mode === "always",
        activationMode: activation.mode,
        key: activation.primaryKeys,
        keysecondary: activation.secondaryKeys,
        case_sensitive: activation.caseSensitive,
        matchWholeWords: activation.matchWholeWords,
        priority: insertion.priority,
        insertion_order: insertionOrder,
        ...(depth === undefined ? {} : { depth }),
        probability,
        tags: normalizeStrings(entry.tags),
        extensions: {
          ...rawExtensions,
          ...(depth === undefined ? {} : { depth }),
          probability,
        },
      } satisfies Record<string, unknown>;
    }).filter(Boolean) as Record<string, unknown>[];
    return { success: true, data: output };
  } catch (error: any) {
    console.error("Failed to export Janitor AI lorebook:", error);
    return { success: false, error: error?.message || "Could not export this Lorebook for Janitor AI." };
  }
}

export async function importJanitorLorebookAction(input: {
  title: string;
  sourceEntries: unknown[];
}): Promise<Result<{ id: string; importedEntries: number }>> {
  try {
    const { supabase, userId } = await getOwnerContext();
    if (!userId) return { success: false, error: "You must be signed in to use Atlas." };
    const title = input.title.trim() || "Imported lorebook";
    if (!Array.isArray(input.sourceEntries)) return { success: false, error: "Janitor AI import expects a JSON array." };
    if (input.sourceEntries.length > 2000) return { success: false, error: "This Lorebook is too large to import in one pass." };
    const lorebookResult = await supabase
      .from("atlas_lorebooks")
      .insert({
        user_id: userId,
        title: title.slice(0, 160),
        summary: "Imported from Janitor AI",
        description: "Imported from Janitor AI",
        format_version: 1,
        metadata: {},
        source_format: "janitor-ai",
        source_metadata: {},
      })
      .select("id")
      .single();
    if (lorebookResult.error) throw lorebookResult.error;
    const lorebookId = lorebookResult.data.id;
    let importedEntries = 0;
    for (let index = 0; index < input.sourceEntries.length; index += 1) {
      const source = input.sourceEntries[index];
      if (!source || typeof source !== "object" || Array.isArray(source)) continue;
      const row = source as Record<string, unknown>;
      const entryType = inferImportedEntryType(row);
      const titleValue = String(row.name ?? `Entry ${index + 1}`).trim().slice(0, 160) || `Entry ${index + 1}`;
      const content = String(row.content ?? "").slice(0, 500_000);
      const aliases = normalizeStrings(row.key);
      const tags = normalizeStrings(row.tags);
      const entryResult = await supabase
        .from("atlas_entries")
        .insert({
          user_id: userId,
          title: titleValue,
          entry_type: entryType,
          content,
          aliases,
          tags,
          metadata: {},
          source_format: "janitor-ai",
          source_metadata: row,
        })
        .select("id")
        .single();
      if (entryResult.error) throw entryResult.error;
      const constant = row.constant === true;
      const activationMode: ForgeLorebookActivationMode = constant
        ? "always"
        : String(row.activationMode ?? "").toLowerCase().includes("conditional")
          ? "conditional"
          : "keywords";
      const depth = Number.isFinite(Number(row.depth))
        ? Number(row.depth)
        : row.extensions && typeof row.extensions === "object" && Number.isFinite(Number((row.extensions as any).depth))
          ? Number((row.extensions as any).depth)
          : undefined;
      const probability = Number.isFinite(Number(row.probability))
        ? Number(row.probability)
        : row.extensions && typeof row.extensions === "object" && Number.isFinite(Number((row.extensions as any).probability))
          ? Number((row.extensions as any).probability)
          : 100;
      const priority = Number.isFinite(Number(row.priority)) ? Number(row.priority) : index;
      const membership = await supabase.from("atlas_lorebook_entries").insert({
        lorebook_id: lorebookId,
        entry_id: entryResult.data.id,
        sort_order: index,
        enabled: row.enabled !== false,
        activation: {
          mode: activationMode,
          primaryKeys: normalizeStrings(row.key),
          secondaryKeys: normalizeStrings(row.keysecondary),
          caseSensitive: row.case_sensitive === true,
          matchWholeWords: row.matchWholeWords !== false,
        },
        insertion: { priority, ...(depth === undefined ? {} : { depth }) },
        probability: Math.min(100, Math.max(0, probability)),
        adapter_metadata: { sourceFormat: "janitor-ai", raw: row },
      });
      if (membership.error) throw membership.error;
      importedEntries += 1;
    }
    revalidatePath("/atlas");
    revalidatePath("/atlas/entries");
    revalidatePath("/atlas/lorebooks");
    return { success: true, data: { id: lorebookId, importedEntries } };
  } catch (error: any) {
    console.error("Failed to import Janitor AI lorebook:", error);
    return { success: false, error: error?.message || "Could not import this Janitor AI Lorebook." };
  }
}
