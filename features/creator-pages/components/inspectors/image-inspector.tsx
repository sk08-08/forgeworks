"use client";

import { useState } from "react";

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
import { CreatorNumberControl } from "@/features/creator-pages/components/shared/creator-number-control";
import { normalizeCreatorPageHttpUrl } from "@/features/creator-pages/lib/creator-page-links";
import { MediaPicker } from "@/features/media/components/media-picker";
import { cn } from "@/lib/utils";

import type { CreatorInspectorBaseProps } from "@/features/creator-pages/types/creator-page-types";

export function ImageInspector({
  blockInspectorTab,
  setBlockInspectorTab,
  sectionConfigEdit,
  setSectionConfigEdit,
}: CreatorInspectorBaseProps) {
  type LayoutViewport = "desktop" | "tablet" | "mobile";

  interface StickerLayoutValues {
    positionMode: string;
    size: string;
    alignment: string;
    useCustomWidth: string;
    width: string;
    anchor: string;
    posX: string;
    posY: string;
    zIndex: string;
  }

  const [layoutViewport, setLayoutViewport] =
    useState<LayoutViewport>("desktop");

  const desktopLayout: StickerLayoutValues = {
    positionMode: sectionConfigEdit.positionMode || "static",
    size: sectionConfigEdit.size || "medium",
    alignment: sectionConfigEdit.alignment || "center",
    useCustomWidth: sectionConfigEdit.stickerUseCustomWidth || "false",
    width: sectionConfigEdit.stickerWidth || "256",
    anchor: sectionConfigEdit.stickerAnchor || "left",
    posX: sectionConfigEdit.posX || "0px",
    posY: sectionConfigEdit.posY || "0px",
    zIndex: sectionConfigEdit.zIndex || "10",
  };

  const tabletOverride = sectionConfigEdit.stickerTabletOverride === "true";
  const tabletLayout: StickerLayoutValues = tabletOverride
    ? {
        positionMode:
          sectionConfigEdit.stickerTabletPositionMode ||
          desktopLayout.positionMode,
        size: sectionConfigEdit.stickerTabletSize || desktopLayout.size,
        alignment:
          sectionConfigEdit.stickerTabletAlignment || desktopLayout.alignment,
        useCustomWidth:
          sectionConfigEdit.stickerTabletUseCustomWidth ||
          desktopLayout.useCustomWidth,
        width: sectionConfigEdit.stickerTabletWidth || desktopLayout.width,
        anchor: sectionConfigEdit.stickerTabletAnchor || desktopLayout.anchor,
        posX: sectionConfigEdit.stickerTabletPosX || desktopLayout.posX,
        posY: sectionConfigEdit.stickerTabletPosY || desktopLayout.posY,
        zIndex: sectionConfigEdit.stickerTabletZIndex || desktopLayout.zIndex,
      }
    : desktopLayout;

  const mobileOverride = sectionConfigEdit.stickerMobileOverride === "true";
  const mobileLayout: StickerLayoutValues = mobileOverride
    ? {
        positionMode:
          sectionConfigEdit.stickerMobilePositionMode ||
          tabletLayout.positionMode,
        size: sectionConfigEdit.stickerMobileSize || tabletLayout.size,
        alignment:
          sectionConfigEdit.stickerMobileAlignment || tabletLayout.alignment,
        useCustomWidth:
          sectionConfigEdit.stickerMobileUseCustomWidth ||
          tabletLayout.useCustomWidth,
        width: sectionConfigEdit.stickerMobileWidth || tabletLayout.width,
        anchor: sectionConfigEdit.stickerMobileAnchor || tabletLayout.anchor,
        posX: sectionConfigEdit.stickerMobilePosX || tabletLayout.posX,
        posY: sectionConfigEdit.stickerMobilePosY || tabletLayout.posY,
        zIndex: sectionConfigEdit.stickerMobileZIndex || tabletLayout.zIndex,
      }
    : tabletLayout;

  const activeLayout =
    layoutViewport === "desktop"
      ? desktopLayout
      : layoutViewport === "tablet"
        ? tabletLayout
        : mobileLayout;

  const activeOverrideEnabled =
    layoutViewport === "desktop"
      ? true
      : layoutViewport === "tablet"
        ? tabletOverride
        : mobileOverride;

  const keyFor = (desktopKey: string, tabletKey: string, mobileKey: string) =>
    layoutViewport === "desktop"
      ? desktopKey
      : layoutViewport === "tablet"
        ? tabletKey
        : mobileKey;

  const updateActiveLayout = (key: string, value: string) => {
    setSectionConfigEdit((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const setResponsiveOverride = (
    viewport: Exclude<LayoutViewport, "desktop">,
    enabled: boolean,
  ) => {
    const source = viewport === "tablet" ? desktopLayout : tabletLayout;
    const prefix = viewport === "tablet" ? "stickerTablet" : "stickerMobile";

    setSectionConfigEdit((current) => ({
      ...current,
      [`${prefix}Override`]: enabled ? "true" : "false",
      ...(enabled
        ? {
            [`${prefix}PositionMode`]: source.positionMode,
            [`${prefix}Size`]: source.size,
            [`${prefix}Alignment`]: source.alignment,
            [`${prefix}UseCustomWidth`]: source.useCustomWidth,
            [`${prefix}Width`]: source.width,
            [`${prefix}Anchor`]: source.anchor,
            [`${prefix}PosX`]: source.posX,
            [`${prefix}PosY`]: source.posY,
            [`${prefix}ZIndex`]: source.zIndex,
          }
        : {}),
    }));
  };

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
            <MediaPicker
                  label="Choose / upload from My Media"
                  selectedUrls={sectionConfigEdit.imageUrl ? [sectionConfigEdit.imageUrl] : []}
                  onSelect={(images) => {
                    if (!images[0]) return;
                    setSectionConfigEdit((current) => ({ ...current, imageUrl: images[0].url }));
                  }}
                />
                <Label className="text-xs">Image URL</Label>
            <Input
              value={sectionConfigEdit.imageUrl || ""}
              onChange={(event) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  imageUrl: event.target.value,
                }))
              }
              onBlur={() => {
                const result = normalizeCreatorPageHttpUrl(
                  sectionConfigEdit.imageUrl || "",
                  { label: "image URL" },
                );

                if (result.valid && result.href !== null) {
                  setSectionConfigEdit((current) => ({
                    ...current,
                    imageUrl: result.href!,
                  }));
                }
              }}
              placeholder="example.com/image.png"
              className={cn(
                "h-9",
                sectionConfigEdit.imageUrl?.trim() &&
                  !normalizeCreatorPageHttpUrl(sectionConfigEdit.imageUrl, {
                    label: "image URL",
                  }).valid &&
                  "border-destructive/55",
              )}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Alt text</Label>
            <Input
              value={sectionConfigEdit.alt || ""}
              onChange={(event) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  alt: event.target.value,
                }))
              }
              placeholder="Describe the image"
              className="h-9"
            />
          </div>
        </div>
      )}

      {blockInspectorTab === "layout" && (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Responsive layout
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Desktop is the base layout. Tablet and Mobile inherit the previous
              view until you enable a custom layout for that viewport.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1">
            {(
              [
                ["desktop", "Desktop"],
                ["tablet", "Tablet"],
                ["mobile", "Mobile"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 cursor-pointer rounded-lg px-2 text-[11px]",
                  layoutViewport === value && "bg-background shadow-sm",
                )}
                onClick={() => setLayoutViewport(value)}
              >
                {label}
              </Button>
            ))}
          </div>

          {layoutViewport !== "desktop" && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-3">
              <Checkbox
                className="mt-0.5"
                checked={activeOverrideEnabled}
                onCheckedChange={(checked) =>
                  setResponsiveOverride(layoutViewport, checked === true)
                }
              />

              <span className="min-w-0">
                <span className="block text-xs font-medium">
                  Custom {layoutViewport === "tablet" ? "tablet" : "mobile"}{" "}
                  layout
                </span>
                <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">
                  {activeOverrideEnabled
                    ? "This viewport has its own position and size settings."
                    : `Currently inheriting ${
                        layoutViewport === "tablet" ? "Desktop" : "Tablet"
                      }.`}
                </span>
              </span>
            </label>
          )}

          {activeOverrideEnabled ? (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Position mode</Label>

                <Select
                  value={activeLayout.positionMode}
                  onValueChange={(value) => {
                    const positionKey = keyFor(
                      "positionMode",
                      "stickerTabletPositionMode",
                      "stickerMobilePositionMode",
                    );
                    const sizeKey = keyFor(
                      "size",
                      "stickerTabletSize",
                      "stickerMobileSize",
                    );

                    setSectionConfigEdit((current) => ({
                      ...current,
                      [positionKey]: value,
                      [sizeKey]:
                        value === "absolute" &&
                        activeLayout.useCustomWidth !== "true" &&
                        activeLayout.size === "full"
                          ? "medium"
                          : activeLayout.size,
                    }));
                  }}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">In page flow</SelectItem>
                    <SelectItem value="absolute">Free position</SelectItem>
                  </SelectContent>
                </Select>

                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  In page flow behaves like a normal responsive block. Free
                  position lets this viewport place the image decoratively over
                  nearby blocks.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Size</Label>
                  {activeLayout.useCustomWidth === "true" && (
                    <span className="text-[10px] text-muted-foreground">
                      Overridden by custom width
                    </span>
                  )}
                </div>

                <Select
                  value={activeLayout.size}
                  disabled={activeLayout.useCustomWidth === "true"}
                  onValueChange={(value) =>
                    updateActiveLayout(
                      keyFor("size", "stickerTabletSize", "stickerMobileSize"),
                      value,
                    )
                  }
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="small">Small · 128px</SelectItem>
                    <SelectItem value="medium">Medium · 256px</SelectItem>
                    <SelectItem value="large">Large · 384px</SelectItem>
                    <SelectItem
                      value="full"
                      disabled={activeLayout.positionMode === "absolute"}
                    >
                      Full width
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-3 text-xs">
                <Checkbox
                  checked={activeLayout.useCustomWidth === "true"}
                  onCheckedChange={(checked) =>
                    updateActiveLayout(
                      keyFor(
                        "stickerUseCustomWidth",
                        "stickerTabletUseCustomWidth",
                        "stickerMobileUseCustomWidth",
                      ),
                      checked === true ? "true" : "false",
                    )
                  }
                />
                Custom width
              </label>

              {activeLayout.useCustomWidth === "true" && (
                <CreatorNumberControl
                  label="Width"
                  value={activeLayout.width}
                  min={48}
                  max={1200}
                  step={16}
                  fallback={256}
                  suffix="px"
                  presets={[128, 192, 256, 384, 512]}
                  onChange={(value) =>
                    updateActiveLayout(
                      keyFor(
                        "stickerWidth",
                        "stickerTabletWidth",
                        "stickerMobileWidth",
                      ),
                      value,
                    )
                  }
                />
              )}

              {activeLayout.positionMode === "static" ? (
                <div className="space-y-2">
                  <Label className="text-xs">Alignment</Label>
                  <Select
                    value={activeLayout.alignment}
                    onValueChange={(value) =>
                      updateActiveLayout(
                        keyFor(
                          "alignment",
                          "stickerTabletAlignment",
                          "stickerMobileAlignment",
                        ),
                        value,
                      )
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
              ) : (
                <div className="space-y-4 rounded-xl border border-border/60 p-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Horizontal anchor</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["left", "center", "right"] as const).map((anchor) => (
                        <Button
                          key={anchor}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-9 cursor-pointer capitalize",
                            activeLayout.anchor === anchor &&
                              "border-primary bg-primary/10 text-primary",
                          )}
                          onClick={() =>
                            updateActiveLayout(
                              keyFor(
                                "stickerAnchor",
                                "stickerTabletAnchor",
                                "stickerMobileAnchor",
                              ),
                              anchor,
                            )
                          }
                        >
                          {anchor}
                        </Button>
                      ))}
                    </div>

                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      Left and Right use X as an inset from that edge. Center
                      keeps the image centered and uses X as an extra offset.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Offset X</Label>
                      <Input
                        value={activeLayout.posX}
                        onChange={(event) =>
                          updateActiveLayout(
                            keyFor(
                              "posX",
                              "stickerTabletPosX",
                              "stickerMobilePosX",
                            ),
                            event.target.value,
                          )
                        }
                        placeholder="0px / 5%"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Offset Y</Label>
                      <Input
                        value={activeLayout.posY}
                        onChange={(event) =>
                          updateActiveLayout(
                            keyFor(
                              "posY",
                              "stickerTabletPosY",
                              "stickerMobilePosY",
                            ),
                            event.target.value,
                          )
                        }
                        placeholder="0px / -25%"
                        className="h-9"
                      />
                    </div>
                  </div>

                  <CreatorNumberControl
                    label="Layer"
                    value={activeLayout.zIndex}
                    min={0}
                    max={100}
                    step={1}
                    fallback={10}
                    presets={[0, 10, 25, 50]}
                    onChange={(value) =>
                      updateActiveLayout(
                        keyFor(
                          "zIndex",
                          "stickerTabletZIndex",
                          "stickerMobileZIndex",
                        ),
                        value,
                      )
                    }
                  />
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 p-4 text-center">
              <p className="text-xs font-medium">
                Inheriting {layoutViewport === "tablet" ? "Desktop" : "Tablet"}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                Enable a custom layout above only when this viewport needs to
                behave differently.
              </p>
            </div>
          )}
        </div>
      )}

      {blockInspectorTab === "style" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Style
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Corner radius</Label>
            <Select
              value={sectionConfigEdit.rounded || "md"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  rounded: value,
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
                <SelectItem value="full">Circle / pill</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Shadow</Label>
            <Select
              value={sectionConfigEdit.stickerShadow || "soft"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  stickerShadow: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="soft">Soft</SelectItem>
                <SelectItem value="strong">Strong</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Border</Label>
            <Select
              value={sectionConfigEdit.stickerBorderStyle || "none"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  stickerBorderStyle: value,
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
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sectionConfigEdit.stickerBorderStyle !== "none" && (
            <CreatorNumberControl
              label="Border width"
              value={sectionConfigEdit.stickerBorderWidth || "1"}
              min={1}
              max={12}
              step={1}
              fallback={1}
              suffix="px"
              presets={[1, 2, 4, 8]}
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  stickerBorderWidth: value,
                }))
              }
            />
          )}

          {sectionConfigEdit.stickerBorderStyle === "custom" && (
            <CustomColorPicker
              label="Border color"
              value={sectionConfigEdit.stickerBorderColor || ""}
              allowEmpty
              emptyLabel="Theme default"
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  stickerBorderColor: value,
                }))
              }
            />
          )}

          <CreatorNumberControl
            label="Opacity"
            value={sectionConfigEdit.opacity || "100"}
            min={0}
            max={100}
            step={5}
            fallback={100}
            suffix="%"
            presets={[25, 50, 75, 100]}
            onChange={(value) =>
              setSectionConfigEdit((current) => ({
                ...current,
                opacity: value,
              }))
            }
          />
        </div>
      )}

      {blockInspectorTab === "motion" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Motion
          </p>

          <CreatorNumberControl
            label="Rotation"
            value={sectionConfigEdit.rotation || "0"}
            min={-180}
            max={180}
            step={5}
            fallback={0}
            suffix="°"
            presets={[-15, 0, 15, 45]}
            onChange={(value) =>
              setSectionConfigEdit((current) => ({
                ...current,
                rotation: value,
              }))
            }
          />

          <div className="space-y-2">
            <Label className="text-xs">Entrance animation</Label>
            <Select
              value={sectionConfigEdit.stickerEntranceAnimation || "none"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  stickerEntranceAnimation: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fade">Fade</SelectItem>
                <SelectItem value="pop">Pop</SelectItem>
                <SelectItem value="slide-up">Slide up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sectionConfigEdit.stickerEntranceAnimation !== "none" && (
            <div className="grid gap-4">
              <CreatorNumberControl
                label="Duration"
                value={sectionConfigEdit.stickerMotionDuration || "500"}
                min={150}
                max={2500}
                step={50}
                fallback={500}
                suffix="ms"
                presets={[300, 500, 800, 1200]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    stickerMotionDuration: value,
                  }))
                }
              />

              <CreatorNumberControl
                label="Delay"
                value={sectionConfigEdit.stickerMotionDelay || "0"}
                min={0}
                max={2500}
                step={50}
                fallback={0}
                suffix="ms"
                presets={[0, 100, 250, 500]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    stickerMotionDelay: value,
                  }))
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Hover motion</Label>
            <Select
              value={sectionConfigEdit.stickerHoverMotion || "none"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  stickerHoverMotion: value,
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
                <SelectItem value="wiggle">Wiggle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
