"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedbackStatus = "new" | "reviewing" | "resolved" | "closed";
type FeedbackPriority = "low" | "medium" | "high" | "urgent";

type FeedbackType = "suggestion" | "bug";

type InboxSortBy =
  | "created_at"
  | "priority"
  | "status"
  | "feedback_type"
  | "is_read";

interface GetAdminFeedbackInboxParams {
  page?: number;
  limit?: number;
  query?: string;
  typeFilter?: "all" | FeedbackType;
  statusFilter?: "all" | FeedbackStatus;
  priorityFilter?: "all" | FeedbackPriority;
  assignmentFilter?: "all" | "mine" | "unassigned";
  unreadOnly?: boolean;
  sortBy?: InboxSortBy;
  sortDirection?: "asc" | "desc";
}

interface FeedbackInboxStats {
  total: number;
  unread: number;
  bugs: number;
  suggestions: number;
  newCount: number;
  reviewing: number;
}

const DEFAULT_FEEDBACK_STATS: FeedbackInboxStats = {
  total: 0,
  unread: 0,
  bugs: 0,
  suggestions: 0,
  newCount: 0,
  reviewing: 0,
};

// ---------------------------------------------------------------------------
// Guard: require admin
// ---------------------------------------------------------------------------

async function requireStaff() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user || !access.isStaff) {
    throw new Error("Staff access required");
  }
  return { supabase, userId: access.user.id };
}

export async function getAdminFeedbackInbox(
  params: GetAdminFeedbackInboxParams = {},
) {
  try {
    const { supabase, userId } = await requireStaff();

    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const query = (params.query ?? "").trim();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const safeSortBy: InboxSortBy = [
      "created_at",
      "priority",
      "status",
      "feedback_type",
      "is_read",
    ].includes(params.sortBy ?? "created_at")
      ? (params.sortBy as InboxSortBy)
      : "created_at";
    const ascending = params.sortDirection === "asc";

    let listQuery = supabase
      .from("active_feedback_submissions")
      .select(
        "id, feedback_type, status, priority, is_read, assigned_to, subject, message, source_label, source_page, source_path, related_id, contact, metadata, created_at",
        { count: "exact" },
      )
      .order(safeSortBy, { ascending, nullsFirst: false })
      .range(from, to);

    if (params.typeFilter && params.typeFilter !== "all") {
      listQuery = listQuery.eq("feedback_type", params.typeFilter);
    }

    if (params.statusFilter && params.statusFilter !== "all") {
      listQuery = listQuery.eq("status", params.statusFilter);
    }

    if (params.priorityFilter && params.priorityFilter !== "all") {
      listQuery = listQuery.eq("priority", params.priorityFilter);
    }

    if (params.assignmentFilter === "mine") {
      listQuery = listQuery.eq("assigned_to", userId);
    } else if (params.assignmentFilter === "unassigned") {
      listQuery = listQuery.is("assigned_to", null);
    }

    if (params.unreadOnly) {
      listQuery = listQuery.eq("is_read", false);
    }

    if (query) {
      const escaped = query.replace(/[,()]/g, " ");
      listQuery = listQuery.or(
        `subject.ilike.%${escaped}%,message.ilike.%${escaped}%,source_label.ilike.%${escaped}%`,
      );
    }

    const [listRes, statsRes] = await Promise.all([
      listQuery,
      Promise.all([
        supabase
          .from("active_feedback_submissions")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("active_feedback_submissions")
          .select("id", { count: "exact", head: true })
          .eq("is_read", false),
        supabase
          .from("active_feedback_submissions")
          .select("id", { count: "exact", head: true })
          .eq("feedback_type", "bug"),
        supabase
          .from("active_feedback_submissions")
          .select("id", { count: "exact", head: true })
          .eq("feedback_type", "suggestion"),
        supabase
          .from("active_feedback_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("active_feedback_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "reviewing"),
      ]),
    ]);

    if (listRes.error) {
      return {
        success: false,
        error: listRes.error.message,
        isStaff: true,
        items: [],
        total: 0,
        page,
        limit,
        stats: DEFAULT_FEEDBACK_STATS,
      };
    }

    const [totalRes, unreadRes, bugsRes, suggestionsRes, newRes, reviewingRes] =
      statsRes;

    const items = (listRes.data ?? []) as Array<{
      assigned_to: string | null;
      [key: string]: any;
    }>;

    const assigneeIds = [
      ...new Set(items.map((item) => item.assigned_to).filter(Boolean)),
    ] as string[];

    let assigneeMap = new Map<
      string,
      { id: string; username: string | null; display_name: string | null }
    >();

    if (assigneeIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .in("id", assigneeIds);

      assigneeMap = new Map(
        (profiles ?? []).map((profile) => [
          profile.id,
          {
            id: profile.id,
            username: profile.username ?? null,
            display_name: profile.display_name ?? null,
          },
        ]),
      );
    }

    const enrichedItems = items.map((item) => ({
      ...item,
      assignee: item.assigned_to
        ? (assigneeMap.get(item.assigned_to) ?? null)
        : null,
    }));

    return {
      success: true,
      isStaff: true,
      userId,
      items: enrichedItems,
      total: listRes.count ?? 0,
      page,
      limit,
      stats: {
        total: totalRes.count ?? 0,
        unread: unreadRes.count ?? 0,
        bugs: bugsRes.count ?? 0,
        suggestions: suggestionsRes.count ?? 0,
        newCount: newRes.count ?? 0,
        reviewing: reviewingRes.count ?? 0,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Unauthorized",
      isStaff: false,
      userId: null,
      items: [],
      total: 0,
      page: 1,
      limit: 25,
      stats: DEFAULT_FEEDBACK_STATS,
    };
  }
}

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

export async function assignFeedbackToMe(feedbackId: string) {
  try {
    const { supabase, userId } = await requireStaff();
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ assigned_to: userId })
      .eq("id", feedbackId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, assignedTo: userId };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}

export async function unassignFeedback(feedbackId: string) {
  try {
    const { supabase } = await requireStaff();
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ assigned_to: null })
      .eq("id", feedbackId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}

// ---------------------------------------------------------------------------
// Update feedback status
// ---------------------------------------------------------------------------

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus,
) {
  try {
    const { supabase } = await requireStaff();
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ status })
      .eq("id", feedbackId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}

// ---------------------------------------------------------------------------
// Update feedback priority
// ---------------------------------------------------------------------------

export async function updateFeedbackPriority(
  feedbackId: string,
  priority: FeedbackPriority,
) {
  try {
    const { supabase } = await requireStaff();
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ priority })
      .eq("id", feedbackId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}

// ---------------------------------------------------------------------------
// Mark as read / unread
// ---------------------------------------------------------------------------

export async function markFeedbackRead(feedbackId: string, isRead: boolean) {
  try {
    const { supabase } = await requireStaff();
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ is_read: isRead })
      .eq("id", feedbackId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}

// ---------------------------------------------------------------------------
// Mark multiple as read
// ---------------------------------------------------------------------------

export async function markMultipleRead(feedbackIds: string[], isRead: boolean) {
  try {
    const { supabase } = await requireStaff();
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ is_read: isRead })
      .in("id", feedbackIds);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}

// ---------------------------------------------------------------------------
// Bulk update status
// ---------------------------------------------------------------------------

export async function bulkUpdateStatus(
  feedbackIds: string[],
  status: FeedbackStatus,
) {
  try {
    const { supabase } = await requireStaff();
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ status })
      .in("id", feedbackIds);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}

// ---------------------------------------------------------------------------
// Add admin note
// ---------------------------------------------------------------------------

export async function addFeedbackNote(feedbackId: string, note: string) {
  try {
    const { supabase, userId } = await requireStaff();
    if (!note.trim()) {
      return { success: false, error: "Note cannot be empty" };
    }

    const { data, error } = await supabase
      .from("feedback_notes")
      .insert({
        feedback_id: feedbackId,
        author_id: userId,
        note: note.trim(),
      })
      .select("id, note, created_at")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, note: data };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}

// ---------------------------------------------------------------------------
// Get feedback notes
// ---------------------------------------------------------------------------

export async function getFeedbackNotes(feedbackId: string) {
  try {
    const { supabase } = await requireStaff();
    const { data, error } = await supabase
      .from("feedback_notes")
      .select("id, author_id, note, created_at")
      .eq("feedback_id", feedbackId)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message, notes: [] };
    }
    return { success: true, notes: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized", notes: [] };
  }
}

// ---------------------------------------------------------------------------
// Delete feedback
// ---------------------------------------------------------------------------

export async function deleteFeedback(feedbackId: string) {
  try {
    const { supabase } = await requireStaff();
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", feedbackId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unauthorized" };
  }
}
