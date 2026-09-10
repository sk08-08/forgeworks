// ============================================================================
// Forgeworks - Moderation Panel
// Review and manage flagged form submissions
// ============================================================================

"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  ChevronDown,
  AlertCircle,
  Ban,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";
import {
  getFlaggedRequestsForForm,
  markFlaggedAsReviewed,
  blockIpAddress,
} from "@/features/moderation/actions/safety";
import type { ContentFilterResult } from "@/features/moderation/lib/content-filter";
import { CustomBlocklist } from "./custom-blocklist";
import { SensitivityLevelSettings } from "./sensitivity-level";

interface FlaggedRequest {
  id: string;
  form_id: string;
  request_id: string;
  risk_level: "warning" | "dangerous";
  flagged_fields: Record<string, ContentFilterResult>;
  reason?: string;
  reviewed: boolean;
  review_action?: "approved" | "rejected";
  review_notes?: string;
  created_at: string;
  request?: {
    response_labels?: Record<string, string>;
    submitter_name?: string | null;
    ip_address?: string | null;
  } | null;
}

interface ModerationPanelProps {
  formId: string;
  formTitle?: string;
  formOwnerId?: string | null;
  currentUserId?: string | null;
}

const FLAG_LABELS: Record<string, string> = {
  all_caps_aggression: "All-caps aggression",
  excessive_punctuation: "Excessive punctuation",
  spam_repetition: "Repeated-character spam",
  spam_keywords: "Spam keywords",
  suspicious_url_domain: "Suspicious URL",
  malicious_url: "Malicious URL",
  harassment_detected: "Harassment",
  threat_detected: "Threat",
  hate_speech_detected: "Hate speech",
  dangerous_content_detected: "Dangerous content",
  blocklist_match: "Blocklist match",
  blocklist_regex_match: "Regex blocklist match",
};

function formatIpAddress(ip?: string | null) {
  const value = String(ip || "").trim();

  if (!value) {
    return {
      display: "Unavailable",
      isLocal: false,
    };
  }

  const isLocal =
    value === "::1" || value === "127.0.0.1" || value === "::ffff:127.0.0.1";

  if (isLocal) {
    return {
      display: "Localhost (development)",
      isLocal: true,
    };
  }

  return {
    display: value,
    isLocal: false,
  };
}

function RiskBadge({ level }: { level: "warning" | "dangerous" }) {
  if (level === "dangerous") {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <AlertTriangle className="h-3 w-3" />
        Dangerous
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="
        gap-1.5
        border-orange-500/30
        bg-orange-500/10
        text-orange-600
        dark:text-orange-400
      "
    >
      <AlertCircle className="h-3 w-3" />
      Warning
    </Badge>
  );
}

function FlaggedFieldsViewer({
  flaggedFields,
  fieldLabels,
}: {
  flaggedFields: Record<string, ContentFilterResult>;
  fieldLabels?: Record<string, string>;
}) {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const toggleField = (fieldName: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);

      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }

      return next;
    });
  };

  return (
    <div className="space-y-2">
      {Object.entries(flaggedFields).map(([fieldName, result]) => {
        const rawLabel = fieldLabels?.[fieldName] || "";

        const label = stripMarkdownToText(rawLabel).trim() || "Untitled field";

        const isExpanded = expandedFields.has(fieldName);

        return (
          <div
            key={fieldName}
            className="overflow-hidden rounded-xl border bg-muted/20 transition-colors"
          >
            <button
              type="button"
              onClick={() => toggleField(fieldName)}
              aria-expanded={isExpanded}
              className="flex w-full cursor-pointer items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 break-words text-sm font-medium">
                    {label}
                  </span>

                  <Badge variant="outline" className="shrink-0 text-xs">
                    {result.flags.length}{" "}
                    {result.flags.length === 1 ? "flag" : "flags"}
                  </Badge>
                </div>
              </div>

              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out ${
                  isExpanded ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            <div
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                isExpanded
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="space-y-3 border-t px-3 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {result.flags.map((flag) => (
                      <Badge
                        key={flag}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {FLAG_LABELS[flag] || flag}
                      </Badge>
                    ))}
                  </div>

                  {result.reason && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {result.reason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReviewFlaggedDialog({
  flagged,
  onApprove,
  onReject,
  onBlockIp,
  formTitle,
}: {
  flagged: FlaggedRequest;
  onApprove: (notes?: string) => Promise<void>;
  onReject: (notes?: string) => Promise<void>;
  onBlockIp: (ipAddress: string, reason?: string) => Promise<void>;
  formTitle?: string;
}) {
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const fieldLabels = flagged.request?.response_labels || {};
  const ipInfo = formatIpAddress(flagged.request?.ip_address);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove(notes);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject(notes);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBlockIp = async () => {
    const ipAddress = flagged.request?.ip_address;
    if (!ipAddress) return;

    setIsProcessing(true);
    try {
      await onBlockIp(
        ipAddress,
        notes.trim() || flagged.review_notes || flagged.reason || undefined,
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DialogContent
      className="
      flex
      h-[min(90vh,52rem)]
      w-[calc(100vw-2rem)]
      max-w-5xl
      flex-col
      overflow-hidden
      p-0
      sm:max-w-5xl
    "
    >
      {/* Header */}
      <DialogHeader className="shrink-0 border-b px-5 py-4 pr-14 sm:px-6 sm:pr-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <DialogTitle className="text-lg">Review Submission</DialogTitle>

            <DialogDescription className="mt-1 max-w-2xl">
              Review the detected signals before deciding what to do.
            </DialogDescription>
          </div>

          <div className="shrink-0 sm:pt-0.5">
            <RiskBadge level={flagged.risk_level} />
          </div>
        </div>
      </DialogHeader>

      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)]">
          {/* Main moderation content */}
          <div className="min-w-0 space-y-6">
            {/* Reason */}
            <section>
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      Why this was flagged
                    </p>

                    <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground">
                      {flagged.reason || "No specific reason was provided."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Flagged fields */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Flagged Fields</h3>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Inspect which fields triggered moderation rules.
                  </p>
                </div>

                <Badge variant="outline" className="shrink-0">
                  {Object.keys(flagged.flagged_fields).length}{" "}
                  {Object.keys(flagged.flagged_fields).length === 1
                    ? "field"
                    : "fields"}
                </Badge>
              </div>

              <FlaggedFieldsViewer
                flaggedFields={flagged.flagged_fields}
                fieldLabels={fieldLabels}
              />
            </section>
          </div>

          {/* Context / review sidebar */}
          <aside className="min-w-0 space-y-5 lg:border-l lg:pl-6">
            <section>
              <div className="mb-3">
                <h3 className="text-sm font-semibold">Submission Details</h3>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Context associated with this submission.
                </p>
              </div>

              <div className="space-y-2">
                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Form
                  </p>

                  <p className="mt-1 break-words text-sm font-medium">
                    {stripMarkdownToText(formTitle || "").trim() ||
                      "Unknown form"}
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Submitted
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {new Date(flagged.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Submitter
                  </p>

                  <p className="mt-1 break-words text-sm font-medium">
                    {flagged.request?.submitter_name || "Anonymous"}
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    IP address
                  </p>

                  <p className="mt-1 break-all font-mono text-sm">
                    {ipInfo.display}
                  </p>

                  {ipInfo.isLocal && (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      Local development requests do not expose a public IP.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section>
              <Label htmlFor="review-notes" className="text-sm font-semibold">
                Review Notes
                <span className="ml-1 font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>

              <p className="mt-1 text-xs text-muted-foreground">
                Add context about your moderation decision.
              </p>

              <Textarea
                id="review-notes"
                placeholder="Add notes about your decision..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-3 min-h-28 resize-y text-sm"
                rows={5}
              />
            </section>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <DialogFooter
        className="
        shrink-0
        border-t
        bg-background/95
        px-5
        py-4
        backdrop-blur
        sm:px-6
      "
      >
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="secondary"
            onClick={handleBlockIp}
            disabled={
              isProcessing || !flagged.request?.ip_address || ipInfo.isLocal
            }
            className="w-full cursor-pointer sm:w-auto"
          >
            <Ban className="mr-2 h-4 w-4" />
            Block IP
          </Button>

          <div className="hidden flex-1 sm:block" />

          <Button
            type="button"
            variant="destructive"
            onClick={handleReject}
            disabled={isProcessing}
            className="w-full cursor-pointer sm:w-auto"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={handleApprove}
            disabled={isProcessing}
            className="w-full cursor-pointer sm:w-auto"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

export function ModerationPanel({
  formId,
  formTitle,
  formOwnerId,
  currentUserId,
}: ModerationPanelProps) {
  const [flaggedRequests, setFlaggedRequests] = useState<FlaggedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "warning" | "dangerous">("all");
  const [selectedFlagged, setSelectedFlagged] = useState<FlaggedRequest | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [activeView, setActiveView] = useState<"queue" | "settings">("queue");

  const canManageSettings =
    !!formOwnerId && !!currentUserId && formOwnerId === currentUserId;

  useEffect(() => {
    loadFlaggedRequests();
  }, [formId]);

  const loadFlaggedRequests = async () => {
    setLoading(true);
    try {
      const result = await getFlaggedRequestsForForm(formId);
      if (result.success && result.flaggedRequests) {
        setFlaggedRequests(result.flaggedRequests);
      }
    } catch (error) {
      console.error("Failed to load flagged requests:", error);
      toast.error("Failed to load flagged requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (flaggedId: string, notes?: string) => {
    try {
      const result = await markFlaggedAsReviewed(flaggedId, "approved", notes);
      if (result.success) {
        toast.success("Submission approved");
        setSelectedFlagged(null);
        await loadFlaggedRequests();
      } else {
        toast.error(result.error || "Failed to approve");
      }
    } catch (error) {
      console.error("Error approving:", error);
      toast.error("Failed to approve submission");
    }
  };

  const handleReject = async (flaggedId: string, notes?: string) => {
    try {
      const result = await markFlaggedAsReviewed(flaggedId, "rejected", notes);
      if (result.success) {
        toast.success("Submission rejected");
        setSelectedFlagged(null);
        await loadFlaggedRequests();
      } else {
        toast.error(result.error || "Failed to reject");
      }
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error("Failed to reject submission");
    }
  };

  const handleBlockIp = async (ipAddress: string, reason?: string) => {
    try {
      const result = await blockIpAddress(
        formId,
        ipAddress,
        reason || "Blocked from moderation review",
      );
      if (result.success) {
        toast.success(`IP ${ipAddress} blocked`);
        setSelectedFlagged(null);
      } else {
        toast.error(result.error || "Failed to block IP");
      }
    } catch (error) {
      console.error("Error blocking IP:", error);
      toast.error("Failed to block IP");
    }
  };

  const toggleSelectId = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    setBulkProcessing(true);
    let successful = 0;
    let failed = 0;

    for (const id of selectedIds) {
      try {
        const result = await markFlaggedAsReviewed(id, "approved");
        if (result.success) successful++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setBulkProcessing(false);
    setSelectedIds(new Set());
    await loadFlaggedRequests();

    if (failed === 0) {
      toast.success(
        `Approved ${successful} submission${successful !== 1 ? "s" : ""}`,
      );
    } else {
      toast.warning(
        `Approved ${successful}, failed ${failed}. Please try again for failures.`,
      );
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;

    setBulkProcessing(true);
    let successful = 0;
    let failed = 0;

    for (const id of selectedIds) {
      try {
        const result = await markFlaggedAsReviewed(id, "rejected");
        if (result.success) successful++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setBulkProcessing(false);
    setSelectedIds(new Set());
    await loadFlaggedRequests();

    if (failed === 0) {
      toast.success(
        `Rejected ${successful} submission${successful !== 1 ? "s" : ""}`,
      );
    } else {
      toast.warning(
        `Rejected ${successful}, failed ${failed}. Please try again for failures.`,
      );
    }
  };

  const filteredRequests = flaggedRequests.filter((req) => {
    if (filter === "all") return true;
    return req.risk_level === filter;
  });

  const stats = {
    total: flaggedRequests.length,
    pending: flaggedRequests.filter((r) => !r.reviewed).length,
    dangerous: flaggedRequests.filter((r) => r.risk_level === "dangerous")
      .length,
    warnings: flaggedRequests.filter((r) => r.risk_level === "warning").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Moderation</h2>

          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Review suspicious submissions and configure how this form handles
            potentially unsafe content.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Total flagged
          </p>

          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {stats.total}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">Pending</p>

          <p className="mt-1 text-2xl font-semibold tracking-tight text-yellow-600">
            {stats.pending}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">Warnings</p>

          <p className="mt-1 text-2xl font-semibold tracking-tight text-orange-600">
            {stats.warnings}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">Dangerous</p>

          <p className="mt-1 text-2xl font-semibold tracking-tight text-red-600">
            {stats.dangerous}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 rounded-xl border bg-muted/30 p-1">
        <Button
          type="button"
          size="sm"
          data-state={activeView === "queue" ? "active" : "inactive"}
          variant={activeView === "queue" ? "secondary" : "ghost"}
          onClick={() => setActiveView("queue")}
          className="cursor-pointer data-[state=active]:cursor-default data-[state=inactive]:cursor-pointer"
        >
          Moderation Queue
        </Button>

        <Button
          type="button"
          size="sm"
          data-state={activeView === "settings" ? "active" : "inactive"}
          variant={activeView === "settings" ? "secondary" : "ghost"}
          onClick={() => setActiveView("settings")}
          className="cursor-pointer data-[state=active]:cursor-default data-[state=inactive]:cursor-pointer"
        >
          Security Settings
        </Button>
      </div>

      <div className="space-y-3">
        {activeView === "queue" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                Risk
              </span>

              <Select
                value={filter}
                onValueChange={(value) =>
                  setFilter(value as "all" | "warning" | "dangerous")
                }
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All risk levels</SelectItem>

                  <SelectItem value="warning">Warnings</SelectItem>

                  <SelectItem value="dangerous">Dangerous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              {filteredRequests.length}{" "}
              {filteredRequests.length === 1 ? "submission" : "submissions"}
            </p>
          </div>
        )}

        {selectedIds.size > 0 && (
          <div className="rounded-xl border bg-muted/40 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  {selectedIds.size} selected
                </p>

                <p className="text-xs text-muted-foreground">
                  Apply an action to all selected submissions.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:flex">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkApprove}
                  disabled={bulkProcessing}
                  className="w-full cursor-pointer sm:w-auto"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkReject}
                  disabled={bulkProcessing}
                  className="w-full cursor-pointer sm:w-auto"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={bulkProcessing}
                  className="w-full cursor-pointer sm:w-auto"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeView === "settings" && (
        <div className="space-y-4">
          {canManageSettings ? (
            <>
              <SensitivityLevelSettings formId={formId} formTitle={formTitle} />

              <CustomBlocklist formId={formId} formTitle={formTitle} />
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm font-medium">Settings unavailable</p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Blocklist and sensitivity settings are only available for
                      forms you own.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeView === "queue" && (
        <div className="space-y-2">
          {loading ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Loading flagged submissions...
              </CardContent>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <CheckCircle className="mb-3 h-8 w-8 text-muted-foreground/60" />

                <p className="text-sm font-medium">
                  {stats.total === 0
                    ? "No flagged submissions"
                    : "Nothing matches this filter"}
                </p>

                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {stats.total === 0
                    ? "Submissions that trigger security rules will appear here for review."
                    : "Try selecting another risk level."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((flagged) => {
              const flaggedFieldCount = Object.keys(
                flagged.flagged_fields,
              ).length;

              return (
                <Card
                  key={flagged.id}
                  className="transition-all hover:border-foreground/20 hover:shadow-sm"
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {!flagged.reviewed && (
                        <Checkbox
                          checked={selectedIds.has(flagged.id)}
                          onCheckedChange={() => toggleSelectId(flagged.id)}
                          className="mt-1 shrink-0"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <RiskBadge level={flagged.risk_level} />

                              <Badge variant="outline">
                                {flaggedFieldCount}{" "}
                                {flaggedFieldCount === 1 ? "field" : "fields"}
                              </Badge>

                              {flagged.reviewed && (
                                <Badge variant="outline">
                                  {flagged.review_action === "approved" ? (
                                    <>
                                      <CheckCircle className="mr-1 h-3 w-3" />
                                      Approved
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="mr-1 h-3 w-3" />
                                      Rejected
                                    </>
                                  )}
                                </Badge>
                              )}
                            </div>

                            {flagged.reason && (
                              <p className="line-clamp-2 break-words text-sm text-muted-foreground">
                                {flagged.reason}
                              </p>
                            )}

                            <p className="text-xs text-muted-foreground">
                              {new Date(flagged.created_at).toLocaleString()}
                            </p>
                          </div>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full shrink-0 cursor-pointer sm:w-auto"
                                onClick={() => setSelectedFlagged(flagged)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Review
                              </Button>
                            </DialogTrigger>

                            {selectedFlagged?.id === flagged.id && (
                              <ReviewFlaggedDialog
                                flagged={flagged}
                                onApprove={(notes) =>
                                  handleApprove(flagged.id, notes)
                                }
                                onReject={(notes) =>
                                  handleReject(flagged.id, notes)
                                }
                                onBlockIp={handleBlockIp}
                                formTitle={formTitle}
                              />
                            )}
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
