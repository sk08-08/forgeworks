"use client";

import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreatorNumberControl } from "@/features/creator-pages/components/shared/creator-number-control";
import { MarkdownField } from "@/features/markdown/components/markdown-field";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";
import { cn } from "@/lib/utils";

import type {
  CreatorInspectorBaseProps,
  CreatorLorebookInspectorItem,
  CreatorWorldInspectorItem,
} from "@/features/creator-pages/types/creator-page-types";

interface LorebookInspectorProps extends CreatorInspectorBaseProps {
  availableLorebooks: CreatorLorebookInspectorItem[];
  availableWorlds: CreatorWorldInspectorItem[];
  editingSelectedLorebookIds: string[];
  setEditingSelectedLorebookIds: Dispatch<SetStateAction<string[]>>;
}

export function LorebookInspector({
  blockInspectorTab,
  setBlockInspectorTab,
  sectionConfigEdit,
  setSectionConfigEdit,
  availableLorebooks,
  availableWorlds,
  editingSelectedLorebookIds,
  setEditingSelectedLorebookIds,
}: LorebookInspectorProps) {
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
            <Label className="text-xs">Description</Label>
            <MarkdownField
              value={sectionConfigEdit.description || ""}
              onChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  description: value,
                }))
              }
              placeholder="Introduce these lorebooks..."
              minEditorHeightRem={5}
              className="min-h-[6rem]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Lorebooks</Label>
              <span className="text-[10px] text-muted-foreground">
                {editingSelectedLorebookIds.length === 0
                  ? "All"
                  : `${editingSelectedLorebookIds.length} selected`}
              </span>
            </div>

            {availableLorebooks.length > 0 ? (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {availableLorebooks.map((lorebook) => {
                  const checked = editingSelectedLorebookIds.includes(
                    lorebook.id,
                  );

                  return (
                    <label
                      key={lorebook.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/30"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          setEditingSelectedLorebookIds((current) =>
                            value
                              ? [...current, lorebook.id]
                              : current.filter((id) => id !== lorebook.id),
                          )
                        }
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {lorebook.title}
                        </p>

                        {lorebook.summary && (
                          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                            {stripMarkdownToText(lorebook.summary)}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
                No lorebooks available.
              </div>
            )}

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Leave everything unselected to show all lorebooks automatically.
            </p>
          </div>
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
              value={sectionConfigEdit.lorebookLayout || "grid"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  lorebookLayout: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="carousel">Horizontal carousel</SelectItem>
                <SelectItem value="compact">Compact list</SelectItem>
                <SelectItem value="editorial">Editorial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Columns</Label>
              {sectionConfigEdit.lorebookLayout !== "grid" && (
                <span className="text-[10px] text-muted-foreground">
                  Grid only
                </span>
              )}
            </div>
            <Select
              value={sectionConfigEdit.lorebookColumns || "3"}
              disabled={sectionConfigEdit.lorebookLayout !== "grid"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  lorebookColumns: value,
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
            <Label className="text-xs">Gap</Label>
            <Select
              value={sectionConfigEdit.lorebookGap || "normal"}
              onValueChange={(value) =>
                setSectionConfigEdit((current) => ({
                  ...current,
                  lorebookGap: value,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tight">Tight</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="relaxed">Relaxed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {blockInspectorTab === "style" &&
        (() => {
          const fixedLayout = ["compact", "editorial"].includes(
            sectionConfigEdit.lorebookLayout || "grid",
          );
          return (
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Style
              </p>

              {[
                [
                  "Card style",
                  "lorebookCardStyle",
                  ["card", "soft", "outline", "minimal"],
                ],
                [
                  "Corner radius",
                  "lorebookCardRadius",
                  ["none", "small", "medium", "large"],
                ],
                [
                  "Text alignment",
                  "lorebookTextAlign",
                  ["left", "center", "right"],
                ],
              ].map(([label, key, values]) => (
                <div className="space-y-2" key={key as string}>
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">{label as string}</Label>
                    {fixedLayout && (
                      <span className="text-[10px] text-muted-foreground">
                        Fixed by this layout
                      </span>
                    )}
                  </div>
                  <Select
                    value={
                      sectionConfigEdit[key as string] ||
                      String((values as string[])[0])
                    }
                    disabled={fixedLayout}
                    onValueChange={(value) =>
                      setSectionConfigEdit((current) => ({
                        ...current,
                        [key as string]: value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(values as string[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {value.charAt(0).toUpperCase() + value.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 p-3 text-xs">
                <Checkbox
                  checked={sectionConfigEdit.showLorebookSummary !== "false"}
                  onCheckedChange={(checked) =>
                    setSectionConfigEdit((current) => ({
                      ...current,
                      showLorebookSummary: checked ? "true" : "false",
                    }))
                  }
                />
                Show summary
              </label>
            </div>
          );
        })()}

      {blockInspectorTab === "motion" &&
        (() => {
          const fixedLayout = ["compact", "editorial"].includes(
            sectionConfigEdit.lorebookLayout || "grid",
          );
          return (
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Motion
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Hover motion</Label>
                  {fixedLayout && (
                    <span className="text-[10px] text-muted-foreground">
                      Fixed by this layout
                    </span>
                  )}
                </div>
                <Select
                  value={sectionConfigEdit.lorebookHoverMotion || "lift"}
                  disabled={fixedLayout}
                  onValueChange={(value) =>
                    setSectionConfigEdit((current) => ({
                      ...current,
                      lorebookHoverMotion: value,
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
                  value={sectionConfigEdit.lorebookEntranceAnimation || "none"}
                  onValueChange={(value) =>
                    setSectionConfigEdit((current) => ({
                      ...current,
                      lorebookEntranceAnimation: value,
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

              {sectionConfigEdit.lorebookEntranceAnimation !== "none" && (
                <div className="grid gap-4">
                  <CreatorNumberControl
                    label="Duration"
                    value={sectionConfigEdit.lorebookMotionDuration || "500"}
                    min={150}
                    max={2500}
                    step={50}
                    fallback={500}
                    suffix="ms"
                    presets={[300, 500, 800, 1200]}
                    onChange={(value) =>
                      setSectionConfigEdit((current) => ({
                        ...current,
                        lorebookMotionDuration: value,
                      }))
                    }
                  />
                  <CreatorNumberControl
                    label="Delay"
                    value={sectionConfigEdit.lorebookMotionDelay || "0"}
                    min={0}
                    max={2500}
                    step={50}
                    fallback={0}
                    suffix="ms"
                    presets={[0, 100, 250, 500]}
                    onChange={(value) =>
                      setSectionConfigEdit((current) => ({
                        ...current,
                        lorebookMotionDelay: value,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}
