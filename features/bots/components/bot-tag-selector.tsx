"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  canonicalizeBotTag,
  getBotTagMeta,
  getOfficialBotTagSuggestions,
  normalizeBotTags,
} from "@/features/bots/lib/bot-tags";
import { TagVisualIcon } from "./bot-tag-badge";

interface BotTagSelectorProps {
  tags: string[];
  onTagsChange: (nextTags: string[]) => void;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  showInput?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  emptyLabel?: string;
  className?: string;
}

export function BotTagSelector({
  tags,
  onTagsChange,
  inputValue,
  onInputValueChange,
  showInput = true,
  disabled,
  placeholder = "Add a tag...",
  maxLength = 40,
  emptyLabel = "No tags added",
  className,
}: BotTagSelectorProps) {
  const [open, setOpen] = useState(false);
  const inputWrapRef = useRef<HTMLDivElement | null>(null);
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>();

  const suggestions = useMemo(
    () => getOfficialBotTagSuggestions(inputValue, tags),
    [inputValue, tags],
  );

  const trimmedInput = inputValue.trim();
  const canonicalInput = canonicalizeBotTag(trimmedInput);
  const selectedTagKeys = useMemo(
    () => new Set(tags.map((tag) => canonicalizeBotTag(tag).toLowerCase())),
    [tags],
  );
  const canAddTypedTag =
    !!trimmedInput && !selectedTagKeys.has(canonicalInput.toLowerCase());

  useEffect(() => {
    const element = inputWrapRef.current;
    if (!element) return;

    const updateWidth = () => setPopoverWidth(element.offsetWidth);
    updateWidth();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const commitTag = (rawValue: string) => {
    const canonical = canonicalizeBotTag(rawValue);
    if (!canonical) return;
    onTagsChange(normalizeBotTags([...tags, canonical]));
    onInputValueChange("");
    setOpen(true);
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleEnter = () => {
    if (!trimmedInput) return;
    const preferred = suggestions[0]?.label || trimmedInput;
    commitTag(preferred);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showInput && (
        <Popover open={open && !disabled} onOpenChange={setOpen}>
          <PopoverAnchor asChild>
            <div ref={inputWrapRef} className="flex min-w-0 gap-2">
              <Input
                value={inputValue}
                onChange={(e) => {
                  onInputValueChange(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleEnter();
                  } else if (e.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder={placeholder}
                className="min-w-0 text-sm"
                maxLength={maxLength}
                disabled={disabled}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleEnter()}
                className="cursor-pointer shrink-0"
                disabled={disabled || !trimmedInput}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </PopoverAnchor>

          <PopoverContent
            align="start"
            side="bottom"
            sideOffset={8}
            className="z-80 max-w-[calc(100vw-1.5rem)] overflow-hidden border border-border/70 bg-popover p-0 shadow-md"
            style={
              popoverWidth
                ? { width: `min(${popoverWidth}px, calc(100vw - 1.5rem))` }
                : undefined
            }
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => {
              if (
                inputWrapRef.current &&
                inputWrapRef.current.contains(event.target as Node)
              ) {
                event.preventDefault();
              }
            }}
          >
            <div
              className="max-h-72 overflow-y-auto overscroll-contain p-2 [touch-action:pan-y]"
              style={{ WebkitOverflowScrolling: "touch" }}
              onWheelCapture={(event) => event.stopPropagation()}
              onTouchMoveCapture={(event) => event.stopPropagation()}
            >
              {suggestions.length > 0 && (
                <div className="space-y-1">
                  <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Official tags
                  </p>
                  {suggestions.map((tag) => {
                    const meta = getBotTagMeta(tag.label);
                    return (
                      <button
                        key={tag.label}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => commitTag(tag.label)}
                        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                              meta.badgeClassName,
                            )}
                          >
                            <TagVisualIcon
                              iconKey={meta.icon}
                              className="h-3.5 w-3.5"
                            />
                          </span>
                          <span className="truncate">{meta.label}</span>
                        </span>
                        <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              )}

              {canAddTypedTag && (
                <div
                  className={cn(
                    "space-y-1",
                    suggestions.length > 0 && "mt-2 border-t pt-2",
                  )}
                >
                  <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Custom tag
                  </p>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commitTag(trimmedInput)}
                    className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60 text-foreground">
                        <Tag className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate">
                        Add{" "}
                        {canonicalInput !== trimmedInput
                          ? canonicalInput
                          : trimmedInput}
                      </span>
                    </span>
                    <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </div>
              )}

              {suggestions.length === 0 && !canAddTypedTag && (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  No tags to suggest right now.
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      <div className="flex min-w-0 flex-wrap gap-2 pt-1">
        {tags.map((tag) => {
          const meta = getBotTagMeta(tag);
          return (
            <Badge
              key={tag}
              variant="outline"
              className={cn(
                "max-w-full min-w-0 gap-1.5 border",
                meta.badgeClassName,
              )}
            >
              <TagVisualIcon iconKey={meta.icon} className="h-3 w-3 shrink-0" />
              <span className="min-w-0 truncate">{meta.label}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-current/70 transition-colors hover:bg-black/5 hover:text-current dark:hover:bg-white/10"
                  aria-label={`Remove ${meta.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          );
        })}
        {tags.length === 0 && (
          <span className="text-xs text-muted-foreground">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}
