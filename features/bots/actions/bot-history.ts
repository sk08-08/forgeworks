"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import type {
  Bot,
  BotVersion,
  BotVersionSource,
} from "@/features/bots/types/bot-types";
import type { BotCollaborationField } from "@/features/bots/lib/collaboration-permissions";

const MAX_HISTORY_ROWS = 200;

export async function captureBotVersion(
  botId: string,
  source: BotVersionSource,
  changedFields: BotCollaborationField[] = [],
  options?: {
    changeRequestId?: string | null;
    restoredFromVersionId?: string | null;
  },
) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("capture_bot_version", {
    p_bot_id: botId,
    p_source: source,
    p_changed_fields: changedFields,
    p_change_request_id: options?.changeRequestId ?? null,
    p_restored_from_version_id: options?.restoredFromVersionId ?? null,
  });

  if (error) {
    return { success: false as const, error: error.message };
  }

  return { success: true as const, version: data as unknown as BotVersion };
}

export async function getBotVersions(botId: string, limit = 100) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) {
    return {
      success: false as const,
      error: "Not authenticated",
      versions: [] as BotVersion[],
    };
  }

  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 100, 1), MAX_HISTORY_ROWS);

  const { data, error } = await supabase
    .from("bot_versions")
    .select(
      "id, bot_id, version_number, created_by, source, snapshot, changed_fields, change_request_id, restored_from_version_id, created_at",
    )
    .eq("bot_id", botId)
    .order("version_number", { ascending: false })
    .limit(safeLimit);

  if (error) {
    return {
      success: false as const,
      error: error.message,
      versions: [] as BotVersion[],
    };
  }

  const rows = (data || []) as unknown as BotVersion[];
  const creatorIds = [
    ...new Set(
      rows
        .map((version) => version.created_by)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (creatorIds.length === 0) {
    return { success: true as const, versions: rows };
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", creatorIds);

  const profileMap = new Map(
    (profiles || []).map((profile) => [profile.id, profile] as const),
  );

  const versions = rows.map((version) => {
    const profile = version.created_by
      ? profileMap.get(version.created_by)
      : undefined;

    return {
      ...version,
      creator_username: profile?.username ?? null,
      creator_display_name: profile?.display_name ?? null,
      creator_avatar_url: profile?.avatar_url ?? null,
    } satisfies BotVersion;
  });

  return { success: true as const, versions };
}

export async function restoreBotVersion(versionId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) {
    return { success: false as const, error: "Not authenticated" };
  }

  const { data: version, error } = await supabase.rpc("restore_bot_version", {
    p_version_id: versionId,
  });

  if (error) {
    return { success: false as const, error: error.message };
  }

  const restored = version as unknown as BotVersion;

  const { data: bot, error: botError } = await supabase
    .from("active_bots")
    .select(`
      id,
      user_id,
      name,
      chat_name,
      short_description,
      personality,
      first_message,
      alternate_greetings,
      scenario,
      example_dialogues,
      tags,
      rating,
      image_url,
      hide_sensitive_fields,
      created_at,
      updated_at
    `)
    .eq("id", restored.bot_id)
    .maybeSingle();

  if (botError || !bot) {
    return {
      success: false as const,
      error: botError?.message || "Version restored, but the bot could not be reloaded",
    };
  }

  const normalizedBot: Bot = {
    id: bot.id,
    ownerId: bot.user_id || undefined,
    name: bot.name || "",
    chatName: bot.chat_name || undefined,
    shortDescription: bot.short_description || "",
    personality: bot.personality || "",
    firstMessage: bot.first_message || "",
    alternateGreetings: Array.isArray(bot.alternate_greetings)
      ? bot.alternate_greetings
      : [],
    scenario: bot.scenario || "",
    exampleDialogues: bot.example_dialogues || "",
    tags: Array.isArray(bot.tags) ? bot.tags : [],
    rating: bot.rating === "NSFW" ? "NSFW" : "SFW",
    imageUrl: bot.image_url || undefined,
    hideSensitiveFields: bot.hide_sensitive_fields === true,
    createdAt: bot.created_at ? new Date(bot.created_at) : new Date(),
    updatedAt: bot.updated_at ? new Date(bot.updated_at) : new Date(),
  };

  return {
    success: true as const,
    version: restored,
    bot: normalizedBot,
  };
}
