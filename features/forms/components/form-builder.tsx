// ============================================================================
// Forgeworks - Form Builder Component
// Visual form designer for creating custom forms
// ============================================================================

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import type { IGif } from "@giphy/js-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Flame,
  Gem,
  Plus,
  Trash2,
  GripVertical,
  Type,
  AlignLeft,
  ListChecks,
  CircleDot,
  CheckSquare,
  Tags,
  Save,
  X,
  Copy,
  ExternalLink,
  Bold,
  Upload,
  Italic,
  Link as LinkIcon,
  ArrowUp,
  Search,
  ArrowDown,
  Star,
  Sparkles,
  Info,
  ChevronDown,
  Wand2,
  Heart,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownField } from "@/features/markdown/components/markdown-field";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { IMAGE_PRESETS } from "@/lib/image-presets";
import type {
  FormField,
  FormSection,
  FormFieldType,
  RequestForm,
} from "@/features/forms/types/form-types";
import {
  defaultFormAppearance,
  formAppearanceAccents,
  formAppearanceDensityOptions,
  formAppearanceHeaderIcons,
  formAppearancePresets,
  getFormAppearanceClasses,
  resolveFormAppearance,
} from "@/features/forms/lib/form-appearance";
import { toast } from "sonner";
import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";
import type {
  FieldCondition,
  ConditionOperator,
} from "@/features/forms/types/form-types";
import {
  removeFormSectionImageAction,
  removeFormBannerAction,
  updateFormAction,
  uploadFormBannerAction,
  uploadFormSectionImageAction,
} from "@/features/forms/actions/forms";
import {
  getFormAssetPublicUrl,
  getFormBannerPublicUrl,
} from "@/features/forms/lib/form-assets";
import { CustomColorPicker } from "@/components/ui/custom-color-picker";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";

const headerIconMap = {
  sparkles: Sparkles,
  star: Star,
  wand: Wand2,
  heart: Heart,
  flame: Flame,
  gem: Gem,
} as const;

const giphyFetch = new GiphyFetch(
  process.env.NEXT_PUBLIC_GIPHY_API_KEY || "7o0fqYvUWtgy7wRLtEVpQOhsYsVX0J8y",
);

// ----------------------------------------------------------------------------
// Field Type Configuration
// ----------------------------------------------------------------------------

const fieldTypes: { type: FormFieldType; label: string; icon: typeof Type }[] =
  [
    { type: "text", label: "Short Text", icon: Type },
    { type: "textarea", label: "Long Text", icon: AlignLeft },
    { type: "select", label: "Dropdown", icon: ListChecks },
    { type: "radio", label: "Single Choice", icon: CircleDot },
    { type: "checkbox", label: "Multiple Choice", icon: CheckSquare },
    { type: "rating-type", label: "SFW/NSFW Rating", icon: Tags },
    { type: "tags", label: "Tag Input", icon: Tags },
  ];

// ----------------------------------------------------------------------------
// Field Editor Component
// ----------------------------------------------------------------------------

interface FieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onDelete: () => void;
  onDragStart?: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  allFields?: FormField[];
}

const conditionOperators: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "is_not_empty", label: "is not empty" },
  { value: "is_empty", label: "is empty" },
];

function FieldEditor({
  field,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging = false,
  allFields = [],
}: FieldEditorProps) {
  const [optionInput, setOptionInput] = useState("");
  const fieldConfig = fieldTypes.find((f) => f.type === field.type);
  const Icon = fieldConfig?.icon || Type;

  const addOption = () => {
    if (optionInput.trim() && field.options) {
      onUpdate({
        ...field,
        options: [...field.options, optionInput.trim()],
      });
      setOptionInput("");
    }
  };

  const moveOption = (index: number, dir: number) => {
    if (!field.options) return;
    const newOptions = [...field.options];
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= newOptions.length) return;
    const tmp = newOptions[newIndex];
    newOptions[newIndex] = newOptions[index];
    newOptions[index] = tmp;
    onUpdate({ ...field, options: newOptions });
  };

  const updateOption = (index: number, value: string) => {
    if (!field.options) return;
    const newOptions = [...field.options];
    newOptions[index] = value;
    onUpdate({ ...field, options: newOptions });
  };

  const removeOption = (index: number) => {
    if (field.options) {
      onUpdate({
        ...field,
        options: field.options.filter((_, i) => i !== index),
      });
    }
  };

  const needsOptions = ["select", "radio", "checkbox"].includes(field.type);

  return (
    <Card
      className={cn(
        "border-border/50 overflow-hidden transition-opacity",
        isDragging && "opacity-60",
      )}
    >
      <CardContent className="p-4 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* Drag handle placeholder */}
          <div
            className="cursor-grab self-start text-muted-foreground sm:mt-2"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            title="Drag to reorder field"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            {/* Field header */}
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                <Icon className="h-4 w-4" />
              </div>
              <Badge variant="outline" className="max-w-full truncate text-xs">
                {fieldConfig?.label || field.type}
              </Badge>
              {field.required && (
                <Badge
                  variant="secondary"
                  className="max-w-full truncate text-xs"
                >
                  Required
                </Badge>
              )}
            </div>

            {/* Label input */}
            <div className="space-y-1.5">
              <Label className="text-xs">Field Label</Label>
              <MarkdownField
                id={`field-label-${field.id}`}
                value={field.label}
                onChange={(value) =>
                  onUpdate({
                    ...field,
                    label: value,
                  })
                }
                placeholder="Enter field label..."
                minEditorHeightRem={4}
              />
            </div>

            {/* Placeholder input (for text fields) */}
            {["text", "textarea", "tags"].includes(field.type) && (
              <div className="space-y-1.5">
                <Label className="text-xs">Placeholder</Label>
                <Input
                  value={field.placeholder || ""}
                  onChange={(e) =>
                    onUpdate({ ...field, placeholder: e.target.value })
                  }
                  placeholder="Enter placeholder text..."
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>

              <MarkdownField
                id={`field-desc-${field.id}`}
                value={field.description}
                onChange={(value) =>
                  onUpdate({
                    ...field,
                    description: value,
                  })
                }
                placeholder="Help text for this field..."
                minEditorHeightRem={18}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Text alignment</Label>
              <Select
                value={field.textAlignment || "left"}
                onValueChange={(value) =>
                  onUpdate({
                    ...field,
                    textAlignment: value as "left" | "center" | "right",
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Applies to field label and description in the public form.
              </p>
            </div>

            {/* Options (for select, radio, checkbox) */}
            {needsOptions && (
              <div className="space-y-2">
                <Label className="text-xs">Options</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    placeholder="Add an option..."
                    className="min-w-0 flex-1"
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addOption())
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addOption}
                    className="cursor-pointer sm:self-auto self-end"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {field.options && field.options.length > 0 && (
                  <div className="space-y-2">
                    {field.options.map((option, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-2 sm:flex-row sm:items-center"
                      >
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          className="min-w-0 flex-1"
                        />
                        <div className="flex items-center gap-1 self-end sm:self-auto">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => moveOption(index, -1)}
                            title="Move up"
                            className="cursor-pointer"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => moveOption(index, 1)}
                            title="Move down"
                            className="cursor-pointer"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => removeOption(index)}
                            title="Remove"
                            className="text-destructive cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Allow 'Other' option for select/radio */}
                {(field.type === "radio" || field.type === "select") && (
                  <div className="flex items-center gap-2 mt-2">
                    <Switch
                      checked={(field as any).allowOther === true}
                      onCheckedChange={(checked) =>
                        onUpdate({ ...(field as any), allowOther: checked })
                      }
                      id={`allow-other-${field.id}`}
                    />
                    <Label
                      htmlFor={`allow-other-${field.id}`}
                      className="cursor-pointer"
                    >
                      Allow &quot;Other&quot; option
                    </Label>
                  </div>
                )}
              </div>
            )}

            {/* Required toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={field.required}
                onCheckedChange={(checked) =>
                  onUpdate({ ...field, required: checked })
                }
                id={`required-${field.id}`}
              />
              <Label
                htmlFor={`required-${field.id}`}
                className="text-sm cursor-pointer"
              >
                Required field
              </Label>
            </div>

            {/* Conditional display */}
            {allFields.length > 1 && (
              <div className="space-y-2 rounded-lg border border-dashed p-3 overflow-hidden">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="text-xs font-medium">Logic</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs cursor-pointer"
                    onClick={() => {
                      const newCondition: FieldCondition = {
                        fieldId: "",
                        operator: "is_not_empty",
                      };
                      onUpdate({
                        ...field,
                        conditions: [...(field.conditions || []), newCondition],
                      });
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Rule
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Show this field only when conditions are met.
                </p>
                {field.conditions && field.conditions.length > 0 && (
                  <div className="space-y-2">
                    {field.conditions.map((cond, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col gap-2 rounded-md border bg-background/50 p-2 text-xs sm:flex-row sm:flex-wrap sm:items-center"
                      >
                        <span className="text-muted-foreground">Show when</span>
                        <Select
                          value={cond.fieldId || ""}
                          onValueChange={(v) => {
                            const newConds = [...field.conditions!];
                            newConds[idx] = { ...cond, fieldId: v };
                            onUpdate({ ...field, conditions: newConds });
                          }}
                        >
                          <SelectTrigger className="h-7 w-full text-xs sm:w-36">
                            <SelectValue placeholder="Select field..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allFields
                              .filter((f) => f.id !== field.id)
                              .map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.label || f.id}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={cond.operator}
                          onValueChange={(v) => {
                            const newConds = [...field.conditions!];
                            newConds[idx] = {
                              ...cond,
                              operator: v as ConditionOperator,
                            };
                            onUpdate({ ...field, conditions: newConds });
                          }}
                        >
                          <SelectTrigger className="h-7 w-full text-xs sm:w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {conditionOperators.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!["is_empty", "is_not_empty"].includes(
                          cond.operator,
                        ) && (
                          <Input
                            value={cond.value || ""}
                            onChange={(e) => {
                              const newConds = [...field.conditions!];
                              newConds[idx] = {
                                ...cond,
                                value: e.target.value,
                              };
                              onUpdate({ ...field, conditions: newConds });
                            }}
                            placeholder="value"
                            className="h-7 w-full text-xs sm:w-28"
                          />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 self-end text-destructive cursor-pointer sm:self-auto"
                          onClick={() => {
                            const newConds = field.conditions!.filter(
                              (_, i) => i !== idx,
                            );
                            onUpdate({ ...field, conditions: newConds });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-white cursor-pointer"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Section Editor Component
// ----------------------------------------------------------------------------

interface SectionEditorProps {
  section: FormSection;
  onUpdate: (section: FormSection) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart?: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
}

function SectionEditor({
  section,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  isDragging = false,
  disableMoveUp = false,
  disableMoveDown = false,
}: SectionEditorProps) {
  const sectionImageInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [stylingOpen, setStylingOpen] = useState(false);
  const [gifDialogOpen, setGifDialogOpen] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [debouncedGifSearch, setDebouncedGifSearch] = useState("");
  const [gifItems, setGifItems] = useState<IGif[]>([]);
  const [gifOffset, setGifOffset] = useState(0);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifLoadingMore, setGifLoadingMore] = useState(false);
  const [gifHasMore, setGifHasMore] = useState(true);
  const [gifError, setGifError] = useState("");
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [fieldDropIndex, setFieldDropIndex] = useState<number | null>(null);
  const gifRequestSeqRef = useRef(0);
  const addField = (type: FormFieldType) => {
    const newField: FormField = {
      id: uuidv4(),
      type,
      label: "",
      required: false,
      options: ["select", "radio", "checkbox"].includes(type) ? [] : undefined,
    };
    onUpdate({
      ...section,
      fields: [...section.fields, newField],
    });
  };

  const updateField = (fieldId: string, updatedField: FormField) => {
    onUpdate({
      ...section,
      fields: section.fields.map((f) => (f.id === fieldId ? updatedField : f)),
    });
  };

  const deleteField = (fieldId: string) => {
    onUpdate({
      ...section,
      fields: section.fields.filter((f) => f.id !== fieldId),
    });
  };

  const moveFieldToIndex = (fieldId: string, dropIndex: number) => {
    const sourceIndex = section.fields.findIndex((f) => f.id === fieldId);
    if (sourceIndex < 0 || dropIndex < 0 || dropIndex > section.fields.length) {
      return;
    }

    let targetIndex = dropIndex;
    const next = [...section.fields];
    const [moved] = next.splice(sourceIndex, 1);
    if (sourceIndex < targetIndex) {
      targetIndex -= 1;
    }
    if (targetIndex === sourceIndex) {
      return;
    }
    next.splice(targetIndex, 0, moved);
    onUpdate({
      ...section,
      fields: next,
    });
  };

  const handleFieldDragStart =
    (fieldId: string) => (event: React.DragEvent<HTMLElement>) => {
      setDraggingFieldId(fieldId);
      setFieldDropIndex(section.fields.findIndex((f) => f.id === fieldId));
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", fieldId);
    };

  const handleFieldDragOver = (
    event: React.DragEvent<HTMLElement>,
    dropIndex: number,
  ) => {
    if (!draggingFieldId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (fieldDropIndex !== dropIndex) {
      setFieldDropIndex(dropIndex);
    }
  };

  const handleFieldDrop = (
    event: React.DragEvent<HTMLElement>,
    dropIndex: number,
  ) => {
    event.preventDefault();
    if (!draggingFieldId) return;
    moveFieldToIndex(draggingFieldId, dropIndex);
    setDraggingFieldId(null);
    setFieldDropIndex(null);
  };

  const handleFieldDragEnd = () => {
    setDraggingFieldId(null);
    setFieldDropIndex(null);
  };

  const handleSectionImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (section.custom?.imageAssetPath) {
        formData.append("existingPath", section.custom.imageAssetPath);
      }

      const result = await uploadFormSectionImageAction(formData);
      if (!result.success || !result.path) {
        toast.error(result.error ?? "Failed to upload image");
        return;
      }

      onUpdate({
        ...section,
        custom: {
          ...(section.custom || {}),
          imageAssetPath: result.path,
        },
      });

      toast.success("Section image uploaded");
    } finally {
      setIsUploadingImage(false);

      if (sectionImageInputRef.current) {
        sectionImageInputRef.current.value = "";
      }
    }
  };

  const handleRemoveSectionImage = async () => {
    const imagePath = String(section.custom?.imageAssetPath || "").trim();
    if (!imagePath) return;

    const result = await removeFormSectionImageAction(imagePath);
    if (!result.success) {
      toast.error(result.error ?? "Failed to remove image");
      return;
    }

    onUpdate({
      ...section,
      custom: {
        ...(section.custom || {}),
        imageAssetPath: undefined,
      },
    });
    toast.success("Section image removed");
  };

  const loadGifs = useCallback(
    async ({
      reset,
      query,
      offset,
    }: {
      reset: boolean;
      query: string;
      offset: number;
    }) => {
      const pageSize = 24;
      const requestSeq = ++gifRequestSeqRef.current;

      if (reset) {
        setGifLoading(true);
        setGifError("");
      } else {
        setGifLoadingMore(true);
      }

      try {
        const res = query
          ? await giphyFetch.search(query, {
              offset,
              limit: pageSize,
              rating: "r",
              lang: "es, en",
            })
          : await giphyFetch.trending({
              offset,
              limit: pageSize,
              rating: "r",
            });

        if (requestSeq !== gifRequestSeqRef.current) return;

        const items = Array.isArray(res.data) ? (res.data as IGif[]) : [];
        setGifItems((prev) => {
          if (reset) return items;
          const seen = new Set(prev.map((g) => g.id));
          const merged = [...prev];
          for (const gif of items) {
            if (!seen.has(gif.id)) merged.push(gif);
          }
          return merged;
        });

        const advanced = offset + items.length;
        setGifOffset(advanced);
        setGifHasMore(items.length === pageSize);
      } catch (error) {
        if (requestSeq !== gifRequestSeqRef.current) return;
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load GIFs. Check GIPHY API key and network.";
        setGifError(message || "Failed to load GIFs");
        if (reset) setGifItems([]);
      } finally {
        if (requestSeq === gifRequestSeqRef.current) {
          if (reset) setGifLoading(false);
          else setGifLoadingMore(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!gifDialogOpen) return;
    const t = setTimeout(() => {
      setDebouncedGifSearch(gifSearch.trim());
    }, 500);
    return () => clearTimeout(t);
  }, [gifDialogOpen, gifSearch]);

  useEffect(() => {
    if (!gifDialogOpen) return;
    setGifOffset(0);
    setGifHasMore(true);
    void loadGifs({
      reset: true,
      query: debouncedGifSearch,
      offset: 0,
    });
  }, [debouncedGifSearch, gifDialogOpen, loadGifs]);

  useEffect(() => {
    if (!gifDialogOpen) {
      gifRequestSeqRef.current += 1;
    }
  }, [gifDialogOpen]);

  const handleGifSelect = useCallback(
    (gif: IGif, e: React.SyntheticEvent<HTMLElement, Event>) => {
      e.preventDefault();
      const gifUrl = gif.images.original.url;
      onUpdate({
        ...section,
        custom: {
          ...(section.custom || {}),
          gifUrl,
        },
      });
      setGifDialogOpen(false);
      toast.success("GIF selected");
    },
    [onUpdate, section],
  );

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/70 bg-card/95 transition-all",
        isDragging && "opacity-60",
      )}
    >
      <CardHeader className="space-y-4 pb-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-primary/10 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Section actions
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground cursor-pointer"
              title="Move section up"
              onClick={onMoveUp}
              disabled={disableMoveUp}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground cursor-pointer"
              title="Move section down"
              onClick={onMoveDown}
              disabled={disableMoveDown}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground cursor-grab"
              title="Reorder section"
              draggable
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            >
              <GripVertical className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-white cursor-pointer"
              onClick={onDelete}
              title="Delete section"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Section Content
            </p>
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor={`section-title-${section.id}`}
                  className="text-xs text-muted-foreground"
                >
                  Section title
                </Label>
                <MarkdownField
                  id={`section-title-${section.id}`}
                  value={section.title || ""}
                  onChange={(value) =>
                    onUpdate({
                      ...section,
                      title: value,
                    })
                  }
                  placeholder="Blah blah blah"
                  minEditorHeightRem={4}
                  className="w-full overflow-auto min-w-0 text-base font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={`section-desc-${section.id}`}
                  className="text-xs text-muted-foreground"
                >
                  Section description
                </Label>
                <MarkdownField
                  id={`section-desc-${section.id}`}
                  value={section.description || ""}
                  onChange={(value) =>
                    onUpdate({
                      ...section,
                      description: value,
                    })
                  }
                  placeholder="Blah blah blah (optional)"
                  minEditorHeightRem={5}
                  className="text-sm text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Section layout */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Alignment
            </p>
            <div className="space-y-3 rounded-xl border border-border/60 bg-background/70 p-3">
              <div className="space-y-1.5 min-w-0">
                <Select
                  value={section.custom?.headerAlignment || "left"}
                  onValueChange={(val) =>
                    onUpdate({
                      ...section,
                      custom: {
                        ...(section.custom || {}),
                        headerAlignment: val as any,
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
                <Label className="cursor-pointer text-xs text-muted-foreground">
                  Collapsible
                </Label>
                <Switch
                  checked={!!section.custom?.collapsible}
                  onCheckedChange={(checked) =>
                    onUpdate({
                      ...section,
                      custom: {
                        ...(section.custom || {}),
                        collapsible: !!checked,
                      },
                    })
                  }
                />
              </div>
              {section.custom?.collapsible && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
                  <div>
                    <Label
                      htmlFor={`default-expanded-${section.id}`}
                      className="cursor-pointer text-xs text-muted-foreground"
                    >
                      Open by default
                    </Label>

                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Visitors will see this section expanded when the form
                      loads.
                    </p>
                  </div>

                  <Switch
                    id={`default-expanded-${section.id}`}
                    checked={!!section.custom?.defaultExpanded}
                    onCheckedChange={(checked) =>
                      onUpdate({
                        ...section,
                        custom: {
                          ...(section.custom || {}),
                          defaultExpanded: checked,
                        },
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Styling & Media */}
          <Collapsible open={stylingOpen} onOpenChange={setStylingOpen}>
            <div className="rounded-xl border border-border/70 bg-muted/20 overflow-hidden">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted/30 cursor-pointer"
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Styling &amp; Media
                  </p>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      stylingOpen && "rotate-180",
                    )}
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="divide-y">
                {/* Image */}
                <div className="p-4 space-y-3.5">
                  <p className="text-xs font-medium">Image</p>
                  <input
                    ref={sectionImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                    onChange={handleSectionImageUpload}
                    className="hidden"
                  />

                  {/* Preview */}
                  {(section.custom?.imageAssetPath ||
                    section.custom?.imageUrl) && (
                    <div className="rounded-md border overflow-hidden">
                      <img
                        src={
                          section.custom?.imageAssetPath
                            ? getFormAssetPublicUrl(
                                section.custom.imageAssetPath,
                              )
                            : section.custom?.imageUrl
                        }
                        alt="Section image preview"
                        className="max-h-44 w-full object-contain"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer w-full"
                      disabled={isUploadingImage}
                      onClick={() => sectionImageInputRef.current?.click()}
                    >
                      {isUploadingImage ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="mr-2 h-3.5 w-3.5" />
                      )}
                      {section.custom?.imageAssetPath
                        ? "Replace uploaded"
                        : "Upload file"}
                    </Button>
                    {section.custom?.imageAssetPath && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer text-destructive"
                        onClick={handleRemoveSectionImage}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Or paste an image URL
                    </Label>
                    <Input
                      value={section.custom?.imageUrl || ""}
                      onChange={(e) =>
                        onUpdate({
                          ...section,
                          custom: {
                            ...(section.custom || {}),
                            imageUrl: e.target.value,
                          },
                        })
                      }
                      placeholder="https://example.com/image.jpg"
                      className="text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Uploaded files take priority over URL if both are set.
                    </p>
                  </div>
                </div>

                {/* GIF */}
                <div className="p-4 space-y-2.5">
                  <Label className="text-xs font-medium">GIF</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer font-medium"
                      onClick={() => setGifDialogOpen(true)}
                    >
                      <Sparkles className="mr-2 h-3.5 w-3.5 text-primary animate-pulse" />
                      <span>
                        {section.custom?.gifUrl ? "Replace GIF" : "Pick GIF"}
                      </span>
                      <span className="mx-1 text-muted-foreground">·</span>
                      <span className="text-muted-foreground text-xs">
                        Powered by{" "}
                        <span className="font-black tracking-wider bg-gradient-to-r from-[#00FF99] via-[#00CCFF] via-[#9933FF] to-[#FF3366] bg-clip-text text-transparent">
                          GIPHY
                        </span>
                      </span>
                    </Button>
                    {section.custom?.gifUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer text-destructive"
                        onClick={() =>
                          onUpdate({
                            ...section,
                            custom: {
                              ...(section.custom || {}),
                              gifUrl: "",
                            },
                          })
                        }
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                      </Button>
                    )}
                  </div>
                  {section.custom?.gifUrl && (
                    <div className="rounded-md border overflow-hidden">
                      <img
                        src={section.custom.gifUrl}
                        alt="Selected gif"
                        className="max-h-44 w-full object-contain"
                      />
                    </div>
                  )}

                  <Dialog open={gifDialogOpen} onOpenChange={setGifDialogOpen}>
                    <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Select a GIF</DialogTitle>
                        <DialogDescription>
                          Trending GIFs with search.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 transition-colors duration-200 peer-focus:text-[#ea00ff] pointer-events-none" />

                        <Input
                          value={gifSearch}
                          onChange={(e) => setGifSearch(e.target.value)}
                          placeholder="Search GIPHY"
                          className="peer w-full pl-10 pr-12 bg-[#121212] border-neutral-800 text-white placeholder:text-neutral-500 transition-all duration-200 focus-visible:ring-1 focus-visible:ring-[#ea00ff] focus-visible:border-[#00CCFF] focus-visible:drop-shadow-[0_0_6px_rgba(0,204,255,0.15)]"
                        />

                        {/* Sello de Marca Isotipo de GIPHY a la derecha */}
                        <div
                          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-4 flex-col gap-0.5 pointer-events-none opacity-80 peer-focus:opacity-100 transition-opacity"
                          aria-hidden="true"
                        >
                          <div className="h-1 w-full bg-[#00FF99]" />
                          <div className="h-1 w-full bg-[#00CCFF]" />
                          <div className="h-1 w-full bg-[#9933FF]" />
                          <div className="h-1 w-full bg-[#FF3366]" />
                        </div>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        Powered by{" "}
                        <span className="font-black tracking-wider hover:animate-pulse bg-gradient-to-r from-[#00FF99] via-[#00CCFF] via-[#9933FF] to-[#FF3366] bg-clip-text text-transparent">
                          <a
                            href="https://giphy.com"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            GIPHY
                          </a>
                        </span>
                      </span>

                      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border p-2">
                        {gifLoading ? (
                          <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading GIFs...
                          </div>
                        ) : gifError ? (
                          <div className="space-y-2 py-8 text-center">
                            <p className="text-sm text-destructive">
                              {gifError}
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() =>
                                void loadGifs({
                                  reset: true,
                                  query: debouncedGifSearch,
                                  offset: 0,
                                })
                              }
                            >
                              Retry
                            </Button>
                          </div>
                        ) : gifItems.length === 0 ? (
                          <p className="py-8 text-center text-sm text-muted-foreground">
                            No GIFs found.
                          </p>
                        ) : (
                          <>
                            <div className="columns-2 gap-2 sm:columns-3">
                              {gifItems.map((gif) => {
                                const preview =
                                  gif.images.fixed_width_downsampled?.url ||
                                  gif.images.fixed_width?.url ||
                                  gif.images.original?.url;
                                if (!preview) return null;
                                return (
                                  <button
                                    key={gif.id}
                                    type="button"
                                    className="mb-2 block w-full break-inside-avoid overflow-hidden rounded-md border border-border/60 bg-muted/10 p-1 text-left transition hover:scale-[1.01] hover:border-primary/60"
                                    onClick={(e) => handleGifSelect(gif, e)}
                                  >
                                    <img
                                      src={preview}
                                      alt={gif.title || "GIF"}
                                      className="h-auto w-full object-contain"
                                      loading="lazy"
                                    />
                                  </button>
                                );
                              })}
                            </div>
                            {gifHasMore && (
                              <div className="pt-3 text-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="cursor-pointer"
                                  disabled={gifLoadingMore}
                                  onClick={() =>
                                    void loadGifs({
                                      reset: false,
                                      query: debouncedGifSearch,
                                      offset: gifOffset,
                                    })
                                  }
                                >
                                  {gifLoadingMore ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Loading...
                                    </>
                                  ) : (
                                    "Load more"
                                  )}
                                </Button>
                                <Image
                                  src="/giphy-logo.png"
                                  alt="Giphy Logo"
                                  width={84}
                                  height={84}
                                  loading="lazy"
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 overflow-hidden border-t border-border/60 bg-background/30 p-4">
        {/* Fields */}
        {section.fields.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-6 text-center">
            <p className="text-sm font-medium">No fields in this section yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your first component below to start building this section.
            </p>
          </div>
        )}

        {section.fields.map((field, index) => (
          <React.Fragment key={field.id}>
            <div
              className={cn(
                "h-2 rounded-md border border-transparent transition-colors",
                draggingFieldId && fieldDropIndex === index
                  ? "border-primary/60 bg-primary/20"
                  : "bg-transparent",
              )}
              onDragOver={(event) => handleFieldDragOver(event, index)}
              onDrop={(event) => handleFieldDrop(event, index)}
            />
            <FieldEditor
              field={field}
              onUpdate={(updated) => updateField(field.id, updated)}
              onDelete={() => deleteField(field.id)}
              onDragStart={handleFieldDragStart(field.id)}
              onDragEnd={handleFieldDragEnd}
              isDragging={draggingFieldId === field.id}
              allFields={section.fields}
            />
          </React.Fragment>
        ))}
        <div
          className={cn(
            "h-2 rounded-md border border-transparent transition-colors",
            draggingFieldId && fieldDropIndex === section.fields.length
              ? "border-primary/60 bg-primary/20"
              : "bg-transparent",
          )}
          onDragOver={(event) =>
            handleFieldDragOver(event, section.fields.length)
          }
          onDrop={(event) => handleFieldDrop(event, section.fields.length)}
        />

        {/* Add Field Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-dashed border-border/80 bg-background/70 cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            {fieldTypes.map((fieldType) => {
              const Icon = fieldType.icon;
              return (
                <DropdownMenuItem
                  key={fieldType.type}
                  onClick={() => addField(fieldType.type)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {fieldType.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Form Builder Props
// ----------------------------------------------------------------------------

interface FormBuilderProps {
  initialForm?: RequestForm;
  onSave: (
    form: Omit<RequestForm, "id" | "shareableLink" | "createdAt" | "updatedAt">,
  ) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

// ----------------------------------------------------------------------------
// Form Builder Component
// ----------------------------------------------------------------------------

export function FormBuilder({
  initialForm,
  onSave,
  onCancel,
  isEditing = false,
}: FormBuilderProps) {
  const [title, setTitle] = useState(initialForm?.title || "");
  const [description, setDescription] = useState(
    initialForm?.description || "",
  );
  const [bannerAssetPath, setBannerAssetPath] = useState(
    initialForm?.bannerAssetPath || "",
  );
  const [bannerUrl, setBannerUrl] = useState(initialForm?.bannerUrl || "");
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const formBannerInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null);
  const [bannerCropOpen, setBannerCropOpen] = useState(false);
  const [appearance, setAppearance] = useState(
    resolveFormAppearance(initialForm?.appearance || defaultFormAppearance),
  );
  const PreviewHeaderIcon =
    headerIconMap[appearance.headerIcon || "sparkles"] || Sparkles;

  const [sections, setSections] = useState<FormSection[]>(
    initialForm?.sections || [
      {
        id: uuidv4(),
        title: "Basic Information",
        fields: [],
      },
    ],
  );
  const [isActive, setIsActive] = useState(initialForm?.isActive ?? true);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(
    null,
  );
  const [sectionDropIndex, setSectionDropIndex] = useState<number | null>(null);

  useEffect(() => {
    setTitle(initialForm?.title || "");
    setDescription(initialForm?.description || "");
    setBannerAssetPath(initialForm?.bannerAssetPath || "");
    setBannerUrl(initialForm?.bannerUrl || "");
    setAppearance(
      resolveFormAppearance(initialForm?.appearance || defaultFormAppearance),
    );
    setSections(
      initialForm?.sections || [
        {
          id: uuidv4(),
          title: "Basic Information",
          fields: [],
        },
      ],
    );
    setIsActive(initialForm?.isActive ?? true);
  }, [initialForm]);

  const addSection = () => {
    setSections([
      ...sections,
      {
        id: uuidv4(),
        title: "New Section",
        fields: [],
      },
    ]);
  };

  const updateSection = (sectionId: string, updatedSection: FormSection) => {
    setSections(sections.map((s) => (s.id === sectionId ? updatedSection : s)));
  };

  const deleteSection = (sectionId: string) => {
    if (sections.length > 1) {
      setSections(sections.filter((s) => s.id !== sectionId));
    } else {
      toast.error("Form must have at least one section");
    }
  };

  const moveSection = (sectionId: string, direction: "up" | "down") => {
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === sectionId);
      if (index === -1) return prev;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const moveSectionToIndex = (sectionId: string, dropIndex: number) => {
    setSections((prev) => {
      const sourceIndex = prev.findIndex((s) => s.id === sectionId);
      if (sourceIndex < 0 || dropIndex < 0 || dropIndex > prev.length) {
        return prev;
      }

      let targetIndex = dropIndex;
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      if (sourceIndex < targetIndex) {
        targetIndex -= 1;
      }
      if (targetIndex === sourceIndex) {
        return prev;
      }
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleSectionDragStart =
    (sectionId: string) => (event: React.DragEvent<HTMLElement>) => {
      setDraggingSectionId(sectionId);
      setSectionDropIndex(sections.findIndex((s) => s.id === sectionId));
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", sectionId);
    };

  const handleSectionDragOver = (
    event: React.DragEvent<HTMLElement>,
    dropIndex: number,
  ) => {
    if (!draggingSectionId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (sectionDropIndex !== dropIndex) {
      setSectionDropIndex(dropIndex);
    }
  };

  const handleSectionDrop = (
    event: React.DragEvent<HTMLElement>,
    dropIndex: number,
  ) => {
    event.preventDefault();
    if (!draggingSectionId) return;
    moveSectionToIndex(draggingSectionId, dropIndex);
    setDraggingSectionId(null);
    setSectionDropIndex(null);
  };

  const handleSectionDragEnd = () => {
    setDraggingSectionId(null);
    setSectionDropIndex(null);
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Form title is required");
      return;
    }

    // const unlabeledField = sections
    //   .flatMap((section) => section.fields)
    //   .find((field) => !stripMarkdownToText(field.label || "").trim());

    // if (unlabeledField) {
    //   toast.error("All fields must have a label.");
    //   return;
    // }

    const totalFields = sections.reduce((sum, s) => sum + s.fields.length, 0);
    if (totalFields === 0) {
      toast.error("Add at least one field to your form");
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      bannerAssetPath: bannerAssetPath || undefined,
      bannerUrl: bannerUrl || undefined,
      sections,
      appearance,
      isActive,
    });
  };

  const handleCroppedFormBannerUpload = async (file: File) => {
    setIsUploadingBanner(true);

    const previousBannerPath = bannerAssetPath;

    try {
      const formData = new FormData();

      formData.append("file", file);

      const result = await uploadFormBannerAction(formData);

      if (!result.success || !result.path) {
        toast.error(result.error || "Failed to upload banner");

        return;
      }

      // Existing form:
      // Persist the new path first.
      // updateFormAction removes the old
      // banner after the DB update succeeds.
      if (isEditing && initialForm?.id) {
        const persist = await updateFormAction(initialForm.id, {
          bannerAssetPath: result.path,
        });

        if (!persist.success) {
          // New upload is not referenced
          // by the DB, so clean it up.
          await removeFormBannerAction(result.path);

          toast.error(persist.error || "Failed to persist banner");

          return;
        }
      } else if (previousBannerPath && previousBannerPath !== result.path) {
        // New/unsaved form:
        // there is no DB update to clean
        // the previous temporary banner.
        await removeFormBannerAction(previousBannerPath);
      }

      setBannerAssetPath(result.path);

      toast.success("Form banner uploaded");
    } finally {
      setIsUploadingBanner(false);

      setPendingBannerFile(null);
    }
  };

  const handleFormBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setPendingBannerFile(file);

    setBannerCropOpen(true);

    if (formBannerInputRef.current) {
      formBannerInputRef.current.value = "";
    }
  };

  const handleRemoveFormBanner = async () => {
    if (!bannerAssetPath) {
      setBannerUrl("");
      return;
    }

    const result = await removeFormBannerAction(bannerAssetPath);
    if (!result.success) {
      toast.error(result.error || "Failed to remove banner");
      return;
    }

    if (isEditing && initialForm?.id) {
      const persist = await updateFormAction(initialForm.id, {
        bannerAssetPath: "",
        bannerUrl: "",
      });
      if (!persist.success) {
        toast.error(persist.error || "Failed to persist banner removal");
        return;
      }
    }

    setBannerAssetPath("");
    setBannerUrl("");
    toast.success("Form banner removed");
  };

  const appearanceClasses = getFormAppearanceClasses(appearance);

  return (
    <div className="min-w-0 space-y-6 p-4 lg:p-6">
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 cursor-pointer"
          >
            <span className="flex items-center gap-2 font-medium">
              <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
              Markdown editor help
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
            {/* Where markdown works */}
            <div className="space-y-2">
              <p className="font-medium">Where Markdown is supported</p>

              <p className="text-muted-foreground">
                Rich text formatting is available in form titles and
                descriptions, section titles and descriptions, and field labels
                and descriptions. Formatting is rendered directly while you
                edit.
              </p>
            </div>

            {/* Shortcuts */}
            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className="font-medium">Keyboard shortcuts</p>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Bold</p>
                  <code className="mt-1 block text-xs">Ctrl/Cmd+B</code>
                </div>

                <div className="rounded-md border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Italic</p>
                  <code className="mt-1 block text-xs">Ctrl/Cmd+I</code>
                </div>

                <div className="rounded-md border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">
                    Insert / edit link
                  </p>
                  <code className="mt-1 block text-xs">Ctrl/Cmd+K</code>
                </div>

                <div className="rounded-md border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Undo</p>
                  <code className="mt-1 block text-xs">Ctrl/Cmd+Z</code>
                </div>
              </div>
            </div>

            {/* Paragraph behavior */}
            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className="font-medium">Paragraphs and line breaks</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border bg-background/70 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      Enter
                    </code>
                    <span className="font-medium">New paragraph</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Creates a separate paragraph with spacing. Best for
                    descriptions and longer blocks of content.
                  </p>
                </div>

                <div className="rounded-md border bg-background/70 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      Shift+Enter
                    </code>
                    <span className="font-medium">Soft line break</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Starts a new line without creating a separate paragraph.
                  </p>
                </div>
              </div>
            </div>

            {/* Formatting examples */}
            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className="font-medium">Formatting examples</p>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-md border bg-background/70 p-3">
                  <p className="mb-1 flex items-center gap-2 font-medium">
                    <Bold className="h-4 w-4 text-muted-foreground" />
                    Bold
                  </p>
                  <code className="block rounded bg-muted px-2 py-1 text-xs">
                    **important**
                  </code>
                </div>

                <div className="rounded-md border bg-background/70 p-3">
                  <p className="mb-1 flex items-center gap-2 font-medium">
                    <Italic className="h-4 w-4 text-muted-foreground" />
                    Italic
                  </p>
                  <code className="block rounded bg-muted px-2 py-1 text-xs">
                    *note*
                  </code>
                </div>

                <div className="rounded-md border bg-background/70 p-3">
                  <p className="mb-1 flex items-center gap-2 font-medium">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    Link
                  </p>
                  <code className="block rounded bg-muted px-2 py-1 text-xs break-all">
                    [text](https://example.com)
                  </code>
                </div>
              </div>
            </div>

            {/* Editor notes */}
            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className="font-medium">Editor notes</p>

              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>
                  Use the toolbar for bulleted lists, numbered lists, inline
                  code, links, and text colors.
                </li>
                <li>
                  Select text before applying formatting when you only want to
                  style part of a sentence.
                </li>
                <li>
                  Custom text colors are stored using syntax such as{" "}
                  <code>[text]{`{#ff4d4f}`}</code>.
                </li>
                <li>
                  Titles are best kept short even though the editor supports
                  rich formatting.
                </li>
                <li>
                  Long descriptions automatically wrap in previews and public
                  forms.
                </li>
              </ul>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
      {/* Form Details */}
      <h3 className="text-lg font-semibold">Form Details</h3>
      <Card
        className={appearanceClasses.preset.shell}
        style={appearanceClasses.surfaceStyle}
      >
        <CardHeader>
          <CardDescription>
            Basic information about your request form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Form Banner</Label>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Recommended: 1600 × 400 px · 4:1 ratio. Larger images can be
              repositioned before upload.
            </p>
            <input
              ref={formBannerInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
              className="hidden"
              onChange={handleFormBannerSelect}
            />

            {(bannerAssetPath || bannerUrl.trim()) && (
              <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20">
                <img
                  src={
                    bannerAssetPath
                      ? getFormBannerPublicUrl(bannerAssetPath)
                      : bannerUrl.trim()
                  }
                  alt="Form banner preview"
                  className="aspect-[4/1] w-full object-cover"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer flex-1 w-full"
                disabled={isUploadingBanner}
                onClick={() => formBannerInputRef.current?.click()}
              >
                {isUploadingBanner ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-3.5 w-3.5" />
                )}
                {bannerAssetPath ? "Replace banner" : "Upload banner"}
              </Button>

              {(bannerAssetPath || bannerUrl.trim()) && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="cursor-pointer text-white flex-1 w-full hover:text-white/90"
                  onClick={handleRemoveFormBanner}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Or paste an external banner URL
              </Label>
              <Input
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://example.com/form-banner.jpg"
              />
              <p className="text-[11px] text-muted-foreground">
                Uploaded banner takes priority if both are set.
              </p>
            </div>
          </div>

          <Separator />

          {/* Identity */}
          <div className="space-y-2">
            <Label htmlFor="form-title">
              Form Title <span className="text-red-400">*</span>
            </Label>
            <MarkdownField
              id="form-title"
              value={title}
              onChange={(value) => setTitle(value)}
              placeholder="e.g., Contact Form, Commission Request"
              minEditorHeightRem={4}
              className="text-lg font-semibold"
            />
            <p className="text-[11px] text-muted-foreground">
              Keep titles concise. Use bold, italic, links, or color for
              emphasis.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="form-description">Description</Label>
            <MarkdownField
              id="form-description"
              value={description}
              onChange={(value) => setDescription(value)}
              placeholder="Describe what this form is for…"
              minEditorHeightRem={18}
              className="text-lg font-semibold overflow-auto"
            />
          </div>

          <Separator />

          {/* Appearance */}
          <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5">
            <p className="text-sm font-medium leading-none">Appearance</p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Preset
                </Label>
                <Select
                  value={appearance.preset}
                  onValueChange={(value) =>
                    setAppearance((prev) => ({ ...prev, preset: value as any }))
                  }
                >
                  <SelectTrigger className="border-border/80 bg-background/90 shadow-sm">
                    <SelectValue placeholder="Preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {formAppearancePresets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Accent</Label>
                <Select
                  value={appearance.accent}
                  onValueChange={(value) =>
                    setAppearance((prev) => ({ ...prev, accent: value as any }))
                  }
                >
                  <SelectTrigger className="border-border/80 bg-background/90 shadow-sm">
                    <SelectValue placeholder="Accent" />
                  </SelectTrigger>
                  <SelectContent>
                    {formAppearanceAccents.map((accent) => (
                      <SelectItem key={accent.value} value={accent.value}>
                        {accent.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Density</Label>
                <Select
                  value={appearance.density}
                  onValueChange={(value) =>
                    setAppearance((prev) => ({
                      ...prev,
                      density: value as any,
                    }))
                  }
                >
                  <SelectTrigger className="border-border/80 bg-background/90 shadow-sm">
                    <SelectValue placeholder="Density" />
                  </SelectTrigger>
                  <SelectContent>
                    {formAppearanceDensityOptions.map((density) => (
                      <SelectItem key={density.value} value={density.value}>
                        {density.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Text colors
            </p>
            <div className="space-y-1.5 rounded-lg border border-border/70 bg-background/75 p-3">
              <p className="text-xs text-muted-foreground">
                Optional overrides for form title and description. Markdown
                color tags still take priority on selected fragments.
              </p>
              <div className="grid gap-3 pt-1 sm:grid-cols-2">
                <CustomColorPicker
                  label="Title color"
                  value={appearance.titleColor || appearanceClasses.accent.hex}
                  onChange={(value) =>
                    setAppearance((prev) => ({ ...prev, titleColor: value }))
                  }
                />
                <CustomColorPicker
                  label="Description color"
                  value={
                    appearance.descriptionColor ||
                    "hsl(var(--muted-foreground))"
                  }
                  onChange={(value) =>
                    setAppearance((prev) => ({
                      ...prev,
                      descriptionColor: value,
                    }))
                  }
                />
              </div>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Header icon
            </p>
            <div className="space-y-2 rounded-lg border border-border/70 bg-background/75 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose the icon shown at the top of the public form.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="hide-header-icon"
                    checked={appearance.hideHeaderIcon === true}
                    onCheckedChange={(checked) =>
                      setAppearance((prev) => ({
                        ...prev,
                        hideHeaderIcon: checked,
                      }))
                    }
                  />
                  <Label
                    htmlFor="hide-header-icon"
                    className="text-xs cursor-pointer"
                  >
                    Hide icon
                  </Label>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Icon</Label>
                  <Select
                    value={appearance.headerIcon || "sparkles"}
                    onValueChange={(value) =>
                      setAppearance((prev) => ({
                        ...prev,
                        headerIcon: value as any,
                      }))
                    }
                  >
                    <SelectTrigger className="border-border/80 bg-background/90 shadow-sm">
                      <SelectValue placeholder="Icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {formAppearanceHeaderIcons.map((icon) => (
                        <SelectItem key={icon.value} value={icon.value}>
                          {icon.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <CustomColorPicker
                  label="Icon color"
                  value={
                    appearance.headerIconColor || appearanceClasses.accent.hex
                  }
                  onChange={(value) =>
                    setAppearance((prev) => ({
                      ...prev,
                      headerIconColor: value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Preview pill */}
            <div
              className={cn(
                "overflow-hidden rounded-xl border border-border/80 bg-card/90 shadow-sm",
                appearanceClasses.preset.shell,
              )}
              style={{
                ...appearanceClasses.surfaceStyle,
                ...appearanceClasses.sectionCardStyle,
              }}
            >
              <div className="border-b border-border/60 bg-muted/25 px-4 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Live Preview
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {appearance.preset}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {appearance.accent}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {appearance.density}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {appearance.hideHeaderIcon
                      ? "Header icon hidden"
                      : `Header icon: ${appearance.headerIcon || "sparkles"}`}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div className="min-w-0 space-y-4">
                  <div className="flex items-start gap-3">
                    {appearance.hideHeaderIcon !== true && (
                      <div className={appearanceClasses.heroIcon}>
                        <PreviewHeaderIcon
                          className={cn(
                            "h-4 w-4",
                            !appearance.headerIconColor &&
                              appearanceClasses.accent.text,
                          )}
                          style={
                            appearance.headerIconColor
                              ? { color: appearance.headerIconColor }
                              : undefined
                          }
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-2">
                      <div
                        className={cn(
                          "text-base font-semibold leading-snug wrap-break-word",
                          !appearance.titleColor &&
                            appearanceClasses.accent.text,
                        )}
                        style={
                          appearance.titleColor
                            ? { color: appearance.titleColor }
                            : undefined
                        }
                      >
                        <MarkdownRenderer
                          content={title.trim() || "**Form title preview**"}
                          className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        />
                      </div>
                      <p
                        className="line-clamp-5 text-xs leading-relaxed text-muted-foreground"
                        style={
                          appearance.descriptionColor
                            ? { color: appearance.descriptionColor }
                            : undefined
                        }
                      >
                        {stripMarkdownToText(description) ||
                          "Description preview. Here you can quickly validate readability and style choices."}
                      </p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "rounded-lg border border-border/70 px-3 py-2 text-xs",
                      appearanceClasses.density.fieldGroup,
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="font-medium">Sample field spacing</span>
                      <span className="text-[11px] text-muted-foreground">
                        {appearance.density === "compact"
                          ? "Tighter layout"
                          : "More breathing room"}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "space-y-2.5",
                        appearanceClasses.density.formGap,
                      )}
                    >
                      <div className="h-2 rounded bg-muted" />
                      <div className="h-2 rounded bg-muted/80" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border/70 bg-background/80 p-3.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Active color tokens
                  </p>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span>Accent</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {appearanceClasses.accent.hex}
                      </span>
                    </div>
                    <div className="h-6 rounded-full bg-muted">
                      <div
                        className="h-6 rounded-full"
                        style={{
                          backgroundColor: appearanceClasses.accent.hex,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">Icon</p>
                      <span
                        className="block h-22 rounded border"
                        style={{
                          backgroundColor:
                            appearance.headerIconColor ||
                            appearanceClasses.accent.hex,
                        }}
                        title={`Icon: ${appearance.headerIconColor || appearanceClasses.accent.hex}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">
                        Accent badge
                      </p>
                      <span
                        className="block h-22 rounded border"
                        style={{
                          backgroundColor: appearanceClasses.accent.hex,
                        }}
                        title={`Accent: ${appearanceClasses.accent.hex}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">Form Sections</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={addSection}
            className="cursor-pointer w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </div>

        {sections.map((section, index) => (
          <React.Fragment key={section.id}>
            <div
              className={cn(
                "h-2 rounded-md border border-transparent transition-colors",
                draggingSectionId && sectionDropIndex === index
                  ? "border-primary/60 bg-primary/20"
                  : "bg-transparent",
              )}
              onDragOver={(event) => handleSectionDragOver(event, index)}
              onDrop={(event) => handleSectionDrop(event, index)}
            />
            <SectionEditor
              section={section}
              onUpdate={(updated) => updateSection(section.id, updated)}
              onDelete={() => deleteSection(section.id)}
              onMoveUp={() => moveSection(section.id, "up")}
              onMoveDown={() => moveSection(section.id, "down")}
              onDragStart={handleSectionDragStart(section.id)}
              onDragEnd={handleSectionDragEnd}
              isDragging={draggingSectionId === section.id}
              disableMoveUp={index === 0}
              disableMoveDown={index === sections.length - 1}
            />
          </React.Fragment>
        ))}
        <div
          className={cn(
            "h-2 rounded-md border border-transparent transition-colors",
            draggingSectionId && sectionDropIndex === sections.length
              ? "border-primary/60 bg-primary/20"
              : "bg-transparent",
          )}
          onDragOver={(event) => handleSectionDragOver(event, sections.length)}
          onDrop={(event) => handleSectionDrop(event, sections.length)}
        />
      </div>

      <ImageCropDialog
        open={bannerCropOpen}
        onOpenChange={(open) => {
          setBannerCropOpen(open);

          if (!open) {
            setPendingBannerFile(null);
          }
        }}
        file={pendingBannerFile}
        aspect={IMAGE_PRESETS.formBanner.aspect}
        cropShape={IMAGE_PRESETS.formBanner.cropShape}
        title="Adjust form banner"
        description="Drag and zoom the image to choose what visitors will see. Recommended size: 1600 × 400 px."
        recommendedWidth={IMAGE_PRESETS.formBanner.recommendedWidth}
        recommendedHeight={IMAGE_PRESETS.formBanner.recommendedHeight}
        outputWidth={IMAGE_PRESETS.formBanner.recommendedWidth}
        outputHeight={IMAGE_PRESETS.formBanner.recommendedHeight}
        onConfirm={handleCroppedFormBannerUpload}
      />

      <div
        className={cn(
          "sticky bottom-0 z-30",
          "-mx-4 flex flex-col gap-2",
          "border-t border-border/80",
          "bg-background/95 px-4 py-3",
          "shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur",
          "sm:flex-row sm:justify-end",
          "lg:-mx-6 lg:px-6",
        )}
      >
        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full cursor-pointer sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="w-full cursor-pointer sm:w-auto"
        >
          <Save className="mr-2 h-4 w-4" />
          {isEditing ? "Save Changes" : "Create Form"}
        </Button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Shareable Link Display Component
// ----------------------------------------------------------------------------

interface ShareableLinkProps {
  formId: string;
  shareableLink: string;
  isActive: boolean;
}

export function ShareableLinkDisplay({
  shareableLink,
  isActive,
}: ShareableLinkProps) {
  const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/form/${shareableLink}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Card className={cn(!isActive && "opacity-60")}>
      <CardContent className="space-y-3 p-4 overflow-hidden">
        <div className="flex items-start gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground mb-1">Shareable Link</p>
            <code className="block rounded bg-muted px-2 py-1 text-sm break-all whitespace-normal">
              {fullUrl}
            </code>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyLink}
            className="cursor-pointer"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.open(fullUrl, "_blank")}
            disabled={!isActive}
            className="cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
        {!isActive && (
          <p className="mt-2 text-xs text-warning">
            This form is currently inactive and not accepting responses
          </p>
        )}
      </CardContent>
    </Card>
  );
}
