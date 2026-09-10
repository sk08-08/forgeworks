// ============================================================================
// Forgeworks - Submissions View
// Kanban board view for managing incoming submissions
// ============================================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Inbox, LayoutGrid, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KanbanBoard } from "./kanban-board";
import { useStore } from "@/features/app-shell/store/app-store";
import { toast } from "sonner";
import type { RequestStatus } from "@/features/forms/types/form-types";
import {
  exportToCsv,
  exportToJson,
  getExportColumnOrder,
  serializeExportDataToJson,
  transformSubmissionsForExport,
  transformSubmissionsForJson,
  type ExportFormSchemaMap,
} from "@/features/forms/lib/form-export";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";

function EmptyState() {
  const { setCurrentView } = useStore();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mt-6 text-xl font-semibold">No submissions yet</h3>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Share your forms with your community to start receiving submissions.
      </p>
      <Button
        className="mt-6 cursor-pointer"
        variant="outline"
        onClick={() => setCurrentView("forms")}
      >
        <LayoutGrid className="mr-2 h-4 w-4" />
        Manage Forms
      </Button>
    </div>
  );
}

const cleanResponseLabels = (
  labels?: Record<string, string>,
): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(labels || {}).flatMap(([fieldId, label]) => {
      const cleaned = stripMarkdownToText(label).trim();

      return cleaned ? [[fieldId, cleaned]] : [];
    }),
  );
};

const EXPORT_PREVIEW_LIMIT = 50;
const JSON_PREVIEW_LIMIT = 20;

export function RequestsView() {
  const { requests, forms, updateRequestStatus, deleteRequest } = useStore();
  const [filterFormId, setFilterFormId] = useState<string>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accessLoaded, setAccessLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const supabase = createClient();
        const access = await getCurrentUserAccess(supabase);
        if (!mounted) return;
        setCurrentUserId(access.user?.id ?? null);
      } catch {
        if (!mounted) return;
        setCurrentUserId(null);
      } finally {
        if (mounted) setAccessLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const ownForms = useMemo(
    () =>
      forms.filter((form) => !!currentUserId && form.ownerId === currentUserId),
    [forms, currentUserId],
  );

  const ownFormIds = useMemo(
    () => new Set(ownForms.map((form) => form.id)),
    [ownForms],
  );

  const formOwnerMap = useMemo(
    () => new Map(ownForms.map((form) => [form.id, form.ownerId ?? null])),
    [ownForms],
  );

  useEffect(() => {
    if (filterFormId !== "all" && !ownFormIds.has(filterFormId)) {
      setFilterFormId("all");
    }
  }, [filterFormId, ownFormIds]);

  const matchesFilter = (requestFormId: string) =>
    filterFormId === "all" || requestFormId === filterFormId;

  const isOwnRequest = (requestFormId: string) => {
    if (!currentUserId) return false;
    const ownerId = formOwnerMap.get(requestFormId);
    return ownerId === currentUserId;
  };

  const ownRequestsOnly = useMemo(
    () => requests.filter((request) => ownFormIds.has(request.formId)),
    [requests, ownFormIds],
  );

  const filteredRequests = ownRequestsOnly.filter((request) =>
    matchesFilter(request.formId),
  );
  const selectedFormOwnerId =
    filterFormId === "all" ? null : (formOwnerMap.get(filterFormId) ?? null);
  const isSelectedFormOwn =
    filterFormId === "all" ||
    !currentUserId ||
    !selectedFormOwnerId ||
    selectedFormOwnerId === currentUserId;

  const ownRequests =
    filterFormId === "all"
      ? currentUserId
        ? filteredRequests.filter(
            (request) =>
              request.ownerId === currentUserId || isOwnRequest(request.formId),
          )
        : filteredRequests
      : isSelectedFormOwn
        ? filteredRequests.filter(
            (request) =>
              request.ownerId === currentUserId || isOwnRequest(request.formId),
          )
        : [];

  const hasVisibleRequests = ownRequests.length > 0;

  const handleStatusChange = (
    requestId: string,
    status: RequestStatus,
    notes?: string,
  ) => {
    updateRequestStatus(requestId, status, notes);
    const statusLabels: Record<RequestStatus, string> = {
      new: "New",
      accepted: "In Progress",
      completed: "Completed",
      rejected: "Rejected",
    };
    toast.success(`Request moved to ${statusLabels[status]}`);
  };

  const handleDelete = (requestId: string) => {
    deleteRequest(requestId);
    toast.success("Request deleted");
  };

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [exportScope, setExportScope] = useState<"single" | "all">("single");
  const [exportStatusFilter, setExportStatusFilter] = useState<
    "all" | RequestStatus
  >("all");
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [selectedExportFormId, setSelectedExportFormId] = useState<string>("");

  const ownRequestsForExport = useMemo(
    () => requests.filter((request) => ownFormIds.has(request.formId)),
    [requests, ownFormIds],
  );

  const cleanedFormTitlesById = useMemo(
    () =>
      new Map(
        ownForms.map((form) => [
          form.id,
          stripMarkdownToText(form.title) || "Untitled form",
        ]),
      ),
    [ownForms],
  );

  const exportFormSchemas = useMemo<ExportFormSchemaMap>(() => {
    return Object.fromEntries(
      ownForms.map((form) => [
        form.id,
        {
          formId: form.id,

          fields: form.sections.flatMap((section) => {
            const sectionTitle = stripMarkdownToText(
              section.title || "",
            ).trim();

            return section.fields.map((field) => {
              const fieldLabel = stripMarkdownToText(field.label || "").trim();

              return {
                id: field.id,
                label:
                  fieldLabel ||
                  (section.fields.length === 1 ? sectionTitle : ""),
              };
            });
          }),
        },
      ]),
    );
  }, [ownForms]);

  const openExportDialog = (format: "csv" | "json") => {
    setExportFormat(format);
    if (ownForms.length === 0) {
      toast.error("No forms to export");
      return;
    }

    const preSelected =
      filterFormId !== "all" && ownForms.some((f) => f.id === filterFormId)
        ? filterFormId
        : ownForms[0]?.id || "";

    setSelectedExportFormId(preSelected);
    setExportScope(
      ownForms.length > 1 && filterFormId === "all" ? "all" : "single",
    );
    setExportStatusFilter("all");
    setIncludeMetadata(true);
    setExportDialogOpen(true);
  };

  const exportFilteredRequests = useMemo(() => {
    const scopedRequests =
      exportScope === "all"
        ? ownRequestsForExport
        : ownRequestsForExport.filter(
            (request) => request.formId === selectedExportFormId,
          );

    return exportStatusFilter === "all"
      ? scopedRequests
      : scopedRequests.filter(
          (request) => request.status === exportStatusFilter,
        );
  }, [
    exportScope,
    ownRequestsForExport,
    selectedExportFormId,
    exportStatusFilter,
  ]);

  const exportSourceData = useMemo(
    () =>
      exportFilteredRequests.map((request) => ({
        id: request.id,
        form_id: request.formId,

        form_title:
          cleanedFormTitlesById.get(request.formId) ||
          stripMarkdownToText(request.formTitle) ||
          "Untitled form",

        created_at: request.createdAt
          ? new Date(request.createdAt).toISOString()
          : "",

        status: request.status,
        submitter_name: request.submitterName,

        responses: request.responses as Record<string, unknown>,

        response_labels: cleanResponseLabels(request.responseLabels),
      })),
    [exportFilteredRequests, cleanedFormTitlesById],
  );

  const csvExportRows = useMemo(
    () =>
      transformSubmissionsForExport(exportSourceData, {
        includeMetadata,
        formSchemas: exportFormSchemas,
      }),
    [exportSourceData, includeMetadata, exportFormSchemas],
  );

  const jsonExportData = useMemo(
    () =>
      transformSubmissionsForJson(exportSourceData, {
        includeMetadata,
        formSchemas: exportFormSchemas,
      }),
    [exportSourceData, includeMetadata, exportFormSchemas],
  );

  const csvPreviewColumns = useMemo(
    () => getExportColumnOrder(csvExportRows),
    [csvExportRows],
  );

  const previewRows = useMemo(
    () => csvExportRows.slice(0, EXPORT_PREVIEW_LIMIT),
    [csvExportRows],
  );

  const jsonPreviewData = useMemo(
    () => jsonExportData.slice(0, JSON_PREVIEW_LIMIT),
    [jsonExportData],
  );

  const jsonPreviewText = useMemo(() => {
    if (jsonPreviewData.length === 0) {
      return "";
    }

    return serializeExportDataToJson(jsonPreviewData);
  }, [jsonPreviewData]);

  const currentPreviewCount =
    exportFormat === "csv" ? previewRows.length : jsonPreviewData.length;

  const hasMorePreviewItems = exportSourceData.length > currentPreviewCount;

  const doExport = () => {
    if (exportSourceData.length === 0) {
      toast.error("No submissions match the current export filters");
      return;
    }

    const targetFormTitle =
      exportScope === "single"
        ? cleanedFormTitlesById.get(selectedExportFormId) || "form"
        : "all-forms";

    const normalizedName = targetFormTitle
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();

    const safeName = normalizedName || "form";

    const timestamp = new Date().toISOString().slice(0, 10);

    const filename = `requests-${safeName}-${timestamp}`;

    if (exportFormat === "csv") {
      exportToCsv(csvExportRows, `${filename}.csv`);
    } else {
      exportToJson(jsonExportData, `${filename}.json`);
    }

    setExportDialogOpen(false);

    toast.success(
      `Exported ${exportSourceData.length} submissions as ${exportFormat.toUpperCase()}`,
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Submissions
          </h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
            Manage incoming submissions with the Kanban board
          </p>
        </div>

        <div className="flex items-center gap-2">
          {accessLoaded && ownForms.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => openExportDialog("csv")}
            >
              <FileDown className="mr-1 h-3.5 w-3.5" />
              Export
            </Button>
          )}
          {accessLoaded && ownForms.length > 0 && (
            <Select value={filterFormId} onValueChange={setFilterFormId}>
              <SelectTrigger className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by form" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Forms</SelectItem>
                {ownForms.map((form) => (
                  <SelectItem key={form.id} value={form.id}>
                    {stripMarkdownToText(form.title) || "Untitled form"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {!accessLoaded ? (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">Loading submissions…</p>
          </div>
        </div>
      ) : hasVisibleRequests ? (
        <KanbanBoard
          requests={ownRequests}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          collapseStateKey="kanban-collapsed-requests"
        />
      ) : ownRequestsOnly.length > 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No submissions match the selected filter
            </p>
            <Button
              variant="link"
              className="cursor-pointer"
              onClick={() => setFilterFormId("all")}
            >
              View all submissions
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <EmptyState />
        </Card>
      )}

      {/* Export Dialog with controls + preview */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-full sm:max-w-[95vw] max-h-[92vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 py-4 sm:px-6 border-b">
            <DialogTitle>Export Submissions</DialogTitle>
            <DialogDescription>
              Configure export options and preview the file before downloading.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)] flex-1 min-h-0 overflow-hidden">
            <div className="space-y-4 border-b px-4 py-4 sm:px-6 lg:border-b-0 lg:border-r overflow-y-auto">
              <div className="rounded-md border bg-muted/20 p-3 space-y-3">
                <div className="space-y-2">
                  <Label>Export format</Label>
                  <Select
                    value={exportFormat}
                    onValueChange={(value) =>
                      setExportFormat(value as "csv" | "json")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV — Spreadsheet</SelectItem>

                      <SelectItem value="json">
                        JSON — Structured data
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {exportFormat === "csv"
                      ? "Best for Excel, Google Sheets, and spreadsheet analysis."
                      : "Preserves field IDs, arrays, labels, and structured response data."}
                  </p>
                </div>

                {ownForms.length > 1 && (
                  <div className="space-y-2">
                    <Label>Scope</Label>
                    <Select
                      value={exportScope}
                      onValueChange={(value) =>
                        setExportScope(value as "single" | "all")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Form</SelectItem>
                        <SelectItem value="all">All My Forms</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(exportScope === "single" || ownForms.length === 1) && (
                  <div className="space-y-2">
                    <Label>Form</Label>
                    <Select
                      value={selectedExportFormId}
                      onValueChange={setSelectedExportFormId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a form..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ownForms.map((form) => {
                          const count = ownRequestsForExport.filter(
                            (r) => r.formId === form.id,
                          ).length;
                          const formTitle =
                            cleanedFormTitlesById.get(form.id) ||
                            "Untitled form";
                          return (
                            <SelectItem key={form.id} value={form.id}>
                              {formTitle} ({count})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Status Filter</Label>
                  <Select
                    value={exportStatusFilter}
                    onValueChange={(value) =>
                      setExportStatusFilter(value as "all" | RequestStatus)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="accepted">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="include-metadata"
                    checked={includeMetadata}
                    onCheckedChange={(checked) =>
                      setIncludeMetadata(checked === true)
                    }
                    className="mt-0.5 shrink-0"
                  />

                  <div className="min-w-0 flex-1 space-y-1">
                    <Label
                      htmlFor="include-metadata"
                      className="cursor-pointer text-sm font-medium"
                    >
                      Include submission metadata
                    </Label>

                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Includes request ID, form, submission date, status, and
                      submitter name.
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  {hasMorePreviewItems
                    ? `Showing ${currentPreviewCount} of ${exportSourceData.length} submissions`
                    : `${exportSourceData.length} submission${
                        exportSourceData.length === 1 ? "" : "s"
                      }`}
                </p>
              </div>
            </div>

            <div className="min-w-0 px-4 py-4 sm:px-6 flex flex-col min-h-0">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">File Preview</p>
                <p className="text-xs text-muted-foreground">
                  {exportFormat === "csv"
                    ? "Spreadsheet view"
                    : "Code block view"}
                </p>
              </div>

              {exportSourceData.length === 0 ? (
                <div className="rounded-md border bg-muted/20 p-6 text-sm text-muted-foreground">
                  No submissions match the current filters.
                </div>
              ) : exportFormat === "csv" ? (
                <div className="rounded-md border overflow-hidden bg-background flex-1 min-h-0">
                  <div className="max-h-[42vh] lg:max-h-none lg:h-full overflow-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-xs">
                      <thead className="sticky top-0 z-10 bg-muted">
                        <tr>
                          <th className="border-b border-r px-2 py-2 text-left font-medium text-muted-foreground w-12">
                            #
                          </th>
                          {csvPreviewColumns.map((column) => (
                            <th
                              key={column}
                              className="border-b border-r px-2 py-2 text-left font-medium whitespace-nowrap"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, rowIndex) => (
                          <tr
                            key={`preview-row-${rowIndex}`}
                            className="odd:bg-muted/20"
                          >
                            <td className="border-b border-r px-2 py-1.5 text-muted-foreground">
                              {rowIndex + 1}
                            </td>
                            {csvPreviewColumns.map((column) => (
                              <td
                                key={`${rowIndex}-${column}`}
                                className="max-w-72 border-b border-r px-2 py-1.5 align-top whitespace-normal wrap-anywhere"
                              >
                                <div className="line-clamp-3">
                                  {String(
                                    row[column as keyof typeof row] ?? "",
                                  )}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden flex-1 min-h-0">
                  <pre className="max-h-[42vh] lg:max-h-none lg:h-full overflow-auto whitespace-pre bg-zinc-950 text-zinc-100 p-4 text-xs leading-5">
                    <code>{jsonPreviewText}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 border-t px-4 py-4 sm:flex-row sm:px-6">
            <Button
              variant="outline"
              className="w-full cursor-pointer sm:w-auto"
              onClick={() => setExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="w-full cursor-pointer sm:w-auto"
              disabled={exportSourceData.length === 0}
              onClick={doExport}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export {exportFormat.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
