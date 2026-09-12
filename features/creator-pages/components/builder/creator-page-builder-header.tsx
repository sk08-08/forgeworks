"use client";

import {
  ArrowLeft,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Monitor,
  Save,
  Smartphone,
  Tablet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type {
  CreatorBuilderViewport,
  CreatorPage,
} from "@/features/creator-pages/types/creator-page-types";

interface CreatorPageBuilderHeaderProps {
  page: CreatorPage;
  title: string;
  slug: string;
  viewport: CreatorBuilderViewport;
  saving: boolean;
  onViewportChange: (viewport: CreatorBuilderViewport) => void;
  onBack: () => void;
  onTogglePublish: () => void;
  onSave: () => void;
}

const viewportOptions = [
  ["desktop", Monitor],
  ["tablet", Tablet],
  ["mobile", Smartphone],
] as const satisfies readonly [
  readonly [CreatorBuilderViewport, typeof Monitor],
  readonly [CreatorBuilderViewport, typeof Tablet],
  readonly [CreatorBuilderViewport, typeof Smartphone],
];

export function CreatorPageBuilderHeader({
  page,
  title,
  slug,
  viewport,
  saving,
  onViewportChange,
  onBack,
  onTogglePublish,
  onSave,
}: CreatorPageBuilderHeaderProps) {
  return (
    <div className="sticky top-0 z-[70] border-b border-border/70 bg-background px-3 py-3 sm:px-5">
      <div className="mx-auto flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 cursor-pointer rounded-full"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                {title || "Untitled Page"}
              </h1>
              <Badge
                variant={page.is_published ? "default" : "secondary"}
                className="shrink-0 rounded-full"
              >
                {page.is_published ? "Published" : "Draft"}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              /page/{slug || page.slug}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <div className="flex h-9 items-center rounded-full border border-border/70 bg-muted/25 p-1">
            {viewportOptions.map(([value, Icon]) => {
              const active = viewport === value;

              return (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-pressed={active}
                  className={cn(
                    "h-7 w-8 cursor-pointer rounded-full transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => onViewportChange(value)}
                  title={`${value[0].toUpperCase()}${value.slice(1)} preview`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Button>
              );
            })}
          </div>

          {page.is_published && (
            <a
              href={`/page/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 cursor-pointer rounded-full px-3"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Public page
              </Button>
            </a>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 cursor-pointer rounded-full px-3"
            onClick={onTogglePublish}
          >
            {page.is_published ? (
              <>
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Publish
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            className="h-9 cursor-pointer rounded-full px-4"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
