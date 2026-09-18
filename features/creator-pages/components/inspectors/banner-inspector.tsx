"use client";

import { Button } from "@/components/ui/button";
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
import { CreatorLinkActionField } from "@/features/creator-pages/components/shared/creator-link-action-field";
import { CreatorNumberControl } from "@/features/creator-pages/components/shared/creator-number-control";
import { MarkdownField } from "@/features/markdown/components/markdown-field";
import { normalizeCreatorPageHttpUrl } from "@/features/creator-pages/lib/creator-page-links";
import { MediaPicker } from "@/features/media/components/media-picker";
import { cn } from "@/lib/utils";

import type {
  CreatorInspectorAnchorOption,
  CreatorInspectorBaseProps,
} from "@/features/creator-pages/types/creator-page-types";

interface BannerInspectorProps extends CreatorInspectorBaseProps {
  anchorOptions: CreatorInspectorAnchorOption[];
}

export function BannerInspector({
  blockInspectorTab,
  setBlockInspectorTab,
  sectionConfigEdit,
  setSectionConfigEdit,
  anchorOptions,
}: BannerInspectorProps) {
  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1 sm:grid-cols-4">
        {(["content", "layout", "style", "motion"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 cursor-pointer rounded-lg px-1.5 text-[11px] capitalize",
              blockInspectorTab === value && "bg-background shadow-sm",
            )}
            onClick={() => setBlockInspectorTab(value)}
          >
            {value}
          </Button>
        ))}
      </div>

      {blockInspectorTab === "content" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Content
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Heading</Label>
            <Input
              value={sectionConfigEdit.bannerTitle || ""}
              onChange={(event) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  bannerTitle: event.target.value,
                }))
              }
              placeholder="Welcome"
              className="h-9"
            />
          </div>

          <MarkdownField
            value={sectionConfigEdit.subtitle || ""}
            onChange={(value) =>
              setSectionConfigEdit((current) => ({
                ...current,
                subtitle: value,
              }))
            }
            placeholder="Add a short subtitle..."
            minEditorHeightRem={5}
            className="min-h-[6rem]"
          />

          <CreatorLinkActionField
            title="Primary button"
            label={sectionConfigEdit.ctaText || ""}
            href={sectionConfigEdit.ctaLink || ""}
            onLabelChange={(value) =>
              setSectionConfigEdit((current) => ({
                ...current,
                ctaText: value,
              }))
            }
            onHrefChange={(value) =>
              setSectionConfigEdit((current) => ({
                ...current,
                ctaLink: value,
              }))
            }
            labelPlaceholder="Explore"
            anchorOptions={anchorOptions}
          />

          <CreatorLinkActionField
            title="Secondary button"
            label={sectionConfigEdit.secondaryCtaText || ""}
            href={sectionConfigEdit.secondaryCtaLink || ""}
            onLabelChange={(value) =>
              setSectionConfigEdit((current) => ({
                ...current,
                secondaryCtaText: value,
              }))
            }
            onHrefChange={(value) =>
              setSectionConfigEdit((current) => ({
                ...current,
                secondaryCtaLink: value,
              }))
            }
            labelPlaceholder="Learn more"
            anchorOptions={anchorOptions}
          />
        </div>
      )}

      {blockInspectorTab === "layout" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Layout
          </p>

          {[
            ["Horizontal alignment", "alignment", ["left", "center", "right"]],
            [
              "Vertical alignment",
              "verticalAlignment",
              ["top", "center", "bottom"],
            ],
            ["Banner height", "bannerHeight", ["compact", "medium", "tall"]],
            [
              "Content width",
              "bannerContentWidth",
              ["narrow", "medium", "wide"],
            ],
          ].map(([label, key, values]) => (
            <div className="space-y-2" key={String(key)}>
              <Label className="text-xs">{String(label)}</Label>
              <Select
                value={sectionConfigEdit[String(key)] || String(values[1])}
                onValueChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    [String(key)]: value,
                  }))
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(values as string[]).map((value) => (
                    <SelectItem
                      value={value}
                      key={value}
                      className="capitalize"
                    >
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      {blockInspectorTab === "style" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Style
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Background type</Label>
            <Select
              value={sectionConfigEdit.backgroundType || "gradient"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  backgroundType: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gradient">Gradient</SelectItem>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="image">Image</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sectionConfigEdit.backgroundType !== "image" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <CustomColorPicker
                label={
                  sectionConfigEdit.backgroundType === "solid"
                    ? "Background color"
                    : "Color 1"
                }
                value={sectionConfigEdit.background || "#7c3aed"}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    background: value,
                  }))
                }
              />
              {sectionConfigEdit.backgroundType === "gradient" && (
                <CustomColorPicker
                  label="Color 2"
                  value={sectionConfigEdit.background2 || "#4c1d95"}
                  onChange={(value) =>
                    setSectionConfigEdit((current) => ({
                      ...current,
                      background2: value,
                    }))
                  }
                />
              )}
            </div>
          )}

          {sectionConfigEdit.backgroundType === "image" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <MediaPicker
                  label="Choose / upload from My Media"
                  selectedUrls={sectionConfigEdit.backgroundImage ? [sectionConfigEdit.backgroundImage] : []}
                  onSelect={(images) => {
                    if (!images[0]) return;
                    setSectionConfigEdit((current) => ({ ...current, backgroundImage: images[0].url }));
                  }}
                />
                <Label className="text-xs">Background image URL</Label>
                <Input
                  value={sectionConfigEdit.backgroundImage || ""}
                  onChange={(event) =>
                    setSectionConfigEdit((current) => ({
                      ...current,
                      backgroundImage: event.target.value,
                    }))
                  }
                  onBlur={() => {
                    const result = normalizeCreatorPageHttpUrl(
                      sectionConfigEdit.backgroundImage || "",
                      { label: "background image" },
                    );
                    if (result.valid && result.href !== null) {
                      setSectionConfigEdit((current) => ({
                        ...current,
                        backgroundImage: result.href!,
                      }));
                    }
                  }}
                  placeholder="example.com/image.jpg"
                  className={cn(
                    "h-9",
                    sectionConfigEdit.backgroundImage?.trim() &&
                      !normalizeCreatorPageHttpUrl(
                        sectionConfigEdit.backgroundImage,
                        { label: "background image" },
                      ).valid &&
                      "border-destructive/55",
                  )}
                />
              </div>

              <CustomColorPicker
                label="Overlay color"
                value={sectionConfigEdit.overlayColor || "#000000"}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    overlayColor: value,
                  }))
                }
              />

              <CreatorNumberControl
                label="Overlay opacity"
                value={sectionConfigEdit.overlayOpacity || "50"}
                min={0}
                max={100}
                step={5}
                fallback={50}
                suffix="%"
                presets={[0, 25, 50, 75]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    overlayOpacity: value,
                  }))
                }
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <CustomColorPicker
              label="Text color"
              value={sectionConfigEdit.bannerTextColor || ""}
              allowEmpty
              emptyLabel="Theme default"
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  bannerTextColor: value,
                }))
              }
            />
            <CustomColorPicker
              label="Subtext color"
              value={sectionConfigEdit.bannerSubtextColor || ""}
              allowEmpty
              emptyLabel="Theme default"
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  bannerSubtextColor: value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Corner radius</Label>
            <Select
              value={sectionConfigEdit.bannerRadius || "large"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  bannerRadius: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
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
            <Label className="text-xs">Entrance animation</Label>
            <Select
              value={sectionConfigEdit.bannerEntranceAnimation || "none"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  bannerEntranceAnimation: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fade">Fade</SelectItem>
                <SelectItem value="fade-up">Fade up</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sectionConfigEdit.bannerEntranceAnimation !== "none" && (
            <div className="grid gap-4">
              <CreatorNumberControl
                label="Duration"
                value={sectionConfigEdit.bannerMotionDuration || "500"}
                min={150}
                max={2500}
                step={50}
                fallback={500}
                suffix="ms"
                presets={[300, 500, 800, 1200]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    bannerMotionDuration: value,
                  }))
                }
              />
              <CreatorNumberControl
                label="Delay"
                value={sectionConfigEdit.bannerMotionDelay || "0"}
                min={0}
                max={2500}
                step={50}
                fallback={0}
                suffix="ms"
                presets={[0, 100, 250, 500]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    bannerMotionDelay: value,
                  }))
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
