// ============================================================================
// JanitorForge - Profile Page
// Full-page profile view with edit capability
// ============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotDetailModal } from "@/features/bots/components/bot-detail-modal";
import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";
import { normalizeHttpUrl } from "@/lib/safe-url";
import {
  getProfileSocialHref,
  getProfileSocialLabel,
} from "@/features/profile/lib/profile-socials";
import {
  Pencil,
  MapPin,
  Globe,
  Calendar,
  ExternalLink,
  Copy,
  Ellipsis,
  Share2,
  Star,
  Bot,
  AppWindow,
  FileText,
  UserRound,
} from "lucide-react";
import {
  TwitterIcon,
  DiscordIcon,
  GithubIcon,
  TiktokIcon,
  YoutubeIcon,
  TwitchIcon,
  WebsiteIcon,
  JanitorAIIcon,
} from "@/components/ui/social-icons";
import {
  getOwnProfile,
  getFollowCounts,
} from "@/features/profile/actions/profile";
import { useStore } from "@/features/app-shell/store/app-store";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cachedBrowserRequest } from "@/lib/browser-request-cache";
import { ProfileEditor } from "./profile-editor";
import { FollowListModal } from "./follow-list-modal";
import { ProfileBadgesSection } from "./profile-badges";
import { ProfileCompletenessCard } from "./profile-completeness";
import { ProfileSectionEmpty } from "./profile-section-empty";
import {
  ProfileBotGridCard,
  ProfileFeaturedBotListCard,
} from "./profile-bot-cards";
import { cn } from "@/lib/utils";
import type { BotPreview } from "@/features/creator-pages/types/creator-page-types";
import type { ProfileBadgeRecord } from "@/features/profile/lib/profile-badges";
import {
  getProfileBackgroundTintColor,
  getProfileBackgroundStyles,
  getProfileBorderTintColor,
  getProfileCardClass,
  getProfileFontStyle,
  getProfileGridClass,
  getReadableProfileAccentColor,
  getReadableProfileMutedAccentColor,
  resolveProfileTheme,
} from "@/features/profile/lib/profile-theme";
import {
  applyProfileSectionSelection,
  getOrderedProfileSectionIds,
  getProfileSection,
  resolveProfileSections,
  getProfileSectionEmptyCopy,
  type ProfileSectionBotRow,
  type ProfileSectionCreatorPageRow,
  type ProfileSectionFormRow,
  type ProfileSectionRow,
  type ProfileSectionWorldRow,
} from "@/features/profile/lib/profile-sections";

const PROFILE_BOTS_PAGE_SIZE = 15;

const socialIconMap: Record<
  string,
  React.FC<{ className?: string; size?: number }>
> = {
  janitorai: JanitorAIIcon,
  twitter: TwitterIcon,
  discord: DiscordIcon,
  github: GithubIcon,
  tiktok: TiktokIcon,
  youtube: YoutubeIcon,
  twitch: TwitchIcon,
  website: WebsiteIcon,
};

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  tagline: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  slug: string | null;
  theme: Record<string, unknown> | null;
  profile_sections?: ProfileSectionRow[] | null;
  profile_section_bots?: ProfileSectionBotRow[] | null;
  profile_section_forms?: ProfileSectionFormRow[] | null;
  profile_section_creator_pages?: ProfileSectionCreatorPageRow[] | null;
  profile_section_worlds?: ProfileSectionWorldRow[] | null;
  created_at: string;
  pronouns?: string | null;
  location?: string | null;
  website_url?: string | null;
  specialties?: string[] | null;
  status_message?: string | null;
  social_links?: Record<string, string> | null;
  profile_badges?: ProfileBadgeRecord[] | null;
  profile_completeness?: number | null;
  active_profile_featured_bots?: Array<{
    sort_order: number;
    bot: BotPreview;
  }> | null;
}

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    type: "bot" | "world";
    data: any;
  } | null>(null);
  const [botDetailBot, setBotDetailBot] = useState<any>(null);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<
    "followers" | "following"
  >("followers");
  const [botsPage, setBotsPage] = useState(0);
  const [followCounts, setFollowCounts] = useState({
    followers: 0,
    following: 0,
  });
  const { bots, forms } = useStore();
  const [creatorPages, setCreatorPages] = useState<
    Array<{
      id: string;
      title: string;
      slug: string;
      description: string;
      is_published: boolean;
    }>
  >([]);
  const [worlds, setWorlds] = useState<
    Array<{
      id: string;
      title: string;
      slug: string;
      kind: string;
      description: string;
      world_bot_links?: { bot_id: string }[];
    }>
  >([]);

  const loadProfile = useCallback(async (force = false) => {
    setLoading(true);

    try {
      const fetchProfileData = async () => {
        const ownProfileResult = await getOwnProfile();

        if (!ownProfileResult.success || !ownProfileResult.profile) {
          return null;
        }

        const counts = await getFollowCounts(ownProfileResult.profile.id);

        const supabase = createClient();

        const [
          { data: pages, error: pagesError },
          { data: worldRows, error: worldsError },
        ] = await Promise.all([
          supabase
            .from("active_creator_pages")
            .select("id, title, slug, description, is_published")
            .eq("user_id", ownProfileResult.profile.id)
            .order("updated_at", { ascending: false }),

          supabase
            .from("atlas_worlds")
            .select("id, title, slug, description")
            .eq("user_id", ownProfileResult.profile.id)
            .order("updated_at", { ascending: false }),
        ]);

        if (pagesError) throw pagesError;
        if (worldsError) throw worldsError;

        const worldIds = (worldRows || []).map((world: any) => world.id);

        let worldBotRows: Array<{
          world_id: string;
          bot_id: string;
        }> = [];

        if (worldIds.length > 0) {
          const { data, error } = await supabase
            .from("atlas_world_bots")
            .select("world_id, bot_id")
            .in("world_id", worldIds);

          if (error) throw error;

          worldBotRows = (data || []) as Array<{
            world_id: string;
            bot_id: string;
          }>;
        }

        const worldBotsByWorldId = new Map<string, Array<{ bot_id: string }>>();

        for (const row of worldBotRows) {
          const existing = worldBotsByWorldId.get(row.world_id) || [];
          existing.push({ bot_id: row.bot_id });
          worldBotsByWorldId.set(row.world_id, existing);
        }

        const normalizedWorlds = (worldRows || []).map((world: any) => ({
          ...world,
          world_bot_links: worldBotsByWorldId.get(world.id) || [],
        }));

        return {
          profile: ownProfileResult.profile,
          counts,
          pages: (pages || []) as typeof creatorPages,
          worlds: normalizedWorlds as typeof worlds,
        };
      };

      const result = force
        ? await fetchProfileData()
        : await cachedBrowserRequest("profile:own", 15_000, fetchProfileData);

      if (result) {
        setProfile(result.profile);
        setFollowCounts(result.counts);
        setCreatorPages(result.pages);
        setWorlds(result.worlds);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <p className="text-sm">Failed to load profile.</p>
        </div>
      </div>
    );
  }

  const p = profile;

  const publicProfileHandle = p.slug || p.username;
  const publicProfilePath = publicProfileHandle
    ? `/profile/${publicProfileHandle}`
    : null;

  const resolvedTheme = resolveProfileTheme(p.theme || {});
  const resolvedSections = resolveProfileSections(
    p.profile_sections,
    p.theme || {},
  );

  const featuredBotsSection = getProfileSection(
    resolvedSections,
    "featured_bots",
  );

  const botsSection = getProfileSection(resolvedSections, "bots");

  const creatorPagesSection = getProfileSection(
    resolvedSections,
    "creator_pages",
  );

  const worldsSection = getProfileSection(resolvedSections, "worlds");

  const formsSection = getProfileSection(resolvedSections, "forms");
  const selectedBotIds = getOrderedProfileSectionIds(
    p.profile_section_bots,
    (row) => row.bot_id,
    (row) => row.sort_order,
  );

  const selectedCreatorPageIds = getOrderedProfileSectionIds(
    p.profile_section_creator_pages,
    (row) => row.creator_page_id,
    (row) => row.sort_order,
  );

  const selectedWorldIds = getOrderedProfileSectionIds(
    p.profile_section_worlds,
    (row) => row.world_id,
    (row) => row.sort_order,
  );

  const selectedFormIds = getOrderedProfileSectionIds(
    p.profile_section_forms,
    (row) => row.form_id,
    (row) => row.sort_order,
  );

  const ownForms = forms.filter((form) => form.ownerId === p.id);

  const ownBots = bots.filter((bot) => bot.ownerId === p.id);

  const profileBots = applyProfileSectionSelection(
    ownBots,
    botsSection,
    selectedBotIds,
  );

  const profileCreatorPages = applyProfileSectionSelection(
    creatorPages,
    creatorPagesSection,
    selectedCreatorPageIds,
  );

  const profileWorlds = applyProfileSectionSelection(
    worlds,
    worldsSection,
    selectedWorldIds,
  );

  const profileForms = applyProfileSectionSelection(
    ownForms,
    formsSection,
    selectedFormIds,
  );

  const totalBotPages = Math.max(
    1,
    Math.ceil(profileBots.length / PROFILE_BOTS_PAGE_SIZE),
  );

  const safeBotsPage = Math.min(botsPage, totalBotPages - 1);

  const paginatedBots = profileBots.slice(
    safeBotsPage * PROFILE_BOTS_PAGE_SIZE,
    (safeBotsPage + 1) * PROFILE_BOTS_PAGE_SIZE,
  );

  const botsRangeStart =
    profileBots.length === 0 ? 0 : safeBotsPage * PROFILE_BOTS_PAGE_SIZE + 1;

  const botsRangeEnd = Math.min(
    (safeBotsPage + 1) * PROFILE_BOTS_PAGE_SIZE,
    profileBots.length,
  );
  const {
    primaryColor,
    accentColor,
    avatarBorderColor,
    cardStyle,
    layout,
    showBadges,
    hideCompletenessNudge,
  } = resolvedTheme;
  const readablePrimaryColor = getReadableProfileAccentColor(primaryColor);
  const readableAccentColor = getReadableProfileAccentColor(
    accentColor,
    "medium",
  );
  const featuredBotsEmpty = getProfileSectionEmptyCopy(
    featuredBotsSection,
    "owner",
  );

  const botsEmpty = getProfileSectionEmptyCopy(botsSection, "owner");

  const creatorPagesEmpty = getProfileSectionEmptyCopy(
    creatorPagesSection,
    "owner",
  );

  const worldsEmpty = getProfileSectionEmptyCopy(worldsSection, "owner");

  const formsEmpty = getProfileSectionEmptyCopy(formsSection, "owner");
  const readablePrimaryMutedColor =
    getReadableProfileMutedAccentColor(primaryColor);
  const accentBorderTint = getProfileBorderTintColor(accentColor, 30);
  const accentSoftTint = getProfileBackgroundTintColor(accentColor, 18);
  const primarySoftTint = getProfileBackgroundTintColor(primaryColor, 10);
  const profileBackground = getProfileBackgroundStyles(
    resolvedTheme.profileBackground,
    primaryColor,
    accentColor,
  );
  const profileFontStyle = getProfileFontStyle(resolvedTheme.fontFamily);
  const collectionGridClass = getProfileGridClass(layout);
  const cardClass = getProfileCardClass(cardStyle);
  const sectionCardStyle =
    cardStyle !== "minimal"
      ? ({ borderColor: accentBorderTint } as const)
      : undefined;

  const socialLinks = p.social_links || {};
  const safeWebsiteUrl =
    typeof p.website_url === "string" ? normalizeHttpUrl(p.website_url) : null;
  const badges = p.profile_badges || [];
  const specialtiesList = p.specialties || [];
  const completeness = (p.profile_completeness as number) || 0;
  const featuredBots = (profile.active_profile_featured_bots || [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((relation: any) => {
      const rawBot = relation.bot;
      if (!rawBot) return null;

      // 1. Evaluate the privacy flag
      const isHidden = rawBot.hide_sensitive_fields === true;

      // 2. Map snake_case to camelCase and enforce privacy masking
      return {
        ...rawBot, // Keep raw properties just in case, but override specific ones
        id: rawBot.id,
        name: rawBot.name,
        rating: rawBot.rating,
        tags: rawBot.tags || [],

        // Fix the image rendering issue
        imageUrl: rawBot.image_url,

        // Enforce the hide_sensitive_fields rule
        personality: isHidden ? "" : rawBot.personality,
        firstMessage: isHidden
          ? ""
          : rawBot.firstMessage || rawBot.first_message,
        scenario: isHidden ? "" : rawBot.scenario,
        exampleDialogues: isHidden
          ? ""
          : rawBot.exampleDialogues || rawBot.example_dialogues,

        alternateGreetings: isHidden
          ? []
          : Array.isArray(rawBot.alternateGreetings)
            ? rawBot.alternateGreetings
            : Array.isArray(rawBot.alternate_greetings)
              ? rawBot.alternate_greetings
              : [],

        alternate_greetings: isHidden
          ? []
          : Array.isArray(rawBot.alternate_greetings)
            ? rawBot.alternate_greetings
            : [],

        // Ensure the frontend flag matches the DB flag
        hideSensitiveFields: isHidden,
      };
    })
    .filter(Boolean);

  const hasSocialLinks = Object.values(socialLinks).some((v) => v && v.trim());

  const handleCopyPublicProfileLink = async () => {
    if (!publicProfilePath) {
      toast.error("Your public profile link is not available yet.");
      return;
    }

    const publicProfileUrl = `${window.location.origin}${publicProfilePath}`;

    try {
      await navigator.clipboard.writeText(publicProfileUrl);
      toast.success("Profile link copied!");
    } catch {
      toast.error("Could not copy your profile link.");
    }
  };

  const handleSharePublicProfile = async () => {
    if (!publicProfilePath) {
      toast.error("Your public profile link is not available yet.");
      return;
    }

    const publicProfileUrl = `${window.location.origin}${publicProfilePath}`;
    const profileName =
      p.display_name || p.slug || p.username || "JanitorForge profile";

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profileName} on JanitorForge`,
          text: `Check out ${profileName}'s profile on JanitorForge.`,
          url: publicProfileUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    await handleCopyPublicProfileLink();
  };

  return (
    <ScrollArea className="h-screen w-full overflow-hidden">
      <div
        className={cn(
          "p-4 sm:p-6 md:p-8 lg:p-10 space-y-6",
          profileBackground.className,
        )}
        style={{ ...profileBackground.style, ...profileFontStyle }}
      >
        {/* Main Profile Card */}
        <Card
          className="overflow-hidden"
          style={{ borderColor: accentBorderTint }}
        >
          {/* Banner */}
          <div
            className="relative aspect-[4/1] w-full"
            style={{
              background: p.banner_url
                ? `url(${p.banner_url}) center/cover no-repeat`
                : `linear-gradient(135deg, ${primaryColor}88, ${primaryColor}22)`,
            }}
          >
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="cursor-pointer bg-background/80 backdrop-blur-sm"
                onClick={() => setEditorOpen(true)}
              >
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit Profile
              </Button>

              {publicProfilePath && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 cursor-pointer bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
                      aria-label="Profile actions"
                    >
                      <Ellipsis className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      onClick={() => void handleSharePublicProfile()}
                      className="cursor-pointer"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Profile
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => void handleCopyPublicProfileLink()}
                      className="cursor-pointer"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Profile Link
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link
                        href={publicProfilePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Public Profile
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <CardContent className="px-4 sm:px-6 pb-6 -mt-12 relative z-10">
            {/* Avatar */}
            <div
              className="h-24 w-24 rounded-full border-4 overflow-hidden shadow-lg mb-4"
              style={{ borderColor: avatarBorderColor }}
            >
              {p.avatar_url ? (
                <img
                  src={p.avatar_url as string}
                  alt={(p.display_name as string) || "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="h-full w-full flex items-center justify-center"
                  style={{ backgroundColor: primarySoftTint }}
                >
                  <UserRound
                    className="h-10 w-10"
                    style={{ color: readablePrimaryColor }}
                  />
                </div>
              )}
            </div>

            {/* Name & Handle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">
                    {String(p.display_name || "Unnamed Creator")}
                  </h1>
                  {typeof p.pronouns === "string" && p.pronouns !== "none" && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {p.pronouns}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  @{String(p.slug || p.username || "unknown")}
                </p>
                {typeof p.status_message === "string" && (
                  <p className="text-sm mt-1 italic text-muted-foreground">
                    &ldquo;{p.status_message}&rdquo;
                  </p>
                )}
              </div>

              {/* Follow counts — clickable */}
              <div className="flex items-center gap-5 text-sm">
                <button
                  className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setFollowModalTab("followers");
                    setFollowModalOpen(true);
                  }}
                >
                  <p
                    className="text-lg font-bold"
                    style={{ color: readablePrimaryColor }}
                  >
                    {followCounts.followers}
                  </p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </button>
                <button
                  className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setFollowModalTab("following");
                    setFollowModalOpen(true);
                  }}
                >
                  <p
                    className="text-lg font-bold"
                    style={{ color: readablePrimaryColor }}
                  >
                    {followCounts.following}
                  </p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </button>
                {!hideCompletenessNudge && completeness < 100 && (
                  <div className="text-center">
                    <p
                      className="text-lg font-bold"
                      style={{ color: readablePrimaryColor }}
                    >
                      {completeness}%
                    </p>
                    <p className="text-xs text-muted-foreground">Complete</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tagline */}
            {typeof p.tagline === "string" && p.tagline && (
              <p className="text-sm mt-3">{p.tagline}</p>
            )}

            {/* Bio */}
            {typeof p.bio === "string" && p.bio && (
              <MarkdownRenderer
                content={p.bio}
                className="mt-3 text-sm text-muted-foreground leading-relaxed max-h-75 overflow-y-auto overflow-x-hidden wrap-break-word pr-2"
              />
            )}

            {/* Meta info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-muted-foreground">
              {typeof p.location === "string" && p.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {p.location}
                </span>
              )}
              {safeWebsiteUrl && (
                <a
                  href={safeWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Globe className="h-3 w-3" />
                  {new URL(safeWebsiteUrl).hostname}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
              {typeof p.created_at === "string" && p.created_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined{" "}
                  {new Date(p.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>

            {/* Social Links */}
            {hasSocialLinks && (
              <div className="flex flex-wrap gap-2 mt-4">
                {Object.entries(socialLinks).map(([key, value]) => {
                  if (!value || !value.trim()) return null;
                  const Icon = socialIconMap[key] || Globe;
                  const safeUrl = getProfileSocialHref(key, value);
                  const label = getProfileSocialLabel(key);
                  return safeUrl ? (
                    <a
                      key={key}
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {label}
                      </Badge>
                    </a>
                  ) : (
                    <Badge key={key} variant="outline">
                      <Icon className="h-3 w-3 mr-1" />
                      {value}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Specialties */}
            {specialtiesList.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Specialties
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {specialtiesList.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="text-xs"
                      style={{
                        backgroundColor: accentSoftTint,
                        color: readableAccentColor,
                      }}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Bots */}
            {featuredBotsSection.enabled && (
              <div className="mt-4 min-w-0 max-w-full overflow-hidden">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Featured Bots
                </p>
                {featuredBots.length > 0 ? (
                  <div className="min-w-0 max-w-full space-y-2.5">
                    {featuredBots.map((bot) => (
                      <ProfileFeaturedBotListCard
                        key={bot!.id}
                        bot={bot!}
                        cardStyle={cardStyle}
                        accentColor={accentColor}
                        onClick={() => setBotDetailBot(bot)}
                      />
                    ))}
                  </div>
                ) : (
                  <ProfileSectionEmpty
                    icon={<Star className="h-5 w-5" />}
                    iconColor={primaryColor}
                    title={featuredBotsEmpty.title}
                    description={featuredBotsEmpty.description}
                  />
                )}
              </div>
            )}

            <ProfileBadgesSection
              badges={badges}
              themeColor={primaryColor}
              showBadges={showBadges}
              className="mt-4"
              emptyClassName="rounded-lg border border-dashed bg-card/40 px-5 py-7"
              emptyDescription="Badges will appear here once they are awarded."
            />

            <ProfileCompletenessCard
              profile={p}
              completeness={(p.profile_completeness as number) || 0}
              themeColor={primaryColor}
              hideNudge={hideCompletenessNudge}
              onEdit={() => setEditorOpen(true)}
              className="mt-4"
            />
          </CardContent>
        </Card>

        {/* Follow List Modal */}
        {p.id && (
          <FollowListModal
            open={followModalOpen}
            onOpenChange={setFollowModalOpen}
            userId={p.id as string}
            isOwnProfile
            tab={followModalTab}
            themeColor={primaryColor}
          />
        )}

        {/* ===== Unified Content Sections ===== */}
        {/* Bots */}
        {botsSection.enabled && (
          <div id="profile-bots-section" className="space-y-4 pt-4 sm:pt-6">
            <div className="flex items-center gap-3">
              <Bot
                className="h-5 w-5"
                style={{ color: readablePrimaryColor }}
              />

              <h2 className="text-lg font-semibold">Bots</h2>
              <Badge variant="outline">{profileBots.length}</Badge>
            </div>
            {profileBots.length > 0 ? (
              <>
                <div className={collectionGridClass}>
                  {paginatedBots.map((bot) => (
                    <ProfileBotGridCard
                      key={bot.id}
                      bot={bot}
                      cardStyle={cardStyle}
                      layout={layout}
                      accentColor={accentColor}
                      onClick={() => setBotDetailBot(bot)}
                    />
                  ))}
                </div>

                {totalBotPages > 1 && (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Showing {botsRangeStart}-{botsRangeEnd} of{" "}
                      {profileBots.length} bots
                    </p>

                    <Pagination className="w-auto">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();

                              if (safeBotsPage > 0) {
                                setBotsPage((prev) => prev - 1);

                                document
                                  .getElementById("profile-bots-section")
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                  });
                              }
                            }}
                            className={cn(
                              "cursor-pointer",
                              safeBotsPage === 0 &&
                                "pointer-events-none opacity-50",
                            )}
                          />
                        </PaginationItem>

                        {Array.from(
                          { length: Math.min(totalBotPages, 5) },
                          (_, i) => {
                            const page =
                              totalBotPages <= 5
                                ? i
                                : Math.max(
                                    0,
                                    Math.min(
                                      safeBotsPage - 2,
                                      totalBotPages - 5,
                                    ),
                                  ) + i;

                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  href="#"
                                  isActive={page === safeBotsPage}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setBotsPage(page);

                                    document
                                      .getElementById("profile-bots-section")
                                      ?.scrollIntoView({
                                        behavior: "smooth",
                                      });
                                  }}
                                  className="cursor-pointer"
                                >
                                  {page + 1}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          },
                        )}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();

                              if (safeBotsPage < totalBotPages - 1) {
                                setBotsPage((prev) => prev + 1);

                                document
                                  .getElementById("profile-bots-section")
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                  });
                              }
                            }}
                            className={cn(
                              "cursor-pointer",
                              safeBotsPage >= totalBotPages - 1 &&
                                "pointer-events-none opacity-50",
                            )}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <ProfileSectionEmpty
                icon={<Bot className="h-5 w-5" />}
                iconColor={primaryColor}
                title={botsEmpty.title}
                description={botsEmpty.description}
              />
            )}
            <hr
              className="border-t"
              style={{ borderColor: accentBorderTint }}
            />
          </div>
        )}

        {/* Creator Pages */}
        {creatorPagesSection.enabled && (
          <div className="space-y-4 pt-4 sm:pt-6">
            <div className="flex items-center gap-3">
              <AppWindow
                className="h-5 w-5"
                style={{ color: readablePrimaryColor }}
              />

              <h2 className="text-lg font-semibold">Creator Pages</h2>
              <Badge variant="outline">{profileCreatorPages.length}</Badge>
            </div>
            {profileCreatorPages.length > 0 ? (
              <div
                className={cn(
                  "grid gap-3",
                  profileCreatorPages.length === 1
                    ? "grid-cols-1"
                    : collectionGridClass,
                )}
              >
                {profileCreatorPages.map((page) => {
                  const card = (
                    <div
                      className={cn(
                        cardClass,
                        "h-full",
                        page.is_published && "cursor-pointer",
                        !page.is_published && "cursor-default opacity-80",
                        layout === "list" && "sm:flex sm:flex-col",
                      )}
                      style={sectionCardStyle}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">
                          {page.title || "Untitled"}
                        </p>

                        <Badge
                          variant={page.is_published ? "default" : "secondary"}
                          className="text-[10px] shrink-0"
                        >
                          {page.is_published ? "Live" : "Draft"}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {page.description || "No description"}
                      </p>
                    </div>
                  );

                  return page.is_published ? (
                    <Link
                      key={page.id}
                      href={`/page/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {card}
                    </Link>
                  ) : (
                    <div key={page.id}>{card}</div>
                  );
                })}
              </div>
            ) : (
              <ProfileSectionEmpty
                icon={<AppWindow className="h-5 w-5" />}
                iconColor={primaryColor}
                title={creatorPagesEmpty.title}
                description={creatorPagesEmpty.description}
              />
            )}
            <hr
              className="border-t"
              style={{ borderColor: accentBorderTint }}
            />
          </div>
        )}

        {/* Worlds */}
        {worldsSection.enabled && (
          <div className="space-y-4 pt-4 sm:pt-6">
            <div className="flex items-center gap-3">
              <Globe
                className="h-5 w-5"
                style={{ color: readablePrimaryColor }}
              />

              <h2 className="text-lg font-semibold">Worlds</h2>
              <Badge variant="outline">{profileWorlds.length}</Badge>
            </div>
            {profileWorlds.length > 0 ? (
              <div
                className={cn(
                  "grid gap-3",
                  profileWorlds.length === 1
                    ? "grid-cols-1"
                    : collectionGridClass,
                )}
              >
                {profileWorlds.map((world) => (
                  <div
                    key={world.id}
                    className={cn(cardClass, "cursor-pointer")}
                    style={sectionCardStyle}
                    onClick={() => {
                      setSelectedItem({ type: "world", data: world });
                      setDetailOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        className="text-[10px] capitalize"
                      >
                        World
                      </Badge>
                      <p className="text-sm font-medium truncate">
                        {world.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {world.description || "No description"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {world.world_bot_links?.length || 0} bots
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <ProfileSectionEmpty
                icon={<Globe className="h-5 w-5" />}
                iconColor={primaryColor}
                title={worldsEmpty.title}
                description={worldsEmpty.description}
              />
            )}
            <hr
              className="border-t"
              style={{ borderColor: accentBorderTint }}
            />
          </div>
        )}

        {/* Forms */}
        {formsSection.enabled && (
          <div className="space-y-4 pt-4 sm:pt-6">
            <div className="flex items-center gap-3">
              <FileText
                className="h-5 w-5"
                style={{ color: readablePrimaryColor }}
              />
              <h2 className="text-lg font-semibold">Forms</h2>
              <Badge variant="outline">{profileForms.length}</Badge>
            </div>
            {profileForms.length > 0 ? (
              <div
                className={cn(
                  "grid gap-3",
                  profileForms.length === 1
                    ? "grid-cols-1"
                    : collectionGridClass,
                )}
              >
                {profileForms.map((form) => (
                  <Link
                    href={`/form/${form.shareableLink}`}
                    target="_blank"
                    key={form.id}
                    rel="noopener noreferrer"
                  >
                    <div
                      className={cn(cardClass, "h-full")}
                      style={sectionCardStyle}
                    >
                      <div className="flex min-w-0 items-center gap-2 mb-1">
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <MarkdownRenderer
                            content={form.title}
                            className="text-sm font-medium [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                          />
                        </div>

                        <Badge
                          variant={form.isActive ? "default" : "secondary"}
                          className="text-[10px] shrink-0"
                        >
                          {form.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <MarkdownRenderer
                        content={form.description || "No description"}
                        className="text-xs text-muted-foreground line-clamp-2"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {form.sections.length} sections
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <ProfileSectionEmpty
                icon={<FileText className="h-5 w-5" />}
                iconColor={primaryColor}
                title={formsEmpty.title}
                description={formsEmpty.description}
              />
            )}
          </div>
        )}

        {/* Bot Detail Modal — shared component */}
        <BotDetailModal
          open={!!botDetailBot}
          onOpenChange={(v) => {
            if (!v) setBotDetailBot(null);
          }}
          bot={botDetailBot}
        />

        {/* Detail Modal for Worlds only */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="w-[calc(100%-1rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto">
            {selectedItem?.type === "world" && (
              <>
                <DialogHeader>
                  <DialogTitle>{(selectedItem.data as any).title}</DialogTitle>
                  <DialogDescription>
                    <Badge
                      variant="secondary"
                      className="text-[10px] capitalize"
                    >
                      {(selectedItem.data as any).kind}
                    </Badge>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Description
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {(selectedItem.data as any).description ||
                        "No description"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Bots in this world
                    </p>
                    <p className="text-sm">
                      {(selectedItem.data as any).world_bot_links
                        ?.length || 0}{" "}
                      bots
                    </p>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Editor Dialog */}
        <ProfileEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          onSaved={() => loadProfile(true)}
        />
      </div>
    </ScrollArea>
  );
}
