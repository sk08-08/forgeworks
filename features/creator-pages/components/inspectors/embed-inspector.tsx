"use client";

import { Button } from "@/components/ui/button";
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
import {
  creatorEmbedPlaceholder,
  normalizeCreatorEmbedSource,
  type CreatorEmbedProvider,
} from "@/features/creator-pages/lib/creator-page-embeds";
import { MarkdownField } from "@/features/markdown/components/markdown-field";
import { cn } from "@/lib/utils";

import type { CreatorInspectorBaseProps } from "@/features/creator-pages/types/creator-page-types";

export function EmbedInspector({
  blockInspectorTab,
  setBlockInspectorTab,
  sectionConfigEdit,
  setSectionConfigEdit,
}: CreatorInspectorBaseProps) {
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
              value={sectionConfigEdit.embedHeading || ""}
              onChange={(event) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  embedHeading: event.target.value,
                }))
              }
              placeholder="Watch / Listen"
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Caption</Label>
            <MarkdownField
              value={sectionConfigEdit.embedCaption || ""}
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  embedCaption: value,
                }))
              }
              placeholder="Optional context for this embed..."
              minEditorHeightRem={5}
              className="min-h-[6rem]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Provider</Label>
            <Select
              value={sectionConfigEdit.embedType || "youtube"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  embedType: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="vimeo">Vimeo</SelectItem>
                <SelectItem value="spotify">Spotify</SelectItem>
                <SelectItem value="twitch">Twitch</SelectItem>
                <SelectItem value="custom">Custom embed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(() => {
            const provider = (sectionConfigEdit.embedType ||
              "youtube") as CreatorEmbedProvider;
            const rawUrl = sectionConfigEdit.embedUrl || "";
            const validation = rawUrl.trim()
              ? normalizeCreatorEmbedSource({
                  provider,
                  url: rawUrl,
                  twitchParent: "localhost",
                })
              : null;

            return (
              <div className="space-y-2">
                <Label className="text-xs">Embed URL</Label>
                <Input
                  value={rawUrl}
                  onChange={(event) =>
                    setSectionConfigEdit((current) => ({
                      ...current,
                      embedUrl: event.target.value,
                    }))
                  }
                  onBlur={() => {
                    if (!rawUrl.trim()) return;

                    const normalized = normalizeCreatorEmbedSource({
                      provider,
                      url: rawUrl,
                      twitchParent: "localhost",
                    });

                    if (normalized.valid && normalized.normalizedUrl) {
                      setSectionConfigEdit((current) => ({
                        ...current,
                        embedUrl: normalized.normalizedUrl || "",
                      }));
                    }
                  }}
                  placeholder={creatorEmbedPlaceholder(provider)}
                  className={cn(
                    "h-9",
                    validation && !validation.valid && "border-destructive/55",
                  )}
                />

                {validation && (
                  <p
                    className={cn(
                      "text-[10px] leading-relaxed",
                      validation.valid
                        ? "text-muted-foreground"
                        : "text-destructive",
                    )}
                  >
                    {validation.message}
                  </p>
                )}

                {provider === "custom" && (
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Custom embeds run inside a restricted sandbox. Some sites
                    block iframe embedding and may refuse to display.
                  </p>
                )}

                {provider === "twitch" && (
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Twitch requires the current Forgeworks hostname as an embed
                    parent. This is added automatically on the public page.
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {blockInspectorTab === "layout" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Layout
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Width</Label>
            <Select
              value={sectionConfigEdit.embedWidth || "wide"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  embedWidth: value,
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
                <SelectItem value="full">Full width</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Alignment</Label>

              {sectionConfigEdit.embedWidth === "full" && (
                <span className="text-[10px] text-muted-foreground">
                  Full width fills the section
                </span>
              )}
            </div>

            <Select
              value={sectionConfigEdit.embedAlignment || "center"}
              disabled={sectionConfigEdit.embedWidth === "full"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  embedAlignment: value,
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

          {sectionConfigEdit.embedType === "spotify" ? (
            <div className="space-y-2">
              <Label className="text-xs">Player size</Label>
              <Select
                value={sectionConfigEdit.spotifySize || "standard"}
                onValueChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    spotifySize: value,
                  }))
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Aspect ratio</Label>
                <Select
                  value={sectionConfigEdit.embedAspectRatio || "16:9"}
                  onValueChange={(value) =>
                    setSectionConfigEdit((current) => ({
                      ...current,
                      embedAspectRatio: value,
                    }))
                  }
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="1:1">1:1</SelectItem>
                    <SelectItem value="9:16">9:16</SelectItem>
                    <SelectItem value="custom">Custom height</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {sectionConfigEdit.embedAspectRatio === "custom" && (
                <CreatorNumberControl
                  label="Height"
                  value={sectionConfigEdit.embedHeight || "400"}
                  min={120}
                  max={1200}
                  step={10}
                  fallback={400}
                  suffix="px"
                  presets={[240, 400, 560, 720]}
                  onChange={(value) =>
                    setSectionConfigEdit((current) => ({
                      ...current,
                      embedHeight: value,
                    }))
                  }
                />
              )}
            </>
          )}
        </div>
      )}

      {blockInspectorTab === "style" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Style
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Surface</Label>
            <Select
              value={sectionConfigEdit.embedSurface || "none"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  embedSurface: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="soft">Soft</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Corner radius</Label>
            <Select
              value={sectionConfigEdit.embedRadius || "large"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  embedRadius: value,
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

          <div className="space-y-2">
            <Label className="text-xs">Border</Label>
            <Select
              value={sectionConfigEdit.embedBorder || "subtle"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  embedBorder: value,
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

          <div className="space-y-2">
            <Label className="text-xs">Shadow</Label>
            <Select
              value={sectionConfigEdit.embedShadow || "none"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  embedShadow: value,
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
        </div>
      )}

      {blockInspectorTab === "motion" && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Motion
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Hover motion</Label>
            <Select
              value={sectionConfigEdit.embedHoverMotion || "none"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  embedHoverMotion: value,
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

          <div className="space-y-2">
            <Label className="text-xs">Entrance animation</Label>
            <Select
              value={sectionConfigEdit.embedEntranceAnimation || "none"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  embedEntranceAnimation: value,
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

          {sectionConfigEdit.embedEntranceAnimation !== "none" && (
            <div className="grid gap-4">
              <CreatorNumberControl
                label="Duration"
                value={sectionConfigEdit.embedMotionDuration || "550"}
                min={150}
                max={2500}
                step={50}
                fallback={550}
                suffix="ms"
                presets={[350, 550, 800, 1200]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    embedMotionDuration: value,
                  }))
                }
              />

              <CreatorNumberControl
                label="Delay"
                value={sectionConfigEdit.embedMotionDelay || "0"}
                min={0}
                max={2500}
                step={50}
                fallback={0}
                suffix="ms"
                presets={[0, 100, 250, 500]}
                onChange={(value) =>
                  setSectionConfigEdit((current) => ({
                    ...current,
                    embedMotionDelay: value,
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
