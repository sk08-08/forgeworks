// ============================================================================
// Forgeworks - Creator Page Section Renderer
// Renders all Creator Page block kinds.
// ============================================================================

"use client";

import { useEffect, useState, type ComponentType } from "react";

import {
  Globe,
  Bot,
  Layout,
  Layers,
  Sparkles,
  MessageCircle,
  Image as ImageIcon,
  Share2,
  Send,
  SquarePen,
  Ban,
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
  InstagramIcon,
  RedditIcon,
  BlueskyIcon,
} from "@/components/ui/social-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import motionStyles from "./creator-page-motion.module.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
  normalizeCreatorPageHref,
  normalizeCreatorPageHttpUrl,
} from "@/features/creator-pages/lib/creator-page-links";
import {
  normalizeCreatorEmbedSource,
  type CreatorEmbedProvider,
} from "@/features/creator-pages/lib/creator-page-embeds";
import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";
import { BotCardGrid } from "./bot-card-grid";
import { BotCardList } from "./bot-card-list";
import type {
  BotPreview,
  CreatorPageFormState,
  CreatorPageLorebookPreview,
  CreatorPageSection,
  WorldPreview,
} from "@/features/creator-pages/types/creator-page-types";

export interface SectionRendererProps {
  section: CreatorPageSection;
  bots: BotPreview[];
  worlds: WorldPreview[];
  lorebooks?: CreatorPageLorebookPreview[];
  themeColor: string;
  onBotClick?: (bot: BotPreview) => void;
  isBuilderPreview?: boolean;
  formState?: CreatorPageFormState | null;
}

const socialIconMap: Record<
  string,
  ComponentType<{ className?: string; size?: number }>
> = {
  janitorai: JanitorAIIcon,
  twitter: TwitterIcon,
  discord: DiscordIcon,
  github: GithubIcon,
  tiktok: TiktokIcon,
  youtube: YoutubeIcon,
  twitch: TwitchIcon,
  website: WebsiteIcon,
  instagram: InstagramIcon,
  reddit: RedditIcon,
  bluesky: BlueskyIcon,
};

function creatorHoverClass(preset: string, disabled = false): string {
  if (disabled || preset === "none") return "";

  const variant =
    preset === "scale"
      ? motionStyles.hoverScale
      : preset === "glow"
        ? motionStyles.hoverGlow
        : motionStyles.hoverLift;

  return `${motionStyles.hoverBase} ${variant}`;
}

function CreatorBotCardV3({
  bot,
  themeColor,
  config,
  onClick,
  isBuilderPreview = false,
}: {
  bot: BotPreview;
  themeColor: string;
  config: Record<string, unknown>;
  onClick?: () => void;
  isBuilderPreview?: boolean;
}) {
  const cardStyle = String(config.botCardStyle || "glass");
  const imageRatio = String(config.botImageRatio || "landscape");
  const radius = String(config.botCardRadius || "large");
  const hoverMotion = String(config.botHoverMotion || "lift");

  const showImage =
    config.showBotImage !== false && config.showBotImage !== "false";
  const showDescription =
    config.showBotDescription !== false &&
    config.showBotDescription !== "false";
  const showTags =
    config.showBotTags !== false && config.showBotTags !== "false";
  const showRating =
    config.showBotRating !== false && config.showBotRating !== "false";

  const ratioClass =
    imageRatio === "square"
      ? "aspect-square"
      : imageRatio === "portrait"
        ? "aspect-[3/4]"
        : imageRatio === "wide"
          ? "aspect-video"
          : "aspect-[16/10]";

  const radiusClass =
    radius === "none"
      ? "rounded-none"
      : radius === "small"
        ? "rounded-lg"
        : radius === "medium"
          ? "rounded-2xl"
          : "rounded-3xl";

  const styleClass =
    cardStyle === "minimal"
      ? "border border-transparent bg-transparent shadow-none"
      : cardStyle === "solid"
        ? "border-border/70 bg-card shadow-md"
        : cardStyle === "outline"
          ? "border-border bg-transparent shadow-none"
          : isBuilderPreview
            ? "border-border/60 bg-card/95 shadow-sm"
            : "border-white/10 bg-card/75 shadow-xl shadow-black/[0.06] backdrop-blur-xl";

  const hoverClass = creatorHoverClass(hoverMotion, isBuilderPreview);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group/bot-card flex w-full min-w-0 cursor-pointer flex-col overflow-hidden border text-left transition-[transform,box-shadow,border-color,background-color] duration-300 ${radiusClass} ${styleClass} ${hoverClass}`}
      style={{
        borderColor: cardStyle === "outline" ? `${themeColor}35` : undefined,
      }}
    >
      {showImage && (
        <div
          className={`relative w-full overflow-hidden bg-muted ${ratioClass}`}
        >
          {bot.image_url ? (
            <img
              src={bot.image_url}
              alt=""
              loading="lazy"
              decoding="async"
              className={cn(
                "h-full w-full object-cover",
                !isBuilderPreview &&
                  "transition-transform duration-500 group-hover/bot-card:scale-[1.025]",
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Bot className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}

          {showRating && bot.rating && (
            <Badge
              className={cn(
                "absolute right-2.5 top-2.5 rounded-full bg-background/90 text-foreground shadow-sm",
                !isBuilderPreview && "backdrop-blur",
              )}
            >
              {bot.rating}
            </Badge>
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <h3 className="truncate font-semibold tracking-tight">{bot.name}</h3>

        {showDescription && bot.short_description && (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {bot.short_description}
          </p>
        )}

        {showTags && Array.isArray(bot.tags) && bot.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {bot.tags.slice(0, 4).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="rounded-full text-[10px]"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function CreatorEmbedFrame({
  provider,
  rawUrl,
  title,
  className,
  style,
  iframeHeight,
}: {
  provider: CreatorEmbedProvider;
  rawUrl: string;
  title: string;
  className?: string;
  style?: React.CSSProperties;
  iframeHeight?: number;
}) {
  const [twitchParent, setTwitchParent] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    if (provider !== "twitch") return;

    setTwitchParent(window.location.hostname);
  }, [provider]);

  const source = normalizeCreatorEmbedSource({
    provider,
    url: rawUrl,
    twitchParent,
  });

  if (!source.valid) {
    return (
      <div
        className={cn(
          "flex min-h-40 items-center justify-center bg-muted/25 px-5 py-8 text-center text-sm text-muted-foreground",
          className,
        )}
        style={style}
      >
        {source.message}
      </div>
    );
  }

  if (provider === "twitch" && !source.src) {
    return (
      <div
        className={cn(
          "flex min-h-40 items-center justify-center bg-muted/25 px-5 py-8 text-center text-sm text-muted-foreground",
          className,
        )}
        style={style}
      >
        Loading Twitch player…
      </div>
    );
  }

  if (!source.src) return null;

  const isCustom = provider === "custom";

  return (
    <iframe
      src={source.src}
      title={title || "Embedded content"}
      className={cn("block h-full w-full bg-black/5", className)}
      style={{
        border: 0,
        height: iframeHeight ? `${iframeHeight}px` : undefined,
        ...style,
      }}
      allow={
        isCustom
          ? "fullscreen"
          : "accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
      }
      allowFullScreen
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox={
        isCustom
          ? "allow-forms allow-popups allow-presentation allow-scripts"
          : undefined
      }
    />
  );
}

export function SectionRenderer({
  section,
  bots,
  worlds,
  lorebooks = [],
  themeColor,
  onBotClick,
  isBuilderPreview = false,
  formState,
}: SectionRendererProps) {
  const cfg = section.config || {};

  switch (section.kind) {
    // ================================ HERO ==================================
    case "hero": {
      const heroTitle = (cfg.headline as string) || section.title;
      const heroSub = (cfg.subheadline as string) || "";
      const ctaT = (cfg.ctaText as string) || "";
      const ctaL = (cfg.ctaLink as string) || "";

      const secondaryCtaText = (cfg.secondaryCtaText as string) || "";
      const secondaryCtaLink = (cfg.secondaryCtaLink as string) || "";

      const primaryCta = normalizeCreatorPageHref(ctaL);
      const secondaryCta = normalizeCreatorPageHref(secondaryCtaLink);

      const safePrimaryHref =
        primaryCta.valid && primaryCta.href ? primaryCta.href : null;

      const safeSecondaryHref =
        secondaryCta.valid && secondaryCta.href ? secondaryCta.href : null;

      const rawHeroImage = (cfg.heroImage as string) || "";
      const heroImageResult = normalizeCreatorPageHttpUrl(rawHeroImage, {
        label: "hero image",
      });
      const heroImage =
        heroImageResult.valid && heroImageResult.href
          ? heroImageResult.href
          : "";

      const backgroundType =
        (cfg.backgroundType as string) || (heroImage ? "image" : "gradient");
      const backgroundColor = (cfg.backgroundColor as string) || themeColor;
      const backgroundColor2 = (cfg.backgroundColor2 as string) || "#111827";

      const overlayColor = (cfg.overlayColor as string) || "#000000";
      const overlayOpacity = Math.max(
        0,
        Math.min(100, Number(cfg.overlayOpacity ?? 45)),
      );

      const alignment = (cfg.alignment as string) || "center";
      const verticalAlignment = (cfg.verticalAlignment as string) || "center";
      const contentWidth = (cfg.contentWidth as string) || "medium";
      const height = (cfg.height as string) || "tall";
      const borderRadius = (cfg.borderRadius as string) || "large";

      const textColor = (cfg.textColor as string) || "";
      const subtextColor = (cfg.subtextColor as string) || "";

      const showSparkles =
        cfg.showSparkles !== false && cfg.showSparkles !== "false";

      const entranceAnimation = (cfg.entranceAnimation as string) || "none";
      const motionDuration = Math.max(
        150,
        Math.min(3000, Number(cfg.motionDuration ?? 600)),
      );
      const motionDelay = Math.max(
        0,
        Math.min(3000, Number(cfg.motionDelay ?? 0)),
      );
      const hoverMotion = (cfg.hoverMotion as string) || "none";

      const heightClass =
        height === "short"
          ? "min-h-[18rem] sm:min-h-[22rem]"
          : height === "medium"
            ? "min-h-[26rem] sm:min-h-[32rem]"
            : height === "fullscreen"
              ? "min-h-[75vh]"
              : "min-h-[34rem] sm:min-h-[42rem]";

      const alignmentClass =
        alignment === "left"
          ? "items-start text-left"
          : alignment === "right"
            ? "items-end text-right"
            : "items-center text-center";

      const justifyClass =
        verticalAlignment === "top"
          ? "justify-start"
          : verticalAlignment === "bottom"
            ? "justify-end"
            : "justify-center";

      const contentWidthClass =
        contentWidth === "narrow"
          ? "max-w-xl"
          : contentWidth === "wide"
            ? "max-w-5xl"
            : "max-w-3xl";

      const radiusClass =
        borderRadius === "none"
          ? "rounded-none"
          : borderRadius === "small"
            ? "rounded-lg"
            : borderRadius === "medium"
              ? "rounded-2xl"
              : borderRadius === "pill"
                ? "rounded-[3rem]"
                : "rounded-[2rem]";

      const entranceClass = "";

      const hoverClass = creatorHoverClass(hoverMotion, isBuilderPreview);

      const heroBackground =
        backgroundType === "image" && heroImage
          ? `url(${heroImage}) center / cover no-repeat`
          : backgroundType === "solid"
            ? backgroundColor
            : `linear-gradient(135deg, ${backgroundColor}, ${backgroundColor2})`;

      return (
        <section
          className={`creator-hero-v3 relative flex overflow-hidden border ${heightClass} ${radiusClass} ${entranceClass} ${hoverClass}`}
          style={{
            borderColor: `${themeColor}33`,
            background: heroBackground,
            animationDuration: `${motionDuration}ms`,
            animationDelay: `${motionDelay}ms`,
          }}
        >
          {backgroundType === "image" && heroImage && (
            <div
              className="absolute inset-0"
              style={{
                background: overlayColor,
                opacity: overlayOpacity / 100,
              }}
            />
          )}

          <div
            className={`relative z-10 flex w-full flex-col px-6 py-12 sm:px-10 sm:py-16 lg:px-14 ${alignmentClass} ${justifyClass}`}
          >
            <div
              className={`flex w-full flex-col ${alignmentClass} ${contentWidthClass}`}
            >
              {showSparkles && (
                <Sparkles
                  className="mb-4 h-8 w-8 shrink-0 sm:h-10 sm:w-10"
                  style={{ color: themeColor }}
                />
              )}

              <h1
                className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
                style={textColor ? { color: textColor } : undefined}
              >
                {heroTitle}
              </h1>

              {heroSub && (
                <p
                  className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
                  style={subtextColor ? { color: subtextColor } : undefined}
                >
                  {heroSub}
                </p>
              )}

              {(ctaT || secondaryCtaText) && (
                <div
                  className={`mt-7 flex flex-wrap gap-3 ${
                    alignment === "center"
                      ? "justify-center"
                      : alignment === "right"
                        ? "justify-end"
                        : "justify-start"
                  }`}
                >
                  {ctaT && safePrimaryHref && (
                    <Link href={safePrimaryHref} className="cursor-pointer">
                      <Button
                        className="cursor-pointer"
                        style={{ background: themeColor }}
                      >
                        {ctaT}
                      </Button>
                    </Link>
                  )}

                  {secondaryCtaText && safeSecondaryHref && (
                    <Link href={safeSecondaryHref}>
                      <Button
                        variant="outline"
                        className={motionStyles.clickable}
                      >
                        {secondaryCtaText}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }

    // ====================== BOT SHOWCASE / BOT GROUP V3 ======================
    case "bot_showcase":
    case "bot_group": {
      const desc = (cfg.description as string) || "";
      const botIds = (cfg.selectedBotIds as string[]) || [];

      const displayBots =
        botIds.length > 0
          ? bots.filter((bot) => botIds.includes(bot.id))
          : bots;

      const presentation = String(cfg.botLayout || "grid");
      const columns = Math.max(2, Math.min(4, Number(cfg.columns) || 3));
      const gap = String(cfg.botGap || "normal");

      const gapClass =
        gap === "tight" ? "gap-3" : gap === "relaxed" ? "gap-7" : "gap-5";

      const gridColumnsClass =
        columns === 2
          ? "sm:grid-cols-2"
          : columns === 4
            ? "sm:grid-cols-2 xl:grid-cols-4"
            : "sm:grid-cols-2 lg:grid-cols-3";

      const card = (bot: BotPreview) => (
        <CreatorBotCardV3
          key={bot.id}
          bot={bot}
          themeColor={themeColor}
          config={cfg}
          onClick={() => onBotClick?.(bot)}
          isBuilderPreview={isBuilderPreview}
        />
      );

      return (
        <div className="space-y-5">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Bot className="h-5 w-5 shrink-0" style={{ color: themeColor }} />
              {section.title}
            </h2>

            {desc && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {desc}
              </p>
            )}
          </div>

          {displayBots.length > 0 ? (
            presentation === "carousel" ? (
              <div
                className={`flex snap-x snap-mandatory overflow-x-auto pb-3 ${gapClass}`}
              >
                {displayBots.map((bot) => (
                  <div
                    key={bot.id}
                    className="w-[78vw] max-w-[20rem] shrink-0 snap-start sm:w-[18rem]"
                  >
                    {card(bot)}
                  </div>
                ))}
              </div>
            ) : presentation === "compact" ? (
              <div className={`grid ${gapClass}`}>
                {displayBots.map((bot) => (
                  <div
                    key={bot.id}
                    className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-border/60 bg-card/60 p-3 transition-[border-color,background-color] duration-200 hover:border-[color:var(--creator-page-accent)]/35"
                    onClick={() => onBotClick?.(bot)}
                  >
                    <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                      {bot.image_url ? (
                        <img
                          src={bot.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Bot className="h-5 w-5 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold">{bot.name}</p>
                      {bot.short_description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {bot.short_description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : presentation === "editorial" ? (
              <div className={`grid ${gapClass}`}>
                {displayBots.map((bot, index) => (
                  <div
                    key={bot.id}
                    className="grid min-w-0 overflow-hidden rounded-3xl border border-border/60 bg-card/60 md:grid-cols-2"
                    onClick={() => onBotClick?.(bot)}
                  >
                    <div
                      className={cn(
                        "min-h-[16rem] bg-muted",
                        index % 2 === 1 && "md:order-2",
                      )}
                    >
                      {bot.image_url ? (
                        <img
                          src={bot.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Bot className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-col justify-center p-6 sm:p-8">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                        {bot.name}
                      </h3>
                      {bot.short_description && (
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {bot.short_description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 ${gridColumnsClass} ${gapClass}`}
              >
                {displayBots.map(card)}
              </div>
            )
          ) : (
            <p className="rounded-2xl border border-dashed border-border/50 py-8 text-center text-sm text-muted-foreground">
              No bots to display.
            </p>
          )}
        </div>
      );
    }

    // ========================== WORLD SHOWCASE V3 ============================
    case "world_showcase": {
      const description = (cfg.description as string) || "";
      const layout = String(cfg.worldLayout || "grid");
      const columns = Math.max(2, Math.min(4, Number(cfg.worldColumns) || 3));
      const gap = String(cfg.worldGap || "normal");

      const cardStyle = String(cfg.worldCardStyle || "card");
      const radius = String(cfg.worldCardRadius || "large");
      const textAlign = String(cfg.worldTextAlign || "left");

      const showDescription =
        cfg.showWorldDescription !== false &&
        cfg.showWorldDescription !== "false";
      const showType =
        cfg.showWorldType !== false && cfg.showWorldType !== "false";
      const showBotCount =
        cfg.showWorldBotCount !== false && cfg.showWorldBotCount !== "false";

      const hoverMotion = String(cfg.worldHoverMotion || "lift");

      const entrance = String(cfg.worldEntranceAnimation || "none");
      const duration = Math.max(
        150,
        Math.min(2500, Number(cfg.worldMotionDuration ?? 500)),
      );
      const delay = Math.max(
        0,
        Math.min(2500, Number(cfg.worldMotionDelay ?? 0)),
      );

      const gapClass =
        gap === "tight" ? "gap-3" : gap === "relaxed" ? "gap-7" : "gap-5";

      const gridColumnsClass =
        columns === 2
          ? "sm:grid-cols-2"
          : columns === 4
            ? "sm:grid-cols-2 xl:grid-cols-4"
            : "sm:grid-cols-2 lg:grid-cols-3";

      const radiusClass =
        radius === "none"
          ? "rounded-none"
          : radius === "small"
            ? "rounded-lg"
            : radius === "medium"
              ? "rounded-2xl"
              : "rounded-3xl";

      const surfaceClass =
        cardStyle === "soft"
          ? "border border-border/45 bg-muted/25"
          : cardStyle === "outline"
            ? "border border-border/75 bg-transparent"
            : cardStyle === "minimal"
              ? "border border-transparent bg-transparent"
              : "border border-border/60 bg-card/70 shadow-md shadow-black/[0.04]";

      const alignClass =
        textAlign === "center"
          ? "items-center text-center"
          : textAlign === "right"
            ? "items-end text-right"
            : "items-start text-left";

      const hoverClass = creatorHoverClass(hoverMotion, isBuilderPreview);

      const entranceClass = "";

      const renderWorldCard = (world: WorldPreview) => (
        <div
          key={world.id}
          className={`flex min-w-0 flex-col p-5 transition-all duration-300 ${radiusClass} ${surfaceClass} ${alignClass} ${hoverClass}`}
        >
          <div
            className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${themeColor}18` }}
          >
            <Globe className="h-5 w-5" style={{ color: themeColor }} />
          </div>

          {(showType || showBotCount) && (
            <div
              className={`mb-2 flex flex-wrap gap-1.5 ${
                textAlign === "center"
                  ? "justify-center"
                  : textAlign === "right"
                    ? "justify-end"
                    : "justify-start"
              }`}
            >
              {showType && (
                <Badge variant="secondary" className="text-[10px] capitalize">
                  World
                </Badge>
              )}

              {showBotCount && (
                <Badge variant="outline" className="text-[10px]">
                  {world.bot_ids.length} bots
                </Badge>
              )}
            </div>
          )}

          <h3 className="w-full font-semibold tracking-tight">{world.title}</h3>

          {showDescription && world.description && (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {world.description}
            </p>
          )}
        </div>
      );

      return (
        <section
          className={`space-y-5 ${entranceClass}`}
          style={{
            animationDuration: `${duration}ms`,
            animationDelay: `${delay}ms`,
          }}
        >
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Globe
                className="h-5 w-5 shrink-0"
                style={{ color: themeColor }}
              />
              {section.title}
            </h2>

            {description && (
              <div className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                <MarkdownRenderer
                  content={description}
                  className="[&>*:last-child]:mb-0"
                />
              </div>
            )}
          </div>

          {worlds.length > 0 ? (
            layout === "carousel" ? (
              <div
                className={`flex snap-x snap-mandatory overflow-x-auto pb-3 ${gapClass}`}
              >
                {worlds.map((world) => (
                  <div
                    key={world.id}
                    className="w-[78vw] max-w-[22rem] shrink-0 snap-start sm:w-[20rem]"
                  >
                    {renderWorldCard(world)}
                  </div>
                ))}
              </div>
            ) : layout === "compact" ? (
              <div className={`grid ${gapClass}`}>
                {worlds.map((world) => (
                  <div
                    key={world.id}
                    className="flex min-w-0 items-center gap-4 rounded-2xl border border-border/60 bg-card/60 p-4"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${themeColor}18` }}
                    >
                      <Globe
                        className="h-5 w-5"
                        style={{ color: themeColor }}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{world.title}</p>

                      {showDescription && world.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {world.description}
                        </p>
                      )}
                    </div>

                    <Badge
                      variant="outline"
                      className="hidden shrink-0 text-[10px] sm:inline-flex"
                    >
                      {world.bot_ids.length} bots
                    </Badge>
                  </div>
                ))}
              </div>
            ) : layout === "editorial" ? (
              <div className={`grid ${gapClass}`}>
                {worlds.map((world, index) => (
                  <div
                    key={world.id}
                    className="grid min-w-0 overflow-hidden rounded-3xl border border-border/60 bg-card/60 md:grid-cols-[9rem_minmax(0,1fr)]"
                  >
                    <div
                      className="flex min-h-[9rem] items-center justify-center"
                      style={{ backgroundColor: `${themeColor}12` }}
                    >
                      <Globe
                        className="h-9 w-9"
                        style={{ color: themeColor }}
                      />
                    </div>

                    <div className="flex min-w-0 flex-col justify-center p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          World {String(index + 1).padStart(2, "0")}
                        </p>

                        <Badge
                          variant="secondary"
                          className="text-[10px] capitalize"
                        >
                          World
                        </Badge>
                      </div>

                      <h3 className="mt-2 text-xl font-semibold tracking-tight">
                        {world.title}
                      </h3>

                      {showDescription && world.description && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                          {world.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 ${gridColumnsClass} ${gapClass}`}
              >
                {worlds.map(renderWorldCard)}
              </div>
            )
          ) : (
            <p className="rounded-2xl border border-dashed border-border/50 py-8 text-center text-sm text-muted-foreground">
              No worlds to display.
            </p>
          )}
        </section>
      );
    }

    // ============================ TEXT BLOCK V3 ===============================
    case "text_block": {
      const body = (cfg.body as string) || "";
      if (!body) return null;

      const bgColor = (cfg.backgroundColor as string) || "";
      const textColor = (cfg.textColor as string) || "";
      const alignment = (cfg.textAlignment as string) || "left";
      const padding = (cfg.padding as string) || "normal";
      const fontSize = (cfg.fontSize as string) || "normal";
      const maxWidth = (cfg.maxWidth as string) || "wide";
      const surface = (cfg.textSurface as string) || "card";
      const radius = (cfg.textRadius as string) || "large";
      const shadow = (cfg.textShadow as string) || "none";
      const entrance = (cfg.textEntranceAnimation as string) || "none";
      const duration = Math.max(
        150,
        Math.min(2500, Number(cfg.textMotionDuration ?? 500)),
      );
      const delay = Math.max(
        0,
        Math.min(2500, Number(cfg.textMotionDelay ?? 0)),
      );

      const alignClass =
        alignment === "center"
          ? "text-center"
          : alignment === "right"
            ? "text-right"
            : "text-left";
      const paddingClass =
        padding === "none"
          ? ""
          : padding === "compact"
            ? "p-3 sm:p-4"
            : padding === "spacious"
              ? "p-6 sm:p-8"
              : "p-4 sm:p-6";
      const sizeClass =
        fontSize === "small"
          ? "text-sm"
          : fontSize === "large"
            ? "text-lg"
            : fontSize === "xl"
              ? "text-xl"
              : "text-base";
      const maxWidthClass =
        maxWidth === "narrow"
          ? "max-w-2xl"
          : maxWidth === "medium"
            ? "max-w-3xl"
            : maxWidth === "full"
              ? "max-w-none"
              : "max-w-5xl";
      const radiusClass =
        radius === "none"
          ? "rounded-none"
          : radius === "small"
            ? "rounded-lg"
            : radius === "medium"
              ? "rounded-2xl"
              : "rounded-3xl";
      const surfaceClass =
        surface === "transparent"
          ? "border-transparent bg-transparent"
          : surface === "soft"
            ? "border border-border/40 bg-muted/25"
            : surface === "outline"
              ? "border border-border/75 bg-transparent"
              : "border border-border/60 bg-card/70";
      const shadowClass =
        surface === "transparent" || shadow === "none"
          ? ""
          : shadow === "strong"
            ? "shadow-xl shadow-black/[0.10]"
            : "shadow-md shadow-black/[0.06]";
      const entranceClass = "";

      return (
        <div className={`w-full ${maxWidthClass}`}>
          <div
            className={`${alignClass} ${paddingClass} ${sizeClass} ${radiusClass} ${surfaceClass} ${shadowClass} ${entranceClass}`}
            style={{
              backgroundColor:
                surface !== "transparent" && bgColor ? bgColor : undefined,
              color: textColor || undefined,
              animationDuration: `${duration}ms`,
              animationDelay: `${delay}ms`,
            }}
          >
            <MarkdownRenderer
              content={body}
              className="[&>*:last-child]:mb-0"
            />
          </div>
        </div>
      );
    }

    // ============================== BANNER V3 ================================
    case "banner": {
      const bannerTitle = (cfg.bannerTitle as string) || section.title;

      const subtitle = (cfg.subtitle as string) || "";
      const bg1 = (cfg.background as string) || themeColor;
      const bg2 = (cfg.background2 as string) || "#4c1d95";
      const bgType = (cfg.backgroundType as string) || "gradient";

      const rawBgImage = (cfg.backgroundImage as string) || "";
      const bgImageResult = normalizeCreatorPageHttpUrl(rawBgImage, {
        label: "background image",
      });
      const bgImage =
        bgImageResult.valid && bgImageResult.href ? bgImageResult.href : "";

      const overlayColor = (cfg.overlayColor as string) || "#000000";
      const overlayOpacity = Math.max(
        0,
        Math.min(100, Number(cfg.overlayOpacity ?? 50)),
      );
      const alignment = (cfg.alignment as string) || "center";
      const verticalAlignment = (cfg.verticalAlignment as string) || "center";
      const height = (cfg.bannerHeight as string) || "medium";
      const contentWidth = (cfg.bannerContentWidth as string) || "wide";
      const radius = (cfg.bannerRadius as string) || "large";
      const textColor = (cfg.bannerTextColor as string) || "";
      const subtextColor = (cfg.bannerSubtextColor as string) || "";

      const ctaText = (cfg.ctaText as string) || "";
      const ctaLink = normalizeCreatorPageHref(cfg.ctaLink);
      const cta2Text = (cfg.secondaryCtaText as string) || "";
      const cta2Link = normalizeCreatorPageHref(cfg.secondaryCtaLink);
      const safeCtaLink = ctaLink.valid && ctaLink.href ? ctaLink.href : null;
      const safeCta2Link =
        cta2Link.valid && cta2Link.href ? cta2Link.href : null;

      const entrance = (cfg.bannerEntranceAnimation as string) || "none";
      const duration = Math.max(
        150,
        Math.min(2500, Number(cfg.bannerMotionDuration ?? 500)),
      );
      const delay = Math.max(
        0,
        Math.min(2500, Number(cfg.bannerMotionDelay ?? 0)),
      );

      const heightClass =
        height === "compact"
          ? "min-h-[14rem]"
          : height === "tall"
            ? "min-h-[28rem] sm:min-h-[34rem]"
            : "min-h-[20rem] sm:min-h-[24rem]";
      const horizontalClass =
        alignment === "left"
          ? "items-start text-left"
          : alignment === "right"
            ? "items-end text-right"
            : "items-center text-center";
      const verticalClass =
        verticalAlignment === "top"
          ? "justify-start"
          : verticalAlignment === "bottom"
            ? "justify-end"
            : "justify-center";
      const contentWidthClass =
        contentWidth === "narrow"
          ? "max-w-xl"
          : contentWidth === "medium"
            ? "max-w-2xl"
            : "max-w-4xl";
      const radiusClass =
        radius === "none"
          ? "rounded-none"
          : radius === "small"
            ? "rounded-lg"
            : radius === "medium"
              ? "rounded-2xl"
              : "rounded-[2rem]";
      const entranceClass = "";
      const background =
        bgType === "image" && bgImage
          ? `url(${bgImage}) center / cover no-repeat`
          : bgType === "solid"
            ? bg1
            : `linear-gradient(135deg, ${bg1}, ${bg2})`;

      return (
        <section
          className={`relative flex overflow-hidden border border-border/40 ${heightClass} ${radiusClass} ${entranceClass}`}
          style={{
            background,
            animationDuration: `${duration}ms`,
            animationDelay: `${delay}ms`,
          }}
        >
          {bgType === "image" && bgImage && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: overlayColor,
                opacity: overlayOpacity / 100,
              }}
            />
          )}

          <div
            className={`relative z-10 flex w-full flex-col px-6 py-8 sm:px-8 sm:py-10 ${horizontalClass} ${verticalClass}`}
          >
            <div className={`w-full ${contentWidthClass}`}>
              <h2
                className="text-2xl font-bold tracking-tight sm:text-3xl"
                style={textColor ? { color: textColor } : undefined}
              >
                {bannerTitle}
              </h2>

              {subtitle && (
                <div
                  className="mt-3 text-sm leading-6 text-white/80 sm:text-base"
                  style={subtextColor ? { color: subtextColor } : undefined}
                >
                  <MarkdownRenderer
                    content={subtitle}
                    className="[&>*:last-child]:mb-0"
                  />
                </div>
              )}

              {(ctaText || cta2Text) && (
                <div
                  className={`mt-6 flex flex-wrap gap-3 ${alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : "justify-start"}`}
                >
                  {ctaText && safeCtaLink && (
                    <Link href={safeCtaLink}>
                      <Button
                        className={motionStyles.clickable}
                        style={{ backgroundColor: themeColor }}
                      >
                        {ctaText}
                      </Button>
                    </Link>
                  )}
                  {cta2Text && safeCta2Link && (
                    <Link href={safeCta2Link}>
                      <Button
                        variant="outline"
                        className={motionStyles.clickable}
                      >
                        {cta2Text}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }

    // ================================ FORM V3 =================================
    case "form": {
      const formId = (cfg.formId as string) || "";
      const shareableLink = (cfg.shareableLink as string) || "";

      const heading =
        (cfg.formHeading as string) || section.title || "Open for submissions";
      const description = (cfg.description as string) || "";
      const ctaText = (cfg.ctaText as string) || "Open form";

      const formLayout = String(cfg.formLayout || "card");
      const savedAlignment = String(cfg.formAlignment || "left");
      const alignment =
        formLayout === "banner" || formLayout === "compact"
          ? "left"
          : savedAlignment;
      const contentWidth = String(cfg.formContentWidth || "wide");

      const surface = String(cfg.formSurface || "card");
      const radius = String(cfg.formRadius || "large");
      const accentStyle = String(cfg.formAccentStyle || "icon");

      const showStatus =
        cfg.formShowStatus !== false && cfg.formShowStatus !== "false";

      const hoverMotion = String(cfg.formHoverMotion || "lift");

      const resolvedShareableLink = formState?.shareable_link || shareableLink;

      const formIsActive =
        formState?.is_active ?? Boolean(formId && resolvedShareableLink);

      const hasPublicForm = Boolean(
        formId && resolvedShareableLink && formIsActive,
      );

      const safeFormHref = hasPublicForm
        ? `/form/${encodeURIComponent(resolvedShareableLink)}`
        : null;

      const deactivatedMessage =
        !formIsActive && formState?.deactivated_message
          ? String(formState.deactivated_message)
          : "";

      const redirectCheck =
        !formIsActive && formState?.deactivated_redirect_url
          ? normalizeCreatorPageHttpUrl(formState.deactivated_redirect_url, {
              label: "deactivation redirect",
            })
          : null;

      const safeRedirectHref =
        redirectCheck?.valid && redirectCheck.href ? redirectCheck.href : null;

      const redirectLabel =
        String(formState?.deactivated_redirect_label || "Learn more").trim() ||
        "Learn more";

      const inactiveAccentCandidate = String(
        formState?.deactivated_accent_color || "",
      ).trim();

      const inactiveAccent = /^#[0-9a-fA-F]{6}$/.test(inactiveAccentCandidate)
        ? inactiveAccentCandidate
        : themeColor;

      const alignClass =
        alignment === "center"
          ? "items-center text-center"
          : alignment === "right"
            ? "items-end text-right"
            : "items-start text-left";

      const buttonJustifyClass =
        alignment === "center"
          ? "justify-center"
          : alignment === "right"
            ? "justify-end"
            : "justify-start";

      const maxWidthClass =
        formLayout === "banner"
          ? "max-w-none"
          : contentWidth === "narrow"
            ? "max-w-xl"
            : contentWidth === "medium"
              ? "max-w-2xl"
              : contentWidth === "full"
                ? "max-w-none"
                : "max-w-4xl";

      const radiusClass =
        radius === "none"
          ? "rounded-none"
          : radius === "small"
            ? "rounded-lg"
            : radius === "medium"
              ? "rounded-2xl"
              : "rounded-3xl";

      const surfaceClass =
        formLayout === "minimal"
          ? "border-transparent bg-transparent"
          : surface === "soft"
            ? "border border-border/45 bg-muted/25"
            : surface === "outline"
              ? "border border-border/75 bg-transparent"
              : surface === "accent"
                ? "border border-[color:var(--creator-page-accent)]/25 bg-[color:var(--creator-page-accent)]/[0.07]"
                : "border border-border/60 bg-card/80 shadow-md shadow-black/[0.05]";

      const hoverClass =
        formLayout === "minimal"
          ? ""
          : creatorHoverClass(hoverMotion, isBuilderPreview);

      const cardPaddingClass =
        formLayout === "compact"
          ? "p-4 sm:p-5"
          : formLayout === "banner"
            ? "p-6 sm:p-8 lg:p-10"
            : "p-5 sm:p-7";

      const layoutClass =
        formLayout === "banner"
          ? "sm:flex-row sm:items-center sm:justify-between sm:gap-8"
          : formLayout === "compact"
            ? "sm:flex-row sm:items-center sm:justify-between sm:gap-5"
            : "flex-col";

      const showIcon = formLayout === "compact" || accentStyle === "icon";

      const showBar = formLayout !== "minimal" && accentStyle === "bar";

      const showGlow = formLayout !== "minimal" && accentStyle === "glow";

      return (
        <section className={`w-full ${maxWidthClass}`}>
          <div
            className={`relative overflow-hidden ${radiusClass} ${surfaceClass} ${hoverClass}`}
          >
            {showGlow && (
              <>
                <div
                  className="pointer-events-none absolute inset-0 opacity-90"
                  style={{
                    background: `radial-gradient(circle at 10% 0%, ${themeColor}40 0%, ${themeColor}1f 24%, transparent 52%), radial-gradient(circle at 100% 100%, ${themeColor}2e 0%, transparent 50%)`,
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    boxShadow: `inset 0 0 56px -34px ${themeColor}`,
                    opacity: 0.75,
                  }}
                />
              </>
            )}

            {showBar && (
              <div
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: themeColor }}
              />
            )}

            <div
              className={`relative flex gap-5 ${layoutClass} ${cardPaddingClass}`}
            >
              <div className={`flex min-w-0 flex-1 flex-col ${alignClass}`}>
                <div
                  className={cn(
                    "flex min-w-0 gap-3",
                    alignment === "center"
                      ? "flex-col items-center"
                      : alignment === "right"
                        ? "w-full flex-row-reverse items-start"
                        : "flex-row items-start",
                  )}
                >
                  {showIcon && (
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: `${themeColor}16`,
                        color: themeColor,
                      }}
                    >
                      <SquarePen className="h-5 w-5" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "min-w-0",
                      alignment === "center" && "w-full",
                      alignment === "right" && "w-full",
                    )}
                  >
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                      {heading}
                    </h2>

                    {description && (
                      <div className="mt-2 text-sm leading-6 text-muted-foreground">
                        <MarkdownRenderer
                          content={description}
                          className="[&>*:last-child]:mb-0"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {showStatus && (
                  <div
                    className={cn(
                      "mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground",
                      alignment === "center" && "justify-center",
                      alignment === "right" && "justify-end",
                    )}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: hasPublicForm
                          ? themeColor
                          : formId && !formIsActive
                            ? inactiveAccent
                            : "currentColor",
                        opacity:
                          hasPublicForm || (formId && !formIsActive) ? 1 : 0.4,
                      }}
                    />

                    {hasPublicForm
                      ? "Form available"
                      : formId && !formIsActive
                        ? "Form unavailable"
                        : formId
                          ? "Waiting for a public form link"
                          : "No form selected"}
                  </div>
                )}

                {!formIsActive && formId && deactivatedMessage && (
                  <div
                    className={cn(
                      "mt-4 max-w-2xl rounded-2xl border px-4 py-3 text-sm leading-6",
                      alignment === "center" && "mx-auto",
                      alignment === "right" && "ml-auto",
                    )}
                    style={{
                      borderColor: `${inactiveAccent}38`,
                      backgroundColor: `${inactiveAccent}0f`,
                    }}
                  >
                    <MarkdownRenderer
                      content={deactivatedMessage}
                      className="[&>*:last-child]:mb-0"
                    />
                  </div>
                )}
              </div>

              <div
                className={cn(
                  "flex shrink-0",
                  formLayout === "card" || formLayout === "minimal"
                    ? `mt-5 ${buttonJustifyClass}`
                    : "",
                  formLayout === "banner" || formLayout === "compact"
                    ? "self-stretch sm:self-center"
                    : "",
                )}
              >
                {safeFormHref ? (
                  <Link
                    href={safeFormHref}
                    className="w-full cursor-pointer sm:w-auto"
                  >
                    <Button
                      size={formLayout === "compact" ? "default" : "lg"}
                      className="w-full cursor-pointer sm:w-auto"
                      style={{
                        backgroundColor: themeColor,
                        color: "#ffffff",
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {ctaText}
                    </Button>
                  </Link>
                ) : safeRedirectHref ? (
                  <a
                    href={safeRedirectHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full cursor-pointer sm:w-auto"
                  >
                    <Button
                      size={formLayout === "compact" ? "default" : "lg"}
                      variant="outline"
                      className="w-full cursor-pointer sm:w-auto"
                      style={{
                        borderColor: `${inactiveAccent}66`,
                        color: inactiveAccent,
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {redirectLabel}
                    </Button>
                  </a>
                ) : (
                  <Button
                    size={formLayout === "compact" ? "default" : "lg"}
                    disabled
                    className="w-full sm:w-auto"
                    style={{
                      backgroundColor: themeColor,
                    }}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    {formId && !formIsActive ? "Unavailable" : ctaText}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      );
    }

    // =========================== SOCIAL LINKS V3 =============================
    case "social_links": {
      const rawLinks =
        (cfg.links as Array<{
          platform: string;
          url: string;
          label?: string;
        }>) || [];

      const links = rawLinks
        .map((link) => {
          const safe = normalizeCreatorPageHttpUrl(link.url, {
            label: "social link",
          });

          return {
            ...link,
            platform: String(link.platform || "website").toLowerCase(),
            safeUrl: safe.valid && safe.href ? safe.href : null,
          };
        })
        .filter((link) => Boolean(link.safeUrl));

      const socialLayout = String(cfg.socialLayout || "pills");
      const alignment = String(cfg.socialAlignment || "left");
      const size = String(cfg.socialSize || "medium");
      const style = String(cfg.socialStyle || "outline");
      const radius = String(cfg.socialRadius || "pill");
      const hoverMotion = String(cfg.socialHoverMotion || "lift");

      const showLabels =
        socialLayout !== "icons" &&
        cfg.socialShowLabels !== false &&
        cfg.socialShowLabels !== "false";

      const entrance = String(cfg.socialEntranceAnimation || "none");
      const duration = Math.max(
        150,
        Math.min(2500, Number(cfg.socialMotionDuration ?? 450)),
      );
      const delay = Math.max(
        0,
        Math.min(2500, Number(cfg.socialMotionDelay ?? 0)),
      );

      const justifyClass =
        alignment === "center"
          ? "justify-center"
          : alignment === "right"
            ? "justify-end"
            : "justify-start";

      const sizeClass =
        size === "small"
          ? socialLayout === "icons"
            ? "h-9 w-9"
            : "min-h-9 px-3 py-1.5 text-xs"
          : size === "large"
            ? socialLayout === "icons"
              ? "h-12 w-12"
              : "min-h-12 px-5 py-3 text-base"
            : socialLayout === "icons"
              ? "h-10 w-10"
              : "min-h-10 px-4 py-2 text-sm";

      const radiusClass =
        socialLayout === "icons" || radius === "pill"
          ? "rounded-full"
          : radius === "small"
            ? "rounded-lg"
            : radius === "medium"
              ? "rounded-xl"
              : "rounded-2xl";

      const styleClass =
        style === "solid"
          ? "border-transparent text-white"
          : style === "soft"
            ? "border-transparent bg-primary/10"
            : style === "minimal"
              ? "border-transparent bg-transparent"
              : "border border-current bg-transparent";

      const hoverClass = creatorHoverClass(hoverMotion, isBuilderPreview);

      const entranceClass = "";

      const renderLink = (
        link: (typeof links)[number],
        index: number,
        fullWidth = false,
      ) => {
        const Icon = socialIconMap[link.platform] || WebsiteIcon;
        const label =
          link.label ||
          link.platform.charAt(0).toUpperCase() + link.platform.slice(1);

        return (
          <a
            key={`${link.safeUrl}-${index}`}
            href={link.safeUrl!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={cn(
              "group/social-link inline-flex min-w-0 cursor-pointer items-center gap-2 transition-[transform,box-shadow,border-color,background-color] duration-200",
              sizeClass,
              radiusClass,
              styleClass,
              hoverClass,
              fullWidth && "w-full",
              socialLayout === "icons" && "justify-center p-0",
            )}
            style={{
              color: style === "solid" ? "#ffffff" : themeColor,
              backgroundColor:
                style === "solid"
                  ? themeColor
                  : style === "soft"
                    ? `${themeColor}16`
                    : undefined,
              borderColor: style === "outline" ? `${themeColor}55` : undefined,
            }}
          >
            <Icon
              className={cn(
                "shrink-0",
                size === "large" ? "h-5 w-5" : "h-4 w-4",
                !isBuilderPreview &&
                  "transition-transform group-hover/social-link:scale-110",
              )}
            />

            {showLabels && <span className="min-w-0 truncate">{label}</span>}
          </a>
        );
      };

      return (
        <section
          className={`space-y-4 ${entranceClass}`}
          style={{
            animationDuration: `${duration}ms`,
            animationDelay: `${delay}ms`,
          }}
        >
          {section.title && (
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Share2
                className="h-5 w-5 shrink-0"
                style={{ color: themeColor }}
              />
              {section.title}
            </h2>
          )}

          {links.length > 0 ? (
            socialLayout === "list" ? (
              <div className="grid gap-2">
                {links.map((link, index) => renderLink(link, index, true))}
              </div>
            ) : socialLayout === "grid" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {links.map((link, index) => renderLink(link, index, true))}
              </div>
            ) : (
              <div className={`flex flex-wrap gap-3 ${justifyClass}`}>
                {links.map((link, index) => renderLink(link, index))}
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              No valid social links set.
            </p>
          )}
        </section>
      );
    }

    // ============================== GALLERY V4 ===============================
    case "gallery": {
      const rawImages =
        (cfg.images as Array<{
          url: string;
          alt?: string;
          caption?: string;
        }>) || [];

      const images = rawImages
        .map((image) => {
          const safe = normalizeCreatorPageHttpUrl(image.url, {
            label: "image URL",
          });

          return {
            ...image,
            safeUrl: safe.valid && safe.href ? safe.href : null,
          };
        })
        .filter((image) => Boolean(image.safeUrl));

      const galleryLayout = String(cfg.galleryLayout || "grid");
      const cols = Math.max(2, Math.min(4, Number(cfg.columns) || 3));
      const ratio = String(cfg.galleryRatio || "square");
      const fit = String(cfg.galleryFit || "cover");
      const position = String(cfg.galleryPosition || "center");
      const gap = String(cfg.gap || "normal");

      const imageRadius = String(cfg.galleryImageRadius || cfg.rounded || "md");
      const frameRadius = String(cfg.galleryFrameRadius || "lg");

      const cardStyle = String(cfg.galleryCardStyle || "clean");
      const imageBorder = String(cfg.galleryImageBorder || "none");
      const captionStyle = String(cfg.galleryCaptionStyle || "below");
      const captionAlign = String(cfg.galleryCaptionAlign || "left");
      const hoverMotion = String(cfg.galleryHoverMotion || "scale");
      const clickBehavior = String(cfg.galleryClickBehavior || "none");
      const sectionSurface = String(cfg.gallerySectionSurface || "transparent");
      const sectionPadding = String(cfg.gallerySectionPadding || "normal");

      const showCaptions =
        cfg.showGalleryCaptions === true || cfg.showGalleryCaptions === "true";

      const gridColumnsClass =
        cols === 2
          ? "sm:grid-cols-2"
          : cols === 4
            ? "sm:grid-cols-2 xl:grid-cols-4"
            : "sm:grid-cols-2 lg:grid-cols-3";

      const masonryColumnsClass =
        cols === 2
          ? "sm:columns-2"
          : cols === 4
            ? "sm:columns-2 xl:columns-4"
            : "sm:columns-2 lg:columns-3";

      const gapClass =
        gap === "compact" ? "gap-2" : gap === "spacious" ? "gap-6" : "gap-4";

      const masonryGapClass =
        gap === "compact" ? "gap-2" : gap === "spacious" ? "gap-6" : "gap-4";

      const masonryItemGapClass =
        gap === "compact" ? "mb-2" : gap === "spacious" ? "mb-6" : "mb-4";

      const ratioClass =
        ratio === "portrait"
          ? "aspect-[3/4]"
          : ratio === "landscape"
            ? "aspect-[16/10]"
            : ratio === "wide"
              ? "aspect-video"
              : "aspect-square";

      const radiusClass = (value: string) =>
        value === "none"
          ? "rounded-none"
          : value === "sm"
            ? "rounded-lg"
            : value === "lg"
              ? "rounded-3xl"
              : value === "full"
                ? "rounded-[2.5rem]"
                : "rounded-2xl";

      const imageRadiusClass = radiusClass(imageRadius);
      const frameRadiusClass = radiusClass(frameRadius);

      const frameClass =
        cardStyle === "card"
          ? "border border-border/60 bg-card/80 p-2 shadow-sm"
          : cardStyle === "outline"
            ? "border border-border/75 bg-transparent p-1.5"
            : "border border-transparent";

      const imageBorderClass =
        imageBorder === "accent"
          ? "ring-1 ring-[color:var(--creator-page-accent)]/35"
          : imageBorder === "subtle"
            ? "ring-1 ring-border/70"
            : "";

      const hoverClass = creatorHoverClass(hoverMotion, isBuilderPreview);

      const objectPositionClass =
        position === "top"
          ? "object-top"
          : position === "bottom"
            ? "object-bottom"
            : position === "left"
              ? "object-left"
              : position === "right"
                ? "object-right"
                : "object-center";

      const imageClass =
        fit === "contain"
          ? "object-contain object-center bg-muted"
          : `object-cover ${objectPositionClass}`;

      const masonryImageClass = "h-auto w-full object-contain object-center";

      const captionAlignClass =
        captionAlign === "center"
          ? "text-center"
          : captionAlign === "right"
            ? "text-right"
            : "text-left";

      const sectionSurfaceClass =
        sectionSurface === "card"
          ? "border border-border/60 bg-card/70 shadow-lg shadow-black/[0.04]"
          : sectionSurface === "soft"
            ? "border border-border/40 bg-muted/25"
            : "";

      const sectionPaddingClass =
        sectionPadding === "none"
          ? ""
          : sectionPadding === "compact"
            ? "p-3 sm:p-4"
            : sectionPadding === "spacious"
              ? "p-6 sm:p-8"
              : "p-4 sm:p-6";

      const renderImage = (
        image: (typeof images)[number],
        index: number,
        options: {
          masonry?: boolean;
          featured?: boolean;
        } = {},
      ) => {
        const visibleCaption = image.caption || image.alt || "";

        const imageFrame = (
          <div
            className={`group/gallery-image relative overflow-hidden transition-all duration-300 ${imageRadiusClass} ${imageBorderClass} ${hoverClass} ${
              options.masonry ? "" : ratioClass
            }`}
          >
            <img
              src={image.safeUrl!}
              alt={image.alt || ""}
              loading="lazy"
              decoding="async"
              className={`${isBuilderPreview ? "" : "transition-transform duration-500 group-hover/gallery-image:scale-[1.02]"} ${
                options.masonry
                  ? masonryImageClass
                  : `h-full w-full ${imageClass}`
              }`}
            />

            {showCaptions && captionStyle === "overlay" && visibleCaption && (
              <div
                className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 pb-3 pt-12 text-sm text-white ${captionAlignClass}`}
              >
                {visibleCaption}
              </div>
            )}
          </div>
        );

        const interactiveImage =
          clickBehavior === "open" ? (
            <a
              href={image.safeUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="block cursor-zoom-in"
            >
              {imageFrame}
            </a>
          ) : (
            imageFrame
          );

        const cardContents = (
          <>
            {interactiveImage}

            {showCaptions && captionStyle === "below" && visibleCaption && (
              <figcaption
                className={`mt-2 px-1 text-xs leading-5 text-muted-foreground ${captionAlignClass}`}
              >
                {visibleCaption}
              </figcaption>
            )}
          </>
        );

        return (
          <figure
            key={`${image.safeUrl}-${index}`}
            className={`${options.masonry ? `${masonryItemGapClass} break-inside-avoid` : ""} min-w-0 ${
              options.featured ? "sm:col-span-2 sm:row-span-2" : ""
            }`}
          >
            {cardStyle === "clean" ? (
              cardContents
            ) : (
              <div className={`${frameClass} ${frameRadiusClass}`}>
                {cardContents}
              </div>
            )}
          </figure>
        );
      };

      return (
        <div
          className={`space-y-5 ${sectionSurfaceClass} ${sectionPaddingClass} ${
            sectionSurface === "transparent" ? "" : "rounded-[2rem]"
          }`}
        >
          {section.title && (
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <ImageIcon
                className="h-5 w-5 shrink-0"
                style={{ color: themeColor }}
              />
              {section.title}
            </h2>
          )}

          {images.length > 0 ? (
            galleryLayout === "carousel" ? (
              <div
                className={`flex snap-x snap-mandatory overflow-x-auto pb-3 ${gapClass}`}
              >
                {images.map((image, index) => (
                  <div
                    key={`${image.safeUrl}-${index}`}
                    className="w-[78vw] max-w-[25rem] shrink-0 snap-start sm:w-[22rem]"
                  >
                    {renderImage(image, index)}
                  </div>
                ))}
              </div>
            ) : galleryLayout === "masonry" ? (
              <div
                className={`columns-1 ${masonryColumnsClass} ${masonryGapClass}`}
              >
                {images.map((image, index) =>
                  renderImage(image, index, { masonry: true }),
                )}
              </div>
            ) : galleryLayout === "featured" ? (
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${gapClass}`}
              >
                {images.map((image, index) =>
                  renderImage(image, index, {
                    featured: index === 0,
                  }),
                )}
              </div>
            ) : galleryLayout === "strip" ? (
              <div className={`flex overflow-x-auto pb-3 ${gapClass}`}>
                {images.map((image, index) => (
                  <div
                    key={`${image.safeUrl}-${index}`}
                    className="w-40 shrink-0 sm:w-52"
                  >
                    {renderImage(image, index)}
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 ${gridColumnsClass} ${gapClass}`}
              >
                {images.map((image, index) => renderImage(image, index))}
              </div>
            )
          ) : (
            <p className="rounded-2xl border border-dashed border-border/50 py-8 text-center text-sm text-muted-foreground">
              No valid images to display.
            </p>
          )}
        </div>
      );
    }

    // ================================ EMBED V3 ===============================
    case "embed": {
      const provider = (
        cfg.embedType === "other" ? "custom" : cfg.embedType || "youtube"
      ) as CreatorEmbedProvider;

      const rawUrl = String(cfg.embedUrl || "");
      const heading = String(cfg.embedHeading || section.title || "").trim();
      const caption = String(cfg.embedCaption || "");

      if (!rawUrl.trim()) return null;

      const validation = normalizeCreatorEmbedSource({
        provider,
        url: rawUrl,
        twitchParent: "localhost",
      });

      if (!validation.valid) {
        return (
          <div className="rounded-2xl border border-dashed border-border/60 px-5 py-8 text-center text-sm text-muted-foreground">
            {validation.message}
          </div>
        );
      }

      const width = String(cfg.embedWidth || "wide");
      const alignment = String(cfg.embedAlignment || "center");
      const aspectRatio = String(cfg.embedAspectRatio || "16:9");
      const customHeight = Math.max(
        120,
        Math.min(1200, Number(cfg.embedHeight ?? 400)),
      );
      const spotifySize = String(cfg.spotifySize || "standard");

      const surface = String(cfg.embedSurface || "none");
      const radius = String(cfg.embedRadius || "large");
      const border = String(cfg.embedBorder || "subtle");
      const shadow = String(cfg.embedShadow || "none");
      const hoverMotion = String(cfg.embedHoverMotion || "none");

      const widthClass =
        width === "narrow"
          ? "max-w-xl"
          : width === "medium"
            ? "max-w-2xl"
            : width === "full"
              ? "max-w-none"
              : "max-w-4xl";

      const alignmentClass =
        width === "full"
          ? "mx-0"
          : alignment === "left"
            ? "mr-auto"
            : alignment === "right"
              ? "ml-auto"
              : "mx-auto";

      const radiusClass =
        radius === "none"
          ? "rounded-none"
          : radius === "small"
            ? "rounded-lg"
            : radius === "medium"
              ? "rounded-2xl"
              : "rounded-3xl";

      const surfaceClass =
        surface === "card"
          ? "bg-card p-2 shadow-sm"
          : surface === "soft"
            ? "bg-muted/30 p-2"
            : surface === "outline"
              ? "border border-border/60 bg-transparent p-2"
              : "bg-transparent";

      const borderStyle =
        border === "accent"
          ? {
              border: `1px solid ${themeColor}66`,
            }
          : border === "subtle"
            ? {
                border: "1px solid hsl(var(--border) / 0.7)",
              }
            : undefined;

      const shadowClass =
        shadow === "strong"
          ? "shadow-2xl shadow-black/20"
          : shadow === "soft"
            ? "shadow-lg shadow-black/10"
            : "";

      const hoverClass = creatorHoverClass(hoverMotion, isBuilderPreview);

      const ratioClass =
        aspectRatio === "4:3"
          ? "aspect-[4/3]"
          : aspectRatio === "1:1"
            ? "aspect-square"
            : aspectRatio === "9:16"
              ? "aspect-[9/16]"
              : "aspect-video";

      const isSpotify = provider === "spotify";
      const usesCustomHeight = !isSpotify && aspectRatio === "custom";

      const iframeHeight = isSpotify
        ? spotifySize === "compact"
          ? 152
          : 352
        : usesCustomHeight
          ? customHeight
          : undefined;

      return (
        <section className={`w-full ${widthClass} ${alignmentClass}`}>
          {(heading || caption) && (
            <div
              className={cn(
                "mb-4",
                alignment === "center" && width !== "full"
                  ? "text-center"
                  : alignment === "right" && width !== "full"
                    ? "text-right"
                    : "text-left",
              )}
            >
              {heading && (
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {heading}
                </h2>
              )}

              {caption && (
                <div className="mt-2 text-sm leading-6 text-muted-foreground">
                  <MarkdownRenderer
                    content={caption}
                    className="[&>*:last-child]:mb-0"
                  />
                </div>
              )}
            </div>
          )}

          <div
            className={cn(
              "overflow-hidden",
              radiusClass,
              surfaceClass,
              shadowClass,
              hoverClass,
            )}
            style={borderStyle}
          >
            <div
              className={cn(
                "relative w-full overflow-hidden",
                radiusClass,
                !isSpotify && !usesCustomHeight && ratioClass,
              )}
              style={iframeHeight ? { height: `${iframeHeight}px` } : undefined}
            >
              <CreatorEmbedFrame
                provider={provider}
                rawUrl={rawUrl}
                title={heading || section.title || "Embed"}
                iframeHeight={iframeHeight}
              />
            </div>
          </div>
        </section>
      );
    }

    // ============================== STICKER V4 ================================
    case "sticker": {
      const rawImgSrc = (cfg.imageUrl as string) || "";
      const safeImage = normalizeCreatorPageHttpUrl(rawImgSrc, {
        label: "image URL",
      });
      const imgSrc = safeImage.valid && safeImage.href ? safeImage.href : "";

      const imgAlt = (cfg.alt as string) || section.title;
      const imgSize = (cfg.size as string) || "medium";
      const useCustomWidth =
        cfg.stickerUseCustomWidth === true ||
        cfg.stickerUseCustomWidth === "true";
      const customWidth = Math.max(
        48,
        Math.min(1200, Number(cfg.stickerWidth ?? 256)),
      );

      const imgRounded = (cfg.rounded as string) || "md";
      const imgAlign = (cfg.alignment as string) || "center";
      const positionMode = (cfg.positionMode as string) || "static";
      const posX = (cfg.posX as string) || "0px";
      const posY = (cfg.posY as string) || "0px";
      const rotation = Number(cfg.rotation) || 0;
      const opacity = Math.max(0, Math.min(100, Number(cfg.opacity ?? 100)));
      const zIndex = Math.max(0, Math.min(100, Number(cfg.zIndex ?? 10)));
      const shadow = String(cfg.stickerShadow || "soft");
      const hoverMotion = String(cfg.stickerHoverMotion || "none");

      const borderStyle = String(cfg.stickerBorderStyle || "none");
      const borderWidth = Math.max(
        1,
        Math.min(12, Number(cfg.stickerBorderWidth ?? 1)),
      );
      const borderColor = (cfg.stickerBorderColor as string) || themeColor;

      const entrance = String(cfg.stickerEntranceAnimation || "none");
      const motionDuration = Math.max(
        150,
        Math.min(2500, Number(cfg.stickerMotionDuration ?? 500)),
      );
      const motionDelay = Math.max(
        0,
        Math.min(2500, Number(cfg.stickerMotionDelay ?? 0)),
      );

      if (!imgSrc) return null;

      const presetWidth =
        imgSize === "small"
          ? "128px"
          : imgSize === "large"
            ? "384px"
            : imgSize === "full"
              ? "100%"
              : "256px";

      const resolvedWidth = useCustomWidth
        ? `${customWidth}px`
        : positionMode === "absolute" && imgSize === "full"
          ? "256px"
          : presetWidth;

      const radiusMap: Record<string, string> = {
        none: "rounded-none",
        sm: "rounded-lg",
        md: "rounded-2xl",
        lg: "rounded-3xl",
        full: "rounded-full",
      };

      const shadowFilter = isBuilderPreview
        ? shadow === "none"
          ? "none"
          : "drop-shadow(0 6px 8px rgb(0 0 0 / 0.16))"
        : shadow === "strong"
          ? "drop-shadow(0 16px 18px rgb(0 0 0 / 0.34))"
          : shadow === "none"
            ? "none"
            : "drop-shadow(0 8px 10px rgb(0 0 0 / 0.20))";

      const borderStyleValue =
        borderStyle === "accent"
          ? `${borderWidth}px solid ${themeColor}`
          : borderStyle === "custom"
            ? `${borderWidth}px solid ${borderColor}`
            : borderStyle === "subtle"
              ? `${borderWidth}px solid rgb(255 255 255 / 0.18)`
              : "none";

      const hoverClass = isBuilderPreview
        ? ""
        : hoverMotion === "wiggle"
          ? `${motionStyles.hoverBase} ${motionStyles.imageWiggle}`
          : creatorHoverClass(hoverMotion, false);

      const entranceClass = "";

      const imageClass = `${radiusMap[imgRounded]} block h-auto`;

      const image = (
        <div className={cn("inline-block max-w-full", hoverClass)}>
          <img
            src={imgSrc}
            alt={imgAlt}
            loading="lazy"
            decoding="async"
            className={imageClass}
            style={{
              width: resolvedWidth,
              maxWidth:
                positionMode === "absolute" ? "min(90vw, 1200px)" : "100%",
              transform: rotation ? `rotate(${rotation}deg)` : undefined,
              opacity: opacity / 100,
              filter: shadowFilter,
              border: borderStyleValue,
            }}
          />
        </div>
      );

      if (positionMode === "absolute") {
        return (
          <div className="relative" style={{ height: 0, overflow: "visible" }}>
            <div
              style={{
                position: "absolute",
                left: posX,
                top: posY,
                zIndex,
              }}
            >
              {image}
            </div>
          </div>
        );
      }

      const justifyClass =
        imgAlign === "left"
          ? "justify-start"
          : imgAlign === "right"
            ? "justify-end"
            : "justify-center";

      return <div className={`flex w-full ${justifyClass}`}>{image}</div>;
    }

    // ========================== LOREBOOK GALLERY V3 ==========================
    case "lorebook_gallery": {
      const selectedIds = Array.isArray(cfg.lorebookIds)
        ? (cfg.lorebookIds as string[])
        : [];
      const items =
        selectedIds.length > 0
          ? lorebooks.filter((item) => selectedIds.includes(item.id))
          : lorebooks;

      const description = String(cfg.description || "");
      const mode = String(cfg.lorebookLayout || "grid");
      const columns = String(cfg.lorebookColumns || "3");
      const gap = String(cfg.lorebookGap || "normal");
      const cardStyle = String(cfg.lorebookCardStyle || "card");
      const radius = String(cfg.lorebookCardRadius || "large");
      const align = String(cfg.lorebookTextAlign || "left");
      const showSummary =
        cfg.showLorebookSummary !== false &&
        cfg.showLorebookSummary !== "false";
      const specialized = mode === "compact" || mode === "editorial";
      const hoverClass = specialized
        ? ""
        : creatorHoverClass(
            String(cfg.lorebookHoverMotion || "lift"),
            isBuilderPreview,
          );

      const gapClass =
        gap === "tight" ? "gap-2" : gap === "relaxed" ? "gap-6" : "gap-4";
      const colsClass =
        columns === "2"
          ? "sm:grid-cols-2"
          : columns === "4"
            ? "sm:grid-cols-2 xl:grid-cols-4"
            : "sm:grid-cols-2 lg:grid-cols-3";
      const radiusClass =
        radius === "none"
          ? "rounded-none"
          : radius === "small"
            ? "rounded-lg"
            : radius === "medium"
              ? "rounded-2xl"
              : "rounded-3xl";
      const alignClass =
        align === "center"
          ? "text-center"
          : align === "right"
            ? "text-right"
            : "text-left";
      const styleClass =
        cardStyle === "soft"
          ? "border border-transparent bg-muted/30"
          : cardStyle === "outline"
            ? "border border-border/70 bg-transparent"
            : cardStyle === "minimal"
              ? "border border-transparent bg-transparent"
              : "border border-border/60 bg-card/80 shadow-md shadow-black/[0.05]";

      const standardCard = (item: CreatorPageLorebookPreview) => (
        <article
          key={item.id}
          className={cn(
            "min-w-0 overflow-hidden p-5",
            radiusClass,
            styleClass,
            alignClass,
            hoverClass,
          )}
        >
          <div
            className={cn(
              "flex items-start gap-3",
              align === "center" && "flex-col items-center",
              align === "right" && "flex-row-reverse",
            )}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${themeColor}16`, color: themeColor }}
            >
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold tracking-tight">
                {item.title}
              </h3>
            </div>
          </div>

          {showSummary && item.summary && (
            <div className="mt-3 text-sm leading-6 text-muted-foreground">
              <MarkdownRenderer
                content={item.summary}
                className="[&>*:last-child]:mb-0"
              />
            </div>
          )}
        </article>
      );

      return (
        <section className="space-y-4">
          <div>
            {section.title && (
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Layers
                  className="h-5 w-5 shrink-0"
                  style={{ color: themeColor }}
                />
                {section.title}
              </h2>
            )}
            {description && (
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                <MarkdownRenderer
                  content={description}
                  className="[&>*:last-child]:mb-0"
                />
              </div>
            )}
          </div>

          {items.length > 0 ? (
            mode === "compact" ? (
              <div className={`grid ${gapClass}`}>
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="flex min-w-0 items-start gap-3 rounded-2xl border border-border/60 bg-card/55 p-4"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${themeColor}14`,
                        color: themeColor,
                      }}
                    >
                      <Layers className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="text-sm font-semibold">{item.title}</h3>
                      </div>
                      {showSummary && item.summary && (
                        <div className="mt-1.5 line-clamp-3 text-xs leading-5 text-muted-foreground">
                          <MarkdownRenderer
                            content={item.summary}
                            className="[&>*:last-child]:mb-0"
                          />
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : mode === "editorial" ? (
              <div>
                {items.map((item, index) => (
                  <article
                    key={item.id}
                    className="grid min-w-0 gap-4 border-b border-border/60 py-6 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6"
                  >
                    <div>
                      <p
                        className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                        style={{ color: themeColor }}
                      >
                        Lorebook {String(index + 1).padStart(2, "0")}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold tracking-tight">
                        {item.title}
                      </h3>
                      {showSummary && item.summary && (
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          <MarkdownRenderer
                            content={item.summary}
                            className="[&>*:last-child]:mb-0"
                          />
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : mode === "carousel" ? (
              <div
                className={`flex snap-x snap-mandatory overflow-x-auto pb-2 ${gapClass}`}
              >
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="w-[82%] min-w-[17rem] max-w-md shrink-0 snap-start sm:w-[55%] lg:w-[36%]"
                  >
                    {standardCard(item)}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`grid grid-cols-1 ${colsClass} ${gapClass}`}>
                {items.map(standardCard)}
              </div>
            )
          ) : (
            <p className="rounded-2xl border border-dashed border-border/50 px-4 py-8 text-center text-sm text-muted-foreground">
              No lorebooks linked.
            </p>
          )}
        </section>
      );
    }

    // ============================== DIVIDER V3 ===============================
    case "divider": {
      const dividerStyle = String(cfg.dividerStyle || "solid");

      const thickness = Math.max(
        1,
        Math.min(
          ["dots", "ornament"].includes(dividerStyle) ? 16 : 12,
          Number(cfg.dividerThickness ?? 1),
        ),
      );

      const width = Math.max(
        25,
        Math.min(100, Number(cfg.dividerWidth ?? 100)),
      );

      const alignment = String(cfg.dividerAlignment || "center");
      const opacity =
        Math.max(5, Math.min(100, Number(cfg.dividerOpacity ?? 35))) / 100;

      const customColor = String(cfg.dividerCustomColor || "").trim();
      const dividerColor =
        cfg.dividerColorMode === "custom" &&
        /^#[0-9a-fA-F]{6}$/.test(customColor)
          ? customColor
          : themeColor;

      const glow = cfg.dividerGlow === true || cfg.dividerGlow === "true";

      const alignmentClass =
        width >= 100
          ? "mx-0"
          : alignment === "left"
            ? "mr-auto"
            : alignment === "right"
              ? "ml-auto"
              : "mx-auto";

      const commonStyle = {
        width: `${width}%`,
        opacity,
        filter: glow ? `drop-shadow(0 0 7px ${dividerColor})` : undefined,
      };

      if (dividerStyle === "dots") {
        return (
          <div
            className={`flex items-center justify-center gap-2 ${alignmentClass}`}
            style={commonStyle}
          >
            {Array.from({ length: 7 }).map((_, index) => (
              <span
                key={index}
                className="block rounded-full"
                style={{
                  width: `${thickness}px`,
                  height: `${thickness}px`,
                  backgroundColor: dividerColor,
                }}
              />
            ))}
          </div>
        );
      }

      if (dividerStyle === "ornament") {
        return (
          <div
            className={`flex items-center gap-3 ${alignmentClass}`}
            style={commonStyle}
          >
            <span
              className="h-px min-w-0 flex-1"
              style={{ backgroundColor: dividerColor }}
            />
            <span
              className="shrink-0 rotate-45 border"
              style={{
                width: `${Math.max(8, thickness)}px`,
                height: `${Math.max(8, thickness)}px`,
                borderColor: dividerColor,
              }}
            />
            <span
              className="h-px min-w-0 flex-1"
              style={{ backgroundColor: dividerColor }}
            />
          </div>
        );
      }

      if (dividerStyle === "gradient") {
        return (
          <div
            className={alignmentClass}
            style={{
              ...commonStyle,
              height: `${thickness}px`,
              background: `linear-gradient(90deg, transparent, ${dividerColor}, transparent)`,
            }}
          />
        );
      }

      const borderStyle =
        dividerStyle === "dashed"
          ? "dashed"
          : dividerStyle === "dotted"
            ? "dotted"
            : "solid";

      return (
        <div
          className={alignmentClass}
          style={{
            ...commonStyle,
            borderTop: `${thickness}px ${borderStyle} ${dividerColor}`,
          }}
        />
      );
    }

    // ============================== SPACER V3 ================================
    case "spacer": {
      const desktopHeight = Math.max(
        0,
        Math.min(600, Number(cfg.spacerHeight ?? 48)),
      );

      const responsive =
        cfg.spacerResponsive === true || cfg.spacerResponsive === "true";

      const mobileHeight = responsive
        ? Math.max(
            0,
            Math.min(
              400,
              Number(cfg.spacerMobileHeight ?? Math.min(desktopHeight, 32)),
            ),
          )
        : desktopHeight;

      return (
        <div
          aria-hidden="true"
          className="h-[var(--creator-spacer-mobile)] sm:h-[var(--creator-spacer-desktop)]"
          style={
            {
              "--creator-spacer-mobile": `${mobileHeight}px`,
              "--creator-spacer-desktop": `${desktopHeight}px`,
            } as React.CSSProperties
          }
        />
      );
    }

    // =============================== DEFAULT =================================
    default:
      return (
        <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
          Unknown section: {section.kind}
        </div>
      );
  }
}
