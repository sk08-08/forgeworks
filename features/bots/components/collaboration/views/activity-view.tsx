"use client";

import { useMemo, useState } from "react";
import { Activity, Filter, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACTIVITY_LABELS } from "../collaboration-config";
import { useCollaborationWorkspace } from "../collaboration-workspace-context";

const filters = ["all", "edits", "reviews", "team", "discussion"] as const;
type FilterKey = (typeof filters)[number];

function bucket(action: string): FilterKey {
  if (
    action === "edited" ||
    action === "field_saved" ||
    action === "version_restored"
  )
    return "edits";
  if (action.startsWith("change_request")) return "reviews";
  if (action.startsWith("collaborator") || action === "role_changed")
    return "team";
  if (action === "commented") return "discussion";
  return "all";
}

export function ActivityView() {
  const { activity, refreshActivity } = useCollaborationWorkspace();
  const [filter, setFilter] = useState<FilterKey>("all");
  const filtered = useMemo(
    () =>
      filter === "all"
        ? activity
        : activity.filter((item) => bucket(item.action) === filter),
    [activity, filter],
  );
  return (
    <div>
      <ViewHeading
        title="Activity"
        description="A chronological audit trail of work and team actions."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshActivity()}
          >
            <Activity className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={filter === item ? "secondary" : "ghost"}
            onClick={() => setFilter(item)}
            className="capitalize"
          >
            <Filter className="mr-1.5 h-3 w-3" />
            {item}
          </Button>
        ))}
      </div>
      <div className="overflow-hidden rounded-[1.4rem] border border-border/60 bg-card/65">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No activity in this filter.
          </div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 border-b border-border/40 p-4 last:border-b-0 hover:bg-muted/20"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                {entry.avatar_url ? (
                  <img
                    src={entry.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">
                    {entry.display_name || entry.username || "Someone"}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {ACTIVITY_LABELS[entry.action] ||
                      entry.action.replaceAll("_", " ")}
                  </span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
export function ViewHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
