"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Compass,
  Globe,
  Loader2,
  MapPin,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";

type ProfileTheme = {
  primaryColor?: string;
  accentColor?: string;
};

type ProfileCard = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  tagline: string | null;
  bio: string | null;
  pronouns: string | null;
  location: string | null;
  website_url: string | null;
  specialties: string[] | null;
  status_message: string | null;
  visibility: string | null;
  profile_completeness: number | null;
  theme: ProfileTheme | null;
  created_at: string;
  updated_at: string;
};

type SortMode = "discover" | "top" | "new" | "alpha";
type FilterMode = "all" | "avatar" | "bio" | "complete";

const PAGE_SIZE = 24;
const PROFILES_CACHE_TTL_MS = 15_000;

const PROFILE_COLUMNS =
  "id, username, display_name, avatar_url, banner_url, tagline, bio, pronouns, location, website_url, specialties, status_message, visibility, profile_completeness, theme, created_at, updated_at";

type ProfilesCacheEntry = {
  expiresAt: number;
  profiles: ProfileCard[];
  totalCount: number;
  hasMore: boolean;
};

const profilesHubCache = new Map<string, ProfilesCacheEntry>();

const SORT_OPTIONS: Array<{
  value: SortMode;
  label: string;
  shortLabel: string;
  icon: typeof Compass;
}> = [
  {
    value: "discover",
    label: "Discover",
    shortLabel: "Discover",
    icon: Compass,
  },
  {
    value: "top",
    label: "Top profiles",
    shortLabel: "Top",
    icon: Star,
  },
  {
    value: "new",
    label: "New faces",
    shortLabel: "Newest",
    icon: Sparkles,
  },
  {
    value: "alpha",
    label: "A–Z",
    shortLabel: "A–Z",
    icon: SlidersHorizontal,
  },
];

const FILTER_OPTIONS: Array<{
  value: FilterMode;
  label: string;
}> = [
  { value: "all", label: "All creators" },
  { value: "avatar", label: "With avatar" },
  { value: "bio", label: "With bio" },
  { value: "complete", label: "Complete profiles" },
];

function safeHexColor(value: unknown, fallback: string) {
  const raw = String(value || "").trim();

  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    return raw;
  }

  return fallback;
}

function hexToRgba(hex: string, alpha: number) {
  const safe = hex.replace("#", "");
  const red = Number.parseInt(safe.slice(0, 2), 16);
  const green = Number.parseInt(safe.slice(2, 4), 16);
  const blue = Number.parseInt(safe.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getProfileColors(profile: ProfileCard) {
  return {
    primary: safeHexColor(profile.theme?.primaryColor, "#7c3aed"),
    accent: safeHexColor(profile.theme?.accentColor, "#a78bfa"),
  };
}

function getDisplayName(profile: ProfileCard) {
  return profile.display_name || profile.username || "Unnamed creator";
}

function getInitials(profile: ProfileCard) {
  return getDisplayName(profile)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatJoinedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Joined recently";
  }

  return `Joined ${date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })}`;
}

function normalizeCompleteness(value: number | null) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Number(value)));
}

function sanitizeSearchTerm(value: string) {
  /*
   * .or() uses PostgREST filter syntax. Keep normal name/search characters,
   * but remove syntax characters that can alter the filter expression.
   */
  return value
    .trim()
    .replace(/[,%_().\\"]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function ProfileResultCard({ profile }: { profile: ProfileCard }) {
  const handle = profile.username || profile.id;
  const displayName = getDisplayName(profile);
  const completeness = normalizeCompleteness(profile.profile_completeness);
  const colors = getProfileColors(profile);
  const bio = profile.bio ? stripMarkdownToText(profile.bio) : "";
  const specialties = (profile.specialties || []).filter(Boolean);
  const visibleSpecialties = specialties.slice(0, 3);
  const remainingSpecialties = Math.max(0, specialties.length - 3);

  return (
    <Link href={`/profile/${handle}`} className="group block h-full">
      <article
        className={cn(
          "relative isolate flex h-full flex-col overflow-hidden rounded-[1.6rem]",
          "border border-border/60 bg-card shadow-sm",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-black/5",
          "dark:hover:shadow-primary/5",
        )}
      >
        <div
          className="relative h-28 overflow-hidden border-b border-border/40"
          style={
            profile.banner_url
              ? {
                  backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.02), rgba(0,0,0,0.28)), url("${profile.banner_url}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {
                  background: `
                    radial-gradient(circle at 12% 0%, ${hexToRgba(colors.primary, 0.42)}, transparent 50%),
                    radial-gradient(circle at 88% 100%, ${hexToRgba(colors.accent, 0.3)}, transparent 48%),
                    linear-gradient(135deg, ${hexToRgba(colors.primary, 0.1)}, ${hexToRgba(colors.accent, 0.06)})
                  `,
                }
          }
        >
          {!profile.banner_url && (
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
          )}

          {profile.status_message && (
            <div className="absolute right-3 top-3 inline-flex max-w-[72%] items-center gap-1.5 rounded-full border border-white/15 bg-background/90 px-2.5 py-1 text-[10px] text-foreground/85 shadow-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span className="min-w-0 truncate whitespace-nowrap">
                {profile.status_message}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col px-5 pb-5 pt-0">
          <div className="-mt-8 flex items-end justify-between gap-3">
            <Avatar
              className="h-16 w-16 border-[3px] border-card shadow-md transition-transform duration-300 group-hover:scale-[1.03]"
              style={{
                boxShadow: `0 8px 24px ${hexToRgba(colors.primary, 0.14)}`,
              }}
            >
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-base font-semibold">
                {getInitials(profile) || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-border/55 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              {completeness}%
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="line-clamp-1 text-lg font-semibold tracking-tight">
                  {displayName}
                </h3>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  @{handle}
                </p>
              </div>

              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>

            {profile.tagline && (
              <p className="mt-3.5 line-clamp-2 text-sm leading-5 text-foreground/85">
                {profile.tagline}
              </p>
            )}
          </div>

          <div className="mt-4 mb-4 flex flex-wrap gap-1.5">
            {profile.pronouns && (
              <Badge variant="secondary" className="rounded-full font-normal">
                {profile.pronouns}
              </Badge>
            )}

            {profile.location && (
              <Badge
                variant="outline"
                className="max-w-full gap-1 rounded-full font-normal"
              >
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{profile.location}</span>
              </Badge>
            )}

            {profile.website_url && (
              <Badge
                variant="outline"
                className="gap-1 rounded-full font-normal"
              >
                <Globe className="h-3 w-3" />
                Website
              </Badge>
            )}
          </div>

          {bio && (
            <p className="mb-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {bio}
            </p>
          )}

          {visibleSpecialties.length > 0 && (
            <div className={cn("mb-5 flex flex-wrap gap-1.5", !bio && "mt-1")}>
              {visibleSpecialties.map((specialty) => (
                <span
                  key={specialty}
                  className="rounded-full border border-border/55 bg-muted/25 px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                >
                  {specialty}
                </span>
              ))}

              {remainingSpecialties > 0 && (
                <span className="rounded-full border border-border/55 bg-muted/25 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                  +{remainingSpecialties}
                </span>
              )}
            </div>
          )}

          {!profile.tagline &&
            !profile.pronouns &&
            !profile.location &&
            !profile.website_url &&
            !bio &&
            visibleSpecialties.length === 0 && (
              <div className="min-h-5 flex-1" />
            )}

          <div className="mt-auto border-t border-border/45 pt-4">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {formatJoinedDate(profile.created_at)}
                </span>
              </span>

              <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                View profile
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[1.6rem] border border-border/60 bg-card">
      <div className="h-28 bg-muted/50" />
      <div className="px-5 pb-5">
        <div className="-mt-8 h-16 w-16 rounded-full border-[3px] border-card bg-muted" />
        <div className="mt-5 h-5 w-2/3 rounded bg-muted" />
        <div className="mt-2 h-3.5 w-1/3 rounded bg-muted/70" />
        <div className="mt-5 h-4 w-full rounded bg-muted/70" />
        <div className="mt-2 h-4 w-4/5 rounded bg-muted/60" />
        <div className="mt-6 h-px bg-border/50" />
        <div className="mt-4 h-3.5 w-2/5 rounded bg-muted/60" />
      </div>
    </div>
  );
}

export function ProfilesHub() {
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("discover");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);

  const profilesLengthRef = useRef(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    profilesLengthRef.current = profiles.length;
  }, [profiles.length]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const supabase = createClient();
        const access = await getCurrentUserAccess(supabase);

        if (!mounted) return;

        setCurrentUserId(access.user?.id ?? null);
      } catch {
        if (!mounted) return;

        setCurrentUserId(null);
      } finally {
        if (!mounted) return;

        setAuthResolved(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const loadProfiles = useCallback(
    async (replace = false) => {
      const requestId = ++requestIdRef.current;
      const offset = replace ? 0 : profilesLengthRef.current;

      const cleanSearch = sanitizeSearchTerm(search);

      const cacheKey = [
        currentUserId || "anonymous",
        cleanSearch.toLowerCase(),
        sortMode,
        filterMode,
        String(offset),
        String(PAGE_SIZE),
      ].join("|");

      const cached = profilesHubCache.get(cacheKey);

      if (cached && cached.expiresAt > Date.now()) {
        setTotalCount(cached.totalCount);
        setProfiles((current) =>
          replace ? cached.profiles : [...current, ...cached.profiles],
        );
        setHasMore(cached.hasMore);
        setLoadingInitial(false);
        setLoadingMore(false);
        return;
      }

      if (replace) {
        setLoadingInitial(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const supabase = createClient();

        let query: any = supabase
          .from("profiles")
          .select(PROFILE_COLUMNS, { count: "exact" })
          .not("username", "is", null)
          /*
           * The discovery hub is intentionally public-only.
           * Followers-only profiles can still be visited through their normal
           * visibility rules, but they are not advertised in global discovery.
           */
          .eq("visibility", "public");

        if (currentUserId) {
          query = query.neq("id", currentUserId);
        }

        if (cleanSearch) {
          query = query.or(
            [
              `display_name.ilike.%${cleanSearch}%`,
              `username.ilike.%${cleanSearch}%`,
              `tagline.ilike.%${cleanSearch}%`,
              `location.ilike.%${cleanSearch}%`,
            ].join(","),
          );
        }

        if (filterMode === "avatar") {
          query = query.not("avatar_url", "is", null);
        }

        if (filterMode === "bio") {
          query = query.neq("bio", "");
        }

        if (filterMode === "complete") {
          query = query
            .not("avatar_url", "is", null)
            .neq("bio", "")
            .gte("profile_completeness", 70);
        }

        if (sortMode === "top") {
          query = query
            .order("profile_completeness", { ascending: false })
            .order("updated_at", { ascending: false });
        } else if (sortMode === "new") {
          query = query.order("created_at", { ascending: false });
        } else if (sortMode === "alpha") {
          query = query
            .order("display_name", {
              ascending: true,
              nullsFirst: false,
            })
            .order("username", { ascending: true });
        } else {
          /*
           * Discover should feel different from Top: recently active profiles
           * get priority, then completeness breaks ties.
           */
          query = query
            .order("updated_at", { ascending: false })
            .order("profile_completeness", { ascending: false });
        }

        query = query.range(offset, offset + PAGE_SIZE - 1);

        const { data, error: queryError, count } = await query;

        if (requestId !== requestIdRef.current) return;
        if (queryError) throw queryError;

        const nextProfiles = ((data || []) as ProfileCard[]).filter((profile) =>
          Boolean(profile.username),
        );

        const total = count || 0;
        const nextHasMore = offset + nextProfiles.length < total;

        profilesHubCache.set(cacheKey, {
          expiresAt: Date.now() + PROFILES_CACHE_TTL_MS,
          profiles: nextProfiles,
          totalCount: total,
          hasMore: nextHasMore,
        });

        setTotalCount(total);
        setProfiles((current) =>
          replace ? nextProfiles : [...current, ...nextProfiles],
        );
        setHasMore(nextHasMore);
      } catch (fetchError: any) {
        if (requestId !== requestIdRef.current) return;

        console.error("Failed to load Profiles hub:", fetchError);

        setError(fetchError.message || "Failed to load creator profiles");
        setHasMore(false);

        if (replace) {
          setProfiles([]);
        }
      } finally {
        if (requestId !== requestIdRef.current) return;

        setLoadingInitial(false);
        setLoadingMore(false);
      }
    },
    [currentUserId, filterMode, search, sortMode],
  );

  useEffect(() => {
    if (!authResolved) return;

    setProfiles([]);
    setHasMore(true);
    setTotalCount(0);

    void loadProfiles(true);
  }, [authResolved, loadProfiles]);

  const activeSort =
    SORT_OPTIONS.find((option) => option.value === sortMode) || SORT_OPTIONS[0];

  const constellationProfiles = profiles.slice(0, 4);

  const hasActiveControls =
    Boolean(search.trim()) || sortMode !== "discover" || filterMode !== "all";

  const resetControls = () => {
    setSearch("");
    setSortMode("discover");
    setFilterMode("all");
  };

  return (
    <div className="relative min-h-full px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="relative mx-auto max-w-7xl space-y-7">
        <section className="profiles-hero group/people-hero rounded-[2rem] border border-border/65 shadow-xl shadow-black/5 dark:shadow-primary/5">
          <div className="profiles-hero-grid hidden lg:block" />
          <div className="profiles-orb profiles-orb-a hidden sm:block" />
          <div className="profiles-orb profiles-orb-b hidden lg:block" />

          <div className="relative z-10 grid min-h-[28rem] items-center gap-10 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] lg:px-12 lg:py-12 xl:gap-14">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary shadow-sm">
                <UsersRound className="h-3.5 w-3.5" />
                People
              </div>

              <h1 className="mt-5 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.02]">
                Meet the people behind
                <span className="text-primary"> Forgeworks.</span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                Discover public creator profiles, explore what they make, and
                find new people across the community.
              </p>

              <div className="profiles-search-shell relative mt-8 w-full max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search creators, taglines, locations..."
                  className="profiles-search-input h-12 w-full pl-11 pr-14"
                />

                <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-muted/45 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  /
                </kbd>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="profiles-stat-pill inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
                  <UsersRound className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {totalCount} creator{totalCount === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="profiles-stat-pill inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
                  <Compass className="h-3.5 w-3.5 text-primary" />
                  <span>{activeSort.label}</span>
                </div>

                {filterMode !== "all" && (
                  <div className="profiles-stat-pill inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-xs text-primary">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>
                      {
                        FILTER_OPTIONS.find(
                          (option) => option.value === filterMode,
                        )?.label
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="profiles-constellation relative mx-auto h-[22rem] w-full max-w-[27rem]">
                <div className="profiles-constellation-glow" />

                <svg
                  aria-hidden="true"
                  viewBox="0 0 430 340"
                  className="profiles-constellation-lines absolute inset-0 h-full w-full"
                >
                  <path d="M82 82 C140 104 168 124 215 170" />
                  <path d="M348 84 C292 106 263 128 215 170" />
                  <path d="M92 272 C145 246 170 219 215 170" />
                  <path d="M342 270 C291 245 262 218 215 170" />
                  <path
                    d="M82 82 C154 54 277 54 348 84"
                    className="profiles-constellation-line-soft"
                  />
                  <path
                    d="M92 272 C158 299 277 298 342 270"
                    className="profiles-constellation-line-soft"
                  />
                </svg>

                <div className="profiles-constellation-center">
                  <div className="profiles-constellation-core">
                    <UsersRound className="h-5 w-5" />
                  </div>

                  <div className="mt-3 text-center">
                    <p className="text-xs font-semibold">Creator network</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {totalCount} public profiles
                    </p>
                  </div>
                </div>

                {constellationProfiles.map((profile, index) => {
                  const colors = getProfileColors(profile);

                  const nodes = [
                    {
                      className: "left-[1%] top-[8%]",
                      size: "h-[4.5rem] w-[4.5rem]",
                      reverse: false,
                    },
                    {
                      className: "right-[0%] top-[9%]",
                      size: "h-[4.15rem] w-[4.15rem]",
                      reverse: true,
                    },
                    {
                      className: "left-[4%] bottom-[5%]",
                      size: "h-[4rem] w-[4rem]",
                      reverse: false,
                    },
                    {
                      className: "right-[1%] bottom-[6%]",
                      size: "h-[4.25rem] w-[4.25rem]",
                      reverse: true,
                    },
                  ];

                  const node = nodes[index] || nodes[0];

                  return (
                    <Link
                      key={profile.id}
                      href={`/profile/${profile.username || profile.id}`}
                      className={cn(
                        "profiles-constellation-node group/node pointer-events-auto absolute",
                        node.className,
                        node.reverse && "flex-row-reverse",
                      )}
                      style={{
                        ["--profile-primary" as string]: colors.primary,
                        ["--profile-accent" as string]: colors.accent,
                      }}
                      aria-label={`Open ${getDisplayName(profile)} profile`}
                    >
                      <div
                        className={cn(
                          "profiles-constellation-avatar",
                          node.size,
                        )}
                      >
                        <Avatar className="h-full w-full">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs font-semibold">
                            {getInitials(profile) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div
                        className={cn(
                          "profiles-constellation-label",
                          node.reverse ? "text-right" : "text-left",
                        )}
                      >
                        <p className="max-w-28 truncate text-[11px] font-semibold text-foreground">
                          {getDisplayName(profile)}
                        </p>
                        <p className="max-w-28 truncate text-[9px] text-muted-foreground">
                          @{profile.username || profile.id}
                        </p>
                      </div>
                    </Link>
                  );
                })}

                <div className="profiles-constellation-badge left-1/2 top-[5%] -translate-x-1/2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>Public discovery</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-3 border-t border-border/50 bg-background/20 px-6 py-4 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <div className="flex max-w-2xl items-start gap-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p>
                Public profiles appear here for discovery. Private and
                followers-only profiles stay out of the global directory.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="h-1.5 w-5 rounded-full bg-primary/70" />
              <span className="h-1.5 w-5 rounded-full bg-primary/40" />
              <span className="h-1.5 w-5 rounded-full bg-primary/15" />
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-border/60 bg-card/90 p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
                <SlidersHorizontal className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold">Explore creators</p>
                <p className="truncate text-xs text-muted-foreground">
                  Tune the list without leaving discovery.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-border/55 bg-background/75 p-1 shadow-inner shadow-black/[0.02]">
                {SORT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = sortMode === option.value;

                  return (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={active ? "secondary" : "ghost"}
                      data-state={active ? "on" : "off"}
                      className={cn(
                        "h-8 shrink-0 cursor-pointer rounded-full px-3 text-xs",
                        active && "cursor-default shadow-sm",
                      )}
                      onClick={() => setSortMode(option.value)}
                    >
                      <Icon className="mr-1.5 h-3.5 w-3.5" />
                      {option.shortLabel}
                    </Button>
                  );
                })}
              </div>

              <div className="flex max-w-full gap-1 overflow-x-auto">
                {FILTER_OPTIONS.map((option) => {
                  const active = filterMode === option.value;

                  return (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={active ? "outline" : "ghost"}
                      data-state={active ? "on" : "off"}
                      className={cn(
                        "h-8 shrink-0 cursor-pointer rounded-full px-3 text-xs",
                        active &&
                          "cursor-default border-primary/25 bg-primary/[0.05] text-primary",
                      )}
                      onClick={() => setFilterMode(option.value)}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>

              {hasActiveControls && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 shrink-0 cursor-pointer rounded-full text-xs text-muted-foreground"
                  onClick={resetControls}
                >
                  <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Profiles
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                {search.trim()
                  ? `Results for “${search.trim()}”`
                  : "Meet the community"}
              </h2>
            </div>

            {!loadingInitial && !error && (
              <p className="text-xs text-muted-foreground">
                Showing {profiles.length} of {totalCount}
              </p>
            )}
          </div>

          {loadingInitial ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <ProfileSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[1.75rem] border border-destructive/20 bg-destructive/[0.03] p-8 text-center">
              <p className="text-sm font-medium">
                We couldn&apos;t load creator profiles.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-5 cursor-pointer rounded-full"
                onClick={() => void loadProfiles(true)}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </div>
          ) : profiles.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-border/65 bg-card/45 px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Compass className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">
                No creators match this view.
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Try a broader search or clear the current filters to keep
                exploring.
              </p>

              {hasActiveControls && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 cursor-pointer rounded-full"
                  onClick={resetControls}
                >
                  Reset discovery
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {profiles.map((profile) => (
                  <ProfileResultCard key={profile.id} profile={profile} />
                ))}
              </div>

              <div className="flex flex-col items-center gap-3 py-7">
                {hasMore ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={loadingMore}
                    className="min-w-48 cursor-pointer rounded-full bg-background shadow-sm"
                    onClick={() => void loadProfiles(false)}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading creators...
                      </>
                    ) : (
                      <>
                        Load more creators
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/55 bg-card/55 px-4 py-2 text-xs text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                    You&apos;ve reached the end of this view.
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
