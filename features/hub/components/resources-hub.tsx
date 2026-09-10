"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MarkdownField,
  type MarkdownFieldHandle,
} from "@/features/markdown/components/markdown-field";
import {
  commitMarkdownImages,
  extractManagedMarkdownAssetPaths,
} from "@/features/markdown/lib/markdown-image-assets";
import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";
import Link from "next/link";
import {
  createResourceExcerpt,
  createResourceSlug,
  RESOURCE_TYPE_LABELS,
  type ResourceType,
} from "@/features/hub/resources/lib/resource-utils";
import { ResourceReviewDialog } from "@/features/hub/resources/components/resource-review-dialog";
import { removeMarkdownAssetsAction } from "@/features/markdown/actions/markdown-assets";
import { ResourceSuggestionDialog } from "@/features/hub/resources/components/resource-suggestion-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { CustomColorPicker } from "@/components/ui/custom-color-picker";
import {
  Plus,
  Pencil,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Trash2,
  BookOpen,
  ArrowRight,
  Globe,
  NotebookText,
  Layers3,
  Sparkles,
  Shield,
  Heart,
  Star,
  Info,
  Search,
  ShieldCheck,
  UserRound,
  Brain,
  Palette,
  Bot,
  PenLine,
  AppWindow,
  Folder,
  Lock,
  Server,
  Code,
  Send,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ResourceSectionRow = {
  id: string;
  title: string;
  description: string | null;
  icon_name: string | null;
  accent_color: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type ResourceEntryRow = {
  id: string;
  section_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  summary: string | null;
  resource_type:
    | "guide"
    | "article"
    | "tool"
    | "template"
    | "reference"
    | "other";

  url: string | null;
  label: string | null;
  contributor_user_id: string | null;
  source_submission_id: string | null;
  is_platform_pinned: boolean;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  contributor?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

type ResourceSectionFormState = {
  title: string;
  description: string;
  iconName: string;
  accentColor: string;
  isPublished: boolean;
};

type ResourceEntryFormState = {
  sectionId: string;
  title: string;
  excerpt: string;
  summary: string;
  url: string;
  resourceType:
    | "guide"
    | "article"
    | "tool"
    | "template"
    | "reference"
    | "other";

  isPlatformPinned: boolean;
  isPublished: boolean;
};

const RESOURCE_SECTION_STORAGE_KEY = "forgeworks-resources-section";
const emptySectionForm: ResourceSectionFormState = {
  title: "",
  description: "",
  iconName: "book-open",
  accentColor: "#7c3aed",
  isPublished: true,
};

const emptyEntryForm: ResourceEntryFormState = {
  sectionId: "",
  title: "",
  excerpt: "",
  summary: "",
  url: "",
  resourceType: "other",
  isPlatformPinned: false,
  isPublished: true,
};

type DeleteTarget =
  | { kind: "section"; id: string; title: string }
  | { kind: "entry"; id: string; title: string }
  | null;

const sectionIconOptions = [
  { value: "book-open", label: "Book", icon: BookOpen },
  { value: "heart", label: "Heart", icon: Heart },
  { value: "star", label: "Star", icon: Star },
  { value: "info", label: "Info", icon: Info },
  { value: "search", label: "Search", icon: Search },
  { value: "shield-check", label: "Shield Check", icon: ShieldCheck },
  { value: "user-round", label: "User Round", icon: UserRound },
  { value: "code", label: "Code", icon: Code },
  { value: "brain", label: "Brain", icon: Brain },
  { value: "palette", label: "Palette", icon: Palette },
  { value: "bot", label: "Bot", icon: Bot },
  { value: "pen-line", label: "Pen Line", icon: PenLine },
  { value: "app-window", label: "App Window", icon: AppWindow },
  { value: "folder", label: "Folder", icon: Folder },
  { value: "server", label: "Server", icon: Server },
  { value: "lock", label: "Lock", icon: Lock },
  { value: "globe", label: "Globe", icon: Globe },
  { value: "notebook-text", label: "Notebook", icon: NotebookText },
  { value: "layers-3", label: "Layers", icon: Layers3 },
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "shield", label: "Shield", icon: Shield },
];

const sectionIconMap = Object.fromEntries(
  sectionIconOptions.map((option) => [option.value, option.icon]),
) as Record<string, typeof BookOpen>;

export function ResourcesHub() {
  const [sections, setSections] = useState<ResourceSectionRow[]>([]);
  const [entries, setEntries] = useState<ResourceEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "all">("all");
  type ResourceStaffRole = "owner" | "moderator";

  const [staffRole, setStaffRole] = useState<ResourceStaffRole | null>(null);

  const canManageResources = staffRole === "owner" || staffRole === "moderator";
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [suggestionTargetEntry, setSuggestionTargetEntry] =
    useState<ResourceEntryRow | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [sectionForm, setSectionForm] =
    useState<ResourceSectionFormState>(emptySectionForm);
  const [entryForm, setEntryForm] =
    useState<ResourceEntryFormState>(emptyEntryForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  const entrySummaryMarkdownRef = useRef<MarkdownFieldHandle | null>(null);

  /**
   * Markdown that was successfully stored
   * before the current editing session.
   *
   * Used to determine which old images
   * became obsolete after Save.
   */
  const entryOriginalSummaryRef = useRef("");

  /**
   * Stable storage folder for the current
   * resource editing session.
   *
   * Existing entry → entry.id
   * New entry      → temporary stable UUID
   */
  const entryMarkdownAssetKeyRef = useRef("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const access = await getCurrentUserAccess(supabase);

      setAuthUserId(access.user?.id || null);

      let resolvedStaffRole: ResourceStaffRole | null = null;

      if (access.user) {
        const { data: staffProfile, error: staffProfileError } = await supabase
          .from("profiles")
          .select("staff_role, is_blocked")
          .eq("id", access.user.id)
          .maybeSingle();

        if (staffProfileError) {
          console.error(
            "Failed to load resource staff access:",
            staffProfileError,
          );
        }

        if (
          !staffProfile?.is_blocked &&
          (staffProfile?.staff_role === "owner" ||
            staffProfile?.staff_role === "moderator")
        ) {
          resolvedStaffRole = staffProfile.staff_role;
        }
      }

      setStaffRole(resolvedStaffRole);

      let sectionQuery = supabase
        .from("hub_resource_sections")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      let entryQuery = supabase
        .from("hub_resource_entries")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!resolvedStaffRole) {
        sectionQuery = sectionQuery.eq("is_published", true);
        entryQuery = entryQuery.eq("is_published", true);
      }

      const [
        { data: sectionData, error: sectionError },
        { data: entryData, error: entryError },
      ] = await Promise.all([sectionQuery, entryQuery]);

      if (sectionError) throw sectionError;
      if (entryError) throw entryError;

      const rawEntries = (entryData || []) as ResourceEntryRow[];

      const contributorIds = Array.from(
        new Set(
          rawEntries
            .map((entry) => entry.contributor_user_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      const contributorMap = new Map<
        string,
        {
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
        }
      >();

      if (contributorIds.length > 0) {
        const { data: contributors, error: contributorError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", contributorIds);

        if (contributorError) {
          console.error(
            "Failed to load resource contributors:",
            contributorError,
          );
        }

        for (const contributor of contributors || []) {
          contributorMap.set(contributor.id, {
            username: contributor.username,
            display_name: contributor.display_name,
            avatar_url: contributor.avatar_url,
          });
        }
      }

      const normalizedEntries = rawEntries.map((entry) => ({
        ...entry,

        contributor: entry.contributor_user_id
          ? contributorMap.get(entry.contributor_user_id) || null
          : null,
      }));

      setSections((sectionData || []) as ResourceSectionRow[]);

      setEntries(normalizedEntries);
    } catch (error: any) {
      console.error("Failed to load resources hub:", error);
      setSections([]);
      setEntries([]);
      toast.error(error.message || "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? null,
    [sections, selectedSectionId],
  );

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const searchedEntries = useMemo(() => {
    if (!normalizedSearchQuery) {
      return entries;
    }

    return entries.filter((entry) => {
      const section = sections.find(
        (candidate) => candidate.id === entry.section_id,
      );

      const searchableText = [
        entry.title,
        entry.excerpt,
        entry.summary,
        RESOURCE_TYPE_LABELS[entry.resource_type as ResourceType],
        section?.title,
        section?.description,
        entry.contributor?.username,
        entry.contributor?.display_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearchQuery);
    });
  }, [entries, sections, normalizedSearchQuery]);

  const visibleEntries = useMemo(() => {
    let result: ResourceEntryRow[];

    if (normalizedSearchQuery) {
      result = searchedEntries;
    } else if (!selectedSectionId) {
      result = entries;
    } else {
      result = entries.filter(
        (entry) => entry.section_id === selectedSectionId,
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((entry) => entry.resource_type === typeFilter);
    }

    return result;
  }, [
    entries,
    searchedEntries,
    normalizedSearchQuery,
    selectedSectionId,
    typeFilter,
  ]);

  const entryCountBySection = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      counts.set(entry.section_id, (counts.get(entry.section_id) || 0) + 1);
    });
    return counts;
  }, [entries]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (selectedSectionId) {
      localStorage.setItem(RESOURCE_SECTION_STORAGE_KEY, selectedSectionId);
    } else {
      localStorage.removeItem(RESOURCE_SECTION_STORAGE_KEY);
    }
  }, [selectedSectionId]);

  useEffect(() => {
    if (loading || hydrated) return;

    if (sections.length === 0) {
      setSelectedSectionId(null);
      setHydrated(true);
      return;
    }

    const savedSectionId = localStorage.getItem(RESOURCE_SECTION_STORAGE_KEY);

    const resolvedSection =
      sections.find((section) => section.id === savedSectionId) ?? sections[0];

    setSelectedSectionId(resolvedSection.id);
    setHydrated(true);
  }, [loading, hydrated, sections]);

  useEffect(() => {
    if (!selectedSectionId || sections.length === 0) {
      return;
    }

    const sectionExists = sections.some(
      (section) => section.id === selectedSectionId,
    );

    if (!sectionExists) {
      setSelectedSectionId(sections[0]?.id ?? null);
    }
  }, [selectedSectionId, sections]);

  const loadEntryMetrics = useCallback(async (entryIds: string[]) => {
    if (entryIds.length === 0) {
      setLikeCounts({});
      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("hub_resource_entry_reactions")
      .select("entry_id")
      .eq("reaction", 1)
      .in("entry_id", entryIds);

    if (error) {
      console.error("Failed to load resource metrics:", error);

      return;
    }

    const nextLikes: Record<string, number> = {};

    for (const entryId of entryIds) {
      nextLikes[entryId] = 0;
    }

    for (const row of data || []) {
      nextLikes[row.entry_id] = (nextLikes[row.entry_id] || 0) + 1;
    }

    setLikeCounts(nextLikes);
  }, []);

  const openSectionDialog = (section?: ResourceSectionRow) => {
    if (section) {
      setEditingSectionId(section.id);
      setSectionForm({
        title: section.title,
        description: section.description || "",
        iconName: section.icon_name || "book-open",
        accentColor: section.accent_color || "#7c3aed",
        isPublished: section.is_published,
      });
    } else {
      setEditingSectionId(null);
      setSectionForm(emptySectionForm);
    }
    setSectionDialogOpen(true);
  };

  const createEntryMarkdownAssetKey = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }

    return `resource-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  const openEntryDialog = (entry?: ResourceEntryRow) => {
    const sectionId =
      entry?.section_id || selectedSectionId || sections[0]?.id || "";

    if (entry) {
      const originalSummary = entry.summary || "";

      setEditingEntryId(entry.id);

      entryOriginalSummaryRef.current = originalSummary;

      entryMarkdownAssetKeyRef.current = entry.id;

      setEntryForm({
        sectionId,
        title: entry.title,
        excerpt: entry.excerpt || "",
        summary: originalSummary,
        url: entry.url || "",
        resourceType: (entry.resource_type as ResourceType) || "other",
        isPlatformPinned: entry.is_platform_pinned,
        isPublished: entry.is_published,
      });
    } else {
      setEditingEntryId(null);

      entryOriginalSummaryRef.current = "";

      entryMarkdownAssetKeyRef.current = createEntryMarkdownAssetKey();

      setEntryForm({
        ...emptyEntryForm,
        sectionId,
      });
    }

    setEntryDialogOpen(true);
  };

  const resetEntryEditor = useCallback(() => {
    setEntryDialogOpen(false);

    setEditingEntryId(null);

    setEntryForm(emptyEntryForm);

    entryOriginalSummaryRef.current = "";

    entryMarkdownAssetKeyRef.current = "";
  }, []);

  const saveSection = async () => {
    if (!sectionForm.title.trim()) {
      toast.error("Enter a category title");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      if (editingSectionId) {
        const { error } = await supabase
          .from("hub_resource_sections")
          .update({
            title: sectionForm.title.trim(),
            description: sectionForm.description.trim() || null,
            icon_name: sectionForm.iconName,
            accent_color: sectionForm.accentColor,
            is_published: sectionForm.isPublished,
          })
          .eq("id", editingSectionId);
        if (error) throw error;
      } else {
        const nextSortOrder = sections.length;
        const { error } = await supabase.from("hub_resource_sections").insert({
          title: sectionForm.title.trim(),
          description: sectionForm.description.trim() || null,
          icon_name: sectionForm.iconName,
          accent_color: sectionForm.accentColor,
          sort_order: nextSortOrder,
          is_published: sectionForm.isPublished,
        });
        if (error) throw error;
      }

      setSectionDialogOpen(false);
      setEditingSectionId(null);
      setSectionForm(emptySectionForm);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const saveEntry = async () => {
    if (!entryForm.sectionId) {
      toast.error("Choose a category");
      return;
    }

    if (!entryForm.title.trim()) {
      toast.error("Enter a resource title");
      return;
    }

    if (!entryMarkdownAssetKeyRef.current) {
      entryMarkdownAssetKeyRef.current =
        editingEntryId || createEntryMarkdownAssetKey();
    }

    setSaving(true);

    try {
      const pendingImages =
        entrySummaryMarkdownRef.current?.getPendingImages() ?? [];

      const result = await commitMarkdownImages({
        draftMarkdown: entryForm.summary,

        previousMarkdown: entryOriginalSummaryRef.current,

        pendingImages,

        uploadContext: {
          context: "resource",

          resourceKey: entryMarkdownAssetKeyRef.current,
        },

        save: async (finalSummary) => {
          try {
            const supabase = createClient();

            const finalExcerpt =
              entryForm.excerpt.trim() || createResourceExcerpt(finalSummary);

            const payload = {
              section_id: entryForm.sectionId,

              title: entryForm.title.trim(),

              excerpt: finalExcerpt || null,

              summary: finalSummary.trim() || null,

              url: entryForm.url.trim() || null,

              resource_type: entryForm.resourceType,

              label: RESOURCE_TYPE_LABELS[entryForm.resourceType],

              is_platform_pinned: entryForm.isPlatformPinned,

              is_published: entryForm.isPublished,
            };

            if (editingEntryId) {
              const { error } = await supabase
                .from("hub_resource_entries")
                .update(payload)
                .eq("id", editingEntryId);

              if (error) {
                return {
                  success: false,
                  error: error.message,
                };
              }
            } else {
              const nextSortOrder = entries.filter(
                (entry) => entry.section_id === entryForm.sectionId,
              ).length;

              const { error } = await supabase
                .from("hub_resource_entries")
                .insert({
                  ...payload,

                  slug: createResourceSlug(entryForm.title),

                  sort_order: nextSortOrder,
                });

              if (error) {
                return {
                  success: false,
                  error: error.message,
                };
              }
            }

            return {
              success: true,
            };
          } catch (error) {
            return {
              success: false,

              error:
                error instanceof Error
                  ? error.message
                  : "Failed to save resource entry",
            };
          }
        },
      });

      if (!result.success) {
        toast.error(result.error || "Failed to save resource");

        return;
      }

      const finalSummary = result.finalMarkdown ?? entryForm.summary;

      /*
       * The Markdown is now safely stored.
       * Replace pending previews inside
       * TipTap with the permanent URLs.
       */
      entrySummaryMarkdownRef.current?.applyCommittedMarkdown(finalSummary);

      entryOriginalSummaryRef.current = finalSummary;

      setEntryForm((current) => ({
        ...current,
        summary: finalSummary,
      }));

      if (result.cleanupWarning) {
        console.warn("Markdown asset cleanup warning:", result.cleanupWarning);
      }

      toast.success(editingEntryId ? "Resource updated" : "Resource created");

      resetEntryEditor();

      await loadData();
    } catch (error) {
      console.error("Failed to save resource entry:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to save resource",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteSection = async (sectionId: string) => {
    try {
      const sectionEntries = entries.filter(
        (entry) => entry.section_id === sectionId,
      );

      const markdownAssetPaths = Array.from(
        new Set(
          sectionEntries.flatMap((entry) =>
            entry.summary
              ? extractManagedMarkdownAssetPaths(entry.summary)
              : [],
          ),
        ),
      );

      const supabase = createClient();

      const { error } = await supabase
        .from("hub_resource_sections")
        .delete()
        .eq("id", sectionId);

      if (error) {
        throw error;
      }

      /*
       * Section + child entries are gone,
       * so their Markdown assets can now
       * safely be removed.
       */
      if (markdownAssetPaths.length > 0) {
        const cleanup = await removeMarkdownAssetsAction(markdownAssetPaths);

        if (!cleanup.success) {
          console.warn(
            "Failed to clean section Markdown images:",
            cleanup.error,
          );
        }
      }

      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null);
      }

      await loadData();

      toast.success("Category deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      const entry = entries.find((item) => item.id === entryId);

      const markdownAssetPaths = entry?.summary
        ? extractManagedMarkdownAssetPaths(entry.summary)
        : [];

      const supabase = createClient();

      const { error } = await supabase
        .from("hub_resource_entries")
        .delete()
        .eq("id", entryId);

      if (error) {
        throw error;
      }

      /*
       * DB deletion succeeded.
       * The images are now definitely obsolete.
       */
      if (markdownAssetPaths.length > 0) {
        const cleanup = await removeMarkdownAssetsAction(markdownAssetPaths);

        if (!cleanup.success) {
          console.warn(
            "Failed to clean deleted resource images:",
            cleanup.error,
          );
        }
      }

      await loadData();

      toast.success("Resource deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete resource");
    }
  };

  const reorderSections = async (
    sectionId: string,
    direction: "up" | "down",
  ) => {
    const index = sections.findIndex((section) => section.id === sectionId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const nextSections = [...sections];
    [nextSections[index], nextSections[targetIndex]] = [
      nextSections[targetIndex],
      nextSections[index],
    ];

    try {
      const supabase = createClient();
      await Promise.all(
        nextSections.map((section, sort_order) =>
          supabase
            .from("hub_resource_sections")
            .update({ sort_order })
            .eq("id", section.id),
        ),
      );
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reorder sections");
    }
  };

  const reorderEntries = async (entryId: string, direction: "up" | "down") => {
    if (!selectedSectionId) return;
    const sectionEntries = entries.filter(
      (entry) => entry.section_id === selectedSectionId,
    );
    const index = sectionEntries.findIndex((entry) => entry.id === entryId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sectionEntries.length) return;

    const nextEntries = [...sectionEntries];
    [nextEntries[index], nextEntries[targetIndex]] = [
      nextEntries[targetIndex],
      nextEntries[index],
    ];

    try {
      const supabase = createClient();
      await Promise.all(
        nextEntries.map((entry, sort_order) =>
          supabase
            .from("hub_resource_entries")
            .update({ sort_order })
            .eq("id", entry.id),
        ),
      );
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reorder entries");
    }
  };

  const toggleSectionPublish = async (section: ResourceSectionRow) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("hub_resource_sections")
        .update({ is_published: !section.is_published })
        .eq("id", section.id);
      if (error) throw error;
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update category");
    }
  };

  const toggleEntryPublish = async (entry: ResourceEntryRow) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("hub_resource_entries")
        .update({ is_published: !entry.is_published })
        .eq("id", entry.id);
      if (error) throw error;
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update resource");
    }
  };

  const pinnedEntries = entries.filter((entry) => entry.is_platform_pinned);

  const focusSection = (sectionId: string) => {
    setSearchQuery("");

    setSelectedSectionId(sectionId);

    window.requestAnimationFrame(() => {
      const target = document.getElementById(`resources-entries-${sectionId}`);

      target?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <div className="min-h-full p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <Link
          href="/"
          onClick={() => {
            localStorage.setItem("currentView", "dashboard");
          }}
          className="group inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to dashboard
        </Link>

        <section className="resources-hero group/resources-hero relative isolate overflow-hidden rounded-[2rem] border border-border/70 shadow-[0_28px_90px_-42px_rgba(0,0,0,0.4)] dark:shadow-primary/10">
          <div className="resources-orb resources-orb-a" />
          <div className="resources-orb resources-orb-b" />
          <div className="resources-orb resources-orb-c" />

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(255,255,255,0.10),transparent_24%),radial-gradient(circle_at_88%_18%,rgba(245,158,11,0.08),transparent_28%),linear-gradient(to_bottom_right,transparent_35%,rgba(59,130,246,0.035))]" />
          <div className="resources-hero-grid pointer-events-none absolute inset-0" />

          <div className="relative z-10 grid min-h-[28rem] items-center gap-10 px-6 py-10 sm:px-9 sm:py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:px-12 lg:py-14">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur">
                <BookOpen className="h-3.5 w-3.5" />
                Forgeworks Library
              </div>

              <h1 className="mt-5 max-w-xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                Everything useful,
                <span className="text-primary"> in one place.</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                Discover community guides, tools, templates, references and
                knowledge curated for Janitor AI creators.
              </p>

              <div className="relative mt-7 max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search guides, tools, templates..."
                  className="h-12 rounded-full border-border/70 bg-background/75 pl-11 pr-5 shadow-md backdrop-blur-xl transition-shadow focus-visible:shadow-lg"
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                <span>{entries.length} resources</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                <span>{sections.length} categories</span>

                {pinnedEntries.length > 0 && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                    <span>{pinnedEntries.length} Forge Picks</span>
                  </>
                )}
              </div>

              {authUserId && !canManageResources && (
                <Button
                  className="mt-7 w-full cursor-pointer sm:w-auto rounded-full px-5 shadow-md shadow-primary/20"
                  onClick={() => {
                    setSuggestionTargetEntry(null);
                    setSuggestionDialogOpen(true);
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Suggest a resource
                </Button>
              )}

              {canManageResources && (
                <Button
                  className="mt-7 w-full cursor-pointer sm:w-auto rounded-full px-5 shadow-md shadow-primary/20"
                  onClick={() => {
                    setSuggestionTargetEntry(null);
                    setSuggestionDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add resource
                </Button>
              )}
            </div>

            <div className="relative hidden min-h-[21rem] lg:block">
              <div
                className="resources-hero-card absolute left-[8%] top-[6%] w-[15rem] -rotate-[5deg] rounded-2xl border border-white/10 bg-card/75 p-4 shadow-2xl shadow-primary/10 backdrop-blur-xl"
                style={{
                  animation: "jf-resources-card-a 8.5s ease-in-out infinite",
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-500">
                    <Brain className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold">Prompting guide</p>
                    <p className="text-[10px] text-muted-foreground">
                      Learn better techniques
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="h-2 w-[85%] rounded-full bg-muted" />
                  <div className="h-2 w-[70%] rounded-full bg-muted" />
                  <div className="h-2 w-[55%] rounded-full bg-primary/15" />
                </div>
              </div>

              <div
                className="resources-hero-card absolute right-[4%] top-[31%] w-[14rem] rotate-[5deg] rounded-2xl border border-white/10 bg-card/75 p-4 shadow-2xl shadow-pink-500/10 backdrop-blur-xl"
                style={{
                  animation: "jf-resources-card-b 9.5s ease-in-out infinite",
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/15 text-pink-500">
                    <Code className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold">Creator tools</p>
                    <p className="text-[10px] text-muted-foreground">
                      Useful utilities
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[9px] text-primary">
                    Tool
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1 text-[9px]">
                    Community
                  </span>
                </div>
              </div>

              <div
                className="resources-hero-card absolute bottom-[4%] left-[21%] w-[15rem] -rotate-[1deg] rounded-2xl border border-white/10 bg-card/80 p-4 shadow-2xl shadow-blue-500/10 backdrop-blur-xl"
                style={{
                  animation: "jf-resources-card-c 10.5s ease-in-out infinite",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />

                    <span className="text-xs font-semibold">Forge Pick</span>
                  </div>

                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>

                <p className="mt-3 text-sm font-semibold">
                  Curated by Forgeworks
                </p>

                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  Standout resources worth keeping close.
                </p>
              </div>
            </div>
          </div>
          <div className="relative z-10 flex flex-col gap-3 border-t border-border/50 bg-background/25 px-6 py-4 backdrop-blur-md sm:px-9 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <div className="flex max-w-3xl items-start gap-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p>
                Resources bring guides, tools, templates and references into one
                curated library. Community suggestions are reviewed before they
                become part of the collection.
              </p>
            </div>

            {canManageResources ? (
              <Badge
                variant="outline"
                className="w-fit shrink-0 rounded-full border-primary/20 bg-primary/5"
              >
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Staff view
              </Badge>
            ) : (
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-5 rounded-full bg-amber-500/70" />
                <span className="h-1.5 w-5 rounded-full bg-primary/45" />
                <span className="h-1.5 w-5 rounded-full bg-blue-500/20" />
              </div>
            )}
          </div>
        </section>

        {canManageResources && (
          <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-medium">Staff tools</p>
                <p className="text-xs text-muted-foreground">
                  Review and manage the resource library.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="cursor-pointer rounded-full"
                onClick={() => setReviewDialogOpen(true)}
              >
                Review
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer rounded-full"
                onClick={() => openSectionDialog()}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Category
              </Button>

              <Button
                size="sm"
                className="cursor-pointer rounded-full"
                onClick={() => openEntryDialog()}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Resource
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-56 animate-pulse rounded-3xl border border-border/60 bg-card/60"
              />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <Card className="border-border/70 bg-card/95">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No categories yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {!normalizedSearchQuery && pinnedEntries.length > 0 && (
              <section className="space-y-5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-500">
                      <Star className="h-4 w-4 fill-current" />
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold tracking-tight">
                        Forgeworks Picks
                      </h2>

                      <p className="text-sm text-muted-foreground">
                        Hand-picked resources we think are especially worth your
                        time.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {pinnedEntries.map((entry) => {
                    const section = sections.find(
                      (candidate) => candidate.id === entry.section_id,
                    );

                    return (
                      <Link
                        key={entry.id}
                        href={`/resources/${entry.slug}`}
                        className={cn(
                          "group relative flex min-h-[16rem] min-w-0 flex-col overflow-hidden rounded-3xl",
                          "border border-amber-400/20 bg-linear-to-br from-amber-400/[0.07] via-card/90 to-primary/[0.05] p-6",
                          "shadow-md shadow-black/5 backdrop-blur",
                          "transition-all duration-300",
                          "hover:-translate-y-1 hover:border-amber-400/40 hover:shadow-xl hover:shadow-amber-500/10",
                        )}
                      >
                        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-400/10 blur-3xl" />

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className="border-amber-400/50 text-amber-600 dark:text-amber-400"
                            >
                              <Star className="mr-1 h-3 w-3 fill-current" />
                              Forge Pick
                            </Badge>

                            <Badge variant="secondary">
                              {
                                RESOURCE_TYPE_LABELS[
                                  entry.resource_type as ResourceType
                                ]
                              }
                            </Badge>

                            {canManageResources && !entry.is_published && (
                              <Badge variant="outline">Draft</Badge>
                            )}
                          </div>

                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </div>

                        <div className="mt-5 flex-1">
                          <h3 className="text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
                            {entry.title}
                          </h3>

                          <div className="relative mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                            <MarkdownRenderer
                              content={
                                entry.excerpt ||
                                entry.summary ||
                                "No description available."
                              }
                              className={[
                                "text-sm leading-6 text-muted-foreground",
                                "[&>*]:my-0",
                                "[&_p]:my-0",
                                "[&_ul]:my-0",
                                "[&_ol]:my-0",
                                "[&_h1]:text-sm",
                                "[&_h2]:text-sm",
                                "[&_h3]:text-sm",
                                "[&_h4]:text-sm",
                                "[&_h5]:text-sm",
                                "[&_h6]:text-sm",
                              ].join(" ")}
                            />
                          </div>
                        </div>

                        <div className="mt-5 flex items-end justify-between gap-3 border-t border-border/50 pt-4">
                          <div className="min-w-0 space-y-1">
                            {section && (
                              <p className="truncate text-xs font-medium">
                                {section.title}
                              </p>
                            )}

                            <p className="truncate text-xs text-muted-foreground">
                              {entry.contributor?.username
                                ? `by @${entry.contributor.username}`
                                : "Forgeworks"}
                            </p>
                          </div>

                          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <ThumbsUp className="h-3.5 w-3.5" />
                            {likeCounts[entry.id] || 0}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {!normalizedSearchQuery && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                      Browse categories
                    </h2>

                    <p className="text-sm text-muted-foreground">
                      Find resources by topic.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {sections.map((section, index) => {
                    const active = section.id === selectedSectionId;
                    const SectionIcon =
                      sectionIconMap[section.icon_name || "book-open"] ||
                      BookOpen;
                    const accentColor = section.accent_color || "#7c3aed";

                    return (
                      <div
                        key={section.id}
                        onClick={() => focusSection(section.id)}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "group relative flex h-full min-h-[13.5rem] flex-col overflow-hidden rounded-2xl",
                          "border border-border/70 bg-card/85 p-4 text-left",
                          "shadow-sm backdrop-blur transition-all duration-300",
                          active
                            ? "border-primary/30 bg-primary/[0.035] shadow-md shadow-primary/5"
                            : "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md",
                        )}
                      >
                        <div
                          className="absolute inset-y-0 left-0 w-0.5"
                          style={{ backgroundColor: accentColor }}
                        />
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex items-start gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
                              style={{
                                color: accentColor,
                                backgroundColor: `${accentColor}18`,
                              }}
                            >
                              <SectionIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="truncate text-base font-semibold">
                                  {section.title}
                                </h3>
                                {canManageResources &&
                                  !section.is_published && (
                                    <Badge variant="secondary">Draft</Badge>
                                  )}
                              </div>
                              <p className="min-h-[2.5rem] line-clamp-2 text-sm leading-5 text-muted-foreground">
                                {section.description || "No description yet."}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {entryCountBySection.get(section.id) || 0}{" "}
                            {(entryCountBySection.get(section.id) || 0) === 1
                              ? "resource"
                              : "resources"}
                          </span>
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-5 text-xs text-muted-foreground">
                          <span>Open category</span>

                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </div>

                        {canManageResources && (
                          <Collapsible className="mt-1">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-full cursor-pointer rounded-full text-[11px] text-muted-foreground hover:text-foreground"
                                onClick={(event) => event.stopPropagation()}
                              >
                                Manage category
                              </Button>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div
                                className="mt-1 grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/20 p-1.5"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 cursor-pointer justify-start rounded-lg px-2 text-xs"
                                  disabled={index === 0}
                                  onClick={() =>
                                    reorderSections(section.id, "up")
                                  }
                                >
                                  <ArrowUp className="mr-1.5 h-3.5 w-3.5" />
                                  Move up
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 cursor-pointer justify-start rounded-lg px-2 text-xs"
                                  disabled={index === sections.length - 1}
                                  onClick={() =>
                                    reorderSections(section.id, "down")
                                  }
                                >
                                  <ArrowDown className="mr-1.5 h-3.5 w-3.5" />
                                  Move down
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 cursor-pointer justify-start rounded-lg px-2 text-xs"
                                  onClick={() => openSectionDialog(section)}
                                >
                                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                  Edit
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 cursor-pointer justify-start rounded-lg px-2 text-xs"
                                  onClick={() => toggleSectionPublish(section)}
                                >
                                  {section.is_published ? (
                                    <>
                                      <Lock className="mr-1.5 h-3.5 w-3.5" />
                                      Unpublish
                                    </>
                                  ) : (
                                    <>
                                      <Globe className="mr-1.5 h-3.5 w-3.5" />
                                      Publish
                                    </>
                                  )}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="col-span-2 h-8 cursor-pointer justify-start rounded-lg px-2 text-xs text-destructive hover:bg-destructive/10"
                                  onClick={() =>
                                    setDeleteTarget({
                                      kind: "section",
                                      id: section.id,
                                      title: section.title,
                                    })
                                  }
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Delete category
                                </Button>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section
              className="space-y-4"
              id={`resources-entries-${selectedSectionId || "none"}`}
              style={
                {
                  scrollMarginTop: "6rem",
                  "--resource-section-accent":
                    selectedSection?.accent_color || "var(--primary)",
                } as React.CSSProperties
              }
            >
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="resource-section-accent text-xs font-medium uppercase tracking-[0.16em]">
                    Explore
                  </p>

                  <h2 className="resource-section-accent mt-1 text-2xl font-semibold tracking-tight">
                    {normalizedSearchQuery
                      ? "Search results"
                      : selectedSection?.title || "Resources"}
                  </h2>

                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {normalizedSearchQuery
                      ? `${visibleEntries.length} ${
                          visibleEntries.length === 1 ? "resource" : "resources"
                        } matching “${searchQuery.trim()}”.`
                      : selectedSection?.description ||
                        "Browse useful resources from this category."}
                  </p>
                </div>
                {canManageResources && selectedSection && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEntryDialog()}
                    className="cursor-pointer rounded-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add resource
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "All"],
                  ["guide", "Guides"],
                  ["article", "Articles"],
                  ["tool", "Tools"],
                  ["template", "Templates"],
                  ["reference", "References"],
                ].map(([value, label]) => {
                  const active = typeFilter === value;

                  return (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-8 cursor-pointer rounded-full border border-transparent px-3 text-xs transition-colors",
                        active && "resource-type-filter-active",
                      )}
                      onClick={() =>
                        setTypeFilter(value as ResourceType | "all")
                      }
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>

              {visibleEntries.length === 0 ? (
                <Card className="border-dashed border-border/70 bg-card/70">
                  <CardContent className="flex flex-col items-center py-12 text-center">
                    <Search className="h-8 w-8 text-muted-foreground/60" />

                    <p className="mt-4 text-sm font-medium">
                      {normalizedSearchQuery
                        ? "No resources found"
                        : "No resources here yet"}
                    </p>

                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                      {normalizedSearchQuery
                        ? `Nothing matched “${searchQuery.trim()}”. Try another search or browse a category.`
                        : "This category does not have any published resources yet."}
                    </p>

                    {normalizedSearchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 cursor-pointer"
                        onClick={() => setSearchQuery("")}
                      >
                        Clear search
                      </Button>
                    )}

                    {!normalizedSearchQuery &&
                      authUserId &&
                      !canManageResources && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => {
                            setSuggestionTargetEntry(null);
                            setSuggestionDialogOpen(true);
                          }}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Suggest a resource
                        </Button>
                      )}

                    {!normalizedSearchQuery && canManageResources && (
                      <Button
                        size="sm"
                        className="mt-4"
                        onClick={() => openEntryDialog()}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add resource
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 xl:grid-cols-3">
                  {visibleEntries.map((entry) => {
                    return (
                      <div key={entry.id} className="min-w-0">
                        <Link
                          href={`/resources/${entry.slug}`}
                          className={cn(
                            "resource-entry-card group relative flex min-h-[15rem] min-w-0 flex-col overflow-hidden rounded-3xl",
                            "border border-border/70 bg-card/90 p-5",
                            "shadow-md shadow-black/[0.04] backdrop-blur supports-backdrop-filter:bg-card/75",
                            "transition-all duration-300",
                            "hover:-translate-y-1 hover:shadow-xl",
                            entry.is_platform_pinned && "border-amber-400/30",
                          )}
                        >
                          <div className="resource-entry-glow pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full blur-3xl transition-all duration-300" />
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">
                                {
                                  RESOURCE_TYPE_LABELS[
                                    entry.resource_type as ResourceType
                                  ]
                                }
                              </Badge>

                              {entry.is_platform_pinned && (
                                <Badge
                                  variant="outline"
                                  className="border-amber-400/50 text-amber-600 dark:text-amber-400"
                                >
                                  <Star className="mr-1 h-3 w-3 fill-current" />
                                  Forge Pick
                                </Badge>
                              )}

                              {canManageResources && !entry.is_published && (
                                <Badge variant="outline">Draft</Badge>
                              )}
                            </div>

                            <ArrowRight className="resource-entry-arrow h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1" />
                          </div>

                          <div className="mt-4 flex-1">
                            <h3 className="resource-entry-title relative text-[1.05rem] font-semibold leading-snug tracking-tight transition-colors">
                              {entry.title}
                            </h3>

                            <div className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                              <MarkdownRenderer
                                content={
                                  entry.excerpt ||
                                  entry.summary ||
                                  "No description available."
                                }
                                className={[
                                  "text-sm leading-6 text-muted-foreground",
                                  "[&>*]:my-0",
                                  "[&_p]:my-0",
                                  "[&_ul]:my-0",
                                  "[&_ol]:my-0",
                                  "[&_h1]:text-sm",
                                  "[&_h2]:text-sm",
                                  "[&_h3]:text-sm",
                                  "[&_h4]:text-sm",
                                  "[&_h5]:text-sm",
                                  "[&_h6]:text-sm",
                                ].join(" ")}
                              />
                            </div>
                          </div>

                          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/50 pt-4">
                            <div className="min-w-0">
                              {entry.contributor?.username ? (
                                <span className="truncate text-xs text-muted-foreground">
                                  by @{entry.contributor.username}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Forgeworks
                                </span>
                              )}
                            </div>

                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <ThumbsUp className="resource-entry-like h-3.5 w-3.5 transition-colors" />
                              {likeCounts[entry.id] || 0}
                            </span>
                          </div>
                        </Link>

                        {canManageResources && (
                          <Collapsible className="mt-1">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-full cursor-pointer rounded-full text-[11px] text-muted-foreground hover:text-foreground"
                              >
                                Manage resource
                              </Button>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div className="mt-1 grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/20 p-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 cursor-pointer justify-start rounded-lg px-2 text-xs"
                                  onClick={() => openEntryDialog(entry)}
                                >
                                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                  Edit
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 cursor-pointer justify-start rounded-lg px-2 text-xs"
                                  onClick={() => toggleEntryPublish(entry)}
                                >
                                  {entry.is_published ? (
                                    <>
                                      <Lock className="mr-1.5 h-3.5 w-3.5" />
                                      Unpublish
                                    </>
                                  ) : (
                                    <>
                                      <Globe className="mr-1.5 h-3.5 w-3.5" />
                                      Publish
                                    </>
                                  )}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="col-span-2 h-8 cursor-pointer justify-start rounded-lg px-2 text-xs text-destructive hover:bg-destructive/10"
                                  onClick={() =>
                                    setDeleteTarget({
                                      kind: "entry",
                                      id: entry.id,
                                      title: entry.title,
                                    })
                                  }
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Delete resource
                                </Button>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {deleteTarget?.kind === "section" ? "category" : "resource"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "section"
                ? `This will also permanently remove every resource inside ${deleteTarget.title}.`
                : `${deleteTarget?.title || "This resource"} will be removed permanently.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                const target = deleteTarget;
                setDeleteTarget(null);
                if (target.kind === "section") {
                  await deleteSection(target.id);
                } else {
                  await deleteEntry(target.id);
                }
              }}
              className="bg-destructive cursor-pointer text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="scrollbar-thin max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSectionId ? "Edit category" : "New category"}
            </DialogTitle>

            <DialogDescription>
              Create a category to organize related resources in the library.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Title</label>

                <Input
                  value={sectionForm.title}
                  onChange={(event) =>
                    setSectionForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  placeholder="e.g. Prompting & Writing"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Description</label>

                <Textarea
                  value={sectionForm.description}
                  onChange={(event) =>
                    setSectionForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Briefly describe what creators can find in this category..."
                />

                <p className="text-xs text-muted-foreground">
                  Optional. This appears on the category card and in the
                  resource browser.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Icon</label>

                <Select
                  value={sectionForm.iconName}
                  onValueChange={(value) =>
                    setSectionForm((prev) => ({
                      ...prev,
                      iconName: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an icon" />
                  </SelectTrigger>

                  <SelectContent>
                    {sectionIconOptions.map((option) => {
                      const Icon = option.icon;

                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <CustomColorPicker
                label="Accent color"
                value={sectionForm.accentColor}
                onChange={(value) =>
                  setSectionForm((prev) => ({
                    ...prev,
                    accentColor: value,
                  }))
                }
              />

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/15 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Published</p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Published categories are visible to everyone.
                    </p>
                  </div>

                  <Switch
                    checked={sectionForm.isPublished}
                    onCheckedChange={(checked) =>
                      setSectionForm((prev) => ({
                        ...prev,
                        isPublished: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="w-full cursor-pointer sm:w-auto"
              onClick={() => setSectionDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              onClick={saveSection}
              className="w-full cursor-pointer sm:w-auto"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingSectionId
                  ? "Save changes"
                  : "Create category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={entryDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setEntryDialogOpen(true);

            return;
          }

          if (!saving) {
            resetEntryEditor();
          }
        }}
      >
        <DialogContent
          id="resources-entry-dialog-content"
          className={cn(
            "flex max-h-[92vh] flex-col overflow-visible",
            "sm:max-w-4xl",
          )}
        >
          <DialogHeader>
            <DialogTitle>
              {editingEntryId ? "Edit resource" : "New resource"}
            </DialogTitle>
            <DialogDescription>
              Create or update a resource inside the library.
            </DialogDescription>
          </DialogHeader>
          <div
            className={cn(
              "relative z-0 min-h-0 flex-1 space-y-4",
              "scrollbar-thin overflow-y-auto px-1 py-1 pr-2",
              "overscroll-contain",
            )}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={entryForm.sectionId}
                onValueChange={(value) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    sectionId: value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={entryForm.title}
                onChange={(event) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Short description</label>

              <Textarea
                value={entryForm.excerpt}
                onChange={(event) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    excerpt: event.target.value,
                  }))
                }
                rows={3}
                maxLength={320}
                placeholder="Short description shown in the resource directory..."
              />

              <p className="text-xs text-muted-foreground">
                Leave this empty to generate it automatically from the resource
                content.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Rich Markdown is supported. You can also upload images directly
                from your device. New images are only kept after the resource
                saves successfully.
              </p>
              <MarkdownField
                ref={entrySummaryMarkdownRef}
                value={entryForm.summary}
                preset="full"
                slashMenuContainer="#resources-entry-dialog-content"
                imageOptions={{
                  enabled: true,
                  maxImages: 10,
                  maxSizeBytes: 5 * 1024 * 1024,
                }}
                onChange={(value) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    summary: value,
                  }))
                }
                minEditorHeightRem={8}
                className="min-h-48 md:min-h-56"
                maxEditorHeightRem={28}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL</label>
              <Input
                value={entryForm.url}
                onChange={(event) =>
                  setEntryForm((prev) => ({ ...prev, url: event.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Resource type</label>

              <Select
                value={entryForm.resourceType}
                onValueChange={(value) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    resourceType: value as ResourceType,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="tool">Tool</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Pinned by platform</p>
                <p className="text-xs text-muted-foreground">
                  Feature this resource in Forgeworks Picks.
                </p>
              </div>
              <Switch
                checked={entryForm.isPlatformPinned}
                onCheckedChange={(checked) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    isPlatformPinned: checked,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Published</p>
                <p className="text-xs text-muted-foreground">
                  Visible to everyone when enabled.
                </p>
              </div>
              <Switch
                checked={entryForm.isPublished}
                onCheckedChange={(checked) =>
                  setEntryForm((prev) => ({ ...prev, isPublished: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full cursor-pointer sm:w-auto"
              onClick={resetEntryEditor}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={saveEntry}
              className="w-full cursor-pointer sm:w-auto"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingEntryId
                  ? "Save changes"
                  : "Create resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResourceReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        sections={sections.map((section) => ({
          id: section.id,
          title: section.title,
        }))}
        onChanged={() => {
          void loadData();
        }}
      />

      <ResourceSuggestionDialog
        open={suggestionDialogOpen}
        onOpenChange={(open) => {
          setSuggestionDialogOpen(open);

          if (!open) {
            setSuggestionTargetEntry(null);
          }
        }}
        sections={sections
          .filter((section) => section.is_published)
          .map((section) => ({
            id: section.id,
            title: section.title,
          }))}
        defaultSectionId={
          selectedSection?.is_published ? selectedSection.id : null
        }
        resource={
          suggestionTargetEntry
            ? {
                id: suggestionTargetEntry.id,

                sectionId: suggestionTargetEntry.section_id,

                title: suggestionTargetEntry.title,

                summary: suggestionTargetEntry.summary || "",

                url: suggestionTargetEntry.url || "",

                label: suggestionTargetEntry.label || "",
              }
            : null
        }
      />
    </div>
  );
}
