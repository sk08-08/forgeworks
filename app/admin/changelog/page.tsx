import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChangelogEditorPage } from "@/features/changelog/components/changelog-editor-page";

export const dynamic = "force-dynamic";

export default async function ChangelogEditorRoute({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("staff_role, is_blocked")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.is_blocked || profile.staff_role !== "owner") {
    redirect("/");
  }

  const params = await searchParams;

  return <ChangelogEditorPage initialId={params.id || null} />;
}
