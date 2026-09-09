"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  GitPullRequest,
  MessageSquareWarning,
  RefreshCcw,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  BotChangeRequest,
  BotVersionSnapshot,
} from "@/features/bots/types/bot-types";
import type { BotCollaborationField } from "@/features/bots/lib/collaboration-permissions";
import { FIELD_LABELS } from "../collaboration-config";
import { BotFieldDiff } from "../bot-field-diff";
import {
  diffValueEquals,
  normalizeVersionSnapshot,
} from "../bot-diff";
import { useCollaborationWorkspace } from "../collaboration-workspace-context";
import type { WorkspaceBotValues } from "../collaboration-types";
import { ViewHeading } from "./activity-view";

const tabs = ["open", "approved", "rejected", "all"] as const;
type Tab = (typeof tabs)[number];

export function ChangesView() {
  const {
    changeRequests,
    baseline,
    canReview,
    approveRequest,
    requestChanges,
    rejectRequest,
    refreshChangeRequests,
  } = useCollaborationWorkspace();

  const [tab, setTab] = useState<Tab>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<"changes" | "reject" | null>(null);
  const [reviewText, setReviewText] = useState("");

  const filtered = useMemo(
    () =>
      changeRequests.filter((item) =>
        tab === "all"
          ? true
          : tab === "open"
            ? item.status === "pending" || item.status === "changes_requested"
            : item.status === tab,
      ),
    [changeRequests, tab],
  );

  const selected =
    changeRequests.find((item) => item.id === (selectedId || filtered[0]?.id)) ||
    null;

  const submitReview = async () => {
    if (!selected || !reviewMode) return;
    const ok =
      reviewMode === "changes"
        ? await requestChanges(selected.id, reviewText)
        : await rejectRequest(selected.id, reviewText);
    if (ok) {
      setReviewMode(null);
      setReviewText("");
    }
  };

  return (
    <div>
      <ViewHeading
        title="Changes"
        description="Review proposals against the exact version they were created from, with server-enforced conflict protection."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshChangeRequests()}
            className="cursor-pointer"
          >
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={tab === item ? "secondary" : "ghost"}
            onClick={() => setTab(item)}
            className="cursor-pointer capitalize"
          >
            {item}
            <span className="ml-1.5 text-[10px] text-muted-foreground">
              {item === "all"
                ? changeRequests.length
                : item === "open"
                  ? changeRequests.filter(
                      (request) =>
                        request.status === "pending" ||
                        request.status === "changes_requested",
                    ).length
                  : changeRequests.filter((request) => request.status === item)
                      .length}
            </span>
          </Button>
        ))}
      </div>

      <div className="grid min-h-[520px] overflow-hidden rounded-[1.5rem] border border-border/60 bg-card/60 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="border-b border-border/60 lg:border-b-0 lg:border-r">
          <div className="max-h-[680px] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No change requests here.
              </div>
            ) : (
              filtered.map((request) => {
                const conflictCount = getConflictFields(request, baseline).length;
                const legacy = !request.base_version_id || !request.base_snapshot;
                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedId(request.id)}
                    className={`mb-1 w-full cursor-pointer rounded-xl p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 ${
                      selected?.id === request.id
                        ? "bg-primary/10"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GitPullRequest className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {request.title ||
                            `${Object.keys(request.proposed_changes || {}).length} field changes`}
                        </p>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                          {request.author_display_name ||
                            request.author_username ||
                            "Collaborator"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={request.status} />
                          {legacy && isOpen(request) && (
                            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[9px] text-amber-600 dark:text-amber-300">
                              Legacy
                            </Badge>
                          )}
                          {conflictCount > 0 && isOpen(request) && (
                            <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-[9px] text-red-600 dark:text-red-300">
                              {conflictCount} conflict{conflictCount === 1 ? "" : "s"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div>
          {selected ? (
            <ChangeDetail
              request={selected}
              baseline={baseline}
              canReview={canReview}
              onApprove={() => void approveRequest(selected.id)}
              onRequestChanges={() => {
                setReviewMode("changes");
                setReviewText(selected.review_comment || "");
              }}
              onReject={() => {
                setReviewMode("reject");
                setReviewText(selected.rejection_reason || "");
              }}
            />
          ) : (
            <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-muted-foreground">
              Select a change request.
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={!!reviewMode}
        onOpenChange={(open) => {
          if (!open) {
            setReviewMode(null);
            setReviewText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewMode === "changes" ? "Request changes" : "Reject change request"}
            </DialogTitle>
            <DialogDescription>
              {reviewMode === "changes"
                ? "Tell the collaborator what should be adjusted. The request remains open."
                : "Explain why these changes should not be merged."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            className="min-h-28"
            placeholder={
              reviewMode === "changes" ? "What needs to change?" : "Reason for rejection…"
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewMode(null)}>
              Cancel
            </Button>
            <Button
              variant={reviewMode === "reject" ? "destructive" : "default"}
              disabled={reviewMode === "changes" && !reviewText.trim()}
              onClick={() => void submitReview()}
            >
              {reviewMode === "changes" ? "Request changes" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChangeDetail({
  request,
  baseline,
  canReview,
  onApprove,
  onRequestChanges,
  onReject,
}: {
  request: BotChangeRequest;
  baseline: WorkspaceBotValues;
  canReview: boolean;
  onApprove: () => void;
  onRequestChanges: () => void;
  onReject: () => void;
}) {
  const entries = Object.entries(request.proposed_changes || {}) as Array<
    [BotCollaborationField, unknown]
  >;
  const baseValues = getBaseValues(request);
  const conflictFields = getConflictFields(request, baseline);
  const legacy = !request.base_version_id || !baseValues;
  const open = isOpen(request);
  const mergeBlocked = legacy || conflictFields.length > 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-border/50 pb-5 sm:flex-row sm:items-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
          {request.author_avatar_url ? (
            <img src={request.author_avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{request.title || "Change request"}</h3>
            <StatusBadge status={request.status} />
            {request.base_version_number && (
              <Badge variant="outline" className="text-[9px]">
                Based on v{request.base_version_number}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {request.author_display_name || request.author_username || "Collaborator"} · {new Date(request.created_at).toLocaleString()}
          </p>
          {request.description && (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {request.description}
            </p>
          )}
        </div>
      </div>

      {request.review_comment && (
        <div className="my-4 rounded-xl border border-blue-500/20 bg-blue-500/[0.05] p-3">
          <p className="text-xs font-medium text-blue-500">Review feedback</p>
          <p className="mt-1 text-sm text-muted-foreground">{request.review_comment}</p>
        </div>
      )}

      {legacy && open && (
        <div className="my-4 flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
          <div>
            <p className="text-sm font-medium">Safe merge unavailable for this legacy request</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              This request was created before base versions were recorded. Ask the author to submit it again so Forge can verify conflicts before merging.
            </p>
          </div>
        </div>
      )}

      {conflictFields.length > 0 && open && (
        <div className="my-4 flex gap-3 rounded-xl border border-red-500/25 bg-red-500/[0.055] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-300" />
          <div>
            <p className="text-sm font-medium">
              {conflictFields.length} conflicting field{conflictFields.length === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              These fields changed after the request was created. Approve is blocked so newer work cannot be overwritten silently.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {conflictFields.map((field) => (
                <Badge key={field} variant="outline" className="text-[9px]">
                  {FIELD_LABELS[field] || field}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {entries.map(([field, proposed]) => {
          const before = baseValues ? baseValues[field] : baseline[field];
          const conflict = conflictFields.includes(field);
          return (
            <BotFieldDiff
              key={field}
              field={field}
              before={before}
              after={proposed}
              beforeLabel={
                request.base_version_number
                  ? `Base v${request.base_version_number}`
                  : "Current"
              }
              afterLabel="Proposed"
              conflict={conflict}
              currentValue={conflict ? baseline[field] : undefined}
            />
          );
        })}
      </div>

      {canReview && open && (
        <div className="sticky bottom-0 mt-6 flex flex-wrap justify-end gap-2 border-t border-border/60 bg-card/95 pt-4 backdrop-blur">
          <Button variant="outline" onClick={onRequestChanges}>
            <MessageSquareWarning className="mr-1.5 h-3.5 w-3.5" />
            Request changes
          </Button>
          <Button variant="destructive" onClick={onReject}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Reject
          </Button>
          <Button onClick={onApprove} disabled={mergeBlocked}>
            <Check className="mr-1.5 h-3.5 w-3.5" />
            {mergeBlocked ? "Resolve conflicts" : "Approve"}
          </Button>
        </div>
      )}
    </div>
  );
}

function getBaseValues(request: BotChangeRequest): WorkspaceBotValues | null {
  if (!request.base_snapshot) return null;
  return normalizeVersionSnapshot(request.base_snapshot as BotVersionSnapshot);
}

function getConflictFields(
  request: BotChangeRequest,
  current: WorkspaceBotValues,
): BotCollaborationField[] {
  const base = getBaseValues(request);
  if (!base) return [];

  return (Object.keys(request.proposed_changes || {}) as BotCollaborationField[]).filter(
    (field) => !diffValueEquals(base[field], current[field]),
  );
}

function isOpen(request: BotChangeRequest) {
  return request.status === "pending" || request.status === "changes_requested";
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "approved"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-500"
      : status === "rejected"
        ? "border-red-500/25 bg-red-500/10 text-red-500"
        : status === "changes_requested"
          ? "border-blue-500/25 bg-blue-500/10 text-blue-500"
          : "border-amber-500/25 bg-amber-500/10 text-amber-500";

  return (
    <Badge variant="outline" className={`text-[9px] capitalize ${className}`}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
