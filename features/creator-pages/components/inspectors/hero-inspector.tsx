"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { normalizeCreatorPageHttpUrl } from "@/features/creator-pages/lib/creator-page-links";
import { MediaPicker } from "@/features/media/components/media-picker";
import { cn } from "@/lib/utils";

import type {
  CreatorInspectorAnchorOption,
  CreatorInspectorBaseProps,
} from "@/features/creator-pages/types/creator-page-types";

interface HeroInspectorProps extends CreatorInspectorBaseProps {
  anchorOptions: CreatorInspectorAnchorOption[];
}

export function HeroInspector({
  blockInspectorTab,
  setBlockInspectorTab,
  sectionConfigEdit,
  setSectionConfigEdit,
  anchorOptions,
}: HeroInspectorProps) {
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
              blockInspectorTab === value && "bg-background shadow-sm",
            )}
            onClick={() => setBlockInspectorTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {blockInspectorTab === "content" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Content
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Headline</Label>
            <Input
              value={sectionConfigEdit.headline || ""}
              onChange={(event) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  headline: event.target.value,
                }))
              }
              placeholder="Welcome to my page"
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Subheadline</Label>
            <Input
              value={sectionConfigEdit.subheadline || ""}
              onChange={(event) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  subheadline: event.target.value,
                }))
              }
              placeholder="A short description"
              className="h-9"
            />
          </div>

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

          <div className="space-y-2">
            <Label className="text-xs">Horizontal alignment</Label>
            <Select
              value={sectionConfigEdit.alignment || "center"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  alignment: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Vertical alignment</Label>
            <Select
              value={sectionConfigEdit.verticalAlignment || "center"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  verticalAlignment: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Hero height</Label>
            <Select
              value={sectionConfigEdit.height || "tall"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  height: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="tall">Tall</SelectItem>
                <SelectItem value="fullscreen">Fullscreen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Content width</Label>
            <Select
              value={sectionConfigEdit.contentWidth || "medium"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  contentWidth: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="narrow">Narrow</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="wide">Wide</SelectItem>
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

          {sectionConfigEdit.backgroundType === "image" && (
            <>
              <div className="space-y-2">
                <MediaPicker
                  label="Choose / upload from My Media"
                  selectedUrls={sectionConfigEdit.heroImage ? [sectionConfigEdit.heroImage] : []}
                  onSelect={(images) => {
                    if (!images[0]) return;
                    setSectionConfigEdit((current) => ({ ...current, heroImage: images[0].url }));
                  }}
                />
                <Label className="text-xs">Background image URL</Label>
                <Input
                  value={sectionConfigEdit.heroImage || ""}
                  onChange={(event) =>
                    setSectionConfigEdit((current) => ({
                      ...current,
                      heroImage: event.target.value,
                    }))
                  }
                  onBlur={() => {
                    const result = normalizeCreatorPageHttpUrl(
                      sectionConfigEdit.heroImage || "",
                      { label: "hero image" },
                    );

                    if (result.valid && result.href !== null) {
                      setSectionConfigEdit((current) => ({
                        ...current,
                        heroImage: result.href!,
                      }));
                    }
                  }}
                  placeholder="example.com/image.jpg"
                  className={cn(
                    "h-9",
                    sectionConfigEdit.heroImage?.trim() &&
                      !normalizeCreatorPageHttpUrl(
                        sectionConfigEdit.heroImage,
                        { label: "hero image" },
                      ).valid &&
                      "border-destructive/55",
                  )}
                />
              </div>

              <div className="grid gap-4">
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
                  value={sectionConfigEdit.overlayOpacity || "45"}
                  min={0}
                  max={100}
                  step={5}
                  fallback={45}
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
            </>
          )}

          {(sectionConfigEdit.backgroundType === "gradient" ||
            sectionConfigEdit.backgroundType === "solid") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <CustomColorPicker
                label="Color 1"
                value={sectionConfigEdit.backgroundColor || "#7c3aed"}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    backgroundColor: value,
                  }))
                }
              />

              {sectionConfigEdit.backgroundType === "gradient" && (
                <CustomColorPicker
                  label="Color 2"
                  value={sectionConfigEdit.backgroundColor2 || "#111827"}
                  onChange={(value) =>
                    setSectionConfigEdit((current) => ({
                      ...current,
                      backgroundColor2: value,
                    }))
                  }
                />
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <CustomColorPicker
              label="Text color"
              value={sectionConfigEdit.textColor || ""}
              allowEmpty
              emptyLabel="Theme default"
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  textColor: value,
                }))
              }
            />

            <CustomColorPicker
              label="Subtext color"
              value={sectionConfigEdit.subtextColor || ""}
              allowEmpty
              emptyLabel="Theme default"
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  subtextColor: value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Corner radius</Label>
            <Select
              value={sectionConfigEdit.borderRadius || "large"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  borderRadius: value,
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
                <SelectItem value="pill">Pill</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-3 text-xs">
            <Checkbox
              checked={sectionConfigEdit.showSparkles !== "false"}
              onCheckedChange={(checked) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  showSparkles: checked ? "true" : "false",
                }))
              }
            />
            Show decorative icon
          </label>
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
              value={sectionConfigEdit.entranceAnimation || "none"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  entranceAnimation: value,
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
                <SelectItem value="blur">Blur reveal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sectionConfigEdit.entranceAnimation !== "none" && (
            <div className="grid gap-4">
              <CreatorNumberControl
                label="Duration"
                value={sectionConfigEdit.motionDuration || "600"}
                min={150}
                max={3000}
                step={50}
                fallback={600}
                suffix="ms"
                presets={[300, 600, 900, 1200]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    motionDuration: value,
                  }))
                }
              />

              <CreatorNumberControl
                label="Delay"
                value={sectionConfigEdit.motionDelay || "0"}
                min={0}
                max={3000}
                step={50}
                fallback={0}
                suffix="ms"
                presets={[0, 100, 250, 500]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    motionDelay: value,
                  }))
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Hover motion</Label>
            <Select
              value={sectionConfigEdit.hoverMotion || "none"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  hoverMotion: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="lift">Lift</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
                <SelectItem value="glow">Glow</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="rounded-xl border border-border/60 bg-muted/[0.12] p-3 text-[10px] leading-relaxed text-muted-foreground">
            Motion uses transform and opacity where possible and automatically
            respects reduced-motion preferences.
          </p>
        </div>
      )}
    </div>
  );
}
