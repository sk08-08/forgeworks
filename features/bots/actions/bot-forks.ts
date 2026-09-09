"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import { captureBotVersion } from "@/features/bots/actions/bot-history";
import type { BotCollaborationField } from "@/features/bots/lib/collaboration-permissions";

export async function forkBot(originalBotId: string, reason?: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get original bot
  const { data: originalBot } = await supabase
    .from("active_bots")
    .select("*")
    .eq("id", originalBotId)
    .single();

  if (!originalBot) {
    return { success: false, error: "Original bot not found" };
  }

  // Create forked bot
  const { data: forkedBot, error: insertError } = await supabase
    .from("active_bots")
    .insert({
      user_id: access.user.id,
      name: `${originalBot.name} (Fork)`,
      chat_name: originalBot.chat_name,
      short_description: originalBot.short_description,
      personality: originalBot.personality,
      first_message: originalBot.first_message,
      alternate_greetings: originalBot.alternate_greetings || [],
      scenario: originalBot.scenario,
      example_dialogues: originalBot.example_dialogues,
      tags: originalBot.tags || [],
      rating: originalBot.rating,
      image_url: originalBot.image_url,
    })
    .select("id")
    .single();

  if (insertError || !forkedBot) {
    return {
      success: false,
      error: insertError?.message || "Failed to create fork",
    };
  }

  const historyResult = await captureBotVersion(
    forkedBot.id,
    "create",
    [
      "name",
      "chat_name",
      "short_description",
      "personality",
      "first_message",
      "alternate_greetings",
      "scenario",
      "example_dialogues",
      "tags",
      "rating",
      "image_url",
      "hide_sensitive_fields",
    ] as BotCollaborationField[],
  );

  if (!historyResult.success) {
    console.error("Failed to capture fork version:", historyResult.error);
  }

  // Record fork relationship
  await supabase.from("bot_forks").insert({
    original_bot_id: originalBotId,
    forked_bot_id: forkedBot.id,
    forked_by: access.user.id,
    fork_reason: reason || "",
  });

  // Log activity on original bot
  await supabase.from("bot_activity_log").insert({
    bot_id: originalBotId,
    user_id: access.user.id,
    action: "forked",
    details: {
      forked_bot_id: forkedBot.id,
      reason: reason || "",
    },
  });

  return { success: true, forkedBotId: forkedBot.id };
}

