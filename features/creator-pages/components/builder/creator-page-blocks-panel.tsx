"use client";

import type { DragEvent } from "react";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Blocks,
  Copy,
  ExternalLink,
  Globe,
  GripVertical,
  Image,
  Layout,
  LayoutGrid,
  Layers,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Plus,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getSectionDisplayTitle,
  sectionKindLabels,
} from "@/features/creator-pages/lib/creator-page-block-registry";

import {
  type CreatorBuilderPanel,
  type CreatorPageCanvasWidth,
  type CreatorPagePadding,
  type CreatorPageSectionGap,
  type PageSection,
  type SectionKind,
} from "@/features/creator-pages/types/creator-page-types";

const sectionKindIcons: Record<SectionKind, typeof Layout> = {
  hero: Sparkles,
  bot_showcase: LayoutGrid,
  world_showcase: Globe,
  text_block: Type,
  lorebook_gallery: Layers,
  banner: Image,
  bot_group: LayoutGrid,
  form: MessageCircle,
  sticker: Image,
  divider: Minus,
  social_links: Share2,
  spacer: Layout,
  gallery: LayoutGrid,
  embed: ExternalLink,
};

interface CreatorPageBlocksPanelProps {
  panel: CreatorBuilderPanel;
  sections: PageSection[];
  selectedSectionId: string | null;
  canvasWidth: CreatorPageCanvasWidth;
  sectionGap: CreatorPageSectionGap;
  pagePadding: CreatorPagePadding;
  onPanelChange: (panel: CreatorBuilderPanel) => void;
  onCanvasWidthChange: (value: CreatorPageCanvasWidth) => void;
  onSectionGapChange: (value: CreatorPageSectionGap) => void;
  onPagePaddingChange: (value: CreatorPagePadding) => void;
  onAddBlock: () => void;
  onSelectSection: (section: PageSection) => void;
  onDuplicateSection: (section: PageSection) => void;
  onDeleteSection: (sectionId: string) => void;
  onMoveSection: (sectionId: string, direction: "up" | "down") => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, index: number) => void;
}

export function CreatorPageBlocksPanel({
  panel,
  sections,
  selectedSectionId,
  canvasWidth,
  sectionGap,
  pagePadding,
  onPanelChange,
  onCanvasWidthChange,
  onSectionGapChange,
  onPagePaddingChange,
  onAddBlock,
  onSelectSection,
  onDuplicateSection,
  onDeleteSection,
  onMoveSection,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: CreatorPageBlocksPanelProps) {
  const [pendingDelete, setPendingDelete] = useState<PageSection | null>(null);

  return (
    <aside className="h-full min-h-0 min-w-0 overflow-hidden bg-muted/[0.08] xl:border-r xl:border-border/70">
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4">
        <div className="mb-4 grid grid-cols-2 rounded-xl bg-muted/50 p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-10 cursor-pointer rounded-lg text-xs xl:h-9",
              panel === "blocks" && "bg-background shadow-sm",
            )}
            onClick={() => onPanelChange("blocks")}
          >
            <Blocks className="mr-1.5 h-3.5 w-3.5" />
            Blocks
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-10 cursor-pointer rounded-lg text-xs xl:h-9",
              panel === "page" && "bg-background shadow-sm",
            )}
            onClick={() => onPanelChange("page")}
          >
            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
            Page
          </Button>
        </div>

        {panel === "blocks" ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Page blocks</p>
                <p className="text-[11px] text-muted-foreground">
                  Drag on desktop or use the actions menu to reorder.
                </p>
              </div>

              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0 cursor-pointer rounded-full xl:h-8 xl:w-8"
                onClick={onAddBlock}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {sections.length > 0 ? (
              <div className="space-y-2">
                {sections.map((section, index) => {
                  const Icon = sectionKindIcons[section.kind] || Layout;
                  const title = getSectionDisplayTitle(section);

                  return (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={(event) => onDragStart(event, index)}
                      onDragEnd={onDragEnd}
                      onDragOver={(event) => onDragOver(event, index)}
                      onDragLeave={onDragLeave}
                      onDrop={(event) => onDrop(event, index)}
                      className={cn(
                        "group flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border bg-background/70 p-2.5 transition-all hover:bg-background",
                        selectedSectionId === section.id
                          ? "border-primary/50 bg-primary/[0.045] shadow-sm shadow-primary/5"
                          : "border-border/60 hover:border-primary/35",
                      )}
                      onClick={() => onSelectSection(section)}
                    >
                      <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground/60 xl:block" />

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 xl:h-8 xl:w-8">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{title}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {sectionKindLabels[section.kind]}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0 cursor-pointer rounded-lg text-muted-foreground xl:h-8 xl:w-8"
                            aria-label={`Actions for ${title}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          align="end"
                          sideOffset={4}
                          className="z-[120] w-44"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <DropdownMenuItem
                            disabled={index === 0}
                            className="cursor-pointer text-xs"
                            onSelect={() => onMoveSection(section.id, "up")}
                          >
                            <ArrowUp className="mr-2 h-3.5 w-3.5" />
                            Move up
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            disabled={index === sections.length - 1}
                            className="cursor-pointer text-xs"
                            onSelect={() => onMoveSection(section.id, "down")}
                          >
                            <ArrowDown className="mr-2 h-3.5 w-3.5" />
                            Move down
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="cursor-pointer text-xs"
                            onSelect={() => onDuplicateSection(section)}
                          >
                            <Copy className="mr-2 h-3.5 w-3.5" />
                            Duplicate
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="cursor-pointer text-xs text-destructive focus:text-destructive"
                            onSelect={() => setPendingDelete(section)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete block
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={onAddBlock}
                className="flex w-full cursor-pointer flex-col items-center rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.025]"
              >
                <Plus className="mb-2 h-5 w-5 text-primary" />
                <span className="text-sm font-medium">
                  Add your first block
                </span>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  Start with a Hero, text, bots, gallery, or anything else.
                </span>
              </button>
            )}

            <Button
              type="button"
              variant="outline"
              className="mt-3 h-10 w-full cursor-pointer rounded-xl"
              onClick={onAddBlock}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add block
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">Canvas</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Global controls for the page canvas.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Canvas width</Label>
              <Select value={canvasWidth} onValueChange={onCanvasWidthChange}>
                <SelectTrigger className="h-10 w-full xl:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">Narrow</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="wide">Wide</SelectItem>
                  <SelectItem value="full">Full width</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Section spacing</Label>
              <Select value={sectionGap} onValueChange={onSectionGapChange}>
                <SelectTrigger className="h-10 w-full xl:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="relaxed">Relaxed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Page padding</Label>
              <Select value={pagePadding} onValueChange={onPagePaddingChange}>
                <SelectTrigger className="h-10 w-full xl:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="spacious">Spacious</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete block?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `This will permanently remove "${getSectionDisplayTitle(
                    pendingDelete,
                  )}" from this Creator Page.`
                : "This block will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!pendingDelete) {
                  return;
                }

                onDeleteSection(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
