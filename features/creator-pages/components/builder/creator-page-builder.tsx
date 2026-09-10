// ============================================================================
// Forgeworks - Creator Pages Editor
// Create and manage customizable public creator pages
// ============================================================================

"use client";

import { useEffect, useState, useCallback, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { checkSlugAvailability } from "@/features/creator-pages/actions/slug-check";
import { toast } from "sonner";
import { getCreatorSectionAnchor } from "@/features/creator-pages/lib/creator-page-links";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";

import { UnavailableCreatorPageEditorStatusPage } from "@/components/shared/status-page";

import { CreatorPageAddSectionDialog } from "@/features/creator-pages/components/builder/creator-page-add-section-dialog";
import { CreatorPageBlockInspector } from "@/features/creator-pages/components/builder/creator-page-block-inspector";
import { CreatorPageBlocksPanel } from "@/features/creator-pages/components/builder/creator-page-blocks-panel";
import { CreatorPageBuilderHeader } from "@/features/creator-pages/components/builder/creator-page-builder-header";
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
// Component
// ---------------------------------------------------------------------------

export function CreatorPageBuilder({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);
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

  const [saving, setSaving] = useState(false);

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

  // Load the one page owned by the signed-in user.
  const loadData = useCallback(async () => {
    setLoading(true);

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
            "id, user_id, slug, title, description, config, is_published, created_at, updated_at",
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
      const cfg = page.config || {};

      setCurrentUserId(access.user.id);
      setEditingPage(page);
      setSections((sectionData || []) as PageSection[]);

      setEditTitle(page.title);
      setEditSlug(page.slug);
      setEditDescription(page.description);
      setEditAccentColor(
        typeof cfg.accentColor === "string" && cfg.accentColor.trim()
          ? cfg.accentColor
          : "#7c3aed",
      );
      setEditBgStyle(
        cfg.bgStyle === "dark" ||
          cfg.bgStyle === "ambient" ||
          cfg.bgStyle === "minimal"
          ? cfg.bgStyle
          : "default",
      );
      setEditFontStyle(
        cfg.fontStyle === "serif" ||
          cfg.fontStyle === "mono" ||
          cfg.fontStyle === "display"
          ? cfg.fontStyle
          : "default",
      );
      setEditCanvasWidth(
        cfg.canvasWidth === "narrow" ||
          cfg.canvasWidth === "wide" ||
          cfg.canvasWidth === "full"
          ? cfg.canvasWidth
          : "standard",
      );
      setEditSectionGap(
        cfg.sectionGap === "compact" || cfg.sectionGap === "relaxed"
          ? cfg.sectionGap
          : "normal",
      );
      setEditPagePadding(
        cfg.pagePadding === "compact" || cfg.pagePadding === "spacious"
          ? cfg.pagePadding
          : "normal",
      );
      setBuilderPanel("blocks");
    } catch (error) {
      console.error("Failed to load Creator Page builder:", error);
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

  const closeEditor = () => {
    router.back();
  };

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
    if (!editingPage || !currentUserId) return;
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
    setSaving(true);
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
          title: editTitle.trim() || "Untitled",
          slug: editSlug.trim() || editingPage.slug,
          description: editDescription.trim(),
          config: pageConfig,
        })
        .eq("id", editingPage.id)
        .eq("user_id", currentUserId);

      if (error) throw error;

      const updated: CreatorPage = {
        ...editingPage,
        title: editTitle.trim() || "Untitled",
        slug: editSlug.trim() || editingPage.slug,
        description: editDescription.trim(),
        config: pageConfig,
        updated_at: new Date().toISOString(),
      };
      setEditingPage(updated);
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
      setSections((prev) => [...prev, data as PageSection]);
      setAddSectionOpen(false);
      setNewSectionTitle("");
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
      setSections((prev) => [...prev, data as PageSection]);
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

  const openSectionEditor = (section: PageSection) => {
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
  };

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

  const handleSaveSection = async () => {
    if (!editingSection) return;

    const linkError = validateEditingSectionLinks();

    if (linkError) {
      toast.error(linkError);
      return;
    }

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
      setEditingSection((current) =>
        current
          ? {
              ...current,
              title: sectionTitleEdit.trim() || current.title,
              config,
            }
          : current,
      );
      toast.success("Block saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to update section");
    }
  };

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

  // -------------------------------------------------------------------------
  // RENDER: Loading
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Loading your pages…</p>
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

    const previewWidthClass =
      builderViewport === "mobile"
        ? "w-[390px]"
        : builderViewport === "tablet"
          ? "w-[768px]"
          : "w-full";

    const previewScaleLabel =
      builderViewport === "mobile"
        ? "390px"
        : builderViewport === "tablet"
          ? "768px"
          : "Responsive";

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
      <div className="flex min-h-[calc(100vh-1rem)] flex-col bg-background">
        <CreatorPageBuilderHeader
          page={editingPage}
          title={editTitle}
          slug={editSlug}
          viewport={builderViewport}
          saving={saving}
          onViewportChange={setBuilderViewport}
          onBack={closeEditor}
          onTogglePublish={() => void handleTogglePublish(editingPage)}
          onSave={() => void handleSavePage()}
        />

        <div className="mx-auto grid w-full flex-1 grid-cols-1 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
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
            onSelectSection={openSectionEditor}
            onDuplicateSection={(section) =>
              void handleDuplicateSection(section)
            }
            onDeleteSection={(sectionId) => void handleDeleteSection(sectionId)}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />

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
              if (editingSection?.id === sectionId) return;

              const nextSection = editingPageSections.find(
                (section) => section.id === sectionId,
              );

              if (nextSection) {
                openSectionEditor(nextSection);
              }
            }}
          />

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
            onDone={() => setEditingSection(null)}
            onSave={() => void handleSaveSection()}
            pageInspector={
              <CreatorPagePageInspector
                title={editTitle}
                slug={editSlug}
                description={editDescription}
                accentColor={editAccentColor}
                backgroundStyle={editBgStyle}
                fontStyle={editFontStyle}
                slugStatus={slugStatus}
                slugMessage={slugMessage}
                onTitleChange={setEditTitle}
                onSlugChange={setEditSlug}
                onDescriptionChange={setEditDescription}
                onAccentColorChange={setEditAccentColor}
                onBackgroundStyleChange={setEditBgStyle}
                onFontStyleChange={setEditFontStyle}
              />
            }
          />
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
      </div>
    );
  }

  return <UnavailableCreatorPageEditorStatusPage />;
}
