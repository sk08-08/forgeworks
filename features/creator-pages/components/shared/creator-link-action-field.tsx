"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Hash,
  Link2,
  Route,
  TriangleAlert,
} from "lucide-react";

import { Input } from "@/components/ui/input";
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
  inferCreatorPageLinkMode,
  normalizeCreatorPageLinkForMode,
} from "@/features/creator-pages/lib/creator-page-links";
import type { CreatorInspectorAnchorOption } from "@/features/creator-pages/types/creator-page-types";

type LinkMode = "external" | "internal" | "anchor";

interface CreatorLinkActionFieldProps {
  title: string;
  label: string;
  href: string;
  onLabelChange: (value: string) => void;
  onHrefChange: (value: string) => void;
  labelPlaceholder?: string;
  anchorOptions?: CreatorInspectorAnchorOption[];
}

const MODE_META: Record<LinkMode, { placeholder: string; icon: typeof Link2 }> =
  {
    external: {
      placeholder: "example.com/page",
      icon: ExternalLink,
    },
    internal: {
      placeholder: "/profile/username",
      icon: Route,
    },
    anchor: {
      placeholder: "#characters",
      icon: Hash,
    },
  };

export function CreatorLinkActionField({
  title,
  label,
  href,
  onLabelChange,
  onHrefChange,
  labelPlaceholder = "Button text",
  anchorOptions = [],
}: CreatorLinkActionFieldProps) {
  const [mode, setMode] = useState<LinkMode>(() =>
    inferCreatorPageLinkMode(href),
  );

  const validation = useMemo(
    () => normalizeCreatorPageLinkForMode(href, mode),
    [href, mode],
  );

  const hasHref = Boolean(href.trim());
  const valid = hasHref && validation.valid;
  const Icon = MODE_META[mode].icon;

  const normalizeNow = () => {
    if (!href.trim()) return;

    const result = normalizeCreatorPageLinkForMode(href, mode);

    if (result.valid && result.href !== null) {
      onHrefChange(result.href);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/[0.12] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[11px] font-medium">{title}</p>
        <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Label</Label>
        <Input
          value={label}
          onChange={(event) => onLabelChange(event.target.value)}
          placeholder={labelPlaceholder}
          className="h-9"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Destination</Label>
        <Select
          value={mode}
          onValueChange={(value) => {
            const nextMode = value as LinkMode;
            setMode(nextMode);

            if (!href.trim()) return;

            const result = normalizeCreatorPageLinkForMode(href, nextMode);

            if (result.valid && result.href !== null) {
              onHrefChange(result.href);
            }
          }}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="external">External URL</SelectItem>
            <SelectItem value="internal">Forgeworks page</SelectItem>
            <SelectItem value="anchor">Section on this page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "anchor" && anchorOptions.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Choose a block</Label>

          <Select
            value={
              anchorOptions.some((option) => option.value === href)
                ? href
                : undefined
            }
            onValueChange={onHrefChange}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select a block..." />
            </SelectTrigger>

            <SelectContent>
              {anchorOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="text-[10px] leading-relaxed text-muted-foreground">
            The anchor is generated from the block and can be customized in the
            Block inspector.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">
          {mode === "external"
            ? "URL"
            : mode === "internal"
              ? "Path"
              : "Anchor"}
        </Label>

        <div className="relative min-w-0">
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={href}
            onChange={(event) => onHrefChange(event.target.value)}
            onBlur={normalizeNow}
            placeholder={MODE_META[mode].placeholder}
            className={cn(
              "h-9 min-w-0 pl-9 pr-9 text-xs",
              hasHref &&
                (valid
                  ? "border-emerald-500/45 focus-visible:ring-emerald-500/20"
                  : "border-destructive/55 focus-visible:ring-destructive/20"),
            )}
            spellCheck={false}
          />

          {hasHref && (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              {valid ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <TriangleAlert className="h-3.5 w-3.5 text-destructive" />
              )}
            </div>
          )}
        </div>

        <p
          className={cn(
            "min-h-4 break-all text-[10px] leading-relaxed",
            !hasHref && "text-muted-foreground",
            hasHref && valid && "text-emerald-600 dark:text-emerald-400",
            hasHref && !valid && "text-destructive",
          )}
        >
          {!hasHref ? "No destination set." : validation.message}
        </p>
      </div>
    </div>
  );
}
