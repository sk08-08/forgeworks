// ----------------------------------------------------------------------------
// Creator Page Types
// ----------------------------------------------------------------------------

import type { Dispatch, SetStateAction } from "react";

// ----------------------------------------------------------------------------
// Core section/page types
// ----------------------------------------------------------------------------

export type SectionKind =
  | "hero"
  | "bot_showcase"
  | "world_showcase"
  | "text_block"
  | "lorebook_gallery"
  | "banner"
  | "bot_group"
  | "form"
  | "sticker"
  | "divider"
  | "social_links"
  | "spacer"
  | "gallery"
  | "embed";

export interface CreatorPage {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string;
  config: Record<string, unknown>;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatorPageSection {
  id: string;
  page_id: string;
  kind: SectionKind;
  title: string;
  config: Record<string, unknown>;
  position: number;
}

/**
 * Builder-side section row.
 * The builder reads `created_at` from active_creator_page_sections.
 */
export interface PageSection extends CreatorPageSection {
  created_at: string;
}

// ----------------------------------------------------------------------------
// Page canvas / appearance
// ----------------------------------------------------------------------------

export type CreatorPageCanvasWidth = "narrow" | "standard" | "wide" | "full";

export type CreatorPageSectionGap = "compact" | "normal" | "relaxed";

export type CreatorPagePadding = "compact" | "normal" | "spacious";

export type CreatorPageMotionPreset = "none" | "subtle" | "expressive";

export type CreatorPageBackgroundStyle =
  | "default"
  | "dark"
  | "ambient"
  | "minimal";

export type CreatorPageFontStyle =
  | "default"
  | "serif"
  | "mono"
  | "display";

export interface CreatorPageConfig {
  schemaVersion?: number;

  canvasWidth?: CreatorPageCanvasWidth;
  sectionGap?: CreatorPageSectionGap;
  pagePadding?: CreatorPagePadding;
  motionPreset?: CreatorPageMotionPreset;

  accentColor?: string;
  bgStyle?: CreatorPageBackgroundStyle;
  fontStyle?: CreatorPageFontStyle;

  // Section/page JSON config remains intentionally extensible.
  [key: string]: unknown;
}

// ----------------------------------------------------------------------------
// Public/live preview resources
// ----------------------------------------------------------------------------

export interface BotPreview {
  id: string;
  name: string;
  short_description: string;
  tags: string[];
  rating: string;
  image_url: string | null;
  created_at: string;
  hide_sensitive_fields?: boolean;
}

export interface WorldPreview {
  id: string;
  title: string;
  slug: string;
  description: string;
  bot_ids: string[];
}

export interface CreatorPageLorebookPreview {
  id: string;
  title: string;
  summary: string;
}

export interface CreatorPageFormState {
  id: string;
  shareable_link: string;
  is_active: boolean;
  deactivated_message: string;
  deactivated_redirect_url: string;
  deactivated_redirect_label: string;
  deactivated_accent_color: string;
}

export interface CreatorPageViewProps {
  sections: CreatorPageSection[];
  bots: BotPreview[];
  worlds: WorldPreview[];
  pageConfig?: CreatorPageConfig;

  lorebooks?: CreatorPageLorebookPreview[];
  formStates?: Record<string, CreatorPageFormState>;

  isBuilderPreview?: boolean;
  selectedSectionId?: string | null;
  onSectionSelect?: (sectionId: string) => void;
}

// ----------------------------------------------------------------------------
// Builder shell
// ----------------------------------------------------------------------------

export type CreatorBuilderViewport = "desktop" | "tablet" | "mobile";

export type CreatorBuilderPanel = "blocks" | "page";

// ----------------------------------------------------------------------------
// Inspector shared types
// ----------------------------------------------------------------------------

export type CreatorInspectorTab = "content" | "layout" | "style" | "motion";

export interface CreatorInspectorBaseProps {
  blockInspectorTab: CreatorInspectorTab;
  setBlockInspectorTab: Dispatch<SetStateAction<CreatorInspectorTab>>;
  sectionConfigEdit: Record<string, string>;
  setSectionConfigEdit: Dispatch<SetStateAction<Record<string, string>>>;
}

export interface CreatorInspectorAnchorOption {
  label: string;
  value: string;
}

// ----------------------------------------------------------------------------
// Inspector resource items
// ----------------------------------------------------------------------------

export type CreatorBotInspectorItem = BotPreview;

export type CreatorWorldInspectorItem = WorldPreview;

export interface CreatorLorebookInspectorItem
  extends CreatorPageLorebookPreview {}

export interface CreatorGalleryImageItem {
  url: string;
  alt: string;
  caption?: string;
}

export interface CreatorFormInspectorItem extends CreatorPageFormState {
  form_title: string;
}

export interface CreatorSocialLinkItem {
  platform: string;
  url: string;
  label: string;
}
