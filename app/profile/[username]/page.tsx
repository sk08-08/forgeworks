// ============================================================================
// Forgeworks - Public User Profile
// Accessible at /profile/[username] for viewing other users' profiles
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicProfile } from "@/features/profile/components/public-profile";
import { loadProfileBadges } from "@/features/profile/lib/profile-badges";
import {
  applyProfileSectionSelection,
  getProfileSection,
  getPublicProfileSectionSelectedIds,
  resolveProfileSections,
  type PublicProfileSectionSelectionRow,
} from "@/features/profile/lib/profile-sections";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const normalizedHandle = decodeURIComponent(username).trim();

  let { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, username, slug, tagline, avatar_url, bio, visibility",
    )
    .eq("slug", normalizedHandle)
    .maybeSingle();

  if (!profile) {
    const fallback = await supabase
      .from("profiles")
      .select(
        "display_name, username, slug, tagline, avatar_url, bio, visibility",
      )
      .eq("username", normalizedHandle)
      .maybeSingle();

    profile = fallback.data;
  }

  if (!profile || profile.visibility === "private") {
    return { title: "Profile Not Found" };
  }

  const title = profile.display_name || profile.username || username;

  const plainBio = stripMarkdownToText(profile.bio || "");
  const description =
    profile.tagline ||
    plainBio.slice(0, 160) ||
    `Profile of ${title} on Forgeworks`;

  return {
    title: `@${title}`,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 160),
      type: "profile",
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // Find profile by public slug, with username fallback for older links
  const normalizedHandle = decodeURIComponent(username).trim();

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      username,
      display_name,
      bio,
      tagline,
      avatar_url,
      banner_url,
      slug,
      theme,
      created_at,
      pronouns,
      location,
      website_url,
      specialties,
      status_message,
      social_links,
      visibility,
      profile_completeness,
      profile_sections (
        section_key,
        enabled,
        sort_order,
        selection_mode,
        config
      ),
      active_profile_featured_bots (
        sort_order,
        bot:active_bots (*)
      )
    `,
    )
    .eq("slug", normalizedHandle)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load profile by slug:", profileError);
  }

  if (!profile) {
    const fallback = await supabase
      .from("profiles")
      .select(
        `
        id,
        username,
        display_name,
        bio,
        tagline,
        avatar_url,
        banner_url,
        slug,
        theme,
        created_at,
        pronouns,
        location,
        website_url,
        specialties,
        status_message,
        social_links,
        visibility,
        profile_completeness,
        profile_sections (
          section_key,
          enabled,
          sort_order,
          selection_mode,
          config
        ),
        active_profile_featured_bots (
          sort_order,
          bot:active_bots (*)
        )
      `,
      )
      .eq("username", normalizedHandle)
      .maybeSingle();

    if (fallback.error) {
      console.error("Failed to load profile by username:", fallback.error);
    }

    profile = fallback.data;
  }

  if (!profile) {
    notFound();
  }

  const normalizedProfile = {
    ...profile,
    profile_badges: await loadProfileBadges(supabase, profile.id),
  };

  const isOwnProfile = currentUser?.id === normalizedProfile.id;

  // A private profile is unavailable to everyone else.
  if (normalizedProfile.visibility === "private") {
    notFound();
  }

  const resolvedSections = resolveProfileSections(
    normalizedProfile.profile_sections,
    (normalizedProfile.theme as Record<string, unknown>) || {},
  );

  const botsSection = getProfileSection(resolvedSections, "bots");
  const creatorPagesSection = getProfileSection(
    resolvedSections,
    "creator_pages",
  );
  const worldsSection = getProfileSection(resolvedSections, "worlds");
  const formsSection = getProfileSection(resolvedSections, "forms");

  const { data: profileSelectionRows, error: profileSelectionError } =
    await supabase.rpc("get_public_profile_section_selections", {
      p_profile_id: normalizedProfile.id,
    });

  if (profileSelectionError) {
    console.error(
      "Failed to load public profile section selections:",
      profileSelectionError,
    );
  }

  const safeProfileSelectionRows = (profileSelectionRows ||
    []) as PublicProfileSectionSelectionRow[];

  const selectedBotIds = getPublicProfileSectionSelectedIds(
    safeProfileSelectionRows,
    "bots",
  );

  const selectedCreatorPageIds = getPublicProfileSectionSelectedIds(
    safeProfileSelectionRows,
    "creator_pages",
  );

  const selectedWorldIds = getPublicProfileSectionSelectedIds(
    safeProfileSelectionRows,
    "worlds",
  );

  const selectedFormIds = getPublicProfileSectionSelectedIds(
    safeProfileSelectionRows,
    "forms",
  );

  // Fetch their published creator pages
  const { data: pages, error: pagesError } = await supabase
    .from("active_creator_pages")
    .select("id, slug, title, description, is_published")
    .eq("user_id", normalizedProfile.id)
    .eq("is_published", true)
    .order("updated_at", { ascending: false });

  if (pagesError) {
    console.error("Failed to load profile creator pages:", pagesError);
  }

  const profileCreatorPages = applyProfileSectionSelection(
    pages || [],
    creatorPagesSection,
    selectedCreatorPageIds,
  );

  // Fetch their public bots
  const { data: bots, error: botsError } = await supabase
    .from("active_bots")
    .select(
      "id, name, short_description, tags, rating, image_url, created_at, hide_sensitive_fields, personality, first_message, scenario, example_dialogues",
    )
    .eq("user_id", normalizedProfile.id)
    .order("updated_at", { ascending: false });

  if (botsError) {
    console.error("Failed to load profile bots:", botsError);
  }

  const profileBots = applyProfileSectionSelection(
    bots || [],
    botsSection,
    selectedBotIds,
  );

  // Fetch worlds (same strategy as own profile: worlds + links in separate queries)
  const { data: worldRows, error: worldsError } = await supabase
    .from("atlas_worlds")
    .select("id, title, slug, description")
    .eq("user_id", normalizedProfile.id)
    .order("updated_at", { ascending: false });

  if (worldsError) {
    console.error("Failed to load profile worlds:", worldsError);
  }

  const worldIds = (worldRows || []).map((world: any) => world.id);
  let worldBotRows: Array<{ world_id: string; bot_id: string }> = [];

  if (worldIds.length > 0) {
    const { data, error: worldBotsError } = await supabase
      .from("atlas_world_bots")
      .select("world_id, bot_id")
      .in("world_id", worldIds);

    if (worldBotsError) {
      console.error("Failed to load profile world bot links:", worldBotsError);
    }

    worldBotRows = (data || []) as Array<{ world_id: string; bot_id: string }>;
  }

  const worldBotsByWorldId = new Map<string, Array<{ bot_id: string }>>();
  for (const row of worldBotRows) {
    const existing = worldBotsByWorldId.get(row.world_id) || [];
    existing.push({ bot_id: row.bot_id });
    worldBotsByWorldId.set(row.world_id, existing);
  }

  const worlds = (worldRows || []).map((world: any) => ({
    ...world,
    world_bot_links: worldBotsByWorldId.get(world.id) || [],
  }));

  const profileWorlds = applyProfileSectionSelection(
    worlds,
    worldsSection,
    selectedWorldIds,
  );

  // Fetch public forms for this profile
  const { data: forms, error: formsError } = await supabase.rpc(
    "get_public_profile_forms",
    {
      p_user_id: normalizedProfile.id,
    },
  );

  if (formsError) {
    console.error("Failed to load profile forms:", formsError);
  }

  const profileForms = applyProfileSectionSelection(
    forms || [],
    formsSection,
    selectedFormIds,
  );

  // Fetch follow counts
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from("profile_follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", normalizedProfile.id),
    supabase
      .from("profile_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", normalizedProfile.id),
  ]);

  return (
    <PublicProfile
      isOwnProfile={isOwnProfile}
      profile={
        {
          ...(normalizedProfile as Record<string, unknown>),
          _followers: followers || 0,
          _following: following || 0,
        } as any
      }
      creatorPages={profileCreatorPages.map((p: any) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        is_published: p.is_published,
      }))}
      bots={profileBots.map((b: any) => {
        const isHidden = b.hide_sensitive_fields === true;
        return {
          id: b.id,
          name: b.name,
          shortDescription: b.short_description,
          tags: b.tags || [],
          rating: b.rating,
          imageUrl: b.image_url,
          created_at: b.created_at,
          hideSensitiveFields: isHidden,
          personality: isHidden ? "" : b.personality,
          firstMessage: isHidden ? "" : b.first_message,
          scenario: isHidden ? "" : b.scenario,
          exampleDialogues: isHidden ? "" : b.example_dialogues,
        };
      })}
      worlds={profileWorlds.map((w: any) => ({
        id: w.id,
        title: w.title,
        slug: w.slug,
        description: w.description,
        world_bot_links: w.world_bot_links || [],
      }))}
      forms={profileForms.map((form: any) => ({
        id: form.id,
        title: form.title,
        description: form.description,
        shareable_link: form.shareable_link,
        is_active: form.is_active,
        sections: form.sections || [],
        responses_count: Number(form.responses_count || 0),
      }))}
    />
  );
}
