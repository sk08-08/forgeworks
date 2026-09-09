"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WORKSPACE_NAV_ITEMS } from "./collaboration-config";
import { useCollaborationWorkspace } from "./collaboration-workspace-context";

export function CollaborationSidebar() {
  const { activeView, setActiveView, changeRequests, comments, collaborators } =
    useCollaborationWorkspace();

  const counts: Partial<Record<string, number>> = {
    changes: changeRequests.filter(
      (item) =>
        item.status === "pending" || item.status === "changes_requested",
    ).length,
    discussion: comments.length,
    team: collaborators.filter((item) => item.status === "accepted").length,
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden min-h-0 w-56 shrink-0 border-r border-border/60 bg-muted/[0.12] lg:flex lg:flex-col">
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {WORKSPACE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeView;
            const count = counts[item.id] ?? 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex w-full cursor-pointer items-center gap-3",
                  "rounded-xl px-3 py-2.5 text-left text-sm",
                  "outline-none transition-all duration-200",
                  "focus-visible:ring-2 focus-visible:ring-primary/40",
                  "active:scale-[0.985]",
                  active
                    ? "bg-primary/10 font-medium text-primary shadow-sm"
                    : [
                        "text-muted-foreground",
                        "hover:translate-x-0.5",
                        "hover:bg-muted/60",
                        "hover:text-foreground",
                      ],
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200",
                    !active && "group-hover:scale-105",
                  )}
                />

                <span className="min-w-0 flex-1 truncate">{item.label}</span>

                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "h-5 min-w-5 justify-center rounded-full px-1.5 text-[9px]",
                      active && "bg-primary/15 text-primary",
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile navigation */}
      <div className="sticky top-16 z-30 border-b border-border/60 bg-background/90 px-3 py-2 backdrop-blur-xl lg:hidden">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {WORKSPACE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeView;
            const count = counts[item.id] ?? 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 cursor-pointer items-center gap-1.5",
                  "rounded-lg px-2.5 py-2 text-xs",
                  "outline-none transition-all duration-200",
                  "focus-visible:ring-2 focus-visible:ring-primary/40",
                  "active:scale-[0.97]",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>

                {count > 0 && (
                  <span
                    className={cn(
                      "ml-0.5 min-w-4 rounded-full px-1 text-center text-[9px]",
                      active
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
