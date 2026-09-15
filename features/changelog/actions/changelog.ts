"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  mapChangelogRow,
  type ChangelogEntryInput,
  type ChangelogStatus,
} from "@/features/changelog/types";

function cleanList(values?: string[]) {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .slice(0, 24),
    ),
  );
}

function cleanSlug(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

async function requireOwner() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      userId: null as string | null,
      error: authError?.message || "Unauthenticated",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("staff_role, is_blocked")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { supabase, userId: user.id, error: profileError.message };
  }

  if (profile?.is_blocked || profile?.staff_role !== "owner") {
    return { supabase, userId: user.id, error: "Owner access required" };
  }

  return { supabase, userId: user.id, error: null as string | null };
}

export async function getPublishedChangelogEntries() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("changelog_entries")
    .select("*")
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .order("release_number", { ascending: false, nullsFirst: false });

  if (error) {
    return { success: false, error: error.message, entries: [] };
  }

  return {
    success: true,
    error: null,
    entries: (data || []).map(mapChangelogRow),
  };
}

export async function listChangelogEntriesAdmin() {
  const { supabase, error } = await requireOwner();

  if (error) {
    return { success: false, error, entries: [] };
  }

  const { data, error: queryError } = await supabase
    .from("changelog_entries")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (queryError) {
    return { success: false, error: queryError.message, entries: [] };
  }

  return {
    success: true,
    error: null,
    entries: (data || []).map(mapChangelogRow),
  };
}

export async function saveChangelogEntry(input: ChangelogEntryInput) {
  const { supabase, userId, error } = await requireOwner();

  if (error || !userId) {
    return { success: false, error: error || "Owner access required" };
  }

  const slug = cleanSlug(input.slug || input.title);

  if (!slug) {
    return { success: false, error: "A valid slug is required" };
  }

  const title = String(input.title || "").trim();
  if (!title) {
    return { success: false, error: "Title is required" };
  }

  const payload = {
    slug,
    version: String(input.version || "").trim() || null,
    release_number:
      typeof input.releaseNumber === "number" && Number.isFinite(input.releaseNumber)
        ? Math.trunc(input.releaseNumber)
        : null,
    title: title.slice(0, 180),
    headline: String(input.headline || "").trim().slice(0, 300),
    summary: String(input.summary || "").trim(),
    body_markdown: String(input.bodyMarkdown || ""),
    technical_markdown: String(input.technicalMarkdown || ""),
    release_type: input.releaseType || "development",
    status: input.status || "draft",
    areas: cleanList(input.areas),
    change_types: cleanList(input.changeTypes),
    is_featured: Boolean(input.isFeatured),
    updated_by: userId,
  };

  if (payload.is_featured) {
    const { error: featureError } = await supabase
      .from("changelog_entries")
      .update({ is_featured: false, updated_by: userId })
      .neq("id", input.id || "00000000-0000-0000-0000-000000000000");

    if (featureError) {
      return { success: false, error: featureError.message };
    }
  }

  let saved: any = null;
  let saveError: any = null;

  if (input.id) {
    const result = await supabase
      .from("changelog_entries")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    saved = result.data;
    saveError = result.error;
  } else {
    const result = await supabase
      .from("changelog_entries")
      .insert({
        ...payload,
        created_by: userId,
      })
      .select("*")
      .single();

    saved = result.data;
    saveError = result.error;
  }

  if (saveError) {
    return { success: false, error: saveError.message };
  }

  revalidatePath("/changelog");

  return {
    success: true,
    error: null,
    entry: mapChangelogRow(saved),
  };
}

export async function setChangelogEntryStatus(
  id: string,
  status: ChangelogStatus,
) {
  const { supabase, userId, error } = await requireOwner();

  if (error || !userId) {
    return { success: false, error: error || "Owner access required" };
  }

  const patch =
    status === "published"
      ? {
          status,
          published_at: new Date().toISOString(),
          updated_by: userId,
        }
      : {
          status,
          published_at: null,
          updated_by: userId,
        };

  const { data, error: updateError } = await supabase
    .from("changelog_entries")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/changelog");

  return {
    success: true,
    error: null,
    entry: mapChangelogRow(data),
  };
}

export async function deleteChangelogEntry(id: string) {
  const { supabase, error } = await requireOwner();

  if (error) {
    return { success: false, error };
  }

  const { error: deleteError } = await supabase
    .from("changelog_entries")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath("/changelog");

  return { success: true, error: null };
}
