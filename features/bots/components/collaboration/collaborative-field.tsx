"use client";

import React, { useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CollaborationFieldPresence } from "./collaboration-presence";
import { FIELD_LABELS } from "./collaboration-config";
import { useCollaborationWorkspace } from "./collaboration-workspace-context";
import type { BotCollaborationField } from "@/features/bots/lib/collaboration-permissions";

export function CollaborativeField({
  field,
  children,
  className,
}: {
  field: BotCollaborationField;
  children: React.ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const {
    realtime,
    dirtyFields,
    remoteConflicts,
    requestFieldAccess,
    releaseField,
    resolveConflict,
  } = useCollaborationWorkspace();

  const mine = realtime.ownsFieldLock(field);
  const claiming = realtime.claimingField === field;
  const lockedByOther = realtime.isFieldLockedByOther(field);
  const dirty = dirtyFields.has(field);
  const conflict = remoteConflicts.has(field);

  const focusFirstControl = () => {
    window.requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLElement>(
          'input:not([disabled]), textarea:not([disabled]), [contenteditable="true"], button:not([disabled]), [role="radio"]:not([aria-disabled="true"])',
        )
        ?.focus();
    });
  };

  return (
    <div
      ref={rootRef}
      data-collaboration-field={field}
      className={cn(
        "group/field rounded-2xl border border-transparent p-3 transition-all duration-200 sm:p-4",
        !lockedByOther &&
          !conflict &&
          "hover:border-border/55 hover:bg-muted/[0.12]",
        mine && "border-emerald-500/15 bg-emerald-500/[0.018]",
        dirty && "border-amber-500/25 bg-amber-500/[0.035]",
        conflict && "border-orange-500/35 bg-orange-500/[0.05]",
        lockedByOther && "bg-muted/20",
        className,
      )}
      onMouseDownCapture={(event) => {
        if (mine || claiming) return;
        const target = event.target as HTMLElement;
        if (target.closest('[data-collaboration-action="true"]')) return;
        event.preventDefault();
        event.stopPropagation();
        void requestFieldAccess(field).then((claimed) => {
          if (claimed) focusFirstControl();
        });
      }}
      onFocusCapture={() => {
        if (mine) realtime.activateField(field);
      }}
      onBlurCapture={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && event.currentTarget.contains(next)) return;
        void releaseField(field);
      }}
    >
      <div className="mb-2 flex min-h-5 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-medium">{FIELD_LABELS[field]}</span>
          {dirty && (
            <span className="animate-in fade-in-0 text-[10px] font-medium text-amber-500 duration-150">
              Modified
            </span>
          )}
          {conflict && (
            <span className="inline-flex animate-in items-center gap-1 fade-in-0 text-[10px] font-medium text-orange-500 duration-150">
              <AlertTriangle className="h-3 w-3" />
              Updated remotely
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 text-[10px]">
          {claiming ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Acquiring…
            </span>
          ) : mine ? (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Editing
            </span>
          ) : (
            <CollaborationFieldPresence
              lock={realtime.getFieldLock(field)}
              users={realtime.presenceUsers}
              currentUserId={realtime.currentUserId}
            />
          )}
        </div>
      </div>

      {children}

      {conflict && (
        <div
          data-collaboration-action="true"
          className="mt-3 flex animate-in flex-wrap items-center gap-2 rounded-xl border border-orange-500/20 bg-background/80 p-2.5 text-xs fade-in-0 slide-in-from-top-1 duration-200"
        >
          <span className="mr-auto text-muted-foreground">
            A saved remote update arrived while you had a local draft.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 cursor-pointer transition-all duration-200 active:scale-[0.97]"
            onClick={() => resolveConflict(field, "remote")}
          >
            Use latest
          </Button>
          <Button
            size="sm"
            className="h-7 cursor-pointer transition-all duration-200 active:scale-[0.97]"
            onClick={() => resolveConflict(field, "local")}
          >
            Keep mine
          </Button>
        </div>
      )}
    </div>
  );
}
