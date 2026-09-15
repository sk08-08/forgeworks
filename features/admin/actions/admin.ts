"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  FORM_ASSETS_BUCKET,
  FORM_BANNERS_BUCKET,
  extractFormAssetPathsFromSections,
} from "@/features/forms/lib/form-assets";
import {
  BOT_ASSETS_BUCKET,
  PROFILE_ASSETS_BUCKET,
  extractStorageObjectPathFromPublicUrl,
} from "@/lib/storage-assets";

// ============================================================================
// Helper
// ============================================================================

export type StaffRole = "owner" | "moderator";

async function requireStaff() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      userId: null,
      role: null as StaffRole | null,
      error: "Unauthenticated" as const,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      is_blocked,
      staff_role
    `,
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      supabase,
      userId: user.id,
      role: null as StaffRole | null,
      error: profileError.message,
    };
  }

  if (profile?.is_blocked) {
    return {
      supabase,
      userId: user.id,
      role: null as StaffRole | null,
      error: "Account is blocked" as const,
    };
  }

  const role =
    profile?.staff_role === "owner" || profile?.staff_role === "moderator"
      ? (profile.staff_role as StaffRole)
      : null;

  if (!role) {
    return {
      supabase,
      userId: user.id,
      role: null,
      error: "Forbidden" as const,
    };
  }

  return {
    supabase,
    userId: user.id,
    role,
    error: null,
  };
}

async function requireOwner() {
  const access = await requireStaff();

  if (access.error) {
    return access;
  }

  if (access.role !== "owner") {
    return {
      ...access,
      error: "Owner access required" as const,
    };
  }

  return access;
}

export async function getStaffAccess() {
  const { userId, role, error } = await requireStaff();

  if (error) {
    return {
      success: false,
      userId,
      role: null as StaffRole | null,
      error,
    };
  }

  return {
    success: true,
    userId,
    role,
    error: null,
  };
}

// ============================================================================
// Stats
// ============================================================================

export async function getAdminStats() {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error };

  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    { count: total_users },
    { count: total_bots },
    { count: total_forms },
    { count: total_submissions },
    { count: total_submissions_raw },
    { count: pending_flagged },
    { count: new_today },
    { count: blocked_users },
    { count: owner_users },
    { count: moderator_users },
    { count: active_forms },
    { count: new_users_week },
    { count: sfw_bots },
    { count: nsfw_bots },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("active_bots").select("id", { count: "exact", head: true }),
    supabase
      .from("active_request_forms")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("active_requests")
      .select("id", { count: "exact", head: true }),
    supabase.from("requests").select("id", { count: "exact", head: true }),
    supabase
      .from("flagged_requests")
      .select("id, requests!inner(id)", { count: "exact", head: true })
      .eq("reviewed", false)
      .is("requests.deleted_at", null),
    supabase
      .from("active_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", yesterday),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_blocked", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("staff_role", "owner"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("staff_role", "moderator"),
    supabase
      .from("active_request_forms")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", lastWeek),
    supabase
      .from("active_bots")
      .select("id", { count: "exact", head: true })
      .eq("rating", "SFW"),
    supabase
      .from("active_bots")
      .select("id", { count: "exact", head: true })
      .eq("rating", "NSFW"),
  ]);

  const deleted_submissions = Math.max(
    0,
    (total_submissions_raw ?? 0) - (total_submissions ?? 0),
  );
  return {
    success: true,
    stats: {
      total_users: total_users ?? 0,
      total_bots: total_bots ?? 0,
      total_forms: total_forms ?? 0,
      total_submissions: total_submissions ?? 0,
      pending_flagged: pending_flagged ?? 0,
      new_today: new_today ?? 0,
      blocked_users: blocked_users ?? 0,
      owner_users: owner_users ?? 0,
      moderator_users: moderator_users ?? 0,
      active_forms: active_forms ?? 0,
      deleted_submissions,
      new_users_week: new_users_week ?? 0,
      sfw_bots: sfw_bots ?? 0,
      nsfw_bots: nsfw_bots ?? 0,
    },
  };
}

// ============================================================================
// Recent Activity
// ============================================================================

export async function getRecentActivity() {
  const { supabase, error } = await requireStaff();
  if (error)
    return {
      success: false,
      error,
      recent_users: [],
      recent_submissions: [],
      recent_flagged: [],
    };

  const [recentUsersRes, recentSubmissionsRes, recentFlaggedRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("requests")
        .select(
          "id, status, submitter_name, created_at, deleted_at, form_id, request_forms(title, user_id)",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("flagged_requests")
        .select(
          "id, risk_level, reviewed, created_at, request_id, requests!inner(id, deleted_at)",
        )
        .eq("reviewed", false)
        .is("requests.deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  // Resolve owners for submissions
  const subUserIds = [
    ...new Set(
      recentSubmissionsRes.data
        ?.map((r) => (r.request_forms as any)?.user_id)
        .filter(Boolean) ?? [],
    ),
  ];
  let subProfileMap = new Map<string, any>();
  if (subUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", subUserIds);
    subProfileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  }

  const recent_submissions = (recentSubmissionsRes.data ?? []).map((r) => {
    const form = r.request_forms as any;
    return {
      id: r.id,
      status: r.status,
      submitter_name: r.submitter_name,
      created_at: r.created_at,
      deleted_at: r.deleted_at ?? null,
      form_title: form?.title ?? null,
      owner: form?.user_id ? (subProfileMap.get(form.user_id) ?? null) : null,
    };
  });

  return {
    success: true,
    recent_users: recentUsersRes.data ?? [],
    recent_submissions,
    recent_flagged: recentFlaggedRes.data ?? [],
  };
}

// ============================================================================
// Submissions (all users, admins see deleted too)
// ============================================================================

export async function getAllSubmissions(
  page = 1,
  limit = 25,
  statusFilter?: string,
  userFilter?: string,
  sortBy: "created_at" | "status" | "submitter_name" = "created_at",
  sortDirection: "asc" | "desc" = "desc",
) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error, items: [], total: 0 };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Step 1: Resolve username filter → form_ids
  let targetFormIds: string[] | null = null;
  if (userFilter) {
    const { data: matchingProfiles } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", `%${userFilter}%`);
    const profileIds = matchingProfiles?.map((p) => p.id) ?? [];
    if (profileIds.length === 0) return { success: true, items: [], total: 0 };
    const { data: matchingForms } = await supabase
      .from("request_forms")
      .select("id")
      .in("user_id", profileIds);
    targetFormIds = matchingForms?.map((f) => f.id) ?? [];
    if (targetFormIds.length === 0)
      return { success: true, items: [], total: 0 };
  }

  const safeSortBy = ["created_at", "status", "submitter_name"].includes(sortBy)
    ? sortBy
    : "created_at";
  const ascending = sortDirection === "asc";

  // Step 2: Fetch requests (admin RLS allows seeing deleted records)
  let query = supabase
    .from("requests")
    .select(
      "id, status, submitter_name, created_at, deleted_at, form_id, request_forms(title, user_id)",
      { count: "exact" },
    )
    .order(safeSortBy, { ascending, nullsFirst: false })
    .range(from, to);

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  if (targetFormIds) {
    query = query.in("form_id", targetFormIds);
  }

  const { data: requests, count, error: dbError } = await query;
  if (dbError)
    return { success: false, error: dbError.message, items: [], total: 0 };

  // Step 3: Fetch profiles for form owners (profiles.id matches request_forms.user_id via auth.users)
  const userIds = [
    ...new Set(
      requests?.map((r) => (r.request_forms as any)?.user_id).filter(Boolean) ??
        [],
    ),
  ];
  let profileMap = new Map<string, any>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  }

  // Step 4: Merge
  const items = (requests ?? []).map((r) => {
    const form = r.request_forms as any;
    return {
      id: r.id,
      status: r.status,
      submitter_name: r.submitter_name,
      created_at: r.created_at,
      deleted_at: r.deleted_at ?? null,
      form_id: r.form_id,
      form_title: form?.title ?? null,
      owner: form?.user_id ? (profileMap.get(form.user_id) ?? null) : null,
    };
  });

  return { success: true, items, total: count ?? 0 };
}

// ============================================================================
// Forms (all users, admins see deleted too)
// ============================================================================

export async function getAllForms(
  page = 1,
  limit = 25,
  userFilter?: string,
  sortBy: "created_at" | "updated_at" | "title" | "is_active" = "updated_at",
  sortDirection: "asc" | "desc" = "desc",
) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error, items: [], total: 0 };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Step 1: Resolve username filter → user_ids
  let targetUserIds: string[] | null = null;
  if (userFilter) {
    const { data: matchingProfiles } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", `%${userFilter}%`);
    targetUserIds = matchingProfiles?.map((p) => p.id) ?? [];
    if (targetUserIds.length === 0)
      return { success: true, items: [], total: 0 };
  }

  const safeSortBy = ["created_at", "updated_at", "title", "is_active"].includes(sortBy)
    ? sortBy
    : "created_at";
  const ascending = sortDirection === "asc";

  // Step 2: Fetch forms (admin RLS allows seeing deleted records)
  let query = supabase
    .from("request_forms")
    .select(
      `
      id,
      title,
      description,
      sections,
      is_active,
      security_sensitivity,
      created_at,
      updated_at,
      deleted_at,
      user_id
    `,
      {
        count: "exact",
      },
    )
    .order(safeSortBy, { ascending, nullsFirst: false })
    .range(from, to);

  if (targetUserIds) {
    query = query.in("user_id", targetUserIds);
  }

  const { data: forms, count, error: dbError } = await query;
  if (dbError)
    return { success: false, error: dbError.message, items: [], total: 0 };

  // Step 3: Fetch profiles for form owners
  const userIds = [
    ...new Set(forms?.map((f) => f.user_id).filter(Boolean) ?? []),
  ];
  let profileMap = new Map<string, any>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  }

  // Step 4: Merge
  const items = (forms ?? []).map((f) => ({
    id: f.id,
    title: f.title,
    description: f.description,
    sections: f.sections,
    is_active: f.is_active,
    security_sensitivity: f.security_sensitivity || "medium",
    created_at: f.created_at,
    updated_at: f.updated_at,
    deleted_at: f.deleted_at ?? null,
    user_id: f.user_id,
    owner: f.user_id ? (profileMap.get(f.user_id) ?? null) : null,
  }));

  return { success: true, items, total: count ?? 0 };
}

// ============================================================================
// Users
// ============================================================================

export async function getAdminUsers(
  page = 1,
  limit = 25,
  search?: string,
  sortBy:
    | "created_at"
    | "updated_at"
    | "username"
    | "display_name"
    | "is_blocked" = "created_at",
  sortDirection: "asc" | "desc" = "desc",
) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error, items: [], total: 0 };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const safeSortBy = [
    "created_at",
    "updated_at",
    "username",
    "display_name",
    "is_blocked",
  ].includes(sortBy)
    ? sortBy
    : "created_at";
  const ascending = sortDirection === "asc";

  let query = supabase
    .from("profiles")
    .select(
      `
id,
username,
display_name,
avatar_url,
is_blocked,
staff_role,
created_at,
updated_at
`,
      { count: "exact" },
    )
    .order(safeSortBy, { ascending, nullsFirst: false })
    .range(from, to);

  if (search) {
    query = query.or(
      `username.ilike.%${search}%,display_name.ilike.%${search}%`,
    );
  }

  const { data, count, error: dbError } = await query;
  if (dbError)
    return { success: false, error: dbError.message, items: [], total: 0 };

  return { success: true, items: data ?? [], total: count ?? 0 };
}

export async function getAdminUserById(userId: string) {
  const { supabase, error } = await requireStaff();

  if (error) {
    return { success: false, error, user: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
id,
username,
display_name,
avatar_url,
is_blocked,
staff_role,
created_at,
updated_at
`,
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { success: false, error: profileError.message, user: null };
  }

  if (!profile) {
    return { success: false, error: "User not found", user: null };
  }

  /*
   * Current stats exclude soft-deleted resources.
   * Admin management tables still read raw tables so deleted rows remain
   * available for restore / hard delete.
   */
  const [
    botsResult,
    activeFormsResult,
    creatorPagesResult,
    worldsResult,
    lorebooksResult,
    entriesResult,
    collectionsResult,
    botActivityResult,
    formActivityResult,
    creatorPageActivityResult,
    worldActivityResult,
    lorebookActivityResult,
    entryActivityResult,
    collectionActivityResult,
  ] = await Promise.all([
    supabase
      .from("bots")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null),

    supabase
      .from("request_forms")
      .select("id")
      .eq("user_id", userId)
      .is("deleted_at", null),

    supabase
      .from("creator_pages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null),

    supabase
      .from("atlas_worlds")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null),

    supabase
      .from("atlas_lorebooks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null),

    supabase
      .from("atlas_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null),

    supabase
      .from("atlas_collections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null),

    supabase
      .from("bots")
      .select("id,name,created_at,updated_at,deleted_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(6),

    supabase
      .from("request_forms")
      .select("id,title,created_at,updated_at,deleted_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(6),

    supabase
      .from("creator_pages")
      .select("id,title,created_at,updated_at,deleted_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(6),

    supabase
      .from("atlas_worlds")
      .select("id,title,created_at,updated_at,deleted_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(6),

    supabase
      .from("atlas_lorebooks")
      .select("id,title,created_at,updated_at,deleted_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(6),

    supabase
      .from("atlas_entries")
      .select("id,title,created_at,updated_at,deleted_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(6),

    supabase
      .from("atlas_collections")
      .select("id,title,created_at,updated_at,deleted_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  // Use every owned form only to establish ownership of submissions.
  // The submission itself must still be non-deleted to count.
  const { data: allOwnedForms } = await supabase
    .from("request_forms")
    .select("id")
    .eq("user_id", userId);

  const allFormIds = allOwnedForms?.map((form) => form.id) ?? [];

  let submissionsCount = 0;
  let flaggedCount = 0;

  if (allFormIds.length > 0) {
    const [submissionsResult, flagsResult] = await Promise.all([
      supabase
        .from("requests")
        .select("id", { count: "exact", head: true })
        .in("form_id", allFormIds)
        .is("deleted_at", null),

      supabase
        .from("flagged_requests")
        .select("id, requests!inner(id)", { count: "exact", head: true })
        .in("form_id", allFormIds)
        .is("requests.deleted_at", null),
    ]);

    submissionsCount = submissionsResult.count ?? 0;
    flaggedCount = flagsResult.count ?? 0;
  }

  type ActivityKind =
    | "profile"
    | "bot"
    | "form"
    | "creator_page"
    | "world"
    | "lorebook"
    | "entry"
    | "collection";

  type ActivityItem = {
    id: string;
    kind: ActivityKind;
    label: string;
    at: string;
    deleted: boolean;
  };

  const toActivity = (
    kind: Exclude<ActivityKind, "profile">,
    rows: any[] | null,
    labelFor: (row: any) => string,
  ): ActivityItem[] =>
    (rows ?? []).flatMap((row) => {
      const normalAt = row.updated_at || row.created_at;
      const deletedAt = row.deleted_at || null;

      if (!normalAt && !deletedAt) return [];

      const useDeleted =
        Boolean(deletedAt) &&
        (!normalAt ||
          new Date(deletedAt).getTime() > new Date(normalAt).getTime());

      return [
        {
          id: row.id,
          kind,
          label: labelFor(row),
          at: useDeleted ? deletedAt : normalAt,
          deleted: useDeleted,
        },
      ];
    });

  const recentActivity: ActivityItem[] = [
    ...(profile.updated_at
      ? [
          {
            id: profile.id,
            kind: "profile" as const,
            label: "Profile",
            at: profile.updated_at,
            deleted: false,
          },
        ]
      : []),
    ...toActivity("bot", botActivityResult.data, (row) => row.name || "Untitled bot"),
    ...toActivity("form", formActivityResult.data, (row) => row.title || "Untitled form"),
    ...toActivity(
      "creator_page",
      creatorPageActivityResult.data,
      (row) => row.title || "Untitled Creator Page",
    ),
    ...toActivity("world", worldActivityResult.data, (row) => row.title || "Untitled World"),
    ...toActivity(
      "lorebook",
      lorebookActivityResult.data,
      (row) => row.title || "Untitled Lorebook",
    ),
    ...toActivity("entry", entryActivityResult.data, (row) => row.title || "Untitled Entry"),
    ...toActivity(
      "collection",
      collectionActivityResult.data,
      (row) => row.title || "Untitled Collection",
    ),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return {
    success: true,
    user: {
      ...profile,
      stats: {
        bots: botsResult.count ?? 0,
        forms: activeFormsResult.data?.length ?? 0,
        creator_pages: creatorPagesResult.count ?? 0,
        submissions: submissionsCount,
        flags: flaggedCount,
        worlds: worldsResult.count ?? 0,
        lorebooks: lorebooksResult.count ?? 0,
        entries: entriesResult.count ?? 0,
        collections: collectionsResult.count ?? 0,
      },
      last_activity: recentActivity[0] ?? null,
      recent_activity: recentActivity,
    },
  };
}


// ============================================================================
// Badge Automation
// ============================================================================

export type BadgeAutomationMetric =
  | "profile_completeness"
  | "active_bots"
  | "active_forms"
  | "active_creator_pages"
  | "atlas_worlds"
  | "atlas_lorebooks"
  | "atlas_entries"
  | "atlas_collections"
  | "atlas_resources"
  | "account_age_days";

export async function getBadgeAutomationOverview() {
  const { supabase, error } = await requireStaff();

  if (error) {
    return {
      success: false,
      error,
      definitions: [],
      totals: {
        automatic: 0,
        manual: 0,
        totalAwards: 0,
        automaticAwards: 0,
      },
    };
  }

  const [definitionsResult, awardsResult] = await Promise.all([
    supabase
      .from("badge_definitions")
      .select("slug,is_system,is_manual_only,rarity,metadata,is_active")
      .order("sort_order", { ascending: true }),
    supabase.from("profile_badge_awards").select("badge_slug,metadata"),
  ]);

  if (definitionsResult.error) {
    return {
      success: false,
      error: definitionsResult.error.message,
      definitions: [],
      totals: {
        automatic: 0,
        manual: 0,
        totalAwards: 0,
        automaticAwards: 0,
      },
    };
  }

  if (awardsResult.error) {
    return {
      success: false,
      error: awardsResult.error.message,
      definitions: [],
      totals: {
        automatic: 0,
        manual: 0,
        totalAwards: 0,
        automaticAwards: 0,
      },
    };
  }

  const awardCounts = new Map<
    string,
    { total: number; automatic: number }
  >();

  for (const award of awardsResult.data ?? []) {
    const current = awardCounts.get(award.badge_slug) ?? {
      total: 0,
      automatic: 0,
    };

    current.total += 1;

    const metadata =
      award.metadata && typeof award.metadata === "object"
        ? (award.metadata as Record<string, unknown>)
        : {};

    if (metadata.source === "automatic") {
      current.automatic += 1;
    }

    awardCounts.set(award.badge_slug, current);
  }

  const definitions = (definitionsResult.data ?? []).map((definition) => {
    const metadata =
      definition.metadata && typeof definition.metadata === "object"
        ? (definition.metadata as Record<string, any>)
        : {};

    const automation =
      metadata.automation && typeof metadata.automation === "object"
        ? metadata.automation
        : {};

    const enabled =
      definition.is_manual_only !== true && automation.enabled === true;

    return {
      slug: definition.slug,
      is_system: definition.is_system === true,
      is_manual_only: definition.is_manual_only === true,
      rarity: definition.rarity || "common",
      is_active: definition.is_active !== false,
      automation: enabled
        ? {
            enabled: true,
            mode: "automatic" as const,
            type:
              automation.type === "created_before"
                ? ("created_before" as const)
                : ("metric_threshold" as const),
            metric: automation.metric || null,
            threshold:
              typeof automation.threshold === "number"
                ? automation.threshold
                : Number(automation.threshold || 1),
            before:
              typeof automation.before === "string"
                ? automation.before
                : null,
            sticky: automation.sticky !== false,
          }
        : {
            enabled: false,
            mode: "manual" as const,
            sticky: true,
          },
      awards: awardCounts.get(definition.slug) ?? {
        total: 0,
        automatic: 0,
      },
    };
  });

  return {
    success: true,
    definitions,
    totals: {
      automatic: definitions.filter(
        (item) => item.automation.mode === "automatic",
      ).length,
      manual: definitions.filter(
        (item) => item.automation.mode === "manual",
      ).length,
      totalAwards: (awardsResult.data ?? []).length,
      automaticAwards: (awardsResult.data ?? []).filter((award) => {
        const metadata =
          award.metadata && typeof award.metadata === "object"
            ? (award.metadata as Record<string, unknown>)
            : {};

        return metadata.source === "automatic";
      }).length,
    },
  };
}

export async function updateBadgeAutomationConfig(input: {
  slug: string;
  mode: "manual" | "automatic";
  type?: "metric_threshold" | "created_before";
  metric?: BadgeAutomationMetric;
  threshold?: number;
  before?: string;
  sticky?: boolean;
}) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error };

  const slug = String(input.slug || "")
    .trim()
    .toLowerCase();

  if (!slug) {
    return { success: false, error: "Badge slug is required" };
  }

  const { data: current, error: currentError } = await supabase
    .from("badge_definitions")
    .select("metadata")
    .eq("slug", slug)
    .maybeSingle();

  if (currentError) {
    return { success: false, error: currentError.message };
  }

  if (!current) {
    return { success: false, error: "Badge not found" };
  }

  const currentMetadata =
    current.metadata && typeof current.metadata === "object"
      ? (current.metadata as Record<string, unknown>)
      : {};

  let automation: Record<string, unknown>;

  if (input.mode === "manual") {
    automation = {
      enabled: false,
      sticky: true,
    };
  } else if (input.type === "created_before") {
    const before = String(input.before || "").trim();

    if (!before || Number.isNaN(new Date(before).getTime())) {
      return {
        success: false,
        error: "A valid cutoff date is required for this automatic rule",
      };
    }

    automation = {
      enabled: true,
      type: "created_before",
      before: new Date(before).toISOString(),
      sticky: input.sticky !== false,
    };
  } else {
    const metric = input.metric;
    const allowedMetrics: BadgeAutomationMetric[] = [
      "profile_completeness",
      "active_bots",
      "active_forms",
      "active_creator_pages",
      "atlas_worlds",
      "atlas_lorebooks",
      "atlas_entries",
      "atlas_collections",
      "atlas_resources",
      "account_age_days",
    ];

    if (!metric || !allowedMetrics.includes(metric)) {
      return { success: false, error: "Choose a valid automatic metric" };
    }

    const threshold = Number(input.threshold);

    if (!Number.isFinite(threshold) || threshold < 0) {
      return {
        success: false,
        error: "Automatic threshold must be zero or greater",
      };
    }

    automation = {
      enabled: true,
      type: "metric_threshold",
      metric,
      threshold,
      sticky: input.sticky !== false,
    };
  }

  const { error: updateError } = await supabase
    .from("badge_definitions")
    .update({
      is_manual_only: input.mode === "manual",
      metadata: {
        ...currentMetadata,
        automation,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function reconcileAutomaticBadges() {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error, awarded: 0 };

  const { data, error: rpcError } = await supabase.rpc(
    "reconcile_all_profile_badges",
  );

  if (rpcError) {
    return { success: false, error: rpcError.message, awarded: 0 };
  }

  return {
    success: true,
    awarded: Number(data || 0),
  };
}


// ============================================================================
// User Admin/Block actions
// ============================================================================

export async function setUserStaffRole(
  targetUserId: string,
  nextRole: "moderator" | null,
) {
  const { supabase, userId: actorId, error } = await requireOwner();

  if (error) {
    return {
      success: false,
      error,
    };
  }

  if (targetUserId === actorId) {
    return {
      success: false,
      error: "You cannot change your own staff role",
    };
  }

  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("id, staff_role")
    .eq("id", targetUserId)
    .maybeSingle();

  if (targetError) {
    return {
      success: false,
      error: targetError.message,
    };
  }

  if (!target) {
    return {
      success: false,
      error: "User not found",
    };
  }

  /*
   * Owner is intentionally protected here.
   * Owner roles should not be accidentally
   * modified from the normal Users UI.
   */
  if (target.staff_role === "owner") {
    return {
      success: false,
      error: "Owner accounts cannot be changed from this action",
    };
  }

  const { error: dbError } = await supabase
    .from("profiles")
    .update({
      staff_role: nextRole,
    })
    .eq("id", targetUserId);

  if (dbError) {
    return {
      success: false,
      error: dbError.message,
    };
  }

  return {
    success: true,
  };
}

export async function blockUser(userId: string) {
  const { supabase, userId: actorId, role, error } = await requireStaff();

  if (error) {
    return {
      success: false,
      error,
    };
  }

  if (actorId === userId) {
    return {
      success: false,
      error: "You cannot block your own account",
    };
  }

  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("id, staff_role")
    .eq("id", userId)
    .maybeSingle();

  if (targetError) {
    return {
      success: false,
      error: targetError.message,
    };
  }

  if (!target) {
    return {
      success: false,
      error: "User not found",
    };
  }

  const targetIsStaff =
    target.staff_role === "owner" || target.staff_role === "moderator";

  if (role !== "owner" && targetIsStaff) {
    return {
      success: false,
      error: "Moderators cannot block staff accounts",
    };
  }

  const { error: dbError } = await supabase
    .from("profiles")
    .update({
      is_blocked: true,
    })
    .eq("id", userId);

  if (dbError) {
    return {
      success: false,
      error: dbError.message,
    };
  }

  return {
    success: true,
  };
}

export async function resetUserPin(userId: string, newPin: string) {
  const { supabase, error } = await requireOwner();
  if (error) return { success: false, error };

  if (!/^\d{4}$/.test(newPin)) {
    return { success: false, error: "PIN must be exactly 4 digits" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  const username = String(profile?.username ?? "")
    .trim()
    .toLowerCase();

  if (!username) {
    return { success: false, error: "User username not found" };
  }

  const adminClient = await createAdminClient();
  if (!adminClient) {
    return {
      success: false,
      error: "Service role is not configured for PIN updates",
    };
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    userId,
    { password: `${newPin}${username}` },
  );

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function unblockUser(userId: string) {
  const { supabase, userId: actorId, role, error } = await requireStaff();

  if (error) {
    return {
      success: false,
      error,
    };
  }

  if (actorId === userId) {
    return {
      success: false,
      error: "You cannot modify your own access state",
    };
  }

  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("id, staff_role")
    .eq("id", userId)
    .maybeSingle();

  if (targetError) {
    return {
      success: false,
      error: targetError.message,
    };
  }

  if (!target) {
    return {
      success: false,
      error: "User not found",
    };
  }

  const targetIsStaff =
    target.staff_role === "owner" || target.staff_role === "moderator";
  if (role !== "owner" && targetIsStaff) {
    return {
      success: false,
      error: "Moderators cannot modify staff accounts",
    };
  }

  const { error: dbError } = await supabase
    .from("profiles")
    .update({
      is_blocked: false,
    })
    .eq("id", userId);

  if (dbError) {
    return {
      success: false,
      error: dbError.message,
    };
  }

  return {
    success: true,
  };
}

export async function resetUserDisplayName(userId: string) {
  const { supabase, error } = await requireOwner();
  if (error) return { success: false, error };

  // Reset display_name to the user's own username
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ display_name: profile?.username ?? null })
    .eq("id", userId);

  if (dbError) return { success: false, error: dbError.message };
  return { success: true };
}

export async function clearUserAvatar(userId: string) {
  const { supabase, error } = await requireOwner();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", userId);

  if (dbError) return { success: false, error: dbError.message };
  return { success: true };
}

const FEEDBACK_IMAGES_BUCKET = "feedback_images";

type FeedbackImageMetadata = {
  url?: string | null;
};

function extractFeedbackImageUrls(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") {
    return [];
  }

  const images = (metadata as { images?: unknown }).images;

  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => {
      if (!image || typeof image !== "object") {
        return null;
      }

      const url = (image as FeedbackImageMetadata).url;

      return typeof url === "string" && url.trim() ? url.trim() : null;
    })
    .filter((url): url is string => Boolean(url));
}

async function removeProfileAssetsForDeletedUser(
  adminClient: NonNullable<Awaited<ReturnType<typeof createAdminClient>>>,
  userId: string,
  avatarUrl?: string | null,
  bannerUrl?: string | null,
) {
  const paths = new Set<string>();

  const avatarPath = extractStorageObjectPathFromPublicUrl(
    avatarUrl,
    PROFILE_ASSETS_BUCKET,
  );

  const bannerPath = extractStorageObjectPathFromPublicUrl(
    bannerUrl,
    PROFILE_ASSETS_BUCKET,
  );

  if (avatarPath) paths.add(avatarPath);
  if (bannerPath) paths.add(bannerPath);

  const { data: folderObjects, error: listError } = await adminClient.storage
    .from(PROFILE_ASSETS_BUCKET)
    .list(userId, {
      limit: 1000,
      offset: 0,
      sortBy: {
        column: "name",
        order: "asc",
      },
    });

  if (listError) {
    return {
      success: false,
      error: `Could not inspect profile assets: ${listError.message}`,
    };
  }

  for (const object of folderObjects ?? []) {
    if (!object?.name) continue;
    if (object.id === null) continue;

    paths.add(`${userId}/${object.name}`);
  }

  if (paths.size === 0) {
    return { success: true };
  }

  const { error: removeError } = await adminClient.storage
    .from(PROFILE_ASSETS_BUCKET)
    .remove([...paths]);

  if (removeError) {
    return {
      success: false,
      error: `Could not remove profile assets: ${removeError.message}`,
    };
  }

  return { success: true };
}

async function removeBotAssetsForDeletedUser(
  adminClient: NonNullable<Awaited<ReturnType<typeof createAdminClient>>>,
  imageUrls: Array<string | null>,
) {
  const paths = new Set<string>();

  for (const imageUrl of imageUrls) {
    const path = extractStorageObjectPathFromPublicUrl(
      imageUrl,
      BOT_ASSETS_BUCKET,
    );

    if (path) {
      paths.add(path);
    }
  }

  if (paths.size === 0) {
    return { success: true };
  }

  const { error } = await adminClient.storage
    .from(BOT_ASSETS_BUCKET)
    .remove([...paths]);

  if (error) {
    return {
      success: false,
      error: `Could not remove bot assets: ${error.message}`,
    };
  }

  return { success: true };
}

async function removeFormAssetsForDeletedUser(
  adminClient: NonNullable<Awaited<ReturnType<typeof createAdminClient>>>,
  forms: Array<{
    sections: unknown;
    banner_asset_path: string | null;
  }>,
) {
  const assetPaths = new Set<string>();
  const bannerPaths = new Set<string>();

  for (const form of forms) {
    for (const path of extractFormAssetPathsFromSections(form.sections)) {
      assetPaths.add(path);
    }

    const bannerPath = String(form.banner_asset_path ?? "").trim();

    if (bannerPath) {
      bannerPaths.add(bannerPath);
    }
  }

  if (assetPaths.size > 0) {
    const { error } = await adminClient.storage
      .from(FORM_ASSETS_BUCKET)
      .remove([...assetPaths]);

    if (error) {
      return {
        success: false,
        error: `Could not remove form assets: ${error.message}`,
      };
    }
  }

  if (bannerPaths.size > 0) {
    const { error } = await adminClient.storage
      .from(FORM_BANNERS_BUCKET)
      .remove([...bannerPaths]);

    if (error) {
      return {
        success: false,
        error: `Could not remove form banners: ${error.message}`,
      };
    }
  }

  return { success: true };
}

async function removeFeedbackImagesForDeletedUser(
  adminClient: NonNullable<Awaited<ReturnType<typeof createAdminClient>>>,
  metadataRows: unknown[],
) {
  const paths = new Set<string>();

  for (const metadata of metadataRows) {
    const urls = extractFeedbackImageUrls(metadata);

    for (const url of urls) {
      const path = extractStorageObjectPathFromPublicUrl(
        url,
        FEEDBACK_IMAGES_BUCKET,
      );

      if (path) {
        paths.add(path);
      }
    }
  }

  if (paths.size === 0) {
    return { success: true };
  }

  const { error } = await adminClient.storage
    .from(FEEDBACK_IMAGES_BUCKET)
    .remove([...paths]);

  if (error) {
    return {
      success: false,
      error: `Could not remove feedback images: ${error.message}`,
    };
  }

  return { success: true };
}

export async function deleteUserAsAdmin(userId: string) {
  const { supabase, userId: actorId, error } = await requireOwner();

  if (error) {
    return {
      success: false,
      error,
    };
  }

  if (actorId === userId) {
    return {
      success: false,
      error: "You cannot delete your own owner account",
    };
  }

  const [targetResult, botsResult, formsResult, feedbackResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, staff_role, avatar_url, banner_url")
        .eq("id", userId)
        .maybeSingle(),

      supabase.from("bots").select("image_url").eq("user_id", userId),

      supabase
        .from("request_forms")
        .select("sections, banner_asset_path")
        .eq("user_id", userId),

      supabase
        .from("feedback_submissions")
        .select("metadata")
        .eq("submitter_user_id", userId),
    ]);

  if (targetResult.error) {
    return {
      success: false,
      error: targetResult.error.message,
    };
  }

  if (!targetResult.data) {
    return {
      success: false,
      error: "User not found",
    };
  }

  if (targetResult.data.staff_role === "owner") {
    return {
      success: false,
      error: "Owner accounts cannot be deleted here",
    };
  }

  if (botsResult.error) {
    return {
      success: false,
      error: botsResult.error.message,
    };
  }

  if (formsResult.error) {
    return {
      success: false,
      error: formsResult.error.message,
    };
  }

  if (feedbackResult.error) {
    return {
      success: false,
      error: feedbackResult.error.message,
    };
  }

  const adminClient = await createAdminClient();

  if (!adminClient) {
    return {
      success: false,
      error: "Server storage access is not configured",
    };
  }

  const profileCleanup = await removeProfileAssetsForDeletedUser(
    adminClient,
    userId,
    targetResult.data.avatar_url,
    targetResult.data.banner_url,
  );

  if (!profileCleanup.success) {
    return profileCleanup;
  }

  const botCleanup = await removeBotAssetsForDeletedUser(
    adminClient,
    (botsResult.data ?? []).map((bot) => bot.image_url),
  );

  if (!botCleanup.success) {
    return botCleanup;
  }

  const formCleanup = await removeFormAssetsForDeletedUser(
    adminClient,
    formsResult.data ?? [],
  );

  if (!formCleanup.success) {
    return formCleanup;
  }

  const feedbackCleanup = await removeFeedbackImagesForDeletedUser(
    adminClient,
    (feedbackResult.data ?? []).map((row) => row.metadata),
  );

  if (!feedbackCleanup.success) {
    return feedbackCleanup;
  }

  const { error: rpcError } = await supabase.rpc("delete_user_as_admin", {
    target_user_id: userId,
  });

  if (rpcError) {
    return {
      success: false,
      error: rpcError.message,
    };
  }

  return {
    success: true,
  };
}

// ============================================================================
// Moderation (admin)
// ============================================================================

export async function getAdminModerationStats() {
  const { supabase, error } = await requireStaff();
  if (error) {
    return {
      success: false,
      error,
      stats: null,
    };
  }

  const [
    { count: openFlags },
    { count: dangerousOpenFlags },
    { count: blockedIps },
    { count: globalBlockPatterns },
    { count: customBlockPatterns },
    { count: strictForms },
  ] = await Promise.all([
    supabase
      .from("flagged_requests")
      .select("id, requests!inner(id)", { count: "exact", head: true })
      .eq("reviewed", false)
      .is("requests.deleted_at", null),
    supabase
      .from("flagged_requests")
      .select("id, requests!inner(id)", { count: "exact", head: true })
      .eq("reviewed", false)
      .eq("risk_level", "dangerous")
      .is("requests.deleted_at", null),
    supabase.from("blocked_ips").select("id", { count: "exact", head: true }),
    supabase
      .from("global_blocklists")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("custom_blocklists")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("active_request_forms")
      .select("id", { count: "exact", head: true })
      .in("security_sensitivity", ["high", "strict"]),
  ]);

  return {
    success: true,
    stats: {
      open_flags: openFlags ?? 0,
      dangerous_open_flags: dangerousOpenFlags ?? 0,
      blocked_ips: blockedIps ?? 0,
      global_block_patterns: globalBlockPatterns ?? 0,
      custom_block_patterns: customBlockPatterns ?? 0,
      high_security_forms: strictForms ?? 0,
    },
  };
}

export async function restoreSubmission(id: string) {
  const { supabase, error } = await requireStaff();

  if (error) {
    return {
      success: false,
      error,
    };
  }

  const { error: dbError } = await supabase
    .from("requests")
    .update({
      deleted_at: null,
    })
    .eq("id", id);

  if (dbError) {
    return {
      success: false,
      error: dbError.message,
    };
  }

  return {
    success: true,
  };
}

export async function restoreForm(id: string) {
  const { supabase, error } = await requireStaff();

  if (error) {
    return {
      success: false,
      error,
    };
  }

  const { error: dbError } = await supabase
    .from("request_forms")
    .update({
      deleted_at: null,
    })
    .eq("id", id);

  if (dbError) {
    return {
      success: false,
      error: dbError.message,
    };
  }

  return {
    success: true,
  };
}

export async function restoreBot(id: string) {
  const { supabase, error } = await requireStaff();

  if (error) {
    return {
      success: false,
      error,
    };
  }

  const { error: dbError } = await supabase
    .from("bots")
    .update({
      deleted_at: null,
    })
    .eq("id", id);

  if (dbError) {
    return {
      success: false,
      error: dbError.message,
    };
  }

  return {
    success: true,
  };
}

export async function getAdminModerationForms(search?: string) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error, items: [] as any[] };

  let query = supabase
    .from("active_request_forms")
    .select("id, title, user_id, security_sensitivity, is_active, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  const safeSearch = String(search || "").trim();
  if (safeSearch) {
    query = query.ilike("title", `%${safeSearch}%`);
  }

  const { data: forms, error: formsError } = await query;
  if (formsError) {
    return { success: false, error: formsError.message, items: [] as any[] };
  }

  const ownerIds = [
    ...new Set((forms || []).map((form: any) => form.user_id).filter(Boolean)),
  ];

  let ownersMap = new Map<string, any>();
  if (ownerIds.length > 0) {
    const { data: owners } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", ownerIds);
    ownersMap = new Map((owners || []).map((owner: any) => [owner.id, owner]));
  }

  const items = (forms || []).map((form: any) => ({
    id: form.id,
    title: form.title,
    user_id: form.user_id,
    security_sensitivity: form.security_sensitivity || "medium",
    is_active: form.is_active,
    updated_at: form.updated_at,
    owner: form.user_id ? ownersMap.get(form.user_id) || null : null,
  }));

  return { success: true, items };
}

export async function getAdminModerationFlags(options?: {
  riskLevel?: "all" | "warning" | "dangerous";
  reviewed?: "open" | "reviewed" | "all";
  limit?: number;
}) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error, items: [] as any[] };

  const riskLevel = options?.riskLevel || "all";
  const reviewed = options?.reviewed || "open";
  const limit = Math.max(1, Math.min(200, Math.trunc(options?.limit || 80)));

  /*
   * A request is soft-deleted by setting requests.deleted_at.
   * flagged_requests intentionally stays in the database so moderation history
   * survives a delete/restore cycle, but deleted submissions must not appear
   * in the live moderation queue.
   *
   * Filter through the request relation BEFORE applying limit so deleted flags
   * cannot consume queue slots.
   */
  let query = supabase
    .from("flagged_requests")
    .select(
      `
      id,
      form_id,
      request_id,
      risk_level,
      flagged_fields,
      reason,
      reviewed,
      review_action,
      review_notes,
      reviewed_at,
      created_at,
      request:requests!inner(
        id,
        submitter_name,
        ip_address,
        deleted_at
      )
      `,
    )
    .is("request.deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (riskLevel !== "all") {
    query = query.eq("risk_level", riskLevel);
  }

  if (reviewed === "open") {
    query = query.eq("reviewed", false);
  } else if (reviewed === "reviewed") {
    query = query.eq("reviewed", true);
  }

  const { data: flags, error: flagsError } = await query;

  if (flagsError) {
    return {
      success: false,
      error: flagsError.message,
      items: [] as any[],
    };
  }

  const formIds = [
    ...new Set((flags || []).map((flag: any) => flag.form_id).filter(Boolean)),
  ];

  let formsMap = new Map<string, any>();

  if (formIds.length > 0) {
    const { data: forms } = await supabase
      .from("request_forms")
      .select("id, title, user_id")
      .in("id", formIds);

    formsMap = new Map((forms || []).map((form: any) => [form.id, form]));
  }

  const ownerIds = [
    ...new Set(
      Array.from(formsMap.values())
        .map((form: any) => form.user_id)
        .filter(Boolean),
    ),
  ];

  let ownersMap = new Map<string, any>();

  if (ownerIds.length > 0) {
    const { data: owners } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", ownerIds);

    ownersMap = new Map((owners || []).map((owner: any) => [owner.id, owner]));
  }

  const items = (flags || []).map((flag: any) => {
    const form = formsMap.get(flag.form_id) || null;
    const owner = form?.user_id ? ownersMap.get(form.user_id) || null : null;

    return {
      ...flag,
      form,
      request: flag.request || null,
      owner,
    };
  });

  return { success: true, items };
}

export async function getAdminBlockedIps(options?: {
  limit?: number;
  search?: string;
}) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error, items: [] as any[] };

  const limit = Math.max(1, Math.min(300, Math.trunc(options?.limit || 120)));
  const search = String(options?.search || "").trim();

  let query = supabase
    .from("blocked_ips")
    .select("id, form_id, ip_address, reason, blocked_at")
    .order("blocked_at", { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(`ip_address.ilike.%${search}%,reason.ilike.%${search}%`);
  }

  const { data: blockedIps, error: blockedIpsError } = await query;
  if (blockedIpsError) {
    return {
      success: false,
      error: blockedIpsError.message,
      items: [] as any[],
    };
  }

  const formIds = [
    ...new Set(
      (blockedIps || []).map((row: any) => row.form_id).filter(Boolean),
    ),
  ];

  let formsMap = new Map<string, any>();
  if (formIds.length > 0) {
    const { data: forms } = await supabase
      .from("request_forms")
      .select("id, title, user_id")
      .in("id", formIds);
    formsMap = new Map((forms || []).map((form: any) => [form.id, form]));
  }

  const items = (blockedIps || []).map((row: any) => ({
    ...row,
    form: formsMap.get(row.form_id) || null,
  }));

  return { success: true, items };
}

export async function adminBlockIpAddress(
  formId: string,
  ipAddress: string,
  reason: string,
) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error };

  const payload = {
    form_id: formId,
    ip_address: ipAddress,
    reason,
  };

  const { error: insertError } = await supabase
    .from("blocked_ips")
    .insert(payload);

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true };
}

export async function adminUnblockIpAddress(blockedIpId: string) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error };

  const { error: deleteError } = await supabase
    .from("blocked_ips")
    .delete()
    .eq("id", blockedIpId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  return { success: true };
}

export async function adminReviewFlaggedRequest(
  flaggedRequestId: string,
  action: "approved" | "rejected",
  notes?: string,
) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error };

  const { error: updateError } = await supabase
    .from("flagged_requests")
    .update({
      reviewed: true,
      review_action: action,
      review_notes: notes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", flaggedRequestId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

// ============================================================================
// Bots (all users, admins see deleted too)
// ============================================================================

export async function getAllBots(
  page = 1,
  limit = 25,
  userFilter?: string,
  ratingFilter?: string,
  sortBy: "created_at" | "updated_at" | "name" | "rating" = "updated_at",
  sortDirection: "asc" | "desc" = "desc",
) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error, items: [], total: 0 };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Step 1: Resolve username filter → user_ids
  let targetUserIds: string[] | null = null;
  if (userFilter) {
    const { data: matchingProfiles } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", `%${userFilter}%`);
    targetUserIds = matchingProfiles?.map((p) => p.id) ?? [];
    if (targetUserIds.length === 0)
      return { success: true, items: [], total: 0 };
  }

  const safeSortBy = ["created_at", "updated_at", "name", "rating"].includes(sortBy)
    ? sortBy
    : "created_at";
  const ascending = sortDirection === "asc";

  // Step 2: Fetch bots
  let query = supabase
    .from("bots")
    .select(
      `
      id,
      name,
      short_description,
      image_url,
      rating,
      tags,
      created_at,
      updated_at,
      deleted_at,
      user_id
    `,
      {
        count: "exact",
      },
    )
    .order(safeSortBy, { ascending, nullsFirst: false })
    .range(from, to);

  if (targetUserIds) query = query.in("user_id", targetUserIds);
  if (ratingFilter && ratingFilter !== "all")
    query = query.eq("rating", ratingFilter);

  const { data: bots, count, error: dbError } = await query;
  if (dbError)
    return { success: false, error: dbError.message, items: [], total: 0 };

  // Step 3: Fetch profiles
  const userIds = [
    ...new Set(bots?.map((b) => b.user_id).filter(Boolean) ?? []),
  ];
  let profileMap = new Map<string, any>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  }

  const items = (bots ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    short_description: b.short_description,
    image_url: b.image_url,
    rating: b.rating,
    tags: b.tags,
    created_at: b.created_at,
    updated_at: b.updated_at,
    deleted_at: b.deleted_at ?? null,
    user_id: b.user_id,
    owner: b.user_id ? (profileMap.get(b.user_id) ?? null) : null,
  }));

  return { success: true, items, total: count ?? 0 };
}

// ============================================================================
// Detail getters (full records for admin detail sheets)
// ============================================================================

export async function getSubmissionById(id: string) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error, item: null };

  const { data, error: dbError } = await supabase
    .from("requests")
    .select(
      `
      *,
      request_forms(
        id,
        title,
        user_id,
        sections
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (dbError) return { success: false, error: dbError.message, item: null };
  if (!data) return { success: false, error: "Not found", item: null };

  const formUserId = (data.request_forms as any)?.user_id;
  let owner = null;
  if (formUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", formUserId)
      .maybeSingle();
    owner = profile;
  }

  const form = data.request_forms as any;

  return {
    success: true,
    item: {
      ...data,

      form_title: form?.title ?? (data as any).form_title,

      form: form
        ? {
            id: form.id,
            title: form.title,
            user_id: form.user_id,
            sections: Array.isArray(form.sections) ? form.sections : [],
          }
        : null,

      owner,

      deleted_at: (data as any).deleted_at ?? null,
    },
  };
}

export async function getBotById(id: string) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error, item: null };

  const { data, error: dbError } = await supabase
    .from("bots")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (dbError) return { success: false, error: dbError.message, item: null };
  if (!data) return { success: false, error: "Not found", item: null };

  let owner = null;
  if ((data as any).user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", (data as any).user_id)
      .maybeSingle();
    owner = profile;
  }

  return { success: true, item: { ...data, owner } };
}

export async function getFormById(id: string) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error, item: null };

  const { data, error: dbError } = await supabase
    .from("request_forms")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (dbError) return { success: false, error: dbError.message, item: null };
  if (!data) return { success: false, error: "Not found", item: null };

  let owner = null;
  if ((data as any).user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", (data as any).user_id)
      .maybeSingle();
    owner = profile;
  }

  return { success: true, item: { ...data, owner } };
}

// ============================================================================
// Soft delete
// ============================================================================

export async function softDeleteSubmission(id: string) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error };

  const { data: existing } = await supabase
    .from("requests")
    .select("id, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { success: false, error: "Not found" };
  if ((existing as any).deleted_at) {
    return { success: true, deleted_at: (existing as any).deleted_at };
  }

  const deletedAt = new Date().toISOString();
  const { error: dbError } = await supabase
    .from("requests")
    .update({ deleted_at: deletedAt })
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, deleted_at: deletedAt };
}

export async function softDeleteForm(id: string) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error };

  const { data: existing } = await supabase
    .from("request_forms")
    .select("id, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { success: false, error: "Not found" };
  if ((existing as any).deleted_at) {
    return { success: true, deleted_at: (existing as any).deleted_at };
  }

  const deletedAt = new Date().toISOString();
  const { error: dbError } = await supabase
    .from("request_forms")
    .update({ deleted_at: deletedAt })
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, deleted_at: deletedAt };
}

export async function softDeleteBot(id: string) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error };

  const { data: existing } = await supabase
    .from("bots")
    .select("id, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { success: false, error: "Not found" };
  if ((existing as any).deleted_at) {
    return { success: true, deleted_at: (existing as any).deleted_at };
  }

  const deletedAt = new Date().toISOString();
  const { error: dbError } = await supabase
    .from("bots")
    .update({ deleted_at: deletedAt })
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, deleted_at: deletedAt };
}

// ============================================================================
// Hard delete (only for already soft-deleted records)
// ============================================================================

export async function hardDeleteSubmission(id: string) {
  const { supabase, error } = await requireOwner();
  if (error) return { success: false, error };

  const { data: existing } = await supabase
    .from("requests")
    .select("id, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!(existing as any)?.deleted_at)
    return { success: false, error: "Record is not soft-deleted" };

  const { error: dbError } = await supabase
    .from("requests")
    .delete()
    .eq("id", id);
  if (dbError) return { success: false, error: dbError.message };
  return { success: true };
}

export async function hardDeleteForm(id: string) {
  const { supabase, error } = await requireOwner();
  if (error) return { success: false, error };

  const { data: existing } = await supabase
    .from("request_forms")
    .select("id, deleted_at, sections, banner_asset_path")
    .eq("id", id)
    .maybeSingle();
  if (!(existing as any)?.deleted_at)
    return { success: false, error: "Record is not soft-deleted" };

  // Defensively remove dependent rows first for environments where FK cascade
  // is missing or inconsistent.
  await supabase.from("flagged_requests").delete().eq("form_id", id);
  await supabase.from("requests").delete().eq("form_id", id);
  await supabase.from("custom_blocklists").delete().eq("form_id", id);
  await supabase.from("blocked_ips").delete().eq("form_id", id);

  const assetPaths = extractFormAssetPathsFromSections(
    (existing as any).sections,
  );
  if (assetPaths.length > 0) {
    await supabase.storage.from(FORM_ASSETS_BUCKET).remove(assetPaths);
  }

  const bannerPath = String((existing as any).banner_asset_path || "").trim();
  if (bannerPath) {
    await supabase.storage.from(FORM_BANNERS_BUCKET).remove([bannerPath]);
  }

  const { error: dbError } = await supabase
    .from("request_forms")
    .delete()
    .eq("id", id);
  if (dbError) return { success: false, error: dbError.message };
  return { success: true };
}

export async function hardDeleteBot(id: string) {
  const { supabase, error } = await requireOwner();
  if (error) return { success: false, error };

  const { data: existing } = await supabase
    .from("bots")
    .select("id, deleted_at, image_url")
    .eq("id", id)
    .maybeSingle();
  if (!(existing as any)?.deleted_at)
    return { success: false, error: "Record is not soft-deleted" };

  const imagePath = extractStorageObjectPathFromPublicUrl(
    (existing as any).image_url,
    BOT_ASSETS_BUCKET,
  );
  if (imagePath) {
    await supabase.storage.from(BOT_ASSETS_BUCKET).remove([imagePath]);
  }

  const { error: dbError } = await supabase.from("bots").delete().eq("id", id);
  if (dbError) return { success: false, error: dbError.message };
  return { success: true };
}

// ============================================================================
// Flagged Requests (global moderation)
// ============================================================================

export async function getAllFlaggedRequests(
  page = 1,
  limit = 25,
  riskFilter?: string,
  reviewedFilter?: "all" | "pending" | "reviewed",
) {
  const { supabase, error } = await requireStaff();
  if (error) return { success: false, error, items: [], total: 0 };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("flagged_requests")
    .select(
      `id, risk_score, risk_level, reviewed, created_at, request_id,
       requests!inner(
         id, submitter_name, status, form_id, deleted_at,
         request_forms!inner(title, user_id,
           profiles!request_forms_user_id_fkey(username, display_name)
         )
       )`,
      { count: "exact" },
    )
    .is("requests.deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (riskFilter && riskFilter !== "all") {
    query = query.eq("risk_level", riskFilter);
  }
  if (reviewedFilter === "pending") {
    query = query.eq("reviewed", false);
  } else if (reviewedFilter === "reviewed") {
    query = query.eq("reviewed", true);
  }

  const { data, count, error: dbError } = await query;
  if (dbError)
    return { success: false, error: dbError.message, items: [], total: 0 };

  return { success: true, items: data ?? [], total: count ?? 0 };
}
