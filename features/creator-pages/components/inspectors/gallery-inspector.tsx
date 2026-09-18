"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  ArrowDown,
  ArrowUp,
  ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeCreatorPageHttpUrl } from "@/features/creator-pages/lib/creator-page-links";
import { MediaPicker } from "@/features/media/components/media-picker";
import { cn } from "@/lib/utils";

import type {
  CreatorGalleryImageItem,
  CreatorInspectorBaseProps,
} from "@/features/creator-pages/types/creator-page-types";

interface GalleryInspectorProps extends CreatorInspectorBaseProps {
  editingImages: CreatorGalleryImageItem[];
  setEditingImages: Dispatch<SetStateAction<CreatorGalleryImageItem[]>>;
}

export function GalleryInspector({
  blockInspectorTab,
  setBlockInspectorTab,
  sectionConfigEdit,
  setSectionConfigEdit,
  editingImages,
  setEditingImages,
}: GalleryInspectorProps) {
  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1 sm:grid-cols-4">
        {(
          [
            ["content", "Content"],
            ["layout", "Layout"],
            ["style", "Style"],
            ["motion", "Motion"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 cursor-pointer rounded-lg px-1.5 text-[11px]",
              blockInspectorTab === value &&
                "bg-background shadow-sm",
            )}
            onClick={() => setBlockInspectorTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {blockInspectorTab === "content" && (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Images
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Reorder images, keep alt text for accessibility,
              and add an optional visible caption separately.
            </p>
          </div>

          <MediaPicker
            multiple
            maxSelection={20}
            label="Choose or upload multiple images"
            selectedUrls={editingImages.map((image) => image.url)}
            onSelect={(images) =>
              setEditingImages((current) => {
                const used = new Set(current.map((image) => image.url));
                const additions = images
                  .filter((image) => {
                    if (used.has(image.url)) return false;
                    used.add(image.url);
                    return true;
                  })
                  .map((image) => ({ url: image.url, alt: "", caption: "" }));
                return additions.length ? [...current, ...additions] : current;
              })
            }
          />

          <div className="space-y-2">
            {editingImages.map((image, index) => {
              const urlCheck = normalizeCreatorPageHttpUrl(
                image.url,
                { label: "image URL" },
              );

              return (
                <div
                  key={index}
                  className="grid min-w-0 gap-3 rounded-xl border border-border/60 bg-muted/[0.12] p-3 sm:grid-cols-[4rem_minmax(0,1fr)_2rem]"
                >
                  <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                    {image.url && urlCheck.valid ? (
                      <img
                        src={urlCheck.href || image.url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-2">
                    <Input
                      value={image.url}
                      onChange={(event) => {
                        const next = [...editingImages];
                        next[index] = {
                          ...next[index],
                          url: event.target.value,
                        };
                        setEditingImages(next);
                      }}
                      onBlur={() => {
                        const result =
                          normalizeCreatorPageHttpUrl(
                            image.url,
                            { label: "image URL" },
                          );

                        if (
                          result.valid &&
                          result.href !== null
                        ) {
                          const next = [...editingImages];
                          next[index] = {
                            ...next[index],
                            url: result.href,
                          };
                          setEditingImages(next);
                        }
                      }}
                      placeholder="example.com/image.jpg"
                      className={cn(
                        "h-9 min-w-0 text-xs",
                        image.url.trim() &&
                          !urlCheck.valid &&
                          "border-destructive/55",
                      )}
                    />

                    <Input
                      value={image.alt || ""}
                      onChange={(event) => {
                        const next = [...editingImages];
                        next[index] = {
                          ...next[index],
                          alt: event.target.value,
                        };
                        setEditingImages(next);
                      }}
                      placeholder="Alt text (accessibility)"
                      className="h-9 min-w-0 text-xs"
                    />

                    <Input
                      value={image.caption || ""}
                      onChange={(event) => {
                        const next = [...editingImages];
                        next[index] = {
                          ...next[index],
                          caption: event.target.value,
                        };
                        setEditingImages(next);
                      }}
                      placeholder="Caption (optional)"
                      className="h-9 min-w-0 text-xs"
                    />
                  </div>

                  <div className="flex flex-row gap-1 sm:flex-col">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer"
                      disabled={index === 0}
                      onClick={() =>
                        setEditingImages((current) => {
                          if (index === 0) return current;
                          const next = [...current];
                          [next[index - 1], next[index]] = [
                            next[index],
                            next[index - 1],
                          ];
                          return next;
                        })
                      }
                      title="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer"
                      disabled={
                        index === editingImages.length - 1
                      }
                      onClick={() =>
                        setEditingImages((current) => {
                          if (index >= current.length - 1) {
                            return current;
                          }

                          const next = [...current];
                          [next[index], next[index + 1]] = [
                            next[index + 1],
                            next[index],
                          ];
                          return next;
                        })
                      }
                      title="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
                      onClick={() =>
                        setEditingImages((current) =>
                          current.filter(
                            (_, itemIndex) =>
                              itemIndex !== index,
                          ),
                        )
                      }
                      title="Remove image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer rounded-xl"
            onClick={() =>
              setEditingImages((current) => [
                ...current,
                { url: "", alt: "", caption: "" },
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add image
          </Button>
        </div>
      )}

      {blockInspectorTab === "layout" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Layout
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Presentation</Label>
            <Select
              value={
                sectionConfigEdit.galleryLayout || "grid"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  galleryLayout: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="carousel">
                  Horizontal carousel
                </SelectItem>
                <SelectItem value="masonry">
                  Masonry
                </SelectItem>
                <SelectItem value="featured">
                  Featured first image
                </SelectItem>
                <SelectItem value="strip">
                  Film strip
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Columns</Label>
              {!["grid", "masonry"].includes(
                sectionConfigEdit.galleryLayout || "grid",
              ) && (
                <span className="text-[10px] text-muted-foreground">
                  Not used by this layout
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.columns || "3"}
              disabled={
                !["grid", "masonry"].includes(
                  sectionConfigEdit.galleryLayout || "grid",
                )
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  columns: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 columns</SelectItem>
                <SelectItem value="3">3 columns</SelectItem>
                <SelectItem value="4">4 columns</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Image ratio</Label>
              {sectionConfigEdit.galleryLayout ===
                "masonry" && (
                <span className="text-[10px] text-muted-foreground">
                  Natural height in Masonry
                </span>
              )}
            </div>

            <Select
              value={
                sectionConfigEdit.galleryRatio || "square"
              }
              disabled={
                sectionConfigEdit.galleryLayout === "masonry"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  galleryRatio: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square">1:1</SelectItem>
                <SelectItem value="portrait">3:4</SelectItem>
                <SelectItem value="landscape">
                  16:10
                </SelectItem>
                <SelectItem value="wide">16:9</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">
                Image position
              </Label>
              {(sectionConfigEdit.galleryLayout ===
                "masonry" ||
                sectionConfigEdit.galleryFit ===
                  "contain") && (
                <span className="text-[10px] text-muted-foreground">
                  {sectionConfigEdit.galleryLayout ===
                  "masonry"
                    ? "Natural size in Masonry"
                    : "Not used with Contain"}
                </span>
              )}
            </div>

            <Select
              value={
                sectionConfigEdit.galleryPosition || "center"
              }
              disabled={
                sectionConfigEdit.galleryLayout ===
                  "masonry" ||
                sectionConfigEdit.galleryFit === "contain"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  galleryPosition: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Gap</Label>
            <Select
              value={sectionConfigEdit.gap || "normal"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  gap: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">
                  Compact
                </SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="spacious">
                  Spacious
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Section surface</Label>
            <Select
              value={
                sectionConfigEdit.gallerySectionSurface ||
                "transparent"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  gallerySectionSurface: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transparent">
                  Transparent
                </SelectItem>
                <SelectItem value="soft">
                  Soft surface
                </SelectItem>
                <SelectItem value="card">
                  Card surface
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Section padding</Label>
            <Select
              value={
                sectionConfigEdit.gallerySectionPadding ||
                "normal"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  gallerySectionPadding: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="compact">
                  Compact
                </SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="spacious">
                  Spacious
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {blockInspectorTab === "style" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Style
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Image fit</Label>

              {sectionConfigEdit.galleryLayout ===
                "masonry" && (
                <span className="text-[10px] text-muted-foreground">
                  Natural size in Masonry
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.galleryFit || "cover"}
              disabled={
                sectionConfigEdit.galleryLayout === "masonry"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  galleryFit: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">
                  Contain
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Frame style</Label>
            <Select
              value={
                sectionConfigEdit.galleryCardStyle || "clean"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  galleryCardStyle: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clean">Clean</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="outline">
                  Outline
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">
              Image corner radius
            </Label>
            <Select
              value={
                sectionConfigEdit.galleryImageRadius || "md"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  galleryImageRadius: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
                <SelectItem value="full">
                  Very round
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">
                Frame corner radius
              </Label>
              {sectionConfigEdit.galleryCardStyle ===
                "clean" && (
                <span className="text-[10px] text-muted-foreground">
                  Used by Card / Outline
                </span>
              )}
            </div>

            <Select
              value={
                sectionConfigEdit.galleryFrameRadius || "lg"
              }
              disabled={
                sectionConfigEdit.galleryCardStyle === "clean"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  galleryFrameRadius: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
                <SelectItem value="full">
                  Very round
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Image border</Label>
            <Select
              value={
                sectionConfigEdit.galleryImageBorder || "none"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  galleryImageBorder: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="subtle">Subtle</SelectItem>
                <SelectItem value="accent">Accent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-3 text-xs">
            <Checkbox
              checked={
                sectionConfigEdit.showGalleryCaptions ===
                "true"
              }
              onCheckedChange={(checked) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  showGalleryCaptions: checked
                    ? "true"
                    : "false",
                }))
              }
            />
            Show captions from alt text
          </label>

          {sectionConfigEdit.showGalleryCaptions ===
            "true" && (
            <div className="space-y-2">
              <Label className="text-xs">Caption style</Label>
              <Select
                value={
                  sectionConfigEdit.galleryCaptionStyle ||
                  "below"
                }
                onValueChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    galleryCaptionStyle: value,
                  }))
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="below">
                    Below image
                  </SelectItem>
                  <SelectItem value="overlay">
                    Overlay
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {sectionConfigEdit.showGalleryCaptions ===
            "true" && (
            <div className="space-y-2">
              <Label className="text-xs">
                Caption alignment
              </Label>
              <Select
                value={
                  sectionConfigEdit.galleryCaptionAlign ||
                  "left"
                }
                onValueChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    galleryCaptionAlign: value,
                  }))
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">
                    Center
                  </SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Click behavior</Label>
            <Select
              value={
                sectionConfigEdit.galleryClickBehavior ||
                "none"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  galleryClickBehavior: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  No action
                </SelectItem>
                <SelectItem value="open">
                  Open full image
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {blockInspectorTab === "motion" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Motion
          </p>

          <div className="space-y-2">
            <Label className="text-xs">
              Image hover motion
            </Label>
            <Select
              value={
                sectionConfigEdit.galleryHoverMotion ||
                "scale"
              }
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  galleryHoverMotion: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
                <SelectItem value="lift">Lift</SelectItem>
                <SelectItem value="glow">Glow</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
