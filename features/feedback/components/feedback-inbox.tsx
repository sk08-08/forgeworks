// ============================================================================
// Forgeworks - Admin Feedback Inbox
// Professional admin view for suggestions and bug reports
// ============================================================================

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MessageSquareMore,
  RefreshCw,
  Bug,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Maximize2,
  Eye,
  EyeOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  StickyNote,
  Send,
  Filter,
  CircleDot,
  ArrowUpCircle,
  ArrowUp,
  Minus,
  MoreHorizontal,
  SquareCheck,
  Square,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SearchInput } from "@/components/ui/search-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  updateFeedbackStatus,
  updateFeedbackPriority,
  markFeedbackRead,
  markMultipleRead,
  bulkUpdateStatus,
  addFeedbackNote,
  getFeedbackNotes,
  deleteFeedback,
  getAdminFeedbackInbox,
  assignFeedbackToMe,
  unassignFeedback,
} from "@/features/feedback/actions/feedback-admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedbackType = "suggestion" | "bug";
type FeedbackStatus = "new" | "reviewing" | "resolved" | "closed";
type FeedbackPriority = "low" | "medium" | "high" | "urgent";

interface FeedbackItem {
  id: string;
  feedback_type: FeedbackType;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  is_read: boolean;
  assigned_to: string | null;
  subject: string;
  message: string;
  source_label: string;
  source_page: string;
  source_path: string;
  related_id: string | null;
  contact: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  assignee?: {
    id: string;
    username: string | null;
    display_name: string | null;
  } | null;
}

interface FeedbackNote {
  id: string;
  author_id: string;
  note: string;
  created_at: string;
}

interface FeedbackInboxStats {
  total: number;
  unread: number;
  bugs: number;
  suggestions: number;
  newCount: number;
  reviewing: number;
}

type InboxPersistedState = {
  searchQuery: string;
  typeFilter: "all" | FeedbackType;
  statusFilter: "all" | FeedbackStatus;
  priorityFilter: "all" | FeedbackPriority;
  assignmentFilter: "all" | "mine" | "unassigned";
  showUnreadOnly: boolean;
};

const FEEDBACK_INBOX_STORAGE_KEY = "forgeworks.feedback.inboxState";

const defaultInboxState: InboxPersistedState = {
  searchQuery: "",
  typeFilter: "all",
  statusFilter: "all",
  priorityFilter: "all",
  assignmentFilter: "all",
  showUnreadOnly: false,
};

function isTypingElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}

function getPersistedInboxState(): InboxPersistedState {
  if (typeof window === "undefined") {
    return defaultInboxState;
  }

  const raw = window.localStorage.getItem(FEEDBACK_INBOX_STORAGE_KEY);
  if (!raw) {
    return defaultInboxState;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<InboxPersistedState>;
    return {
      searchQuery:
        typeof parsed.searchQuery === "string" ? parsed.searchQuery : "",
      typeFilter:
        parsed.typeFilter === "suggestion" ||
        parsed.typeFilter === "bug" ||
        parsed.typeFilter === "all"
          ? parsed.typeFilter
          : "all",
      statusFilter:
        parsed.statusFilter === "new" ||
        parsed.statusFilter === "reviewing" ||
        parsed.statusFilter === "resolved" ||
        parsed.statusFilter === "closed" ||
        parsed.statusFilter === "all"
          ? parsed.statusFilter
          : "all",
      priorityFilter:
        parsed.priorityFilter === "low" ||
        parsed.priorityFilter === "medium" ||
        parsed.priorityFilter === "high" ||
        parsed.priorityFilter === "urgent" ||
        parsed.priorityFilter === "all"
          ? parsed.priorityFilter
          : "all",
      assignmentFilter:
        parsed.assignmentFilter === "mine" ||
        parsed.assignmentFilter === "unassigned" ||
        parsed.assignmentFilter === "all"
          ? parsed.assignmentFilter
          : "all",
      showUnreadOnly: Boolean(parsed.showUnreadOnly),
    };
  } catch {
    return defaultInboxState;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

const statusConfig: Record<
  FeedbackStatus,
  { label: string; icon: typeof CircleDot; className: string }
> = {
  new: {
    label: "New",
    icon: CircleDot,
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  reviewing: {
    label: "Reviewing",
    icon: Eye,
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  closed: {
    label: "Closed",
    icon: X,
    className: "bg-muted text-muted-foreground border-border",
  },
};

const priorityConfig: Record<
  FeedbackPriority,
  { label: string; icon: typeof ArrowUp; className: string; order: number }
> = {
  low: {
    label: "Low",
    icon: Minus,
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    order: 0,
  },
  medium: {
    label: "Medium",
    icon: ArrowUp,
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    order: 1,
  },
  high: {
    label: "High",
    icon: ArrowUpCircle,
    className: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    order: 2,
  },
  urgent: {
    label: "Urgent",
    icon: AlertTriangle,
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    order: 3,
  },
};

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof CircleDot;
  accent?: string;
}) {
  return (
    <Card className="border-border/70 bg-card/90 backdrop-blur">
      <CardContent className="flex min-w-0 items-center gap-2.5 p-3 sm:gap-3 sm:p-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ring-border/50",
            accent || "bg-primary/10",
          )}
        >
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold tracking-tight sm:text-2xl">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

// Componente Lightbox Adaptado usando el Dialog de Shadcn para evitar conflictos de z-index
function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: { src: string; alt: string }[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goNext = useCallback(
    () => setCurrentIndex((prev) => (prev + 1) % images.length),
    [images.length],
  );
  const goPrev = useCallback(
    () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length),
    [images.length],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      // Ya no manejamos "Escape" aquí porque el Dialog de shadcn lo hace por nosotros
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      {/* 
        Le quitamos el fondo oscuro por defecto al overlay del Dialog porque nosotros 
        queremos nuestro propio fondo con backdrop-blur
      */}
      <DialogContent className="max-h-[100dvh] w-screen max-w-none border-none bg-transparent p-0 shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>

        <div className="relative flex h-[calc(100dvh-1rem)] w-full flex-col items-center justify-center outline-none">
          {/* Botón Cerrar Superior */}
          <button
            onClick={onClose}
            className="absolute top-0 right-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-10"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Contador */}
          <div className="absolute left-4 top-0 z-10 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white sm:left-10">
            {currentIndex + 1} / {images.length}
          </div>

          {/* Contenedor de la Imagen */}
          <div
            className="relative flex h-full w-full max-w-5xl items-center justify-center px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[currentIndex].src}
              alt={images[currentIndex].alt}
              className="max-h-[78dvh] max-w-full object-contain"
            />
          </div>

          {/* Navegación y Miniaturas */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-10 sm:h-12 sm:w-12"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-10 sm:h-12 sm:w-12"
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              <div className="absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-black/50 p-2 backdrop-blur-md">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(i);
                    }}
                    className={cn(
                      "relative h-10 w-10 cursor-pointer overflow-hidden rounded-lg transition-all sm:h-12 sm:w-12",
                      i === currentIndex
                        ? "scale-105 ring-2 ring-primary"
                        : "opacity-50 hover:opacity-80",
                    )}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FeedbackInbox() {
  const persistedState = getPersistedInboxState();
  const LIMIT = 25;
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<
    "created_at" | "priority" | "status" | "feedback_type" | "is_read"
  >("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [stats, setStats] = useState<FeedbackInboxStats>({
    total: 0,
    unread: 0,
    bugs: 0,
    suggestions: 0,
    newCount: 0,
    reviewing: 0,
  });
  const [searchQuery, setSearchQuery] = useState(persistedState.searchQuery);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | FeedbackType>(
    persistedState.typeFilter,
  );
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>(
    persistedState.statusFilter,
  );
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | FeedbackPriority
  >(persistedState.priorityFilter);
  const [assignmentFilter, setAssignmentFilter] = useState<
    "all" | "mine" | "unassigned"
  >(persistedState.assignmentFilter);
  const [showUnreadOnly, setShowUnreadOnly] = useState(
    persistedState.showUnreadOnly,
  );
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  // Detail panel
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [detailNotes, setDetailNotes] = useState<FeedbackNote[]>([]);
  const [detailNotesLoading, setDetailNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FeedbackItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // Load data
  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminFeedbackInbox({
        page,
        limit: LIMIT,
        query: searchQuery,
        typeFilter,
        statusFilter,
        priorityFilter,
        assignmentFilter,
        unreadOnly: showUnreadOnly,
        sortBy,
        sortDirection,
      });

      setIsAdmin(result.isAdmin ?? false);
      setCurrentUserId(result.userId ?? null);

      if (!result.success) {
        setItems([]);
        setTotal(0);
        setStats({
          total: 0,
          unread: 0,
          bugs: 0,
          suggestions: 0,
          newCount: 0,
          reviewing: 0,
        });
        setCurrentUserId(null);
        return;
      }

      setItems((result.items ?? []) as FeedbackItem[]);
      setTotal(result.total ?? 0);
      if (result.stats) {
        setStats(result.stats as FeedbackInboxStats);
      }
      setLastRefreshedAt(new Date().toISOString());
    } catch (error) {
      console.error("Error loading feedback inbox:", error);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    searchQuery,
    typeFilter,
    statusFilter,
    priorityFilter,
    assignmentFilter,
    showUnreadOnly,
    sortBy,
    sortDirection,
  ]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [items]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextState: InboxPersistedState = {
      searchQuery,
      typeFilter,
      statusFilter,
      priorityFilter,
      assignmentFilter,
      showUnreadOnly,
    };
    window.localStorage.setItem(
      FEEDBACK_INBOX_STORAGE_KEY,
      JSON.stringify(nextState),
    );
  }, [
    searchQuery,
    typeFilter,
    statusFilter,
    priorityFilter,
    assignmentFilter,
    showUnreadOnly,
  ]);

  // Load notes when selected item changes
  useEffect(() => {
    if (!selectedItem) {
      setDetailNotes([]);
      return;
    }

    let mounted = true;
    setDetailNotesLoading(true);

    getFeedbackNotes(selectedItem.id).then((result) => {
      if (!mounted) return;
      setDetailNotes(result.notes as FeedbackNote[]);
      setDetailNotesLoading(false);
    });

    // Mark as read when opening
    if (!selectedItem.is_read) {
      markFeedbackRead(selectedItem.id, true).then((result) => {
        if (result.success) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === selectedItem.id ? { ...item, is_read: true } : item,
            ),
          );
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [selectedItem]);

  // Selection helpers
  const selectedOnPageCount = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)).length,
    [items, selectedIds],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOnPageCount === items.length && items.length > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const item of items) {
          next.delete(item.id);
        }
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const item of items) {
          next.add(item.id);
        }
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Action handlers
  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    const result = await updateFeedbackStatus(id, status);
    if (result.success) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item)),
      );
      if (selectedItem?.id === id) {
        setSelectedItem((prev) => (prev ? { ...prev, status } : null));
      }
      toast.success(`Status changed to ${statusConfig[status].label}`);
      void loadFeedback();
    } else {
      toast.error(result.error || "Failed to update status");
    }
  };

  const handlePriorityChange = async (
    id: string,
    priority: FeedbackPriority,
  ) => {
    const result = await updateFeedbackPriority(id, priority);
    if (result.success) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, priority } : item)),
      );
      if (selectedItem?.id === id) {
        setSelectedItem((prev) => (prev ? { ...prev, priority } : null));
      }
      toast.success(`Priority changed to ${priorityConfig[priority].label}`);
      void loadFeedback();
    } else {
      toast.error(result.error || "Failed to update priority");
    }
  };

  const handleToggleRead = async (id: string, currentRead: boolean) => {
    const result = await markFeedbackRead(id, !currentRead);
    if (result.success) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_read: !currentRead } : item,
        ),
      );
      void loadFeedback();
    }
  };

  const handleBulkMarkRead = async (isRead: boolean) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const result = await markMultipleRead(ids, isRead);
    if (result.success) {
      setItems((prev) =>
        prev.map((item) =>
          ids.includes(item.id) ? { ...item, is_read: isRead } : item,
        ),
      );
      clearSelection();
      toast.success(
        `${ids.length} items marked as ${isRead ? "read" : "unread"}`,
      );
      void loadFeedback();
    }
  };

  const handleBulkStatus = async (status: FeedbackStatus) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const result = await bulkUpdateStatus(ids, status);
    if (result.success) {
      setItems((prev) =>
        prev.map((item) =>
          ids.includes(item.id) ? { ...item, status } : item,
        ),
      );
      clearSelection();
      toast.success(
        `${ids.length} items moved to ${statusConfig[status].label}`,
      );
      void loadFeedback();
    }
  };

  const handleAssignToMe = async (id: string) => {
    const result = await assignFeedbackToMe(id);
    if (!result.success) {
      toast.error(result.error || "Failed to assign");
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              assigned_to: currentUserId,
              assignee:
                item.assignee ??
                (currentUserId
                  ? {
                      id: currentUserId,
                      username: null,
                      display_name: "You",
                    }
                  : null),
            }
          : item,
      ),
    );
    if (selectedItem?.id === id) {
      setSelectedItem((prev) =>
        prev
          ? {
              ...prev,
              assigned_to: currentUserId,
            }
          : null,
      );
    }

    toast.success("Assigned to you");
    void loadFeedback();
  };

  const handleUnassign = async (id: string) => {
    const result = await unassignFeedback(id);
    if (!result.success) {
      toast.error(result.error || "Failed to unassign");
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              assigned_to: null,
              assignee: null,
            }
          : item,
      ),
    );
    if (selectedItem?.id === id) {
      setSelectedItem((prev) =>
        prev
          ? {
              ...prev,
              assigned_to: null,
              assignee: null,
            }
          : null,
      );
    }

    toast.success("Unassigned");
    void loadFeedback();
  };

  const handleTransitionToReviewing = async (id: string) => {
    await handleStatusChange(id, "reviewing");
  };

  const handleTransitionToResolved = async (id: string) => {
    await handleStatusChange(id, "resolved");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteFeedback(deleteTarget.id);
    setDeleting(false);
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      if (selectedItem?.id === deleteTarget.id) setSelectedItem(null);
      setDeleteTarget(null);
      toast.success("Feedback deleted");
      void loadFeedback();
    } else {
      toast.error(result.error || "Failed to delete");
    }
  };

  const handleAddNote = async () => {
    if (!selectedItem || !newNote.trim()) return;
    setAddingNote(true);
    const result = await addFeedbackNote(selectedItem.id, newNote);
    setAddingNote(false);
    if (result.success && result.note) {
      setDetailNotes((prev) => [...prev, result.note as FeedbackNote]);
      setNewNote("");
      toast.success("Note added");
    } else {
      toast.error(result.error || "Failed to add note");
    }
  };

  // Navigate between items
  const currentIndex = selectedItem
    ? items.findIndex((i) => i.id === selectedItem.id)
    : -1;

  const navigateItem = (direction: "prev" | "next") => {
    if (currentIndex === -1) return;
    const nextIndex =
      direction === "next"
        ? Math.min(currentIndex + 1, items.length - 1)
        : Math.max(currentIndex - 1, 0);
    if (nextIndex !== currentIndex) {
      setSelectedItem(items[nextIndex]);
    }
  };

  useEffect(() => {
    if (!selectedItem) return;

    const handleDialogKeys = (event: KeyboardEvent) => {
      if (isTypingElement(event.target)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigateItem("prev");
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        navigateItem("next");
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        void handleToggleRead(selectedItem.id, selectedItem.is_read);
      }
    };

    document.addEventListener("keydown", handleDialogKeys);
    return () => document.removeEventListener("keydown", handleDialogKeys);
  }, [selectedItem, currentIndex, items]);

  useEffect(() => {
    if (!selectedItem) return;
    const existsOnPage = items.some((item) => item.id === selectedItem.id);
    if (!existsOnPage) {
      setSelectedItem(null);
    }
  }, [items, selectedItem]);

  const hasNewFields = true;

  // No access
  if (!loading && !isAdmin) {
    return (
      <div className="min-w-0 overflow-x-clip p-3 sm:p-6 md:p-8 lg:p-10">
        <div className="mx-auto w-full max-w-[92rem]">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              You do not have access to the admin feedback inbox.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-clip p-3 sm:p-6 md:p-8 lg:p-10">
      <div className="mx-auto w-full max-w-[92rem] space-y-6">
        {/* Header */}
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Feedback Inbox
              </h1>
              <p className="mt-1 text-sm sm:text-base text-muted-foreground">
                Review and manage user suggestions and bug reports.
              </p>
            </div>
          </div>

          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
            {lastRefreshedAt && (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Updated {timeAgo(lastRefreshedAt)}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => loadFeedback()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
          <KpiCard label="Total" value={stats.total} icon={MessageSquareMore} />
          <KpiCard
            label="Unread"
            value={stats.unread}
            icon={EyeOff}
            accent="bg-amber-500/10"
          />
          <KpiCard
            label="New"
            value={stats.newCount}
            icon={CircleDot}
            accent="bg-blue-500/10"
          />
          <KpiCard
            label="Reviewing"
            value={stats.reviewing}
            icon={Clock}
            accent="bg-amber-500/10"
          />
          <KpiCard
            label="Bugs"
            value={stats.bugs}
            icon={Bug}
            accent="bg-red-500/10"
          />
          <KpiCard
            label="Suggestions"
            value={stats.suggestions}
            icon={Lightbulb}
            accent="bg-emerald-500/10"
          />
        </div>

        {/* Filters Bar */}
        <Card className="border-border/70 bg-card/90 backdrop-blur">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              {/* Search */}
              <SearchInput
                value={searchQuery}
                onChange={(value) => {
                  setSearchQuery(value);
                  setPage(1);
                }}
                placeholder="Search feedback by subject, message, or source..."
                className="w-full"
                debounce={180}
                shortcutKey="/"
              />

              {/* Filter row */}
              <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <div className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground sm:col-auto">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Filters:</span>
                </div>

                <Select
                  value={typeFilter}
                  onValueChange={(v) => {
                    setTypeFilter(v as any);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full min-w-0 text-xs sm:h-8 sm:w-32.5">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="suggestion">Suggestions</SelectItem>
                    <SelectItem value="bug">Bug reports</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v as any);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full min-w-0 text-xs sm:h-8 sm:w-35">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>

                {hasNewFields && (
                  <Select
                    value={priorityFilter}
                    onValueChange={(v) => {
                      setPriorityFilter(v as any);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-full min-w-0 text-xs sm:h-8 sm:w-35">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <Select
                  value={assignmentFilter}
                  onValueChange={(value) => {
                    setAssignmentFilter(value as "all" | "mine" | "unassigned");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full min-w-0 text-xs sm:h-8 sm:w-40">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All assignees</SelectItem>
                    <SelectItem value="mine">Assigned to me</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant={showUnreadOnly ? "secondary" : "ghost"}
                  size="sm"
                  className="h-9 w-full cursor-pointer text-xs sm:h-8 sm:w-auto"
                  onClick={() => {
                    setShowUnreadOnly(!showUnreadOnly);
                    setPage(1);
                  }}
                >
                  <EyeOff className="h-3.5 w-3.5 mr-1" />
                  Unread only
                </Button>

                {(typeFilter !== "all" ||
                  statusFilter !== "all" ||
                  priorityFilter !== "all" ||
                  assignmentFilter !== "all" ||
                  showUnreadOnly ||
                  searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full cursor-pointer text-xs text-muted-foreground sm:h-8 sm:w-auto"
                    onClick={() => {
                      setTypeFilter("all");
                      setStatusFilter("all");
                      setPriorityFilter("all");
                      setAssignmentFilter("all");
                      setShowUnreadOnly(false);
                      setSearchQuery("");
                      setPage(1);
                    }}
                  >
                    Clear all
                  </Button>
                )}

                <Select
                  value={sortBy}
                  onValueChange={(value) => {
                    setSortBy(
                      value as
                        | "created_at"
                        | "priority"
                        | "status"
                        | "feedback_type"
                        | "is_read",
                    );
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full min-w-0 text-xs sm:h-8 sm:w-38">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Sort: Date</SelectItem>
                    <SelectItem value="priority">Sort: Priority</SelectItem>
                    <SelectItem value="status">Sort: Status</SelectItem>
                    <SelectItem value="feedback_type">Sort: Type</SelectItem>
                    <SelectItem value="is_read">Sort: Read</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sortDirection}
                  onValueChange={(value) => {
                    setSortDirection(value as "asc" | "desc");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full min-w-0 text-xs sm:h-8 sm:w-34">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Order: Desc</SelectItem>
                    <SelectItem value="asc">Order: Asc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex min-w-0 flex-col items-stretch gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs cursor-pointer"
                  onClick={() => handleBulkMarkRead(true)}
                >
                  <Eye className="h-3 w-3 mr-1" /> Mark read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs cursor-pointer"
                  onClick={() => handleBulkMarkRead(false)}
                >
                  <EyeOff className="h-3 w-3 mr-1" /> Mark unread
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs cursor-pointer"
                  onClick={() => handleBulkStatus("resolved")}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs cursor-pointer"
                  onClick={() => handleBulkStatus("closed")}
                >
                  Close
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs cursor-pointer"
                  onClick={clearSelection}
                >
                  <X className="h-3 w-3 mr-1" /> Deselect all
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-3 sm:p-4">
                  <div className="h-4 w-3/4 rounded bg-muted mb-3" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-2">
            {/* List header */}
            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
              <span>
                {total} result{total !== 1 && "s"} · Page {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs cursor-pointer"
                onClick={toggleSelectAll}
              >
                {selectedOnPageCount === items.length && items.length > 0
                  ? "Deselect all"
                  : "Select all"}
              </Button>
            </div>

            {/* Items */}
            {items.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const isCurrentlyViewing = selectedItem?.id === item.id;
              const statusConf = statusConfig[item.status];
              const priorityConf = priorityConfig[item.priority || "medium"];
              const StatusIcon = statusConf.icon;
              const PriorityIcon = priorityConf.icon;

              return (
                <Card
                  key={item.id}
                  className={cn(
                    "group transition-all cursor-pointer hover:border-primary/40 hover:shadow-md",
                    isCurrentlyViewing &&
                      "border-primary/60 shadow-md ring-1 ring-primary/20",
                    !item.is_read && "border-l-2 border-l-primary",
                  )}
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        className="mt-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(item.id);
                        }}
                      >
                        {isSelected ? (
                          <SquareCheck className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="mb-1.5 flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                          <h3
                            className={cn(
                              "line-clamp-2 min-w-0 flex-1 break-words text-sm leading-snug",
                              !item.is_read ? "font-semibold" : "font-medium",
                            )}
                          >
                            {item.subject}
                          </h3>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                            {timeAgo(item.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {item.message}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Type badge */}
                          <Badge
                            variant={
                              item.feedback_type === "bug"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-[10px] px-1.5 py-0"
                          >
                            {item.feedback_type === "bug" ? (
                              <Bug className="h-2.5 w-2.5 mr-0.5" />
                            ) : (
                              <Lightbulb className="h-2.5 w-2.5 mr-0.5" />
                            )}
                            {item.feedback_type === "bug"
                              ? "Bug"
                              : "Suggestion"}
                          </Badge>

                          {/* Status badge */}
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              statusConf.className,
                            )}
                          >
                            <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                            {statusConf.label}
                          </Badge>

                          {/* Priority badge (only if migration applied) */}
                          {hasNewFields && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0",
                                priorityConf.className,
                              )}
                            >
                              <PriorityIcon className="h-2.5 w-2.5 mr-0.5" />
                              {priorityConf.label}
                            </Badge>
                          )}

                          {/* Source */}
                          {item.source_label && (
                            <span className="text-[10px] text-muted-foreground">
                              {item.source_label}
                            </span>
                          )}

                          {item.assigned_to && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              <UserRound className="mr-0.5 h-2.5 w-2.5" />
                              {item.assignee?.display_name ||
                                item.assignee?.username ||
                                (item.assigned_to === currentUserId
                                  ? "You"
                                  : "Assigned")}
                            </Badge>
                          )}

                          {/* Unread dot */}
                          {!item.is_read && (
                            <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>

                      {/* Actions menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 cursor-pointer opacity-100 transition-opacity sm:h-7 sm:w-7 sm:opacity-0 sm:group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleRead(item.id, item.is_read);
                            }}
                          >
                            {item.is_read ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" /> Mark unread
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" /> Mark read
                              </>
                            )}
                          </DropdownMenuItem>

                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <CircleDot className="h-4 w-4 mr-2" />
                              Change status
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                {(
                                  Object.keys(statusConfig) as FeedbackStatus[]
                                ).map((s) => (
                                  <DropdownMenuItem
                                    key={s}
                                    disabled={item.status === s}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(item.id, s);
                                    }}
                                  >
                                    {statusConfig[s].label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>

                          {hasNewFields && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <ArrowUp className="h-4 w-4 mr-2" />
                                Change priority
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                  {(
                                    Object.keys(
                                      priorityConfig,
                                    ) as FeedbackPriority[]
                                  ).map((p) => (
                                    <DropdownMenuItem
                                      key={p}
                                      disabled={
                                        (item.priority || "medium") === p
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePriorityChange(item.id, p);
                                      }}
                                    >
                                      {priorityConfig[p].label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                          )}

                          <DropdownMenuSeparator />

                          {!item.assigned_to ? (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleAssignToMe(item.id);
                              }}
                            >
                              <UserRound className="h-4 w-4 mr-2" /> Assign to
                              me
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleUnassign(item.id);
                              }}
                            >
                              <UserRound className="h-4 w-4 mr-2" /> Unassign
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(item);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {items.length} of {total}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 cursor-pointer"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 cursor-pointer"
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={page >= totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquareMore className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No feedback found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters or search query."
                  : "No feedback submissions yet."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* =========================================================================
          DETAIL DIALOG
          ========================================================================= */}
        <Dialog
          open={!!selectedItem}
          onOpenChange={(open) => !open && setSelectedItem(null)}
        >
          <DialogContent className="flex max-h-[calc(100dvh-1rem)] min-h-0 w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden p-0 sm:max-w-4xl">
            {selectedItem && (
              <>
                {/* Dialog navigation bar */}
                <div className="flex min-w-0 items-center justify-between gap-2 border-b px-3 py-2 sm:px-6">
                  <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      disabled={currentIndex <= 0}
                      onClick={() => navigateItem("prev")}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {currentIndex + 1} of {items.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      disabled={currentIndex >= items.length - 1}
                      onClick={() => navigateItem("next")}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs cursor-pointer"
                      onClick={() =>
                        handleToggleRead(selectedItem.id, selectedItem.is_read)
                      }
                    >
                      {selectedItem.is_read ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5 mr-1" /> Mark unread
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Mark read
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 mr-6 text-xs text-destructive hover:text-white cursor-pointer"
                      onClick={() => setDeleteTarget(selectedItem)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>

                {/* Dialog content */}
                <ScrollArea className="flex-1 overflow-auto">
                  <div className="p-4 sm:p-6 space-y-4">
                    <DialogHeader className="text-left space-y-2">
                      <div className="flex flex-wrap items-start gap-2">
                        <Badge
                          variant={
                            selectedItem.feedback_type === "bug"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {selectedItem.feedback_type === "bug" ? (
                            <Bug className="h-3 w-3 mr-1" />
                          ) : (
                            <Lightbulb className="h-3 w-3 mr-1" />
                          )}
                          {selectedItem.feedback_type === "bug"
                            ? "Bug Report"
                            : "Suggestion"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            statusConfig[selectedItem.status].className
                          }
                        >
                          {statusConfig[selectedItem.status].label}
                        </Badge>
                        {hasNewFields && (
                          <Badge
                            variant="outline"
                            className={
                              priorityConfig[selectedItem.priority || "medium"]
                                .className
                            }
                          >
                            {
                              priorityConfig[selectedItem.priority || "medium"]
                                .label
                            }
                          </Badge>
                        )}
                      </div>
                      <DialogTitle className="break-words text-xl leading-snug">
                        {selectedItem.subject}
                      </DialogTitle>
                      <DialogDescription className="wrap-break-word">
                        {selectedItem.source_label || "Unknown source"} ·{" "}
                        {formatDate(selectedItem.created_at)}
                        {selectedItem.is_read ? (
                          <span className="ml-2 text-xs">(Read)</span>
                        ) : (
                          <span className="ml-2 text-xs text-primary font-medium">
                            (Unread)
                          </span>
                        )}
                      </DialogDescription>
                    </DialogHeader>

                    {/* Quick actions */}
                    <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                      {selectedItem.status === "new" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-full cursor-pointer text-xs sm:h-8 sm:w-auto"
                          onClick={() =>
                            void handleTransitionToReviewing(selectedItem.id)
                          }
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> Start review
                        </Button>
                      )}

                      {selectedItem.status === "reviewing" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-full cursor-pointer text-xs sm:h-8 sm:w-auto"
                          onClick={() =>
                            void handleTransitionToResolved(selectedItem.id)
                          }
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark
                          resolved
                        </Button>
                      )}

                      {!selectedItem.assigned_to ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-full cursor-pointer text-xs sm:h-8 sm:w-auto"
                          onClick={() => void handleAssignToMe(selectedItem.id)}
                        >
                          <UserRound className="mr-1.5 h-3.5 w-3.5" /> Assign to
                          me
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-full cursor-pointer text-xs sm:h-8 sm:w-auto"
                          onClick={() => void handleUnassign(selectedItem.id)}
                        >
                          <UserRound className="mr-1.5 h-3.5 w-3.5" /> Unassign
                        </Button>
                      )}

                      <Select
                        value={selectedItem.status}
                        onValueChange={(v) =>
                          handleStatusChange(
                            selectedItem.id,
                            v as FeedbackStatus,
                          )
                        }
                      >
                        <SelectTrigger className="h-9 w-full text-xs sm:h-8 sm:w-37.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(statusConfig) as FeedbackStatus[]).map(
                            (s) => (
                              <SelectItem key={s} value={s}>
                                {statusConfig[s].label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>

                      {hasNewFields && (
                        <Select
                          value={selectedItem.priority || "medium"}
                          onValueChange={(v) =>
                            handlePriorityChange(
                              selectedItem.id,
                              v as FeedbackPriority,
                            )
                          }
                        >
                          <SelectTrigger className="h-9 w-full text-xs sm:h-8 sm:w-37.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              Object.keys(priorityConfig) as FeedbackPriority[]
                            ).map((p) => (
                              <SelectItem key={p} value={p}>
                                {priorityConfig[p].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Content grid */}
                    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
                      {/* Message */}
                      <Card className="border-border/70">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Message</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                            {selectedItem.message}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Details */}
                      <Card className="border-border/70">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-1">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Source page
                            </p>
                            <p className="wrap-break-word">
                              {selectedItem.source_page || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Source path
                            </p>
                            <p className="break-all font-mono text-xs">
                              {selectedItem.source_path || "-"}
                            </p>
                          </div>
                          {selectedItem.related_id && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Related ID
                              </p>
                              <p className="break-all font-mono text-xs">
                                {selectedItem.related_id}
                              </p>
                            </div>
                          )}
                          {selectedItem.contact && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Contact
                              </p>
                              <p className="break-all">
                                {selectedItem.contact}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Assigned to
                            </p>
                            <p>
                              {selectedItem.assignee?.display_name ||
                                selectedItem.assignee?.username ||
                                (selectedItem.assigned_to
                                  ? selectedItem.assigned_to === currentUserId
                                    ? "You"
                                    : "Assigned"
                                  : "Unassigned")}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Attached images */}
                    {Array.isArray(selectedItem.metadata?.images) &&
                      (selectedItem.metadata.images as any[]).length > 0 && (
                        <Card className="border-border/70">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                              Attached images
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {(
                                selectedItem.metadata.images as Array<{
                                  name?: string;
                                  size?: number;
                                  url?: string;
                                }>
                              ).map((image, index) =>
                                image.url ? (
                                  <div
                                    key={`${selectedItem.id}-img-${index}`}
                                    className="overflow-hidden rounded-lg border"
                                  >
                                    <div
                                      className="group relative cursor-pointer overflow-hidden"
                                      onClick={() => setLightboxIndex(index)}
                                    >
                                      <img
                                        src={image.url}
                                        alt={
                                          image.name ||
                                          `Attachment ${index + 1}`
                                        }
                                        className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/30">
                                        <Maximize2 className="h-8 w-8 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 drop-shadow-md" />
                                      </div>
                                    </div>

                                    <div className="space-y-1 p-3 text-xs text-muted-foreground">
                                      <p className="truncate font-medium text-foreground">
                                        {image.name ||
                                          `Attachment ${index + 1}`}
                                      </p>
                                      {typeof image.size === "number" && (
                                        <p>
                                          {Math.round(image.size / 1024)} KB
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ) : null,
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    {/* Admin Notes */}
                    <Card className="border-border/70">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <StickyNote className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-base">
                            Internal Notes
                          </CardTitle>
                        </div>
                        <CardDescription>
                          Private notes visible only to admins.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {detailNotesLoading ? (
                          <p className="text-xs text-muted-foreground">
                            Loading notes...
                          </p>
                        ) : detailNotes.length > 0 ? (
                          <div className="space-y-2">
                            {detailNotes.map((note) => (
                              <div
                                key={note.id}
                                className="rounded-lg border border-border/70 bg-muted/50 p-3"
                              >
                                <p className="whitespace-pre-wrap break-words text-sm">
                                  {note.note}
                                </p>
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                  {formatDate(note.created_at)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No notes yet.
                          </p>
                        )}

                        {/* Add note */}
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Add an internal note..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                        <div className="flex justify-stretch sm:justify-end">
                          <Button
                            size="sm"
                            className="w-full cursor-pointer sm:w-auto"
                            disabled={!newNote.trim() || addingNote}
                            onClick={handleAddNote}
                          >
                            {addingNote ? (
                              "Adding..."
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5 mr-1.5" /> Add Note
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &quot;{deleteTarget?.subject}&quot;
                and all associated notes. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Lightbox */}
        {lightboxIndex !== null &&
          selectedItem &&
          Array.isArray(selectedItem.metadata?.images) && (
            <ImageLightbox
              images={(selectedItem.metadata.images as any[]).map((img, i) => ({
                src: img.url,
                alt: img.name || `Attachment ${i + 1}`,
              }))}
              initialIndex={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
            />
          )}
      </div>
    </div>
  );
}
