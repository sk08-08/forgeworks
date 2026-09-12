"use client";

import {
  ArrowLeft,
  Check,
  ExternalLink,
  Eye,
  Layers3,
  Loader2,
  Monitor,
  Save,
  SlidersHorizontal,
  Smartphone,
  Tablet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { FormBuilderViewport } from "./form-builder-types";

export type FormBuilderWorkspaceView = "structure" | "preview" | "inspector";

const viewportOptions = [
  ["desktop", Monitor],
  ["tablet", Tablet],
  ["mobile", Smartphone],
] as const satisfies readonly [
  readonly [FormBuilderViewport, typeof Monitor],
  readonly [FormBuilderViewport, typeof Tablet],
  readonly [FormBuilderViewport, typeof Smartphone],
];

interface FormBuilderHeaderProps {
  title: string;

  status: "draft" | "active" | "inactive";

  subtitle: string;

  viewport: FormBuilderViewport;

  workspaceView: FormBuilderWorkspaceView;

  saving: boolean;

  isDirty: boolean;

  canSave: boolean;

  justSaved: boolean;

  publicHref: string | null;

  saveLabel: string;

  onBack: () => void;

  onViewportChange: (viewport: FormBuilderViewport) => void;

  onWorkspaceViewChange: (view: FormBuilderWorkspaceView) => void;

  onSave: () => void;
}

export function FormBuilderHeader({
  title,
  status,
  subtitle,
  viewport,
  workspaceView,
  saving,
  isDirty,
  canSave,
  justSaved,
  publicHref,
  saveLabel,
  onBack,
  onViewportChange,
  onWorkspaceViewChange,
  onSave,
}: FormBuilderHeaderProps) {
  const statusLabel =
    status === "draft" ? "Draft" : status === "active" ? "Active" : "Inactive";

  const buttonLabel = saving ? "Saving..." : justSaved ? "Saved" : saveLabel;

  const workspaceOptions = [
    ["structure", Layers3, "Structure"],
    ["preview", Eye, "Preview"],
    ["inspector", SlidersHorizontal, "Edit"],
  ] as const satisfies readonly [
    readonly [FormBuilderWorkspaceView, typeof Layers3, string],
    readonly [FormBuilderWorkspaceView, typeof Eye, string],
    readonly [FormBuilderWorkspaceView, typeof SlidersHorizontal, string],
  ];

  return (
    <header className="sticky top-0 z-[70] border-b border-border/70 bg-background px-3 py-3 sm:px-5">
      <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-xl">
                {title}
              </h1>

              <Badge
                variant={status === "active" ? "default" : "secondary"}
                className="shrink-0 rounded-full"
              >
                {statusLabel}
              </Badge>

              {isDirty && !saving && (
                <span className="hidden shrink-0 items-center gap-1.5 text-[10px] font-medium text-amber-600 sm:inline-flex dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  Unsaved changes
                </span>
              )}
            </div>

            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <div
            className={cn(
              "h-9 items-center rounded-full border border-border/70 bg-muted/25 p-1",
              workspaceView === "preview" ? "flex" : "hidden xl:flex",
            )}
          >
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

          {publicHref && (
            <a href={publicHref} target="_blank" rel="noopener noreferrer">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 cursor-pointer rounded-full px-2.5 sm:px-3"
              >
                <ExternalLink className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Public form</span>
              </Button>
            </a>
          )}

          <Button
            type="button"
            size="sm"
            className="h-9 cursor-pointer rounded-full px-4"
            disabled={saving || !canSave}
            onClick={onSave}
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : justSaved ? (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}

            {buttonLabel}
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl border border-border/70 bg-muted/20 p-1 xl:hidden">
        {workspaceOptions.map(([value, Icon, label]) => {
          const active = workspaceView === value;

          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              className={cn(
                "flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
              onClick={() => onWorkspaceViewChange(value)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
