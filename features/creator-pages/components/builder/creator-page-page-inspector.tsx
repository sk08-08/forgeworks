"use client";

import { Loader2 } from "lucide-react";

import { CustomColorPicker } from "@/components/ui/custom-color-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownField } from "@/features/markdown/components/markdown-field";
import { cn } from "@/lib/utils";
import { ResourceVisibilitySelect } from "@/components/shared/resource-visibility-select";
import type { ResourceVisibility } from "@/lib/resource-visibility";
import type {
  CreatorPageBackgroundStyle,
  CreatorPageFontStyle,
} from "@/features/creator-pages/types/creator-page-types";

interface CreatorPagePageInspectorProps {
  title: string;
  slug: string;
  description: string;
  accentColor: string;
  backgroundStyle: CreatorPageBackgroundStyle;
  fontStyle: CreatorPageFontStyle;
  visibility: ResourceVisibility;
  slugStatus: "idle" | "checking" | "available" | "taken";
  slugMessage: string;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAccentColorChange: (value: string) => void;
  onBackgroundStyleChange: (value: CreatorPageBackgroundStyle) => void;
  onFontStyleChange: (value: CreatorPageFontStyle) => void;
  onVisibilityChange: (value: ResourceVisibility) => void;
}

export function CreatorPagePageInspector({
  title,
  slug,
  description,
  accentColor,
  backgroundStyle,
  fontStyle,
  visibility,
  slugStatus,
  slugMessage,
  onTitleChange,
  onSlugChange,
  onDescriptionChange,
  onAccentColorChange,
  onBackgroundStyleChange,
  onFontStyleChange,
  onVisibilityChange,
}: CreatorPagePageInspectorProps) {
  return (
    <>
      <div className="mb-4">
        <p className="text-sm font-semibold">Page inspector</p>
        <p className="text-[11px] text-muted-foreground">
          Changes appear instantly on the canvas.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-xs">Page title</Label>
          <Input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="My Creator Page"
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">URL slug</Label>

          <div className="relative flex min-w-0 items-center">
            <span className="flex h-9 shrink-0 items-center rounded-l-md border border-r-0 bg-muted px-2.5 text-[11px] text-muted-foreground">
              /page/
            </span>

            <Input
              value={slug}
              onChange={(event) =>
                onSlugChange(
                  event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-")
                    .replace(/-+/g, "-"),
                )
              }
              className={cn(
                "h-9 min-w-0 rounded-l-none pr-8 text-xs",
                slugStatus === "available" && "border-emerald-500",
                slugStatus === "taken" && "border-destructive",
              )}
            />

            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {slugStatus === "checking" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              {slugStatus === "available" && (
                <span className="text-xs font-bold text-emerald-500">✓</span>
              )}
              {slugStatus === "taken" && (
                <span className="text-xs font-bold text-destructive">✗</span>
              )}
            </div>
          </div>

          {slugMessage && slugStatus !== "idle" && (
            <p
              className={cn(
                "text-[10px] leading-relaxed",
                slugStatus === "available" && "text-emerald-600",
                slugStatus === "taken" && "text-destructive",
                slugStatus === "checking" && "text-muted-foreground",
              )}
            >
              {slugMessage}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Description</Label>
          <MarkdownField
            value={description}
            onChange={onDescriptionChange}
            placeholder="Describe this page..."
            minEditorHeightRem={6}
            className="min-h-[7rem]"
          />
        </div>

        <div className="border-t border-border/60 pt-4">
          <ResourceVisibilitySelect
            value={visibility}
            onChange={onVisibilityChange}
            description="Who can open this published Creator Page. Publishing and visibility are separate: a private published page is still owner-only."
          />
        </div>

        <div className="border-t border-border/60 pt-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Appearance
          </p>

          <div className="space-y-4">
            <CustomColorPicker
              label="Accent color"
              value={accentColor}
              onChange={onAccentColorChange}
            />

            <div className="space-y-2">
              <Label className="text-xs">Background</Label>
              <Select
                value={backgroundStyle}
                onValueChange={(value) => onBackgroundStyleChange(value as CreatorPageBackgroundStyle)}
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

            <div className="space-y-2">
              <Label className="text-xs">Typography</Label>
              <Select value={fontStyle} onValueChange={(value) => onFontStyleChange(value as CreatorPageFontStyle)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="serif">Serif</SelectItem>
                  <SelectItem value="mono">Monospace</SelectItem>
                  <SelectItem value="display">Display</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
