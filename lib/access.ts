import type { SupabaseClient } from "@supabase/supabase-js";

export type StaffRole = "owner" | "moderator" | null;

type CurrentUserAccess = {
  user:
    | Awaited<ReturnType<SupabaseClient["auth"]["getUser"]>>["data"]["user"]
    | null;
  staffRole: StaffRole;
  isStaff: boolean;
  isOwner: boolean;
  isModerator: boolean;
  isBlocked: boolean;
  profile: UserProfile | null;
};

type CachedAccessEntry = {
  expiresAt: number;
  promise: Promise<CurrentUserAccess>;
};

const ACCESS_CACHE_TTL_MS = 10_000;
const browserAccessCache = new Map<string, CachedAccessEntry>();

export interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  slug: string | null;
  staff_role: StaffRole;
  is_blocked: boolean | null;
}

async function loadCurrentUserAccess(
  supabase: SupabaseClient,
): Promise<CurrentUserAccess> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    return {
      user: null as null,
      staffRole: null,
      isStaff: false,
      isOwner: false,
      isModerator: false,
      isBlocked: false,
      profile: null as null,
    };
  }

  // Fetch profile data in the same call
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, slug, staff_role, is_blocked",
    )
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  const staffRole: StaffRole =
    profile?.staff_role === "owner" || profile?.staff_role === "moderator"
      ? profile.staff_role
      : null;
  const isOwner = staffRole === "owner";
  const isModerator = staffRole === "moderator";
  const isStaff = isOwner || isModerator;
  const isBlocked = !!profile?.is_blocked;

  if (isBlocked) {
    return {
      user: null as null,
      staffRole: null,
      isStaff: false,
      isOwner: false,
      isModerator: false,
      isBlocked: true,
      profile: null as null,
    };
  }

  return {
    user,
    staffRole,
    isStaff,
    isOwner,
    isModerator,
    isBlocked: false,
    profile,
  };
}

function getAccessCacheKey(sessionToken: string | null | undefined) {
  return sessionToken || "anonymous";
}

export async function getCurrentUserAccess(supabase: SupabaseClient) {
  if (typeof window === "undefined") {
    return loadCurrentUserAccess(supabase);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Never cache the anonymous path. A session may be restored shortly after
  // hydration or a focus/refresh event, and we do not want to pin a stale
  // "no user" result in memory.
  if (!session?.access_token) {
    return loadCurrentUserAccess(supabase);
  }

  const cacheKey = getAccessCacheKey(session?.access_token);

  const cached = browserAccessCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  const promise = loadCurrentUserAccess(supabase).catch((error) => {
    browserAccessCache.delete(cacheKey);
    throw error;
  });

  browserAccessCache.set(cacheKey, {
    promise,
    expiresAt: Date.now() + ACCESS_CACHE_TTL_MS,
  });

  return promise;
}
