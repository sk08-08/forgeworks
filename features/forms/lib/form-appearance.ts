import { cn } from "@/lib/utils";
import type {
  FormAccent,
  FormAppearance,
  FormDensity,
  FormHeaderIcon,
  FormPreset,
} from "@/features/forms/types/form-types";
import type { CSSProperties } from "react";

export const defaultFormAppearance: FormAppearance = {
  preset: "clean",
  accent: "indigo",
  density: "comfortable",
  headerIcon: "sparkles",
  hideHeaderIcon: false,
};

export const formAppearanceHeaderIcons: Array<{
  value: FormHeaderIcon;
  label: string;
}> = [
  { value: "sparkles", label: "Sparkles" },
  { value: "star", label: "Star" },
  { value: "wand", label: "Magic Wand" },
  { value: "heart", label: "Heart" },
  { value: "flame", label: "Flame" },
  { value: "gem", label: "Gem" },
];

const validHeaderIcons = new Set<FormHeaderIcon>(
  formAppearanceHeaderIcons.map((icon) => icon.value),
);

function isValidHeaderIcon(value: unknown): value is FormHeaderIcon {
  return (
    typeof value === "string" && validHeaderIcons.has(value as FormHeaderIcon)
  );
}

function normalizeOptionalHexColor(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) return undefined;
  return trimmed;
}

export const formAppearancePresets: Array<{
  value: FormPreset;
  label: string;
  description: string;
}> = [
  {
    value: "clean",
    label: "Clean",
    description: "Neutral cards and standard spacing.",
  },
  {
    value: "bold",
    label: "Bold",
    description: "Stronger emphasis with a more assertive shell.",
  },
  {
    value: "editorial",
    label: "Editorial",
    description: "Airier layout with a more polished header feel.",
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Lighter surfaces and reduced visual noise.",
  },
];

export const formAppearanceAccents: Array<{
  value: FormAccent;
  label: string;
}> = [
  { value: "indigo", label: "Indigo" },
  { value: "emerald", label: "Emerald" },
  { value: "amber", label: "Amber" },
  { value: "rose", label: "Rose" },
  { value: "slate", label: "Slate" },
  { value: "teal", label: "Teal" },
  { value: "sky", label: "Sky" },
  { value: "violet", label: "Violet" },
];

export const formAppearanceDensityOptions: Array<{
  value: FormDensity;
  label: string;
  description: string;
}> = [
  {
    value: "comfortable",
    label: "Comfortable",
    description: "More space between sections and fields.",
  },
  {
    value: "compact",
    label: "Compact",
    description: "Tighter spacing for denser forms.",
  },
];

const accentMap: Record<
  FormAccent,
  {
    softBg: string;
    border: string;
    text: string;
    button: string;
    badge: string;
    hex: string;
    glow: string;
    focus: string;
  }
> = {
  indigo: {
    softBg: "bg-indigo-600/12 dark:bg-indigo-400/18",
    border: "border-indigo-600/32 dark:border-indigo-400/34",
    text: "text-indigo-700 dark:text-indigo-300",
    button:
      "bg-indigo-700 hover:bg-indigo-800 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500",
    badge:
      "bg-indigo-600/12 text-indigo-800 border-indigo-600/28 dark:bg-indigo-400/20 dark:text-indigo-200 dark:border-indigo-400/34",
    hex: "#4f46e5",
    glow: "rgba(79, 70, 229, 0.18)",
    focus: "focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20",
  },
  emerald: {
    softBg: "bg-emerald-600/12 dark:bg-emerald-400/18",
    border: "border-emerald-600/32 dark:border-emerald-400/34",
    text: "text-emerald-700 dark:text-emerald-300",
    button:
      "bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500",
    badge:
      "bg-emerald-600/12 text-emerald-800 border-emerald-600/28 dark:bg-emerald-400/20 dark:text-emerald-200 dark:border-emerald-400/34",
    hex: "#059669",
    glow: "rgba(5, 150, 105, 0.18)",
    focus: "focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20",
  },
  amber: {
    softBg: "bg-amber-600/12 dark:bg-amber-400/20",
    border: "border-amber-600/34 dark:border-amber-400/36",
    text: "text-amber-800 dark:text-amber-300",
    button:
      "bg-amber-700 hover:bg-amber-800 text-white dark:bg-amber-600 dark:hover:bg-amber-500",
    badge:
      "bg-amber-600/12 text-amber-900 border-amber-600/28 dark:bg-amber-400/22 dark:text-amber-200 dark:border-amber-400/36",
    hex: "#d97706",
    glow: "rgba(217, 119, 6, 0.18)",
    focus: "focus-visible:border-amber-500 focus-visible:ring-amber-500/20",
  },
  rose: {
    softBg: "bg-rose-600/12 dark:bg-rose-400/18",
    border: "border-rose-600/32 dark:border-rose-400/34",
    text: "text-rose-700 dark:text-rose-300",
    button:
      "bg-rose-700 hover:bg-rose-800 text-white dark:bg-rose-600 dark:hover:bg-rose-500",
    badge:
      "bg-rose-600/12 text-rose-800 border-rose-600/28 dark:bg-rose-400/20 dark:text-rose-200 dark:border-rose-400/34",
    hex: "#e11d48",
    glow: "rgba(225, 29, 72, 0.18)",
    focus: "focus-visible:border-rose-500 focus-visible:ring-rose-500/20",
  },
  slate: {
    softBg: "bg-slate-600/12 dark:bg-slate-400/18",
    border: "border-slate-600/30 dark:border-slate-400/34",
    text: "text-slate-700 dark:text-slate-300",
    button:
      "bg-slate-700 hover:bg-slate-800 text-white dark:bg-slate-600 dark:hover:bg-slate-500",
    badge:
      "bg-slate-600/12 text-slate-800 border-slate-600/26 dark:bg-slate-400/20 dark:text-slate-200 dark:border-slate-400/34",
    hex: "#334155",
    glow: "rgba(51, 65, 85, 0.18)",
    focus: "focus-visible:border-slate-500 focus-visible:ring-slate-500/20",
  },
  teal: {
    softBg: "bg-teal-600/12 dark:bg-teal-400/18",
    border: "border-teal-600/32 dark:border-teal-400/34",
    text: "text-teal-700 dark:text-teal-300",
    button:
      "bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-500",
    badge:
      "bg-teal-600/12 text-teal-800 border-teal-600/28 dark:bg-teal-400/20 dark:text-teal-200 dark:border-teal-400/34",
    hex: "#0f766e",
    glow: "rgba(15, 118, 110, 0.18)",
    focus: "focus-visible:border-teal-500 focus-visible:ring-teal-500/20",
  },
  sky: {
    softBg: "bg-sky-600/12 dark:bg-sky-400/18",
    border: "border-sky-600/32 dark:border-sky-400/34",
    text: "text-sky-700 dark:text-sky-300",
    button:
      "bg-sky-700 hover:bg-sky-800 text-white dark:bg-sky-600 dark:hover:bg-sky-500",
    badge:
      "bg-sky-600/12 text-sky-800 border-sky-600/28 dark:bg-sky-400/20 dark:text-sky-200 dark:border-sky-400/34",
    hex: "#0284c7",
    glow: "rgba(2, 132, 199, 0.18)",
    focus: "focus-visible:border-sky-500 focus-visible:ring-sky-500/20",
  },
  violet: {
    softBg: "bg-violet-600/12 dark:bg-violet-400/18",
    border: "border-violet-600/32 dark:border-violet-400/34",
    text: "text-violet-700 dark:text-violet-300",
    button:
      "bg-violet-700 hover:bg-violet-800 text-white dark:bg-violet-600 dark:hover:bg-violet-500",
    badge:
      "bg-violet-600/12 text-violet-800 border-violet-600/28 dark:bg-violet-400/20 dark:text-violet-200 dark:border-violet-400/34",
    hex: "#7c3aed",
    glow: "rgba(124, 58, 237, 0.18)",
    focus: "focus-visible:border-violet-500 focus-visible:ring-violet-500/20",
  },
};

export function resolveFormAppearance(
  appearance?: Partial<FormAppearance> | null,
): FormAppearance {
  return {
    preset: appearance?.preset ?? defaultFormAppearance.preset,
    accent: appearance?.accent ?? defaultFormAppearance.accent,
    density: appearance?.density ?? defaultFormAppearance.density,
    titleColor: normalizeOptionalHexColor(appearance?.titleColor),
    descriptionColor: normalizeOptionalHexColor(appearance?.descriptionColor),
    headerIcon: isValidHeaderIcon(appearance?.headerIcon)
      ? appearance.headerIcon
      : defaultFormAppearance.headerIcon,
    hideHeaderIcon: appearance?.hideHeaderIcon === true,
    headerIconColor: normalizeOptionalHexColor(appearance?.headerIconColor),
  };
}

export function getFormAccentClasses(accent: FormAccent) {
  return accentMap[accent] ?? accentMap.indigo;
}

export function getFormFieldFocusClasses(accent: FormAccent) {
  const resolved = getFormAccentClasses(accent);
  return cn(
    "focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none",
    resolved.focus,
  );
}

function hexToRgba(hex: string, alpha: number) {
  const raw = String(hex || "")
    .trim()
    .replace(/^#/, "");
  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw;

  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return `rgba(99, 102, 241, ${alpha})`;
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getFormDensityClasses(density: FormDensity) {
  return density === "compact"
    ? {
        formGap: "space-y-3 sm:space-y-4",

        sectionContent: "space-y-3 sm:space-y-4",

        fieldGroup: "space-y-1.5",

        headerSpacing: "mb-4 sm:mb-5",

        containerPadding: "py-4 sm:py-6",
      }
    : {
        formGap: "space-y-5 sm:space-y-7 lg:space-y-8",

        sectionContent: "space-y-5 sm:space-y-7 lg:space-y-8",

        fieldGroup: "space-y-2 sm:space-y-3",

        headerSpacing: "mb-6 sm:mb-8 lg:mb-10",

        containerPadding: "py-5 sm:py-8 lg:py-10",
      };
}

export function getFormPresetClasses(preset: FormPreset) {
  switch (preset) {
    case "bold":
      return {
        shell:
          "border-2 border-border/80 shadow-xl shadow-foreground/8 bg-background",
        card: "border-2 border-border/70 rounded-2xl bg-background/95 shadow-lg",
        heroIcon: "shadow-xl rounded-2xl",
        title: "tracking-tight text-xl",
        wrapper: "",
        layout: "mx-auto w-full max-w-5xl",
        sidebar: "",
        pageBg: "",
      };
    case "editorial":
      return {
        shell: "border-border/70 shadow-lg bg-background",
        card: "rounded-none border-x-0 border-t-0 border-b-2 border-dotted border-border/70 shadow-none bg-transparent",
        heroIcon: "shadow-md rounded-2xl ring-1 ring-border/20",
        title: "tracking-tight text-balance text-xl font-semibold",
        wrapper: "",
        layout:
          "mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-5 sm:gap-6 md:grid md:grid-cols-[16rem_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)] md:items-start",
        sidebar:
          "order-first w-full min-w-0 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-lg backdrop-blur sm:rounded-3xl sm:p-5 md:sticky md:top-4 md:w-auto lg:p-6",
        pageBg: "",
      };
    case "minimal":
      return {
        shell:
          "border-dashed border-border/80 shadow-sm bg-background/80 backdrop-blur-[1px]",
        card: "rounded-sm border-dashed border-border/80 bg-background/75 shadow-none",
        heroIcon: "rounded-lg opacity-90",
        title:
          "tracking-tight uppercase text-sm tracking-[0.18em] text-muted-foreground",
        wrapper: "",
        layout: "mx-auto w-full max-w-2xl",
        sidebar: "",
        pageBg: "",
      };
    case "clean":
    default:
      return {
        shell: "border-border/75 shadow-sm bg-background",
        card: "rounded-xl border-border/70 bg-background shadow-sm",
        heroIcon: "rounded-xl",
        title: "tracking-tight text-lg",
        wrapper: "",
        layout: "mx-auto w-full max-w-3xl",
        sidebar: "",
        pageBg: "",
      };
  }
}

export function getFormAppearanceClasses(
  appearance?: Partial<FormAppearance> | null,
) {
  const resolved = resolveFormAppearance(appearance);
  const accent = getFormAccentClasses(resolved.accent);
  const preset = getFormPresetClasses(resolved.preset);
  const density = getFormDensityClasses(resolved.density);
  const accentSoft = hexToRgba(accent.hex, 0.08);
  const accentSoftStrong = hexToRgba(accent.hex, 0.16);
  const topAccent = hexToRgba(accent.hex, 0.45);
  const editorialBorder = hexToRgba(accent.hex, 0.45);

  return {
    resolved,
    accent,
    preset,
    density,
    wrapper: cn(
      "relative min-h-dvh w-full min-w-0 overflow-x-hidden flex items-start justify-center",
      preset.wrapper,
      density.containerPadding,
      resolved.preset === "minimal" ? "bg-muted/20" : "bg-background",
      preset.pageBg,
    ),
    wrapperStyle: {
      backgroundImage:
        resolved.preset === "minimal"
          ? `radial-gradient(circle at top left, ${accent.glow}, transparent 42%), radial-gradient(circle at bottom right, ${accent.glow.replace(
              "0.18",
              "0.08",
            )}, transparent 34%)`
          : `radial-gradient(circle at top left, ${accent.glow}, transparent 38%), radial-gradient(circle at top right, ${accent.glow.replace(
              "0.18",
              "0.1",
            )}, transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.0), rgba(255,255,255,0.0))`,
    } as CSSProperties,
    surface: cn("min-w-0 max-w-full overflow-hidden", preset.shell),
    surfaceStyle:
      resolved.preset === "bold"
        ? ({
            backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0) 0%, ${accentSoftStrong} 100%)`,
          } as CSSProperties)
        : resolved.preset === "editorial"
          ? ({
              backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0) 0%, ${accentSoft} 100%)`,
            } as CSSProperties)
          : undefined,
    editorialTopAccentStyle:
      resolved.preset === "editorial"
        ? ({
            backgroundImage: `linear-gradient(90deg, transparent, ${topAccent}, transparent)`,
          } as CSSProperties)
        : undefined,
    sectionCard: cn(
      "min-w-0 max-w-full overflow-hidden border transition-all",
      preset.card,
      accent.border,
    ),
    sectionCardStyle:
      resolved.preset === "editorial"
        ? ({
            borderBottomColor: editorialBorder,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: "transparent",
          } as CSSProperties)
        : undefined,
    heroIcon: cn(
      "flex h-12 w-12 items-center justify-center rounded-xl",
      accent.softBg,
      accent.border,
      preset.heroIcon,
    ),
    title: cn("font-bold", preset.title, accent.text),
    submitButton: accent.button,
    submitButtonStyle: { backgroundColor: accent.hex, color: "#fff" },
    accentBadge: cn("border", accent.badge),
  };
}
