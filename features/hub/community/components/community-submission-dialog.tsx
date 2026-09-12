"use client";

import { useEffect, useRef, useState } from "react";

import {
  Archive,
  CalendarDays,
  FilePenLine,
  Flag,
  Link2,
  Loader2,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { toast } from "sonner";

import { cn } from "@/lib/utils";

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
import { DateTimePicker } from "@/components/ui/date-time-picker";

import {
  MarkdownField,
  type MarkdownFieldHandle,
} from "@/features/markdown/components/markdown-field";

import {
  commitMarkdownImages,
  extractManagedMarkdownAssetPaths,
} from "@/features/markdown/lib/markdown-image-assets";

import {
  createCommunityRecordDirect,
  createCommunitySourceDirect,
  createCommunityTimelineUpdateDirect,
  submitCommunitySubmission,
  updateCommunityRecordDirect,
  type CommunityCategory,
  type CommunityEvidenceStatus,
  type CommunityImpact,
  type CommunityDatePrecision,
  type CommunitySourceType,
  type CommunityStatus,
  type CommunitySubmissionType,
} from "@/features/hub/community/actions/community";

export type CommunitySubmissionRecord = {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  category: CommunityCategory;
  status: CommunityStatus;
  evidence_status: CommunityEvidenceStatus;
  impact: CommunityImpact | null;
  occurred_at: string | null;
  occurred_at_precision?: CommunityDatePrecision | null;
  content_warning: string | null;
  contributor_user_id: string | null;
  revision: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  mode: CommunitySubmissionType;

  record?: CommunitySubmissionRecord | null;

  onSubmitted?: () => Promise<void> | void;

  /**
   * Staff-only direct creation mode.
   * Uses the same polished editor but bypasses the review queue.
   */
  directCreate?: boolean;
  staffDirect?: boolean;
};

const CATEGORY_OPTIONS: Array<{
  value: CommunityCategory;
  label: string;
}> = [
  { value: "moderation", label: "Moderation" },
  {
    value: "creator_concern",
    label: "Creator Concern",
  },
  {
    value: "platform_change",
    label: "Platform Change",
  },
  { value: "policy", label: "Policy" },
  {
    value: "safety_privacy",
    label: "Safety & Privacy",
  },
  {
    value: "bug_reliability",
    label: "Bug / Reliability",
  },
  {
    value: "community_update",
    label: "Community Update",
  },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS: Array<{
  value: CommunityStatus;
  label: string;
}> = [
  { value: "open", label: "Open" },
  { value: "developing", label: "Developing" },
  {
    value: "acknowledged",
    label: "Acknowledged",
  },
  { value: "resolved", label: "Resolved" },
  {
    value: "partially_resolved",
    label: "Partially Resolved",
  },
  { value: "unresolved", label: "Unresolved" },
  { value: "archived", label: "Archived" },
];

const EVIDENCE_OPTIONS: Array<{
  value: CommunityEvidenceStatus;
  label: string;
}> = [
  { value: "reported", label: "Reported" },
  {
    value: "corroborated",
    label: "Corroborated",
  },
  {
    value: "official_response",
    label: "Official Response",
  },
  { value: "confirmed", label: "Confirmed" },
];

const IMPACT_OPTIONS: Array<{
  value: CommunityImpact;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

const SOURCE_TYPE_OPTIONS: Array<{
  value: CommunitySourceType;
  label: string;
}> = [
  { value: "community", label: "Community" },
  { value: "official", label: "Official" },
  { value: "platform", label: "Platform" },
  { value: "social", label: "Social" },
  { value: "article", label: "Article" },
  { value: "other", label: "Other" },
];

const MODE_COPY: Record<
  CommunitySubmissionType,
  {
    title: string;
    description: string;
    submit: string;
  }
> = {
  record_create: {
    title: "Submit a community record",
    description:
      "Document an issue, change or important community event. Staff reviews submissions before publication.",
    submit: "Submit record",
  },

  record_edit: {
    title: "Edit your record",
    description:
      "Suggest changes to your published record. The existing version stays public until staff reviews this edit.",
    submit: "Submit changes",
  },

  source: {
    title: "Add a source",
    description:
      "Contribute a source that adds evidence, context or an official response to this record.",
    submit: "Submit source",
  },

  timeline_update: {
    title: "Suggest a timeline update",
    description:
      "Document a meaningful development or follow-up for this record.",
    submit: "Submit update",
  },

  correction: {
    title: "Suggest a correction",
    description:
      "Point out inaccurate, incomplete or outdated information so staff can review it.",
    submit: "Submit correction",
  },

  archive_request: {
    title: "Request archive or removal",
    description:
      "Explain why your record should be archived or removed. Staff will review the request and preserved community context before deciding.",
    submit: "Send request",
  },

  removal_request: {
    title: "Request record removal",
    description:
      "Explain why your record should be removed from the public Community archive. Staff will review the request and preserved community context before deciding.",
    submit: "Send removal request",
  },
};

function toDateTimeLocal(
  value: string | null | undefined,
  precision: CommunityDatePrecision | null | undefined = "datetime",
) {
  if (!value) {
    return "";
  }

  if (precision === "date") {
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getDatePrecision(value: string): CommunityDatePrecision {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? "date" : "datetime";
}

function createCommunityAssetKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `community-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CommunitySubmissionDialog({
  open,
  onOpenChange,
  mode,
  record = null,
  onSubmitted,
  directCreate = false,
  staffDirect = false,
}: Props) {
  const markdownRef = useRef<MarkdownFieldHandle | null>(null);

  const assetKeyRef = useRef<string | null>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");

  const [category, setCategory] = useState<CommunityCategory>("other");

  const [status, setStatus] = useState<CommunityStatus>("open");

  const [evidenceStatus, setEvidenceStatus] =
    useState<CommunityEvidenceStatus>("reported");

  const [impact, setImpact] = useState<CommunityImpact | "none">("none");

  const [occurredAt, setOccurredAt] = useState("");

  const [contentWarning, setContentWarning] = useState("");

  const [sourceName, setSourceName] = useState("");

  const [sourceUrl, setSourceUrl] = useState("");

  const [sourceArchiveUrl, setSourceArchiveUrl] = useState("");

  const [sourceType, setSourceType] =
    useState<CommunitySourceType>("community");

  const [sourceNote, setSourceNote] = useState("");

  const [sourcePublishedAt, setSourcePublishedAt] = useState("");

  const [updateTitle, setUpdateTitle] = useState("");

  const [updateBody, setUpdateBody] = useState("");

  const [updateOccurredAt, setUpdateOccurredAt] = useState("");

  const [details, setDetails] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const isStaffDirect = directCreate || staffDirect;

  const copy =
    isStaffDirect && mode === "record_create"
      ? {
          title: "Create community record",
          description:
            "Create and publish a record directly as staff. This bypasses the community review queue.",
          submit: "Create record",
        }
      : isStaffDirect && mode === "record_edit"
        ? {
            title: "Edit community record",
            description:
              "Update this record directly as staff. Changes are published immediately.",
            submit: "Save record",
          }
        : isStaffDirect && mode === "source"
          ? {
              title: "Add source",
              description:
                "Add a source directly to this record without sending it through review.",
              submit: "Add source",
            }
          : isStaffDirect && mode === "timeline_update"
            ? {
                title: "Add timeline update",
                description:
                  "Publish a timeline development directly as staff.",
                submit: "Add update",
              }
            : MODE_COPY[mode];

  const isRecordMode = mode === "record_create" || mode === "record_edit";

  const isTimelineMode = mode === "timeline_update";

  const usesMarkdown = isRecordMode || isTimelineMode;

  useEffect(() => {
    if (!open) {
      return;
    }

    assetKeyRef.current = createCommunityAssetKey();

    if (mode === "record_edit" && record) {
      setTitle(record.title);
      setSummary(record.summary || "");
      setContent(record.content || "");
      setCategory(record.category);
      setStatus(record.status);
      setEvidenceStatus(record.evidence_status);
      setImpact(record.impact || "none");
      setOccurredAt(
        toDateTimeLocal(record.occurred_at, record.occurred_at_precision),
      );
      setContentWarning(record.content_warning || "");

      return;
    }

    setTitle("");
    setSummary("");
    setContent("");
    setCategory("other");
    setStatus("open");
    setEvidenceStatus("reported");
    setImpact("none");
    setOccurredAt("");
    setContentWarning("");

    setSourceName("");
    setSourceUrl("");
    setSourceArchiveUrl("");
    setSourceType("community");
    setSourceNote("");
    setSourcePublishedAt("");

    setUpdateTitle("");
    setUpdateBody("");
    setUpdateOccurredAt("");

    setDetails("");
  }, [mode, open, record]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (submitting) {
      return;
    }

    onOpenChange(nextOpen);
  };

  const saveSubmission = async (finalMarkdown: string | null) => {
    const markdownAssetPaths = extractManagedMarkdownAssetPaths(
      finalMarkdown || "",
    );

    const payload = {
      submissionType: mode,
      targetRecordId: mode === "record_create" ? null : record?.id || null,

      title: isRecordMode ? title : undefined,
      summary: isRecordMode ? summary : undefined,

      content: isRecordMode ? finalMarkdown || "" : undefined,

      suggestedCategory: isRecordMode ? category : null,

      suggestedStatus: isStaffDirect || mode === "record_edit" ? status : null,

      suggestedEvidenceStatus:
        isStaffDirect || mode === "record_edit" ? evidenceStatus : null,

      suggestedImpact: isRecordMode && impact !== "none" ? impact : null,

      suggestedOccurredAt: isRecordMode ? occurredAt || null : null,

      suggestedOccurredAtPrecision:
        isRecordMode && occurredAt ? getDatePrecision(occurredAt) : null,

      suggestedContentWarning: isRecordMode ? contentWarning : null,

      sourceName:
        mode === "source" || mode === "record_create" ? sourceName : undefined,

      sourceUrl:
        mode === "source" || mode === "record_create" ? sourceUrl : undefined,

      sourceArchiveUrl:
        mode === "source" || mode === "record_create"
          ? sourceArchiveUrl
          : undefined,

      sourceType:
        mode === "source" || mode === "record_create" ? sourceType : null,

      sourceNote:
        mode === "source" || mode === "record_create" ? sourceNote : undefined,

      sourcePublishedAt:
        mode === "source" || mode === "record_create"
          ? sourcePublishedAt || null
          : null,

      updateTitle: isTimelineMode ? updateTitle : undefined,

      updateBody: isTimelineMode ? finalMarkdown || "" : undefined,

      updateOccurredAt: isTimelineMode ? updateOccurredAt || null : null,

      details:
        mode === "correction" ||
        mode === "archive_request" ||
        mode === "removal_request"
          ? details
          : undefined,

      baseRevision: record?.revision ?? null,

      markdownAssetKey: usesMarkdown ? assetKeyRef.current : null,

      markdownAssetPaths: usesMarkdown ? markdownAssetPaths : [],
    };

    if (isStaffDirect && mode === "record_create") {
      return createCommunityRecordDirect({
        title: payload.title,
        summary: payload.summary,
        content: payload.content,
        suggestedCategory: payload.suggestedCategory,
        suggestedStatus: payload.suggestedStatus,
        suggestedEvidenceStatus: payload.suggestedEvidenceStatus,
        suggestedImpact: payload.suggestedImpact,
        suggestedOccurredAt: payload.suggestedOccurredAt,
        suggestedOccurredAtPrecision: payload.suggestedOccurredAtPrecision,
        suggestedContentWarning: payload.suggestedContentWarning,
        sourceName: payload.sourceName,
        sourceUrl: payload.sourceUrl,
        sourceArchiveUrl: payload.sourceArchiveUrl,
        sourceType: payload.sourceType,
        sourceNote: payload.sourceNote,
        sourcePublishedAt: payload.sourcePublishedAt,
        markdownAssetKey: payload.markdownAssetKey,
        markdownAssetPaths: payload.markdownAssetPaths,
      });
    }

    if (isStaffDirect && mode === "record_edit" && record) {
      return updateCommunityRecordDirect({
        recordId: record.id,
        title: payload.title,
        summary: payload.summary,
        content: payload.content,
        category: payload.suggestedCategory || record.category,
        status: payload.suggestedStatus || record.status,
        evidenceStatus:
          payload.suggestedEvidenceStatus || record.evidence_status,
        impact: payload.suggestedImpact,
        occurredAt: payload.suggestedOccurredAt,
        occurredAtPrecision: payload.suggestedOccurredAtPrecision,
        contentWarning: payload.suggestedContentWarning,
        markdownAssetPaths: payload.markdownAssetPaths,
      });
    }

    if (isStaffDirect && mode === "source" && record) {
      return createCommunitySourceDirect({
        recordId: record.id,
        sourceName,
        sourceUrl,
        sourceArchiveUrl,
        sourceType,
        sourceNote,
        sourcePublishedAt: sourcePublishedAt || null,
      });
    }

    if (isStaffDirect && mode === "timeline_update" && record) {
      return createCommunityTimelineUpdateDirect({
        recordId: record.id,
        title: updateTitle,
        body: finalMarkdown || "",
        occurredAt: updateOccurredAt,
        markdownAssetPaths,
      });
    }

    return submitCommunitySubmission(payload);
  };

  const handleSubmit = async () => {
    if (isRecordMode && !title.trim()) {
      toast.error("Enter a record title.");
      return;
    }

    if (isRecordMode && !summary.trim()) {
      toast.error("Add a short summary.");
      return;
    }

    if (isRecordMode && !content.trim()) {
      toast.error("Add context for the record.");
      return;
    }

    const hasPrimarySource =
      mode === "record_create" &&
      Boolean(
        sourceName.trim() ||
        sourceUrl.trim() ||
        sourceArchiveUrl.trim() ||
        sourceNote.trim() ||
        sourcePublishedAt,
      );

    if (hasPrimarySource && !sourceName.trim()) {
      toast.error("Enter a name for the primary source.");
      return;
    }

    if (hasPrimarySource && !sourceUrl.trim()) {
      toast.error("Enter a URL for the primary source.");
      return;
    }

    if (mode === "source" && !sourceName.trim()) {
      toast.error("Enter a source name.");
      return;
    }

    if (mode === "source" && !sourceUrl.trim()) {
      toast.error("Enter a source URL.");
      return;
    }

    if (isTimelineMode && !updateTitle.trim()) {
      toast.error("Enter a title for the update.");
      return;
    }

    if (isTimelineMode && !updateOccurredAt) {
      toast.error("Choose when the update occurred.");
      return;
    }

    if (
      (mode === "correction" ||
        mode === "archive_request" ||
        mode === "removal_request") &&
      !details.trim()
    ) {
      toast.error(
        mode === "correction"
          ? "Explain what should be corrected."
          : mode === "removal_request"
            ? "Explain why you want this record removed."
            : "Explain why you want this record archived.",
      );
      return;
    }

    setSubmitting(true);

    try {
      if (usesMarkdown) {
        if (!assetKeyRef.current) {
          assetKeyRef.current = createCommunityAssetKey();
        }

        const draftMarkdown = isRecordMode ? content : updateBody;

        const pendingImages = markdownRef.current?.getPendingImages() ?? [];

        const result = await commitMarkdownImages({
          draftMarkdown,

          previousMarkdown: "",

          pendingImages,

          uploadContext: {
            context: "community",
            resourceKey: assetKeyRef.current,
          },

          save: async (finalMarkdown) => {
            return saveSubmission(finalMarkdown);
          },
        });

        if (!result.success) {
          toast.error(result.error || "Could not submit your contribution.");
          return;
        }

        if ("cleanupWarning" in result && result.cleanupWarning) {
          toast.warning(result.cleanupWarning);
        }
      } else {
        const result = await saveSubmission(null);

        if (!result.success) {
          toast.error(result.error || "Could not submit your contribution.");
          return;
        }
      }

      toast.success(
        isStaffDirect && mode === "record_create"
          ? "Community record created."
          : isStaffDirect && mode === "record_edit"
            ? "Community record updated."
            : isStaffDirect && mode === "source"
              ? "Source added."
              : isStaffDirect && mode === "timeline_update"
                ? "Timeline update added."
                : mode === "record_create"
                  ? "Record sent for review."
                  : mode === "record_edit"
                    ? "Changes sent for review."
                    : mode === "source"
                      ? "Source sent for review."
                      : mode === "timeline_update"
                        ? "Update sent for review."
                        : mode === "correction"
                          ? "Correction sent for review."
                          : mode === "removal_request"
                            ? "Removal request sent for review."
                            : "Archive request sent for review.",
      );

      await onSubmitted?.();

      onOpenChange(false);
    } catch (error) {
      console.error("Community contribution failed:", error);

      toast.error("Could not submit your contribution.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        id="community-submission-dialog"
        className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-visible sm:max-w-4xl"
      >
        <DialogHeader className="shrink-0 text-left">
          <DialogTitle className="flex items-center gap-2">
            {mode === "record_create" ? (
              <Archive className="h-5 w-5 text-primary" />
            ) : mode === "record_edit" ? (
              <FilePenLine className="h-5 w-5 text-primary" />
            ) : mode === "source" ? (
              <Link2 className="h-5 w-5 text-primary" />
            ) : mode === "timeline_update" ? (
              <CalendarDays className="h-5 w-5 text-primary" />
            ) : mode === "correction" ? (
              <MessageSquareText className="h-5 w-5 text-primary" />
            ) : (
              <Flag className="h-5 w-5 text-primary" />
            )}

            {copy.title}
          </DialogTitle>

          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-3 pr-2">
          <div className="space-y-6 py-1">
            {isRecordMode && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="community-record-title">Title</Label>

                    <Input
                      id="community-record-title"
                      value={title}
                      maxLength={180}
                      placeholder="What should this record be called?"
                      onChange={(event) => setTitle(event.target.value)}
                    />

                    <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                      <span>Clear and specific works best.</span>
                      <span
                        className={cn(
                          "tabular-nums",
                          title.length >= 165 && "text-amber-500",
                          title.length >= 180 && "font-medium text-destructive",
                        )}
                      >
                        {title.length} / 180
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="community-record-summary">Summary</Label>

                    <Textarea
                      id="community-record-summary"
                      value={summary}
                      maxLength={1200}
                      rows={3}
                      placeholder="Briefly explain what happened and why it matters."
                      onChange={(event) => setSummary(event.target.value)}
                    />

                    <p className="text-xs text-muted-foreground">
                      Keep this concise. It is used on the archive card.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>

                    <Select
                      value={category}
                      onValueChange={(value) =>
                        setCategory(value as CommunityCategory)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Impact</Label>

                    <Select
                      value={impact}
                      onValueChange={(value) =>
                        setImpact(value as CommunityImpact | "none")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="none">Not assessed</SelectItem>

                        {IMPACT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="community-occurred-at">Event date</Label>

                    <DateTimePicker
                      id="community-occurred-at"
                      value={occurredAt}
                      onChange={setOccurredAt}
                      placeholder="Choose event date"
                      size="default"
                      allowDateOnly
                      defaultIncludeTime={false}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="community-content-warning">
                      Content note
                    </Label>

                    <Input
                      id="community-content-warning"
                      value={contentWarning}
                      maxLength={500}
                      placeholder="Optional"
                      onChange={(event) =>
                        setContentWarning(event.target.value)
                      }
                    />
                  </div>

                  {(isStaffDirect || mode === "record_edit") && (
                    <>
                      <div className="space-y-2">
                        <Label>
                          {isStaffDirect ? "Status" : "Suggested status"}
                        </Label>

                        <Select
                          value={status}
                          onValueChange={(value) =>
                            setStatus(value as CommunityStatus)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>
                          {isStaffDirect ? "Evidence" : "Suggested evidence"}
                        </Label>

                        <Select
                          value={evidenceStatus}
                          onValueChange={(value) =>
                            setEvidenceStatus(value as CommunityEvidenceStatus)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            {EVIDENCE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <Label>Context</Label>

                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Add the context needed to understand the record.
                      Screenshots can be uploaded directly in the editor.
                    </p>
                  </div>

                  <MarkdownField
                    ref={markdownRef}
                    value={content}
                    onChange={setContent}
                    preset="full"
                    slashMenuContainer="#community-submission-dialog"
                    minEditorHeightRem={12}
                    maxEditorHeightRem={30}
                    imageOptions={{
                      enabled: true,
                      maxImages: 10,
                      maxSizeBytes: 5 * 1024 * 1024,
                    }}
                  />
                </div>
              </>
            )}

            {mode === "record_create" && (
              <section className="rounded-2xl border border-border/60 bg-muted/[0.12] p-3 sm:p-4 sm:p-5">
                <div className="mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">Primary source</p>
                    <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Recommended
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Add the main link that supports or preserves this record.
                    You can add more sources later.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="community-source-name">Source name</Label>

                    <Input
                      id="community-source-name"
                      value={sourceName}
                      maxLength={120}
                      placeholder="Official announcement, Reddit thread..."
                      onChange={(event) => setSourceName(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Source type</Label>

                    <Select
                      value={sourceType}
                      onValueChange={(value) =>
                        setSourceType(value as CommunitySourceType)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {SOURCE_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="community-source-url">Source URL</Label>

                    <Input
                      id="community-source-url"
                      value={sourceUrl}
                      placeholder="https://..."
                      onChange={(event) => setSourceUrl(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="community-source-archive-url">
                      Archived copy
                    </Label>

                    <Input
                      id="community-source-archive-url"
                      value={sourceArchiveUrl}
                      placeholder="Optional"
                      onChange={(event) =>
                        setSourceArchiveUrl(event.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="community-source-date">
                      Published date
                    </Label>

                    <DateTimePicker
                      id="community-source-date"
                      value={sourcePublishedAt}
                      onChange={setSourcePublishedAt}
                      allowDateOnly
                      defaultIncludeTime={false}
                      placeholder="Choose publication date"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="community-source-note">
                      Why is this source useful?
                    </Label>

                    <Textarea
                      id="community-source-note"
                      value={sourceNote}
                      rows={4}
                      maxLength={3000}
                      placeholder="Explain what this source supports or adds to the record."
                      onChange={(event) => setSourceNote(event.target.value)}
                    />
                  </div>
                </div>
              </section>
            )}

            {mode === "source" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="community-source-name">Source name</Label>

                    <Input
                      id="community-source-name"
                      value={sourceName}
                      maxLength={120}
                      placeholder="Official announcement, Reddit thread..."
                      onChange={(event) => setSourceName(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Source type</Label>

                    <Select
                      value={sourceType}
                      onValueChange={(value) =>
                        setSourceType(value as CommunitySourceType)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {SOURCE_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="community-source-url">Source URL</Label>

                    <Input
                      id="community-source-url"
                      value={sourceUrl}
                      placeholder="https://..."
                      onChange={(event) => setSourceUrl(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="community-source-archive-url">
                      Archived copy
                    </Label>

                    <Input
                      id="community-source-archive-url"
                      value={sourceArchiveUrl}
                      placeholder="Optional"
                      onChange={(event) =>
                        setSourceArchiveUrl(event.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="community-source-date">
                      Published date
                    </Label>

                    <DateTimePicker
                      id="community-source-date"
                      value={sourcePublishedAt}
                      onChange={setSourcePublishedAt}
                      allowDateOnly
                      defaultIncludeTime={false}
                      placeholder="Choose publication date"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="community-source-note">
                      Why is this source useful?
                    </Label>

                    <Textarea
                      id="community-source-note"
                      value={sourceNote}
                      rows={4}
                      maxLength={3000}
                      placeholder="Explain what this source supports or adds to the record."
                      onChange={(event) => setSourceNote(event.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {isTimelineMode && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="community-update-title">Update title</Label>

                    <Input
                      id="community-update-title"
                      value={updateTitle}
                      maxLength={180}
                      placeholder="What changed?"
                      onChange={(event) => setUpdateTitle(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="community-update-date">
                      When did it happen?
                    </Label>

                    <DateTimePicker
                      id="community-update-date"
                      value={updateOccurredAt}
                      onChange={setUpdateOccurredAt}
                      allowDateOnly
                      defaultIncludeTime={false}
                      placeholder="Choose date and time"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label>Update details</Label>

                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Explain the development and include screenshots when they
                      help preserve context.
                    </p>
                  </div>

                  <MarkdownField
                    ref={markdownRef}
                    value={updateBody}
                    onChange={setUpdateBody}
                    preset="full"
                    slashMenuContainer="#community-submission-dialog"
                    minEditorHeightRem={10}
                    maxEditorHeightRem={26}
                    imageOptions={{
                      enabled: true,
                      maxImages: 8,
                      maxSizeBytes: 5 * 1024 * 1024,
                    }}
                  />
                </div>
              </>
            )}

            {(mode === "correction" ||
              mode === "archive_request" ||
              mode === "removal_request") && (
              <div className="space-y-2">
                <Label htmlFor="community-submission-details">
                  {mode === "correction"
                    ? "What should be corrected?"
                    : mode === "removal_request"
                      ? "Why should this record be removed?"
                      : "Why should this record be archived or removed?"}
                </Label>

                <Textarea
                  id="community-submission-details"
                  value={details}
                  rows={8}
                  maxLength={12_000}
                  placeholder={
                    mode === "correction"
                      ? "Identify the information and explain what should change. Include source links when useful."
                      : mode === "removal_request"
                        ? "Explain why this record should no longer be publicly available."
                        : "Explain your request and any relevant context staff should consider."
                  }
                  onChange={(event) => setDetails(event.target.value)}
                />
              </div>
            )}

            {!isStaffDirect && (
              <div className="rounded-2xl border border-primary/20 bg-primary/4 p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                  <div>
                    <p className="text-sm font-medium">
                      Reviewed before publishing
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Community contributions enter a review queue. Submitting a
                      contribution does not immediately change the public
                      record.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {mode === "record_edit" && record && (
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Based on revision {record.revision}
              </div>
            )}
          </div>
        </div>

        <DialogFooter
          className={cn(
            "relative z-10 shrink-0",
            "border-t border-border/60",
            "bg-background/95 px-1 pb-1 pt-4",
            "backdrop-blur-xl",
          )}
        >
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer sm:w-auto"
            disabled={submitting}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            type="button"
            className="w-full cursor-pointer sm:w-auto"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}

            {copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
