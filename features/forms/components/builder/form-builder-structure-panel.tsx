"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Copy,
  FileText,
  Layers3,
  MoreHorizontal,
  Palette,
  Plus,
  Power,
  Trash2,
} from "lucide-react";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

import { cn } from "@/lib/utils";

import { stripMarkdownToText } from "@/features/markdown/lib/markdown";

import type {
  FormBuilderDraft,
  FormBuilderSelection,
} from "./form-builder-types";

interface FormBuilderStructurePanelProps {
  draft: FormBuilderDraft;

  selection: FormBuilderSelection;

  onSelectionChange: (selection: FormBuilderSelection) => void;

  onAddSection: () => void;

  onAddField: (sectionId: string) => void;

  onDuplicateSection: (sectionId: string) => void;

  onDuplicateField: (sectionId: string, fieldId: string) => void;

  onDeleteSection: (sectionId: string) => void;

  onDeleteField: (sectionId: string, fieldId: string) => void;

  onMoveSection: (sectionId: string, direction: -1 | 1) => void;

  onMoveField: (sectionId: string, fieldId: string, direction: -1 | 1) => void;
}

function isSelected(
  current: FormBuilderSelection,
  target: FormBuilderSelection,
) {
  if (current.type !== target.type) {
    return false;
  }

  if (target.type === "section" && current.type === "section") {
    return current.sectionId === target.sectionId;
  }

  if (target.type === "field" && current.type === "field") {
    return (
      current.sectionId === target.sectionId &&
      current.fieldId === target.fieldId
    );
  }

  return true;
}

export function FormBuilderStructurePanel({
  draft,
  selection,
  onSelectionChange,
  onAddSection,
  onAddField,
  onDuplicateSection,
  onDuplicateField,
  onDeleteSection,
  onDeleteField,
  onMoveSection,
  onMoveField,
}: FormBuilderStructurePanelProps) {
  const totalFields = draft.sections.reduce(
    (total, section) => total + section.fields.length,
    0,
  );

  const sectionLimitReached = draft.sections.length >= 20;

  const fieldLimitReached = totalFields >= 50;

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(draft.sections.map((section) => section.id)),
  );

  type PendingDelete =
    | {
        type: "section";
        sectionId: string;
        title: string;
      }
    | {
        type: "field";
        sectionId: string;
        fieldId: string;
        title: string;
      }
    | null;

  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  /*
   * Newly-created sections should appear
   * expanded automatically.
   */
  useEffect(() => {
    setExpandedSections((current) => {
      const next = new Set(current);

      for (const section of draft.sections) {
        if (!current.has(section.id)) {
          next.add(section.id);
        }
      }

      return next;
    });
  }, [draft.sections]);

  /*
   * If a field or section is selected,
   * make sure its parent section is open.
   */
  useEffect(() => {
    if (selection.type !== "section" && selection.type !== "field") {
      return;
    }

    setExpandedSections((current) => {
      if (current.has(selection.sectionId)) {
        return current;
      }

      const next = new Set(current);

      next.add(selection.sectionId);

      return next;
    });
  }, [selection]);

  const setSectionExpanded = (sectionId: string, open: boolean) => {
    setExpandedSections((current) => {
      const next = new Set(current);

      if (open) {
        next.add(sectionId);
      } else {
        next.delete(sectionId);
      }

      return next;
    });
  };

  return (
    <aside className="min-w-0 bg-muted/[0.06] xl:border-r xl:border-border/70">
      <div className="p-3 sm:p-4 xl:sticky xl:top-[69px] xl:max-h-[calc(100dvh-69px)] xl:overflow-y-auto">
        {/* Header */}
        <div className="mb-4 px-1">
          <p className="text-sm font-semibold">Structure</p>

          <p className="mt-1 text-[10px] text-muted-foreground">
            {draft.sections.length}
            /20 sections · {totalFields}/50 fields
          </p>
        </div>

        {/* Form-level navigation */}
        <div className="rounded-xl border border-border/60 bg-background/50 p-1">
          <NavigationItem
            selected={isSelected(selection, {
              type: "form",
            })}
            icon={FileText}
            label="General"
            onClick={() =>
              onSelectionChange({
                type: "form",
              })
            }
          />

          <NavigationItem
            selected={isSelected(selection, {
              type: "appearance",
            })}
            icon={Palette}
            label="Appearance"
            onClick={() =>
              onSelectionChange({
                type: "appearance",
              })
            }
          />

          <NavigationItem
            selected={isSelected(selection, {
              type: "availability",
            })}
            icon={Power}
            label="Availability"
            onClick={() =>
              onSelectionChange({
                type: "availability",
              })
            }
          />
        </div>

        {/* Sections heading */}
        <div className="mb-2 mt-5 flex items-center justify-between gap-2 px-1">
          <div className="flex min-w-0 items-center gap-2">
            <Layers3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Sections
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 cursor-pointer rounded-lg xl:h-7 xl:w-7"
            disabled={sectionLimitReached}
            title={
              sectionLimitReached ? "Section limit reached" : "Add section"
            }
            onClick={onAddSection}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Tree */}
        <div className="space-y-1">
          {draft.sections.map((section, sectionIndex) => {
            const sectionTitle =
              stripMarkdownToText(section.title || "").trim() ||
              "Untitled section";

            const expanded = expandedSections.has(section.id);

            const sectionSelected =
              selection.type === "section" &&
              selection.sectionId === section.id;

            const containsSelectedField =
              selection.type === "field" && selection.sectionId === section.id;

            const sectionActive = sectionSelected || containsSelectedField;

            return (
              <Collapsible
                key={section.id}
                open={expanded}
                onOpenChange={(open) => setSectionExpanded(section.id, open)}
                className="group/section"
              >
                {/* Section row */}
                <div
                  className={cn(
                    "relative flex min-w-0 items-center rounded-lg transition-colors",

                    sectionActive ? "bg-primary/[0.07]" : "hover:bg-muted/50",
                  )}
                >
                  {sectionActive && (
                    <div className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />
                  )}

                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="ml-1 flex h-10 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground xl:h-8 xl:w-7"
                      aria-label={
                        expanded
                          ? `Collapse ${sectionTitle}`
                          : `Expand ${sectionTitle}`
                      }
                    >
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200" />
                      )}
                    </button>
                  </CollapsibleTrigger>

                  <button
                    type="button"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-2.5 pr-1 text-left xl:py-2"
                    onClick={() =>
                      onSelectionChange({
                        type: "section",
                        sectionId: section.id,
                      })
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-[11px] font-medium",

                          sectionSelected && "text-primary",
                        )}
                      >
                        {sectionTitle}
                      </p>

                      <p className="mt-0.5 text-[9px] text-muted-foreground">
                        {section.fields.length} field
                        {section.fields.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </button>

                  <SectionMenu
                    title={sectionTitle}
                    sectionIndex={sectionIndex}
                    sectionCount={draft.sections.length}
                    fieldCount={section.fields.length}
                    totalFields={totalFields}
                    sectionLimitReached={sectionLimitReached}
                    fieldLimitReached={fieldLimitReached}
                    onAddField={() => onAddField(section.id)}
                    onMoveUp={() => onMoveSection(section.id, -1)}
                    onMoveDown={() => onMoveSection(section.id, 1)}
                    onDuplicate={() => onDuplicateSection(section.id)}
                    onDelete={() =>
                      setPendingDelete({
                        type: "section",
                        sectionId: section.id,
                        title: sectionTitle,
                      })
                    }
                  />
                </div>

                {/* Fields */}
                <CollapsibleContent
                  className={cn(
                    "overflow-hidden",
                    "data-[state=open]:animate-collapsible-down",
                    "data-[state=closed]:animate-collapsible-up",
                    "motion-reduce:transition-none",
                  )}
                >
                  <div className="relative ml-[1.15rem] mt-0.5 border-l border-border/60 pl-2">
                    {section.fields.map((field, fieldIndex) => {
                      const fieldTitle =
                        stripMarkdownToText(field.label || "").trim() ||
                        "Untitled field";

                      const selected =
                        selection.type === "field" &&
                        selection.sectionId === section.id &&
                        selection.fieldId === field.id;

                      return (
                        <div
                          key={field.id}
                          className={cn(
                            "group/field relative flex min-w-0 items-center rounded-lg transition-colors",

                            selected
                              ? "bg-primary/[0.07]"
                              : "hover:bg-muted/45",
                          )}
                        >
                          {selected && (
                            <div className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />
                          )}

                          <button
                            type="button"
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2.5 py-2.5 text-left xl:py-2"
                            onClick={() =>
                              onSelectionChange({
                                type: "field",
                                sectionId: section.id,
                                fieldId: field.id,
                              })
                            }
                          >
                            <CircleDot
                              className={cn(
                                "h-2.5 w-2.5 shrink-0",

                                selected
                                  ? "text-primary"
                                  : "text-muted-foreground",
                              )}
                            />

                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "truncate text-[10px] font-medium",

                                  selected && "text-primary",
                                )}
                              >
                                {fieldTitle}
                              </p>

                              <p className="mt-0.5 truncate text-[8px] capitalize text-muted-foreground">
                                {field.type}
                              </p>
                            </div>
                          </button>

                          <FieldMenu
                            title={fieldTitle}
                            fieldIndex={fieldIndex}
                            fieldCount={section.fields.length}
                            fieldLimitReached={fieldLimitReached}
                            onMoveUp={() =>
                              onMoveField(section.id, field.id, -1)
                            }
                            onMoveDown={() =>
                              onMoveField(section.id, field.id, 1)
                            }
                            onDuplicate={() =>
                              onDuplicateField(section.id, field.id)
                            }
                            onDelete={() =>
                              setPendingDelete({
                                type: "field",
                                sectionId: section.id,
                                fieldId: field.id,
                                title: fieldTitle,
                              })
                            }
                          />
                        </div>
                      );
                    })}

                    {/* Add field */}
                    <button
                      type="button"
                      disabled={fieldLimitReached}
                      className={cn(
                        "mt-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-[9px] text-muted-foreground transition-colors xl:py-2",

                        fieldLimitReached
                          ? "cursor-not-allowed opacity-40"
                          : "cursor-pointer hover:bg-muted/45 hover:text-foreground",
                      )}
                      onClick={() => onAddField(section.id)}
                    >
                      <Plus className="h-3 w-3" />
                      Add field
                    </button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {/* Empty state */}
        {draft.sections.length === 0 && (
          <div className="mt-2 rounded-xl border border-dashed border-border/70 bg-background/40 px-4 py-6 text-center">
            <Layers3 className="mx-auto h-5 w-5 text-muted-foreground" />

            <p className="mt-2 text-xs font-medium">No sections yet</p>

            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Add a section to start building your form.
            </p>
          </div>
        )}

        {/* Primary add section action */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={sectionLimitReached}
          className="mt-4 w-full cursor-pointer border-dashed text-xs"
          onClick={onAddSection}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add section
        </Button>

        {sectionLimitReached && (
          <p className="mt-2 text-center text-[9px] text-muted-foreground">
            Section limit reached.
          </p>
        )}

        {fieldLimitReached && (
          <p className="mt-2 text-center text-[9px] text-muted-foreground">
            Field limit reached.
          </p>
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
            <AlertDialogTitle>
              {pendingDelete?.type === "section"
                ? "Delete section?"
                : "Delete field?"}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {pendingDelete?.type === "section"
                ? `This will permanently remove "${pendingDelete.title}" and all fields inside it. Conditional rules that depend on those fields will also be removed.`
                : pendingDelete
                  ? `This will permanently remove "${pendingDelete.title}". Conditional rules that depend on this field will also be removed.`
                  : ""}
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

                if (pendingDelete.type === "section") {
                  onDeleteSection(pendingDelete.sectionId);
                } else {
                  onDeleteField(pendingDelete.sectionId, pendingDelete.fieldId);
                }

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

function NavigationItem({
  selected,
  icon: Icon,
  label,
  onClick,
}: {
  selected: boolean;
  icon: typeof FileText;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-[11px] font-medium transition-colors xl:py-2",

        selected
          ? "bg-primary/[0.08] text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
      onClick={onClick}
    >
      {selected && (
        <div className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />
      )}

      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",

          selected ? "text-primary" : "text-muted-foreground",
        )}
      />

      <span className="truncate">{label}</span>
    </button>
  );
}

function SectionMenu({
  title,
  sectionIndex,
  sectionCount,
  fieldCount,
  totalFields,
  sectionLimitReached,
  fieldLimitReached,
  onAddField,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: {
  title: string;

  sectionIndex: number;
  sectionCount: number;

  fieldCount: number;
  totalFields: number;

  sectionLimitReached: boolean;
  fieldLimitReached: boolean;

  onAddField: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const duplicateDisabled =
    sectionLimitReached || totalFields + fieldCount > 50;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "mr-1 h-9 w-9 shrink-0 cursor-pointer rounded-md xl:h-7 xl:w-7",
            "text-muted-foreground",
            "opacity-60 transition-opacity",
            "hover:bg-muted hover:text-foreground hover:opacity-100",
            "group-hover/section:opacity-100",
            "data-[state=open]:bg-muted",
            "data-[state=open]:text-foreground",
            "data-[state=open]:opacity-100",
          )}
          aria-label={`Actions for ${title}`}
          title={`Actions for ${title}`}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={4} className="z-120 w-44">
        <DropdownMenuItem
          disabled={fieldLimitReached}
          className="cursor-pointer text-xs"
          onSelect={onAddField}
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Add field
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={duplicateDisabled}
          className="cursor-pointer text-xs"
          onSelect={onDuplicate}
        >
          <Copy className="mr-2 h-3.5 w-3.5" />
          Duplicate
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={sectionIndex === 0}
          className="cursor-pointer text-xs"
          onSelect={onMoveUp}
        >
          <ArrowUp className="mr-2 h-3.5 w-3.5" />
          Move up
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={sectionIndex === sectionCount - 1}
          className="cursor-pointer text-xs"
          onSelect={onMoveDown}
        >
          <ArrowDown className="mr-2 h-3.5 w-3.5" />
          Move down
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer text-xs"
          onSelect={onDelete}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete section
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FieldMenu({
  title,
  fieldIndex,
  fieldCount,
  fieldLimitReached,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: {
  title: string;

  fieldIndex: number;
  fieldCount: number;

  fieldLimitReached: boolean;

  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "mr-1 h-9 w-9 shrink-0 cursor-pointer rounded-md xl:h-7 xl:w-7",
            "text-muted-foreground",
            "opacity-60 transition-opacity",
            "hover:bg-muted hover:text-foreground hover:opacity-100",
            "group-hover/field:opacity-100",
            "data-[state=open]:bg-muted",
            "data-[state=open]:text-foreground",
            "data-[state=open]:opacity-100",
          )}
          aria-label={`Actions for ${title}`}
          title={`Actions for ${title}`}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={4} className="z-120 w-40">
        <DropdownMenuItem
          disabled={fieldLimitReached}
          className="cursor-pointer text-xs"
          onSelect={onDuplicate}
        >
          <Copy className="mr-2 h-3.5 w-3.5" />
          Duplicate
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={fieldIndex === 0}
          className="cursor-pointer text-xs"
          onSelect={onMoveUp}
        >
          <ArrowUp className="mr-2 h-3.5 w-3.5" />
          Move up
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={fieldIndex === fieldCount - 1}
          className="cursor-pointer text-xs"
          onSelect={onMoveDown}
        >
          <ArrowDown className="mr-2 h-3.5 w-3.5" />
          Move down
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer text-xs"
          onSelect={onDelete}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete field
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
