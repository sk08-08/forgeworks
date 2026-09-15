"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Check,
  Layers3,
  Loader2,
  Pencil,
  Sparkles,
  WandSparkles,
  Settings2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Slash,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomColorPicker } from "@/components/ui/custom-color-picker";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  awardProfileBadge,
  createBadgeDefinition,
  listBadgeDefinitions,
  listProfileBadgesForAdmin,
  revokeProfileBadge,
  searchProfilesForBadgeAdmin,
  updateBadgeDefinition,
  type BadgeDefinitionRecord,
} from "@/features/profile/actions/profile-badges";
import {
  getProfileBadgeIcon,
  getProfileBadgeIconOptions,
} from "@/features/profile/lib/profile-badge-icons";
import type { ProfileBadgeRecord } from "@/features/profile/lib/profile-badges";
import { cn } from "@/lib/utils";
import {
  getBadgeAutomationOverview,
  reconcileAutomaticBadges,
  updateBadgeAutomationConfig,
  type BadgeAutomationMetric,
} from "@/features/admin/actions/admin";

type EditableBadgeForm = {
  slug: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  sortOrder: string;
  isActive: boolean;
  awardMode: "manual" | "automatic";
  automationType: "metric_threshold" | "created_before";
  automationMetric: BadgeAutomationMetric;
  automationThreshold: string;
  automationBefore: string;
  automationSticky: boolean;
};

type ProfileSearchResult = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  slug: string | null;
};

type CatalogStatusFilter = "all" | "active" | "inactive";
type CatalogAwardingFilter = "all" | "automatic" | "manual";
type BadgeEditorMode = "idle" | "create" | "edit";

type BadgeAutomationAdminRecord = {
  slug: string;
  is_system: boolean;
  is_manual_only: boolean;
  rarity: string;
  is_active: boolean;
  automation:
    | {
        enabled: false;
        mode: "manual";
        sticky: true;
      }
    | {
        enabled: true;
        mode: "automatic";
        type: "metric_threshold" | "created_before";
        metric: string | null;
        threshold: number;
        before: string | null;
        sticky: boolean;
      };
  awards: {
    total: number;
    automatic: number;
  };
};

const EMPTY_FORM: EditableBadgeForm = {
  slug: "",
  label: "",
  description: "",
  icon: "Award",
  color: "#7c3aed",
  category: "general",
  sortOrder: "0",
  isActive: true,
  awardMode: "manual",
  automationType: "metric_threshold",
  automationMetric: "active_bots",
  automationThreshold: "1",
  automationBefore: "",
  automationSticky: true,
};

const PROFILE_PAGE_SIZE = 12;

const BADGE_AUTOMATION_METRICS: Array<{
  value: BadgeAutomationMetric;
  label: string;
  description: string;
}> = [
  {
    value: "profile_completeness",
    label: "Profile completeness",
    description: "Percentage of profile completion.",
  },
  {
    value: "active_bots",
    label: "Active bots",
    description: "Current non-deleted bots owned by the user.",
  },
  {
    value: "active_forms",
    label: "Active Forms",
    description: "Current non-deleted Forms owned by the user.",
  },
  {
    value: "active_creator_pages",
    label: "Creator Pages",
    description: "Current non-deleted Creator Pages.",
  },
  {
    value: "atlas_worlds",
    label: "Atlas Worlds",
    description: "Current non-deleted Worlds.",
  },
  {
    value: "atlas_lorebooks",
    label: "Atlas Lorebooks",
    description: "Current non-deleted Lorebooks.",
  },
  {
    value: "atlas_entries",
    label: "Atlas Entries",
    description: "Current non-deleted Entries.",
  },
  {
    value: "atlas_collections",
    label: "Atlas Collections",
    description: "Current non-deleted Collections.",
  },
  {
    value: "atlas_resources",
    label: "Any Atlas resource",
    description: "Worlds + Lorebooks + Entries + Collections combined.",
  },
  {
    value: "account_age_days",
    label: "Account age",
    description: "Days since the account was created.",
  },
];

function getAutomationMetricLabel(metric?: string | null) {
  return (
    BADGE_AUTOMATION_METRICS.find((item) => item.value === metric)?.label ||
    metric ||
    "Unknown metric"
  );
}

function getAutomationRuleSummary(record?: BadgeAutomationAdminRecord | null) {
  if (!record || record.automation.mode === "manual") {
    return "Manual award";
  }

  if (record.automation.type === "created_before") {
    return record.automation.before
      ? `Joined before ${formatDateLabel(record.automation.before)}`
      : "Joined before a cutoff date";
  }

  return `${getAutomationMetricLabel(record.automation.metric)} ≥ ${
    record.automation.threshold
  }`;
}

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatDateLabel(value?: string) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No date";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function badgeRecordToForm(
  badge: BadgeDefinitionRecord,
  automationRecord?: BadgeAutomationAdminRecord | null,
): EditableBadgeForm {
  const automation = automationRecord?.automation;

  return {
    slug: badge.slug,
    label: badge.label,
    description: badge.description || "",
    icon: badge.icon || "Award",
    color: badge.color || "#7c3aed",
    category: badge.category || "general",
    sortOrder: String(badge.sort_order ?? 0),
    isActive: badge.is_active !== false,
    awardMode: automation?.mode === "automatic" ? "automatic" : "manual",
    automationType:
      automation?.mode === "automatic" && automation.type === "created_before"
        ? "created_before"
        : "metric_threshold",
    automationMetric:
      automation?.mode === "automatic" &&
      automation.type === "metric_threshold" &&
      automation.metric
        ? (automation.metric as BadgeAutomationMetric)
        : "active_bots",
    automationThreshold:
      automation?.mode === "automatic" &&
      automation.type === "metric_threshold"
        ? String(automation.threshold ?? 1)
        : "1",
    automationBefore:
      automation?.mode === "automatic" &&
      automation.type === "created_before" &&
      automation.before
        ? automation.before.slice(0, 10)
        : "",
    automationSticky:
      automation?.mode === "automatic" ? automation.sticky !== false : true,
  };
}

function getBadgeFormSnapshot(value: EditableBadgeForm) {
  return JSON.stringify({
    slug: value.slug.trim(),
    label: value.label,
    description: value.description,
    icon: value.icon,
    color: value.color,
    category: value.category,
    sortOrder: value.sortOrder,
    isActive: value.isActive,
    awardMode: value.awardMode,
    automationType: value.automationType,
    automationMetric: value.automationMetric,
    automationThreshold: value.automationThreshold,
    automationBefore: value.automationBefore,
    automationSticky: value.automationSticky,
  });
}

function BadgePreview({ badge }: { badge: EditableBadgeForm }) {
  const Icon = getProfileBadgeIcon(badge.icon);
  return (
    <div
      className="flex max-w-full min-w-0 items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm"
      style={{ borderColor: badge.color || "#7c3aed" }}
    >
      <Icon
        className="h-4 w-4 shrink-0"
        style={{ color: badge.color || "#7c3aed" }}
      />
      <span className="truncate font-medium">
        {badge.label || "Badge preview"}
      </span>
    </div>
  );
}

function AwardedBadgePill({
  badge,
  onRevoke,
  revoking,
  automatic,
}: {
  badge: ProfileBadgeRecord;
  onRevoke: (slug: string) => void;
  revoking: boolean;
  automatic: boolean;
}) {
  const Icon = getProfileBadgeIcon(badge.icon);
  const accent = badge.color || "#7c3aed";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
          style={{
            borderColor: accent,
            backgroundColor: `${accent}14`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{badge.label}</p>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="truncate text-xs text-muted-foreground">
              {badge.slug} • {formatDateLabel(badge.awardedAt)}
            </p>

            {automatic && (
              <Badge
                variant="secondary"
                className="h-5 gap-1 px-1.5 text-[10px] font-medium"
              >
                <Sparkles className="h-2.5 w-2.5" />
                Automatic
              </Badge>
            )}
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRevoke(badge.slug)}
        disabled={revoking || automatic}
        className={cn(
          "h-9 w-9 shrink-0",
          automatic
            ? "cursor-not-allowed text-muted-foreground"
            : "cursor-pointer text-destructive hover:text-destructive",
        )}
        aria-label={
          automatic
            ? `${badge.label} is managed automatically`
            : `Revoke ${badge.label}`
        }
        title={
          automatic
            ? "Automatic badges are managed by their earning rule"
            : `Revoke ${badge.label}`
        }
      >
        {revoking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

export function BadgeAdminTab() {
  const [badges, setBadges] = useState<BadgeDefinitionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"catalog" | "awards">(
    "catalog",
  );
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogStatus, setCatalogStatus] =
    useState<CatalogStatusFilter>("all");
  const [catalogCategory, setCatalogCategory] = useState<string>("all");
  const [catalogAwarding, setCatalogAwarding] =
    useState<CatalogAwardingFilter>("all");

  const [automationRecords, setAutomationRecords] = useState<
    BadgeAutomationAdminRecord[]
  >([]);
  const [automationTotals, setAutomationTotals] = useState({
    automatic: 0,
    manual: 0,
    totalAwards: 0,
    automaticAwards: 0,
  });
  const [reconcilingAutomation, setReconcilingAutomation] = useState(false);

  const [selectedBadgeSlug, setSelectedBadgeSlug] = useState<string | null>(
    null,
  );

  const [editorMode, setEditorMode] = useState<BadgeEditorMode>("idle");

  const [form, setForm] = useState<EditableBadgeForm>({
    ...EMPTY_FORM,
  });

  const [savingBadge, setSavingBadge] = useState(false);

  const initialBadgeFormSnapshotRef = useRef(
    getBadgeFormSnapshot({
      ...EMPTY_FORM,
    }),
  );

  const [discardBadgeChangesOpen, setDiscardBadgeChangesOpen] = useState(false);

  const pendingBadgeEditorActionRef = useRef<null | (() => void)>(null);

  const [searchingProfiles, setSearchingProfiles] = useState(false);
  const [profileQuery, setProfileQuery] = useState("");
  const [profiles, setProfiles] = useState<ProfileSearchResult[]>([]);
  const [profileOffset, setProfileOffset] = useState(0);
  const [hasMoreProfiles, setHasMoreProfiles] = useState(false);
  const [loadingMoreProfiles, setLoadingMoreProfiles] = useState(false);
  const [selectedProfile, setSelectedProfile] =
    useState<ProfileSearchResult | null>(null);
  const [selectedProfileBadges, setSelectedProfileBadges] = useState<
    ProfileBadgeRecord[]
  >([]);
  const [selectedAwardBadgeSlug, setSelectedAwardBadgeSlug] =
    useState<string>("");
  const [awardNote, setAwardNote] = useState("");
  const [submittingAward, setSubmittingAward] = useState(false);
  const [revokingSlug, setRevokingSlug] = useState<string | null>(null);

  const [badgePendingRevoke, setBadgePendingRevoke] =
    useState<ProfileBadgeRecord | null>(null);

  const [refreshingProfileBadges, setRefreshingProfileBadges] = useState(false);

  const profileSearchRequestRef = useRef(0);

  const profileBadgesRequestRef = useRef(0);

  const selectedProfileIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedProfileIdRef.current = selectedProfile?.id ?? null;
  }, [selectedProfile]);

  const loadBadges = useCallback(async () => {
    setLoading(true);

    try {
      const [definitionsResult, automationResult] = await Promise.all([
        listBadgeDefinitions({
          includeInactive: true,
        }),
        getBadgeAutomationOverview(),
      ]);

      if (!definitionsResult.success) {
        toast.error(definitionsResult.error || "Failed to load badges");
        return;
      }

      setBadges(definitionsResult.badges || []);

      if (automationResult.success) {
        setAutomationRecords(
          (automationResult.definitions || []) as BadgeAutomationAdminRecord[],
        );
        setAutomationTotals(automationResult.totals);
      } else {
        toast.error(
          automationResult.error || "Failed to load badge automation state",
        );
      }
    } catch (error) {
      console.error("Failed to load badges:", error);
      toast.error("Something went wrong while loading badges");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBadges();
  }, [loadBadges]);

  const loadProfileBadges = useCallback(
    async (
      profileId: string,
      options?: {
        showError?: boolean;
      },
    ) => {
      const requestId = ++profileBadgesRequestRef.current;

      try {
        const result = await listProfileBadgesForAdmin(profileId);

        /*
         * Ignore stale requests.
         *
         * Example:
         * User A selected
         * User B selected immediately after
         * A responds after B
         *
         * Without this check, A could overwrite
         * the badges currently shown for B.
         */
        if (requestId !== profileBadgesRequestRef.current) {
          return false;
        }

        if (!result.success) {
          if (options?.showError !== false) {
            toast.error(result.error || "Failed to load profile badges");
          }

          return false;
        }

        setSelectedProfileBadges(result.badges || []);

        return true;
      } catch (error) {
        if (requestId !== profileBadgesRequestRef.current) {
          return false;
        }

        console.error("Failed to load profile badges:", error);

        if (options?.showError !== false) {
          toast.error("Something went wrong while loading profile badges");
        }

        return false;
      }
    },
    [],
  );

  const runProfileSearch = useCallback(
    async ({
      query,
      offset,
      append,
      showError,
    }: {
      query: string;
      offset: number;
      append: boolean;
      showError: boolean;
    }) => {
      const requestId = ++profileSearchRequestRef.current;

      if (offset > 0) {
        setLoadingMoreProfiles(true);
      } else {
        setSearchingProfiles(true);
      }

      try {
        const result = await searchProfilesForBadgeAdmin(
          query,
          PROFILE_PAGE_SIZE,
          offset,
        );

        if (requestId !== profileSearchRequestRef.current) {
          return;
        }

        if (!result.success) {
          if (showError) {
            toast.error(result.error || "Failed to search profiles");
          }

          if (!append) {
            setProfiles([]);
            setHasMoreProfiles(false);
            setProfileOffset(0);
          }

          return;
        }

        const nextBatch = (result.profiles || []) as ProfileSearchResult[];

        setHasMoreProfiles(Boolean(result.hasMore));

        setProfileOffset(result.nextOffset || offset + nextBatch.length);

        if (append) {
          setProfiles((previous) => {
            const byId = new Map(
              previous.map((profile) => [profile.id, profile]),
            );

            for (const profile of nextBatch) {
              byId.set(profile.id, profile);
            }

            return Array.from(byId.values());
          });
        } else {
          setProfiles(nextBatch);
        }
      } catch (error) {
        if (requestId !== profileSearchRequestRef.current) {
          return;
        }

        console.error("Failed to search profiles:", error);

        if (showError) {
          toast.error("Something went wrong while searching profiles");
        }

        if (!append) {
          setProfiles([]);
          setHasMoreProfiles(false);
          setProfileOffset(0);
        }
      } finally {
        /*
         * Only the most recent request
         * may control the current loader.
         */
        if (requestId === profileSearchRequestRef.current) {
          setSearchingProfiles(false);

          setLoadingMoreProfiles(false);
        }
      }
    },
    [],
  );

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const badge of badges) {
      unique.add((badge.category || "general").toLowerCase());
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [badges]);

  const automationBySlug = useMemo(
    () =>
      new Map(
        automationRecords.map((record) => [record.slug, record] as const),
      ),
    [automationRecords],
  );

  const filteredBadges = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();

    return badges.filter((badge) => {
      if (catalogStatus === "active" && badge.is_active === false) return false;
      if (catalogStatus === "inactive" && badge.is_active !== false)
        return false;
      if (
        catalogCategory !== "all" &&
        (badge.category || "general").toLowerCase() !== catalogCategory
      ) {
        return false;
      }

      const automationRecord = automationBySlug.get(badge.slug);
      const awardingMode =
        automationRecord?.automation.mode === "automatic"
          ? "automatic"
          : "manual";

      if (catalogAwarding !== "all" && awardingMode !== catalogAwarding) {
        return false;
      }

      if (!query) return true;

      return [badge.slug, badge.label, badge.category, badge.description || ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [
    badges,
    catalogQuery,
    catalogStatus,
    catalogCategory,
    catalogAwarding,
    automationBySlug,
  ]);

  const activeBadgeOptions = useMemo(
    () =>
      badges.filter(
        (badge) =>
          badge.is_active !== false &&
          automationBySlug.get(badge.slug)?.automation.mode !== "automatic",
      ),
    [automationBySlug, badges],
  );

  const alreadyAwarded = useMemo(
    () =>
      selectedProfileBadges.some(
        (badge) => badge.slug === selectedAwardBadgeSlug,
      ),
    [selectedProfileBadges, selectedAwardBadgeSlug],
  );

  const catalogMetrics = useMemo(() => {
    const active = badges.filter((badge) => badge.is_active !== false).length;

    return {
      total: badges.length,
      active,
      automatic: automationRecords.filter(
        (record) => record.automation.mode === "automatic",
      ).length,
      manual: automationRecords.filter(
        (record) => record.automation.mode !== "automatic",
      ).length,
    };
  }, [automationRecords, badges]);


  const currentBadgeFormSnapshot = getBadgeFormSnapshot(form);

  const hasUnsavedBadgeChanges =
    editorMode !== "idle" &&
    currentBadgeFormSnapshot !== initialBadgeFormSnapshotRef.current;

  const closeBadgeEditor = () => {
    setSelectedBadgeSlug(null);
    setEditorMode("idle");

    const emptyForm = {
      ...EMPTY_FORM,
    };

    setForm(emptyForm);

    initialBadgeFormSnapshotRef.current = getBadgeFormSnapshot(emptyForm);
  };

  const openNewBadgeEditor = () => {
    const emptyForm = {
      ...EMPTY_FORM,
    };

    setSelectedBadgeSlug(null);
    setEditorMode("create");
    setForm(emptyForm);

    initialBadgeFormSnapshotRef.current = getBadgeFormSnapshot(emptyForm);
  };

  const openExistingBadgeEditor = (badge: BadgeDefinitionRecord) => {
    const nextForm = badgeRecordToForm(
      badge,
      automationBySlug.get(badge.slug),
    );

    setSelectedBadgeSlug(badge.slug);
    setEditorMode("edit");
    setForm(nextForm);

    initialBadgeFormSnapshotRef.current = getBadgeFormSnapshot(nextForm);
  };

  const requestBadgeEditorAction = (action: () => void) => {
    if (hasUnsavedBadgeChanges) {
      pendingBadgeEditorActionRef.current = action;

      setDiscardBadgeChangesOpen(true);
      return;
    }

    action();
  };

  const confirmDiscardBadgeChanges = () => {
    const action = pendingBadgeEditorActionRef.current;

    pendingBadgeEditorActionRef.current = null;

    setDiscardBadgeChangesOpen(false);

    action?.();
  };

  const cancelDiscardBadgeChanges = () => {
    pendingBadgeEditorActionRef.current = null;

    setDiscardBadgeChangesOpen(false);
  };

  const handleSubmitBadge = async () => {
    if (editorMode === "idle") {
      return;
    }

    const normalizedSortOrder = form.sortOrder.trim();

    const sortOrderValue = Number(normalizedSortOrder);

    if (!normalizedSortOrder || Number.isNaN(sortOrderValue)) {
      toast.error("Sort order must be a valid number");
      return;
    }

    setSavingBadge(true);

    try {
      const input = {
        slug: form.slug,
        label: form.label,
        description: form.description,
        icon: form.icon,
        color: form.color,
        category: form.category,
        sortOrder: Math.trunc(sortOrderValue),
        isActive: form.isActive,
      };

      const result =
        editorMode === "edit" && selectedBadgeSlug
          ? await updateBadgeDefinition(selectedBadgeSlug, input)
          : await createBadgeDefinition(input);

      if (!result.success) {
        toast.error(result.error || "Failed to save badge");
        return;
      }

      const savedBadge = result.badge;

      const savedSlug =
        savedBadge?.slug || input.slug || selectedBadgeSlug || "";

      const automationThreshold = Number(form.automationThreshold);

      const automationResult = await updateBadgeAutomationConfig({
        slug: savedSlug,
        mode: form.awardMode,
        type: form.automationType,
        metric: form.automationMetric,
        threshold: Number.isFinite(automationThreshold)
          ? automationThreshold
          : undefined,
        before: form.automationBefore,
        sticky: form.automationSticky,
      });

      if (!automationResult.success) {
        toast.error(
          automationResult.error ||
            "Badge saved, but automation settings could not be updated",
        );
        await loadBadges();
        return;
      }

      const savedForm = {
        ...form,
        slug: savedSlug,
        sortOrder: String(input.sortOrder),
      };

      setSelectedBadgeSlug(savedForm.slug);

      setEditorMode("edit");

      setForm(savedForm);

      initialBadgeFormSnapshotRef.current = getBadgeFormSnapshot(savedForm);

      toast.success(
        editorMode === "create" ? "Badge created" : "Badge updated",
      );

      await loadBadges();
    } catch (error) {
      console.error("Failed to save badge:", error);

      toast.error("Something went wrong while saving the badge");
    } finally {
      setSavingBadge(false);
    }
  };

  const handleReconcileAutomaticBadges = async () => {
    setReconcilingAutomation(true);

    try {
      const result = await reconcileAutomaticBadges();

      if (!result.success) {
        toast.error(result.error || "Failed to reconcile automatic badges");
        return;
      }

      toast.success(
        result.awarded > 0
          ? `${result.awarded} automatic badge${
              result.awarded === 1 ? "" : "s"
            } awarded`
          : "Automatic badges are already up to date",
      );

      await loadBadges();

      if (selectedProfile) {
        await loadProfileBadges(selectedProfile.id, {
          showError: false,
        });
      }
    } catch (error) {
      console.error("Failed to reconcile automatic badges:", error);
      toast.error("Something went wrong while reconciling automatic badges");
    } finally {
      setReconcilingAutomation(false);
    }
  };

  const handleSearchProfiles = useCallback(
    async (queryOverride?: string) => {
      const queryValue = String(queryOverride ?? profileQuery).trim();
      await runProfileSearch({
        query: queryValue,
        offset: 0,
        append: false,
        showError: true,
      });
    },
    [profileQuery, runProfileSearch],
  );

  useEffect(() => {
    if (activeSection !== "awards") {
      return;
    }

    void handleSearchProfiles(profileQuery);
  }, [activeSection, profileQuery, handleSearchProfiles]);

  const handleLoadMoreProfiles = useCallback(async () => {
    if (loadingMoreProfiles || searchingProfiles || !hasMoreProfiles) {
      return;
    }

    await runProfileSearch({
      query: profileQuery.trim(),
      offset: profileOffset,
      append: true,
      showError: true,
    });
  }, [
    hasMoreProfiles,
    loadingMoreProfiles,
    profileOffset,
    profileQuery,
    runProfileSearch,
    searchingProfiles,
  ]);

  const shouldConstrainCatalogList = filteredBadges.length > 7;
  const shouldConstrainAwardList = selectedProfileBadges.length > 8;

  const refreshSelectedProfileBadges = useCallback(async () => {
    if (!selectedProfile) {
      return;
    }

    setRefreshingProfileBadges(true);

    try {
      await loadProfileBadges(selectedProfile.id);
    } finally {
      setRefreshingProfileBadges(false);
    }
  }, [loadProfileBadges, selectedProfile]);

  const handleSelectProfile = async (profile: ProfileSearchResult) => {
    if (selectedProfile?.id === profile.id) {
      return;
    }

    /*
     * Invalidate any request that belonged
     * to the previously selected profile.
     */
    profileBadgesRequestRef.current += 1;

    setSelectedProfile(profile);

    setSelectedProfileBadges([]);
    setSelectedAwardBadgeSlug("");
    setAwardNote("");
    setBadgePendingRevoke(null);

    await loadProfileBadges(profile.id);
  };

  useEffect(() => {
    if (!selectedProfile) {
      return;
    }

    const profileId = selectedProfile.id;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadProfileBadges(profileId, {
          showError: false,
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadProfileBadges, selectedProfile]);

  const handleAwardBadge = async () => {
    if (!selectedProfile || !selectedAwardBadgeSlug) {
      toast.error("Pick a profile and badge first");
      return;
    }

    if (alreadyAwarded) {
      toast.error("That profile already has this badge");
      return;
    }

    const profileId = selectedProfile.id;

    const badgeSlug = selectedAwardBadgeSlug;

    const note = awardNote;

    setSubmittingAward(true);

    try {
      const result = await awardProfileBadge({
        profileId,
        badgeSlug,
        note,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to award badge");
        return;
      }

      /*
       * The award succeeded for the profile
       * that started this request.
       *
       * Only update the visible workspace
       * if that same profile is still selected.
       */
      if (selectedProfileIdRef.current === profileId) {
        setSelectedProfileBadges(result.badges || []);

        setSelectedAwardBadgeSlug("");
        setAwardNote("");
      }

      toast.success("Badge awarded");
    } catch (error) {
      console.error("Failed to award badge:", error);

      toast.error("Something went wrong while awarding the badge");
    } finally {
      setSubmittingAward(false);
    }
  };

  const handleConfirmRevokeBadge = async () => {
    if (!selectedProfile || !badgePendingRevoke) {
      return;
    }

    const profileId = selectedProfile.id;

    const badgeSlug = badgePendingRevoke.slug;

    setRevokingSlug(badgeSlug);

    try {
      const result = await revokeProfileBadge(profileId, badgeSlug);

      if (!result.success) {
        toast.error(result.error || "Failed to revoke badge");

        return;
      }

      /*
       * Do not allow a response from the
       * previously selected profile to
       * overwrite the current workspace.
       */
      if (selectedProfileIdRef.current === profileId) {
        setSelectedProfileBadges(result.badges || []);

        setBadgePendingRevoke(null);
      }

      toast.success("Badge revoked");
    } catch (error) {
      console.error("Failed to revoke badge:", error);

      toast.error("Something went wrong while revoking the badge");
    } finally {
      setRevokingSlug(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================
        PAGE HEADER + INTERNAL NAVIGATION
    ========================================================= */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />

            <h2 className="text-lg font-semibold">Badge Management</h2>
          </div>

          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Define badge rules, monitor automatic awards, and keep manual
            recognition available for staff-only cases.
          </p>
        </div>

        <Tabs
          value={activeSection}
          onValueChange={(value) => {
            const nextSection = value as "catalog" | "awards";

            if (nextSection === activeSection) {
              return;
            }

            if (nextSection === "awards" && editorMode !== "idle") {
              requestBadgeEditorAction(() => {
                closeBadgeEditor();
                setActiveSection(nextSection);
              });

              return;
            }

            setActiveSection(nextSection);
          }}
        >
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl border bg-muted/25 p-1.5">
            <TabsTrigger
              value="catalog"
              className="min-w-0 cursor-pointer rounded-xl px-3 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:px-4"
            >
              <Award className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">Catalog</span>
            </TabsTrigger>

            <TabsTrigger
              value="awards"
              className="min-w-0 cursor-pointer rounded-xl px-3 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm sm:px-4"
            >
              <UserRound className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">Awards</span>
            </TabsTrigger>
          </TabsList>

          {/* =====================================================
            CATALOG TAB
        ===================================================== */}
          <TabsContent
            value="catalog"
            className="mt-4 space-y-5 sm:mt-6 sm:space-y-6"
          >
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                {
                  label: "Total badges",
                  value: catalogMetrics.total,
                  icon: Award,
                  helper: "Definitions in the catalog",
                },
                {
                  label: "Automatic",
                  value: catalogMetrics.automatic,
                  icon: Sparkles,
                  helper: "Awarded from earning rules",
                },
                {
                  label: "Manual",
                  value: catalogMetrics.manual,
                  icon: UserRound,
                  helper: "Staff-managed recognition",
                },
                {
                  label: "Active",
                  value: catalogMetrics.active,
                  icon: Check,
                  helper: "Currently available badges",
                },
              ].map((metric) => {
                const Icon = metric.icon;

                return (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">
                          {metric.label}
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                          {metric.value}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {metric.helper}
                        </p>
                      </div>

                      <div className="rounded-xl border border-primary/15 bg-primary/10 p-2 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/[0.035] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <WandSparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">
                      Automatic badge engine
                    </p>
                  </div>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                    Rules are evaluated when relevant profile or resource data
                    changes. Achievement badges stay awarded once earned.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleReconcileAutomaticBadges()}
                  disabled={reconcilingAutomation}
                  className="w-full cursor-pointer sm:w-auto"
                >
                  {reconcilingAutomation ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Reconcile now
                </Button>
              </div>
            </div>

            {/* Catalog + Editor */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
              {/* =================================================
                BADGE CATALOG
            ================================================= */}
              <Card className="min-w-0 overflow-hidden">
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Award className="h-5 w-5 text-primary" />
                        Badge Catalog
                      </CardTitle>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Search and filter badge definitions, then select one to
                        edit it.
                      </p>
                    </div>

                    <div className="grid gap-2 sm:flex sm:items-center">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          requestBadgeEditorAction(openNewBadgeEditor)
                        }
                        className="w-full cursor-pointer sm:w-auto"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        New Badge
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadBadges}
                        disabled={loading}
                        className="w-full cursor-pointer sm:w-auto"
                      >
                        <RefreshCw
                          className={cn(
                            "mr-2 h-4 w-4",
                            loading && "animate-spin",
                          )}
                        />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_160px_160px]">
                    <SearchInput
                      value={catalogQuery}
                      onChange={setCatalogQuery}
                      placeholder="Search by label, slug, category..."
                      debounce={120}
                      className="w-full sm:col-span-2 xl:col-span-1"
                    />

                    <Select
                      value={catalogStatus}
                      onValueChange={(value) =>
                        setCatalogStatus(value as CatalogStatusFilter)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>

                        <SelectItem value="active">Active only</SelectItem>

                        <SelectItem value="inactive">Inactive only</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={catalogCategory}
                      onValueChange={setCatalogCategory}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>

                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={catalogAwarding}
                      onValueChange={(value) =>
                        setCatalogAwarding(value as CatalogAwardingFilter)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Awarding" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="all">All awarding</SelectItem>
                        <SelectItem value="automatic">Automatic</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>

                <CardContent>
                  {loading ? (
                    <div className="flex min-h-56 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <ScrollArea
                      className={cn(
                        "pr-3",
                        shouldConstrainCatalogList
                          ? "max-h-[min(42rem,62vh)]"
                          : "max-h-none",
                      )}
                    >
                      <div
                        className={cn(
                          "space-y-3",
                          filteredBadges.length === 0 && "min-h-56",
                        )}
                      >
                        {filteredBadges.map((badge) => {
                          const Icon = getProfileBadgeIcon(badge.icon);

                          const isSelected = selectedBadgeSlug === badge.slug;
                          const automationRecord = automationBySlug.get(
                            badge.slug,
                          );
                          const isAutomatic =
                            automationRecord?.automation.mode === "automatic";

                          const stateColor = badge.is_active
                            ? "text-emerald-600"
                            : "text-muted-foreground";

                          return (
                            <button
                              key={badge.slug}
                              type="button"
                              onClick={() => {
                                if (
                                  editorMode === "edit" &&
                                  selectedBadgeSlug === badge.slug
                                ) {
                                  return;
                                }

                                requestBadgeEditorAction(() =>
                                  openExistingBadgeEditor(badge),
                                );
                              }}
                              className={cn(
                                "w-full rounded-2xl border p-4 text-left transition-colors",
                                isSelected && editorMode === "edit"
                                  ? "border-primary bg-primary/5"
                                  : "border-border/70 hover:bg-muted/40",
                              )}
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
                                      style={{
                                        borderColor: badge.color,
                                        backgroundColor: `${badge.color}14`,
                                      }}
                                    >
                                      <Icon
                                        className="h-4 w-4"
                                        style={{
                                          color: badge.color,
                                        }}
                                      />
                                    </div>

                                    <div className="min-w-0">
                                      <p className="truncate font-medium">
                                        {badge.label}
                                      </p>

                                      <p className="truncate text-xs text-muted-foreground">
                                        {badge.slug}
                                      </p>
                                    </div>
                                  </div>

                                  {badge.description && (
                                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                                      {badge.description}
                                    </p>
                                  )}
                                </div>

                                <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                                  {isSelected && editorMode === "edit" && (
                                    <Badge className="gap-1 text-xs">
                                      <Pencil className="h-3 w-3" />
                                      Editing
                                    </Badge>
                                  )}

                                  <Badge
                                    variant={isAutomatic ? "secondary" : "outline"}
                                    className="gap-1 text-xs"
                                  >
                                    {isAutomatic ? (
                                      <Sparkles className="h-3 w-3" />
                                    ) : (
                                      <UserRound className="h-3 w-3" />
                                    )}
                                    {isAutomatic ? "Automatic" : "Manual"}
                                  </Badge>

                                  <Badge variant="outline" className="text-xs">
                                    {badge.category}
                                  </Badge>

                                  <Badge
                                    variant="outline"
                                    className={cn("text-xs", stateColor)}
                                  >
                                    {badge.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>{getAutomationRuleSummary(automationRecord)}</span>
                                <span>•</span>
                                <span>
                                  {automationRecord?.awards.total ?? 0} award
                                  {(automationRecord?.awards.total ?? 0) === 1
                                    ? ""
                                    : "s"}
                                </span>
                                <span>•</span>
                                <span>Sort {badge.sort_order}</span>
                              </div>
                            </button>
                          );
                        })}

                        {filteredBadges.length === 0 && (
                          <Empty className="rounded-2xl border border-dashed bg-card/30 px-4 py-8">
                            <EmptyContent>
                              <EmptyMedia variant="icon">
                                <Search className="h-5 w-5" />
                              </EmptyMedia>

                              <EmptyTitle>
                                No badges match this filter
                              </EmptyTitle>

                              <EmptyDescription>
                                Try another search term or reset category and
                                status filters.
                              </EmptyDescription>
                            </EmptyContent>
                          </Empty>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* =================================================
    BADGE EDITOR
================================================= */}
              <Card className="min-w-0 self-start lg:sticky lg:top-4">
                {editorMode === "idle" ? (
                  <CardContent className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-primary/5">
                      <Award className="h-6 w-6 text-primary" />
                    </div>

                    <h3 className="mt-4 text-base font-semibold">
                      No badge selected
                    </h3>

                    <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                      Select a badge from the catalog to edit it, or create a
                      new badge.
                    </p>

                    <Button
                      type="button"
                      size="sm"
                      onClick={openNewBadgeEditor}
                      className="mt-5 cursor-pointer"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Badge
                    </Button>
                  </CardContent>
                ) : (
                  <>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Pencil className="h-5 w-5 text-primary" />

                            {editorMode === "edit" ? "Edit Badge" : "New Badge"}
                          </CardTitle>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {editorMode === "edit"
                              ? "Update appearance, availability, and how this badge is earned."
                              : "Create a reusable badge and choose whether staff or Forgeworks awards it."}
                          </p>
                        </div>

                        {editorMode === "edit" && (
                          <Badge variant="outline" className="shrink-0">
                            {form.slug}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-5">
                      {/* Label + Slug */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="badge-label">Label</Label>

                          <Input
                            id="badge-label"
                            value={form.label}
                            onChange={(event) => {
                              const nextLabel = event.target.value;

                              setForm((current) => {
                                const previousSlug = slugify(current.label);

                                const shouldAutofillSlug =
                                  editorMode === "create" &&
                                  (!current.slug ||
                                    current.slug === previousSlug);

                                return {
                                  ...current,
                                  label: nextLabel,
                                  slug: shouldAutofillSlug
                                    ? slugify(nextLabel)
                                    : current.slug,
                                };
                              });
                            }}
                            placeholder="Early Adopter"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="badge-slug">Slug</Label>

                          <Input
                            id="badge-slug"
                            value={form.slug}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                slug: event.target.value,
                              }))
                            }
                            placeholder="early_adopter"
                            disabled={editorMode === "edit"}
                          />

                          {editorMode === "edit" && (
                            <p className="text-[11px] text-muted-foreground">
                              The slug cannot be changed after the badge is
                              created.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label htmlFor="badge-description">Description</Label>

                        <Textarea
                          id="badge-description"
                          value={form.description}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          placeholder="Explain what this badge represents and how users can earn it"
                          className="min-h-24"
                        />
                      </div>

                      {/* Icon + Color */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="badge-icon">Icon</Label>

                          <Select
                            value={form.icon}
                            onValueChange={(value) =>
                              setForm((current) => ({
                                ...current,
                                icon: value,
                              }))
                            }
                          >
                            <SelectTrigger id="badge-icon" className="w-full">
                              <SelectValue placeholder="Select icon" />
                            </SelectTrigger>

                            <SelectContent>
                              {getProfileBadgeIconOptions().map((iconName) => {
                                const Icon = getProfileBadgeIcon(iconName);

                                return (
                                  <SelectItem key={iconName} value={iconName}>
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-3.5 w-3.5" />
                                      <span>{iconName}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <CustomColorPicker
                          label="Badge color"
                          value={form.color}
                          onChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              color: value,
                            }))
                          }
                        />
                      </div>

                      {/* Category + Sort */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="badge-category">Category</Label>

                          <Input
                            id="badge-category"
                            value={form.category}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                category: event.target.value,
                              }))
                            }
                            placeholder="community"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="badge-order">Sort order</Label>

                          <Input
                            id="badge-order"
                            value={form.sortOrder}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                sortOrder: event.target.value,
                              }))
                            }
                            inputMode="numeric"
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold">
                              Awarding & automation
                            </p>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            Manual badges are controlled by staff. Automatic
                            badges are awarded when their earning rule becomes
                            true.
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                awardMode: "manual",
                              }))
                            }
                            className={cn(
                              "rounded-xl border p-3 text-left transition-colors",
                              form.awardMode === "manual"
                                ? "border-primary bg-primary/5"
                                : "border-border/70 hover:bg-muted/30",
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="rounded-lg bg-muted p-2">
                                <UserRound className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Manual</p>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                                  Staff decides who receives this badge.
                                </p>
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                awardMode: "automatic",
                              }))
                            }
                            className={cn(
                              "rounded-xl border p-3 text-left transition-colors",
                              form.awardMode === "automatic"
                                ? "border-primary bg-primary/5"
                                : "border-border/70 hover:bg-muted/30",
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Automatic</p>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                                  Forgeworks awards it when the rule is met.
                                </p>
                              </div>
                            </div>
                          </button>
                        </div>

                        {form.awardMode === "automatic" && (
                          <div className="space-y-4 rounded-xl border border-primary/15 bg-primary/[0.025] p-4">
                            <div className="space-y-2">
                              <Label>Rule type</Label>
                              <Select
                                value={form.automationType}
                                onValueChange={(value) =>
                                  setForm((current) => ({
                                    ...current,
                                    automationType: value as
                                      | "metric_threshold"
                                      | "created_before",
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="metric_threshold">
                                    Metric reaches a threshold
                                  </SelectItem>
                                  <SelectItem value="created_before">
                                    Account created before a date
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {form.automationType === "metric_threshold" ? (
                              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
                                <div className="space-y-2">
                                  <Label>Metric</Label>
                                  <Select
                                    value={form.automationMetric}
                                    onValueChange={(value) =>
                                      setForm((current) => ({
                                        ...current,
                                        automationMetric:
                                          value as BadgeAutomationMetric,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-80">
                                      {BADGE_AUTOMATION_METRICS.map((metric) => (
                                        <SelectItem
                                          key={metric.value}
                                          value={metric.value}
                                        >
                                          <div className="min-w-0">
                                            <p className="text-sm">
                                              {metric.label}
                                            </p>
                                            <p className="max-w-xs whitespace-normal text-[11px] text-muted-foreground">
                                              {metric.description}
                                            </p>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="badge-threshold">
                                    Threshold
                                  </Label>
                                  <Input
                                    id="badge-threshold"
                                    type="number"
                                    min={0}
                                    value={form.automationThreshold}
                                    onChange={(event) =>
                                      setForm((current) => ({
                                        ...current,
                                        automationThreshold:
                                          event.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Label htmlFor="badge-before">
                                  Account created before
                                </Label>
                                <Input
                                  id="badge-before"
                                  type="date"
                                  value={form.automationBefore}
                                  onChange={(event) =>
                                    setForm((current) => ({
                                      ...current,
                                      automationBefore: event.target.value,
                                    }))
                                  }
                                />
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                  Useful for cohorts such as Early Adopter. Pick
                                  the actual cutoff date instead of hard-coding
                                  it in application code.
                                </p>
                              </div>
                            )}

                            <div className="flex items-start justify-between gap-4 rounded-lg border bg-background/70 px-3 py-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  Keep once earned
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                  Recommended for achievements. Users keep the
                                  badge even if their current count later drops.
                                </p>
                              </div>

                              <Switch
                                checked={form.automationSticky}
                                onCheckedChange={(checked) =>
                                  setForm((current) => ({
                                    ...current,
                                    automationSticky: checked,
                                  }))
                                }
                                className="shrink-0"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Preview */}
                      <div className="min-w-0 rounded-xl border border-border/70 bg-card/60 p-4">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">Live preview</p>

                            <p className="text-xs text-muted-foreground">
                              This is how the badge label and icon will appear.
                            </p>
                          </div>

                          <div className="min-w-0 sm:max-w-[55%]">
                            <BadgePreview badge={form} />
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-4 rounded-lg border bg-background/70 px-3 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">Active status</p>

                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                              Inactive badges stay saved but cannot be normally
                              awarded to profiles.
                            </p>
                          </div>

                          <Switch
                            checked={form.isActive}
                            onCheckedChange={(checked) =>
                              setForm((current) => ({
                                ...current,
                                isActive: checked,
                              }))
                            }
                            className="shrink-0"
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="border-t pt-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <p className="text-xs text-muted-foreground sm:mr-auto">
                            {editorMode === "create"
                              ? hasUnsavedBadgeChanges
                                ? "Ready to create"
                                : "Start filling out the badge"
                              : hasUnsavedBadgeChanges
                                ? "Unsaved changes"
                                : "All changes saved"}
                          </p>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              requestBadgeEditorAction(closeBadgeEditor)
                            }
                            disabled={savingBadge}
                            className="w-full cursor-pointer sm:w-auto"
                          >
                            Cancel
                          </Button>

                          <Button
                            type="button"
                            onClick={handleSubmitBadge}
                            disabled={savingBadge || !hasUnsavedBadgeChanges}
                            className="w-full cursor-pointer sm:w-auto"
                          >
                            {savingBadge ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-2 h-4 w-4" />
                            )}

                            {editorMode === "edit"
                              ? "Save Changes"
                              : "Create Badge"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* =====================================================
    AWARDS TAB
===================================================== */}
          <TabsContent
            value="awards"
            className="mt-4 space-y-5 sm:mt-6 sm:space-y-6"
          >
            {/* Page heading */}
            <div>
              <div className="flex items-center gap-2">
                <Layers3 className="h-5 w-5 text-primary" />

                <h3 className="text-base font-semibold sm:text-lg">
                  Awards & Overrides
                </h3>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                Automatic rules handle earned badges. Use this workspace for
                manual recognition, exceptions, and reviewing a user’s awards.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border bg-card/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Automatic definitions
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {automationTotals.automatic}
                    </p>
                  </div>
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="rounded-2xl border bg-card/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Automatic awards
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {automationTotals.automaticAwards}
                    </p>
                  </div>
                  <WandSparkles className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="rounded-2xl border bg-card/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Manual definitions
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {automationTotals.manual}
                    </p>
                  </div>
                  <UserRound className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Main awards workspace */}
            <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
              {/* =================================================
        PROFILES PANEL
    ================================================= */}
              <Card className="min-w-0 overflow-hidden lg:sticky lg:top-4">
                <CardHeader className="gap-4 border-b">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <UserRound className="h-4 w-4 text-primary" />
                      Profiles
                    </CardTitle>

                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Search for a user to manage their badge awards.
                    </p>
                  </div>

                  <SearchInput
                    value={profileQuery}
                    onChange={setProfileQuery}
                    placeholder="Search profiles..."
                    className="w-full"
                    debounce={120}
                  />

                  <div className="flex min-h-5 items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {searchingProfiles
                        ? "Searching..."
                        : `${profiles.length} profile${
                            profiles.length === 1 ? "" : "s"
                          } shown`}
                    </p>

                    {searchingProfiles && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {/* 
          On mobile this grows naturally with the page.
          On desktop it becomes a stable scrollable navigation panel.
        */}
                  <ScrollArea className="lg:h-[min(620px,calc(100vh-300px))] lg:min-h-[420px]">
                    <div className="space-y-2 p-3">
                      {profiles.map((profile) => {
                        const isSelected = selectedProfile?.id === profile.id;

                        const displayName =
                          profile.display_name ||
                          profile.username ||
                          profile.slug ||
                          "Unnamed user";

                        return (
                          <button
                            key={profile.id}
                            type="button"
                            onClick={() => void handleSelectProfile(profile)}
                            className={cn(
                              "flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border/70 hover:border-border hover:bg-muted/40",
                            )}
                          >
                            <Avatar className="h-10 w-10 shrink-0 border">
                              <AvatarImage
                                src={profile.avatar_url || undefined}
                                alt=""
                              />

                              <AvatarFallback>
                                <UserRound className="h-4 w-4 text-muted-foreground" />
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">
                                {displayName}
                              </p>

                              {profile.username && (
                                <p className="truncate text-xs text-muted-foreground">
                                  @{profile.username}
                                </p>
                              )}
                            </div>

                            {isSelected && (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <Check className="h-3.5 w-3.5 text-primary" />
                              </div>
                            )}
                          </button>
                        );
                      })}

                      {!searchingProfiles && profiles.length === 0 && (
                        <Empty className="min-h-56 rounded-xl border border-dashed bg-card/30 px-4 py-8">
                          <EmptyContent>
                            <EmptyMedia variant="icon">
                              <UserRound className="h-5 w-5" />
                            </EmptyMedia>

                            <EmptyTitle>No profiles found</EmptyTitle>

                            <EmptyDescription>
                              Try another search term to find a user.
                            </EmptyDescription>
                          </EmptyContent>
                        </Empty>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Profiles footer */}
                  {profiles.length > 0 && (
                    <div className="flex flex-col gap-2 border-t bg-muted/10 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          Showing {profiles.length} profile
                          {profiles.length === 1 ? "" : "s"}
                        </p>

                        {hasMoreProfiles && (
                          <span className="text-[11px] text-muted-foreground">
                            More available
                          </span>
                        )}
                      </div>

                      {hasMoreProfiles && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleLoadMoreProfiles()}
                          disabled={loadingMoreProfiles}
                          className="w-full cursor-pointer"
                        >
                          {loadingMoreProfiles ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="mr-2 h-4 w-4" />
                          )}
                          Load more profiles
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* =================================================
        USER AWARDS WORKSPACE
    ================================================= */}
              <Card className="min-w-0 overflow-hidden">
                {!selectedProfile ? (
                  /* ===============================================
            EMPTY USER STATE
        =============================================== */
                  <CardContent className="flex min-h-[520px] flex-col items-center justify-center px-6 py-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-primary/5">
                      <Shield className="h-7 w-7 text-primary" />
                    </div>

                    <h3 className="mt-5 text-lg font-semibold">
                      Select a profile
                    </h3>

                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                      Choose a profile from the list to inspect its current
                      badges and assign or revoke awards.
                    </p>
                  </CardContent>
                ) : (
                  <>
                    {/* ===============================================
              SELECTED PROFILE HEADER
          =============================================== */}
                    <CardHeader className="border-b">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-12 w-12 shrink-0 border">
                            <AvatarImage
                              src={selectedProfile.avatar_url || undefined}
                              alt=""
                            />

                            <AvatarFallback>
                              <UserRound className="h-5 w-5 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Selected Profile
                            </p>

                            <p className="mt-0.5 truncate text-base font-semibold">
                              {selectedProfile.display_name ||
                                selectedProfile.username ||
                                selectedProfile.slug ||
                                "Unnamed user"}
                            </p>

                            {selectedProfile.username && (
                              <p className="truncate text-xs text-muted-foreground">
                                @{selectedProfile.username}
                              </p>
                            )}
                          </div>
                        </div>

                        <Badge variant="outline" className="w-fit shrink-0">
                          {selectedProfileBadges.length} award
                          {selectedProfileBadges.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6 p-4 sm:p-5">
                      {/* ===============================================
                AWARD A BADGE
            =============================================== */}
                      <section className="space-y-4">
                        <div>
                          <p className="text-sm font-semibold">Award a Badge</p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Select an active badge and optionally leave an
                            internal admin note.
                          </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                          <div className="space-y-2">
                            <Label>Manual badge</Label>

                            <Select
                              value={selectedAwardBadgeSlug}
                              onValueChange={setSelectedAwardBadgeSlug}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a manual badge" />
                              </SelectTrigger>

                              <SelectContent className="max-h-72">
                                {activeBadgeOptions.map((badge) => {
                                  const Icon = getProfileBadgeIcon(badge.icon);

                                  return (
                                    <SelectItem
                                      key={badge.slug}
                                      value={badge.slug}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Icon
                                          className="h-3.5 w-3.5"
                                          style={{
                                            color: badge.color,
                                          }}
                                        />

                                        <span>{badge.label}</span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="award-note">Award note</Label>

                            <Textarea
                              id="award-note"
                              value={awardNote}
                              onChange={(event) =>
                                setAwardNote(event.target.value)
                              }
                              placeholder="Optional internal admin note"
                              className="min-h-20"
                            />
                          </div>
                        </div>

                        {alreadyAwarded && (
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                              This profile already has the selected badge.
                            </p>
                          </div>
                        )}

                        {activeBadgeOptions.length === 0 && (
                          <div className="rounded-lg border border-dashed bg-muted/10 px-3 py-3">
                            <p className="text-xs text-muted-foreground">
                              There are no active manual badges. Create one in
                              Catalog or change an existing badge to Manual.
                            </p>
                          </div>
                        )}

                        <Button
                          type="button"
                          onClick={handleAwardBadge}
                          disabled={
                            !selectedAwardBadgeSlug ||
                            submittingAward ||
                            alreadyAwarded
                          }
                          className="w-full cursor-pointer"
                        >
                          {submittingAward ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Award className="mr-2 h-4 w-4" />
                          )}
                          Award Badge
                        </Button>
                      </section>

                      <Separator />

                      {/* ===============================================
                CURRENT AWARDS
            =============================================== */}
                      <section className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">
                                Current Awards
                              </p>

                              <Badge variant="outline">
                                {selectedProfileBadges.length}
                              </Badge>
                            </div>

                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Automatic achievements and manual awards currently
                              attached to this profile.
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void refreshSelectedProfileBadges()}
                            disabled={refreshingProfileBadges}
                            className="w-full cursor-pointer sm:w-auto"
                          >
                            <RefreshCw
                              className={cn(
                                "mr-1.5 h-3.5 w-3.5",
                                refreshingProfileBadges && "animate-spin",
                              )}
                            />
                            Refresh
                          </Button>
                        </div>

                        {selectedProfileBadges.length > 0 ? (
                          <ScrollArea
                            className={cn(
                              shouldConstrainAwardList
                                ? "max-h-[min(28rem,50vh)]"
                                : "max-h-none",
                            )}
                          >
                            <div className="grid gap-2 pr-2 sm:grid-cols-2">
                              {selectedProfileBadges.map((badge) => (
                                <AwardedBadgePill
                                  key={`${badge.slug}-${badge.awardedAt || ""}`}
                                  badge={badge}
                                  revoking={revokingSlug === badge.slug}
                                  automatic={
                                    automationBySlug.get(badge.slug)?.automation
                                      .mode === "automatic"
                                  }
                                  onRevoke={() => setBadgePendingRevoke(badge)}
                                />
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <Empty className="rounded-xl border border-dashed bg-muted/10 px-4 py-8">
                            <EmptyContent>
                              <EmptyMedia variant="icon">
                                <Award className="h-5 w-5" />
                              </EmptyMedia>

                              <EmptyTitle>No badges awarded yet</EmptyTitle>

                              <EmptyDescription>
                                Select a badge above to give this profile its
                                first award.
                              </EmptyDescription>
                            </EmptyContent>
                          </Empty>
                        )}
                      </section>
                    </CardContent>
                  </>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        <AlertDialog
          open={discardBadgeChangesOpen}
          onOpenChange={(open) => {
            if (!open) {
              cancelDiscardBadgeChanges();
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>

              <AlertDialogDescription>
                You have changes that haven&apos;t been saved. Continuing will
                discard them.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={cancelDiscardBadgeChanges}
                className="w-full cursor-pointer sm:w-auto"
              >
                Keep Editing
              </AlertDialogCancel>

              <AlertDialogAction
                onClick={confirmDiscardBadgeChanges}
                className="w-full cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
              >
                Discard Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={!!badgePendingRevoke}
          onOpenChange={(open) => {
            if (!open && !revokingSlug) {
              setBadgePendingRevoke(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke this badge?</AlertDialogTitle>

              <AlertDialogDescription>
                {badgePendingRevoke ? (
                  <>
                    The badge <strong>{badgePendingRevoke.label}</strong> will
                    be removed from{" "}
                    <strong>
                      {selectedProfile?.display_name ||
                        selectedProfile?.username ||
                        "this profile"}
                    </strong>
                    . The badge definition itself will not be deleted.
                  </>
                ) : (
                  "This badge will be removed from the selected profile."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={!!revokingSlug}
                className="w-full cursor-pointer sm:w-auto"
              >
                Cancel
              </AlertDialogCancel>

              <AlertDialogAction
                type="button"
                disabled={!!revokingSlug}
                onClick={(event) => {
                  event.preventDefault();

                  void handleConfirmRevokeBadge();
                }}
                className="w-full cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
              >
                {revokingSlug ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Revoke Badge
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
