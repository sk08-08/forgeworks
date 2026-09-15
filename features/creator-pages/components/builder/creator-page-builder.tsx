// ============================================================================
// Forgeworks - Creator Pages Editor
// Create and manage customizable public creator pages
// ============================================================================

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { checkSlugAvailability } from "@/features/creator-pages/actions/slug-check";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCreatorSectionAnchor } from "@/features/creator-pages/lib/creator-page-links";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";
import {
  normalizeResourceVisibility,
  type ResourceVisibility,
} from "@/lib/resource-visibility";

import { UnavailableCreatorPageEditorStatusPage } from "@/components/shared/status-page";

import { CreatorPageAddSectionDialog } from "@/features/creator-pages/components/builder/creator-page-add-section-dialog";
import { CreatorPageBlockInspector } from "@/features/creator-pages/components/builder/creator-page-block-inspector";
import { CreatorPageBlocksPanel } from "@/features/creator-pages/components/builder/creator-page-blocks-panel";
import {
  CreatorPageBuilderHeader,
  type CreatorBuilderWorkspaceView,
} from "@/features/creator-pages/components/builder/creator-page-builder-header";
import { CreatorPageCanvasPreview } from "@/features/creator-pages/components/builder/creator-page-canvas-preview";
import { CreatorPagePageInspector } from "@/features/creator-pages/components/builder/creator-page-page-inspector";
import {
  CREATOR_PAGE_SCHEMA_VERSION,
  getCreatorPageBlockDefinition,
  getSectionDisplayTitle,
  sectionKindLabels,
} from "@/features/creator-pages/lib/creator-page-block-registry";
import {
  buildCreatorSectionConfig,
  hydrateCreatorSectionEditor,
  validateCreatorSectionConfig,
} from "@/features/creator-pages/lib/creator-page-section-config";
import {
  type CreatorBotInspectorItem,
  type CreatorBuilderPanel,
  type CreatorBuilderViewport,
  type CreatorFormInspectorItem,
  type CreatorGalleryImageItem,
  type CreatorInspectorTab,
  type CreatorLorebookInspectorItem,
  type CreatorPage,
  type CreatorPageBackgroundStyle,
  type CreatorPageCanvasWidth,
  type CreatorPageFontStyle,
  type CreatorPagePadding,
  type CreatorPageSectionGap,
  type CreatorSocialLinkItem,
  type CreatorWorldInspectorItem,
  type PageSection,
  type SectionKind,
} from "@/features/creator-pages/types/creator-page-types";

// ---------------------------------------------------------------------------
// Builder snapshots
// ---------------------------------------------------------------------------

interface CreatorPageEditorValues {
  title: string;
  slug: string;
  description: string;
  accentColor: string;
  backgroundStyle: CreatorPageBackgroundStyle;
  fontStyle: CreatorPageFontStyle;
  canvasWidth: CreatorPageCanvasWidth;
  sectionGap: CreatorPageSectionGap;
  pagePadding: CreatorPagePadding;
  visibility: ResourceVisibility;
}

function resolvePageEditorValues(page: CreatorPage): CreatorPageEditorValues {
  const cfg = page.config || {};

  return {
    title: page.title || "",
    slug: page.slug || "",
    description: page.description || "",
    accentColor:
      typeof cfg.accentColor === "string" && cfg.accentColor.trim()
        ? cfg.accentColor
        : "#7c3aed",
    backgroundStyle:
      cfg.bgStyle === "dark" ||
      cfg.bgStyle === "ambient" ||
      cfg.bgStyle === "minimal"
        ? cfg.bgStyle
        : "default",
    fontStyle:
      cfg.fontStyle === "serif" ||
      cfg.fontStyle === "mono" ||
      cfg.fontStyle === "display"
        ? cfg.fontStyle
        : "default",
    canvasWidth:
      cfg.canvasWidth === "narrow" ||
      cfg.canvasWidth === "wide" ||
      cfg.canvasWidth === "full"
        ? cfg.canvasWidth
        : "standard",
    sectionGap:
      cfg.sectionGap === "compact" || cfg.sectionGap === "relaxed"
        ? cfg.sectionGap
        : "normal",
    pagePadding:
      cfg.pagePadding === "compact" || cfg.pagePadding === "spacious"
        ? cfg.pagePadding
        : "normal",
    visibility: normalizeResourceVisibility(page.visibility),
  };
}

function getPageSnapshot(values: CreatorPageEditorValues) {
  return JSON.stringify(values);
}

interface CreatorBlockEditorSnapshotInput {
  title: string;
  config: Record<string, string>;
  formId: string;
  links: CreatorSocialLinkItem[];
  images: CreatorGalleryImageItem[];
  selectedBotIds: string[];
  selectedWorldIds: string[];
  selectedLorebookIds: string[];
}

function getBlockSnapshot(input: CreatorBlockEditorSnapshotInput) {
  return JSON.stringify(input);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreatorPageBuilder({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Editor state
  const [editingPage, setEditingPage] = useState<CreatorPage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAccentColor, setEditAccentColor] = useState("#7c3aed");
  const [editBgStyle, setEditBgStyle] =
    useState<CreatorPageBackgroundStyle>("default");
  const [editFontStyle, setEditFontStyle] =
    useState<CreatorPageFontStyle>("default");
  const [editVisibility, setEditVisibility] =
    useState<ResourceVisibility>("private");

  // Creator Pages V3 canvas/editor state
  const [editCanvasWidth, setEditCanvasWidth] =
    useState<CreatorPageCanvasWidth>("standard");
  const [editSectionGap, setEditSectionGap] =
    useState<CreatorPageSectionGap>("normal");
  const [editPagePadding, setEditPagePadding] =
    useState<CreatorPagePadding>("normal");
  const [builderViewport, setBuilderViewport] =
    useState<CreatorBuilderViewport>("desktop");
  const [builderPanel, setBuilderPanel] =
    useState<CreatorBuilderPanel>("blocks");
  const [workspaceView, setWorkspaceView] =
    useState<CreatorBuilderWorkspaceView>("blocks");

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [savedPageSnapshot, setSavedPageSnapshot] = useState("");

  const [blockSaving, setBlockSaving] = useState(false);
  const [blockJustSaved, setBlockJustSaved] = useState(false);
  const [savedBlockSnapshot, setSavedBlockSnapshot] = useState("");

  // Slug availability checking
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [slugMessage, setSlugMessage] = useState("");

  // Section dialog
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSectionKind, setNewSectionKind] =
    useState<SectionKind>("bot_showcase");
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    | { type: "back" }
    | { type: "browser-back" }
    | { type: "href"; href: string }
    | null
  >(null);

  const [blockDiscardDialogOpen, setBlockDiscardDialogOpen] = useState(false);
  const [pendingBlockNavigation, setPendingBlockNavigation] = useState<
    { type: "section"; section: PageSection } | { type: "done" } | null
  >(null);

  const historyGuardActiveRef = useRef(false);
  const allowHistoryNavigationRef = useRef(false);

  // Load the one page owned by the signed-in user.
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const supabase = createClient();
      const access = await getCurrentUserAccess(supabase);

      if (!access.user) {
        setCurrentUserId(null);
        setEditingPage(null);
        setSections([]);
        return;
      }

      const [
        { data: pageData, error: pageError },
        { data: sectionData, error: sectionError },
      ] = await Promise.all([
        supabase
          .from("active_creator_pages")
          .select(
            "id, user_id, slug, title, description, config, is_published, visibility, created_at, updated_at",
          )
          .eq("id", pageId)
          .eq("user_id", access.user.id)
          .maybeSingle(),
        supabase
          .from("active_creator_page_sections")
          .select("*")
          .eq("page_id", pageId)
          .order("position", { ascending: true }),
      ]);

      if (pageError) throw pageError;
      if (sectionError) throw sectionError;

      if (!pageData) {
        setCurrentUserId(access.user.id);
        setEditingPage(null);
        setSections([]);
        return;
      }

      const page = pageData as CreatorPage;
      setCurrentUserId(access.user.id);
      setEditingPage(page);
      setSections((sectionData || []) as PageSection[]);

      const editorValues = resolvePageEditorValues(page);

      setEditTitle(editorValues.title);
      setEditSlug(editorValues.slug);
      setEditDescription(editorValues.description);
      setEditAccentColor(editorValues.accentColor);
      setEditBgStyle(editorValues.backgroundStyle);
      setEditFontStyle(editorValues.fontStyle);
      setEditCanvasWidth(editorValues.canvasWidth);
      setEditSectionGap(editorValues.sectionGap);
      setEditPagePadding(editorValues.pagePadding);
      setEditVisibility(editorValues.visibility);

      setSavedPageSnapshot(getPageSnapshot(editorValues));
      setSavedBlockSnapshot("");
      setEditingSection(null);
      setBuilderPanel("blocks");
      setWorkspaceView("blocks");
    } catch (error) {
      console.error("Failed to load Creator Page builder:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Could not load this Creator Page";

      setLoadError(message);
      toast.error("Could not load this Creator Page");
      setEditingPage(null);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const currentPageSnapshot = useMemo(
    () =>
      getPageSnapshot({
        title: editTitle,
        slug: editSlug,
        description: editDescription,
        accentColor: editAccentColor,
        backgroundStyle: editBgStyle,
        fontStyle: editFontStyle,
        canvasWidth: editCanvasWidth,
        sectionGap: editSectionGap,
        pagePadding: editPagePadding,
        visibility: editVisibility,
      }),
    [
      editAccentColor,
      editBgStyle,
      editCanvasWidth,
      editDescription,
      editFontStyle,
      editPagePadding,
      editSectionGap,
      editVisibility,
      editSlug,
      editTitle,
    ],
  );

  const pageIsDirty =
    Boolean(savedPageSnapshot) && currentPageSnapshot !== savedPageSnapshot;

  // Debounced slug availability check for editor
  useEffect(() => {
    if (!editingPage || !editSlug || editSlug.length < 2) {
      setSlugStatus("idle");
      setSlugMessage("");
      return;
    }

    // Skip check if slug hasn't changed
    if (editSlug === editingPage.slug) {
      setSlugStatus("idle");
      setSlugMessage("");
      return;
    }

    setSlugStatus("checking");
    setSlugMessage("Checking...");

    const timer = setTimeout(async () => {
      if (!currentUserId) return;
      try {
        const result = await checkSlugAvailability(
          editSlug,
          currentUserId,
          "creator_page",
          editingPage.id,
        );
        if (result.available) {
          setSlugStatus("available");
          setSlugMessage(result.message);
        } else {
          setSlugStatus("taken");
          setSlugMessage(result.message);
        }
      } catch {
        setSlugStatus("idle");
        setSlugMessage("");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [editSlug, editingPage, currentUserId]);

  // Save page
  const handleSavePage = async () => {
    if (!editingPage || !currentUserId || saving || !pageIsDirty) return;
    if (slugStatus === "taken") {
      toast.error(
        "Please choose a different URL slug — this one conflicts with an existing profile or page",
      );
      return;
    }
    if (slugStatus === "checking") {
      toast.error("Please wait while we verify the URL slug");
      return;
    }
    const normalizedTitle = editTitle.trim() || "Untitled";
    const normalizedSlug = editSlug.trim() || editingPage.slug;
    const normalizedDescription = editDescription.trim();

    setSaving(true);
    setJustSaved(false);

    try {
      const supabase = createClient();

      const pageConfig: Record<string, unknown> = {
        schemaVersion: CREATOR_PAGE_SCHEMA_VERSION,
        accentColor: editAccentColor || "#7c3aed",
        bgStyle: editBgStyle || "default",
        fontStyle: editFontStyle || "default",
        canvasWidth: editCanvasWidth,
        sectionGap: editSectionGap,
        pagePadding: editPagePadding,
      };

      const { error } = await supabase
        .from("creator_pages")
        .update({
          title: normalizedTitle,
          slug: normalizedSlug,
          description: normalizedDescription,
          config: pageConfig,
          visibility: editVisibility,
        })
        .eq("id", editingPage.id)
        .eq("user_id", currentUserId);

      if (error) throw error;

      const updated: CreatorPage = {
        ...editingPage,
        title: normalizedTitle,
        slug: normalizedSlug,
        description: normalizedDescription,
        config: pageConfig,
        visibility: editVisibility,
        updated_at: new Date().toISOString(),
      };
      setEditingPage(updated);
      setEditTitle(normalizedTitle);
      setEditSlug(normalizedSlug);
      setEditDescription(normalizedDescription);

      setSavedPageSnapshot(
        getPageSnapshot({
          title: normalizedTitle,
          slug: normalizedSlug,
          description: normalizedDescription,
          accentColor: editAccentColor || "#7c3aed",
          backgroundStyle: editBgStyle || "default",
          fontStyle: editFontStyle || "default",
          canvasWidth: editCanvasWidth,
          sectionGap: editSectionGap,
          pagePadding: editPagePadding,
          visibility: editVisibility,
        }),
      );

      setJustSaved(true);
      toast.success("Page saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  // Toggle publish
  const handleTogglePublish = async (page: CreatorPage) => {
    if (!currentUserId) return;
    try {
      const supabase = createClient();
      const newPublished = !page.is_published;
      const { error } = await supabase
        .from("creator_pages")
        .update({ is_published: newPublished })
        .eq("id", page.id)
        .eq("user_id", currentUserId);

      if (error) throw error;

      if (editingPage?.id === page.id) {
        setEditingPage({ ...editingPage, is_published: newPublished });
      }
      toast.success(newPublished ? "Page published!" : "Page unpublished");
    } catch (error: any) {
      toast.error(error.message || "Failed to update publish status");
    }
  };

  // Delete page

  // Add section
  const handleAddSection = async () => {
    if (!editingPage) return;
    try {
      const supabase = createClient();
      const pageSections = sections.filter((s) => s.page_id === editingPage.id);
      const nextPosition = pageSections.length;

      const { data, error } = await supabase
        .from("creator_page_sections")
        .insert({
          page_id: editingPage.id,
          kind: newSectionKind,
          title: newSectionTitle.trim() || sectionKindLabels[newSectionKind],
          config: { schemaVersion: CREATOR_PAGE_SCHEMA_VERSION },
          position: nextPosition,
        })
        .select("*")
        .single();

      if (error) throw error;

      const createdSection = data as PageSection;

      setSections((prev) => [...prev, createdSection]);
      setAddSectionOpen(false);
      setNewSectionTitle("");
      applySectionEditor(createdSection);
      toast.success("Section added");
    } catch (error: any) {
      toast.error(error.message || "Failed to add section");
    }
  };

  // Duplicate section
  const handleDuplicateSection = async (section: PageSection) => {
    if (!editingPage) return;
    try {
      const supabase = createClient();
      const pageSections = sections.filter((s) => s.page_id === editingPage.id);
      const nextPosition = pageSections.length;

      const duplicatedConfig = {
        ...((section.config as Record<string, unknown>) || {}),
      };
      delete duplicatedConfig.anchorId;

      const { data, error } = await supabase
        .from("creator_page_sections")
        .insert({
          page_id: editingPage.id,
          kind: section.kind,
          title: `${getSectionDisplayTitle(section)} (copy)`,
          config: duplicatedConfig,
          position: nextPosition,
        })
        .select("*")
        .single();

      if (error) throw error;

      const duplicatedSection = data as PageSection;

      setSections((prev) => [...prev, duplicatedSection]);
      applySectionEditor(duplicatedSection);
      toast.success("Section duplicated");
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate section");
    }
  };

  // Edit section state
  const [editingSection, setEditingSection] = useState<PageSection | null>(
    null,
  );
  const [blockInspectorTab, setBlockInspectorTab] =
    useState<CreatorInspectorTab>("content");
  const [sectionTitleEdit, setSectionTitleEdit] = useState("");
  const [sectionConfigEdit, setSectionConfigEdit] = useState<
    Record<string, string>
  >({});

  // Available forms for form sections
  const [availableForms, setAvailableForms] = useState<
    CreatorFormInspectorItem[]
  >([]);
  const [editingFormId, setEditingFormId] = useState<string>("");

  // Social links state for visual editor
  const [editingLinks, setEditingLinks] = useState<CreatorSocialLinkItem[]>([]);

  // Gallery images state for visual editor
  const [editingImages, setEditingImages] = useState<CreatorGalleryImageItem[]>(
    [],
  );

  // Bot/world selection for showcase sections
  const [editingSelectedBotIds, setEditingSelectedBotIds] = useState<string[]>(
    [],
  );
  const [editingSelectedWorldIds, setEditingSelectedWorldIds] = useState<
    string[]
  >([]);
  const [editingSelectedLorebookIds, setEditingSelectedLorebookIds] = useState<
    string[]
  >([]);
  const [availableBots, setAvailableBots] = useState<CreatorBotInspectorItem[]>(
    [],
  );
  const [availableWorlds, setAvailableWorlds] = useState<
    CreatorWorldInspectorItem[]
  >([]);
  const [availableLorebooks, setAvailableLorebooks] = useState<
    CreatorLorebookInspectorItem[]
  >([]);

  const currentBlockSnapshot = useMemo(
    () =>
      getBlockSnapshot({
        title: sectionTitleEdit,
        config: sectionConfigEdit,
        formId: editingFormId,
        links: editingLinks,
        images: editingImages,
        selectedBotIds: editingSelectedBotIds,
        selectedWorldIds: editingSelectedWorldIds,
        selectedLorebookIds: editingSelectedLorebookIds,
      }),
    [
      editingFormId,
      editingImages,
      editingLinks,
      editingSelectedBotIds,
      editingSelectedLorebookIds,
      editingSelectedWorldIds,
      sectionConfigEdit,
      sectionTitleEdit,
    ],
  );

  const blockIsDirty =
    Boolean(editingSection) &&
    Boolean(savedBlockSnapshot) &&
    currentBlockSnapshot !== savedBlockSnapshot;

  const hasUnsavedChanges = pageIsDirty || blockIsDirty;

  const loadAvailableForms = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("request_forms")
        .select(
          "id, title, shareable_link, is_active, deactivated_message, deactivated_redirect_url, deactivated_redirect_label, deactivated_accent_color",
        )
        .eq("user_id", currentUserId)
        .is("deleted_at", null)
        .order("title");

      if (error) throw error;

      if (data) {
        setAvailableForms(
          data.map((f: any) => ({
            id: f.id,
            form_title: stripMarkdownToText(f.title) || "Untitled form",
            shareable_link: f.shareable_link || "",
            is_active: f.is_active !== false,
            deactivated_message: f.deactivated_message || "",
            deactivated_redirect_url: f.deactivated_redirect_url || "",
            deactivated_redirect_label: f.deactivated_redirect_label || "",
            deactivated_accent_color: f.deactivated_accent_color || "",
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load forms:", error);
    }
  };

  const loadAvailableBots = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("active_bots")
        .select(
          "id, name, image_url, short_description, tags, rating, created_at, hide_sensitive_fields",
        )
        .eq("user_id", currentUserId)
        .order("name");

      if (data) {
        setAvailableBots(
          data.map((bot: any) => ({
            id: bot.id,
            name: bot.name,
            image_url: bot.image_url || null,
            short_description: bot.short_description || "",
            tags: Array.isArray(bot.tags) ? bot.tags : [],
            rating: bot.rating || "SFW",
            created_at: bot.created_at || new Date(0).toISOString(),
            hide_sensitive_fields: bot.hide_sensitive_fields === true,
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load bots:", error);
    }
  };

  const loadAvailableWorlds = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("atlas_worlds")
        .select(
          "id, title, slug, description, world_bot_links:atlas_world_bots(bot_id)",
        )
        .eq("user_id", currentUserId)
        .order("title");

      if (data) {
        setAvailableWorlds(
          data.map((world: any) => ({
            id: world.id,
            title: world.title,
            slug: world.slug || "",
            description: world.description || "",
            bot_ids: Array.isArray(world.world_bot_links)
              ? world.world_bot_links.map((rel: any) => rel.bot_id)
              : [],
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load worlds:", error);
    }
  };

  const loadAvailableLorebooks = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("atlas_lorebooks")
        .select("id, title, summary")
        .eq("user_id", currentUserId)
        .order("title");

      if (error) throw error;

      setAvailableLorebooks(
        (data || []).map((lorebook: any) => ({
          id: lorebook.id,
          title: stripMarkdownToText(lorebook.title) || "Untitled lorebook",
          summary: lorebook.summary || "",
          world_title:
            availableWorlds.find((world) => world.id === lorebook.world_id)
              ?.title || "",
        })),
      );
    } catch (error) {
      console.error("Failed to load lorebooks:", error);
    }
  };

  useEffect(() => {
    if (!editingPage || !currentUserId) return;

    loadAvailableBots();
    loadAvailableWorlds();
  }, [editingPage?.id, currentUserId]);

  // Drag & drop state
  const handleDragStart = (e: DragEvent<HTMLDivElement>, idx: number) => {
    e.dataTransfer.setData("text/plain", String(idx));
    (e.currentTarget as HTMLDivElement).classList.add("opacity-60");
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).classList.remove("opacity-60");
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault();
    e.currentTarget.style.borderTop = "2px solid var(--primary)";
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderTop = "";
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, dropIdx: number) => {
    e.preventDefault();
    e.currentTarget.style.borderTop = "";
    const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(fromIdx) || fromIdx === dropIdx || !editingPage) return;
    try {
      const supabase = createClient();
      const pageSections = editingPageSections;
      const moved = [...pageSections];
      const [dragged] = moved.splice(fromIdx, 1);
      moved.splice(dropIdx, 0, dragged);
      const updated = moved.map((s, i) => ({ ...s, position: i }));
      setSections((prev) => {
        const rest = prev.filter((s) => s.page_id !== editingPage.id);
        return [...rest, ...updated];
      });
      const updates = updated.map((s) =>
        supabase
          .from("creator_page_sections")
          .update({ position: s.position })
          .eq("id", s.id),
      );
      await Promise.all(updates);
    } catch (error: any) {
      toast.error(error.message || "Failed to reorder sections");
    }
  };

  const applySectionEditor = useCallback(
    (section: PageSection) => {
      const hydrated = hydrateCreatorSectionEditor(section);

      setEditingSection(section);
      setBlockInspectorTab("content");
      setSectionTitleEdit(getSectionDisplayTitle(section));
      setSectionConfigEdit(hydrated.config);

      setEditingFormId(hydrated.collections.formId);
      setEditingLinks(hydrated.collections.links);
      setEditingImages(hydrated.collections.images);
      setEditingSelectedBotIds(hydrated.collections.selectedBotIds);
      setEditingSelectedWorldIds(hydrated.collections.selectedWorldIds);
      setEditingSelectedLorebookIds(hydrated.collections.selectedLorebookIds);

      setSavedBlockSnapshot(
        getBlockSnapshot({
          title: getSectionDisplayTitle(section),
          config: hydrated.config,
          formId: hydrated.collections.formId,
          links: hydrated.collections.links,
          images: hydrated.collections.images,
          selectedBotIds: hydrated.collections.selectedBotIds,
          selectedWorldIds: hydrated.collections.selectedWorldIds,
          selectedLorebookIds: hydrated.collections.selectedLorebookIds,
        }),
      );

      setBlockJustSaved(false);
      setWorkspaceView("edit");

      const resources = getCreatorPageBlockDefinition(section.kind).resources;

      if (resources.includes("bots")) {
        void loadAvailableBots();
      }

      if (resources.includes("worlds")) {
        void loadAvailableWorlds();
      }

      if (resources.includes("lorebooks")) {
        void loadAvailableLorebooks();
      }

      if (resources.includes("forms")) {
        void loadAvailableForms();
      }
    },
    [
      loadAvailableBots,
      loadAvailableForms,
      loadAvailableLorebooks,
      loadAvailableWorlds,
    ],
  );

  const requestOpenSection = useCallback(
    (section: PageSection) => {
      if (editingSection?.id === section.id) {
        setWorkspaceView("edit");
        return;
      }

      if (blockIsDirty) {
        setPendingBlockNavigation({
          type: "section",
          section,
        });
        setBlockDiscardDialogOpen(true);
        return;
      }

      applySectionEditor(section);
    },
    [applySectionEditor, blockIsDirty, editingSection?.id],
  );

  const handleDoneBlock = useCallback(() => {
    if (blockIsDirty) {
      setPendingBlockNavigation({
        type: "done",
      });
      setBlockDiscardDialogOpen(true);
      return;
    }

    setEditingSection(null);
    setSavedBlockSnapshot("");
    setBlockJustSaved(false);
    setWorkspaceView("edit");
  }, [blockIsDirty]);

  const getEditingSectionConfigInput = () => {
    if (!editingSection) return null;

    return {
      section: editingSection,
      editorConfig: sectionConfigEdit,
      collections: {
        formId: editingFormId,
        links: editingLinks,
        images: editingImages,
        selectedBotIds: editingSelectedBotIds,
        selectedWorldIds: editingSelectedWorldIds,
        selectedLorebookIds: editingSelectedLorebookIds,
      },
      availableForms,
    };
  };

  const buildEditingSectionConfig = (): Record<string, unknown> => {
    const input = getEditingSectionConfigInput();
    return input ? buildCreatorSectionConfig(input) : {};
  };

  const validateEditingSectionLinks = (): string | null => {
    const input = getEditingSectionConfigInput();
    return input ? validateCreatorSectionConfig(input) : null;
  };

  const handleSaveSection = useCallback(async () => {
    if (!editingSection || blockSaving || !blockIsDirty) return;

    const linkError = validateEditingSectionLinks();

    if (linkError) {
      toast.error(linkError);
      return;
    }

    setBlockSaving(true);
    setBlockJustSaved(false);

    try {
      const supabase = createClient();
      const config = buildEditingSectionConfig();

      const { error } = await supabase
        .from("creator_page_sections")
        .update({
          title: sectionTitleEdit.trim() || editingSection.title,
          config,
        })
        .eq("id", editingSection.id);

      if (error) throw error;

      setSections((prev) =>
        prev.map((s) =>
          s.id === editingSection.id
            ? { ...s, title: sectionTitleEdit.trim() || s.title, config }
            : s,
        ),
      );
      const savedTitle = sectionTitleEdit.trim() || editingSection.title;

      setEditingSection((current) =>
        current
          ? {
              ...current,
              title: savedTitle,
              config,
            }
          : current,
      );

      setSectionTitleEdit(savedTitle);
      setSavedBlockSnapshot(
        getBlockSnapshot({
          title: savedTitle,
          config: sectionConfigEdit,
          formId: editingFormId,
          links: editingLinks,
          images: editingImages,
          selectedBotIds: editingSelectedBotIds,
          selectedWorldIds: editingSelectedWorldIds,
          selectedLorebookIds: editingSelectedLorebookIds,
        }),
      );

      setBlockJustSaved(true);
      toast.success("Block saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to update section");
    } finally {
      setBlockSaving(false);
    }
  }, [
    blockIsDirty,
    blockSaving,
    editingFormId,
    editingImages,
    editingLinks,
    editingSection,
    editingSelectedBotIds,
    editingSelectedLorebookIds,
    editingSelectedWorldIds,
    sectionConfigEdit,
    sectionTitleEdit,
  ]);

  // Delete section
  const handleDeleteSection = async (sectionId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("creator_page_sections")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", sectionId);

      if (error) throw error;
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      if (editingSection?.id === sectionId) {
        setEditingSection(null);
        setSavedBlockSnapshot("");
        setBlockJustSaved(false);
      }
      toast.success("Section removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove section");
    }
  };

  // Reorder sections (move up / move down)
  const handleReorderSection = async (
    sectionId: string,
    direction: "up" | "down",
  ) => {
    if (!editingPage) return;
    const pageSections = editingPageSections;
    const idx = pageSections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= pageSections.length) return;

    const moved = [...pageSections];
    [moved[idx], moved[targetIdx]] = [moved[targetIdx], moved[idx]];

    // Update positions locally
    const updated = moved.map((s, i) => ({ ...s, position: i }));
    setSections((prev) => {
      const rest = prev.filter((s) => s.page_id !== editingPage.id);
      return [...rest, ...updated];
    });

    // Persist to database
    try {
      const supabase = createClient();
      const updates = updated.map((s) =>
        supabase
          .from("creator_page_sections")
          .update({ position: s.position })
          .eq("id", s.id),
      );
      await Promise.all(updates);
    } catch (error: any) {
      toast.error(error.message || "Failed to reorder sections");
    }
  };

  // Get sections for current editing page
  const editingPageSections = editingPage
    ? sections
        .filter((s) => s.page_id === editingPage.id)
        .sort((a, b) => a.position - b.position)
    : [];

  useEffect(() => {
    if (pageIsDirty) {
      setJustSaved(false);
    }
  }, [pageIsDirty]);

  useEffect(() => {
    if (blockIsDirty) {
      setBlockJustSaved(false);
    }
  }, [blockIsDirty]);

  useEffect(() => {
    if (!justSaved) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setJustSaved(false);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [justSaved]);

  useEffect(() => {
    if (!blockJustSaved) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setBlockJustSaved(false);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [blockJustSaved]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSaveShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";

      if (!isSaveShortcut) {
        return;
      }

      event.preventDefault();

      if (event.repeat) {
        return;
      }

      if (editingSection && blockIsDirty && !blockSaving) {
        void handleSaveSection();
        return;
      }

      if (pageIsDirty && !saving) {
        void handleSavePage();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    blockIsDirty,
    blockSaving,
    editingSection,
    handleSaveSection,
    pageIsDirty,
    saving,
  ]);

  useEffect(() => {
    if (!hasUnsavedChanges || saving || blockSaving) {
      if (historyGuardActiveRef.current) {
        historyGuardActiveRef.current = false;
      }

      return;
    }

    if (!historyGuardActiveRef.current) {
      window.history.pushState(
        {
          ...(window.history.state || {}),
          forgeworksCreatorPageBuilderGuard: true,
        },
        "",
        window.location.href,
      );

      historyGuardActiveRef.current = true;
    }

    const handlePopState = () => {
      if (allowHistoryNavigationRef.current) {
        allowHistoryNavigationRef.current = false;
        return;
      }

      window.history.pushState(
        {
          ...(window.history.state || {}),
          forgeworksCreatorPageBuilderGuard: true,
        },
        "",
        window.location.href,
      );

      historyGuardActiveRef.current = true;

      setPendingNavigation({
        type: "browser-back",
      });
      setDiscardDialogOpen(true);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [blockSaving, hasUnsavedChanges, saving]);

  useEffect(() => {
    if (!hasUnsavedChanges || saving || blockSaving) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [blockSaving, hasUnsavedChanges, saving]);

  useEffect(() => {
    if (!hasUnsavedChanges || saving || blockSaving) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");

      if (!anchor) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      if (anchor.hasAttribute("download")) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);

      if (url.origin !== window.location.origin) {
        return;
      }

      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const destination = `${url.pathname}${url.search}${url.hash}`;

      if (destination === current) {
        return;
      }

      event.preventDefault();

      setPendingNavigation({
        type: "href",
        href: destination,
      });
      setDiscardDialogOpen(true);
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [blockSaving, hasUnsavedChanges, saving]);

  const handleBack = useCallback(() => {
    if (!hasUnsavedChanges || saving || blockSaving) {
      router.back();
      return;
    }

    setPendingNavigation({
      type: "back",
    });
    setDiscardDialogOpen(true);
  }, [blockSaving, hasUnsavedChanges, router, saving]);

  // -------------------------------------------------------------------------
  // RENDER: Loading
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm">Loading Creator Page builder…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 text-center shadow-sm">
          <p className="text-base font-semibold">Could not load Creator Page</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {loadError}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-5 cursor-pointer rounded-full"
            onClick={() => void loadData()}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: Page Editor
  // -------------------------------------------------------------------------

  if (editingPage) {
    const livePageConfig: Record<string, unknown> = {
      ...((editingPage.config as Record<string, unknown>) || {}),
      schemaVersion: CREATOR_PAGE_SCHEMA_VERSION,
      accentColor: editAccentColor || "#7c3aed",
      bgStyle: editBgStyle || "default",
      fontStyle: editFontStyle || "default",
      canvasWidth: editCanvasWidth,
      sectionGap: editSectionGap,
      pagePadding: editPagePadding,
    };

    const liveSections = editingPageSections.map((section) => {
      if (!editingSection || section.id !== editingSection.id) return section;

      return {
        ...section,
        title: sectionTitleEdit.trim() || section.title,
        config: buildEditingSectionConfig(),
      };
    });

    const anchorOptions = liveSections.map((section) => {
      const anchor = getCreatorSectionAnchor(section);

      return {
        label: `${section.title || "Untitled block"} · #${anchor}`,
        value: `#${anchor}`,
      };
    });

    return (
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
        <CreatorPageBuilderHeader
          page={editingPage}
          title={editTitle}
          slug={editSlug}
          viewport={builderViewport}
          workspaceView={workspaceView}
          saving={saving}
          isDirty={pageIsDirty}
          canSave={pageIsDirty}
          justSaved={justSaved}
          onViewportChange={setBuilderViewport}
          onWorkspaceViewChange={setWorkspaceView}
          onBack={handleBack}
          onTogglePublish={() => void handleTogglePublish(editingPage)}
          onSave={() => void handleSavePage()}
        />

        <div className="mx-auto min-h-0 w-full flex-1 overflow-hidden xl:grid xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
          <div
            className={cn(
              "h-full min-h-0 min-w-0 xl:block",
              workspaceView === "blocks" ? "block" : "hidden",
            )}
          >
            <CreatorPageBlocksPanel
              panel={builderPanel}
              sections={editingPageSections}
              selectedSectionId={editingSection?.id || null}
              canvasWidth={editCanvasWidth}
              sectionGap={editSectionGap}
              pagePadding={editPagePadding}
              onPanelChange={setBuilderPanel}
              onCanvasWidthChange={setEditCanvasWidth}
              onSectionGapChange={setEditSectionGap}
              onPagePaddingChange={setEditPagePadding}
              onAddBlock={() => setAddSectionOpen(true)}
              onSelectSection={requestOpenSection}
              onDuplicateSection={(section) =>
                void handleDuplicateSection(section)
              }
              onDeleteSection={(sectionId) =>
                void handleDeleteSection(sectionId)
              }
              onMoveSection={(sectionId, direction) =>
                void handleReorderSection(sectionId, direction)
              }
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          </div>

          <div
            className={cn(
              "h-full min-h-0 min-w-0 xl:block",
              workspaceView === "preview" ? "block" : "hidden",
            )}
          >
            <CreatorPageCanvasPreview
              viewport={builderViewport}
              sections={liveSections}
              bots={availableBots}
              worlds={availableWorlds}
              lorebooks={availableLorebooks}
              forms={availableForms}
              pageConfig={livePageConfig}
              selectedSectionId={editingSection?.id || null}
              onSectionSelect={(sectionId) => {
                const nextSection = editingPageSections.find(
                  (section) => section.id === sectionId,
                );

                if (nextSection) {
                  requestOpenSection(nextSection);
                }
              }}
            />
          </div>

          <div
            className={cn(
              "h-full min-h-0 min-w-0 xl:block",
              workspaceView === "edit" ? "block" : "hidden",
            )}
          >
            <CreatorPageBlockInspector
              section={editingSection}
              title={sectionTitleEdit}
              config={sectionConfigEdit}
              tab={blockInspectorTab}
              anchorOptions={anchorOptions}
              availableBots={availableBots}
              availableWorlds={availableWorlds}
              availableLorebooks={availableLorebooks}
              availableForms={availableForms}
              editingFormId={editingFormId}
              editingLinks={editingLinks}
              editingImages={editingImages}
              editingSelectedBotIds={editingSelectedBotIds}
              editingSelectedWorldIds={editingSelectedWorldIds}
              editingSelectedLorebookIds={editingSelectedLorebookIds}
              setTitle={setSectionTitleEdit}
              setConfig={setSectionConfigEdit}
              setTab={setBlockInspectorTab}
              setEditingFormId={setEditingFormId}
              setEditingLinks={setEditingLinks}
              setEditingImages={setEditingImages}
              setEditingSelectedBotIds={setEditingSelectedBotIds}
              setEditingSelectedWorldIds={setEditingSelectedWorldIds}
              setEditingSelectedLorebookIds={setEditingSelectedLorebookIds}
              onDone={handleDoneBlock}
              onSave={() => void handleSaveSection()}
              isDirty={blockIsDirty}
              saving={blockSaving}
              justSaved={blockJustSaved}
              pageInspector={
                <CreatorPagePageInspector
                  title={editTitle}
                  slug={editSlug}
                  description={editDescription}
                  accentColor={editAccentColor}
                  backgroundStyle={editBgStyle}
                  fontStyle={editFontStyle}
                  visibility={editVisibility}
                  slugStatus={slugStatus}
                  slugMessage={slugMessage}
                  onTitleChange={setEditTitle}
                  onSlugChange={setEditSlug}
                  onDescriptionChange={setEditDescription}
                  onAccentColorChange={setEditAccentColor}
                  onBackgroundStyleChange={setEditBgStyle}
                  onFontStyleChange={setEditFontStyle}
                  onVisibilityChange={setEditVisibility}
                />
              }
            />
          </div>
        </div>

        <CreatorPageAddSectionDialog
          open={addSectionOpen}
          kind={newSectionKind}
          title={newSectionTitle}
          onOpenChange={setAddSectionOpen}
          onKindChange={setNewSectionKind}
          onTitleChange={setNewSectionTitle}
          onAdd={() => void handleAddSection()}
        />

        <AlertDialog
          open={blockDiscardDialogOpen}
          onOpenChange={(open) => {
            setBlockDiscardDialogOpen(open);

            if (!open) {
              setPendingBlockNavigation(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard block changes?</AlertDialogTitle>
              <AlertDialogDescription>
                This block has changes that have not been saved yet. Switching
                blocks will discard them.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">
                Keep editing
              </AlertDialogCancel>

              <AlertDialogAction
                className="cursor-pointer"
                onClick={() => {
                  const target = pendingBlockNavigation;

                  setPendingBlockNavigation(null);
                  setBlockDiscardDialogOpen(false);

                  if (!target) {
                    return;
                  }

                  if (target.type === "section") {
                    applySectionEditor(target.section);
                    return;
                  }

                  setEditingSection(null);
                  setSavedBlockSnapshot("");
                  setBlockJustSaved(false);
                  setWorkspaceView("edit");
                }}
              >
                Discard changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={discardDialogOpen}
          onOpenChange={(open) => {
            setDiscardDialogOpen(open);

            if (!open) {
              setPendingNavigation(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
              <AlertDialogDescription>
                You have changes that have not been saved yet. Leaving the
                builder will discard them.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">
                Keep editing
              </AlertDialogCancel>

              <AlertDialogAction
                className="cursor-pointer"
                onClick={() => {
                  const target = pendingNavigation;

                  setPendingNavigation(null);
                  setDiscardDialogOpen(false);

                  if (!target) {
                    return;
                  }

                  if (target.type === "browser-back") {
                    allowHistoryNavigationRef.current = true;
                    historyGuardActiveRef.current = false;
                    window.history.go(-2);
                    return;
                  }

                  if (target.type === "back") {
                    router.back();
                    return;
                  }

                  router.push(target.href);
                }}
              >
                Leave builder
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return <UnavailableCreatorPageEditorStatusPage />;
}
