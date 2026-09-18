import "server-only";

import { createClient } from "@/lib/supabase/server";
import { normalizeResourceVisibility } from "@/lib/resource-visibility";

const BOT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Do not use an admin/service-role client here: the signed-in caller's RLS is the first access boundary. */
export async function loadBotPage(id: string) {
  if (!BOT_ID.test(id)) return null;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const viewerId = authError ? null : (auth.user?.id ?? null);

  const { data: access, error: accessError } = await supabase
    .from("bots")
    .select("id, user_id, visibility, deleted_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (accessError || !access) return null;

  const visibility = normalizeResourceVisibility(access.visibility);
  const isOwner = viewerId === access.user_id;
  let canView = isOwner || visibility === "public";

  if (!canView && viewerId && visibility === "followers") {
    const { data: follow, error } = await supabase.from("profile_follows")
      .select("follower_id")
      .eq("follower_id", viewerId)
      .eq("following_id", access.user_id)
      .maybeSingle();
    canView = !error && Boolean(follow);
  }

  // Accepted collaborators may access their workspace bot without publishing it.
  if (!canView && viewerId) {
    const { data: collaboration, error } = await supabase.from("bot_collaborators")
      .select("id")
      .eq("bot_id", id)
      .eq("user_id", viewerId)
      .eq("status", "accepted")
      .maybeSingle();
    canView = !error && Boolean(collaboration);
  }
  if (!canView) return null;

  const { data: bot, error: botError } = await (supabase as any).from("bots")
    .select("id, user_id, name, short_description, personality, first_message, alternate_greetings, scenario, example_dialogues, tags, rating, image_url, external_links, hide_sensitive_fields, visibility, created_at, updated_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (botError || !bot || bot.user_id !== access.user_id) return null;

  // A private profile must not be bypassed merely because its bot is accessible.
  const { data: creator } = await supabase.from("profiles")
    .select("id, display_name, username, slug, avatar_url")
    .eq("id", bot.user_id)
    .maybeSingle();

  return { bot, creator, isOwner, visibility };
}
