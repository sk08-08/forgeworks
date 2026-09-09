"use client";

import { ArrowLeft, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { roleConfig } from "@/features/bots/types/bot-types";
import { cn } from "@/lib/utils";
import { CollaborationPresence } from "./collaboration-presence";
import { useCollaborationWorkspace } from "./collaboration-workspace-context";

const interactiveButtonClass =
  "cursor-pointer transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed";

export function CollaborationHeader() {
  const {
    onBack,
    values,
    userRole,
    tokenCount,
    dirtyFields,
    changeRequests,
    exportBot,
    realtime,
    setActiveView,
  } = useCollaborationWorkspace();

  const pending = changeRequests.filter(
    (request) =>
      request.status === "pending" || request.status === "changes_requested",
  ).length;

  return (
    <header className="z-40 border-b border-border/60 bg-background/88 backdrop-blur-xl supports-[backdrop-filter]:bg-background/78">
      <div className="flex min-h-16 items-center gap-2.5 px-3 sm:gap-3 sm:px-5 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className={cn(
            interactiveButtonClass,
            "group shrink-0 rounded-xl hover:-translate-x-0.5 hover:bg-muted/70",
          )}
          aria-label="Back to Bot Manager"
          title="Back to Bot Manager"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm transition-transform duration-200 hover:scale-[1.03]">
            {values.image_url ? (
              <img
                src={values.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                {values.name.slice(0, 1).toUpperCase() || "B"}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-sm font-semibold sm:text-base">
                {values.name || "Untitled bot"}
              </h1>
              {userRole !== "owner" && (
                <Badge
                  variant="outline"
                  className={cn(
                    "hidden text-[10px] sm:inline-flex",
                    roleConfig[userRole]?.className,
                  )}
                >
                  {roleConfig[userRole]?.label || userRole}
                </Badge>
              )}
            </div>

            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground sm:text-xs">
              <span>{tokenCount.toLocaleString()} tokens</span>
              {dirtyFields.size > 0 && (
                <>
                  <span>•</span>
                  <span className="font-medium text-amber-500">
                    {dirtyFields.size} unsaved
                  </span>
                </>
              )}
              {pending > 0 && (
                <>
                  <span>•</span>
                  <span>{pending} open changes</span>
                </>
              )}
            </div>
          </div>
        </div>

        <CollaborationPresence
          users={realtime.presenceUsers}
          connectionStatus={realtime.connectionStatus}
          currentUserId={realtime.currentUserId}
        />

        {/* Desktop export */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => void exportBot()}
          className={cn(
            interactiveButtonClass,
            "group hidden rounded-xl hover:border-primary/30 hover:bg-primary/[0.04] sm:inline-flex",
          )}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export
        </Button>

        {/* Mobile export */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void exportBot()}
          className={cn(
            interactiveButtonClass,
            "rounded-xl hover:bg-muted/70 sm:hidden",
          )}
          aria-label="Export character card"
          title="Export character card"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
