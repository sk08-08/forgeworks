"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  GitCommitHorizontal,
  Loader2,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BotVersion } from "@/features/bots/types/bot-types";
import { FIELD_LABELS } from "../collaboration-config";
import { BotFieldDiff } from "../bot-field-diff";
import { changedFieldsBetween, normalizeVersionSnapshot } from "../bot-diff";
import { useCollaborationWorkspace } from "../collaboration-workspace-context";
import { ViewHeading } from "./activity-view";

const SOURCE_LABELS: Record<BotVersion["source"], string> = {
  baseline: "Baseline",
  create: "Created",
  edit: "Saved edit",
  change_request: "Approved change",
  restore: "Restored version",
};

const CURRENT_TARGET = "__current__";

export function HistoryView() {
  const {
    baseline,
    dirtyFields,
    versions,
    restoringVersionId,
    userRole,
    refreshVersions,
    restoreVersion,
  } = useCollaborationWorkspace();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareTargetId, setCompareTargetId] = useState(CURRENT_TARGET);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (versions.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !versions.some((version) => version.id === selectedId)) {
      setSelectedId(versions[0].id);
    }
  }, [selectedId, versions]);

  useEffect(() => {
    if (
      compareTargetId !== CURRENT_TARGET &&
      !versions.some((version) => version.id === compareTargetId)
    ) {
      setCompareTargetId(CURRENT_TARGET);
    }
  }, [compareTargetId, versions]);

  const selected =
    versions.find((version) => version.id === selectedId) ||
    versions[0] ||
    null;
  const latest = versions[0] || null;
  const canRestore = userRole === "owner" || userRole === "co_owner";

  const versionNumberById = useMemo(
    () =>
      new Map(versions.map((version) => [version.id, version.version_number])),
    [versions],
  );

  const selectedValues = useMemo(
    () => (selected ? normalizeVersionSnapshot(selected.snapshot) : null),
    [selected],
  );

  const compareVersion =
    compareTargetId === CURRENT_TARGET
      ? null
      : versions.find((version) => version.id === compareTargetId) || null;

  const compareValues = useMemo(() => {
    if (compareTargetId === CURRENT_TARGET) return baseline;
    return compareVersion
      ? normalizeVersionSnapshot(compareVersion.snapshot)
      : baseline;
  }, [baseline, compareTargetId, compareVersion]);

  const changedFields = useMemo(() => {
    if (!selectedValues) return [];
    return changedFieldsBetween(selectedValues, compareValues);
  }, [compareValues, selectedValues]);

  const changedAgainstCurrent = useMemo(() => {
    if (!selectedValues) return [];
    return changedFieldsBetween(selectedValues, baseline);
  }, [baseline, selectedValues]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshVersions();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRestore = async () => {
    if (!selected) return;
    const restored = await restoreVersion(selected.id);
    if (restored) {
      setSelectedId(null);
      setCompareTargetId(CURRENT_TARGET);
    }
  };

  const compareLabel = compareVersion
    ? `Version ${compareVersion.version_number}`
    : "Current bot";

  return (
    <div>
      <ViewHeading
        title="History"
        description="Compare immutable snapshots field-by-field and restore safely without rewriting history."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="cursor-pointer"
          >
            {refreshing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        }
      />

      {versions.length === 0 ? (
        <div className="rounded-[1.4rem] border border-border/60 bg-card/65 p-10 text-center">
          <Clock3 className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium">No versions yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
            A snapshot will appear after the bot is saved.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[1.4rem] border border-border/60 bg-card/65">
            <div className="border-b border-border/50 px-4 py-3">
              <p className="text-sm font-medium">Versions</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {versions.length} snapshot{versions.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-2">
              {versions.map((version, index) => {
                const active = version.id === selected?.id;
                const creator =
                  version.creator_display_name ||
                  version.creator_username ||
                  "Unknown user";

                return (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => setSelectedId(version.id)}
                    className={cn(
                      "flex w-full cursor-pointer gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                      active
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/70">
                      {version.creator_avatar_url ? (
                        <img
                          src={version.creator_avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <GitCommitHorizontal className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          v{version.version_number}
                        </span>
                        {index === 0 && (
                          <Badge variant="secondary" className="h-5 text-[9px]">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs">
                        {SOURCE_LABELS[version.source]}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground/80">
                        {creator} ·{" "}
                        {new Date(version.created_at).toLocaleString()}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selected && selectedValues && (
            <div className="min-w-0 space-y-4">
              <div className="rounded-[1.4rem] border border-border/60 bg-card/65 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold tracking-tight">
                        Version {selected.version_number}
                      </h3>
                      <Badge variant="outline">
                        {SOURCE_LABELS[selected.source]}
                      </Badge>
                      {selected.id === latest?.id && (
                        <Badge variant="secondary">
                          <Check className="mr-1 h-3 w-3" /> Current
                        </Badge>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {selected.creator_display_name ||
                        selected.creator_username ||
                        "Unknown user"}
                      {" · "}
                      {new Date(selected.created_at).toLocaleString()}
                    </p>

                    {selected.restored_from_version_id && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Restored from version{" "}
                        {versionNumberById.get(
                          selected.restored_from_version_id,
                        ) ?? "an earlier snapshot"}
                        .
                      </p>
                    )}
                  </div>

                  {canRestore && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={
                            changedAgainstCurrent.length === 0 ||
                            dirtyFields.size > 0 ||
                            restoringVersionId !== null
                          }
                          className="cursor-pointer disabled:cursor-not-allowed"
                        >
                          {restoringVersionId === selected.id ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                          )}
                          Restore
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Restore version {selected.version_number}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            The current bot will be replaced with this snapshot.
                            The restore itself becomes a new version, so no
                            history is deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="cursor-pointer">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="cursor-pointer"
                            onClick={() => void handleRestore()}
                          >
                            Restore version
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                {dirtyFields.size > 0 && canRestore && (
                  <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    Save or discard your local draft before restoring a version.
                  </p>
                )}
              </div>

              <div className="rounded-[1.4rem] border border-border/60 bg-card/65">
                <div className="flex flex-col gap-3 border-b border-border/50 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-medium">Compare versions</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Version {selected.version_number} → {compareLabel}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={compareTargetId}
                      onValueChange={setCompareTargetId}
                    >
                      <SelectTrigger className="h-9 w-[190px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CURRENT_TARGET}>
                          Current bot
                        </SelectItem>
                        {versions
                          .filter((version) => version.id !== selected.id)
                          .map((version) => (
                            <SelectItem key={version.id} value={version.id}>
                              Version {version.version_number}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Badge variant="secondary">
                      {changedFields.length} changed field
                      {changedFields.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </div>

                {changedFields.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    These two snapshots match.
                  </div>
                ) : (
                  <div className="space-y-4 p-4 sm:p-5">
                    {changedFields.map((field) => (
                      <BotFieldDiff
                        key={field}
                        field={field}
                        before={selectedValues[field]}
                        after={compareValues[field]}
                        beforeLabel={`v${selected.version_number}`}
                        afterLabel={
                          compareVersion
                            ? `v${compareVersion.version_number}`
                            : "Current"
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              {selected.changed_fields.length > 0 && (
                <div className="rounded-[1.4rem] border border-border/60 bg-card/65 p-5">
                  <p className="text-sm font-medium">Recorded change set</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selected.changed_fields.map((field) => (
                      <Badge key={field} variant="outline">
                        {FIELD_LABELS[field as keyof typeof FIELD_LABELS] ||
                          field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
