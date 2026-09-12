"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AlertTriangle,
  Archive,
  ArchiveX,
  CalendarClock,
  CalendarDays,
  Check,
  ExternalLink,
  FilePenLine,
  Flag,
  Link2,
  Loader2,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";
import {
  getPendingCommunitySubmissions,
  reviewCommunitySubmission,
  type CommunityReviewSubmission,
  type CommunitySubmissionType,
  type CommunityDatePrecision,
} from "@/features/hub/community/actions/community";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewed?: () => Promise<void> | void;
  onPendingCountChange?: (count: number) => void;
};

const TYPE_META: Record<
  CommunitySubmissionType,
  {
    label: string;
    icon: typeof Archive;
    tone: string;
  }
> = {
  record_create: {
    label: "New record",
    icon: Archive,
    tone: "bg-primary/10 text-primary",
  },
  record_edit: {
    label: "Record edit",
    icon: FilePenLine,
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  source: {
    label: "Source",
    icon: Link2,
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  timeline_update: {
    label: "Timeline update",
    icon: CalendarDays,
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  correction: {
    label: "Correction",
    icon: MessageSquareText,
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  archive_request: {
    label: "Archive / removal",
    icon: ArchiveX,
    tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  removal_request: {
    label: "Removal request",
    icon: ArchiveX,
    tone: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  moderation: "Moderation",
  creator_concern: "Creator Concern",
  platform_change: "Platform Change",
  policy: "Policy",
  safety_privacy: "Safety & Privacy",
  bug_reliability: "Bug / Reliability",
  community_update: "Community Update",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  developing: "Developing",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
  partially_resolved: "Partially resolved",
  unresolved: "Unresolved",
  archived: "Archived",
};

const EVIDENCE_LABELS: Record<string, string> = {
  reported: "Reported",
  corroborated: "Corroborated",
  official_response: "Official response",
  confirmed: "Confirmed",
};

const IMPACT_LABELS: Record<string, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

function formatDate(
  value: string | null,
  precision: CommunityDatePrecision = "datetime",
) {
  if (!value) return "—";

  if (precision === "date") {
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!match) return value;

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(
      new Date(
        Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
      ),
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function contributorName(submission: CommunityReviewSubmission) {
  return (
    submission.contributor?.display_name ||
    submission.contributor?.username ||
    "Community member"
  );
}

function initials(submission: CommunityReviewSubmission) {
  return contributorName(submission)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/55 bg-background/35 px-3 py-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>

      <div className="mt-1 min-w-0 break-words text-sm">{value || "—"}</div>
    </div>
  );
}

export function CommunityReviewDialog({
  open,
  onOpenChange,
  onReviewed,
  onPendingCountChange,
}: Props) {
  const [submissions, setSubmissions] = useState<CommunityReviewSubmission[]>(
    [],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [confirmStale, setConfirmStale] = useState(false);
  const [archiveMode, setArchiveMode] = useState<"archive" | "remove">(
    "archive",
  );

  const selected = useMemo(
    () =>
      submissions.find((submission) => submission.id === selectedId) || null,
    [selectedId, submissions],
  );

  const loadSubmissions = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getPendingCommunitySubmissions();

      if (!result.success) {
        toast.error(result.error || "Could not load review queue.");
        setSubmissions([]);
        onPendingCountChange?.(0);
        return;
      }

      setSubmissions(result.submissions);
      onPendingCountChange?.(result.submissions.length);

      setSelectedId((current) => {
        if (
          current &&
          result.submissions.some((submission) => submission.id === current)
        ) {
          return current;
        }

        return result.submissions[0]?.id || null;
      });
    } catch (error) {
      console.error(error);
      toast.error("Could not load review queue.");
    } finally {
      setLoading(false);
    }
  }, [onPendingCountChange]);

  useEffect(() => {
    if (!open) return;

    void loadSubmissions();
  }, [loadSubmissions, open]);

  useEffect(() => {
    setReviewNote("");
    setConfirmStale(false);
    setArchiveMode("archive");
  }, [selectedId]);

  const hasRevisionDrift =
    !!selected?.target &&
    selected.base_revision !== null &&
    selected.target.revision !== undefined &&
    selected.base_revision !== selected.target.revision;

  const requiresStaleConfirmation =
    selected?.submission_type === "record_edit" && hasRevisionDrift;

  const review = async (decision: "approve" | "reject") => {
    if (!selected) return;

    if (decision === "approve" && requiresStaleConfirmation && !confirmStale) {
      toast.error("Confirm that you reviewed the newer record revision first.");
      return;
    }

    setSaving(true);

    try {
      const result = await reviewCommunitySubmission({
        submissionId: selected.id,
        decision,
        reviewNote,
        confirmStale,
        archiveMode,
      });

      if (!result.success) {
        toast.error(result.error || "Could not review submission.");
        return;
      }

      toast.success(
        decision === "approve"
          ? "Submission approved."
          : "Submission rejected.",
      );

      if ("cleanupWarning" in result && result.cleanupWarning) {
        toast.warning(result.cleanupWarning);
      }

      await loadSubmissions();
      await onReviewed?.();
    } catch (error) {
      console.error(error);
      toast.error("Could not review submission.");
    } finally {
      setSaving(false);
    }
  };

  const renderSubmissionBody = () => {
    if (!selected) return null;

    switch (selected.submission_type) {
      case "record_create":
      case "record_edit":
        return (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Title" value={selected.title} />
              <Field
                label="Category"
                value={
                  CATEGORY_LABELS[selected.suggested_category || "other"] ||
                  "Other"
                }
              />
              <Field
                label="Impact"
                value={
                  selected.suggested_impact
                    ? IMPACT_LABELS[selected.suggested_impact]
                    : "Not assessed"
                }
              />
              <Field
                label="Occurred"
                value={formatDate(
                  selected.suggested_occurred_at,
                  selected.suggested_occurred_at_precision || "datetime",
                )}
              />

              {selected.submission_type === "record_edit" && (
                <>
                  <Field
                    label="Suggested status"
                    value={
                      selected.suggested_status
                        ? STATUS_LABELS[selected.suggested_status]
                        : "—"
                    }
                  />
                  <Field
                    label="Suggested evidence"
                    value={
                      selected.suggested_evidence_status
                        ? EVIDENCE_LABELS[selected.suggested_evidence_status]
                        : "—"
                    }
                  />
                </>
              )}
            </div>

            {selected.submission_type === "record_create" &&
              selected.source_name &&
              selected.source_url && (
                <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.035] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Link2 className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                        Primary source
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {selected.source_name}
                      </p>

                      {selected.source_note && (
                        <p className="mt-1.5 break-words text-xs leading-5 text-muted-foreground">
                          {selected.source_note}
                        </p>
                      )}

                      <a
                        href={selected.source_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-3 inline-flex max-w-full items-center gap-1.5 break-all text-xs font-medium text-primary hover:underline"
                      >
                        Open source
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </section>
              )}

            {selected.suggested_content_warning && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3">
                <div className="flex gap-2">
                  <Flag className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />

                  <div>
                    <p className="text-xs font-medium">Content note</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {selected.suggested_content_warning}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <section className="rounded-2xl border border-border/60 bg-card/55 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                Summary
              </p>

              <p className="mt-2 break-words text-sm leading-6 text-foreground/90">
                {selected.summary || "No summary."}
              </p>
            </section>

            <section className="rounded-2xl border border-border/60 bg-card/55 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                Context
              </p>

              <div className="mt-3">
                {selected.content ? (
                  <MarkdownRenderer content={selected.content} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No context supplied.
                  </p>
                )}
              </div>
            </section>
          </div>
        );

      case "source":
        return (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Source name" value={selected.source_name} />
              <Field label="Type" value={selected.source_type || "community"} />
              <Field
                label="Published"
                value={formatDate(selected.source_published_at)}
              />
              <Field
                label="Target record"
                value={selected.target?.title || "—"}
              />
            </div>

            {selected.source_url && (
              <a
                href={selected.source_url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-3 text-sm transition-colors hover:border-primary/30 hover:bg-primary/[0.035]"
              >
                <span className="min-w-0 truncate">{selected.source_url}</span>
                <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
              </a>
            )}

            {selected.source_archive_url && (
              <a
                href={selected.source_archive_url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-3 text-sm transition-colors hover:border-primary/30 hover:bg-primary/[0.035]"
              >
                <span className="min-w-0 truncate">Archived copy</span>
                <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
              </a>
            )}

            {selected.source_note && (
              <section className="rounded-2xl border border-border/60 bg-card/55 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Contributor note
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {selected.source_note}
                </p>
              </section>
            )}
          </div>
        );

      case "timeline_update":
        return (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Update title" value={selected.update_title} />
              <Field
                label="Occurred"
                value={formatDate(selected.update_occurred_at)}
              />
            </div>

            <section className="rounded-2xl border border-border/60 bg-card/55 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                Update
              </p>

              <div className="mt-3">
                {selected.update_body ? (
                  <MarkdownRenderer content={selected.update_body} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No additional details.
                  </p>
                )}
              </div>
            </section>
          </div>
        );

      case "correction":
        return (
          <div className="space-y-4">
            <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.045] p-4">
              <div className="flex gap-3">
                <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />

                <div>
                  <p className="text-sm font-medium">Suggested correction</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {selected.details}
                  </p>
                </div>
              </div>
            </section>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
              Accepting a correction records the staff decision. Because the
              suggestion is free-form rather than a structured field patch, it
              does not rewrite the public record automatically.
            </div>
          </div>
        );

      case "archive_request":
      case "removal_request":
        return (
          <div className="space-y-4">
            <section className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.045] p-4">
              <div className="flex gap-3">
                <ArchiveX className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />

                <div>
                  <p className="text-sm font-medium">Request reason</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {selected.details}
                  </p>
                </div>
              </div>
            </section>

            <div className="space-y-2">
              <Label>Approval action</Label>

              <Select
                value={archiveMode}
                onValueChange={(value) =>
                  setArchiveMode(value as "archive" | "remove")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="archive">
                    Archive — keep publicly preserved
                  </SelectItem>
                  <SelectItem value="remove">
                    Remove — unpublish from Community
                  </SelectItem>
                </SelectContent>
              </Select>

              <p className="text-xs leading-5 text-muted-foreground">
                Archive keeps the record visible with Archived status. Remove
                unpublishes it while preserving the database record.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="community-review-dialog"
        className={cn(
          "flex max-h-[calc(100dvh-1rem)] min-h-0 w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0",
          "sm:max-h-[92dvh] sm:max-w-6xl",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border/70 px-4 py-4 pr-12 text-left sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl">
                    Community review
                  </DialogTitle>

                  <DialogDescription className="mt-0.5">
                    Review records, edits, evidence and follow-ups before they
                    change the Community archive.
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="mr-6 flex items-center gap-2 self-start sm:self-auto">
              <Badge
                variant={submissions.length > 0 ? "default" : "secondary"}
                className="h-7 px-2.5"
              >
                {submissions.length} pending
              </Badge>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                disabled={loading || saving}
                onClick={() => void loadSubmissions()}
                aria-label="Refresh submissions"
                title="Refresh submissions"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-hidden grid-rows-[auto_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)] xl:grid-rows-1">
          <aside className="border-b border-border/70 bg-muted/10 xl:min-h-0 xl:border-b-0 xl:border-r">
            <div className="flex items-center justify-between px-4 pb-2 pt-3 lg:px-4 lg:pb-3 lg:pt-4">
              <div>
                <p className="text-sm font-semibold">Review queue</p>
                <p className="text-xs text-muted-foreground">
                  Oldest submissions first
                </p>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto px-3 pb-3 xl:block xl:max-h-full xl:space-y-1 xl:scrollbar-thin xl:overflow-y-auto xl:overflow-x-hidden lg:px-2 lg:pb-4">
              {loading && submissions.length === 0 ? (
                <div className="flex min-h-28 w-full items-center justify-center text-sm text-muted-foreground xl:min-h-48">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : submissions.length === 0 ? (
                <div className="flex min-h-28 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border/65 px-4 text-center xl:min-h-48">
                  <Check className="mb-2 h-5 w-5 text-emerald-500" />
                  <p className="text-sm font-medium">Queue is clear</p>
                  <p className="mt-1 max-w-44 text-xs text-muted-foreground">
                    There are no Community contributions waiting for review.
                  </p>
                </div>
              ) : (
                submissions.map((submission) => {
                  const active = submission.id === selectedId;
                  const meta = TYPE_META[submission.submission_type];
                  const Icon = meta.icon;

                  return (
                    <button
                      key={submission.id}
                      type="button"
                      data-state={active ? "on" : "off"}
                      className={cn(
                        "group w-[16rem] shrink-0 rounded-xl border p-3 text-left transition-colors lg:w-full",
                        "data-[state=off]:cursor-pointer data-[state=on]:cursor-default",
                        active
                          ? "border-primary/50 bg-primary/5 shadow-sm"
                          : "border-border/60 bg-background/70 hover:border-border hover:bg-muted/50",
                      )}
                      onClick={() => {
                        if (!active) {
                          setSelectedId(submission.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            active
                              ? meta.tone
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 line-clamp-2 text-sm font-medium leading-snug">
                              {submission.title ||
                                submission.source_name ||
                                submission.update_title ||
                                submission.target?.title ||
                                "Community contribution"}
                            </p>

                            <Badge
                              variant="outline"
                              className="shrink-0 px-1.5 py-0 text-[10px]"
                            >
                              {meta.label}
                            </Badge>
                          </div>

                          <div className="mt-2 space-y-1">
                            <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                              <UserRound className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {submission.contributor?.username
                                  ? `@${submission.contributor.username}`
                                  : contributorName(submission)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <CalendarClock className="h-3 w-3 shrink-0" />
                              <span>
                                {new Date(
                                  submission.created_at,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <main className="min-h-0 scrollbar-thin overflow-y-auto">
            {!selected ? (
              <div className="flex min-h-full items-center justify-center p-6">
                <div className="max-w-sm text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <p className="mt-3 text-sm font-medium">
                    Select a submission
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose an item from the review queue to inspect it.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-4xl space-y-5 p-3 sm:p-5 xl:p-6">
                <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage
                          src={selected.contributor?.avatar_url || undefined}
                        />
                        <AvatarFallback className="text-[10px]">
                          {initials(selected)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <p className="font-medium">
                          {contributorName(selected)}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(selected.created_at)}</span>

                          {selected.target && (
                            <>
                              <span>•</span>
                              <span className="truncate">
                                {selected.target.title}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <Badge
                      className={cn(
                        "w-fit rounded-full border-0",
                        TYPE_META[selected.submission_type].tone,
                      )}
                    >
                      {TYPE_META[selected.submission_type].label}
                    </Badge>
                  </div>
                </section>

                {hasRevisionDrift && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />

                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          Older record revision
                        </p>

                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          This contribution was based on revision{" "}
                          {selected.base_revision}, while the current record is
                          revision {selected.target?.revision}. Review the
                          current record before making a decision.
                        </p>

                        {requiresStaleConfirmation && (
                          <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={confirmStale}
                              onChange={(event) =>
                                setConfirmStale(event.target.checked)
                              }
                              className="mt-0.5"
                            />

                            <span>
                              I reviewed the newer revision and still want to
                              apply this edit.
                            </span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selected.target &&
                  selected.submission_type === "record_edit" && (
                    <section className="rounded-2xl border border-border/70 bg-card">
                      <div className="border-b border-border/60 px-4 py-3 sm:px-5">
                        <p className="text-sm font-semibold">Current record</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Compare the published version with the proposed edit
                          below.
                        </p>
                      </div>

                      <div className="space-y-4 p-4 sm:p-5">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Field
                            label="Revision"
                            value={selected.target.revision}
                          />
                          <Field
                            label="Category"
                            value={selected.target.category}
                          />
                          <Field
                            label="Status"
                            value={selected.target.status}
                          />
                          <Field
                            label="Evidence"
                            value={selected.target.evidence_status}
                          />
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Title
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {selected.target.title}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Summary
                          </p>
                          <p className="mt-1 text-sm leading-6 text-foreground/90">
                            {selected.target.summary || "No summary."}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Context
                          </p>
                          <div className="mt-2 rounded-xl border border-border/60 bg-background/40 p-3">
                            {selected.target.content ? (
                              <MarkdownRenderer
                                content={selected.target.content}
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No context.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                {selected.submission_type === "record_edit" && (
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border/60" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                      Proposed edit
                    </span>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>
                )}

                {renderSubmissionBody()}

                <section className="rounded-2xl border border-border/70 bg-card">
                  <div className="border-b border-border/60 px-4 py-3 sm:px-5">
                    <p className="text-sm font-semibold">Review notes</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Optional feedback saved with this review.
                    </p>
                  </div>

                  <div className="p-4 sm:p-5">
                    <Textarea
                      id="community-review-note"
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      rows={4}
                      maxLength={5000}
                      placeholder="Explain the decision or leave context for future staff review..."
                      disabled={saving}
                      className="min-h-24 resize-y"
                    />

                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {reviewNote.length.toLocaleString()} / 5,000
                    </p>
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>

        <DialogFooter
          className={cn(
            "shrink-0 border-t border-border/70 bg-background/95 px-3 py-3 backdrop-blur",
            "sm:px-6",
          )}
        >
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="w-full cursor-pointer sm:w-auto"
            >
              Close
            </Button>

            {selected && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full cursor-pointer border-destructive/30 text-destructive hover:bg-destructive/10 sm:w-auto"
                  disabled={saving}
                  onClick={() => void review("reject")}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>

                <Button
                  type="button"
                  className="w-full cursor-pointer sm:w-auto"
                  disabled={
                    saving || (requiresStaleConfirmation && !confirmStale)
                  }
                  onClick={() => void review("approve")}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}

                  {selected.submission_type === "correction"
                    ? "Mark reviewed"
                    : selected.submission_type === "archive_request" ||
                        selected.submission_type === "removal_request"
                      ? archiveMode === "remove"
                        ? "Approve removal"
                        : "Approve archive"
                      : selected.submission_type === "record_create"
                        ? "Publish record"
                        : "Approve changes"}
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
