"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  BotFormData,
  CollaboratorRole,
} from "@/features/bots/types/bot-types";
import {
  canRoleEditField,
  type BotCollaborationField,
} from "@/features/bots/lib/collaboration-permissions";
import { friendlySupabaseError } from "@/lib/error-utils";
import { captureBotVersion } from "@/features/bots/actions/bot-history";
import { v4 as uuidv4 } from "uuid";
import {
  BOT_ASSETS_BUCKET,
  extractStorageObjectPathFromPublicUrl,
  getStoragePublicUrl,
} from "@/lib/storage-assets";

const ALLOWED_BOT_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
];
const MAX_BOT_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

async function requireAuthenticatedUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user.id;
}

export async function createBotAction(data: BotFormData) {
  const supabase = await createClient();

  const userId = await requireAuthenticatedUserId(supabase);
  if (!userId) return { success: false, error: "Unauthenticated" };

  const payload = {
    user_id: userId,
    name: data.name,
    chat_name: (data as any).chatName || null,
    short_description: data.shortDescription,
    personality: data.personality,
    first_message: data.firstMessage,
    alternate_greetings: data.alternateGreetings || [],
    scenario: data.scenario,
    example_dialogues: data.exampleDialogues,
    tags: data.tags,
    rating: data.rating,
    image_url: data.imageUrl || null,
    hide_sensitive_fields: data.hideSensitiveFields === true,
  };

  const { data: inserted, error } = await supabase
    .from("bots")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to create bot"),
    };
  }

  const historyResult = await captureBotVersion(inserted.id, "create", [
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
  ] as BotCollaborationField[]);

  if (!historyResult.success) {
    console.error(
      "Failed to capture initial bot version:",
      historyResult.error,
    );
  }

  return { success: true, bot: inserted };
}

export async function updateBotAction(id: string, data: Partial<BotFormData>) {
  const supabase = await createClient();

  const userId = await requireAuthenticatedUserId(supabase);
  if (!userId) return { success: false, error: "Unauthenticated" };

  const { data: existingBot, error: existingError } = await supabase
    .from("bots")
    .select("id, user_id, require_collab_approval")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (existingError || !existingBot) {
    return { success: false, error: "Bot not found" };
  }

  const isOwner = existingBot.user_id === userId;
  let collaboratorRole: CollaboratorRole | null = null;

  if (!isOwner) {
    const { data: collaborator } = await supabase
      .from("bot_collaborators")
      .select("role")
      .eq("bot_id", id)
      .eq("user_id", userId)
      .eq("status", "accepted")
      .maybeSingle();

    collaboratorRole =
      (collaborator?.role as CollaboratorRole | undefined) ?? null;

    if (collaboratorRole !== "editor" && collaboratorRole !== "co_owner") {
      return {
        success: false,
        error: "You don't have permission to update this bot",
      };
    }

    if (
      collaboratorRole === "editor" &&
      existingBot.require_collab_approval === true
    ) {
      return {
        success: false,
        error: "This bot requires your changes to be submitted for review",
      };
    }
  }

  const workspaceRole = isOwner ? "owner" : collaboratorRole;
  if (!workspaceRole) {
    return {
      success: false,
      error: "You don't have permission to update this bot",
    };
  }

  const payload: Record<string, unknown> = {};
  const changedFields: BotCollaborationField[] = [];

  const setField = (field: BotCollaborationField, value: unknown) => {
    if (!canRoleEditField(workspaceRole, field)) return;
    payload[field] = value;
    changedFields.push(field);
  };

  if (data.name !== undefined) setField("name", data.name);
  if (data.chatName !== undefined) setField("chat_name", data.chatName || null);
  if (data.shortDescription !== undefined)
    setField("short_description", data.shortDescription);
  if (data.personality !== undefined) setField("personality", data.personality);
  if (data.firstMessage !== undefined)
    setField("first_message", data.firstMessage);
  if (data.alternateGreetings !== undefined)
    setField("alternate_greetings", data.alternateGreetings);
  if (data.scenario !== undefined) setField("scenario", data.scenario);
  if (data.exampleDialogues !== undefined)
    setField("example_dialogues", data.exampleDialogues);
  if (data.tags !== undefined) setField("tags", data.tags);
  if (data.rating !== undefined) setField("rating", data.rating);
  if (data.imageUrl !== undefined) setField("image_url", data.imageUrl || null);
  if (data.hideSensitiveFields !== undefined)
    setField("hide_sensitive_fields", data.hideSensitiveFields);

  if (Object.keys(payload).length === 0) {
    return { success: false, error: "No editable changes to save" };
  }

  const { data: updated, error } = await supabase
    .from("bots")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to update bot"),
    };
  }

  // Bot images are immutable once referenced by version history.
  // Do not delete the previous asset here: older snapshots may still need it.

  const historyResult = await captureBotVersion(id, "edit", changedFields);

  if (!historyResult.success) {
    console.error("Failed to capture bot version:", historyResult.error);
  }

  await supabase.from("bot_activity_log").insert({
    bot_id: id,
    user_id: userId,
    action: "edited",
    details: {
      fields: changedFields,
      source: isOwner ? "owner" : "collaboration_workspace",
      version_id: historyResult.success ? historyResult.version.id : null,
      version_number: historyResult.success
        ? historyResult.version.version_number
        : null,
    },
  });

  return { success: true, bot: updated };
}

export async function deleteBotAction(id: string) {
  const supabase = await createClient();

  const userId = await requireAuthenticatedUserId(supabase);
  if (!userId) return { success: false, error: "Unauthenticated" };

  // Verify ownership before deleting
  const { data: bot, error: fetchError } = await supabase
    .from("bots")
    .select("user_id")
    .eq("id", id)
    .single();

  if (fetchError || !bot) {
    return { success: false, error: "Bot not found" };
  }
  if (bot.user_id !== userId) {
    return {
      success: false,
      error: "You don't have permission to delete this bot",
    };
  }

  // Soft deletion keeps image assets intact so a restored bot/version can still
  // reference historical artwork. Permanent cleanup can happen on hard delete.

  const { error } = await supabase
    .from("bots")
    .update({ deleted_at: new Date().toISOString(), image_url: null })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to delete bot"),
    };
  }
  return { success: true };
}

export async function uploadBotImageAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "No image file provided" };
  }

  if (!ALLOWED_BOT_IMAGE_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "Unsupported image type. Use PNG, JPG, WEBP or AVIF",
    };
  }

  if (file.size > MAX_BOT_IMAGE_SIZE_BYTES) {
    return { success: false, error: "Image is too large (max 4MB)" };
  }

  const supabase = await createClient();

  const userId = await requireAuthenticatedUserId(supabase);
  if (!userId) return { success: false, error: "Unauthenticated" };

  // Always create a new object instead of overwriting the current image path.
  // Version snapshots keep historical image URLs, so replacing an object in
  // place would silently mutate every older version that referenced that URL.
  const targetPath = `${userId}/${uuidv4()}`;

  const { error: uploadError } = await supabase.storage
    .from(BOT_ASSETS_BUCKET)
    .upload(targetPath, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      success: false,
      error: friendlySupabaseError(uploadError, "Failed to upload image"),
      raw: uploadError,
    };
  }

  const publicUrl = getStoragePublicUrl(BOT_ASSETS_BUCKET, targetPath);
  return { success: true, url: publicUrl, path: targetPath };
}

export async function removeBotImageAction(url: string) {
  const supabase = await createClient();

  const userId = await requireAuthenticatedUserId(supabase);
  if (!userId) return { success: false, error: "Unauthenticated" };

  const path = extractStorageObjectPathFromPublicUrl(url, BOT_ASSETS_BUCKET);
  if (!path) return { success: true };
  if (!path.startsWith(`${userId}/`)) {
    return { success: false, error: "Forbidden" };
  }

  // Removing the image from a bot only clears the bot field. The underlying
  // object may still be referenced by immutable version snapshots, so it is
  // intentionally retained until a future unreferenced-asset cleanup pass.
  return { success: true, retainedForHistory: true };
}
