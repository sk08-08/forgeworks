"use client";

import React, { useEffect, useMemo, useState } from "react";
import { submitPublicFormRequest } from "@/features/moderation/actions/safety";
import {
  MarkdownRenderer,
  MarkdownInlineRenderer,
} from "@/features/markdown/components/markdown-renderer";
import {
  getVisibleFieldIds,
  sanitizeVisibleResponses,
  validateFormValues,
} from "@/features/forms/lib/form-runtime";
import {
  Flame,
  Gem,
  Send,
  Heart,
  Sparkles,
  Star,
  Wand2,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import type {
  FormAppearance,
  FormField,
  FormSection,
} from "@/features/forms/types/form-types";
import {
  getFormAppearanceClasses,
  getFormFieldFocusClasses,
} from "@/features/forms/lib/form-appearance";
import { FeedbackActions } from "@/features/feedback/components/feedback-actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getFormAssetPublicUrl,
  getFormBannerPublicUrl,
} from "@/features/forms/lib/form-assets";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";

function parseHexColor(hex: string) {
  const raw = String(hex || "")
    .trim()
    .replace(/^#/, "");
  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw;

  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function toRelativeLuminance(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function getContrastRatio(hexA: string, hexB: string) {
  const colorA = parseHexColor(hexA);
  const colorB = parseHexColor(hexB);
  if (!colorA || !colorB) return 0;

  const lumA =
    0.2126 * toRelativeLuminance(colorA.r) +
    0.7152 * toRelativeLuminance(colorA.g) +
    0.0722 * toRelativeLuminance(colorA.b);
  const lumB =
    0.2126 * toRelativeLuminance(colorB.r) +
    0.7152 * toRelativeLuminance(colorB.g) +
    0.0722 * toRelativeLuminance(colorB.b);

  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveReadableTextColor(hexColor: string, isDarkMode: boolean) {
  const safeHex = String(hexColor || "").trim();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(safeHex)) {
    return undefined;
  }

  // Approximate form surface background by theme mode.
  const backgroundHex = isDarkMode ? "#0f1115" : "#ffffff";
  const minContrast = 3.6;

  return getContrastRatio(safeHex, backgroundHex) >= minContrast
    ? safeHex
    : undefined;
}

const headerIconMap = {
  sparkles: Sparkles,
  star: Star,
  wand: Wand2,
  heart: Heart,
  flame: Flame,
  gem: Gem,
} as const;

interface PublicFormProps {
  form: {
    id: string;
    title: string;
    description?: string | null;
    bannerAssetPath?: string | null;
    bannerUrl?: string | null;
    isActive: boolean;
    sections: FormSection[];
    appearance?: FormAppearance | null;
    userId?: string | null;
  };

  feedbackContext?: {
    sourcePage?: string;
    sourceLabel?: string;
    sourcePath?: string;
    relatedId?: string;
    metadata?: Record<string, unknown>;
  };

  preview?: boolean;
}

function FieldRenderer({ field, value, onChange, error, appearance }: any) {
  const resolvedAppearance = appearance ?? getFormAppearanceClasses(null);
  const fieldFocus = getFormFieldFocusClasses(
    resolvedAppearance.resolved.accent,
  );
  const [tagInput, setTagInput] = useState("");
  const [otherActive, setOtherActive] = useState(false);
  const [otherValue, setOtherValue] = useState("");

  const textValue = typeof value === "string" ? value : "";

  const characterCount = textValue.length;

  const hasLengthValidation =
    field.minLength !== undefined || field.maxLength !== undefined;

  const selectedValues = Array.isArray(value) ? value : [];

  const selectionCount = selectedValues.length;

  const hasSelectionValidation =
    field.minSelections !== undefined || field.maxSelections !== undefined;

  const selectionLimitReached =
    field.maxSelections !== undefined && selectionCount >= field.maxSelections;

  useEffect(() => {
    if (!field.allowOther) {
      setOtherActive(false);
      setOtherValue("");
      return;
    }

    const options = Array.isArray(field.options) ? field.options : [];

    /*
     * Multiple Choice:
     * Any selected string that is not one
     * of the configured options is the
     * custom "Other" value.
     */
    if (field.type === "checkbox" && Array.isArray(value)) {
      const customValue = value.find(
        (item) => typeof item === "string" && !options.includes(item),
      );

      if (customValue) {
        setOtherActive(true);
        setOtherValue(customValue);
      } else {
        setOtherActive(false);
        setOtherValue("");
      }

      return;
    }

    /*
     * Dropdown / Single Choice.
     */
    const current = typeof value === "string" ? value : "";

    const isOther = !!current && !options.includes(current);

    if (isOther) {
      setOtherActive(true);
      setOtherValue(current);
      return;
    }

    setOtherActive(false);
    setOtherValue("");
  }, [value, field.allowOther, field.options, field.type]);

  const addTag = () => {
    if (tagInput.trim() && Array.isArray(value)) {
      onChange([...value, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (Array.isArray(value)) {
      onChange(value.filter((t: string) => t !== tagToRemove));
    }
  };

  switch (field.type) {
    case "text":
      return (
        <div className="space-y-1.5">
          <Input
            value={textValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            className={cn(error && "border-destructive", fieldFocus)}
          />

          {hasLengthValidation && (
            <FieldLengthFeedback
              count={characterCount}
              min={field.minLength}
              max={field.maxLength}
            />
          )}
        </div>
      );
    case "textarea":
      return (
        <div className="space-y-1.5">
          <Textarea
            value={textValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            rows={4}
            className={cn(error && "border-destructive", fieldFocus)}
          />

          {hasLengthValidation && (
            <FieldLengthFeedback
              count={characterCount}
              min={field.minLength}
              max={field.maxLength}
            />
          )}
        </div>
      );
    case "select": {
      return (
        <>
          <Select
            value={typeof value === "string" ? (value as string) : ""}
            onValueChange={(v) => {
              if (v === "__other__") {
                setOtherActive(true);
                setOtherValue("");
                onChange("");
              } else {
                setOtherActive(false);
                setOtherValue("");
                onChange(v);
              }
            }}
          >
            <SelectTrigger
              className={cn(
                "w-full min-w-0",
                error && "border-destructive",
                fieldFocus,
              )}
            >
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
              {field.allowOther && (
                <SelectItem key="__other__" value="__other__">
                  Other...
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {field.allowOther && otherActive && (
            <div className="mt-2">
              <Input
                placeholder="Please specify"
                value={otherValue}
                onChange={(e) => {
                  setOtherValue(e.target.value);
                  onChange(e.target.value);
                }}
              />
            </div>
          )}
        </>
      );
    }
    case "radio": {
      return (
        <div className="min-w-0">
          <RadioGroup
            value={
              otherActive
                ? "__other__"
                : typeof value === "string"
                  ? (value as string)
                  : ""
            }
            onValueChange={(v) => {
              if (v === "__other__") {
                setOtherActive(true);
                setOtherValue("");
                onChange("");
              } else {
                setOtherActive(false);
                onChange(v);
              }
            }}
          >
            {field.options?.map((option: string) => (
              <div key={option} className="flex min-w-0 items-start gap-2">
                <RadioGroupItem
                  value={option}
                  id={`${field.id}-${option}`}
                  className="mt-0.5 shrink-0"
                />
                <Label
                  htmlFor={`${field.id}-${option}`}
                  className="min-w-0 flex-1 cursor-pointer [overflow-wrap:anywhere]"
                >
                  {option}
                </Label>
              </div>
            ))}
            {field.allowOther && (
              <div className="flex min-w-0 items-start gap-2">
                <RadioGroupItem
                  value="__other__"
                  id={`${field.id}-other`}
                  className="mt-0.5 shrink-0"
                />
                <Label
                  htmlFor={`${field.id}-other`}
                  className="min-w-0 flex-1 cursor-pointer [overflow-wrap:anywhere]"
                >
                  Other
                </Label>
              </div>
            )}
          </RadioGroup>
          {field.allowOther && otherActive && (
            <div className="mt-2">
              <Input
                placeholder="Please specify"
                value={otherValue}
                onChange={(e) => {
                  setOtherValue(e.target.value);
                  onChange(e.target.value);
                }}
              />
            </div>
          )}
        </div>
      );
    }
    case "checkbox": {
      const configuredOptions = Array.isArray(field.options)
        ? field.options
        : [];

      const customSelectedValue =
        selectedValues.find(
          (item: string) => !configuredOptions.includes(item),
        ) || "";

      const otherSelected = field.allowOther && !!customSelectedValue;

      const otherDisabled = !otherSelected && selectionLimitReached;

      return (
        <div className="space-y-3">
          <div className="space-y-2">
            {configuredOptions.map((option: string) => {
              const checked = selectedValues.includes(option);

              const disabled = !checked && selectionLimitReached;

              return (
                <div
                  key={option}
                  className={cn(
                    "flex min-w-0 items-start gap-2",
                    disabled && "opacity-50",
                  )}
                >
                  <Checkbox
                    id={`${field.id}-${option}`}
                    className="mt-0.5 shrink-0"
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(nextChecked) => {
                      if (nextChecked) {
                        if (selectionLimitReached) {
                          return;
                        }

                        onChange([...selectedValues, option]);
                      } else {
                        onChange(
                          selectedValues.filter(
                            (current: string) => current !== option,
                          ),
                        );
                      }
                    }}
                  />

                  <Label
                    htmlFor={`${field.id}-${option}`}
                    className={cn(
                      "min-w-0 flex-1 cursor-pointer [overflow-wrap:anywhere]",
                      disabled && "cursor-not-allowed",
                    )}
                  >
                    {option}
                  </Label>
                </div>
              );
            })}

            {field.allowOther && (
              <div
                className={cn(
                  "flex min-w-0 items-start gap-2",
                  otherDisabled && "opacity-50",
                )}
              >
                <Checkbox
                  id={`${field.id}-other`}
                  className="mt-0.5 shrink-0"
                  checked={otherSelected}
                  disabled={otherDisabled}
                  onCheckedChange={(nextChecked) => {
                    if (nextChecked) {
                      if (selectionLimitReached) {
                        return;
                      }

                      setOtherActive(true);

                      return;
                    }

                    setOtherActive(false);
                    setOtherValue("");

                    if (customSelectedValue) {
                      onChange(
                        selectedValues.filter(
                          (current: string) => current !== customSelectedValue,
                        ),
                      );
                    }
                  }}
                />

                <Label
                  htmlFor={`${field.id}-other`}
                  className={cn(
                    "min-w-0 flex-1 cursor-pointer [overflow-wrap:anywhere]",
                    otherDisabled && "cursor-not-allowed",
                  )}
                >
                  Other
                </Label>
              </div>
            )}

            {field.allowOther && otherActive && (
              <div className="ml-6 mt-2">
                <Input
                  placeholder="Please specify"
                  value={otherValue}
                  onChange={(event) => {
                    const nextValue = event.target.value;

                    const nextSelections = customSelectedValue
                      ? selectedValues.filter(
                          (current: string) => current !== customSelectedValue,
                        )
                      : selectedValues;

                    setOtherValue(nextValue);

                    if (nextValue.trim()) {
                      onChange([...nextSelections, nextValue]);
                    } else {
                      onChange(nextSelections);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {hasSelectionValidation && (
            <FieldSelectionFeedback
              count={selectionCount}
              min={field.minSelections}
              max={field.maxSelections}
            />
          )}
        </div>
      );
    }
    case "rating-type":
      return (
        <RadioGroup
          value={value as string}
          onValueChange={onChange}
          className="flex flex-wrap gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="SFW" id={`${field.id}-sfw`} />
            <Label
              htmlFor={`${field.id}-sfw`}
              className="cursor-pointer wrap-break-word"
            >
              <Badge variant="secondary">SFW</Badge>
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="NSFW" id={`${field.id}-nsfw`} />
            <Label
              htmlFor={`${field.id}-nsfw`}
              className="cursor-pointer wrap-break-word"
            >
              <Badge variant="destructive">NSFW</Badge>
            </Label>
          </div>
        </RadioGroup>
      );
    case "tags":
      return (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder={field.placeholder}
              className="min-w-0 flex-1"
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), addTag())
              }
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addTag}
              className="w-full cursor-pointer sm:w-auto"
            >
              Add
            </Button>
          </div>
          {Array.isArray(value) && value.length > 0 && (
            <div className="flex min-w-0 max-w-full flex-wrap gap-2">
              {value.map((tag: string) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="flex min-w-0 max-w-full transition-colors duration-200 cursor-pointer items-start whitespace-normal hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeTag(tag)}
                >
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    {tag}
                  </span>

                  <span aria-hidden className="ml-1 shrink-0">
                    ×
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

function FieldLengthFeedback({
  count,
  min,
  max,
}: {
  count: number;
  min?: number;
  max?: number;
}) {
  const belowMinimum = min !== undefined && count < min;

  const atMaximum = max !== undefined && count >= max;

  let message = "";

  if (min !== undefined && max !== undefined) {
    message =
      count < min
        ? `${count} characters · minimum ${min} · maximum ${max}`
        : `${count} / ${max} characters`;
  } else if (max !== undefined) {
    message = `${count} / ${max} characters`;
  } else if (min !== undefined) {
    message =
      count < min
        ? `${count} characters · minimum ${min}`
        : `${count} characters · minimum reached`;
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <p
        className={cn(
          "min-w-0 text-[10px] leading-relaxed transition-colors",
          belowMinimum
            ? "text-muted-foreground"
            : atMaximum
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground",
        )}
      >
        {message}
      </p>

      {min !== undefined && count >= min && (
        <span className="shrink-0 text-[10px] text-emerald-600 dark:text-emerald-400">
          Minimum reached
        </span>
      )}
    </div>
  );
}

function FieldSelectionFeedback({
  count,
  min,
  max,
}: {
  count: number;
  min?: number;
  max?: number;
}) {
  const belowMinimum = min !== undefined && count < min;

  const atMaximum = max !== undefined && count >= max;

  let message = `${count} selected`;

  if (min !== undefined && max !== undefined) {
    message = `${count} selected · minimum ${min} · maximum ${max}`;
  } else if (min !== undefined) {
    message = `${count} selected · minimum ${min}`;
  } else if (max !== undefined) {
    message = `${count} / ${max} selected`;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/[0.12] px-3 py-2">
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        {message}
      </p>

      {atMaximum ? (
        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
          Maximum reached
        </span>
      ) : !belowMinimum && min !== undefined ? (
        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          Minimum reached
        </span>
      ) : null}
    </div>
  );
}

function SectionRenderer({
  section,
  values,
  errors,
  onChange,
  appearance,
  preview = false,
  visibleFieldIds,
}: any) {
  const [isOpen, setIsOpen] = useState(
    section?.custom?.defaultExpanded === true,
  );
  const visibleFields = section.fields.filter((field: FormField) =>
    visibleFieldIds.has(field.id),
  );
  const requiredCount = visibleFields.filter(
    (field: FormField) => field.required,
  ).length;
  const completedCount = visibleFields.filter((field: FormField) => {
    const value = values[field.id];

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return String(value || "").trim().length > 0;
  }).length;

  const progress =
    visibleFields.length > 0
      ? Math.round((completedCount / visibleFields.length) * 100)
      : 0;
  const sectionImageUrl = getFormAssetPublicUrl(
    section?.custom?.imageAssetPath,
  );
  const externalSectionImageUrl = String(
    section?.custom?.imageUrl || "",
  ).trim();
  const safeExternalSectionImageUrl =
    /^https?:\/\//i.test(externalSectionImageUrl) ||
    (preview && /^blob:/i.test(externalSectionImageUrl))
      ? externalSectionImageUrl
      : "";
  const resolvedSectionImageUrl =
    sectionImageUrl || safeExternalSectionImageUrl;
  const gifUrl = String(section?.custom?.gifUrl || "").trim();
  const safeGifUrl = /^https?:\/\//i.test(gifUrl) ? gifUrl : "";

  const alignClass =
    section?.custom?.headerAlignment === "center"
      ? "text-center"
      : section?.custom?.headerAlignment === "right"
        ? "text-right"
        : "text-left";
  const flexAlignClass =
    section?.custom?.headerAlignment === "center"
      ? "items-center"
      : section?.custom?.headerAlignment === "right"
        ? "items-end"
        : "items-start";
  const fieldShellClass =
    "min-w-0 max-w-full overflow-hidden rounded-lg border border-border/60 bg-background/40 p-3 sm:p-4";

  if (section?.custom?.collapsible) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card
          className={cn(
            "relative min-w-0 overflow-hidden",
            "transition-[box-shadow,border-color] duration-300",
            isOpen && "shadow-md",
            appearance.sectionCard,
          )}
          style={appearance.sectionCardStyle}
        >
          {/* Accent rail */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 w-1 transition-opacity duration-300",
              isOpen ? "opacity-100" : "opacity-40",
            )}
            style={{
              backgroundColor: appearance.accent.hex,
            }}
          />

          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 p-4 pl-5 text-left sm:p-5 sm:pl-6",
                "transition-colors duration-200 hover:bg-muted/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {/* Chevron container */}
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  appearance.accent.softBg,
                  "transition-transform duration-300",
                  isOpen && "scale-105",
                )}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    "motion-reduce:transition-none",
                    appearance.accent.text,
                    isOpen && "rotate-180",
                  )}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "min-w-0 font-semibold [overflow-wrap:anywhere]",
                    alignClass,
                  )}
                >
                  <MarkdownInlineRenderer
                    content={section.title}
                    className="min-w-0 [overflow-wrap:anywhere]"
                  />
                </div>

                <div
                  className={cn(
                    "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground",
                    section?.custom?.headerAlignment === "center" &&
                      "justify-center",
                    section?.custom?.headerAlignment === "right" &&
                      "justify-end",
                  )}
                >
                  <span>
                    {visibleFields.length}{" "}
                    {visibleFields.length === 1 ? "field" : "fields"}
                  </span>

                  {requiredCount > 0 && (
                    <>
                      <span>·</span>
                      <span>{requiredCount} required</span>
                    </>
                  )}

                  {completedCount > 0 && (
                    <>
                      <span>·</span>
                      <span>
                        {completedCount}/{visibleFields.length} completed
                      </span>
                    </>
                  )}
                </div>

                {visibleFields.length > 0 && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: appearance.accent.hex,
                      }}
                    />
                  </div>
                )}
              </div>

              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                {isOpen ? "Hide" : "Open"}
              </span>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent
            className={cn(
              "overflow-hidden",
              "data-[state=open]:animate-collapsible-down",
              "data-[state=closed]:animate-collapsible-up",
            )}
          >
            <div className="border-t border-border/60">
              {/* Description */}
              {section.description && (
                <div className={cn("px-4 pt-4 sm:px-5 sm:pt-5", alignClass)}>
                  <MarkdownRenderer
                    content={section.description}
                    className={cn(
                      "text-xs text-muted-foreground wrap-break-word",
                      "[&>*:last-child]:mb-0",
                    )}
                  />
                </div>
              )}

              {/* Media */}
              {(resolvedSectionImageUrl || safeGifUrl) && (
                <div
                  className={cn(
                    "flex flex-col gap-3 px-4 pt-4 sm:px-5",
                    flexAlignClass,
                  )}
                >
                  {resolvedSectionImageUrl && (
                    <img
                      src={resolvedSectionImageUrl}
                      alt="Section visual"
                      className="max-h-72 max-w-full w-auto rounded-lg border object-contain"
                      loading="lazy"
                    />
                  )}

                  {safeGifUrl && (
                    <img
                      src={safeGifUrl}
                      alt="Section gif"
                      className="max-h-72 max-w-full w-auto rounded-lg border object-contain"
                      loading="lazy"
                    />
                  )}
                </div>
              )}

              <CardContent
                className={cn(
                  "min-w-0 space-y-3 p-4 sm:space-y-4 sm:p-5",
                  appearance.density.sectionContent,
                )}
              >
                {visibleFields.map((field: any) => {
                  const fieldTextAlignClass =
                    field.textAlignment === "center"
                      ? "text-center"
                      : field.textAlignment === "right"
                        ? "text-right"
                        : "text-left";
                  const fieldLabelJustifyClass =
                    field.textAlignment === "center"
                      ? "justify-center"
                      : field.textAlignment === "right"
                        ? "justify-end"
                        : "justify-start";

                  return (
                    <div
                      key={field.id}
                      className={cn(
                        fieldShellClass,
                        appearance.density.fieldGroup,
                      )}
                    >
                      <div className="space-y-1.5 pb-1">
                        <Label
                          className={cn(
                            "flex w-full min-w-0 items-start gap-1",
                            fieldLabelJustifyClass,
                          )}
                        >
                          <MarkdownInlineRenderer
                            content={field.label}
                            className={cn(
                              "min-w-0 whitespace-normal [overflow-wrap:anywhere]",
                              fieldTextAlignClass,
                            )}
                          />

                          {field.required && (
                            <span
                              aria-hidden
                              className="shrink-0 text-destructive"
                            >
                              *
                            </span>
                          )}
                        </Label>

                        {field.description && (
                          <MarkdownRenderer
                            content={field.description}
                            className={`text-xs text-muted-foreground wrap-break-word ${fieldTextAlignClass} [&>*:last-child]:mb-0`}
                          />
                        )}
                      </div>
                      <FieldRenderer
                        field={field}
                        value={
                          values[field.id] ||
                          (field.type === "tags" || field.type === "checkbox"
                            ? []
                            : "")
                        }
                        onChange={(value: any) =>
                          onChange(field.id, field.label, value)
                        }
                        error={errors[field.id]}
                        appearance={appearance}
                      />
                      {errors[field.id] && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors[field.id]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card
      className={cn("min-w-0 overflow-hidden", appearance.sectionCard)}
      style={appearance.sectionCardStyle}
    >
      <CardHeader className="space-y-3 pb-4 sm:pb-5">
        <CardTitle className={`${alignClass} wrap-break-word`}>
          <span className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere] sm:text-base">
            <MarkdownInlineRenderer
              content={section.title}
              className="min-w-0 [overflow-wrap:anywhere]"
            />
          </span>
        </CardTitle>
        {section.description && (
          <MarkdownRenderer
            content={section.description}
            className={`text-xs text-muted-foreground wrap-break-word rendered-markdown ${alignClass}`}
          />
        )}

        {(resolvedSectionImageUrl || safeGifUrl) && (
          <div className={`mt-2 flex flex-col gap-3 ${flexAlignClass}`}>
            {resolvedSectionImageUrl && (
              <img
                src={resolvedSectionImageUrl}
                alt="Section visual"
                className="max-h-72 max-w-full w-auto rounded-md border object-contain"
                loading="lazy"
              />
            )}
            {safeGifUrl && (
              <img
                src={safeGifUrl}
                alt="Section gif"
                className="max-h-72 max-w-full w-auto rounded-md border object-contain"
                loading="lazy"
              />
            )}
          </div>
        )}
      </CardHeader>
      <CardContent
        className={cn(
          "min-w-0 space-y-3 sm:space-y-4",
          appearance.density.sectionContent,
        )}
      >
        {visibleFields.map((field: any) => {
          const fieldTextAlignClass =
            field.textAlignment === "center"
              ? "text-center"
              : field.textAlignment === "right"
                ? "text-right"
                : "text-left";
          const fieldLabelJustifyClass =
            field.textAlignment === "center"
              ? "justify-center"
              : field.textAlignment === "right"
                ? "justify-end"
                : "justify-start";

          return (
            <div
              key={field.id}
              className={cn(fieldShellClass, appearance.density.fieldGroup)}
            >
              <div className="space-y-1.5 pb-1">
                <Label
                  className={cn(
                    "flex w-full min-w-0 items-start gap-1",
                    fieldLabelJustifyClass,
                  )}
                >
                  <MarkdownInlineRenderer
                    content={field.label}
                    className={cn(
                      "min-w-0 whitespace-normal [overflow-wrap:anywhere]",
                      fieldTextAlignClass,
                    )}
                  />

                  {field.required && (
                    <span aria-hidden className="shrink-0 text-destructive">
                      *
                    </span>
                  )}
                </Label>

                {field.description && (
                  <MarkdownRenderer
                    content={field.description}
                    className={`text-xs text-muted-foreground wrap-break-word ${fieldTextAlignClass} [&>*:last-child]:mb-0`}
                  />
                )}
              </div>
              <FieldRenderer
                field={field}
                value={
                  values[field.id] ||
                  (field.type === "tags" || field.type === "checkbox" ? [] : "")
                }
                onChange={(value: any) =>
                  onChange(field.id, field.label, value)
                }
                error={errors[field.id]}
                appearance={appearance}
              />
              {errors[field.id] && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors[field.id]}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function PublicForm({
  form,
  feedbackContext,
  preview = false,
}: PublicFormProps) {
  const appearance = getFormAppearanceClasses(form.appearance || null);
  const isEditorial = appearance.resolved.preset === "editorial";
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const visibleFieldIds = useMemo(
    () => getVisibleFieldIds(form.sections, values),
    [form.sections, values],
  );
  const formHeaderIconKey = String(
    (form as any)?.appearance?.headerIcon || "sparkles",
  ).trim() as keyof typeof headerIconMap;
  const hideHeaderIcon = (form as any)?.appearance?.hideHeaderIcon === true;
  const formHeaderIconColor = String(
    (form as any)?.appearance?.headerIconColor || "",
  ).trim();
  const formTitleColorRaw = String(
    (form as any)?.appearance?.titleColor || "",
  ).trim();
  const formDescriptionColorRaw = String(
    (form as any)?.appearance?.descriptionColor || "",
  ).trim();
  const formTitleColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(formTitleColorRaw)
    ? formTitleColorRaw
    : "";
  const formDescriptionColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(
    formDescriptionColorRaw,
  )
    ? formDescriptionColorRaw
    : "";
  const HeaderIcon = headerIconMap[formHeaderIconKey] || Sparkles;
  const safeHeaderIconColor = resolveReadableTextColor(
    formHeaderIconColor,
    isDarkMode,
  );

  const uploadedBannerUrl = getFormBannerPublicUrl(form.bannerAssetPath);

  const externalBannerUrl = String(form.bannerUrl || "").trim();

  const safeExternalBannerUrl =
    /^https?:\/\//i.test(externalBannerUrl) ||
    (preview && /^blob:/i.test(externalBannerUrl))
      ? externalBannerUrl
      : "";

  const resolvedBannerUrl = uploadedBannerUrl || safeExternalBannerUrl;

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const syncThemeMode = () => {
      setIsDarkMode(root.classList.contains("dark"));
    };

    syncThemeMode();
    const observer = new MutationObserver(syncThemeMode);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const handleChange = (
    fieldId: string,
    label: string,
    value: string | string[],
  ) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[fieldId];
        return n;
      });
    }
  };

  const validate = () => {
    const newErrors = validateFormValues(form.sections, values);

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview) {
      return;
    }
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const { responses: responsesByFieldId, labels: labelMap } =
        sanitizeVisibleResponses(form.sections, values);

      const submitterNameFieldId = Object.keys(labelMap).find((fieldId) => {
        const humanLabel = stripMarkdownToText(labelMap[fieldId] || "")
          .toLowerCase()
          .trim();

        return humanLabel === "name" || humanLabel === "submitter name";
      });

      const result = await submitPublicFormRequest(
        form.id,
        form.title,
        form.userId ?? "",
        responsesByFieldId,
        labelMap,
        submitterNameFieldId && typeof values[submitterNameFieldId] === "string"
          ? values[submitterNameFieldId]
          : typeof values["name"] === "string"
            ? values["name"]
            : null,
      );

      if (!result.success) {
        if (result.riskLevel === "dangerous") {
          toast.error(
            result.reason ||
              "Your submission was rejected due to safety concerns. Please review your content and try again.",
          );
        } else {
          toast.error(
            result.error || "Failed to submit submission. Please try again.",
          );
        }
        setIsSubmitting(false);
        return;
      }

      if (result.isFlagged && result.riskLevel === "warning") {
        toast.info(
          "Your submission has been received and will be reviewed before being processed.",
        );
      }
      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit submission. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!form || (!form.isActive && !preview)) {
    return (
      <div className="min-h-screen bg-background flex items-start justify-center pt-12">
        <div className="container max-w-2xl py-8">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/20">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="mt-6 text-2xl font-bold">Form Not Found</h2>
            <p className="mt-2 max-w-sm text-muted-foreground">
              This form doesn&apos;t exist or is no longer accepting responses.
            </p>
            <Link href="/">
              <Button variant="outline" className="mt-6 cursor-pointer">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Forgeworks
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container max-w-2xl py-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/20">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h2 className="mt-6 text-2xl font-bold">Submission Submitted!</h2>
            <p className="mt-2 max-w-sm text-muted-foreground">
              Thank you for your submission! The creator will review your
              submission soon.
            </p>
            <Link href="/">
              <Button variant="outline" className="mt-6 cursor-pointer">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Forgeworks
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea
      className={cn(
        "w-full min-w-0",
        preview ? "h-full min-h-[72vh]" : "h-dvh",
      )}
    >
      <div className={appearance.wrapper} style={appearance.wrapperStyle}>
        {isEditorial && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1"
            style={appearance.editorialTopAccentStyle}
          />
        )}

        <div
          className={cn(
            "container w-full min-w-0 max-w-full px-3 sm:px-5 md:px-6",
            appearance.preset.layout,
          )}
        >
          {resolvedBannerUrl && (
            <div
              className={cn(
                "mb-4 w-full overflow-hidden rounded-2xl border border-border/60 bg-card/40",
                isEditorial ? "md:col-span-2" : "mx-auto max-w-5xl",
              )}
            >
              <img
                src={resolvedBannerUrl}
                alt="Form banner"
                className="aspect-[4/1] w-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {isEditorial ? (
            <aside
              className={cn(appearance.preset.sidebar, "order-2 md:order-0")}
            >
              <div
                className={cn("space-y-5", appearance.density.headerSpacing)}
              >
                <div className="flex justify-start">
                  {!hideHeaderIcon && (
                    <div className={appearance.heroIcon}>
                      <HeaderIcon
                        className={cn(
                          "h-6 w-6",
                          !safeHeaderIconColor && appearance.accent.text,
                        )}
                        style={
                          safeHeaderIconColor
                            ? { color: safeHeaderIconColor }
                            : undefined
                        }
                      />
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    "font-bold",
                    appearance.title,
                    !formTitleColor && appearance.accent.text,
                  )}
                  style={formTitleColor ? { color: formTitleColor } : undefined}
                >
                  <MarkdownInlineRenderer
                    content={form.title}
                    className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  />
                </div>
                {form.description && (
                  <MarkdownRenderer
                    content={form.description}
                    className="mt-2 text-sm sm:text-base text-muted-foreground text-left [&>*:last-child]:mb-0"
                    style={
                      formDescriptionColor
                        ? { color: formDescriptionColor }
                        : undefined
                    }
                  />
                )}
              </div>
            </aside>
          ) : (
            <div
              className={cn("mx-auto w-full min-w-0", appearance.preset.layout)}
            >
              <div
                className={cn("text-center", appearance.density.headerSpacing)}
              >
                <div className="mb-4 flex justify-center">
                  {!hideHeaderIcon && (
                    <div className={appearance.heroIcon}>
                      <HeaderIcon
                        className={cn(
                          "h-6 w-6",
                          !safeHeaderIconColor && appearance.accent.text,
                        )}
                        style={
                          safeHeaderIconColor
                            ? { color: safeHeaderIconColor }
                            : undefined
                        }
                      />
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    "font-bold rendered-markdown",
                    appearance.title,
                    !formTitleColor && appearance.accent.text,
                  )}
                  style={formTitleColor ? { color: formTitleColor } : undefined}
                >
                  <MarkdownRenderer
                    content={form.title}
                    className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  />
                </div>
                {form.description && (
                  <MarkdownRenderer
                    content={form.description}
                    className="mt-2 text-sm sm:text-base text-muted-foreground text-left [&>*:last-child]:mb-0"
                    style={
                      formDescriptionColor
                        ? { color: formDescriptionColor }
                        : undefined
                    }
                  />
                )}
              </div>
            </div>
          )}

          <Card
            className={cn("min-w-0 max-w-full", appearance.surface)}
            style={appearance.surfaceStyle}
          >
            <CardContent className="min-w-0 p-3 sm:p-5 md:p-8">
              <form
                onSubmit={handleSubmit}
                className={appearance.density.formGap}
              >
                {form.sections.map((section) => (
                  <SectionRenderer
                    key={section.id}
                    section={section}
                    values={values}
                    errors={errors}
                    appearance={appearance}
                    preview={preview}
                    visibleFieldIds={visibleFieldIds}
                    onChange={(id: string, label: string, v: any) =>
                      handleChange(id, label, v)
                    }
                  />
                ))}

                <Button
                  type={preview ? "button" : "submit"}
                  className={cn(
                    "w-full cursor-pointer",
                    appearance.submitButton,
                  )}
                  style={appearance.submitButtonStyle}
                  size="lg"
                  disabled={isSubmitting && !preview}
                >
                  {isSubmitting ? (
                    <>Submitting...</>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {!preview && (
            <div
              className={cn(
                "mt-6 sm:mt-8 w-full",
                isEditorial && "md:col-span-2",
              )}
            >
              <Card
                className={cn(
                  "w-full border border-border/60 bg-card/90 shadow-sm",
                  appearance.surface,
                )}
                style={appearance.surfaceStyle}
              >
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <div className="mb-3 space-y-1">
                    <p className="text-sm font-medium">
                      Need to tell us something?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Send a suggestion or report a bug without interrupting the
                      form above.
                    </p>
                  </div>
                  <FeedbackActions
                    compact
                    context={
                      feedbackContext ?? {
                        sourcePage: form.title,
                        sourceLabel: "Public form",
                        relatedId: form.id,
                      }
                    }
                  />
                </CardContent>
              </Card>
            </div>
          )}

          <div
            className={cn(
              "mt-8 pt-8 border-t text-center text-xs text-muted-foreground",
              isEditorial && "md:col-span-2",
            )}
          >
            <p>
              Powered by{" "}
              <Link
                href="/"
                className={cn(
                  "font-medium hover:underline underline-offset-2",
                  appearance.accent.text,
                )}
              >
                Forgeworks
              </Link>{" "}
              — Bot Creator Toolkit
            </p>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
