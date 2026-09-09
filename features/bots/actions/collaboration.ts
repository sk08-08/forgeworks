"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import type {
  Bot,
  BotWorkspaceRole,
  CollaboratorRole,
} from "@/features/bots/types/bot-types";
import {
  canRoleManageCoOwners,
  canRoleManageNormalMembers,
  canRoleReviewChanges,
  sanitizeBotChangeRequestChanges,
  type BotCollaborationField,
} from "@/features/bots/lib/collaboration-permissions";

async function getBotWorkspaceRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  botId: string,
  userId: string,
): Promise<BotWorkspaceRole | null> {
  const { data: bot } = await supabase
    .from("bots")
    .select("user_id")
    .eq("id", botId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!bot) return null;
  if (bot.user_id === userId) return "owner";

  const { data: collaborator } = await supabase
    .from("bot_collaborators")
    .select("role")
    .eq("bot_id", botId)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .maybeSingle();

  return (collaborator?.role as CollaboratorRole | undefined) ?? null;
}

// ---------------------------------------------------------------------------
// Get one bot workspace for the current user
// ---------------------------------------------------------------------------

export async function getBotWorkspace(botId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) {
    return {
      success: false as const,
      error: "Not authenticated",
    };
  }

  const role = await getBotWorkspaceRole(supabase, botId, access.user.id);

  // Intentionally do not reveal whether the bot exists or merely isn't
  // accessible to this account.
  if (!role) {
    return {
      success: false as const,
      error: "Workspace unavailable",
    };
  }

  const { data, error } = await supabase
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
    .eq("id", botId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load bot workspace:", error);
    return {
      success: false as const,
      error: "Workspace unavailable",
    };
  }

  if (!data) {
    return {
      success: false as const,
      error: "Workspace unavailable",
    };
  }

  const bot: Bot = {
    id: data.id,
    ownerId: data.user_id || undefined,
    name: data.name || "",
    chatName: data.chat_name || undefined,
    shortDescription: data.short_description || "",
    personality: data.personality || "",
    firstMessage: data.first_message || "",
    alternateGreetings: Array.isArray(data.alternate_greetings)
      ? data.alternate_greetings
      : [],
    scenario: data.scenario || "",
    exampleDialogues: data.example_dialogues || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    rating: data.rating === "NSFW" ? "NSFW" : "SFW",
    imageUrl: data.image_url || undefined,
    hideSensitiveFields: data.hide_sensitive_fields === true,
    createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
  };

  return {
    success: true as const,
    bot,
    role,
  };
}

// ---------------------------------------------------------------------------
// Invite collaborator to bot
// ---------------------------------------------------------------------------

export async function inviteCollaborator(
  botId: string,
  username: string,
  role: CollaboratorRole,
  inviteMessage?: string,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const currentRole = await getBotWorkspaceRole(
    supabase,
    botId,
    access.user.id,
  );

  if (!currentRole || !canRoleManageNormalMembers(currentRole)) {
    return {
      success: false,
      error: "You do not have permission to invite collaborators",
    };
  }

  if (role === "co_owner" && !canRoleManageCoOwners(currentRole)) {
    return {
      success: false,
      error: "Only the bot owner can invite a Co-owner",
    };
  }

  const cleanUsername = username.toLowerCase().trim();
  const cleanMessage = inviteMessage?.trim() || null;

  if (!cleanUsername) {
    return { success: false, error: "Enter a username" };
  }

  if (cleanMessage && cleanMessage.length > 1000) {
    return {
      success: false,
      error: "Invitation message cannot exceed 1000 characters",
    };
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", cleanUsername)
    .maybeSingle();

  if (!targetProfile) {
    return { success: false, error: `User "${cleanUsername}" not found` };
  }

  if (targetProfile.id === access.user.id) {
    return { success: false, error: "You cannot invite yourself" };
  }

  const { error } = await supabase.from("bot_collaborators").upsert(
    {
      bot_id: botId,
      user_id: targetProfile.id,
      invited_by: access.user.id,
      role,
      status: "pending",
      invite_message: cleanMessage,
      responded_at: null,
    },
    { onConflict: "bot_id,user_id" },
  );

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from("bot_activity_log").insert({
    bot_id: botId,
    user_id: access.user.id,
    action: "collaborator_invited",
    details: {
      collaborator_user_id: targetProfile.id,
      role,
    },
  });

  return { success: true, invitedUsername: cleanUsername };
}

// ---------------------------------------------------------------------------
// Accept/decline invite
// ---------------------------------------------------------------------------

export async function respondToInvite(collaboratorId: string, accept: boolean) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  // First get the collaborator record to know the bot_id
  const { data: collabRecord } = await supabase
    .from("bot_collaborators")
    .select("id, bot_id, status")
    .eq("id", collaboratorId)
    .eq("user_id", access.user.id)
    .single();

  if (!collabRecord) {
    return { success: false, error: "Invite not found" };
  }

  if (collabRecord.status !== "pending") {
    return {
      success: false,
      error: "This invite has already been responded to",
    };
  }

  const { error } = await supabase
    .from("bot_collaborators")
    .update({
      status: accept ? "accepted" : "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", collaboratorId)
    .eq("user_id", access.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, botId: collabRecord.bot_id };
}

// ---------------------------------------------------------------------------
// Remove collaborator (owner removes someone, or collaborator removes self)
// ---------------------------------------------------------------------------

export async function removeCollaborator(collaboratorId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: collabRecord } = await supabase
    .from("bot_collaborators")
    .select("id, bot_id, user_id, role")
    .eq("id", collaboratorId)
    .maybeSingle();

  if (!collabRecord) {
    return { success: false, error: "Collaborator not found" };
  }

  const isSelf = collabRecord.user_id === access.user.id;
  const currentRole = await getBotWorkspaceRole(
    supabase,
    collabRecord.bot_id,
    access.user.id,
  );

  if (!isSelf) {
    if (!currentRole || !canRoleManageNormalMembers(currentRole)) {
      return {
        success: false,
        error: "You do not have permission to remove this collaborator",
      };
    }

    if (
      collabRecord.role === "co_owner" &&
      !canRoleManageCoOwners(currentRole)
    ) {
      return {
        success: false,
        error: "Only the bot owner can remove a Co-owner",
      };
    }
  }

  const { error } = await supabase
    .from("bot_collaborators")
    .delete()
    .eq("id", collaboratorId);

  if (error) {
    return { success: false, error: error.message };
  }

  if (!isSelf) {
    await supabase.from("bot_activity_log").insert({
      bot_id: collabRecord.bot_id,
      user_id: access.user.id,
      action: "collaborator_removed",
      details: {
        removed_user_id: collabRecord.user_id,
        role: collabRecord.role,
      },
    });
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Get collaborators for a bot
// ---------------------------------------------------------------------------

export async function getBotCollaborators(botId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", collaborators: [] };
  }

  const currentRole = await getBotWorkspaceRole(
    supabase,
    botId,
    access.user.id,
  );

  if (!currentRole) {
    return { success: false, error: "Forbidden", collaborators: [] };
  }

  const { data, error } = await supabase
    .from("bot_collaborators")
    .select(
      "id, user_id, invited_by, role, status, invite_message, created_at, updated_at, expires_at, responded_at, profile:user_id(username, display_name, avatar_url), inviter:invited_by(username, display_name, avatar_url)",
    )
    .eq("bot_id", botId)
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message, collaborators: [] };
  }

  return { success: true, collaborators: data || [] };
}

// ---------------------------------------------------------------------------
// Update collaborator role (owner only)
// ---------------------------------------------------------------------------

export async function updateCollaboratorRole(
  collaboratorId: string,
  newRole: CollaboratorRole,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: collabRecord } = await supabase
    .from("bot_collaborators")
    .select("id, bot_id, user_id, role")
    .eq("id", collaboratorId)
    .maybeSingle();

  if (!collabRecord) {
    return { success: false, error: "Collaborator not found" };
  }

  const currentRole = await getBotWorkspaceRole(
    supabase,
    collabRecord.bot_id,
    access.user.id,
  );

  if (!currentRole || !canRoleManageNormalMembers(currentRole)) {
    return { success: false, error: "You cannot change collaborator roles" };
  }

  const touchesCoOwner =
    collabRecord.role === "co_owner" || newRole === "co_owner";

  if (touchesCoOwner && !canRoleManageCoOwners(currentRole)) {
    return {
      success: false,
      error: "Only the bot owner can add, remove, or change a Co-owner",
    };
  }

  const { error } = await supabase
    .from("bot_collaborators")
    .update({ role: newRole })
    .eq("id", collaboratorId);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from("bot_activity_log").insert({
    bot_id: collabRecord.bot_id,
    user_id: access.user.id,
    action: "role_changed",
    details: {
      collaborator_user_id: collabRecord.user_id,
      old_role: collabRecord.role,
      new_role: newRole,
    },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Get followed users for current user (for invite suggestions)
// ---------------------------------------------------------------------------

export async function getMyFollowing() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", following: [] };
  }

  const { data, error } = await supabase
    .from("profile_follows")
    .select("following:following_id(id, username, display_name, avatar_url)")
    .eq("follower_id", access.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message, following: [] };
  }

  const following = (data || []).map((r: any) => r.following).filter(Boolean);

  return { success: true, following };
}

// ---------------------------------------------------------------------------
// Get pending invites for current user (uses SECURITY DEFINER function)
// ---------------------------------------------------------------------------

export async function getMyPendingInvites() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", invites: [] };
  }

  const { data, error } = await supabase.rpc("get_my_pending_bot_invites");

  if (error) {
    return { success: false, error: error.message, invites: [] };
  }

  return { success: true, invites: data || [] };
}

// ---------------------------------------------------------------------------
// Get collaborative bots for current user
// ---------------------------------------------------------------------------

export async function getCollaborativeBots() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", bots: [] };
  }

  const { data, error } = await supabase.rpc("get_collaborative_bots", {
    p_user_id: access.user.id,
  });

  if (error) {
    return { success: false, error: error.message, bots: [] };
  }

  return { success: true, bots: data || [] };
}

// ---------------------------------------------------------------------------
// Get bot activity log
// ---------------------------------------------------------------------------

export async function getBotActivity(botId: string, limit = 20) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", activity: [] };
  }

  const { data, error } = await supabase.rpc("get_bot_activity", {
    p_bot_id: botId,
    p_limit: limit,
  });

  if (error) {
    return { success: false, error: error.message, activity: [] };
  }

  return { success: true, activity: data || [] };
}

// ---------------------------------------------------------------------------
// Add a comment to a bot
// ---------------------------------------------------------------------------

export async function addBotComment(
  botId: string,
  content: string,
  parentId?: string,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!content.trim()) {
    return { success: false, error: "Comment cannot be empty" };
  }

  const { data, error } = await supabase
    .from("bot_comments")
    .insert({
      bot_id: botId,
      user_id: access.user.id,
      content: content.trim(),
      parent_id: parentId || null,
    })
    .select("id, content, created_at")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Log activity
  await supabase.from("bot_activity_log").insert({
    bot_id: botId,
    user_id: access.user.id,
    action: "commented",
    details: { comment_id: data.id },
  });

  return { success: true, comment: data };
}

// ---------------------------------------------------------------------------
// Get comments for a bot
// ---------------------------------------------------------------------------

export async function getBotComments(botId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", comments: [] };
  }

  // Try with join syntax first
  const { data, error } = await supabase
    .from("bot_comments")
    .select(
      "id, bot_id, user_id, content, parent_id, created_at, updated_at, profile:user_id(username, display_name, avatar_url)",
    )
    .eq("bot_id", botId)
    .order("created_at", { ascending: true });

  if (error) {
    // Fallback: fetch comments and profiles separately
    const { data: rawComments, error: commentError } = await supabase
      .from("bot_comments")
      .select("id, bot_id, user_id, content, parent_id, created_at, updated_at")
      .eq("bot_id", botId)
      .order("created_at", { ascending: true });

    if (commentError) {
      return { success: false, error: commentError.message, comments: [] };
    }

    const userIds = [...new Set((rawComments || []).map((c) => c.user_id))];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const enrichedComments = (rawComments || []).map((c) => ({
        ...c,
        profile: profileMap.get(c.user_id) || null,
      }));

      return { success: true, comments: enrichedComments };
    }

    return { success: true, comments: rawComments || [] };
  }

  return { success: true, comments: data || [] };
}

// ---------------------------------------------------------------------------
// Delete a comment
// ---------------------------------------------------------------------------

export async function deleteBotComment(commentId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("bot_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Change Request System (like GitHub PRs for bots)
// ---------------------------------------------------------------------------

export async function submitChangeRequest(
  botId: string,
  proposedChanges: Record<string, unknown>,
  description?: string,
  title?: string,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const currentRole = await getBotWorkspaceRole(
    supabase,
    botId,
    access.user.id,
  );

  if (
    currentRole !== "owner" &&
    currentRole !== "editor" &&
    currentRole !== "co_owner"
  ) {
    return { success: false, error: "You cannot propose changes to this bot" };
  }

  const { changes, rejectedFields } = sanitizeBotChangeRequestChanges(
    proposedChanges,
    currentRole,
  );

  if (rejectedFields.length > 0) {
    return {
      success: false,
      error: `These fields cannot be changed by your role: ${rejectedFields.join(
        ", ",
      )}`,
    };
  }

  if (Object.keys(changes).length === 0) {
    return { success: false, error: "No valid changes proposed" };
  }

  const cleanDescription = description?.trim() || null;
  const cleanTitle = title?.trim() || null;

  const { data: baseVersion, error: baseVersionError } = await supabase
    .from("bot_versions")
    .select("id")
    .eq("bot_id", botId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (baseVersionError || !baseVersion) {
    return {
      success: false,
      error: "Could not establish a safe base version for this request",
    };
  }

  const { data, error } = await supabase
    .from("bot_change_requests")
    .insert({
      bot_id: botId,
      author_id: access.user.id,
      proposed_changes: changes,
      title: cleanTitle,
      description: cleanDescription,
      status: "pending",
      base_version_id: baseVersion.id,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from("bot_activity_log").insert({
    bot_id: botId,
    user_id: access.user.id,
    action: "change_request_submitted",
    details: {
      change_request_id: data.id,
      fields: Object.keys(changes),
    },
  });

  return { success: true, changeRequestId: data.id };
}

export async function approveChangeRequest(changeRequestId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false as const, error: "Not authenticated" };
  }

  const { data: cr } = await supabase
    .from("bot_change_requests")
    .select("id, bot_id, author_id, status, proposed_changes")
    .eq("id", changeRequestId)
    .maybeSingle();

  if (!cr) {
    return { success: false as const, error: "Change request not found" };
  }
  if (cr.status !== "pending" && cr.status !== "changes_requested") {
    return {
      success: false as const,
      error: "This change request is already closed",
    };
  }

  const currentRole = await getBotWorkspaceRole(
    supabase,
    cr.bot_id,
    access.user.id,
  );

  if (!currentRole || !canRoleReviewChanges(currentRole)) {
    return {
      success: false as const,
      error: "You cannot review this change request",
    };
  }

  const authorRole = await getBotWorkspaceRole(
    supabase,
    cr.bot_id,
    cr.author_id,
  );

  const sanitizingRole =
    authorRole === "owner" ||
    authorRole === "editor" ||
    authorRole === "co_owner"
      ? authorRole
      : "editor";

  const { changes, rejectedFields } = sanitizeBotChangeRequestChanges(
    cr.proposed_changes as Record<string, unknown>,
    sanitizingRole,
  );

  if (rejectedFields.length > 0) {
    return {
      success: false as const,
      error: `This request contains unsupported fields: ${rejectedFields.join(
        ", ",
      )}`,
    };
  }

  const { data, error } = await supabase.rpc(
    "apply_bot_change_request_if_current",
    {
      p_change_request_id: changeRequestId,
      p_changes: changes,
    },
  );

  if (error) {
    return { success: false as const, error: error.message };
  }

  const merge = (data || {}) as {
    success?: boolean;
    error?: string;
    conflict_fields?: string[];
    version_id?: string;
    version_number?: number;
  };

  if (!merge.success) {
    const conflictFields = Array.isArray(merge.conflict_fields)
      ? merge.conflict_fields
      : [];
    return {
      success: false as const,
      error: merge.error || "Failed to merge change request",
      conflictFields,
    };
  }

  return {
    success: true as const,
    changes,
    versionId: merge.version_id || null,
    versionNumber: merge.version_number || null,
  };
}

export async function requestChangesOnChangeRequest(
  changeRequestId: string,
  reviewComment: string,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const comment = reviewComment.trim();
  if (!comment) {
    return {
      success: false,
      error: "Explain what should be changed before sending it back",
    };
  }

  const { data: cr } = await supabase
    .from("bot_change_requests")
    .select("id, bot_id, author_id, status")
    .eq("id", changeRequestId)
    .maybeSingle();

  if (!cr) return { success: false, error: "Change request not found" };
  if (cr.status !== "pending") {
    return { success: false, error: "This change request is not open" };
  }

  const currentRole = await getBotWorkspaceRole(
    supabase,
    cr.bot_id,
    access.user.id,
  );

  if (!currentRole || !canRoleReviewChanges(currentRole)) {
    return { success: false, error: "You cannot review this change request" };
  }

  const { error } = await supabase
    .from("bot_change_requests")
    .update({
      status: "changes_requested",
      review_comment: comment,
      changes_requested_at: new Date().toISOString(),
      changes_requested_by: access.user.id,
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq("id", changeRequestId);

  if (error) return { success: false, error: error.message };

  await supabase.from("bot_activity_log").insert({
    bot_id: cr.bot_id,
    user_id: access.user.id,
    action: "change_request_changes_requested",
    details: {
      change_request_id: changeRequestId,
      author_id: cr.author_id,
    },
  });

  return { success: true };
}

export async function rejectChangeRequest(
  changeRequestId: string,
  reason?: string,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: cr } = await supabase
    .from("bot_change_requests")
    .select("id, bot_id, author_id, status")
    .eq("id", changeRequestId)
    .maybeSingle();

  if (!cr) return { success: false, error: "Change request not found" };
  if (cr.status !== "pending" && cr.status !== "changes_requested") {
    return { success: false, error: "This change request is already closed" };
  }

  const currentRole = await getBotWorkspaceRole(
    supabase,
    cr.bot_id,
    access.user.id,
  );

  if (!currentRole || !canRoleReviewChanges(currentRole)) {
    return { success: false, error: "You cannot review this change request" };
  }

  const { error } = await supabase
    .from("bot_change_requests")
    .update({
      status: "rejected",
      reviewed_by: access.user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason?.trim() || null,
    })
    .eq("id", changeRequestId);

  if (error) return { success: false, error: error.message };

  await supabase.from("bot_activity_log").insert({
    bot_id: cr.bot_id,
    user_id: access.user.id,
    action: "change_request_rejected",
    details: {
      change_request_id: changeRequestId,
      reason: reason?.trim() || "",
    },
  });

  return { success: true };
}

export async function getBotChangeRequests(botId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", changeRequests: [] };
  }

  const { data, error } = await supabase.rpc("get_bot_change_requests", {
    p_bot_id: botId,
  });

  if (error) {
    return { success: false, error: error.message, changeRequests: [] };
  }

  return { success: true, changeRequests: data || [] };
}

export async function getBotApprovalSetting(botId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return {
      success: false,
      error: "Not authenticated",
      requireApproval: false,
    };
  }

  const { data: bot } = await supabase
    .from("active_bots")
    .select("require_collab_approval")
    .eq("id", botId)
    .single();

  if (!bot) {
    return { success: false, error: "Bot not found", requireApproval: false };
  }

  return {
    success: true,
    requireApproval: bot.require_collab_approval || false,
  };
}

export async function toggleBotApproval(
  botId: string,
  requireApproval: boolean,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: bot } = await supabase
    .from("active_bots")
    .select("user_id")
    .eq("id", botId)
    .single();

  if (!bot || bot.user_id !== access.user.id) {
    return { success: false, error: "Only the owner can change this setting" };
  }

  const { error } = await supabase
    .from("active_bots")
    .update({ require_collab_approval: requireApproval })
    .eq("id", botId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
