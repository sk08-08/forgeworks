import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";

import {
  CommunityRecordPage,
  type CommunityRecordPageRecord,
} from "@/features/hub/community/components/community-record-page";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CommunityRecordRoute({ params }: PageProps) {
  const { slug } = await params;

  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  let query = supabase
    .from("hub_community_records")
    .select(
      `
        id,
        slug,
        title,
        summary,
        content,
        category,
        status,
        evidence_status,
        impact,
        status_note,
        evidence_note,
        occurred_at,
        occurred_at_precision,
        content_warning,
        is_featured,
        featured_order,
        is_published,
        published_at,
        contributor_user_id,
        revision,
        created_at,
        updated_at,
        contributor:profiles!hub_community_records_contributor_user_id_fkey(
          username,
          display_name,
          avatar_url
        )
      `,
    )
    .eq("slug", slug);

  if (!access.isStaff) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    notFound();
  }

  const record = {
    ...data,
    contributor: Array.isArray(data.contributor)
      ? (data.contributor[0] ?? null)
      : data.contributor,
  } as CommunityRecordPageRecord;

  return (
    <CommunityRecordPage
      record={record}
      initialAuthUserId={access.user?.id || null}
      initialIsStaff={access.isStaff}
    />
  );
}
