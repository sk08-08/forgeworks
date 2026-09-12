"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type {
  CreatorPageCanvasWidth,
  CreatorPageConfig,
  CreatorPageSectionGap,
} from "@/features/creator-pages/types/creator-page-types";

interface CreatorPageCanvasProps {
  config?: CreatorPageConfig;
  children: ReactNode;
  className?: string;
}

const WIDTH_CLASS: Record<CreatorPageCanvasWidth, string> = {
  narrow: "max-w-3xl",
  standard: "max-w-6xl",
  wide: "max-w-[90rem]",
  full: "max-w-none",
};

const GAP_CLASS: Record<CreatorPageSectionGap, string> = {
  compact: "space-y-6",
  normal: "space-y-10",
  relaxed: "space-y-16",
};

const PADDING_CLASS = {
  compact: "px-3 py-8 sm:px-5 sm:py-10",
  normal: "px-4 py-10 sm:px-6 sm:py-14 lg:px-8",
  spacious: "px-4 py-14 sm:px-8 sm:py-20 lg:px-12",
} as const;

function getBackgroundClass(config: CreatorPageConfig) {
  switch (config.bgStyle) {
    case "dark":
      return "bg-zinc-950 text-zinc-100";
    case "ambient":
      return "bg-gradient-to-b from-background via-background to-primary/5";
    case "minimal":
      return "bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100";
    default:
      return "bg-background text-foreground";
  }
}

function getFontClass(config: CreatorPageConfig) {
  switch (config.fontStyle) {
    case "serif":
      return "font-serif";
    case "mono":
      return "font-mono";
    case "display":
      return "font-display";
    default:
      return "";
  }
}

export function CreatorPageCanvas({
  config = {},
  children,
  className,
}: CreatorPageCanvasProps) {
  const accentColor =
    typeof config.accentColor === "string" && config.accentColor.trim()
      ? config.accentColor
      : "#7c3aed";

  const width =
    (config.canvasWidth as CreatorPageCanvasWidth | undefined) || "standard";

  const sectionGap =
    (config.sectionGap as CreatorPageSectionGap | undefined) || "normal";

  const padding =
    config.pagePadding === "compact" ||
    config.pagePadding === "spacious" ||
    config.pagePadding === "normal"
      ? config.pagePadding
      : "normal";

  return (
    <main
      className={cn(
        "creator-page-canvas relative min-h-dvh min-w-0 max-w-full overflow-x-clip",
        getBackgroundClass(config),
        getFontClass(config),
        className,
      )}
      style={
        {
          "--creator-page-accent": accentColor,
        } as CSSProperties
      }
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden"
      >
        <div
          className="absolute -left-24 -top-28 h-72 w-72 rounded-full blur-3xl"
          style={{ background: `${accentColor}12` }}
        />
        <div
          className="absolute -right-24 -top-32 h-80 w-80 rounded-full blur-3xl"
          style={{ background: `${accentColor}0d` }}
        />
      </div>

      <div
        className={cn(
          "relative mx-auto w-full min-w-0 max-w-full",
          WIDTH_CLASS[width],
          PADDING_CLASS[padding],
        )}
      >
        <div className={cn("min-w-0 max-w-full", GAP_CLASS[sectionGap])}>
          {children}
        </div>
      </div>
    </main>
  );
}
