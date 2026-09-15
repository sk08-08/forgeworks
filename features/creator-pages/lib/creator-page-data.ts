// ============================================================================
// Forgeworks - Creator Page Data
// Server-side data required to render a published Creator Page.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreatorPageSection,
  BotPreview,
  WorldPreview,
} from "@/features/creator-pages/types/creator-page-types";
export interface CreatorPageLoadResult {
  creatorPage: {
    id: string;
    user_id: string;
    slug: string;
    title: string;
    description: string;
    is_published: boolean;
    config: Record<string, unknown>;
  };
  sections: CreatorPageSection[];
  bots: BotPreview[];
  worlds: WorldPreview[];
}

/**
 * Fetches the published page plus the resources required by its blocks.
 * Returns null when no published page exists for the slug.
 */
export async function fetchCreatorPageData(
  supabase: SupabaseClient,
  slug: string,
): Promise<CreatorPageLoadResult | null> {
  // Find published creator page by slug
  const { data: creatorPage, error: pageError } = await supabase
    .from("active_creator_pages")
    .select("id, user_id, slug, title, description, is_published, config")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (pageError) throw pageError;
  if (!creatorPage) return null;

  // Fetch sections, bots, and worlds in parallel
  const [
    { data: sections, error: sectionsError },
    { data: bots, error: botsError },
    { data: worlds, error: worldsError },
  ] = await Promise.all([
    supabase
      .from("active_creator_page_sections")
      .select("id, page_id, kind, title, config, position")
      .eq("page_id", creatorPage.id)
      .order("position", { ascending: true }),
    supabase
      .from("active_bots")
      .select(
        "id, name, short_description, tags, rating, image_url, created_at, hide_sensitive_fields",
      )
      .eq("user_id", creatorPage.user_id)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("atlas_worlds")
      .select(
        "id, title, slug, description, world_bot_links:atlas_world_bots(bot_id)",
      )
      .eq("user_id", creatorPage.user_id)
      .order("updated_at", { ascending: false }),
  ]);

  if (sectionsError) throw sectionsError;
  if (botsError) throw botsError;
  if (worldsError) throw worldsError;

  return {
    creatorPage,
    sections: ((sections || []) as CreatorPageSection[]).map((s) => ({
      id: s.id,
      page_id: s.page_id,
      kind: s.kind,
      title: s.title,
      config: s.config || {},
      position: s.position,
    })),
    bots: (bots || []).map((b: Record<string, unknown>) => ({
      id: b.id as string,
      name: b.name as string,
      short_description: (b.short_description as string) || "",
      tags: Array.isArray(b.tags) ? (b.tags as string[]) : [],
      rating: b.rating as string,
      image_url: (b.image_url as string) || null,
      created_at: b.created_at as string,
      hide_sensitive_fields: b.hide_sensitive_fields === true,
    })),
    worlds: (worlds || []).map((w: Record<string, unknown>) => ({
      id: w.id as string,
      title: w.title as string,
      slug: w.slug as string,
      description: (w.description as string) || "",
      bot_ids: (
        (w.world_bot_links as Array<{ bot_id: string }> | null) || []
      ).map((rel) => rel.bot_id),
    })),
  };
}

/**
 * Generates SEO metadata for a creator page.
 */
export function buildCreatorPageMeta(
  creatorPage: { title: string; description: string },
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null,
  slug: string,
) {
  const title = creatorPage.title || profile?.display_name || slug;
  const description =
    creatorPage.description ||
    `Creator page by ${profile?.display_name || profile?.username || "Unknown"}`;

  return {
    title: `${title} — Forgeworks`,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 160),
      type: "profile" as const,
      images: profile?.avatar_url ? [profile.avatar_url] : [],
    },
  };
}
