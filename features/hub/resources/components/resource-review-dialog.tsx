"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CalendarClock,
  Check,
  FilePenLine,
  Loader2,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { toast } from "sonner";

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

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";

import { MarkdownField } from "@/features/markdown/components/markdown-field";

import {
  approveResourceSubmission,
  listPendingResourceSubmissions,
  rejectResourceSubmission,
} from "@/features/hub/resources/actions/resources";

import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type ResourceSection = {
  id: string;
  title: string;
};

type ContributorProfile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type PendingSubmission = {
  id: string;

  user_id: string;

  suggested_section_id: string | null;

  title: string;

  summary: string | null;

  url: string | null;

  label: string | null;

  status: string;

  submission_type: string;

  target_entry_id: string | null;

  created_at: string;

  contributor: ContributorProfile | ContributorProfile[] | null;
};

type ResourceReviewDialogProps = {
  open: boolean;

  onOpenChange: (open: boolean) => void;

  sections: ResourceSection[];

  onChanged?: () => void;
};

// ============================================================================
// Helpers
// ============================================================================

function formatSubmissionDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getContributor(
  contributor: PendingSubmission["contributor"],
): ContributorProfile | null {
  if (Array.isArray(contributor)) {
    return contributor[0] || null;
  }

  return contributor || null;
}

function getContributorName(contributor: ContributorProfile | null) {
  if (!contributor) {
    return "Community contributor";
  }

  return (
    contributor.display_name || contributor.username || "Community contributor"
  );
}

function getContributorInitial(contributor: ContributorProfile | null) {
  const name = getContributorName(contributor);

  return name.charAt(0).toUpperCase();
}

// ============================================================================
// Component
// ============================================================================

export function ResourceReviewDialog({
  open,
  onOpenChange,
  sections,
  onChanged,
}: ResourceReviewDialogProps) {
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [sectionId, setSectionId] = useState("");

  const [title, setTitle] = useState("");

  const [summary, setSummary] = useState("");

  const [url, setUrl] = useState("");

  const [label, setLabel] = useState("");

  const [reviewNotes, setReviewNotes] = useState("");

  const selected =
    submissions.find((submission) => submission.id === selectedId) || null;

  const contributor = selected ? getContributor(selected.contributor) : null;

  // ==========================================================================
  // Load
  // ==========================================================================

  const loadSubmissions = useCallback(async () => {
    setLoading(true);

    try {
      const result = await listPendingResourceSubmissions();

      if (!result.success) {
        toast.error(result.error || "Could not load suggestions.");

        setSubmissions([]);

        return;
      }

      const items = result.submissions as PendingSubmission[];

      setSubmissions(items);

      setSelectedId((current) => {
        if (current && items.some((submission) => submission.id === current)) {
          return current;
        }

        return items[0]?.id || null;
      });
    } catch (error) {
      console.error("Failed to load resource submissions:", error);

      toast.error("Could not load suggestions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadSubmissions();
  }, [open, loadSubmissions]);

  // ==========================================================================
  // Sync selected submission → editor
  // ==========================================================================

  useEffect(() => {
    if (!selected) {
      setSectionId("");

      setTitle("");

      setSummary("");

      setUrl("");

      setLabel("");

      setReviewNotes("");

      return;
    }

    setSectionId(selected.suggested_section_id || "");

    setTitle(selected.title);

    setSummary(selected.summary || "");

    setUrl(selected.url || "");

    setLabel(selected.label || "");

    setReviewNotes("");
  }, [selected]);

  // ==========================================================================
  // Actions
  // ==========================================================================

  const approve = async () => {
    if (!selected) {
      return;
    }

    if (!sectionId) {
      toast.error("Choose a category before approving.");

      return;
    }

    if (!title.trim()) {
      toast.error("Enter a resource title.");

      return;
    }

    setSaving(true);

    try {
      const result = await approveResourceSubmission({
        submissionId: selected.id,

        sectionId,

        title,

        summary,

        url,

        label,

        reviewNotes,
      });

      if (!result.success) {
        toast.error(result.error || "Could not approve suggestion.");

        return;
      }

      toast.success(
        selected.submission_type === "update"
          ? "Resource changes approved."
          : "Resource published.",
      );

      await loadSubmissions();

      onChanged?.();
    } catch (error) {
      console.error("Failed to approve resource submission:", error);

      toast.error("Could not approve suggestion.");
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    if (!selected) {
      return;
    }

    setSaving(true);

    try {
      const result = await rejectResourceSubmission(selected.id, reviewNotes);

      if (!result.success) {
        toast.error(result.error || "Could not reject suggestion.");

        return;
      }

      toast.success("Suggestion rejected.");

      await loadSubmissions();

      onChanged?.();
    } catch (error) {
      console.error("Failed to reject resource submission:", error);

      toast.error("Could not reject suggestion.");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving) {
          return;
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        id="resource-review-dialog"
        className={cn(
          "flex max-h-[calc(100dvh-1rem)] min-h-0 w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0",
          "sm:max-h-[92dvh] sm:max-w-6xl",
        )}
      >
        {/* ================================================================ */}
        {/* Header */}
        {/* ================================================================ */}

        <DialogHeader className="shrink-0 border-b border-border/70 px-4 py-4 pr-12 text-left sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl">
                    Resource suggestions
                  </DialogTitle>

                  <DialogDescription className="mt-0.5">
                    Review community resources before they reach the library.
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="mr-6 flex w-full items-center justify-between gap-2 self-start sm:mr-0 sm:w-auto sm:justify-start sm:self-auto">
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
                onClick={() => void loadSubmissions()}
                disabled={loading || saving}
                aria-label="Refresh suggestions"
                title="Refresh suggestions"
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

        {/* ================================================================ */}
        {/* Body */}
        {/* ================================================================ */}

        <div
          className={cn(
            "grid min-h-0 flex-1 overflow-hidden",
            "grid-rows-[auto_minmax(0,1fr)]",
            "xl:grid-cols-[19rem_minmax(0,1fr)] xl:grid-rows-1",
          )}
        >
          {/* ============================================================== */}
          {/* Queue */}
          {/* ============================================================== */}

          <aside
            className={cn(
              "border-b border-border/70 bg-muted/10",
              "xl:min-h-0 xl:border-b-0 xl:border-r",
            )}
          >
            <div
              className={cn(
                "flex items-center justify-between px-4 pb-2 pt-3",
                "xl:px-4 xl:pb-3 xl:pt-4",
              )}
            >
              <div>
                <p className="text-sm font-semibold">Review queue</p>

                <p className="text-xs text-muted-foreground">
                  Oldest submissions first
                </p>
              </div>
            </div>

            <div
              className={cn(
                "flex gap-2 overflow-x-auto px-3 pb-3",
                "xl:block xl:max-h-full xl:space-y-1 xl:scrollbar-thin xl:overflow-y-auto xl:overflow-x-hidden xl:px-2 xl:pb-4",
              )}
            >
              {loading && submissions.length === 0 ? (
                <div className="flex min-h-28 w-full items-center justify-center text-sm text-muted-foreground xl:min-h-48">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading suggestions...
                </div>
              ) : submissions.length === 0 ? (
                <div className="flex min-h-28 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-4 text-center xl:min-h-48">
                  <Check className="mb-2 h-5 w-5 text-muted-foreground" />

                  <p className="text-sm font-medium">Queue is clear</p>

                  <p className="mt-1 max-w-44 text-xs text-muted-foreground">
                    There are no community resources waiting for review.
                  </p>
                </div>
              ) : (
                submissions.map((submission) => {
                  const submissionContributor = getContributor(
                    submission.contributor,
                  );

                  const active = submission.id === selectedId;

                  const isUpdate = submission.submission_type === "update";

                  return (
                    <button
                      key={submission.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedId(submission.id)}
                      className={cn(
                        "group shrink-0 cursor-pointer rounded-xl border p-3 text-left transition-colors",
                        "w-[min(16rem,82vw)] xl:w-full",
                        active
                          ? "border-primary/50 bg-primary/5 shadow-sm"
                          : "border-border/60 bg-background/70 hover:border-border hover:bg-muted/50",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            active
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {isUpdate ? (
                            <FilePenLine className="h-4 w-4" />
                          ) : (
                            <PlusCircle className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 line-clamp-2 text-sm font-medium leading-snug">
                              {submission.title}
                            </p>

                            <Badge
                              variant={isUpdate ? "secondary" : "outline"}
                              className="shrink-0 px-1.5 py-0 text-[10px]"
                            >
                              {isUpdate ? "Update" : "New"}
                            </Badge>
                          </div>

                          <div className="mt-2 space-y-1">
                            <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                              <UserRound className="h-3 w-3 shrink-0" />

                              <span className="truncate">
                                {submissionContributor?.username
                                  ? `@${submissionContributor.username}`
                                  : getContributorName(submissionContributor)}
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

          {/* ============================================================== */}
          {/* Review editor */}
          {/* ============================================================== */}

          <main className="min-h-0 scrollbar-thin overflow-y-auto">
            {!selected ? (
              <div className="flex min-h-full items-center justify-center p-6">
                <div className="max-w-sm text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <p className="mt-3 text-sm font-medium">
                    Select a suggestion
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose an item from the review queue to inspect and edit it.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-4xl space-y-5 p-3 sm:p-5 xl:p-6">
                {/* -------------------------------------------------------- */}
                {/* Submission summary */}
                {/* -------------------------------------------------------- */}

                <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {getContributorInitial(contributor)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words text-sm font-semibold">
                            {getContributorName(contributor)}
                          </p>

                          {contributor?.username && (
                            <span className="text-xs text-muted-foreground">
                              @{contributor.username}
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Submitted {formatSubmissionDate(selected.created_at)}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={
                        selected.submission_type === "update"
                          ? "secondary"
                          : "default"
                      }
                      className="w-fit"
                    >
                      {selected.submission_type === "update"
                        ? "Proposed update"
                        : "New resource"}
                    </Badge>
                  </div>
                </section>

                {/* -------------------------------------------------------- */}
                {/* Details */}
                {/* -------------------------------------------------------- */}

                <section className="rounded-2xl border border-border/70 bg-card">
                  <div className="border-b border-border/60 px-4 py-3 sm:px-5">
                    <p className="text-sm font-semibold">Resource details</p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Review and adjust the metadata before publishing.
                    </p>
                  </div>

                  <div className="space-y-4 p-4 sm:p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="resource-review-category">
                          Category
                        </Label>

                        <Select
                          value={sectionId}
                          onValueChange={setSectionId}
                          disabled={saving}
                        >
                          <SelectTrigger
                            id="resource-review-category"
                            className="w-full"
                          >
                            <SelectValue placeholder="Choose category" />
                          </SelectTrigger>

                          <SelectContent>
                            {sections.map((section) => (
                              <SelectItem key={section.id} value={section.id}>
                                {section.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="resource-review-type">Type</Label>

                        <Input
                          id="resource-review-type"
                          value={label}
                          onChange={(event) => setLabel(event.target.value)}
                          placeholder="Guide, tool, reference..."
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resource-review-title">Title</Label>

                      <Input
                        id="resource-review-title"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        maxLength={160}
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resource-review-url">Source URL</Label>

                      <Input
                        id="resource-review-url"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        placeholder="https://..."
                        disabled={saving}
                      />
                    </div>
                  </div>
                </section>

                {/* -------------------------------------------------------- */}
                {/* Content */}
                {/* -------------------------------------------------------- */}

                <section className="rounded-2xl border border-border/70 bg-card">
                  <div className="border-b border-border/60 px-4 py-3 sm:px-5">
                    <p className="text-sm font-semibold">Content</p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      You can clean up or improve the submitted Markdown before
                      approval.
                    </p>
                  </div>

                  <div className="p-4 sm:p-5">
                    <MarkdownField
                      value={summary}
                      onChange={setSummary}
                      preset="full"
                      slashMenuContainer="#resource-review-dialog"
                      minEditorHeightRem={12}
                      maxEditorHeightRem={30}
                      disabled={saving}
                      imageOptions={{
                        enabled: false,
                      }}
                    />
                  </div>
                </section>

                {/* -------------------------------------------------------- */}
                {/* Review notes */}
                {/* -------------------------------------------------------- */}

                <section className="rounded-2xl border border-border/70 bg-card">
                  <div className="border-b border-border/60 px-4 py-3 sm:px-5">
                    <p className="text-sm font-semibold">Review notes</p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Optional feedback saved with this review.
                    </p>
                  </div>

                  <div className="p-4 sm:p-5">
                    <Textarea
                      value={reviewNotes}
                      onChange={(event) => setReviewNotes(event.target.value)}
                      rows={4}
                      placeholder="Explain requested changes or leave a note for the contributor..."
                      disabled={saving}
                      className="min-h-24 resize-y"
                    />
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>

        {/* ================================================================ */}
        {/* Footer */}
        {/* ================================================================ */}

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
                  onClick={reject}
                  disabled={saving}
                  className="w-full cursor-pointer border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>

                <Button
                  type="button"
                  onClick={approve}
                  disabled={saving || !sectionId || !title.trim()}
                  className="w-full cursor-pointer sm:w-auto"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}

                  {selected.submission_type === "update"
                    ? "Approve changes"
                    : "Publish resource"}
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
