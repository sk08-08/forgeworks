"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// ============================================================================
// Server-side search actions using Supabase
// ============================================================================

/**
 * Get the current user ID from Supabase auth or session cookie.
 */
async function getUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | undefined> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) return data.user.id;
  } catch {
    // ignore
  }
  const cookieStore = await cookies();
  const session = cookieStore.get("forgeworks_session")?.value;
  if (session) {
    try {
      const parsed = JSON.parse(session);
      return parsed?.userId;
    } catch {
      // ignore
    }
  }
  return undefined;
}

// ---- Bot Search ----

export interface SearchResultBot {
  id: string;
  name: string;
  short_description: string;
  personality: string;
  tags: string[];
  rating: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function searchBots(
  query: string,
  ratingFilter: "all" | "SFW" | "NSFW" = "all",
  limit = 20,
  offset = 0,
): Promise<{
  success: boolean;
  bots?: SearchResultBot[];
  total?: number;
  error?: string;
}> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { success: false, error: "Unauthenticated" };

  // Build base query for counting
  let countQuery = supabase
    .from("active_bots")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (query.trim()) {
    const escaped = query.replace(/[,()]/g, " ").trim();
    countQuery = countQuery.or(
      `name.ilike.%${escaped}%,short_description.ilike.%${escaped}%,tags.cs.{${escaped}}`,
    );
  }
  if (ratingFilter !== "all") {
    countQuery = countQuery.eq("rating", ratingFilter);
  }

  const { count } = await countQuery;

  let q = supabase
    .from("active_bots")
    .select(
      "id, name, short_description, personality, tags, rating, image_url, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.trim()) {
    const escaped = query.replace(/[,()]/g, " ").trim();
    q = q.or(
      `name.ilike.%${escaped}%,short_description.ilike.%${escaped}%,tags.cs.{${escaped}}`,
    );
  }

  if (ratingFilter !== "all") {
    q = q.eq("rating", ratingFilter);
  }

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    bots: (data || []) as SearchResultBot[],
    total: count || 0,
  };
}
