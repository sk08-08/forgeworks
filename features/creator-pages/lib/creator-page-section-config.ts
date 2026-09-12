import {
  normalizeCreatorPageHref,
  normalizeCreatorPageHttpUrl,
  getCreatorSectionAnchor,
  normalizeCreatorSectionAnchor,
} from "@/features/creator-pages/lib/creator-page-links";
import {
  normalizeCreatorEmbedSource,
  type CreatorEmbedProvider,
} from "@/features/creator-pages/lib/creator-page-embeds";
import { CREATOR_PAGE_SCHEMA_VERSION } from "@/features/creator-pages/lib/creator-page-block-registry";
import type {
  CreatorFormInspectorItem,
  CreatorGalleryImageItem,
  CreatorSocialLinkItem,
  PageSection,
} from "@/features/creator-pages/types/creator-page-types";

export interface CreatorSectionEditorCollections {
  formId: string;
  links: CreatorSocialLinkItem[];
  images: CreatorGalleryImageItem[];
  selectedBotIds: string[];
  selectedWorldIds: string[];
  selectedLorebookIds: string[];
}

export interface HydratedCreatorSectionEditor {
  config: Record<string, string>;
  collections: CreatorSectionEditorCollections;
}

export interface BuildCreatorSectionConfigInput {
  section: PageSection;
  editorConfig: Record<string, string>;
  collections: CreatorSectionEditorCollections;
  availableForms: CreatorFormInspectorItem[];
}

export function hydrateCreatorSectionEditor(
  section: PageSection,
): HydratedCreatorSectionEditor {
  const savedConfig =
    (section.config as Record<string, unknown> | null | undefined) || {};

  const config: Record<string, string> = {};

  Object.entries(savedConfig).forEach(([key, value]) => {
    if (key === "schemaVersion") return;

    if (typeof value === "string") {
      config[key] = value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      config[key] = String(value);
    }
  });

  config.anchorId =
    normalizeCreatorSectionAnchor(savedConfig.anchorId) ||
    getCreatorSectionAnchor(section);

  let formId = "";
  let editingLinks: CreatorSocialLinkItem[] = [];
  let editingImages: CreatorGalleryImageItem[] = [];
  let selectedBotIds: string[] = [];
  let selectedWorldIds: string[] = [];
  let selectedLorebookIds: string[] = [];

  switch (section.kind) {
    case "hero": {
      config.headline = config.headline || section.title;
      config.subheadline = config.subheadline || "";
      config.ctaText = config.ctaText || "";
      config.ctaLink = config.ctaLink || "";

      config.heroImage = config.heroImage || "";
      config.overlayColor = config.overlayColor || "#000000";
      config.overlayOpacity = config.overlayOpacity || "45";
      config.height = config.height || "tall";
      config.alignment = config.alignment || "center";
      config.secondaryCtaText = config.secondaryCtaText || "";
      config.secondaryCtaLink = config.secondaryCtaLink || "";

      // V3 layout
      config.verticalAlignment = config.verticalAlignment || "center";
      config.contentWidth = config.contentWidth || "medium";

      // V3 style
      config.backgroundType =
        config.backgroundType || (config.heroImage ? "image" : "gradient");
      config.backgroundColor = config.backgroundColor || "#7c3aed";
      config.backgroundColor2 = config.backgroundColor2 || "#111827";
      config.textColor = config.textColor || "";
      config.subtextColor = config.subtextColor || "";
      config.borderRadius = config.borderRadius || "large";
      config.showSparkles =
        savedConfig.showSparkles === false ||
        savedConfig.showSparkles === "false"
          ? "false"
          : config.showSparkles || "true";

      // V3 motion
      config.entranceAnimation = config.entranceAnimation || "none";
      config.motionDuration = config.motionDuration || "600";
      config.motionDelay = config.motionDelay || "0";
      config.hoverMotion = config.hoverMotion || "none";
      break;
    }

    case "banner": {
      config.bannerTitle = config.bannerTitle || section.title;
      config.subtitle = config.subtitle || "";
      config.background = config.background || "#7c3aed";
      config.background2 = config.background2 || "#4c1d95";
      config.backgroundType = config.backgroundType || "gradient";
      config.backgroundImage = config.backgroundImage || "";
      config.overlayColor = config.overlayColor || "#000000";
      config.overlayOpacity = config.overlayOpacity || "50";
      config.alignment = config.alignment || "center";
      config.verticalAlignment = config.verticalAlignment || "center";
      config.bannerHeight = config.bannerHeight || "medium";
      config.bannerRadius = config.bannerRadius || "large";
      config.bannerContentWidth = config.bannerContentWidth || "wide";
      config.bannerTextColor = config.bannerTextColor || "";
      config.bannerSubtextColor = config.bannerSubtextColor || "";
      config.bannerEntranceAnimation = config.bannerEntranceAnimation || "none";
      config.bannerMotionDuration = config.bannerMotionDuration || "500";
      config.bannerMotionDelay = config.bannerMotionDelay || "0";
      config.ctaText = config.ctaText || "";
      config.ctaLink = config.ctaLink || "";
      config.ctaColor = config.ctaColor || "";
      config.secondaryCtaText = config.secondaryCtaText || "";
      config.secondaryCtaLink = config.secondaryCtaLink || "";
      break;
    }

    case "text_block": {
      config.body = config.body || "";
      config.backgroundColor = config.backgroundColor || "";
      config.textColor = config.textColor || "";
      config.textAlignment = config.textAlignment || "left";
      config.padding = config.padding || "normal";
      config.fontSize = config.fontSize || "normal";
      config.maxWidth = config.maxWidth || "wide";
      config.textSurface = config.textSurface || "card";
      config.textRadius = config.textRadius || "large";
      config.textShadow = config.textShadow || "none";
      config.textEntranceAnimation = config.textEntranceAnimation || "none";
      config.textMotionDuration = config.textMotionDuration || "500";
      config.textMotionDelay = config.textMotionDelay || "0";
      config.bordered =
        savedConfig.bordered === false || savedConfig.bordered === "false"
          ? "false"
          : config.bordered || "true";
      break;
    }

    case "bot_showcase":
    case "bot_group": {
      config.description = config.description || "";
      config.columns = config.columns || "3";

      config.botLayout = config.botLayout || "grid";
      config.botCardStyle = config.botCardStyle || "glass";
      config.botImageRatio = config.botImageRatio || "landscape";
      config.botGap = config.botGap || "normal";
      config.botCardRadius = config.botCardRadius || "large";
      config.botHoverMotion = config.botHoverMotion || "lift";

      config.showBotImage =
        savedConfig.showBotImage === false ||
        savedConfig.showBotImage === "false"
          ? "false"
          : config.showBotImage || "true";

      config.showBotDescription =
        savedConfig.showBotDescription === false ||
        savedConfig.showBotDescription === "false"
          ? "false"
          : config.showBotDescription || "true";

      config.showBotTags =
        savedConfig.showBotTags === false || savedConfig.showBotTags === "false"
          ? "false"
          : config.showBotTags || "true";

      config.showBotRating =
        savedConfig.showBotRating === false ||
        savedConfig.showBotRating === "false"
          ? "false"
          : config.showBotRating || "true";

      const savedBotIds = savedConfig.selectedBotIds;
      selectedBotIds = Array.isArray(savedBotIds)
        ? savedBotIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [];
      break;
    }

    case "world_showcase": {
      config.description = config.description || "";

      config.worldLayout = config.worldLayout || "grid";
      config.worldColumns = config.worldColumns || "3";
      config.worldGap = config.worldGap || "normal";

      config.worldCardStyle = config.worldCardStyle || "card";
      config.worldCardRadius = config.worldCardRadius || "large";
      config.worldTextAlign = config.worldTextAlign || "left";

      config.showWorldDescription =
        savedConfig.showWorldDescription === false ||
        savedConfig.showWorldDescription === "false"
          ? "false"
          : config.showWorldDescription || "true";

      config.showWorldType =
        savedConfig.showWorldType === false ||
        savedConfig.showWorldType === "false"
          ? "false"
          : config.showWorldType || "true";

      config.showWorldBotCount =
        savedConfig.showWorldBotCount === false ||
        savedConfig.showWorldBotCount === "false"
          ? "false"
          : config.showWorldBotCount || "true";

      config.worldHoverMotion = config.worldHoverMotion || "lift";
      config.worldEntranceAnimation = config.worldEntranceAnimation || "none";
      config.worldMotionDuration = config.worldMotionDuration || "500";
      config.worldMotionDelay = config.worldMotionDelay || "0";

      const savedWorldIds = savedConfig.selectedWorldIds;
      selectedWorldIds = Array.isArray(savedWorldIds)
        ? savedWorldIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [];
      break;
    }

    case "lorebook_gallery": {
      config.description = config.description || "";
      config.lorebookLayout = config.lorebookLayout || "grid";
      config.lorebookColumns = config.lorebookColumns || "3";
      config.lorebookGap = config.lorebookGap || "normal";
      config.lorebookCardStyle = config.lorebookCardStyle || "card";
      config.lorebookCardRadius = config.lorebookCardRadius || "large";
      config.lorebookTextAlign = config.lorebookTextAlign || "left";
      config.lorebookHoverMotion = config.lorebookHoverMotion || "lift";
      config.lorebookEntranceAnimation =
        config.lorebookEntranceAnimation || "none";
      config.lorebookMotionDuration = config.lorebookMotionDuration || "500";
      config.lorebookMotionDelay = config.lorebookMotionDelay || "0";

      config.showLorebookSummary =
        savedConfig.showLorebookSummary === false ||
        savedConfig.showLorebookSummary === "false"
          ? "false"
          : config.showLorebookSummary || "true";

      config.showLorebookWorld =
        savedConfig.showLorebookWorld === false ||
        savedConfig.showLorebookWorld === "false"
          ? "false"
          : config.showLorebookWorld || "true";

      selectedLorebookIds = Array.isArray(savedConfig.lorebookIds)
        ? savedConfig.lorebookIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [];
      break;
    }

    case "form": {
      config.formHeading = config.formHeading || section.title;
      config.description = config.description || "";
      config.ctaText = config.ctaText || "Open form";

      config.formLayout = config.formLayout || "card";
      config.formAlignment = config.formAlignment || "left";
      config.formContentWidth = config.formContentWidth || "wide";

      config.formSurface = config.formSurface || "card";
      config.formRadius = config.formRadius || "large";
      config.formAccentStyle = config.formAccentStyle || "icon";
      config.formShowStatus =
        savedConfig.formShowStatus === false ||
        savedConfig.formShowStatus === "false"
          ? "false"
          : config.formShowStatus || "true";

      config.formHoverMotion = config.formHoverMotion || "lift";
      config.formEntranceAnimation = config.formEntranceAnimation || "none";
      config.formMotionDuration = config.formMotionDuration || "500";
      config.formMotionDelay = config.formMotionDelay || "0";

      formId = typeof savedConfig.formId === "string" ? savedConfig.formId : "";
      break;
    }

    case "social_links": {
      const links = savedConfig.links;

      editingLinks = Array.isArray(links)
        ? links.map((link: unknown) => {
            const item =
              link && typeof link === "object"
                ? (link as Record<string, unknown>)
                : {};

            return {
              platform:
                typeof item.platform === "string" ? item.platform : "website",
              url: typeof item.url === "string" ? item.url : "",
              label: typeof item.label === "string" ? item.label : "",
            };
          })
        : [];

      config.socialLayout = config.socialLayout || "pills";
      config.socialAlignment = config.socialAlignment || "left";
      config.socialSize = config.socialSize || "medium";
      config.socialStyle = config.socialStyle || "outline";
      config.socialRadius = config.socialRadius || "pill";
      config.socialHoverMotion = config.socialHoverMotion || "lift";
      config.socialEntranceAnimation = config.socialEntranceAnimation || "none";
      config.socialMotionDuration = config.socialMotionDuration || "450";
      config.socialMotionDelay = config.socialMotionDelay || "0";

      config.socialShowLabels =
        savedConfig.socialShowLabels === false ||
        savedConfig.socialShowLabels === "false"
          ? "false"
          : config.socialShowLabels || "true";

      break;
    }

    case "gallery": {
      const images = savedConfig.images;

      editingImages = Array.isArray(images)
        ? images.map((image: unknown) => {
            const item =
              image && typeof image === "object"
                ? (image as Record<string, unknown>)
                : {};

            return {
              url: typeof item.url === "string" ? item.url : "",
              alt: typeof item.alt === "string" ? item.alt : "",
              caption: typeof item.caption === "string" ? item.caption : "",
            };
          })
        : [];

      config.columns = config.columns || "3";
      config.gap = config.gap || "normal";
      config.galleryLayout = config.galleryLayout || "grid";
      config.galleryRatio = config.galleryRatio || "square";
      config.galleryFit = config.galleryFit || "cover";
      config.galleryPosition = config.galleryPosition || "center";
      config.galleryCardStyle = config.galleryCardStyle || "clean";
      config.galleryImageRadius = config.galleryImageRadius || "md";
      config.galleryFrameRadius = config.galleryFrameRadius || "lg";
      config.galleryCaptionStyle = config.galleryCaptionStyle || "below";
      config.galleryCaptionAlign = config.galleryCaptionAlign || "left";
      config.galleryHoverMotion = config.galleryHoverMotion || "scale";
      config.galleryClickBehavior = config.galleryClickBehavior || "none";
      config.gallerySectionSurface =
        config.gallerySectionSurface || "transparent";
      config.gallerySectionPadding = config.gallerySectionPadding || "normal";
      config.galleryBorderWidth = config.galleryBorderWidth || "1";
      config.galleryImageBorder = config.galleryImageBorder || "none";

      config.showGalleryCaptions =
        savedConfig.showGalleryCaptions === true ||
        savedConfig.showGalleryCaptions === "true"
          ? "true"
          : config.showGalleryCaptions || "false";

      break;
    }

    case "sticker": {
      config.imageUrl = config.imageUrl || "";
      config.alt = config.alt || "";
      config.size = config.size || "medium";
      config.alignment = config.alignment || "center";
      config.rounded = config.rounded || "md";
      config.positionMode = config.positionMode || "static";
      config.posX = config.posX || "0px";
      config.posY = config.posY || "0px";
      config.rotation = config.rotation || "0";
      config.opacity = config.opacity || "100";
      config.zIndex = config.zIndex || "10";

      // Desktop is the base layout. Existing Creator Pages keep their
      // current behavior because "left" matches the old posX semantics.
      config.stickerAnchor = config.stickerAnchor || "left";

      config.stickerShadow = config.stickerShadow || "soft";
      config.stickerHoverMotion = config.stickerHoverMotion || "none";
      config.stickerEntranceAnimation =
        config.stickerEntranceAnimation || "none";
      config.stickerMotionDuration = config.stickerMotionDuration || "500";
      config.stickerMotionDelay = config.stickerMotionDelay || "0";
      config.stickerBorderStyle = config.stickerBorderStyle || "none";
      config.stickerBorderWidth = config.stickerBorderWidth || "1";
      config.stickerBorderColor = config.stickerBorderColor || "";
      config.stickerWidth = config.stickerWidth || "256";
      config.stickerUseCustomWidth =
        savedConfig.stickerUseCustomWidth === true ||
        savedConfig.stickerUseCustomWidth === "true"
          ? "true"
          : config.stickerUseCustomWidth || "false";

      // Tablet override. When disabled, the renderer inherits Desktop.
      config.stickerTabletOverride =
        savedConfig.stickerTabletOverride === true ||
        savedConfig.stickerTabletOverride === "true"
          ? "true"
          : "false";
      config.stickerTabletPositionMode =
        config.stickerTabletPositionMode || config.positionMode;
      config.stickerTabletSize = config.stickerTabletSize || config.size;
      config.stickerTabletAlignment =
        config.stickerTabletAlignment || config.alignment;
      config.stickerTabletUseCustomWidth =
        savedConfig.stickerTabletUseCustomWidth === true ||
        savedConfig.stickerTabletUseCustomWidth === "true"
          ? "true"
          : config.stickerUseCustomWidth;
      config.stickerTabletWidth =
        config.stickerTabletWidth || config.stickerWidth;
      config.stickerTabletAnchor =
        config.stickerTabletAnchor || config.stickerAnchor;
      config.stickerTabletPosX = config.stickerTabletPosX || config.posX;
      config.stickerTabletPosY = config.stickerTabletPosY || config.posY;
      config.stickerTabletZIndex = config.stickerTabletZIndex || config.zIndex;

      // Mobile override. When disabled, the renderer inherits the resolved
      // Tablet layout (which itself may inherit Desktop).
      config.stickerMobileOverride =
        savedConfig.stickerMobileOverride === true ||
        savedConfig.stickerMobileOverride === "true"
          ? "true"
          : "false";
      config.stickerMobilePositionMode =
        config.stickerMobilePositionMode || config.stickerTabletPositionMode;
      config.stickerMobileSize =
        config.stickerMobileSize || config.stickerTabletSize;
      config.stickerMobileAlignment =
        config.stickerMobileAlignment || config.stickerTabletAlignment;
      config.stickerMobileUseCustomWidth =
        savedConfig.stickerMobileUseCustomWidth === true ||
        savedConfig.stickerMobileUseCustomWidth === "true"
          ? "true"
          : config.stickerTabletUseCustomWidth;
      config.stickerMobileWidth =
        config.stickerMobileWidth || config.stickerTabletWidth;
      config.stickerMobileAnchor =
        config.stickerMobileAnchor || config.stickerTabletAnchor;
      config.stickerMobilePosX =
        config.stickerMobilePosX || config.stickerTabletPosX;
      config.stickerMobilePosY =
        config.stickerMobilePosY || config.stickerTabletPosY;
      config.stickerMobileZIndex =
        config.stickerMobileZIndex || config.stickerTabletZIndex;

      break;
    }

    case "divider": {
      config.dividerStyle = config.dividerStyle || "solid";
      config.dividerThickness = config.dividerThickness || "1";
      config.dividerWidth = config.dividerWidth || "100";
      config.dividerAlignment = config.dividerAlignment || "center";
      config.dividerColorMode = config.dividerColorMode || "accent";
      config.dividerCustomColor = config.dividerCustomColor || "";
      config.dividerOpacity = config.dividerOpacity || "35";
      config.dividerGlow =
        savedConfig.dividerGlow === true || savedConfig.dividerGlow === "true"
          ? "true"
          : config.dividerGlow || "false";
      config.dividerEntranceAnimation =
        config.dividerEntranceAnimation || "none";
      config.dividerMotionDuration = config.dividerMotionDuration || "500";
      config.dividerMotionDelay = config.dividerMotionDelay || "0";

      break;
    }

    case "spacer": {
      config.spacerHeight = config.spacerHeight || "48";
      config.spacerResponsive =
        savedConfig.spacerResponsive === true ||
        savedConfig.spacerResponsive === "true"
          ? "true"
          : config.spacerResponsive || "false";
      config.spacerMobileHeight = config.spacerMobileHeight || "32";
      break;
    }

    case "embed": {
      config.embedHeading = config.embedHeading || section.title;
      config.embedCaption = config.embedCaption || "";

      config.embedType = config.embedType || "youtube";
      config.embedUrl = config.embedUrl || "";

      config.embedWidth = config.embedWidth || "wide";
      config.embedAlignment = config.embedAlignment || "center";
      config.embedAspectRatio = config.embedAspectRatio || "16:9";
      config.embedHeight = config.embedHeight || "400";
      config.spotifySize = config.spotifySize || "standard";

      config.embedSurface = config.embedSurface || "none";
      config.embedRadius = config.embedRadius || "large";
      config.embedBorder = config.embedBorder || "subtle";
      config.embedShadow = config.embedShadow || "none";

      config.embedHoverMotion = config.embedHoverMotion || "none";
      config.embedEntranceAnimation = config.embedEntranceAnimation || "none";
      config.embedMotionDuration = config.embedMotionDuration || "550";
      config.embedMotionDelay = config.embedMotionDelay || "0";

      break;
    }
  }

  return {
    config,
    collections: {
      formId,
      links: editingLinks,
      images: editingImages,
      selectedBotIds,
      selectedWorldIds,
      selectedLorebookIds,
    },
  };
}

export function buildCreatorSectionConfig({
  section,
  editorConfig,
  collections,
  availableForms,
}: BuildCreatorSectionConfigInput): Record<string, unknown> {
  const config: Record<string, unknown> = {
    ...((section.config as Record<string, unknown>) || {}),
    schemaVersion: CREATOR_PAGE_SCHEMA_VERSION,
  };

  Object.entries(editorConfig).forEach(([key, value]) => {
    if (value === "true") {
      config[key] = true;
    } else if (value === "false") {
      config[key] = false;
    } else if (value.trim()) {
      config[key] = value.trim();
    } else {
      delete config[key];
    }
  });

  if (section.kind === "form") {
    if (collections.formId) {
      config.formId = collections.formId;
      const selected = availableForms.find(
        (form) => form.id === collections.formId,
      );

      if (selected) {
        config.shareableLink = selected.shareable_link;
      }
    } else {
      delete config.formId;
      delete config.shareableLink;
    }
  }

  if (section.kind === "social_links") {
    config.links = collections.links.map((link) => {
      const normalized = normalizeCreatorPageHttpUrl(link.url, {
        label: "social link",
      });

      return {
        ...link,
        url:
          normalized.valid && normalized.href !== null
            ? normalized.href
            : link.url.trim(),
      };
    });
  }

  if (section.kind === "embed") {
    const provider = (config.embedType as CreatorEmbedProvider) || "youtube";
    const rawUrl =
      typeof config.embedUrl === "string" ? config.embedUrl.trim() : "";

    if (rawUrl) {
      const normalized = normalizeCreatorEmbedSource({
        provider,
        url: rawUrl,
        twitchParent: "localhost",
      });

      if (normalized.valid && normalized.normalizedUrl) {
        config.embedUrl = normalized.normalizedUrl;
      }
    }
  }

  if (section.kind === "gallery") {
    config.images = collections.images.map((image) => {
      const normalized = normalizeCreatorPageHttpUrl(image.url, {
        label: "image URL",
      });

      return {
        ...image,
        url:
          normalized.valid && normalized.href !== null
            ? normalized.href
            : image.url.trim(),
      };
    });
  }

  for (const key of ["ctaLink", "secondaryCtaLink"]) {
    if (typeof config[key] !== "string" || !config[key].trim()) continue;

    const normalized = normalizeCreatorPageHref(config[key]);

    if (normalized.valid && normalized.href !== null) {
      config[key] = normalized.href;
    }
  }

  for (const key of ["heroImage", "backgroundImage", "imageUrl", "embedUrl"]) {
    if (typeof config[key] !== "string" || !config[key].trim()) continue;

    const normalized = normalizeCreatorPageHttpUrl(config[key], {
      label: "URL",
    });

    if (normalized.valid && normalized.href !== null) {
      config[key] = normalized.href;
    }
  }

  if (section.kind === "bot_showcase" || section.kind === "bot_group") {
    if (collections.selectedBotIds.length > 0) {
      config.selectedBotIds = collections.selectedBotIds;
    } else {
      delete config.selectedBotIds;
    }
  }

  if (section.kind === "world_showcase") {
    if (collections.selectedWorldIds.length > 0) {
      config.selectedWorldIds = collections.selectedWorldIds;
    } else {
      delete config.selectedWorldIds;
    }
  }

  if (section.kind === "lorebook_gallery") {
    if (collections.selectedLorebookIds.length > 0) {
      config.lorebookIds = collections.selectedLorebookIds;
    } else {
      delete config.lorebookIds;
    }
  }

  return config;
}

export function validateCreatorSectionConfig(
  input: BuildCreatorSectionConfigInput,
): string | null {
  const config = buildCreatorSectionConfig(input);

  for (const [key, label] of [
    ["ctaLink", "Primary button link"],
    ["secondaryCtaLink", "Secondary button link"],
  ] as const) {
    const value = String(config[key] ?? "").trim();
    if (!value) continue;

    const result = normalizeCreatorPageHref(value);
    if (!result.valid) return `${label}: ${result.message}`;
  }

  for (const [key, label] of [
    ["heroImage", "Hero image"],
    ["backgroundImage", "Background image"],
    ["imageUrl", "Image"],
    ["embedUrl", "Embed URL"],
  ] as const) {
    const value = String(config[key] ?? "").trim();
    if (!value) continue;

    const result = normalizeCreatorPageHttpUrl(value, {
      label: label.toLowerCase(),
    });

    if (!result.valid) return `${label}: ${result.message}`;
  }

  if (input.section.kind === "social_links") {
    for (const link of input.collections.links) {
      if (!link.url.trim()) continue;

      const result = normalizeCreatorPageHttpUrl(link.url, {
        label: "social link",
      });

      if (!result.valid) {
        return `${link.label || link.platform || "Social link"}: ${
          result.message
        }`;
      }
    }
  }

  if (input.section.kind === "gallery") {
    for (const image of input.collections.images) {
      if (!image.url.trim()) continue;

      const result = normalizeCreatorPageHttpUrl(image.url, {
        label: "image URL",
      });

      if (!result.valid) return `Gallery image: ${result.message}`;
    }
  }

  return null;
}
