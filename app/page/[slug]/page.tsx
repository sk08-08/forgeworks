// ============================================================================
// Forgeworks - Public Creator Page
// Accessible at /page/[slug] for published creator pages
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CreatorPageView } from "@/features/creator-pages/components/creator-page-view";
import {
  fetchCreatorPageData,
  buildCreatorPageMeta,
} from "@/features/creator-pages/lib/creator-page-data";
import type { CreatorPageConfig } from "@/features/creator-pages/types/creator-page-types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: creatorPage } = await supabase
    .from("active_creator_pages")
    .select("title, description, user_id")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!creatorPage) {
    return { title: "Page Not Found" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url")
    .eq("id", creatorPage.user_id)
    .maybeSingle();

  return buildCreatorPageMeta(creatorPage, profile, slug);
}

export default async function CreatorPagePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const data = await fetchCreatorPageData(supabase, slug);

  if (!data) {
    notFound();
  }

  return (
    <CreatorPageView
      sections={data.sections}
      bots={data.bots}
      worlds={data.worlds}
      pageConfig={(data.creatorPage.config as CreatorPageConfig) || {}}
    />
  );
}
