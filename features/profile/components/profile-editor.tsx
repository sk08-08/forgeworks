// ============================================================================
// JanitorForge - Profile Editor (Tabbed)
// Rich profile customization with General, Social, Appearance, Featured, Privacy
// Fully responsive with improved UX
// ============================================================================

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownField } from "@/features/markdown/components/markdown-field";
import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { IMAGE_PRESETS } from "@/lib/image-presets";
import {
  Share2,
  Palette,
  Star,
  Shield,
  Save,
  Loader2,
  X,
  Plus,
  MapPin,
  Globe,
  Search,
  ArrowUp,
  ArrowDown,
  Check,
  LayoutGrid,
  Rows3,
  PanelTop,
  RotateCcw,
  MessageCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  UsersRound,
  UserRound,
  Upload,
  BotIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PROFILE_SOCIAL_PLATFORMS as socialPlatforms } from "@/features/profile/lib/profile-socials";
import {
  getOwnProfile,
  removeTemporaryProfileAssetAction,
  updateProfile,
  uploadProfileAssetAction,
} from "@/features/profile/actions/profile";
import { useStore } from "@/features/app-shell/store/app-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getProfileBackgroundStyles,
  getProfileCardClass,
  getProfileFontStyle,
  getProfileGridClass,
  resolveProfileTheme,
  type ProfileBackground,
  type ProfileCardStyle,
  type ProfileFontFamily,
  type ProfileLayout,
} from "@/features/profile/lib/profile-theme";
import {
  getOrderedProfileSectionIds,
  getProfileSection,
  resolveProfileSections,
  type ProfileSectionBotRow,
  type ProfileSectionCreatorPageRow,
  type ProfileSectionFormRow,
  type ProfileSectionSelectionMode,
  type ProfileSectionWorldRow,
} from "@/features/profile/lib/profile-sections";
import { CustomColorPicker } from "@/components/ui/custom-color-picker";

// ----------------------------------------------------------------------------
// Types & Constants
// ----------------------------------------------------------------------------

interface ProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void | Promise<void>;
}

const MAX_FEATURED_BOTS = 5;

function normalizeSocialLinksForSnapshot(
  links: Record<string, string> | null | undefined,
) {
  return Object.fromEntries(
    socialPlatforms.map(({ key }) => [key, String(links?.[key] ?? "")]),
  );
}

const accentPresets = [
  { label: "Violet", value: "#7c3aed" },
  { label: "Emerald", value: "#10b981" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Slate", value: "#64748b" },
  { label: "Fuchsia", value: "#d946ef" },
  { label: "Teal", value: "#14b8a6" },
];

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

function ImagePreview({
  url,
  alt,
  fallback,
  aspectRatio = "square",
  className,
}: {
  url: string;
  alt: string;
  fallback: React.ReactNode;
  aspectRatio?: "square" | "banner";
  className?: string;
}) {
  const [error, setError] = useState(false);

  if (!url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted border-2 border-dashed border-border",
          aspectRatio === "square"
            ? "h-20 w-20 rounded-full"
            : "aspect-[4/1] w-full rounded-lg",
          className,
        )}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden border bg-muted relative",
        aspectRatio === "square"
          ? "h-20 w-20 rounded-full"
          : "aspect-[4/1] w-full rounded-lg",
        className,
      )}
    >
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          {fallback}
        </div>
      ) : (
        <img
          src={url}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------------

function EditorSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>

        {description && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

function VisualChoice({
  selected,
  title,
  description,
  icon,
  onClick,
}: {
  selected: boolean;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-state={selected ? "selected" : "unselected"}
      className={cn(
        "relative flex min-w-0 flex-col data-[state=selected]:cursor-default data-[state=unselected]:cursor-pointer items-start gap-2 rounded-xl border p-3 text-left transition-all",
        "hover:border-primary/40 hover:bg-muted/30",
        selected && "border-primary bg-primary/5 ring-1 ring-primary/20",
      )}
    >
      {selected && (
        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </div>
      )}

      {icon && (
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border bg-background",
            selected && "border-primary/30 bg-primary/10 text-primary",
          )}
        >
          {icon}
        </div>
      )}

      <div className="min-w-0 pr-5">
        <p className="text-sm font-medium">{title}</p>

        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </button>
  );
}

function ProfileContentSelector({
  title,
  description,
  mode,
  onModeChange,
  items,
  selectedIds,
  onSelectedIdsChange,
  emptyMessage,
}: {
  title: string;
  description: string;
  mode: ProfileSectionSelectionMode;
  onModeChange: (mode: ProfileSectionSelectionMode) => void;
  items: Array<{
    id: string;
    label: string;
    description?: string;
    renderLabelAsMarkdown?: boolean;
  }>;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  emptyMessage: string;
}) {
  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().toLowerCase();

  const filteredItems = normalizedSearch
    ? items.filter((item) => {
        return [item.label, item.description]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch),
          );
      })
    : items;

  return (
    <EditorSection title={title} description={description}>
      <div className="grid gap-2 sm:grid-cols-2">
        <VisualChoice
          selected={mode === "all"}
          title="All"
          description="Show every resource available in this section."
          onClick={() => onModeChange("all")}
        />

        <VisualChoice
          selected={mode === "selected"}
          title="Selected"
          description="Only show the resources you choose."
          onClick={() => onModeChange("selected")}
        />
      </div>

      {mode === "selected" && (
        <div className="space-y-3">
          {items.length > 0 ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${title.toLowerCase()}...`}
                  className="pl-9"
                />
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const checked = selectedIds.includes(item.id);

                    return (
                      <label
                        key={item.id}
                        className={cn(
                          "flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                          checked
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/30",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) => {
                            if (nextChecked) {
                              onSelectedIdsChange(
                                Array.from(new Set([...selectedIds, item.id])),
                              );
                              return;
                            }

                            onSelectedIdsChange(
                              selectedIds.filter((id) => id !== item.id),
                            );
                          }}
                          className="mt-0.5 shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          {item.renderLabelAsMarkdown ? (
                            <div className="min-w-0 overflow-hidden text-sm font-medium">
                              <MarkdownRenderer
                                content={item.label}
                                className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                              />
                            </div>
                          ) : (
                            <p className="truncate text-sm font-medium">
                              {item.label}
                            </p>
                          )}

                          {item.description && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
                    No results found.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{selectedIds.length} selected</span>

                <span>
                  {filteredItems.length} of {items.length}
                </span>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </EditorSection>
  );
}

export function ProfileEditor({
  open,
  onOpenChange,
  onSaved,
}: ProfileEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialSnapshotRef = useRef("");
  const initialBioRef = useRef("");
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  // General
  const [displayName, setDisplayName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [bioTouched, setBioTouched] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [pendingProfileAsset, setPendingProfileAsset] = useState<{
    kind: "avatar" | "banner";
    file: File;
  } | null>(null);
  const [temporaryAvatarPath, setTemporaryAvatarPath] = useState<string | null>(
    null,
  );
  const [temporaryBannerPath, setTemporaryBannerPath] = useState<string | null>(
    null,
  );

  // Specialties
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState("");

  // Social links
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  // Theme
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [accentColor, setAccentColor] = useState("#a78bfa");
  const [avatarBorderColor, setAvatarBorderColor] = useState("#7c3aed");
  const [layout, setLayout] = useState("grid");
  const [cardStyle, setCardStyle] = useState("default");
  const [fontFamily, setFontFamily] = useState("default");
  const [profileBackground, setProfileBackground] = useState("default");
  const [showStats, setShowStats] = useState(true);
  const [showBadges, setShowBadges] = useState(true);
  const [showFeatured, setShowFeatured] = useState(true);
  const [showBots, setShowBots] = useState(true);
  const [showCreatorPages, setShowCreatorPages] = useState(true);
  const [showWorlds, setShowWorlds] = useState(true);
  const [showForms, setShowForms] = useState(true);
  const [hideCompletenessNudge, setHideCompletenessNudge] = useState(false);

  // Privacy
  const [visibility, setVisibility] = useState("public");

  // Featured bots
  const [featuredBotIds, setFeaturedBotIds] = useState<string[]>([]);
  const [featuredSearch, setFeaturedSearch] = useState("");
  const { bots, forms } = useStore();

  // Profile content resources
  const [profileOwnerId, setProfileOwnerId] = useState("");

  const [creatorPages, setCreatorPages] = useState<
    Array<{
      id: string;
      title: string;
      is_published: boolean;
    }>
  >([]);

  const [worlds, setWorlds] = useState<
    Array<{
      id: string;
      title: string;
    }>
  >([]);

  // Profile content selection
  const [botsSelectionMode, setBotsSelectionMode] =
    useState<ProfileSectionSelectionMode>("all");
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);

  const [creatorPagesSelectionMode, setCreatorPagesSelectionMode] =
    useState<ProfileSectionSelectionMode>("all");
  const [selectedCreatorPageIds, setSelectedCreatorPageIds] = useState<
    string[]
  >([]);

  const [worldsSelectionMode, setWorldsSelectionMode] =
    useState<ProfileSectionSelectionMode>("all");
  const [selectedWorldIds, setSelectedWorldIds] = useState<string[]>([]);

  const [formsSelectionMode, setFormsSelectionMode] =
    useState<ProfileSectionSelectionMode>("all");
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);

  const buildProfileSnapshot = useCallback(
    (
      overrides?: Partial<{
        displayName: string;
        pronouns: string;
        tagline: string;
        avatarUrl: string;
        bannerUrl: string;
        location: string;
        websiteUrl: string;
        statusMessage: string;
        specialties: string[];
        socialLinks: Record<string, string>;
        visibility: string;
        featuredBotIds: string[];
        botsSelectionMode: ProfileSectionSelectionMode;
        selectedBotIds: string[];
        creatorPagesSelectionMode: ProfileSectionSelectionMode;
        selectedCreatorPageIds: string[];
        worldsSelectionMode: ProfileSectionSelectionMode;
        selectedWorldIds: string[];
        formsSelectionMode: ProfileSectionSelectionMode;
        selectedFormIds: string[];
        primaryColor: string;
        accentColor: string;
        avatarBorderColor: string;
        layout: string;
        cardStyle: string;
        fontFamily: string;
        profileBackground: string;
        showStats: boolean;
        showBadges: boolean;
        showFeatured: boolean;
        showBots: boolean;
        showCreatorPages: boolean;
        showWorlds: boolean;
        showForms: boolean;
        hideCompletenessNudge: boolean;
      }>,
    ) => {
      return JSON.stringify({
        displayName: overrides?.displayName ?? displayName,
        pronouns: overrides?.pronouns ?? pronouns,
        tagline: overrides?.tagline ?? tagline,
        avatarUrl: overrides?.avatarUrl ?? avatarUrl,
        bannerUrl: overrides?.bannerUrl ?? bannerUrl,
        location: overrides?.location ?? location,
        websiteUrl: overrides?.websiteUrl ?? websiteUrl,
        statusMessage: overrides?.statusMessage ?? statusMessage,
        specialties: overrides?.specialties ?? specialties,
        socialLinks: normalizeSocialLinksForSnapshot(
          overrides?.socialLinks ?? socialLinks,
        ),
        visibility: overrides?.visibility ?? visibility,
        featuredBotIds: overrides?.featuredBotIds ?? featuredBotIds,
        botsSelectionMode: overrides?.botsSelectionMode ?? botsSelectionMode,
        selectedBotIds: overrides?.selectedBotIds ?? selectedBotIds,
        creatorPagesSelectionMode:
          overrides?.creatorPagesSelectionMode ?? creatorPagesSelectionMode,
        selectedCreatorPageIds:
          overrides?.selectedCreatorPageIds ?? selectedCreatorPageIds,
        worldsSelectionMode:
          overrides?.worldsSelectionMode ?? worldsSelectionMode,
        selectedWorldIds: overrides?.selectedWorldIds ?? selectedWorldIds,
        formsSelectionMode: overrides?.formsSelectionMode ?? formsSelectionMode,
        selectedFormIds: overrides?.selectedFormIds ?? selectedFormIds,
        primaryColor: overrides?.primaryColor ?? primaryColor,
        accentColor: overrides?.accentColor ?? accentColor,
        avatarBorderColor: overrides?.avatarBorderColor ?? avatarBorderColor,
        layout: overrides?.layout ?? layout,
        cardStyle: overrides?.cardStyle ?? cardStyle,
        fontFamily: overrides?.fontFamily ?? fontFamily,
        profileBackground: overrides?.profileBackground ?? profileBackground,
        showStats: overrides?.showStats ?? showStats,
        showBadges: overrides?.showBadges ?? showBadges,
        showFeatured: overrides?.showFeatured ?? showFeatured,
        showBots: overrides?.showBots ?? showBots,
        showCreatorPages: overrides?.showCreatorPages ?? showCreatorPages,
        showWorlds: overrides?.showWorlds ?? showWorlds,
        showForms: overrides?.showForms ?? showForms,
        hideCompletenessNudge:
          overrides?.hideCompletenessNudge ?? hideCompletenessNudge,
      });
    },
    [
      displayName,
      pronouns,
      tagline,
      avatarUrl,
      bannerUrl,
      location,
      websiteUrl,
      statusMessage,
      specialties,
      socialLinks,
      visibility,
      featuredBotIds,
      botsSelectionMode,
      selectedBotIds,
      creatorPagesSelectionMode,
      selectedCreatorPageIds,
      worldsSelectionMode,
      selectedWorldIds,
      formsSelectionMode,
      selectedFormIds,
      primaryColor,
      accentColor,
      avatarBorderColor,
      layout,
      cardStyle,
      fontFamily,
      profileBackground,
      showStats,
      showBadges,
      showFeatured,
      showBots,
      showCreatorPages,
      showWorlds,
      showForms,
      hideCompletenessNudge,
    ],
  );

  const handleProfileAssetSelect = (
    kind: "avatar" | "banner",
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setPendingProfileAsset({
      kind,
      file,
    });

    // Allows selecting the same file again later.
    e.target.value = "";
  };

  const handleCroppedProfileAssetUpload = async (croppedFile: File) => {
    if (!pendingProfileAsset) {
      return;
    }

    const kind = pendingProfileAsset.kind;

    if (kind === "avatar") {
      setUploadingAvatar(true);
    } else {
      setUploadingBanner(true);
    }

    try {
      const formData = new FormData();

      formData.append("kind", kind);

      formData.append("file", croppedFile);

      const result = await uploadProfileAssetAction(formData);

      if (!result.success || !result.url || !result.path) {
        toast.error(result.error || "Failed to upload image");

        return;
      }

      if (kind === "avatar") {
        if (temporaryAvatarPath && temporaryAvatarPath !== result.path) {
          await removeTemporaryProfileAssetAction(temporaryAvatarPath);
        }

        setTemporaryAvatarPath(result.path);

        setAvatarUrl(result.url);
      } else {
        if (temporaryBannerPath && temporaryBannerPath !== result.path) {
          await removeTemporaryProfileAssetAction(temporaryBannerPath);
        }

        setTemporaryBannerPath(result.path);

        setBannerUrl(result.url);
      }

      toast.success(
        kind === "avatar" ? "Avatar ready to save" : "Banner ready to save",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected error while uploading image";

      toast.error(message);
    } finally {
      if (kind === "avatar") {
        setUploadingAvatar(false);
      } else {
        setUploadingBanner(false);
      }

      setPendingProfileAsset(null);
    }
  };

  const handleCancelProfileEdit = async () => {
    const cleanupTasks: Promise<unknown>[] = [];

    if (temporaryAvatarPath) {
      cleanupTasks.push(removeTemporaryProfileAssetAction(temporaryAvatarPath));
    }

    if (temporaryBannerPath) {
      cleanupTasks.push(removeTemporaryProfileAssetAction(temporaryBannerPath));
    }

    if (cleanupTasks.length > 0) {
      await Promise.allSettled(cleanupTasks);
    }

    setTemporaryAvatarPath(null);

    setTemporaryBannerPath(null);

    setPendingProfileAsset(null);

    onOpenChange(false);
  };

  const handleProfileAssetRemove = async (kind: "avatar" | "banner") => {
    if (kind === "avatar") {
      if (temporaryAvatarPath) {
        await removeTemporaryProfileAssetAction(temporaryAvatarPath);

        setTemporaryAvatarPath(null);
      }

      setAvatarUrl("");
    } else {
      if (temporaryBannerPath) {
        await removeTemporaryProfileAssetAction(temporaryBannerPath);

        setTemporaryBannerPath(null);
      }

      setBannerUrl("");
    }
  };

  const loadProfile = useCallback(async () => {
    setLoading(true);

    setTemporaryAvatarPath(null);
    setTemporaryBannerPath(null);
    setPendingProfileAsset(null);

    try {
      const result = await getOwnProfile();

      if (result.success && result.profile) {
        const p = result.profile;
        setProfileOwnerId(p.id);

        const supabase = createClient();

        const [
          { data: creatorPageRows, error: creatorPagesError },
          { data: worldRows, error: worldsError },
        ] = await Promise.all([
          supabase
            .from("active_creator_pages")
            .select("id, title, is_published")
            .eq("user_id", p.id)
            .order("updated_at", { ascending: false }),

          supabase
            .from("atlas_worlds")
            .select("id, title")
            .eq("user_id", p.id)
            .order("updated_at", { ascending: false }),
        ]);

        if (creatorPagesError) {
          throw creatorPagesError;
        }

        if (worldsError) {
          throw worldsError;
        }

        setCreatorPages(
          (creatorPageRows || []).map((page) => ({
            id: page.id,
            title: page.title || "Untitled",
            is_published: page.is_published === true,
          })),
        );

        setWorlds(
          (worldRows || []).map((world) => ({
            id: world.id,
            title: world.title || "Untitled",
          })),
        );
        const loadedFeaturedBotIds = (p.active_profile_featured_bots || [])
          .map((relation: any) => relation?.bot?.id)
          .filter(Boolean)
          .slice(0, MAX_FEATURED_BOTS);

        setDisplayName(p.display_name || "");
        setPronouns(p.pronouns || "");
        setTagline(p.tagline || "");
        setBio(p.bio || "");
        initialBioRef.current = p.bio || "";
        setBioTouched(false);
        setAvatarUrl(p.avatar_url || "");
        setBannerUrl(p.banner_url || "");
        setLocation(p.location || "");
        setWebsiteUrl(p.website_url || "");
        setStatusMessage(p.status_message || "");
        setSpecialties(p.specialties || []);
        setSocialLinks(p.social_links || {});
        setVisibility(p.visibility || "public");

        setFeaturedBotIds(loadedFeaturedBotIds);

        const theme = (p.theme as Record<string, unknown>) || {};

        const resolvedTheme = resolveProfileTheme(theme);

        const resolvedSections = resolveProfileSections(
          p.profile_sections,
          theme,
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

        const loadedSelectedBotIds = getOrderedProfileSectionIds(
          (p.profile_section_bots || []) as ProfileSectionBotRow[],
          (row) => row.bot_id,
          (row) => row.sort_order,
        );

        const loadedSelectedCreatorPageIds = getOrderedProfileSectionIds(
          (p.profile_section_creator_pages ||
            []) as ProfileSectionCreatorPageRow[],
          (row) => row.creator_page_id,
          (row) => row.sort_order,
        );

        const loadedSelectedWorldIds = getOrderedProfileSectionIds(
          (p.profile_section_worlds || []) as ProfileSectionWorldRow[],
          (row) => row.world_id,
          (row) => row.sort_order,
        );

        const loadedSelectedFormIds = getOrderedProfileSectionIds(
          (p.profile_section_forms || []) as ProfileSectionFormRow[],
          (row) => row.form_id,
          (row) => row.sort_order,
        );

        setPrimaryColor(resolvedTheme.primaryColor);
        setAccentColor(resolvedTheme.accentColor);
        setAvatarBorderColor(resolvedTheme.avatarBorderColor);
        setLayout(resolvedTheme.layout);
        setCardStyle(resolvedTheme.cardStyle);
        setFontFamily(resolvedTheme.fontFamily);
        setProfileBackground(resolvedTheme.profileBackground);
        setShowStats(resolvedTheme.showStats);
        setShowBadges(resolvedTheme.showBadges);

        setShowFeatured(featuredBotsSection.enabled);

        setShowBots(botsSection.enabled);

        setShowCreatorPages(creatorPagesSection.enabled);

        setShowWorlds(worldsSection.enabled);

        setShowForms(formsSection.enabled);

        setBotsSelectionMode(botsSection.selectionMode);
        setSelectedBotIds(loadedSelectedBotIds);

        setCreatorPagesSelectionMode(creatorPagesSection.selectionMode);
        setSelectedCreatorPageIds(loadedSelectedCreatorPageIds);

        setWorldsSelectionMode(worldsSection.selectionMode);
        setSelectedWorldIds(loadedSelectedWorldIds);

        setFormsSelectionMode(formsSection.selectionMode);
        setSelectedFormIds(loadedSelectedFormIds);

        setHideCompletenessNudge(resolvedTheme.hideCompletenessNudge);

        initialSnapshotRef.current = JSON.stringify({
          displayName: p.display_name || "",
          pronouns: p.pronouns || "",
          tagline: p.tagline || "",
          avatarUrl: p.avatar_url || "",
          bannerUrl: p.banner_url || "",
          location: p.location || "",
          websiteUrl: p.website_url || "",
          statusMessage: p.status_message || "",
          specialties: p.specialties || [],
          socialLinks: normalizeSocialLinksForSnapshot(p.social_links || {}),
          visibility: p.visibility || "public",
          featuredBotIds: loadedFeaturedBotIds,

          botsSelectionMode: botsSection.selectionMode,
          selectedBotIds: loadedSelectedBotIds,

          creatorPagesSelectionMode: creatorPagesSection.selectionMode,
          selectedCreatorPageIds: loadedSelectedCreatorPageIds,

          worldsSelectionMode: worldsSection.selectionMode,
          selectedWorldIds: loadedSelectedWorldIds,

          formsSelectionMode: formsSection.selectionMode,
          selectedFormIds: loadedSelectedFormIds,

          primaryColor: resolvedTheme.primaryColor,
          accentColor: resolvedTheme.accentColor,
          avatarBorderColor: resolvedTheme.avatarBorderColor,
          layout: resolvedTheme.layout,
          cardStyle: resolvedTheme.cardStyle,
          fontFamily: resolvedTheme.fontFamily,
          profileBackground: resolvedTheme.profileBackground,
          showStats: resolvedTheme.showStats,
          showBadges: resolvedTheme.showBadges,

          showFeatured: featuredBotsSection.enabled,

          showBots: botsSection.enabled,

          showCreatorPages: creatorPagesSection.enabled,

          showWorlds: worldsSection.enabled,

          showForms: formsSection.enabled,

          hideCompletenessNudge: resolvedTheme.hideCompletenessNudge,
        });
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadProfile();
  }, [open, loadProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const savedFeaturedBotIds = validFeaturedBotIds.slice(
        0,
        MAX_FEATURED_BOTS,
      );
      const result = await updateProfile({
        display_name: displayName,
        pronouns,
        tagline,
        bio,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        location,
        website_url: websiteUrl,
        status_message: statusMessage,
        specialties,
        social_links: socialLinks,
        visibility,
        featuredBotIds: savedFeaturedBotIds,
        profileSections: {
          featured_bots: showFeatured,
          bots: showBots,
          creator_pages: showCreatorPages,
          worlds: showWorlds,
          forms: showForms,
        },
        profileSectionSelections: {
          bots:
            botsSelectionMode === "selected"
              ? {
                  selectionMode: "selected",
                  selectedIds: selectedBotIds,
                }
              : {
                  selectionMode: "all",
                },

          creator_pages:
            creatorPagesSelectionMode === "selected"
              ? {
                  selectionMode: "selected",
                  selectedIds: selectedCreatorPageIds,
                }
              : {
                  selectionMode: "all",
                },

          worlds:
            worldsSelectionMode === "selected"
              ? {
                  selectionMode: "selected",
                  selectedIds: selectedWorldIds,
                }
              : {
                  selectionMode: "all",
                },

          forms:
            formsSelectionMode === "selected"
              ? {
                  selectionMode: "selected",
                  selectedIds: selectedFormIds,
                }
              : {
                  selectionMode: "all",
                },
        },
        theme: {
          primaryColor,
          accentColor,
          avatarBorderColor,
          layout,
          cardStyle,
          fontFamily,
          profileBackground,
          showStats,
          showBadges,
          hideCompletenessNudge,
        },
      });

      if (result.success) {
        setTemporaryAvatarPath(null);
        setTemporaryBannerPath(null);
        setPendingProfileAsset(null);

        setFeaturedBotIds(savedFeaturedBotIds);

        initialBioRef.current = bio;
        setBioTouched(false);

        initialSnapshotRef.current = buildProfileSnapshot({
          featuredBotIds: savedFeaturedBotIds,
        });

        toast.success("Profile saved!");

        await onSaved?.();

        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to save profile");
      }
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const addSpecialty = () => {
    const trimmed = specialtyInput.trim();
    if (trimmed && !specialties.includes(trimmed) && specialties.length < 10) {
      setSpecialties([...specialties, trimmed]);
      setSpecialtyInput("");
    }
  };

  const removeSpecialty = (s: string) => {
    setSpecialties(specialties.filter((t) => t !== s));
  };

  const filledSocialCount = Object.values(socialLinks).filter(
    (v) => v && v.trim(),
  ).length;
  const ownBots = profileOwnerId
    ? bots.filter((bot) => bot.ownerId === profileOwnerId)
    : [];

  const ownForms = profileOwnerId
    ? forms.filter((form) => form.ownerId === profileOwnerId)
    : [];

  const validFeaturedBotIds =
    ownBots.length > 0
      ? featuredBotIds.filter((id) => ownBots.some((bot) => bot.id === id))
      : featuredBotIds.slice(0, MAX_FEATURED_BOTS);

  const featuredCount = validFeaturedBotIds.length;

  const featuredBotsSorted = [...ownBots].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const filteredFeaturedBots = featuredBotsSorted.filter((bot) => {
    const query = featuredSearch.trim().toLowerCase();

    if (!query) return true;

    return (
      bot.name.toLowerCase().includes(query) ||
      String(bot.shortDescription || "")
        .toLowerCase()
        .includes(query)
    );
  });

  const selectedFeaturedBots = validFeaturedBotIds
    .map((id) => ownBots.find((bot) => bot.id === id))
    .filter(Boolean);
  const moveFeaturedBot = (index: number, direction: -1 | 1) => {
    setFeaturedBotIds((prev) => {
      const next = [...prev];
      const target = index + direction;

      if (target < 0 || target >= next.length) {
        return prev;
      }

      [next[index], next[target]] = [next[target], next[index]];

      return next;
    });
  };
  const previewBackground = getProfileBackgroundStyles(
    profileBackground as ProfileBackground,
    primaryColor,
    accentColor,
  );
  const pendingProfilePreset =
    pendingProfileAsset?.kind === "avatar"
      ? IMAGE_PRESETS.profileAvatar
      : IMAGE_PRESETS.profileBanner;
  const previewFont = getProfileFontStyle(fontFamily as ProfileFontFamily);
  const previewGrid = getProfileGridClass(layout as ProfileLayout);
  const previewCard = getProfileCardClass(cardStyle as ProfileCardStyle);

  const currentSnapshot = buildProfileSnapshot();

  const hasUnsavedBioChanges = bioTouched && bio !== initialBioRef.current;

  const hasUnsavedChanges =
    !!initialSnapshotRef.current &&
    (currentSnapshot !== initialSnapshotRef.current || hasUnsavedBioChanges);

  const requestCloseProfileEditor = () => {
    if (hasUnsavedChanges || temporaryAvatarPath || temporaryBannerPath) {
      setDiscardDialogOpen(true);
      return;
    }

    void handleCancelProfileEdit();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          requestCloseProfileEditor();
          return;
        }

        onOpenChange(true);
      }}
    >
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Customize how your profile looks and what it shows. Changes are
            saved when you click Save.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs
            defaultValue="general"
            className="flex-1 overflow-hidden flex flex-col min-h-0"
          >
            {/* Responsive tab bar — horizontal scroll on mobile */}
            <TabsList className="shrink-0 w-full overflow-x-auto flex sm:grid sm:grid-cols-6 h-auto gap-0.5 sm:gap-1 scrollbar-none">
              <TabsTrigger
                value="general"
                className="text-xs px-2 sm:px-1 py-1.5 whitespace-nowrap flex-shrink-0 sm:flex-shrink"
              >
                <UserRound className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                General
              </TabsTrigger>
              <TabsTrigger
                value="social"
                className="text-xs px-2 sm:px-1 py-1.5 whitespace-nowrap flex-shrink-0 sm:flex-shrink"
              >
                <Share2 className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Social
                {filledSocialCount > 0 && (
                  <span className="ml-1 text-[10px] opacity-60">
                    ({filledSocialCount})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="text-xs px-2 sm:px-1 py-1.5 whitespace-nowrap flex-shrink-0 sm:flex-shrink"
              >
                <Palette className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Customize
              </TabsTrigger>
              <TabsTrigger
                value="content"
                className="text-xs px-2 sm:px-1 py-1.5 whitespace-nowrap flex-shrink-0 sm:flex-shrink"
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Content
              </TabsTrigger>
              <TabsTrigger
                value="featured"
                className="text-xs px-2 sm:px-1 py-1.5 whitespace-nowrap flex-shrink-0 sm:flex-shrink"
              >
                <Star className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Featured
                {featuredCount > 0 && (
                  <span className="ml-1 text-[10px] opacity-60">
                    ({featuredCount})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="text-xs px-2 sm:px-1 py-1.5 whitespace-nowrap flex-shrink-0 sm:flex-shrink"
              >
                <Shield className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Privacy
              </TabsTrigger>
            </TabsList>

            {/* ===== GENERAL TAB ===== */}
            <TabsContent
              value="general"
              className="space-y-4 mt-4 overflow-y-auto pr-1 flex-1 min-h-0"
            >
              <EditorSection
                title="Profile Media"
                description="Customize the main images shown at the top of your profile."
              >
                <div className="space-y-5">
                  {/* Banner */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs">
                      <ImageIcon className="h-3 w-3" />
                      Banner
                    </Label>

                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      4:1 ratio recommended. You can crop and reposition the
                      image after selecting it.
                    </p>

                    <input
                      type="file"
                      id="profile-banner-upload"
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                      onChange={(e) => handleProfileAssetSelect("banner", e)}
                    />

                    <ImagePreview
                      url={bannerUrl}
                      alt="Banner preview"
                      aspectRatio="banner"
                      fallback={
                        <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                      }
                    />

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full flex-1 cursor-pointer"
                        disabled={uploadingBanner}
                        onClick={() =>
                          document
                            .getElementById("profile-banner-upload")
                            ?.click()
                        }
                      >
                        {uploadingBanner ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-3.5 w-3.5" />
                        )}

                        {bannerUrl ? "Replace banner" : "Upload banner"}
                      </Button>

                      {bannerUrl && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="w-full flex-1 cursor-pointer text-white hover:text-white/90"
                          onClick={() =>
                            void handleProfileAssetRemove("banner")
                          }
                        >
                          <X className="mr-2 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="border-t" />

                  {/* Avatar */}
                  <div className="flex items-start gap-3">
                    <input
                      type="file"
                      id="profile-avatar-upload"
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                      onChange={(e) => handleProfileAssetSelect("avatar", e)}
                    />

                    <ImagePreview
                      url={avatarUrl}
                      alt="Avatar preview"
                      aspectRatio="square"
                      fallback={
                        <UserRound className="h-8 w-8 text-muted-foreground/40" />
                      }
                    />

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Label className="flex items-center gap-1 text-xs">
                        <UserRound className="h-3 w-3" />
                        Avatar
                      </Label>

                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Square image recommended. It will appear circular on
                        your profile.
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          disabled={uploadingAvatar}
                          onClick={() =>
                            document
                              .getElementById("profile-avatar-upload")
                              ?.click()
                          }
                        >
                          {uploadingAvatar ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-3.5 w-3.5" />
                          )}

                          {avatarUrl ? "Replace avatar" : "Upload avatar"}
                        </Button>

                        {avatarUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="cursor-pointer text-destructive hover:text-destructive"
                            onClick={() =>
                              void handleProfileAssetRemove("avatar")
                            }
                          >
                            <X className="mr-2 h-3.5 w-3.5" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </EditorSection>

              <div className="border-t" />

              <EditorSection
                title="Identity"
                description="Basic information shown near the top of your profile."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Display Name</Label>

                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                      maxLength={64}
                    />
                  </div>

                  {/* Pronouns */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pronouns</Label>

                    <Select value={pronouns} onValueChange={setPronouns}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="he/him">he/him</SelectItem>
                        <SelectItem value="she/her">she/her</SelectItem>
                        <SelectItem value="they/them">they/them</SelectItem>
                        <SelectItem value="he/they">he/they</SelectItem>
                        <SelectItem value="she/they">she/they</SelectItem>
                        <SelectItem value="any">any pronouns</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3" />
                      Location
                    </Label>

                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, Country"
                      maxLength={100}
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs">
                      <MessageCircle className="h-3 w-3" />
                      Status
                    </Label>

                    <Input
                      value={statusMessage}
                      onChange={(e) => setStatusMessage(e.target.value)}
                      placeholder="Working on new horror bots..."
                      maxLength={128}
                    />

                    <p className="text-[10px] text-muted-foreground">
                      A temporary message about what you&apos;re doing or
                      working on.
                    </p>
                  </div>
                </div>
              </EditorSection>

              <div className="border-t" />

              <EditorSection
                title="About"
                description="Tell visitors more about you and the content you create."
              >
                {/* Tagline */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Tagline</Label>
                  <p className="text-[10px] text-muted-foreground">
                    A short description that stays on your profile.
                  </p>
                  <Input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="A short tagline about yourself"
                    maxLength={120}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {tagline.length}/120
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Bio</Label>
                  <div
                    onFocusCapture={() => {
                      if (!bioTouched) {
                        initialBioRef.current = bio;
                        setBioTouched(true);
                      }
                    }}
                  >
                    <MarkdownField
                      value={bio}
                      onChange={(value) => setBio(value)}
                      placeholder="Tell the community about yourself..."
                      minEditorHeightRem={8}
                      maxEditorHeightRem={16}
                      className="min-h-[10rem] md:min-h-[11rem]"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">
                    {bio.length}/2000
                  </p>
                </div>

                {/* Website */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Website
                  </Label>
                  <Input
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                {/* Specialties */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Specialties</Label>
                  <div className="flex gap-2">
                    <Input
                      value={specialtyInput}
                      onChange={(e) => setSpecialtyInput(e.target.value)}
                      placeholder="e.g., horror bots, romance..."
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addSpecialty())
                      }
                      maxLength={30}
                      disabled={specialties.length >= 10}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addSpecialty}
                      className="cursor-pointer shrink-0 h-9 w-9 p-0"
                      disabled={
                        !specialtyInput.trim() ||
                        specialties.includes(specialtyInput.trim()) ||
                        specialties.length >= 10
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {specialties.map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors gap-1"
                          onClick={() => removeSpecialty(s)}
                        >
                          {s}
                          <X className="h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {specialties.length}/10 specialties
                  </p>
                </div>
              </EditorSection>
            </TabsContent>

            {/* ===== SOCIAL TAB ===== */}
            <TabsContent
              value="social"
              className="space-y-3 mt-4 overflow-y-auto pr-1 flex-1 min-h-0"
            >
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex gap-3">
                  <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm font-medium">Social Links</p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Leave platforms empty if you don&apos;t want them
                      displayed on your profile.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {socialPlatforms.map((platform) => (
                  <div
                    key={platform.key}
                    className="grid gap-2 rounded-xl border bg-muted/10 p-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center"
                  >
                    <Label className="text-xs font-medium">
                      {platform.label}
                    </Label>

                    <Input
                      value={socialLinks[platform.key] || ""}
                      onChange={(e) =>
                        setSocialLinks((prev) => ({
                          ...prev,
                          [platform.key]: e.target.value,
                        }))
                      }
                      placeholder={platform.placeholder}
                      className="min-w-0 text-xs"
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ===== APPEARANCE TAB ===== */}
            <TabsContent
              value="appearance"
              className="space-y-5 mt-4 overflow-y-auto pr-1 flex-1 min-h-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Profile Style</h3>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Customize colors, layout and visual appearance.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0 cursor-pointer"
                  onClick={() => {
                    setPrimaryColor("#7c3aed");
                    setAccentColor("#a78bfa");
                    setAvatarBorderColor("#7c3aed");
                    setLayout("grid");
                    setCardStyle("default");
                    setFontFamily("default");
                    setProfileBackground("default");

                    toast.success("Profile style reset to defaults");
                  }}
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Reset
                </Button>
              </div>

              <EditorSection
                title="Colors"
                description="Control the main colors used throughout your profile."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <CustomColorPicker
                    label="Primary Color"
                    value={primaryColor}
                    onChange={setPrimaryColor}
                    presets={accentPresets}
                  />

                  <CustomColorPicker
                    label="Accent Color"
                    value={accentColor}
                    onChange={setAccentColor}
                    presets={accentPresets}
                  />
                </div>

                <CustomColorPicker
                  label="Avatar Border Color"
                  value={avatarBorderColor}
                  onChange={setAvatarBorderColor}
                  presets={accentPresets}
                />
              </EditorSection>

              <div className="border-t" />

              {/* Layout & Card Style */}
              <EditorSection
                title="Layout"
                description="Choose how your collections are arranged on the profile."
              >
                <div className="grid gap-2 sm:grid-cols-3">
                  <VisualChoice
                    selected={layout === "grid"}
                    title="Grid"
                    description="Balanced cards in multiple columns."
                    icon={<LayoutGrid className="h-4 w-4" />}
                    onClick={() => setLayout("grid")}
                  />

                  <VisualChoice
                    selected={layout === "showcase"}
                    title="Showcase"
                    description="Larger content with more visual emphasis."
                    icon={<PanelTop className="h-4 w-4" />}
                    onClick={() => setLayout("showcase")}
                  />

                  <VisualChoice
                    selected={layout === "list"}
                    title="List"
                    description="Compact rows for easier scanning."
                    icon={<Rows3 className="h-4 w-4" />}
                    onClick={() => setLayout("list")}
                  />
                </div>
              </EditorSection>

              <div className="border-t" />

              <EditorSection
                title="Card Style"
                description="Choose how profile content cards are visually presented."
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      value: "default",
                      label: "Default",
                      description: "Balanced background and border.",
                    },
                    {
                      value: "bordered",
                      label: "Bordered",
                      description: "More defined card outlines.",
                    },
                    {
                      value: "minimal",
                      label: "Minimal",
                      description: "Reduced visual decoration.",
                    },
                    {
                      value: "glass",
                      label: "Glass",
                      description: "Transparent layered appearance.",
                    },
                  ].map((option) => (
                    <VisualChoice
                      key={option.value}
                      selected={cardStyle === option.value}
                      title={option.label}
                      description={option.description}
                      onClick={() => setCardStyle(option.value)}
                    />
                  ))}
                </div>
              </EditorSection>

              <div className="border-t" />

              <EditorSection
                title="Typography & Background"
                description="Fine-tune the overall visual personality of your profile."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Font Family</Label>

                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="default">Default (Inter)</SelectItem>
                        <SelectItem value="serif">Serif</SelectItem>
                        <SelectItem value="mono">Monospace</SelectItem>
                        <SelectItem value="display">Display</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Background Style</Label>

                    <Select
                      value={profileBackground}
                      onValueChange={setProfileBackground}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="ambient">Ambient</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </EditorSection>

              <div className="border-t" />

              {/* Live preview */}
              <EditorSection
                title="Live Preview"
                description="A simplified preview of how your profile theme will look."
              >
                <div
                  className={cn(
                    "overflow-hidden rounded-xl border",
                    previewBackground.className,
                  )}
                  style={{
                    ...previewBackground.style,
                    ...previewFont,
                  }}
                >
                  {/* Fake banner */}
                  <div
                    className="aspect-[4/1] w-full bg-cover bg-center"
                    style={{
                      background: bannerUrl
                        ? `url(${bannerUrl}) center/cover no-repeat`
                        : `linear-gradient(135deg, ${primaryColor}88, ${accentColor}33)`,
                    }}
                  />

                  <div className="space-y-4 p-4">
                    <div className="-mt-10 flex items-end gap-3">
                      <div
                        className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-4 bg-muted"
                        style={{
                          borderColor: avatarBorderColor,
                        }}
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <UserRound className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 pb-1">
                        <p className="truncate text-sm font-semibold">
                          {displayName || "Your display name"}
                        </p>

                        <p className="truncate text-xs text-muted-foreground">
                          {tagline || "Your tagline appears here"}
                        </p>
                      </div>
                    </div>

                    {specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {specialties.slice(0, 3).map((specialty) => (
                          <Badge
                            key={specialty}
                            variant="secondary"
                            className="text-[10px]"
                            style={{
                              backgroundColor: `${accentColor}18`,
                            }}
                          >
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className={previewGrid}>
                      {["Featured Bot", "Bot Collection"].map((label) => (
                        <div
                          key={label}
                          className={cn(previewCard, "min-h-20 text-xs")}
                          style={
                            cardStyle !== "minimal"
                              ? {
                                  borderColor: `${accentColor}55`,
                                }
                              : undefined
                          }
                        >
                          <div className="mb-2 h-6 w-6 rounded bg-muted" />

                          <p className="font-medium">{label}</p>

                          <p className="mt-1 text-muted-foreground">
                            Profile content preview
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </EditorSection>

              <div className="border-t" />

              {/* Public profile visibility */}
              <div className="space-y-3">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Public Profile Visibility
                </Label>

                <p className="text-xs text-muted-foreground">
                  Choose which sections and public information visitors can see
                  on your profile.
                </p>

                <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    {
                      label: "Show Follower Counts",
                      value: showStats,
                      onChange: setShowStats,
                    },
                    {
                      label: "Show Badges",
                      value: showBadges,
                      onChange: setShowBadges,
                    },
                    {
                      label: "Show Featured Bots",
                      value: showFeatured,
                      onChange: setShowFeatured,
                    },
                    {
                      label: "Show Bots",
                      value: showBots,
                      onChange: setShowBots,
                    },
                    {
                      label: "Show Creator Pages",
                      value: showCreatorPages,
                      onChange: setShowCreatorPages,
                    },
                    {
                      label: "Show Worlds",
                      value: showWorlds,
                      onChange: setShowWorlds,
                    },
                    {
                      label: "Show Forms",
                      value: showForms,
                      onChange: setShowForms,
                    },
                  ].map((toggle) => (
                    <div
                      key={toggle.label}
                      className="flex items-center justify-between gap-3 rounded-lg border p-2.5"
                    >
                      <Label className="text-xs cursor-pointer">
                        {toggle.label}
                      </Label>

                      <Switch
                        checked={toggle.value}
                        onCheckedChange={toggle.onChange}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t" />

              {/* Owner-only preferences */}
              <div className="space-y-3">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Your Profile View
                </Label>

                <p className="text-xs text-muted-foreground">
                  These options only affect what you see while managing your own
                  profile.
                </p>

                <div className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
                  <div className="min-w-0">
                    <Label className="text-xs cursor-pointer">
                      Show Completion Reminder
                    </Label>

                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                      Show your profile completion card and percentage until the
                      profile reaches 100%.
                    </p>
                  </div>

                  <Switch
                    checked={!hideCompletenessNudge}
                    onCheckedChange={(checked) =>
                      setHideCompletenessNudge(!checked)
                    }
                  />
                </div>
              </div>
            </TabsContent>

            {/* ===== CONTENT TAB ===== */}
            <TabsContent
              value="content"
              className="space-y-5 mt-4 overflow-y-auto pr-1 flex-1 min-h-0"
            >
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm font-medium">Profile Content</p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Choose whether each profile section shows all of your
                  resources or only specific ones.
                </p>
              </div>

              <ProfileContentSelector
                title="Bots"
                description="Choose which of your bots can appear in the Bots section."
                mode={botsSelectionMode}
                onModeChange={setBotsSelectionMode}
                items={ownBots.map((bot) => ({
                  id: bot.id,
                  label: bot.name,
                  description: bot.shortDescription || "No description",
                }))}
                selectedIds={selectedBotIds}
                onSelectedIdsChange={setSelectedBotIds}
                emptyMessage="You don't have any bots to select yet."
              />

              <div className="border-t" />

              <ProfileContentSelector
                title="Creator Pages"
                description="Choose which Creator Pages can appear on your profile. Draft pages are visible to you but won't be shown to other visitors."
                mode={creatorPagesSelectionMode}
                onModeChange={setCreatorPagesSelectionMode}
                items={creatorPages.map((page) => ({
                  id: page.id,
                  label: page.title,
                  description: page.is_published ? "Published" : "Draft",
                }))}
                selectedIds={selectedCreatorPageIds}
                onSelectedIdsChange={setSelectedCreatorPageIds}
                emptyMessage="You don't have any Creator Pages to select yet."
              />

              <div className="border-t" />

              <ProfileContentSelector
                title="Worlds"
                description="Choose which Atlas Worlds can appear on your profile."
                mode={worldsSelectionMode}
                onModeChange={setWorldsSelectionMode}
                items={worlds.map((world) => ({
                  id: world.id,
                  label: world.title,
                  description: "World",
                }))}
                selectedIds={selectedWorldIds}
                onSelectedIdsChange={setSelectedWorldIds}
                emptyMessage="You don't have any Worlds to select yet."
              />

              <div className="border-t" />

              <ProfileContentSelector
                title="Forms"
                description="Choose which forms can appear on your profile."
                mode={formsSelectionMode}
                onModeChange={setFormsSelectionMode}
                items={ownForms.map((form) => ({
                  id: form.id,
                  label: form.title,
                  description: form.isActive ? "Active" : "Inactive",
                  renderLabelAsMarkdown: true,
                }))}
                selectedIds={selectedFormIds}
                onSelectedIdsChange={setSelectedFormIds}
                emptyMessage="You don't have any forms to select yet."
              />
            </TabsContent>

            {/* ===== FEATURED TAB ===== */}
            <TabsContent
              value="featured"
              className="min-w-0 space-y-4 mt-4 overflow-y-auto overflow-x-hidden pr-1 flex-1 min-h-0"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Featured Bots</h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Choose and order up to {MAX_FEATURED_BOTS} bots to
                      highlight on your profile.
                    </p>
                  </div>

                  <Badge variant="outline" className="shrink-0">
                    {featuredCount} / {MAX_FEATURED_BOTS}
                  </Badge>
                </div>
              </div>

              {selectedFeaturedBots.length > 0 && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Selected
                    </p>

                    <div className="space-y-2">
                      {selectedFeaturedBots.map((bot, index) =>
                        bot ? (
                          <div
                            key={bot.id}
                            className="flex min-w-0 items-center gap-2 rounded-xl border bg-primary/5 p-2.5"
                          >
                            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                              {bot.imageUrl ? (
                                <img
                                  src={bot.imageUrl}
                                  alt={bot.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <BotIcon className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium">
                                {bot.name}
                              </p>

                              <p className="truncate text-[10px] text-muted-foreground">
                                Position {index + 1}
                              </p>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={index === 0}
                              onClick={() => moveFeaturedBot(index, -1)}
                              className="h-7 w-7 shrink-0 cursor-pointer"
                              title="Move up"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={
                                index === selectedFeaturedBots.length - 1
                              }
                              onClick={() => moveFeaturedBot(index, 1)}
                              className="h-7 w-7 shrink-0 cursor-pointer"
                              title="Move down"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setFeaturedBotIds((prev) =>
                                  prev.filter((id) => id !== bot.id),
                                )
                              }
                              className="h-7 w-7 shrink-0 cursor-pointer text-destructive hover:text-destructive"
                              title="Remove"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : null,
                      )}
                    </div>
                  </div>
                  <div className="border-t" />
                </>
              )}

              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  All Bots
                </p>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    value={featuredSearch}
                    onChange={(e) => setFeaturedSearch(e.target.value)}
                    placeholder="Search your bots..."
                    className="pl-9"
                  />
                </div>
                {ownBots.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {filteredFeaturedBots.map((bot) => {
                      const isSelected = validFeaturedBotIds.includes(bot.id);
                      return (
                        <label
                          key={bot.id}
                          className={cn(
                            "flex w-full min-w-0 max-w-full items-center gap-2.5 overflow-hidden rounded-lg border p-2.5 cursor-pointer transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "hover:border-primary/30",
                            !isSelected &&
                              featuredCount >= MAX_FEATURED_BOTS &&
                              "opacity-50",
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            disabled={
                              !isSelected && featuredCount >= MAX_FEATURED_BOTS
                            }
                            onCheckedChange={(checked) => {
                              setFeaturedBotIds((prev) => {
                                if (checked) {
                                  if (prev.length >= MAX_FEATURED_BOTS) {
                                    toast.error(
                                      `You can feature up to ${MAX_FEATURED_BOTS} bots.`,
                                    );
                                    return prev;
                                  }

                                  return Array.from(new Set([...prev, bot.id]));
                                }

                                return prev.filter((id) => id !== bot.id);
                              });
                            }}
                            className="rounded shrink-0"
                          />
                          <div className="h-8 w-8 rounded bg-muted overflow-hidden shrink-0">
                            {bot.imageUrl ? (
                              <img
                                src={bot.imageUrl}
                                alt={bot.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <BotIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {bot.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {bot.shortDescription || "No description"}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                    No bots created yet. Create a bot first to feature it.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ===== PRIVACY TAB ===== */}
            <TabsContent
              value="privacy"
              className="space-y-4 mt-4 overflow-y-auto pr-1 flex-1 min-h-0"
            >
              <EditorSection
                title="Profile Visibility"
                description="Choose who can access your public profile."
              >
                <div className="grid gap-2">
                  <VisualChoice
                    selected={visibility === "public"}
                    title="Public"
                    description="Anyone can view your profile and it can appear in public discovery."
                    icon={<Eye className="h-4 w-4 text-emerald-500" />}
                    onClick={() => setVisibility("public")}
                  />

                  <VisualChoice
                    selected={visibility === "followers"}
                    title="Followers Only"
                    description="Only people who follow you can view your profile."
                    icon={<UsersRound className="h-4 w-4 text-amber-500" />}
                    onClick={() => setVisibility("followers")}
                  />

                  <VisualChoice
                    selected={visibility === "private"}
                    title="Private"
                    description="Your profile is hidden from everyone except you."
                    icon={<EyeOff className="h-4 w-4 text-red-500" />}
                    onClick={() => setVisibility("private")}
                  />
                </div>
              </EditorSection>
            </TabsContent>
          </Tabs>
        )}

        <ImageCropDialog
          open={!!pendingProfileAsset}
          onOpenChange={(cropOpen) => {
            if (!cropOpen) {
              setPendingProfileAsset(null);
            }
          }}
          file={pendingProfileAsset?.file ?? null}
          aspect={pendingProfilePreset.aspect}
          cropShape={pendingProfilePreset.cropShape}
          title={
            pendingProfileAsset?.kind === "avatar"
              ? "Adjust profile picture"
              : "Adjust profile banner"
          }
          description={
            pendingProfileAsset?.kind === "avatar"
              ? "Drag and zoom the image to choose what will appear inside your profile picture."
              : "Drag and zoom the image to choose what visitors will see in your profile banner."
          }
          recommendedWidth={pendingProfilePreset.recommendedWidth}
          recommendedHeight={pendingProfilePreset.recommendedHeight}
          outputWidth={pendingProfilePreset.recommendedWidth}
          outputHeight={pendingProfilePreset.recommendedHeight}
          onConfirm={handleCroppedProfileAssetUpload}
        />

        <AlertDialog
          open={discardDialogOpen}
          onOpenChange={setDiscardDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>

              <AlertDialogDescription>
                Your profile has changes that haven&apos;t been saved. Closing
                the editor will discard them.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">
                Keep Editing
              </AlertDialogCancel>

              <AlertDialogAction
                onClick={() => {
                  setDiscardDialogOpen(false);

                  void handleCancelProfileEdit();
                }}
                className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Discard Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="shrink-0 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground sm:mr-auto">
            {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
          </p>

          <Button
            variant="outline"
            onClick={requestCloseProfileEditor}
            disabled={saving || uploadingAvatar || uploadingBanner}
            className="w-full cursor-pointer sm:w-auto"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={
              saving ||
              loading ||
              uploadingAvatar ||
              uploadingBanner ||
              !!pendingProfileAsset ||
              !hasUnsavedChanges
            }
            className="w-full cursor-pointer sm:w-auto"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
