// ============================================================================
// Forgeworks - Catch-All Slug Route (Redirector)
// Accessible at /[slug]
// - If slug matches a published creator page → redirect to /page/[slug]
// - If slug matches a profile → redirect to /profile/[username]
// - Otherwise → 404
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  // Check creator page
  const { data: creatorPage } = await supabase
    .from("active_creator_pages")
    .select("title, description")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (creatorPage) {
    return { title: `${creatorPage.title} — Forgeworks` };
  }

  // Check profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, tagline, bio, avatar_url")
    .eq("slug", slug)
    .maybeSingle();

  if (profile) {
    const title = profile.display_name || profile.username || slug;

    const plainBio = stripMarkdownToText(profile.bio || "");
    const description =
      profile.tagline ||
      plainBio.slice(0, 160) ||
      `Profile page of ${title} on Forgeworks`;

    return {
      title: `${title} — Forgeworks`,
      description: description.slice(0, 160),
      openGraph: {
        title,
        description: description.slice(0, 160),
        type: "profile",
        images: profile.avatar_url ? [profile.avatar_url] : [],
      },
    };
  }

  return { title: "Page Not Found" };
}

export default async function SlugPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1) Creator page → redirect to /page/[slug]
  const { data: creatorPage } = await supabase
    .from("active_creator_pages")
    .select("id")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (creatorPage) {
    redirect(`/page/${slug}`);
  }

  // 2) Profile → redirect to /profile/[username]
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("slug", slug)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  if (profile.username) {
    redirect(`/profile/${profile.username}`);
  }

  notFound();

  // Fallback: slug matches a profile that has no username
  notFound();
}
