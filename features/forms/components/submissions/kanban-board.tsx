// ============================================================================
// Forgeworks - Kanban Board Component
// Visual request management with drag-and-drop columns
// ============================================================================

"use client";

import { useEffect, useState, useMemo } from "react";
import { useStore } from "@/features/app-shell/store/app-store";
import {
  MoreVertical,
  Trash2,
  ArrowLeft,
  ArrowRight,
  ChevronsRight,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Inbox,
  Loader2,
  ChevronDown,
  ChevronUp,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownInlineRenderer } from "@/features/markdown/components/markdown-renderer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatDateTime } from "@/lib/utils";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";
import type { Request, RequestStatus } from "@/features/forms/types/form-types";

// ----------------------------------------------------------------------------
// Column Configuration
// ----------------------------------------------------------------------------

interface ColumnConfig {
  id: RequestStatus;
  title: string;
  icon: typeof Inbox;
  color: string;
  bgColor: string;
}

const columns: ColumnConfig[] = [
  {
    id: "new",
    title: "New",
    icon: Inbox,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "accepted",
    title: "In Progress",
    icon: Loader2,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
  {
    id: "completed",
    title: "Completed",
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    id: "rejected",
    title: "Rejected",
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
];

// ----------------------------------------------------------------------------
// Request Card Component
// ----------------------------------------------------------------------------

interface RequestCardProps {
  request: Request;
  getOrderedResponseEntries: (
    request: Request,
  ) => Array<[string, string | string[]]>;
  onStatusChange: (status: RequestStatus, notes?: string) => void;
  onDelete: () => void;
  onViewDetails: () => void;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  isAdmin?: boolean;
  className?: string;
}

function RequestCard({
  request,
  getOrderedResponseEntries,
  onStatusChange,
  onDelete,
  onViewDetails,
  isSelected,
  onSelectionChange,
  isAdmin,
  className,
}: RequestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const resolveLabel = (key: string) => {
    const label = stripMarkdownToText(
      request.responseLabels?.[key] || "",
    ).trim();

    if (!label || label === key || looksLikeFieldId(label)) {
      return "Untitled field";
    }

    return label;
  };

  // Get primary response fields for preview
  const orderedResponseEntries = useMemo(
    () => getOrderedResponseEntries(request),
    [getOrderedResponseEntries, request],
  );
  const previewFields = useMemo(() => {
    return orderedResponseEntries.slice(0, 2);
  }, [orderedResponseEntries]);
  const expandedFields = useMemo(() => {
    return orderedResponseEntries.slice(2);
  }, [orderedResponseEntries]);
  const extraFieldsCount = Math.max(orderedResponseEntries.length - 2, 0);

  const getNextStatus = (): RequestStatus | null => {
    switch (request.status) {
      case "new":
        return "accepted";
      case "accepted":
        return "completed";
      default:
        return null;
    }
  };

  const getPreviousStatus = (): RequestStatus | null => {
    switch (request.status) {
      case "accepted":
        return "new";
      case "completed":
      case "rejected":
        return "accepted";
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus();
  const previousStatus = getPreviousStatus();
  const toggleLabel = isExpanded
    ? "Show less fields"
    : `Show ${extraFieldsCount} more field${extraFieldsCount === 1 ? "" : "s"}`;

  const toggleIcon = isExpanded ? (
    <ChevronUp className="mr-1 h-3 w-3" />
  ) : (
    <ChevronDown className="mr-1 h-3 w-3" />
  );

  const handleDragStart = (e: any) => {
    e.dataTransfer.setData("text/plain", request.id);
    (e.currentTarget as HTMLDivElement).classList.add("opacity-60");
  };

  const handleDragEnd = (e: any) => {
    (e.currentTarget as HTMLDivElement).classList.remove("opacity-60");
  };

  return (
    <>
      <Card
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          "cursor-grab transition-all hover:shadow-md active:cursor-grabbing",
          isSelected && "ring-2 ring-primary/60",
          className,
        )}
      >
        <CardContent className="p-3 sm:p-4">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Checkbox
                checked={isSelected}
                className="cursor-pointer"
                onCheckedChange={(checked) =>
                  onSelectionChange(checked === true)
                }
                aria-label={`Select request from ${request.submitterName || "anonymous user"}`}
              />
              {request.submitterName && (
                <div className="flex items-center gap-1.5 text-sm">
                  <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="min-w-0 truncate font-medium">
                    {request.submitterName}
                  </span>
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewDetails}>
                  <MessageSquare className="mr-2 h-4 w-4 text-primary" />
                  View Details
                </DropdownMenuItem>
                {nextStatus && (
                  <DropdownMenuItem onClick={() => onStatusChange(nextStatus)}>
                    <ArrowRight className="mr-2 h-4 w-4 text-success" />
                    Move to {columns.find((c) => c.id === nextStatus)?.title}
                  </DropdownMenuItem>
                )}
                {previousStatus && (
                  <DropdownMenuItem
                    onClick={() => onStatusChange(previousStatus)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4 text-warning" />
                    Move back to{" "}
                    {columns.find((c) => c.id === previousStatus)?.title}
                  </DropdownMenuItem>
                )}
                {request.status !== "rejected" &&
                  request.status !== "completed" && (
                    <DropdownMenuItem
                      onClick={() => onStatusChange("rejected")}
                    >
                      <XCircle className="mr-2 h-4 w-4 text-destructive" />
                      Reject
                    </DropdownMenuItem>
                  )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive hover:text-white"
                >
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Preview Fields */}
          <div className="mt-2 space-y-1">
            {previewFields.map(([label, value]) => (
              <div key={label} className="min-w-0 text-sm">
                <span className="min-w-0 text-muted-foreground">
                  <MarkdownInlineRenderer
                    content={resolveLabel(label)}
                    className="inline"
                  />
                  :{" "}
                </span>

                <span className="line-clamp-1 wrap-anywhere">
                  {Array.isArray(value) ? value.join(", ") : value}
                </span>
              </div>
            ))}
          </div>

          {/* Expandable full details */}
          {expandedFields.length > 0 && !isExpanded && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="mt-2 h-8 w-full cursor-pointer text-xs sm:h-7"
            >
              {toggleIcon}
              {toggleLabel}
            </Button>
          )}

          {expandedFields.length > 0 && isExpanded && (
            <>
              <div className="mt-2 max-h-42 space-y-1 overflow-y-auto pr-1 sm:max-h-44">
                {expandedFields.map(([label, value]) => (
                  <div key={label} className="min-w-0 text-sm">
                    <span className="min-w-0 text-muted-foreground">
                      <MarkdownInlineRenderer
                        content={resolveLabel(label)}
                        className="inline"
                      />
                      :{" "}
                    </span>

                    <span className="wrap-anywhere">
                      {Array.isArray(value) ? value.join(", ") : value}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="mt-2 h-8 w-full cursor-pointer text-xs sm:h-7"
              >
                {toggleIcon}
                {toggleLabel}
              </Button>
            </>
          )}

          {/* Notes */}
          {request.notes && (
            <div className="mt-2 rounded bg-muted/50 p-2">
              <p className="text-xs text-muted-foreground">Notes:</p>
              <p className="text-sm">{request.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {stripMarkdownToText(request.formTitle) || "Untitled form"}
              </Badge>
              {isAdmin && request.ownerId && (
                <Badge variant="secondary" className="text-[10px]">
                  Admin view
                </Badge>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDateTime(request.createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this request? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full cursor-pointer sm:w-auto"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full cursor-pointer sm:w-auto"
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------------------------------
// Kanban Column Component
// ----------------------------------------------------------------------------

interface KanbanColumnProps {
  config: ColumnConfig;
  requests: Request[];
  getOrderedResponseEntries: (
    request: Request,
  ) => Array<[string, string | string[]]>;
  onStatusChange: (
    requestId: string,
    status: RequestStatus,
    notes?: string,
  ) => void;
  onDelete: (requestId: string) => void;
  onViewDetails: (request: Request) => void;
  selectedRequestIds: Set<string>;
  onToggleRequestSelection: (requestId: string, selected: boolean) => void;
  onSelectAllInColumn: (requestIds: string[], selected: boolean) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  isAdmin?: boolean;
}

function KanbanColumn({
  config,
  requests,
  getOrderedResponseEntries,
  onStatusChange,
  onDelete,
  onViewDetails,
  selectedRequestIds,
  onToggleRequestSelection,
  onSelectAllInColumn,
  isCollapsed,
  onToggleCollapsed,
  isAdmin,
}: KanbanColumnProps) {
  const Icon = config.icon;
  const selectedCount = requests.filter((request) =>
    selectedRequestIds.has(request.id),
  ).length;
  const allSelected = requests.length > 0 && selectedCount === requests.length;
  const hasPartialSelection = selectedCount > 0 && !allSelected;

  const handleDragOver = (e: any) => {
    e.preventDefault();
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) onStatusChange(id, config.id);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex w-full flex-col"
    >
      {/* Column Header */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-t-lg px-3 py-2",
          config.bgColor,
        )}
      >
        <Icon className={cn("h-4 w-4", config.color)} />
        <span className="min-w-0 truncate font-medium">{config.title}</span>
        <Badge variant="secondary" className="ml-auto">
          {requests.length}
        </Badge>
        {requests.length > 0 && (
          <Checkbox
            checked={
              allSelected ? true : hasPartialSelection ? "indeterminate" : false
            }
            onCheckedChange={(checked) =>
              onSelectAllInColumn(
                requests.map((request) => request.id),
                checked === true,
              )
            }
            aria-label={`Select all submissions in ${config.title}`}
            className="ml-2 cursor-pointer"
          />
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          className="h-7 w-7 shrink-0 cursor-pointer"
          aria-label={
            isCollapsed ? `Expand ${config.title}` : `Collapse ${config.title}`
          }
        >
          <ChevronUp
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isCollapsed && "rotate-180",
            )}
          />
        </Button>
      </div>

      {/* Column Content */}
      {!isCollapsed && (
        <ScrollArea className="max-h-[65vh] overflow-hidden rounded-b-lg p-2 border border-t-0 bg-card/50 sm:max-h-136">
          <div className="flex w-max min-w-full items-start gap-3 p-2">
            {requests.length > 0 ? (
              requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  getOrderedResponseEntries={getOrderedResponseEntries}
                  onStatusChange={(status, notes) =>
                    onStatusChange(request.id, status, notes)
                  }
                  onDelete={() => onDelete(request.id)}
                  onViewDetails={() => onViewDetails(request)}
                  isSelected={selectedRequestIds.has(request.id)}
                  onSelectionChange={(selected) =>
                    onToggleRequestSelection(request.id, selected)
                  }
                  isAdmin={isAdmin}
                  className="w-[85vw] max-w-[18rem] shrink-0 sm:w-80"
                />
              ))
            ) : (
              <div className="flex h-32 min-w-full items-center justify-center text-sm text-muted-foreground">
                No submissions
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}

function looksLikeFieldId(value: string) {
  const text = String(value || "").trim();

  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      text,
    ) || /^[0-9a-f-]{30,}$/i.test(text)
  );
}

// ----------------------------------------------------------------------------
// Request Details Dialog
// ----------------------------------------------------------------------------

interface RequestDetailsDialogProps {
  request: Request | null;
  getOrderedResponseEntries: (
    request: Request,
  ) => Array<[string, string | string[]]>;
  onClose: () => void;
  onStatusChange: (status: RequestStatus, notes?: string) => void;
  onSaveNotes: (notes: string) => void;
  onDelete: () => void;
}

function RequestDetailsDialog({
  request,
  getOrderedResponseEntries,
  onClose,
  onStatusChange,
  onSaveNotes,
  onDelete,
}: RequestDetailsDialogProps) {
  const [notes, setNotes] = useState(request?.notes || "");
  const [notesDirty, setNotesDirty] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset notes when request changes
  useEffect(() => {
    setNotes(request?.notes || "");
    setNotesDirty(false);
  }, [request?.id, request?.notes]);

  if (!request) return null;

  const resolveLabel = (key: string) => {
    const label = stripMarkdownToText(
      request.responseLabels?.[key] || "",
    ).trim();

    if (!label || label === key || looksLikeFieldId(label)) {
      return "Untitled field";
    }

    return label;
  };
  const currentColumn = columns.find((c) => c.id === request.status);

  return (
    <>
      <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[85vh] overflow-hidden p-0">
          <div className="max-h-[85vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Request Details
                {currentColumn && (
                  <Badge variant="outline" className={currentColumn.color}>
                    {currentColumn.title}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Submitted on {request.createdAt.toLocaleDateString()} via{" "}
                {stripMarkdownToText(request.formTitle) || "Untitled form"}
              </DialogDescription>
            </DialogHeader>

            {/* Responses */}
            <div className="space-y-4 mb-4">
              <h4 className="font-medium">Responses</h4>
              <div className="space-y-3">
                {getOrderedResponseEntries(request).map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-lg border p-3">
                    <div className="min-w-0 text-sm font-medium text-muted-foreground">
                      <MarkdownInlineRenderer
                        content={resolveLabel(label)}
                        className="inline"
                      />
                    </div>
                    <p className="mt-1 break-words whitespace-pre-wrap">
                      {Array.isArray(value) ? value.join(", ") : value || "-"}
                    </p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <h4 className="font-medium">Notes</h4>
                <div className="flex items-center gap-2">
                  <Textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setNotesDirty(true);
                    }}
                    placeholder="Add notes about this request..."
                    rows={3}
                    className="flex-1"
                  />
                </div>
                {notesDirty && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer w-full sm:w-auto"
                    onClick={() => {
                      onSaveNotes(notes);
                      setNotesDirty(false);
                    }}
                  >
                    Save Notes
                  </Button>
                )}
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                {request.status === "new" && (
                  <>
                    <Button
                      className="w-full cursor-pointer sm:w-auto"
                      onClick={() => onStatusChange("accepted", notes)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full cursor-pointer sm:w-auto"
                      onClick={() => onStatusChange("rejected", notes)}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {request.status === "accepted" && (
                  <Button
                    className="w-full cursor-pointer sm:w-auto"
                    onClick={() => onStatusChange("completed", notes)}
                  >
                    Mark Complete
                  </Button>
                )}
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto sm:justify-end">
                <Button
                  variant="destructive"
                  className="w-full cursor-pointer sm:w-auto"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  className="w-full cursor-pointer sm:w-auto"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this request? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full cursor-pointer sm:w-auto"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full cursor-pointer sm:w-auto"
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
                onClose();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------------------------------
// Kanban Board Props
// ----------------------------------------------------------------------------

interface KanbanBoardProps {
  requests: Request[];
  onStatusChange: (
    requestId: string,
    status: RequestStatus,
    notes?: string,
  ) => void;
  onDelete: (requestId: string) => void;
  collapseStateKey?: string;
  isAdmin?: boolean;
}

// ----------------------------------------------------------------------------
// Kanban Board Component
// ----------------------------------------------------------------------------

export function KanbanBoard({
  requests,
  onStatusChange,
  onDelete,
  collapseStateKey = "kanban-collapsed-columns",
  isAdmin = false,
}: KanbanBoardProps) {
  const { forms, updateRequestNotes } = useStore();
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const defaultCollapsedColumns: Record<RequestStatus, boolean> = {
    new: false,
    accepted: false,
    completed: false,
    rejected: false,
  };
  const [collapsedColumns, setCollapsedColumns] = useState<
    Record<RequestStatus, boolean>
  >(() => {
    if (typeof window === "undefined") {
      return defaultCollapsedColumns;
    }

    try {
      const savedState = localStorage.getItem(collapseStateKey);
      if (!savedState) {
        return defaultCollapsedColumns;
      }

      const parsed = JSON.parse(savedState) as Partial<
        Record<RequestStatus, boolean>
      >;

      return {
        new: parsed.new ?? false,
        accepted: parsed.accepted ?? false,
        completed: parsed.completed ?? false,
        rejected: parsed.rejected ?? false,
      };
    } catch {
      return defaultCollapsedColumns;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(collapseStateKey, JSON.stringify(collapsedColumns));
    } catch {
      // Ignore storage errors (private mode, quota, etc).
    }
  }, [collapseStateKey, collapsedColumns]);

  const responseLabelsByFormId = useMemo(() => {
    const map = new Map<string, Record<string, string>>();

    forms.forEach((form) => {
      const labels: Record<string, string> = {};

      form.sections.forEach((section) => {
        const humanSectionTitle = stripMarkdownToText(
          section.title || "",
        ).trim();

        section.fields.forEach((field) => {
          const humanFieldLabel = stripMarkdownToText(field.label || "").trim();

          const resolvedLabel =
            humanFieldLabel ||
            (section.fields.length === 1 ? humanSectionTitle : "");

          if (resolvedLabel) {
            labels[field.id] = resolvedLabel;
          }
        });
      });

      map.set(form.id, labels);
    });

    return map;
  }, [forms]);

  const requestsWithResolvedLabels = useMemo(() => {
    return requests.map((request) => {
      const currentLabels = responseLabelsByFormId.get(request.formId) || {};

      const historicalLabels = Object.fromEntries(
        Object.entries(request.responseLabels || {}).flatMap(
          ([fieldId, label]) => {
            const cleaned = stripMarkdownToText(String(label || "")).trim();

            if (!cleaned || cleaned === fieldId || looksLikeFieldId(cleaned)) {
              return [];
            }

            return [[fieldId, cleaned]];
          },
        ),
      );

      const mergedLabels: Record<string, string> = {
        ...historicalLabels,
        ...currentLabels,
      };

      Object.keys(request.responses).forEach((fieldId) => {
        if (!mergedLabels[fieldId]) {
          mergedLabels[fieldId] = "Untitled field";
        }
      });

      return {
        ...request,
        responseLabels: mergedLabels,
      };
    });
  }, [requests, responseLabelsByFormId]);

  useEffect(() => {
    const validRequestIds = new Set(
      requestsWithResolvedLabels.map((request) => request.id),
    );
    setSelectedRequestIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validRequestIds.has(id)) {
          next.add(id);
        }
      });
      return next.size === prev.size ? prev : next;
    });
  }, [requestsWithResolvedLabels]);

  const responseOrderByFormId = useMemo(() => {
    const map = new Map<string, string[]>();

    forms.forEach((form) => {
      const fieldOrder: string[] = [];
      form.sections.forEach((section) => {
        section.fields.forEach((field) => {
          fieldOrder.push(field.id);
        });
      });
      map.set(form.id, fieldOrder);
    });

    return map;
  }, [forms]);

  const getOrderedResponseEntries = useMemo(() => {
    return (request: Request) => {
      const fieldOrder = responseOrderByFormId.get(request.formId) || [];
      const orderIndex = new Map(
        fieldOrder.map((fieldId, index) => [fieldId, index]),
      );

      return Object.entries(request.responses).sort((a, b) => {
        const aIndex = orderIndex.has(a[0])
          ? (orderIndex.get(a[0]) as number)
          : Number.MAX_SAFE_INTEGER;
        const bIndex = orderIndex.has(b[0])
          ? (orderIndex.get(b[0]) as number)
          : Number.MAX_SAFE_INTEGER;

        if (aIndex !== bIndex) return aIndex - bIndex;
        return a[0].localeCompare(b[0]);
      });
    };
  }, [responseOrderByFormId]);

  // Group requests by status
  const groupedRequests = useMemo(() => {
    const grouped: Record<RequestStatus, Request[]> = {
      new: [],
      accepted: [],
      completed: [],
      rejected: [],
    };

    requestsWithResolvedLabels.forEach((request) => {
      grouped[request.status].push(request);
    });

    // Sort each group by date (newest first)
    Object.keys(grouped).forEach((status) => {
      grouped[status as RequestStatus].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
    });

    return grouped;
  }, [requestsWithResolvedLabels]);

  const selectedRequests = useMemo(
    () =>
      requestsWithResolvedLabels.filter((request) =>
        selectedRequestIds.has(request.id),
      ),
    [requestsWithResolvedLabels, selectedRequestIds],
  );

  const handleToggleRequestSelection = (
    requestId: string,
    selected: boolean,
  ) => {
    setSelectedRequestIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(requestId);
      } else {
        next.delete(requestId);
      }
      return next;
    });
  };

  const handleSelectAllInColumn = (requestIds: string[], selected: boolean) => {
    setSelectedRequestIds((prev) => {
      const next = new Set(prev);
      requestIds.forEach((requestId) => {
        if (selected) {
          next.add(requestId);
        } else {
          next.delete(requestId);
        }
      });
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedRequestIds(new Set());
  };

  const handleBulkMove = (targetStatus: RequestStatus) => {
    selectedRequests.forEach((request) => {
      if (request.status !== targetStatus) {
        onStatusChange(request.id, targetStatus);
      }
    });
    clearSelection();
  };

  const handleBulkDelete = () => {
    selectedRequests.forEach((request) => {
      onDelete(request.id);
    });
    clearSelection();
    setShowBulkDeleteConfirm(false);
  };

  return (
    <>
      {selectedRequests.length > 0 && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium">
              {selectedRequests.length} request
              {selectedRequests.length === 1 ? "" : "s"} selected
            </div>
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                  >
                    <ChevronsRight className="mr-2 h-4 w-4" />
                    Move selected
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {columns.map((column) => {
                    const movableCount = selectedRequests.filter(
                      (request) => request.status !== column.id,
                    ).length;

                    return (
                      <DropdownMenuItem
                        key={column.id}
                        onClick={() => handleBulkMove(column.id)}
                        disabled={movableCount === 0}
                      >
                        Move to {column.title}
                        <Badge variant="secondary" className="ml-2">
                          {movableCount}
                        </Badge>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="destructive"
                size="sm"
                className="cursor-pointer"
                onClick={() => setShowBulkDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete selected
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer"
                onClick={clearSelection}
              >
                Clear selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4 pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            config={column}
            requests={groupedRequests[column.id]}
            getOrderedResponseEntries={getOrderedResponseEntries}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onViewDetails={setSelectedRequest}
            selectedRequestIds={selectedRequestIds}
            onToggleRequestSelection={handleToggleRequestSelection}
            onSelectAllInColumn={handleSelectAllInColumn}
            isCollapsed={collapsedColumns[column.id]}
            onToggleCollapsed={() =>
              setCollapsedColumns((prev) => ({
                ...prev,
                [column.id]: !prev[column.id],
              }))
            }
            isAdmin={isAdmin}
          />
        ))}
      </div>

      <RequestDetailsDialog
        request={selectedRequest}
        getOrderedResponseEntries={getOrderedResponseEntries}
        onClose={() => setSelectedRequest(null)}
        onStatusChange={(status, notes) => {
          if (selectedRequest) {
            onStatusChange(selectedRequest.id, status, notes);
            setSelectedRequest(null);
          }
        }}
        onSaveNotes={(notes) => {
          if (selectedRequest) {
            updateRequestNotes(selectedRequest.id, notes);
          }
        }}
        onDelete={() => {
          if (selectedRequest) {
            onDelete(selectedRequest.id);
          }
        }}
      />

      <Dialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected requests</DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedRequests.length} request
              {selectedRequests.length === 1 ? "" : "s"}. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full cursor-pointer sm:w-auto"
              onClick={() => setShowBulkDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full cursor-pointer sm:w-auto"
              onClick={handleBulkDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
