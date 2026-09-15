// ============================================================================
// Forgeworks - Admin Panel
// Centralised moderation and management panel for site admins.
// ============================================================================

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Award,
  BarChart3,
  FileText,
  Inbox,
  Shield,
  ShieldAlert,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Ban,
  CheckCircle,
  CrownIcon,
  Trash2,
  UserRound,
  Bot,
  RotateCcw,
  ImageOff,
  TrendingUp,
  AlertTriangle,
  Eye,
  Copy,
  Flame,
  ExternalLink,
  UsersRound,
  KeyRound,
  Globe2,
  BookOpen,
  Layers3,
  LibraryBig,
  PanelsTopLeft,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchInput } from "@/components/ui/search-input";
import {
  MarkdownRenderer,
  MarkdownInlineRenderer,
} from "@/features/markdown/components/markdown-renderer";
import {
  BotTagBadge,
  BotTagCountBadge,
} from "@/features/bots/components/bot-tag-badge";
import { formatDateTime } from "@/lib/utils";
import { ModerationAdminTab } from "@/features/moderation/components/admin/moderation-admin-tab";
import {
  getAdminStats,
  getRecentActivity,
  getAllSubmissions,
  getAllForms,
  getAllBots,
  getAdminUsers,
  getAdminUserById,
  getStaffAccess,
  setUserStaffRole,
  type StaffRole,
  blockUser,
  unblockUser,
  resetUserDisplayName,
  clearUserAvatar,
  deleteUserAsAdmin,
  resetUserPin,
  getSubmissionById,
  getBotById,
  getFormById,
  softDeleteSubmission,
  restoreSubmission,
  hardDeleteSubmission,
  softDeleteForm,
  restoreForm,
  hardDeleteForm,
  softDeleteBot,
  restoreBot,
  hardDeleteBot,
} from "@/features/admin/actions/admin";
import { getFormBannerPublicUrl } from "@/features/forms/lib/form-assets";
import { BadgeAdminTab } from "./badge-admin-tab";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

type AdminTab =
  | "overview"
  | "submissions"
  | "forms"
  | "bots"
  | "badges"
  | "users"
  | "moderation";

const ADMIN_TAB_STORAGE_KEY = "forgeworks.admin.activeTab";
const ADMIN_TAB_IDS: AdminTab[] = [
  "overview",
  "submissions",
  "forms",
  "bots",
  "badges",
  "users",
  "moderation",
];

function isAdminTab(value: string): value is AdminTab {
  return ADMIN_TAB_IDS.includes(value as AdminTab);
}

function normalizeAdminFieldText(value: unknown) {
  return stripMarkdownToText(String(value ?? "")).trim();
}

function buildAdminFormFieldMap(sections: any[] = []) {
  const map = new Map<
    string,
    {
      label: string;
      sectionTitle: string;
      description: string;
      type: string;
      required: boolean;
    }
  >();

  for (const section of sections) {
    const sectionTitle = normalizeAdminFieldText(section?.title);

    for (const field of section?.fields || []) {
      if (!field?.id) continue;

      map.set(field.id, {
        label: normalizeAdminFieldText(field.label),
        sectionTitle,
        description: normalizeAdminFieldText(field.description),
        type: String(field.type || "field"),
        required: field.required === true,
      });
    }
  }

  return map;
}

function getAdminFieldTypeLabel(type: string) {
  const labels: Record<string, string> = {
    text: "Text",
    textarea: "Long text",
    select: "Select",
    radio: "Radio",
    checkbox: "Checkbox",
    number: "Number",
    rating: "Rating",
    url: "URL",
    email: "Email",
  };

  return labels[type] || type || "Field";
}

type HardDeleteTarget = {
  type: "submission" | "form" | "bot";
  id: string;
  label: string;
};

// ============================================================================
// Pagination helper
// ============================================================================

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-center text-sm text-muted-foreground sm:text-left">
        Page {page} of {totalPages} ({total} total)
      </span>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="w-full cursor-pointer sm:w-auto"
        >
          <ChevronLeft className="mr-1 h-4 w-4 sm:mr-0" />
          <span className="sm:hidden">Previous</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="w-full cursor-pointer sm:w-auto"
        >
          <span className="sm:hidden">Next</span>
          <ChevronRight className="ml-1 h-4 w-4 sm:ml-0" />
        </Button>
      </div>
    </div>
  );
}


function ResultsSummary({
  page,
  total,
  limit,
  filtered,
  label,
}: {
  page: number;
  total: number;
  limit: number;
  filtered: boolean;
  label: string;
}) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>
        Showing {start}–{end} of{" "}
        <span className="font-medium text-foreground">{total}</span>{" "}
        {filtered ? "matching " : ""}
        {label}
      </span>

      {filtered && (
        <Badge variant="secondary" className="h-6 px-2 text-[11px] font-normal">
          {total} result{total === 1 ? "" : "s"}
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// Overview Tab
// ============================================================================

interface Stats {
  total_users: number;
  total_bots: number;
  total_forms: number;
  total_submissions: number;

  pending_flagged: number;
  new_today: number;
  blocked_users: number;

  owner_users: number;
  moderator_users: number;

  active_forms: number;
  deleted_submissions: number;
  new_users_week: number;

  sfw_bots: number;
  nsfw_bots: number;
}

function OverviewTab({
  onNavigateToSubmission,
  onNavigateToTab,
}: {
  onNavigateToSubmission: (id: string) => void;
  onNavigateToTab: (tab: AdminTab) => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<{
    recent_users: any[];
    recent_submissions: any[];
    recent_flagged: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [statsRes, activityRes] = await Promise.all([
      getAdminStats(),
      getRecentActivity(),
    ]);
    if (statsRes.success && statsRes.stats) setStats(statsRes.stats);
    if (activityRes.success)
      setActivity({
        recent_users: activityRes.recent_users,
        recent_submissions: activityRes.recent_submissions,
        recent_flagged: activityRes.recent_flagged,
      });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const platformCards = stats
    ? [
        {
          label: "Users",
          value: stats.total_users,
          sub: `+${stats.new_users_week} this week`,
          icon: UsersRound,
          color: "text-primary",
          tab: "users" as AdminTab,
        },
        {
          label: "Bots",
          value: stats.total_bots,
          sub: `${stats.sfw_bots} SFW · ${stats.nsfw_bots} NSFW`,
          icon: Bot,
          color: "text-green-500",
          tab: "bots" as AdminTab,
        },
        {
          label: "Forms",
          value: stats.active_forms,
          sub: `${stats.total_forms} total · active shown`,
          icon: FileText,
          color: "text-muted-foreground",
          tab: "forms" as AdminTab,
        },
        {
          label: "Submissions",
          value: stats.total_submissions,
          sub: `+${stats.new_today} today`,
          icon: Inbox,
          color: "text-blue-500",
          tab: "submissions" as AdminTab,
        },
      ]
    : [];

  const operationsCards = stats
    ? [
        {
          label: "Pending Flags",
          value: stats.pending_flagged,
          sub:
            stats.pending_flagged > 0
              ? "Requires moderation review"
              : "Nothing waiting for review",
          icon: Shield,
          color: "text-orange-500",
          tab: "moderation" as AdminTab,
          alert: stats.pending_flagged > 0,
        },
        {
          label: "Blocked Users",
          value: stats.blocked_users,
          sub:
            stats.blocked_users > 0
              ? "Platform access restricted"
              : "No blocked users",
          icon: Ban,
          color: "text-red-500",
          tab: "users" as AdminTab,
          alert: stats.blocked_users > 0,
        },
        {
          label: "Deleted Submissions",
          value: stats.deleted_submissions,
          sub: "Soft-deleted records",
          icon: Trash2,
          color: "text-red-500",
          tab: "submissions" as AdminTab,
          alert: false,
        },
        {
          label: "Staff",
          value: stats.owner_users + stats.moderator_users,
          sub: `${stats.owner_users} owner · ${stats.moderator_users} moderator${
            stats.moderator_users === 1 ? "" : "s"
          }`,
          icon: CrownIcon,
          color: "text-yellow-500",
          tab: "users" as AdminTab,
          alert: false,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Platform Overview</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Platform health, activity, and items that may require admin
            attention.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="w-full cursor-pointer sm:w-auto"
        >
          <RefreshCw
            className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Platform metrics */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Platform</h3>

          <p className="mt-0.5 text-xs text-muted-foreground">
            Main activity and content across Forgeworks.
          </p>
        </div>

        {loading && !stats ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                  <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {platformCards.map((card) => {
              const Icon = card.icon;

              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => onNavigateToTab(card.tab)}
                  className="min-w-0 cursor-pointer text-left"
                >
                  <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon
                              className={`h-4 w-4 shrink-0 ${card.color}`}
                            />

                            <span className="text-2xl font-bold">
                              {card.value}
                            </span>
                          </div>

                          <p className="mt-1 text-sm font-medium">
                            {card.label}
                          </p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {card.sub}
                          </p>
                        </div>

                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Administrative operations */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Operations</h3>

          <p className="mt-0.5 text-xs text-muted-foreground">
            Administrative states that may need attention or review.
          </p>
        </div>

        {loading && !stats ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                  <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {operationsCards.map((card) => {
              const Icon = card.icon;

              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => onNavigateToTab(card.tab)}
                  className="min-w-0 cursor-pointer text-left"
                >
                  <Card
                    className={`h-full transition-colors hover:bg-muted/20 ${
                      card.alert ? "border-orange-500/40" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon
                              className={`h-4 w-4 shrink-0 ${card.color}`}
                            />

                            <span className="text-2xl font-bold">
                              {card.value}
                            </span>
                          </div>

                          <p className="mt-1 text-sm font-medium">
                            {card.label}
                          </p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {card.sub}
                          </p>
                        </div>

                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent activity */}
      {!loading && activity && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent signups */}
          <Card className="shadow-md dark:shadow-primary/15">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Recent Signups
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateToTab("users")}
                  className="h-7 cursor-pointer px-2 text-xs"
                >
                  View all
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activity.recent_users.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  No users yet.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {activity.recent_users.map((u: any) => (
                    <a
                      key={u.id}
                      href={`/profile/${u.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback>
                          {(u.username ?? "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          @{u.username ?? "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(u.created_at)}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent submissions */}
          <Card className="shadow-md dark:shadow-primary/15">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-blue-500" />
                  Recent Submissions
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateToTab("submissions")}
                  className="h-7 cursor-pointer px-2 text-xs"
                >
                  View all
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activity.recent_submissions.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  No submissions yet.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {activity.recent_submissions.map((s: any) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onNavigateToSubmission(s.id)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          <MarkdownInlineRenderer
                            content={s.form_title || "—"}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          @{s.owner?.username ?? "unknown"} ·{" "}
                          {s.submitter_name ?? "anonymous"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          s.status === "new"
                            ? "default"
                            : s.status === "accepted"
                              ? "secondary"
                              : s.status === "completed"
                                ? "outline"
                                : "destructive"
                        }
                        className="text-xs shrink-0"
                      >
                        {s.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending flags */}
          <Card className="shadow-md dark:shadow-primary/15">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Unreviewed Flags
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateToTab("moderation")}
                  className="h-7 cursor-pointer px-2 text-xs"
                >
                  View all
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activity.recent_flagged.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  No pending flags.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {activity.recent_flagged.map((f: any) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onNavigateToTab("moderation")}
                      className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-muted-foreground">
                          Request #{f.request_id?.slice(0, 8)}…
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(f.created_at)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          f.risk_level === "high" || f.risk_level === "critical"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs shrink-0"
                      >
                        {f.risk_level ?? "—"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Submissions Tab
// ============================================================================

function SubmissionsTab({
  staffRole,
  openId,
  onClearOpenId,
}: {
  staffRole: StaffRole;
  openId?: string | null;
  onClearOpenId?: () => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [sortBy, setSortBy] = useState<
    "created_at" | "status" | "submitter_name"
  >("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [hardDeleteTarget, setHardDeleteTarget] =
    useState<HardDeleteTarget | null>(null);

  const [hardDeleteLoading, setHardDeleteLoading] = useState(false);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAllSubmissions(
      page,
      LIMIT,
      statusFilter,
      userFilter,
      sortBy,
      sortDirection,
    );
    if (result.success) {
      setItems(result.items);
      setTotal(result.total);
    }
    setLoading(false);
  }, [page, statusFilter, userFilter, sortBy, sortDirection]);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setSelectedItem({ id, _loading: true });
    const result = await getSubmissionById(id);
    if (result.success && result.item) {
      setSelectedItem(result.item);
    } else {
      toast.error(result.error ?? "Failed to load submission");
      setSelectedItem(null);
    }
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (!openId) return;
    handleOpenDetail(openId);
    onClearOpenId?.();
  }, [openId]);

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "new":
        return "default";
      case "accepted":
        return "secondary";
      case "completed":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const submissionFieldMap = selectedItem
    ? buildAdminFormFieldMap(
        selectedItem.form?.sections || selectedItem.sections || [],
      )
    : new Map();

  return (
    <div className="space-y-4">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />

            <h2 className="text-lg font-semibold">Submission Management</h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all form submissions on the platform. You can
            filter, sort, and review submissions.
          </p>
        </div>

        <Badge variant="outline" className="w-fit shrink-0">
          {total} {statusFilter !== "all" || userFilter ? "matching " : ""}
          submission{total === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="accepted">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <SearchInput
          value={userFilter}
          onChange={(value) => {
            setUserFilter(value.trim());
            setPage(1);
          }}
          placeholder="Filter by username..."
          className="w-full sm:min-w-[220px] sm:flex-1"
          debounce={220}
          shortcutKey="/"
        />

        <Select
          value={sortBy}
          onValueChange={(value) => {
            setSortBy(value as "created_at" | "status" | "submitter_name");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="created_at">Sort: Date</SelectItem>
            <SelectItem value="status">Sort: Status</SelectItem>
            <SelectItem value="submitter_name">Sort: Submitter</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortDirection}
          onValueChange={(value) => {
            setSortDirection(value as "asc" | "desc");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Order" />
          </SelectTrigger>

          <SelectContent>
            {sortBy === "created_at" ? (
              <>
                <SelectItem value="desc">Newest first</SelectItem>
                <SelectItem value="asc">Oldest first</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="asc">A–Z</SelectItem>
                <SelectItem value="desc">Z–A</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="w-full cursor-pointer sm:ml-auto sm:w-10 sm:px-0"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />

          <span className="ml-2 sm:hidden">Refresh</span>
        </Button>
      </div>

      <ResultsSummary
        page={page}
        total={total}
        limit={LIMIT}
        filtered={statusFilter !== "all" || Boolean(userFilter)}
        label="submissions"
      />

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Submitter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No submissions found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: any) => {
                const isDeleted = !!item.deleted_at;
                return (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer hover:bg-muted/50 ${isDeleted ? "opacity-60 bg-destructive/5" : ""}`}
                    onClick={() => handleOpenDetail(item.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={item.owner?.avatar_url} />
                          <AvatarFallback>
                            {(item.owner?.username ?? "?")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          @{item.owner?.username ?? "unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-40 text-sm">
                      <div className="truncate text-sm">
                        <MarkdownInlineRenderer
                          content={item.form_title || "—"}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.submitter_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant={statusBadgeVariant(item.status) as any}>
                          {item.status}
                        </Badge>
                        {isDeleted && (
                          <Badge variant="destructive" className="text-xs">
                            Deleted
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateTime(item.created_at)}
                    </TableCell>
                    <TableCell>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        total={total}
        limit={LIMIT}
        onPageChange={setPage}
      />

      {/* Detail sheet */}
      <Sheet
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl h-full overflow-hidden flex flex-col p-0"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>Submission Detail</SheetTitle>
            <SheetDescription>
              Full details for this submission.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0 px-6 py-4">
            {selectedItem?._loading || detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              selectedItem && (
                <div className="space-y-5">
                  <div className="rounded-xl border bg-muted/15 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Submission
                        </p>

                        <div className="mt-1 text-base font-semibold">
                          <MarkdownInlineRenderer
                            content={selectedItem.form_title || "Untitled form"}
                          />
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Request #{selectedItem.id?.slice(0, 8)}…
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={
                            statusBadgeVariant(selectedItem.status) as any
                          }
                          className="capitalize"
                        >
                          {selectedItem.status}
                        </Badge>

                        {selectedItem.deleted_at && (
                          <Badge variant="destructive">Soft-Deleted</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Submitter</p>
                      <p className="font-medium">
                        {selectedItem.submitter_name ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Form Owner
                      </p>
                      <a
                        href={`/profile/${selectedItem.owner?.username ?? "unknown"}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer flex items-center gap-2"
                      >
                        <p className="font-medium text-primary cursor-pointer hover:underline">
                          @{selectedItem.owner?.username ?? "—"}
                        </p>
                      </a>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {formatDateTime(selectedItem.created_at)}
                      </p>
                    </div>
                    {selectedItem.updated_at && (
                      <div>
                        <p className="text-xs text-muted-foreground">Updated</p>
                        <p className="font-medium">
                          {formatDateTime(selectedItem.updated_at)}
                        </p>
                      </div>
                    )}
                    {selectedItem.deleted_at && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Deleted at
                        </p>
                        <p className="font-medium text-destructive">
                          {formatDateTime(selectedItem.deleted_at)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Responses */}
                  {selectedItem.responses &&
                    Object.keys(selectedItem.responses).length > 0 && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold">Responses</p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Answers submitted through this form.
                          </p>
                        </div>

                        <div className="space-y-4">
                          {(() => {
                            const grouped = new Map<
                              string,
                              Array<{
                                key: string;
                                value: any;
                                label: string;
                                description: string;
                                required: boolean;
                              }>
                            >();

                            for (const [key, value] of Object.entries(
                              selectedItem.responses as Record<string, any>,
                            )) {
                              const meta = submissionFieldMap.get(key);

                              const savedLabel = normalizeAdminFieldText(
                                (selectedItem.response_labels as any)?.[key],
                              );

                              const sectionTitle =
                                meta?.sectionTitle || "Additional Responses";

                              const label =
                                meta?.label ||
                                meta?.sectionTitle ||
                                savedLabel ||
                                "Untitled field";

                              const current = grouped.get(sectionTitle) || [];

                              current.push({
                                key,
                                value,
                                label,
                                description: meta?.description || "",
                                required: meta?.required || false,
                              });

                              grouped.set(sectionTitle, current);
                            }

                            return Array.from(grouped.entries()).map(
                              ([sectionTitle, fields]) => (
                                <section
                                  key={sectionTitle}
                                  className="space-y-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      {sectionTitle}
                                    </p>

                                    <div className="h-px flex-1 bg-border" />
                                  </div>

                                  <div className="space-y-2">
                                    {fields.map((field) => (
                                      <div
                                        key={field.key}
                                        className="rounded-xl border bg-muted/15 p-3"
                                      >
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-xs font-medium">
                                            {field.label}
                                          </p>

                                          {field.required && (
                                            <Badge
                                              variant="outline"
                                              className="text-[10px]"
                                            >
                                              Required
                                            </Badge>
                                          )}
                                        </div>

                                        {field.description &&
                                          field.description !== field.label && (
                                            <p className="mt-1 text-[11px] text-muted-foreground">
                                              {field.description}
                                            </p>
                                          )}

                                        <div className="mt-2 whitespace-pre-wrap break-words text-sm">
                                          {Array.isArray(field.value)
                                            ? field.value.join(", ")
                                            : String(field.value ?? "—")}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              ),
                            );
                          })()}
                        </div>
                      </div>
                    )}

                  {/* Notes */}
                  {selectedItem.notes && (
                    <div>
                      <p className="text-sm font-medium mb-1">Notes</p>
                      <p className="text-sm bg-muted rounded p-2">
                        {selectedItem.notes}
                      </p>
                    </div>
                  )}

                  {!selectedItem.deleted_at && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-destructive">
                          Danger Zone
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Soft deleting this submission hides it from regular
                          views while keeping the record available for recovery
                          or administrative review.
                        </p>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full cursor-pointer"
                        onClick={async () => {
                          const result = await softDeleteSubmission(
                            selectedItem.id,
                          );

                          if (!result.success) {
                            toast.error(result.error ?? "Failed");
                            return;
                          }

                          const deletedAt =
                            (result as any).deleted_at ??
                            new Date().toISOString();

                          toast.success("Submission soft-deleted");

                          setSelectedItem((prev: any) =>
                            prev
                              ? {
                                  ...prev,
                                  deleted_at: deletedAt,
                                }
                              : prev,
                          );

                          setItems((prev) =>
                            prev.map((item) =>
                              item.id === selectedItem.id
                                ? {
                                    ...item,
                                    deleted_at: deletedAt,
                                  }
                                : item,
                            ),
                          );
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Soft Delete Submission
                      </Button>
                    </div>
                  )}

                  {/* Deleted submission actions */}
                  {selectedItem.deleted_at && (
                    <div className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/[0.05]">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-destructive/10 p-2">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-destructive">
                              Deleted Submission
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              This submission is currently soft-deleted. It can
                              still be restored without losing its stored
                              information.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`
        grid gap-2 border-t border-destructive/20 p-3
        ${staffRole === "owner" ? "sm:grid-cols-2" : ""}
      `}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full cursor-pointer"
                          onClick={async () => {
                            const result = await restoreSubmission(
                              selectedItem.id,
                            );

                            if (!result.success) {
                              toast.error(
                                result.error ?? "Failed to restore submission",
                              );
                              return;
                            }

                            toast.success("Submission restored");

                            setSelectedItem((current: any) =>
                              current
                                ? {
                                    ...current,
                                    deleted_at: null,
                                  }
                                : current,
                            );

                            setItems((current) =>
                              current.map((item) =>
                                item.id === selectedItem.id
                                  ? {
                                      ...item,
                                      deleted_at: null,
                                    }
                                  : item,
                              ),
                            );
                          }}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore Submission
                        </Button>

                        {staffRole === "owner" && (
                          <Button
                            type="button"
                            variant="destructive"
                            className="w-full cursor-pointer"
                            onClick={() =>
                              setHardDeleteTarget({
                                type: "submission",
                                id: selectedItem.id,
                                label: `Submission #${selectedItem.id?.slice(0, 8) ?? ""}`,
                              })
                            }
                          >
                            <Flame className="mr-2 h-4 w-4" />
                            Permanently Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={hardDeleteTarget?.type === "submission"}
        onOpenChange={(open) => {
          if (!open && !hardDeleteLoading) {
            setHardDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete this submission?
            </AlertDialogTitle>

            <AlertDialogDescription>
              This permanently removes the submission from the database. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={hardDeleteLoading}
              className="w-full cursor-pointer sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={hardDeleteLoading}
              onClick={(event) => {
                event.preventDefault();

                void (async () => {
                  if (!hardDeleteTarget) {
                    return;
                  }

                  setHardDeleteLoading(true);

                  try {
                    const result = await hardDeleteSubmission(
                      hardDeleteTarget.id,
                    );

                    if (!result.success) {
                      toast.error(
                        result.error ??
                          "Failed to permanently delete submission",
                      );
                      return;
                    }

                    toast.success("Submission permanently deleted");

                    setItems((current) =>
                      current.filter((item) => item.id !== hardDeleteTarget.id),
                    );

                    setSelectedItem(null);
                    setHardDeleteTarget(null);
                  } finally {
                    setHardDeleteLoading(false);
                  }
                })();
              }}
              className="w-full cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
            >
              {hardDeleteLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Flame className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Forms Tab
// ============================================================================

function FormsTab({ staffRole }: { staffRole: StaffRole }) {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [userFilter, setUserFilter] = useState("");
  const [sortBy, setSortBy] = useState<
    "created_at" | "updated_at" | "title" | "is_active"
  >("updated_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [hardDeleteTarget, setHardDeleteTarget] =
    useState<HardDeleteTarget | null>(null);

  const [hardDeleteLoading, setHardDeleteLoading] = useState(false);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAllForms(
      page,
      LIMIT,
      userFilter,
      sortBy,
      sortDirection,
    );
    if (result.success) {
      setItems(result.items);
      setTotal(result.total);
    }
    setLoading(false);
  }, [page, userFilter, sortBy, sortDirection]);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenDetail = async (id: string) => {
    setSelectedItem({ id, _loading: true });
    setDetailLoading(true);
    const result = await getFormById(id);
    if (result.success && result.item) {
      setSelectedItem(result.item);
    } else {
      toast.error(result.error ?? "Failed to load form");
      setSelectedItem(null);
    }
    setDetailLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />

            <h2 className="text-lg font-semibold">Form Management</h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all forms submitted by users. You can filter and
            sort the list to find specific forms, and click on a form to view
            its details.
          </p>
        </div>

        <Badge variant="outline" className="w-fit shrink-0">
          {total} {userFilter ? "matching " : ""}
          form{total === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput
          value={userFilter}
          onChange={(value) => {
            setUserFilter(value.trim());
            setPage(1);
          }}
          placeholder="Filter by username..."
          className="w-full sm:min-w-[240px] sm:flex-1"
          debounce={220}
          shortcutKey="/"
        />

        <Select
          value={sortBy}
          onValueChange={(value) => {
            setSortBy(
              value as "created_at" | "updated_at" | "title" | "is_active",
            );
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="updated_at">Sort: Last updated</SelectItem>
            <SelectItem value="created_at">Sort: Created</SelectItem>
            <SelectItem value="title">Sort: Title</SelectItem>
            <SelectItem value="is_active">Sort: Availability</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortDirection}
          onValueChange={(value) => {
            setSortDirection(value as "asc" | "desc");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Order" />
          </SelectTrigger>

          <SelectContent>
            {sortBy === "created_at" || sortBy === "updated_at" ? (
              <>
                <SelectItem value="desc">Newest first</SelectItem>
                <SelectItem value="asc">Oldest first</SelectItem>
              </>
            ) : sortBy === "title" ? (
              <>
                <SelectItem value="asc">A–Z</SelectItem>
                <SelectItem value="desc">Z–A</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="desc">Active first</SelectItem>
                <SelectItem value="asc">Inactive first</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="w-full cursor-pointer sm:ml-auto sm:w-10 sm:px-0"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />

          <span className="ml-2 sm:hidden">Refresh</span>
        </Button>
      </div>

      <ResultsSummary
        page={page}
        total={total}
        limit={LIMIT}
        filtered={Boolean(userFilter)}
        label="forms"
      />

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Structure</TableHead>
              <TableHead>Security</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No forms found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: any) => {
                const isDeleted = !!item.deleted_at;
                return (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer hover:bg-muted/50 ${isDeleted ? "opacity-60 bg-destructive/5" : ""}`}
                    onClick={() => handleOpenDetail(item.id)}
                  >
                    <TableCell className="max-w-64">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          <MarkdownInlineRenderer content={item.title || "—"} />
                        </div>

                        {item.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {stripMarkdownToText(item.description)}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={item.owner?.avatar_url} />
                          <AvatarFallback>
                            {(item.owner?.username ?? "?")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <span className="text-sm">
                          @{item.owner?.username ?? "unknown"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {(item.sections || []).length} sections ·{" "}
                      {(item.sections || []).reduce(
                        (total: number, section: any) =>
                          total + (section.fields || []).length,
                        0,
                      )}{" "}
                      fields
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.security_sensitivity || "medium"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge
                          variant={item.is_active ? "default" : "secondary"}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </Badge>

                        {isDeleted && (
                          <Badge variant="destructive" className="text-xs">
                            Deleted
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(item.updated_at || item.created_at)}
                    </TableCell>

                    <TableCell>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        total={total}
        limit={LIMIT}
        onPageChange={setPage}
      />

      {/* Detail sheet */}
      <Sheet
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-3xl lg:max-w-4xl"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>Form Detail</SheetTitle>
            <SheetDescription>
              Full configuration for this form.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0 px-6 py-4">
            {selectedItem?._loading || detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              selectedItem && (
                <div className="space-y-5">
                  <div className="overflow-hidden rounded-xl border bg-muted/10">
                    {(selectedItem.banner_asset_path ||
                      selectedItem.banner_url) && (
                      <div className="aspect-[4/1] w-full overflow-hidden bg-muted">
                        <img
                          src={
                            selectedItem.banner_asset_path
                              ? getFormBannerPublicUrl(
                                  selectedItem.banner_asset_path,
                                )
                              : selectedItem.banner_url
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base font-semibold">
                            <MarkdownInlineRenderer
                              content={selectedItem.title || "Untitled form"}
                            />
                          </div>

                          {selectedItem.description && (
                            <div className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                              <MarkdownRenderer
                                content={selectedItem.description}
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={
                              selectedItem.is_active ? "default" : "secondary"
                            }
                          >
                            {selectedItem.is_active ? "Active" : "Inactive"}
                          </Badge>

                          {selectedItem.security_sensitivity && (
                            <Badge variant="outline">
                              Security: {selectedItem.security_sensitivity}
                            </Badge>
                          )}

                          {selectedItem.deleted_at && (
                            <Badge variant="destructive">Soft-Deleted</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          @{selectedItem.owner?.username || "unknown"}
                        </span>

                        <span>
                          {(selectedItem.sections || []).length} sections
                        </span>

                        <span>
                          {(selectedItem.sections || []).reduce(
                            (total: number, section: any) =>
                              total + (section.fields || []).length,
                            0,
                          )}{" "}
                          fields
                        </span>

                        {selectedItem.shareable_link && (
                          <div className="flex flex-wrap items-center gap-1">
                            <p>Shareable Link:</p>
                            <a
                              href={`/form/${selectedItem.shareable_link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              /form/{selectedItem.shareable_link}{" "}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {Array.isArray(selectedItem.sections) &&
                    selectedItem.sections.length > 0 && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold">
                            Form Structure
                          </p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Sections and fields currently configured in this
                            form.
                          </p>
                        </div>

                        <div className="space-y-4">
                          {(selectedItem.sections as any[]).map(
                            (section: any, sectionIndex: number) => (
                              <section
                                key={section.id ?? sectionIndex}
                                className="overflow-hidden rounded-xl border"
                              >
                                <div className="border-b bg-muted/20 p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold">
                                        <MarkdownInlineRenderer
                                          content={
                                            section.title ||
                                            `Section ${sectionIndex + 1}`
                                          }
                                        />
                                      </div>

                                      {section.description && (
                                        <div className="mt-1 text-xs text-muted-foreground">
                                          <MarkdownRenderer
                                            content={section.description}
                                          />
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex gap-1">
                                      <Badge
                                        variant="outline"
                                        className="text-[10px]"
                                      >
                                        {(section.fields || []).length} fields
                                      </Badge>

                                      {section.collapsible && (
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px]"
                                        >
                                          Collapsible
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="divide-y">
                                  {(section.fields || []).length === 0 ? (
                                    <div className="p-3 text-xs text-muted-foreground">
                                      No fields in this section.
                                    </div>
                                  ) : (
                                    (section.fields || []).map(
                                      (field: any, fieldIndex: number) => (
                                        <div
                                          key={field.id ?? fieldIndex}
                                          className="space-y-2 p-3"
                                        >
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                              variant="outline"
                                              className="text-[10px]"
                                            >
                                              {getAdminFieldTypeLabel(
                                                field.type,
                                              )}
                                            </Badge>

                                            {field.required && (
                                              <Badge
                                                variant="secondary"
                                                className="text-[10px]"
                                              >
                                                Required
                                              </Badge>
                                            )}
                                          </div>

                                          <div>
                                            <p className="text-xs font-medium">
                                              {normalizeAdminFieldText(
                                                field.label,
                                              ) || (
                                                <span className="italic text-muted-foreground">
                                                  No field label
                                                </span>
                                              )}
                                            </p>

                                            {field.description && (
                                              <p className="mt-1 text-[11px] text-muted-foreground">
                                                {normalizeAdminFieldText(
                                                  field.description,
                                                )}
                                              </p>
                                            )}
                                          </div>

                                          {field.placeholder && (
                                            <div className="rounded-md bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground">
                                              Placeholder: {field.placeholder}
                                            </div>
                                          )}

                                          {Array.isArray(field.options) &&
                                            field.options.length > 0 && (
                                              <div className="flex flex-wrap gap-1">
                                                {field.options.map(
                                                  (
                                                    option: any,
                                                    optionIndex: number,
                                                  ) => (
                                                    <Badge
                                                      key={
                                                        option.id ??
                                                        option.value ??
                                                        optionIndex
                                                      }
                                                      variant="secondary"
                                                      className="text-[10px]"
                                                    >
                                                      {String(
                                                        option.label ??
                                                          option.value ??
                                                          option,
                                                      )}
                                                    </Badge>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      ),
                                    )
                                  )}
                                </div>
                              </section>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {!selectedItem.deleted_at && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-destructive">
                          Danger Zone
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Soft deleting this form hides it from normal use while
                          keeping its record available for administrative
                          recovery or review.
                        </p>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full cursor-pointer"
                        onClick={async () => {
                          const result = await softDeleteForm(selectedItem.id);

                          if (!result.success) {
                            toast.error(result.error ?? "Failed");
                            return;
                          }

                          const deletedAt =
                            (result as any).deleted_at ??
                            new Date().toISOString();

                          toast.success("Form soft-deleted");

                          setSelectedItem((prev: any) =>
                            prev
                              ? {
                                  ...prev,
                                  deleted_at: deletedAt,
                                }
                              : prev,
                          );

                          setItems((prev) =>
                            prev.map((item) =>
                              item.id === selectedItem.id
                                ? {
                                    ...item,
                                    deleted_at: deletedAt,
                                  }
                                : item,
                            ),
                          );
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Soft Delete Form
                      </Button>
                    </div>
                  )}

                  {selectedItem.deleted_at && (
                    <div className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/[0.05]">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-destructive/10 p-2">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-destructive">
                              Deleted Form
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              This form is soft-deleted and unavailable for
                              normal use, but its configuration is still stored
                              and can be restored.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`
        grid gap-2 border-t border-destructive/20 p-3
        ${staffRole === "owner" ? "sm:grid-cols-2" : ""}
      `}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full cursor-pointer"
                          onClick={async () => {
                            const result = await restoreForm(selectedItem.id);

                            if (!result.success) {
                              toast.error(
                                result.error ?? "Failed to restore form",
                              );
                              return;
                            }

                            toast.success("Form restored");

                            setSelectedItem((current: any) =>
                              current
                                ? {
                                    ...current,
                                    deleted_at: null,
                                  }
                                : current,
                            );

                            setItems((current) =>
                              current.map((item) =>
                                item.id === selectedItem.id
                                  ? {
                                      ...item,
                                      deleted_at: null,
                                    }
                                  : item,
                              ),
                            );
                          }}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore Form
                        </Button>

                        {staffRole === "owner" && (
                          <Button
                            type="button"
                            variant="destructive"
                            className="w-full cursor-pointer"
                            onClick={() =>
                              setHardDeleteTarget({
                                type: "form",
                                id: selectedItem.id,
                                label: stripMarkdownToText(
                                  selectedItem.title || "Untitled form",
                                ),
                              })
                            }
                          >
                            <Flame className="mr-2 h-4 w-4" />
                            Permanently Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={hardDeleteTarget?.type === "form"}
        onOpenChange={(open) => {
          if (!open && !hardDeleteLoading) {
            setHardDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this form?</AlertDialogTitle>

            <AlertDialogDescription>
              This permanently deletes the form, its remaining submissions,
              moderation records, blocklists, stored form assets, and banner
              data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={hardDeleteLoading}
              className="w-full cursor-pointer sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={hardDeleteLoading}
              onClick={(event) => {
                event.preventDefault();

                void (async () => {
                  if (!hardDeleteTarget) return;

                  setHardDeleteLoading(true);

                  try {
                    const result = await hardDeleteForm(hardDeleteTarget.id);

                    if (!result.success) {
                      toast.error(
                        result.error ?? "Failed to permanently delete form",
                      );
                      return;
                    }

                    toast.success("Form permanently deleted");

                    setItems((current) =>
                      current.filter((item) => item.id !== hardDeleteTarget.id),
                    );

                    setSelectedItem(null);
                    setHardDeleteTarget(null);
                  } finally {
                    setHardDeleteLoading(false);
                  }
                })();
              }}
              className="w-full cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
            >
              {hardDeleteLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Flame className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Bots Tab
// ============================================================================

function BotsTab({ staffRole }: { staffRole: StaffRole }) {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [userFilter, setUserFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sortBy, setSortBy] = useState<
    "created_at" | "updated_at" | "name" | "rating"
  >("updated_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [hardDeleteTarget, setHardDeleteTarget] =
    useState<HardDeleteTarget | null>(null);

  const [hardDeleteLoading, setHardDeleteLoading] = useState(false);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAllBots(
      page,
      LIMIT,
      userFilter,
      ratingFilter,
      sortBy,
      sortDirection,
    );
    if (result.success) {
      setItems(result.items);
      setTotal(result.total);
    }
    setLoading(false);
  }, [page, userFilter, ratingFilter, sortBy, sortDirection]);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenDetail = async (id: string) => {
    setSelectedItem({ id, _loading: true });
    setDetailLoading(true);
    const result = await getBotById(id);
    if (result.success && result.item) {
      setSelectedItem(result.item);
    } else {
      toast.error(result.error ?? "Failed to load bot");
      setSelectedItem(null);
    }
    setDetailLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />

            <h2 className="text-lg font-semibold">Bot Management</h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all bots on the platform, including their details
            and settings.
          </p>
        </div>

        <Badge variant="outline" className="w-fit shrink-0">
          {total} {ratingFilter !== "all" || userFilter ? "matching " : ""}
          bot{total === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Select
          value={ratingFilter}
          onValueChange={(value) => {
            setRatingFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[135px]">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All ratings</SelectItem>
            <SelectItem value="SFW">SFW</SelectItem>
            <SelectItem value="NSFW">NSFW</SelectItem>
          </SelectContent>
        </Select>

        <SearchInput
          value={userFilter}
          onChange={(value) => {
            setUserFilter(value.trim());
            setPage(1);
          }}
          placeholder="Filter by username..."
          className="w-full sm:min-w-[220px] sm:flex-1"
          debounce={220}
          shortcutKey="/"
        />

        <Select
          value={sortBy}
          onValueChange={(value) => {
            setSortBy(
              value as "created_at" | "updated_at" | "name" | "rating",
            );
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="updated_at">Sort: Last updated</SelectItem>
            <SelectItem value="created_at">Sort: Created</SelectItem>
            <SelectItem value="name">Sort: Bot name</SelectItem>
            <SelectItem value="rating">Sort: Rating</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortDirection}
          onValueChange={(value) => {
            setSortDirection(value as "asc" | "desc");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Order" />
          </SelectTrigger>

          <SelectContent>
            {sortBy === "created_at" || sortBy === "updated_at" ? (
              <>
                <SelectItem value="desc">Newest first</SelectItem>
                <SelectItem value="asc">Oldest first</SelectItem>
              </>
            ) : sortBy === "name" ? (
              <>
                <SelectItem value="asc">A–Z</SelectItem>
                <SelectItem value="desc">Z–A</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="desc">SFW first</SelectItem>
                <SelectItem value="asc">NSFW first</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="w-full cursor-pointer sm:ml-auto sm:w-10 sm:px-0"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />

          <span className="ml-2 sm:hidden">Refresh</span>
        </Button>
      </div>

      <ResultsSummary
        page={page}
        total={total}
        limit={LIMIT}
        filtered={ratingFilter !== "all" || Boolean(userFilter)}
        label="bots"
      />

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bot</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No bots found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: any) => {
                const isDeleted = !!item.deleted_at;
                return (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer hover:bg-muted/50 ${isDeleted ? "opacity-60 bg-destructive/5" : ""}`}
                    onClick={() => handleOpenDetail(item.id)}
                  >
                    <TableCell className="max-w-72">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Bot className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.name || "Untitled bot"}
                          </p>

                          {item.short_description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {item.short_description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={item.owner?.avatar_url} />
                          <AvatarFallback>
                            {(item.owner?.username ?? "?")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <span className="text-sm">
                          @{item.owner?.username ?? "unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Badge
                          variant={
                            item.rating === "NSFW" ? "destructive" : "secondary"
                          }
                          className="text-xs"
                        >
                          {item.rating}
                        </Badge>
                        {isDeleted && (
                          <Badge variant="destructive" className="text-xs">
                            Deleted
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="w-[220px] max-w-[220px]">
                      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                        {(item.tags ?? []).slice(0, 2).map((tag: string) => (
                          <BotTagBadge
                            key={tag}
                            tag={tag}
                            className="max-w-[92px] shrink"
                          />
                        ))}

                        {(item.tags ?? []).length > 2 && (
                          <BotTagCountBadge
                            count={item.tags.length - 2}
                            className="shrink-0"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(item.updated_at || item.created_at)}
                    </TableCell>
                    <TableCell>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        total={total}
        limit={LIMIT}
        onPageChange={setPage}
      />

      {/* Detail sheet */}
      <Sheet
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-3xl"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>Bot Detail</SheetTitle>
            <SheetDescription>Full information for this bot.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0 px-6 py-4">
            {selectedItem?._loading || detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              selectedItem && (
                <div className="space-y-5">
                  <div className="rounded-xl border bg-muted/10 p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted">
                        {selectedItem.image_url ? (
                          <img
                            src={selectedItem.image_url}
                            alt={selectedItem.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Bot className="h-7 w-7 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold">
                              {selectedItem.name || "Untitled bot"}
                            </h3>

                            {selectedItem.chat_name && (
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                Chat name: {selectedItem.chat_name}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1">
                            <Badge
                              variant={
                                selectedItem.rating === "NSFW"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {selectedItem.rating}
                            </Badge>

                            {selectedItem.deleted_at && (
                              <Badge variant="destructive">Soft-Deleted</Badge>
                            )}
                          </div>
                        </div>

                        {selectedItem.short_description && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {selectedItem.short_description}
                          </p>
                        )}

                        <a
                          href={`/profile/${selectedItem.owner?.username ?? "unknown"}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer flex items-center gap-2"
                        >
                          <p className="mt-2 font-medium text-primary cursor-pointer hover:underline">
                            @{selectedItem.owner?.username || "unknown"}
                          </p>
                        </a>
                      </div>
                    </div>
                  </div>

                  {selectedItem.hide_sensitive_fields && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                      <div className="flex items-start gap-2">
                        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />

                        <div>
                          <p className="text-xs font-medium">
                            Sensitive fields hidden publicly
                          </p>

                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            The creator has hidden this bot&apos;s definition
                            and message fields from public views. Administrators
                            can still inspect the stored content here.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {formatDateTime(selectedItem.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Updated</p>
                      <p className="font-medium">
                        {formatDateTime(selectedItem.updated_at)}
                      </p>
                    </div>
                    {selectedItem.deleted_at && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Deleted at
                        </p>
                        <p className="font-medium text-destructive">
                          {formatDateTime(selectedItem.deleted_at)}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedItem.tags?.length > 0 && (
                    <section className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold">Tags</p>

                        <p className="text-xs text-muted-foreground">
                          Official and custom tags assigned to this bot.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(selectedItem.tags as string[]).map((tag) => (
                          <BotTagBadge key={tag} tag={tag} />
                        ))}
                      </div>
                    </section>
                  )}

                  {selectedItem.personality && (
                    <section className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold">Personality</p>

                        <p className="text-xs text-muted-foreground">
                          Main character definition.
                        </p>
                      </div>

                      <div className="max-h-[360px] overflow-y-auto rounded-xl border bg-muted/15 p-4">
                        <MarkdownRenderer
                          className="rendered-markdown break-words text-sm"
                          content={selectedItem.personality}
                        />
                      </div>
                    </section>
                  )}

                  {selectedItem.scenario && (
                    <section className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold">Scenario</p>
                      </div>

                      <div className="max-h-[320px] overflow-y-auto rounded-xl border bg-muted/15 p-4">
                        <MarkdownRenderer
                          className="rendered-markdown break-words text-sm"
                          content={selectedItem.scenario}
                        />
                      </div>
                    </section>
                  )}

                  {selectedItem.first_message && (
                    <section className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold">Initial Message</p>
                      </div>

                      <div className="max-h-[360px] overflow-y-auto rounded-xl border bg-muted/15 p-4">
                        <MarkdownRenderer
                          className="rendered-markdown break-words text-sm"
                          content={selectedItem.first_message}
                        />
                      </div>
                    </section>
                  )}

                  {Array.isArray(selectedItem.alternate_greetings) &&
                    selectedItem.alternate_greetings.length > 0 && (
                      <section className="space-y-2">
                        <div>
                          <p className="text-sm font-semibold">
                            Alternate Greetings
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {selectedItem.alternate_greetings.length} alternate
                            messages.
                          </p>
                        </div>

                        <div className="space-y-2">
                          {selectedItem.alternate_greetings.map(
                            (greeting: any, index: number) => (
                              <div
                                key={greeting.id ?? index}
                                className="max-h-[320px] overflow-y-auto rounded-xl border bg-muted/15 p-4"
                              >
                                <p className="mb-2 text-xs font-medium text-muted-foreground">
                                  Greeting {index + 1}
                                </p>

                                <MarkdownRenderer
                                  className="rendered-markdown text-sm"
                                  content={
                                    typeof greeting === "string"
                                      ? greeting
                                      : greeting.content || greeting.text || ""
                                  }
                                />
                              </div>
                            ),
                          )}
                        </div>
                      </section>
                    )}

                  {selectedItem.example_dialogues && (
                    <section className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold">
                          Example Dialogues
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Example conversations stored in the bot definition.
                        </p>
                      </div>

                      <div className="max-h-[360px] overflow-y-auto rounded-xl border bg-muted/15 p-4">
                        <MarkdownRenderer
                          className="rendered-markdown break-words text-sm"
                          content={selectedItem.example_dialogues}
                        />
                      </div>
                    </section>
                  )}

                  {!selectedItem.deleted_at && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-destructive">
                          Danger Zone
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Soft deleting this bot hides it from regular platform
                          views while keeping its database record available for
                          administrative review.
                        </p>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full cursor-pointer"
                        onClick={async () => {
                          const result = await softDeleteBot(selectedItem.id);

                          if (!result.success) {
                            toast.error(result.error ?? "Failed");
                            return;
                          }

                          const deletedAt =
                            (result as any).deleted_at ??
                            new Date().toISOString();

                          toast.success("Bot soft-deleted");

                          setSelectedItem((prev: any) =>
                            prev
                              ? {
                                  ...prev,
                                  deleted_at: deletedAt,
                                }
                              : prev,
                          );

                          setItems((prev) =>
                            prev.map((item) =>
                              item.id === selectedItem.id
                                ? {
                                    ...item,
                                    deleted_at: deletedAt,
                                  }
                                : item,
                            ),
                          );
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Soft Delete Bot
                      </Button>
                    </div>
                  )}

                  {selectedItem.deleted_at && (
                    <div className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/[0.05]">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-destructive/10 p-2">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-destructive">
                              Deleted Bot
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              This bot is currently soft-deleted. Its stored
                              data is still available and the bot can be
                              restored.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`
        grid gap-2 border-t border-destructive/20 p-3
        ${staffRole === "owner" ? "sm:grid-cols-2" : ""}
      `}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full cursor-pointer"
                          onClick={async () => {
                            const result = await restoreBot(selectedItem.id);

                            if (!result.success) {
                              toast.error(
                                result.error ?? "Failed to restore bot",
                              );
                              return;
                            }

                            toast.success("Bot restored");

                            setSelectedItem((current: any) =>
                              current
                                ? {
                                    ...current,
                                    deleted_at: null,
                                  }
                                : current,
                            );

                            setItems((current) =>
                              current.map((item) =>
                                item.id === selectedItem.id
                                  ? {
                                      ...item,
                                      deleted_at: null,
                                    }
                                  : item,
                              ),
                            );
                          }}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore Bot
                        </Button>

                        {staffRole === "owner" && (
                          <Button
                            type="button"
                            variant="destructive"
                            className="w-full cursor-pointer"
                            onClick={() =>
                              setHardDeleteTarget({
                                type: "bot",
                                id: selectedItem.id,
                                label: selectedItem.name || "Untitled bot",
                              })
                            }
                          >
                            <Flame className="mr-2 h-4 w-4" />
                            Permanently Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={hardDeleteTarget?.type === "bot"}
        onOpenChange={(open) => {
          if (!open && !hardDeleteLoading) {
            setHardDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this bot?</AlertDialogTitle>

            <AlertDialogDescription>
              This permanently removes the bot record and its stored bot image.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={hardDeleteLoading}
              className="w-full cursor-pointer sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={hardDeleteLoading}
              onClick={(event) => {
                event.preventDefault();

                void (async () => {
                  if (!hardDeleteTarget) return;

                  setHardDeleteLoading(true);

                  try {
                    const result = await hardDeleteBot(hardDeleteTarget.id);

                    if (!result.success) {
                      toast.error(
                        result.error ?? "Failed to permanently delete bot",
                      );
                      return;
                    }

                    toast.success("Bot permanently deleted");

                    setItems((current) =>
                      current.filter((item) => item.id !== hardDeleteTarget.id),
                    );

                    setSelectedItem(null);
                    setHardDeleteTarget(null);
                  } finally {
                    setHardDeleteLoading(false);
                  }
                })();
              }}
              className="w-full cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
            >
              {hardDeleteLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Flame className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Users Tab
// ============================================================================

interface UserItem {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_blocked: boolean;
  created_at: string;
  updated_at: string | null;

  stats?: {
    bots: number;
    forms: number;
    creator_pages: number;
    submissions: number;
    flags: number;
    worlds: number;
    lorebooks: number;
    entries: number;
    collections: number;
  };

  last_activity?: {
    id: string;
    kind:
      | "profile"
      | "bot"
      | "form"
      | "creator_page"
      | "world"
      | "lorebook"
      | "entry"
      | "collection";
    label: string;
    at: string;
    deleted: boolean;
  } | null;

  recent_activity?: Array<{
    id: string;
    kind:
      | "profile"
      | "bot"
      | "form"
      | "creator_page"
      | "world"
      | "lorebook"
      | "entry"
      | "collection";
    label: string;
    at: string;
    deleted: boolean;
  }>;

  staff_role: "owner" | "moderator" | null;
}

function UsersTab({ staffRole }: { staffRole: StaffRole }) {
  const [items, setItems] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");

  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<
    | "created_at"
    | "updated_at"
    | "username"
    | "display_name"
    | "is_blocked"
  >("created_at");

  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [loading, setLoading] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const [userDetailLoading, setUserDetailLoading] = useState(false);

  const [pendingAction, setPendingAction] = useState<{
    type:
      | "staff-role"
      | "block"
      | "reset-name"
      | "clear-avatar"
      | "delete"
      | "reset-pin";
    userId: string;
    value?: boolean;
    username: string;
  } | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  const [pinDraft, setPinDraft] = useState("");
  const [pinConfirmDraft, setPinConfirmDraft] = useState("");

  const LIMIT = 25;

  // ============================================================
  // Load users
  // ============================================================

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getAdminUsers(
        page,
        LIMIT,
        search,
        sortBy,
        sortDirection,
      );

      if (!result.success) {
        toast.error(result.error ?? "Failed to load users");
        return;
      }

      setItems(result.items as UserItem[]);

      setTotal(result.total);
    } catch (error) {
      console.error("Failed to load admin users:", error);

      toast.error("Something went wrong while loading users");
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortDirection]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleOpenUser = async (user: UserItem) => {
    setSelectedUser(user);
    setUserDetailLoading(true);

    try {
      const result = await getAdminUserById(user.id);

      if (!result.success) {
        toast.error(result.error || "Failed to load user details");

        return;
      }

      if (result.user) {
        setSelectedUser(result.user as UserItem);
      }
    } catch (error) {
      console.error("Failed to load user detail:", error);

      toast.error("Something went wrong while loading user details");
    } finally {
      setUserDetailLoading(false);
    }
  };

  const handleCopyUserId = async (userId: string) => {
    try {
      await navigator.clipboard.writeText(userId);

      setCopiedUserId(userId);

      window.setTimeout(() => {
        setCopiedUserId((current) => (current === userId ? null : current));
      }, 2000);
    } catch (error) {
      console.error("Failed to copy user ID:", error);

      toast.error("Could not copy User ID");
    }
  };

  // ============================================================
  // Action helpers
  // ============================================================

  const openUserAction = (
    type:
      | "staff-role"
      | "block"
      | "reset-name"
      | "clear-avatar"
      | "delete"
      | "reset-pin",
    user: UserItem,
    value?: boolean,
  ) => {
    if (type === "reset-pin") {
      setPinDraft("");
      setPinConfirmDraft("");
    }

    setPendingAction({
      type,
      userId: user.id,
      value,
      username: user.username ?? user.id,
    });
  };

  const updateSelectedUserLocally = (
    type:
      | "staff-role"
      | "block"
      | "reset-name"
      | "clear-avatar"
      | "delete"
      | "reset-pin",
    value?: boolean,
  ) => {
    if (!selectedUser) {
      return;
    }

    if (type === "delete") {
      setSelectedUser(null);
      return;
    }

    setSelectedUser((current) => {
      if (!current) {
        return current;
      }

      switch (type) {
        case "staff-role":
          return {
            ...current,
            staff_role: value ? "moderator" : null,
          };

        case "block":
          return {
            ...current,
            is_blocked: value === true,
          };

        case "reset-name":
          return {
            ...current,
            display_name: current.username,
          };

        case "clear-avatar":
          return {
            ...current,
            avatar_url: null,
          };

        default:
          return current;
      }
    });
  };

  // ============================================================
  // Confirm admin action
  // ============================================================

  const confirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    const { type, userId, value, username } = pendingAction;

    if (type === "reset-pin") {
      const trimmedPin = pinDraft.trim();

      if (!/^\d{4}$/.test(trimmedPin)) {
        toast.error("PIN must be exactly 4 digits");
        return;
      }

      if (trimmedPin !== pinConfirmDraft.trim()) {
        toast.error("PINs do not match");
        return;
      }
    }

    setActionLoading(true);

    try {
      let result: {
        success: boolean;
        error?: any;
      };

      switch (type) {
        case "staff-role":
          result = await setUserStaffRole(userId, value ? "moderator" : null);
          break;

        case "block":
          result = value ? await blockUser(userId) : await unblockUser(userId);
          break;

        case "reset-name":
          result = await resetUserDisplayName(userId);
          break;

        case "clear-avatar":
          result = await clearUserAvatar(userId);
          break;

        case "reset-pin":
          result = await resetUserPin(userId, pinDraft.trim());
          break;

        case "delete":
          result = await deleteUserAsAdmin(userId);
          break;

        default:
          return;
      }

      if (!result.success) {
        toast.error(result.error ?? "Action failed");
        return;
      }

      const successMessages: Record<string, string> = {
        "staff-role": value
          ? `@${username} is now a moderator`
          : `@${username} is no longer a moderator`,

        block: value
          ? `@${username} has been blocked`
          : `@${username} has been unblocked`,

        "reset-name": `Display name reset for @${username}`,

        "clear-avatar": `Avatar cleared for @${username}`,

        "reset-pin": `PIN updated for @${username}`,

        delete: `Account @${username} has been permanently deleted`,
      };

      toast.success(successMessages[type]);

      updateSelectedUserLocally(type, value);

      if (type === "delete") {
        setItems((current) => current.filter((user) => user.id !== userId));

        setTotal((current) => Math.max(0, current - 1));
      } else {
        await load();
      }

      setPendingAction(null);
      setPinDraft("");
      setPinConfirmDraft("");
    } catch (error) {
      console.error("Admin user action failed:", error);

      toast.error("Something went wrong while performing this action");
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // Dialog copy
  // ============================================================

  const dialogTitle = () => {
    if (!pendingAction) {
      return "";
    }

    const { type, value } = pendingAction;

    if (type === "staff-role") {
      return value ? "Grant Moderator Role" : "Remove Moderator Role";
    }

    if (type === "block") {
      return value ? "Block User" : "Unblock User";
    }

    if (type === "reset-name") {
      return "Reset Display Name";
    }

    if (type === "clear-avatar") {
      return "Clear Avatar";
    }

    if (type === "reset-pin") {
      return "Set New PIN";
    }

    if (type === "delete") {
      return "Delete Account Permanently";
    }

    return "";
  };

  const dialogDescription = () => {
    if (!pendingAction) {
      return "";
    }

    const { type, value, username } = pendingAction;

    if (type === "staff-role") {
      return value
        ? `@${username} will receive moderator access to staff tools.`
        : `@${username} will lose moderator access.`;
    }

    if (type === "block") {
      return value
        ? `@${username} will be blocked from accessing the platform.`
        : `@${username} will be unblocked and regain access.`;
    }

    if (type === "reset-name") {
      return `The display name of @${username} will be reset to their username.`;
    }

    if (type === "clear-avatar") {
      return `The avatar of @${username} will be removed.`;
    }

    if (type === "reset-pin") {
      return `A new 4-digit PIN will be assigned to @${username}. The user can use it on their next login.`;
    }

    if (type === "delete") {
      return `This permanently deletes @${username}'s account and all associated platform data. This action cannot be undone.`;
    }

    return "";
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-5">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />

            <h2 className="text-lg font-semibold">User Management</h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Review accounts, manage access, and perform administrative profile
            actions.
          </p>
        </div>

        <Badge variant="outline" className="w-fit shrink-0">
          {total} {search ? "matching " : ""}
          user{total === 1 ? "" : "s"}
        </Badge>
      </div>

      {/* ======================================================
          TOOLBAR
      ====================================================== */}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value.trim());
            setPage(1);
          }}
          placeholder="Search by username or name..."
          className="w-full sm:min-w-[240px] sm:flex-1"
          debounce={220}
          shortcutKey="/"
        />

        <Select
          value={sortBy}
          onValueChange={(value) => {
            setSortBy(
              value as
                | "created_at"
                | "updated_at"
                | "username"
                | "display_name"
                | "is_blocked",
            );

            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[190px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="created_at">Sort: Joined</SelectItem>

            <SelectItem value="updated_at">Sort: Profile updated</SelectItem>

            <SelectItem value="username">Sort: Username</SelectItem>

            <SelectItem value="display_name">Sort: Display name</SelectItem>

            <SelectItem value="is_blocked">Sort: Access state</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortDirection}
          onValueChange={(value) => {
            setSortDirection(value as "asc" | "desc");

            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Order" />
          </SelectTrigger>

          <SelectContent>
            {sortBy === "created_at" || sortBy === "updated_at" ? (
              <>
                <SelectItem value="desc">Newest first</SelectItem>
                <SelectItem value="asc">Oldest first</SelectItem>
              </>
            ) : sortBy === "is_blocked" ? (
              <>
                <SelectItem value="desc">Blocked first</SelectItem>
                <SelectItem value="asc">Active first</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="asc">A–Z</SelectItem>
                <SelectItem value="desc">Z–A</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          className="w-full cursor-pointer sm:ml-auto sm:w-10 sm:px-0"
          aria-label="Refresh users"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />

          <span className="ml-2 sm:hidden">Refresh</span>
        </Button>
      </div>

      {/* ======================================================
          USERS TABLE
      ====================================================== */}

      <ResultsSummary
        page={page}
        total={total}
        limit={LIMIT}
        filtered={Boolean(search)}
        label="users"
      />

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>

              <TableHead>Access</TableHead>

              <TableHead>Joined</TableHead>

              <TableHead>Updated</TableHead>

              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((user) => {
                const displayName =
                  user.display_name || user.username || "Unnamed user";

                return (
                  <TableRow
                    key={user.id}
                    onClick={() => void handleOpenUser(user)}
                    className={`
                      cursor-pointer transition-colors hover:bg-muted/40
                      ${user.is_blocked ? "bg-destructive/[0.03]" : ""}
                    `}
                  >
                    {/* User */}
                    <TableCell>
                      <div className="flex min-w-[210px] items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0 border">
                          <AvatarImage src={user.avatar_url ?? undefined} />

                          <AvatarFallback>
                            {(user.username ?? "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {displayName}
                          </p>

                          {user.username && (
                            <p className="truncate text-xs text-muted-foreground">
                              @{user.username}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Access */}
                    <TableCell>
                      <div className="flex min-w-[120px] flex-wrap gap-1">
                        {user.staff_role === "owner" && (
                          <Badge className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600">
                            <CrownIcon className="h-3 w-3" />
                            Owner
                          </Badge>
                        )}

                        {user.staff_role === "moderator" && (
                          <Badge className="gap-1 border-blue-500/30 bg-blue-500/10 text-blue-600">
                            <Shield className="h-3 w-3" />
                            Moderator
                          </Badge>
                        )}

                        {user.is_blocked && (
                          <Badge
                            variant="destructive"
                            className="gap-1 text-xs"
                          >
                            <Ban className="h-3 w-3" />
                            Blocked
                          </Badge>
                        )}

                        {!user.staff_role && !user.is_blocked && (
                          <Badge variant="outline">Standard</Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Joined */}
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(user.created_at)}
                    </TableCell>

                    {/* Updated */}
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {user.updated_at ? formatDateTime(user.updated_at) : "—"}
                    </TableCell>

                    {/* View */}
                    <TableCell>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        total={total}
        limit={LIMIT}
        onPageChange={setPage}
      />

      {/* ======================================================
    USER DETAIL SHEET
====================================================== */}

      <Sheet
        open={!!selectedUser}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUser(null);
            setUserDetailLoading(false);
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-2xl lg:max-w-3xl"
        >
          <SheetHeader className="border-b px-5 pb-4 pt-6 sm:px-6">
            <SheetTitle>User Detail</SheetTitle>

            <SheetDescription>
              Account information, activity, access, and administrative actions.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1">
            {selectedUser && (
              <div className="space-y-6 p-5 sm:p-6">
                {/* ============================================
              PROFILE HERO
          ============================================ */}

                <div
                  className={`
    overflow-hidden rounded-2xl border
    ${
      selectedUser.is_blocked
        ? "border-destructive/30 bg-destructive/[0.04]"
        : selectedUser.staff_role === "owner"
          ? "border-amber-500/25 bg-amber-500/[0.04]"
          : selectedUser.staff_role === "moderator"
            ? "border-blue-500/25 bg-blue-500/[0.04]"
            : "bg-linear-to-br from-primary/[0.06] via-background to-background"
    }
  `}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <Avatar
                        className={`
    h-16 w-16 shrink-0 border-2 shadow-sm
    ${
      selectedUser.is_blocked
        ? "border-destructive/30"
        : selectedUser.staff_role === "owner"
          ? "border-amber-500/40"
          : selectedUser.staff_role === "moderator"
            ? "border-blue-500/40"
            : "border-primary/25"
    }
  `}
                      >
                        <AvatarImage
                          src={selectedUser.avatar_url ?? undefined}
                        />

                        <AvatarFallback className="text-lg">
                          {(selectedUser.username ?? "?")
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold">
                              {selectedUser.display_name ||
                                selectedUser.username ||
                                "Unnamed user"}
                            </h3>

                            {selectedUser.username && (
                              <p className="truncate text-sm text-muted-foreground">
                                @{selectedUser.username}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {selectedUser.staff_role === "owner" && (
                              <Badge className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600">
                                <CrownIcon className="h-3 w-3" />
                                Owner
                              </Badge>
                            )}

                            {selectedUser.staff_role === "moderator" && (
                              <Badge className="gap-1 border-blue-500/30 bg-blue-500/10 text-blue-600">
                                <Shield className="h-3 w-3" />
                                Moderator
                              </Badge>
                            )}

                            {selectedUser.is_blocked && (
                              <Badge variant="destructive" className="gap-1">
                                <Ban className="h-3 w-3" />
                                Blocked
                              </Badge>
                            )}

                            {!selectedUser.staff_role &&
                              !selectedUser.is_blocked && (
                                <Badge variant="outline" className="gap-1">
                                  <UserRound className="h-3 w-3" />
                                  Standard
                                </Badge>
                              )}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                          {selectedUser.username && (
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="w-full cursor-pointer sm:w-auto"
                            >
                              <a
                                href={`/profile/${selectedUser.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Public Profile
                              </a>
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              void handleCopyUserId(selectedUser.id)
                            }
                            className={`
    w-full cursor-pointer transition-all duration-300 sm:w-auto
    ${
      copiedUserId === selectedUser.id
        ? "border-green-500/30 bg-green-500/10 text-green-600 hover:bg-green-500/10 hover:text-green-600"
        : ""
    }
  `}
                          >
                            <span className="relative mr-2 flex h-4 w-4 items-center justify-center">
                              <Copy
                                className={`
        absolute h-4 w-4 transition-all duration-300
        ${
          copiedUserId === selectedUser.id
            ? "scale-50 opacity-0"
            : "scale-100 opacity-100"
        }
      `}
                              />

                              <CheckCircle
                                className={`
        absolute h-4 w-4 text-green-600 transition-all duration-300
        ${
          copiedUserId === selectedUser.id
            ? "scale-100 opacity-100"
            : "scale-50 opacity-0"
        }
      `}
                              />
                            </span>

                            <span className="transition-all duration-300">
                              {copiedUserId === selectedUser.id
                                ? "Copied!"
                                : "Copy User ID"}
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ============================================
              ACTIVITY SUMMARY
          ============================================ */}

                <section className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold">Platform Activity</p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Active content currently associated with this account.
                      Soft-deleted resources are excluded from these totals.
                    </p>
                  </div>

                  {userDetailLoading ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {Array.from({ length: 9 }).map((_, index) => (
                        <div key={index} className="rounded-xl border p-3">
                          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                          <div className="mt-2 h-7 w-10 animate-pulse rounded bg-muted" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {[
                          { label: "Bots", value: selectedUser.stats?.bots ?? 0, icon: Bot },
                          { label: "Forms", value: selectedUser.stats?.forms ?? 0, icon: FileText },
                          {
                            label: "Creator Pages",
                            value: selectedUser.stats?.creator_pages ?? 0,
                            icon: PanelsTopLeft,
                          },
                          {
                            label: "Submissions",
                            value: selectedUser.stats?.submissions ?? 0,
                            icon: Inbox,
                          },
                          { label: "Worlds", value: selectedUser.stats?.worlds ?? 0, icon: Globe2 },
                          {
                            label: "Lorebooks",
                            value: selectedUser.stats?.lorebooks ?? 0,
                            icon: BookOpen,
                          },
                          { label: "Entries", value: selectedUser.stats?.entries ?? 0, icon: LibraryBig },
                          {
                            label: "Collections",
                            value: selectedUser.stats?.collections ?? 0,
                            icon: Layers3,
                          },
                          { label: "Flags", value: selectedUser.stats?.flags ?? 0, icon: ShieldAlert },
                        ].map((stat) => {
                          const Icon = stat.icon;

                          return (
                            <div
                              key={stat.label}
                              className="min-w-0 rounded-xl border bg-muted/[0.06] p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium text-muted-foreground">
                                    {stat.label}
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
                                </div>

                                <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
                                  <Icon className="h-4 w-4" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {selectedUser.recent_activity &&
                        selectedUser.recent_activity.length > 0 && (
                          <div className="rounded-xl border bg-muted/[0.06]">
                            <div className="flex items-center gap-2 border-b px-3 py-2.5">
                              <Activity className="h-4 w-4 text-primary" />
                              <p className="text-xs font-semibold">
                                Recent resource activity
                              </p>
                            </div>

                            <div className="divide-y">
                              {selectedUser.recent_activity.slice(0, 5).map((activity) => (
                                <div
                                  key={`${activity.kind}-${activity.id}-${activity.at}`}
                                  className="flex min-w-0 items-center justify-between gap-3 px-3 py-2.5"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-medium">
                                      {activity.label}
                                    </p>
                                    <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                                      {activity.kind.replace("_", " ")}
                                      {activity.deleted ? " · deleted" : ""}
                                    </p>
                                  </div>

                                  <span className="shrink-0 text-[11px] text-muted-foreground">
                                    {formatDateTime(activity.at)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </>
                  )}
                </section>

                {/* ============================================
              ACCOUNT INFORMATION
          ============================================ */}

                <section className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold">Account Information</p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Basic identifiers and account timestamps.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border bg-muted/10 p-3 transition-colors hover:bg-muted/20">
                      <p className="text-xs text-muted-foreground">Joined</p>

                      <p className="mt-1 text-sm font-medium">
                        {formatDateTime(selectedUser.created_at)}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-muted/10 p-3 transition-colors hover:bg-muted/20">
                      <p className="text-xs text-muted-foreground">
                        Last Platform Activity
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {selectedUser.last_activity
                          ? formatDateTime(selectedUser.last_activity.at)
                          : "No activity"}
                      </p>

                      {selectedUser.last_activity && (
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                          {selectedUser.last_activity.kind.replace("_", " ")}
                          {" · "}
                          {selectedUser.last_activity.label}
                          {selectedUser.last_activity.deleted ? " · deleted" : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* User ID */}
                  <button
                    type="button"
                    onClick={() => void handleCopyUserId(selectedUser.id)}
                    className={`
    group flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left
    transition-all duration-300
    ${
      copiedUserId === selectedUser.id
        ? "border-green-500/30 bg-green-500/[0.06]"
        : "bg-muted/10 hover:border-primary/30 hover:bg-primary/[0.04]"
    }
  `}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">User ID</p>

                      <p className="mt-1 truncate font-mono text-xs">
                        {selectedUser.id}
                      </p>
                    </div>

                    <div
                      className={`
      relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
      transition-all duration-300
      ${
        copiedUserId === selectedUser.id
          ? "bg-green-500/10"
          : "bg-muted group-hover:bg-primary/10"
      }
    `}
                    >
                      <Copy
                        className={`
        absolute h-3.5 w-3.5 transition-all duration-300
        ${
          copiedUserId === selectedUser.id
            ? "scale-50 opacity-0"
            : "scale-100 opacity-100 text-muted-foreground group-hover:text-primary"
        }
      `}
                      />

                      <CheckCircle
                        className={`
        absolute h-4 w-4 text-green-600 transition-all duration-300
        ${
          copiedUserId === selectedUser.id
            ? "scale-100 opacity-100"
            : "scale-50 opacity-0"
        }
      `}
                      />
                    </div>
                  </button>
                </section>

                {/* ============================================
              ACCESS
          ============================================ */}

                <section className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Access & Permissions
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Control platform access and administrative privileges.
                    </p>
                  </div>

                  <div
                    className={`
    grid gap-3
    ${staffRole === "owner" ? "sm:grid-cols-2" : "grid-cols-1"}
  `}
                  >
                    {staffRole === "owner" &&
                      selectedUser.staff_role !== "owner" && (
                        <button
                          type="button"
                          onClick={() =>
                            openUserAction(
                              "staff-role",
                              selectedUser,
                              selectedUser.staff_role !== "moderator",
                            )
                          }
                          className={`
                  group flex min-h-24 cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-all
                  ${
                    selectedUser.staff_role === "moderator"
                      ? "border-blue-500/30 bg-blue-500/[0.06] hover:bg-blue-500/[0.1]"
                      : "hover:border-blue-500/30 hover:bg-blue-500/[0.04]"
                  }
                `}
                        >
                          <div className="rounded-lg bg-blue-500/10 p-2">
                            <Shield className="h-4 w-4 text-blue-500" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {selectedUser.staff_role === "moderator"
                                ? "Remove Moderator"
                                : "Grant Moderator"}
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {selectedUser.staff_role === "moderator"
                                ? "Remove moderator access to staff tools."
                                : "Give this account moderator access to staff tools."}
                            </p>
                          </div>
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={() =>
                        openUserAction(
                          "block",
                          selectedUser,
                          !selectedUser.is_blocked,
                        )
                      }
                      disabled={
                        staffRole === "moderator" &&
                        (selectedUser.staff_role === "owner" ||
                          selectedUser.staff_role === "moderator")
                      }
                      className={`
    group flex min-h-24 w-full cursor-pointer items-start gap-3
    rounded-xl border p-4 text-left transition-all
    disabled:cursor-not-allowed disabled:opacity-50
    ${
      selectedUser.is_blocked
        ? "border-green-500/30 bg-green-500/[0.05] hover:bg-green-500/[0.09]"
        : "hover:border-destructive/30 hover:bg-destructive/[0.04]"
    }
  `}
                    >
                      <div
                        className={`
      rounded-lg p-2
      ${selectedUser.is_blocked ? "bg-green-500/10" : "bg-destructive/10"}
    `}
                      >
                        {selectedUser.is_blocked ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Ban className="h-4 w-4 text-destructive" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {selectedUser.is_blocked
                            ? "Unblock User"
                            : "Block User"}
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {selectedUser.is_blocked
                            ? "Restore access to the platform."
                            : "Prevent this account from accessing the platform."}
                        </p>

                        {staffRole === "moderator" &&
                          selectedUser.staff_role && (
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              Staff accounts can only be managed by the Owner.
                            </p>
                          )}
                      </div>
                    </button>
                  </div>
                </section>

                {/* ============================================
              PROFILE MAINTENANCE
          ============================================ */}

                {staffRole === "owner" && (
                  <section className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold">
                        Profile Maintenance
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Correct public-facing profile information and login
                        access.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          openUserAction("reset-name", selectedUser)
                        }
                        className="h-auto min-h-14 w-full cursor-pointer justify-start px-4 py-3"
                      >
                        <RotateCcw className="mr-3 h-4 w-4 shrink-0 text-blue-500" />

                        <div className="text-left">
                          <p className="text-sm font-medium">
                            Reset Display Name
                          </p>

                          <p className="text-xs font-normal text-muted-foreground">
                            Restore it to the username.
                          </p>
                        </div>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          openUserAction("clear-avatar", selectedUser)
                        }
                        className="h-auto min-h-14 w-full cursor-pointer justify-start px-4 py-3"
                      >
                        <ImageOff className="mr-3 h-4 w-4 shrink-0 text-orange-500" />

                        <div className="text-left">
                          <p className="text-sm font-medium">Clear Avatar</p>

                          <p className="text-xs font-normal text-muted-foreground">
                            Remove the current profile image.
                          </p>
                        </div>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          openUserAction("reset-pin", selectedUser)
                        }
                        className="h-auto min-h-14 w-full cursor-pointer justify-start px-4 py-3 sm:col-span-2"
                      >
                        <KeyRound className="mr-3 h-4 w-4 shrink-0 text-primary" />

                        <div className="text-left">
                          <p className="text-sm font-medium">
                            Change Account PIN
                          </p>

                          <p className="text-xs font-normal text-muted-foreground">
                            Assign a new 4-digit login PIN.
                          </p>
                        </div>
                      </Button>
                    </div>
                  </section>
                )}

                {/* ============================================
              DANGER ZONE
          ============================================ */}

                {staffRole === "owner" && (
                  <section className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/[0.05]">
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-destructive/10 p-2">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-destructive">
                            Danger Zone
                          </p>

                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            Permanently deleting this account removes the user
                            and their associated platform data. This action
                            cannot be undone.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-destructive/20 p-3">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => openUserAction("delete", selectedUser)}
                        className="w-full cursor-pointer"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Permanently Delete Account
                      </Button>
                    </div>
                  </section>
                )}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ======================================================
          ACTION CONFIRMATION
      ====================================================== */}

      <AlertDialog
        open={!!pendingAction}
        onOpenChange={(open) => {
          if (!open && !actionLoading) {
            setPendingAction(null);
            setPinDraft("");
            setPinConfirmDraft("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle()}</AlertDialogTitle>

            <AlertDialogDescription>
              {dialogDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingAction?.type === "reset-pin" && (
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">New PIN</label>

                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="4-digit PIN"
                  value={pinDraft}
                  disabled={actionLoading}
                  onChange={(event) =>
                    setPinDraft(event.target.value.replace(/\D/g, ""))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm PIN</label>

                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Repeat PIN"
                  value={pinConfirmDraft}
                  disabled={actionLoading}
                  onChange={(event) =>
                    setPinConfirmDraft(event.target.value.replace(/\D/g, ""))
                  }
                />
              </div>
            </div>
          )}

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={actionLoading}
              className="w-full cursor-pointer sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              type="button"
              disabled={actionLoading}
              onClick={(event) => {
                event.preventDefault();
                void confirmAction();
              }}
              className={`w-full cursor-pointer sm:w-auto ${
                pendingAction?.type === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }`}
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Working...
                </>
              ) : pendingAction?.type === "delete" ? (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Main AdminPanel Component
// ============================================================================

export function AdminPanel() {
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);

  const [accessLoading, setAccessLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (typeof window === "undefined") return "overview";

    const savedTab = window.localStorage.getItem(ADMIN_TAB_STORAGE_KEY);
    if (savedTab && isAdminTab(savedTab)) {
      return savedTab;
    }

    return "overview";
  });
  const [openSubmissionId, setOpenSubmissionId] = useState<string | null>(null);

  const handleNavigateToSubmission = (id: string) => {
    setActiveTab("submissions");
    setOpenSubmissionId(id);
  };

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const result = await getStaffAccess();

        if (!mounted) {
          return;
        }

        setStaffRole(result.success ? result.role : null);
      } finally {
        if (mounted) {
          setAccessLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADMIN_TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (staffRole === "moderator" && activeTab === "badges") {
      setActiveTab("overview");
    }
  }, [staffRole, activeTab]);

  if (accessLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!staffRole) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  const tabs: Array<{
    id: AdminTab;
    label: string;
    icon: typeof BarChart3;
    color: string;
    style?: string;
    roles: StaffRole[];
  }> = [
    {
      id: "overview",
      label: "Overview",
      icon: BarChart3,
      color: "text-primary",
      style: "border-primary text-primary",
      roles: ["owner", "moderator"],
    },
    {
      id: "submissions",
      label: "Submissions",
      icon: Inbox,
      color: "text-blue-500",
      style: "border-blue-500 text-blue-500",
      roles: ["owner", "moderator"],
    },
    {
      id: "forms",
      label: "Forms",
      icon: FileText,
      color: "text-muted-foreground",
      style: "border-muted-foreground text-muted-foreground",
      roles: ["owner", "moderator"],
    },
    {
      id: "bots",
      label: "Bots",
      icon: Bot,
      color: "text-green-500",
      style: "border-green-500 text-green-500",
      roles: ["owner", "moderator"],
    },
    {
      id: "badges",
      label: "Badges",
      icon: Award,
      color: "text-amber-500",
      style: "border-amber-500 text-amber-500",
      roles: ["owner"],
    },
    {
      id: "users",
      label: "Users",
      icon: UsersRound,
      color: "text-primary",
      style: "border-primary text-primary",
      roles: ["owner", "moderator"],
    },
    {
      id: "moderation",
      label: "Moderation",
      icon: Shield,
      color: "text-orange-500",
      style: "border-orange-500 text-orange-500",
      roles: ["owner", "moderator"],
    },
  ];

  const visibleTabs = tabs.filter((tab) =>
    staffRole ? tab.roles.includes(staffRole) : false,
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Staff Panel
        </h1>

        <Badge
          variant="outline"
          className={
            staffRole === "owner"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
              : "border-blue-500/30 bg-blue-500/10 text-blue-600"
          }
        >
          {staffRole === "owner" ? "Owner" : "Moderator"}
        </Badge>
      </div>

      <p className="mt-1 text-sm text-muted-foreground sm:text-base">
        {staffRole === "owner"
          ? "Full platform management, moderation, and configuration."
          : "Platform moderation and content review tools."}
      </p>

      {/* Admin navigation */}
      <div className="mb-6 border-b border-border">
        <div className="flex min-w-0 gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? `${tab.style}`
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${tab.color}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab
          onNavigateToSubmission={handleNavigateToSubmission}
          onNavigateToTab={setActiveTab}
        />
      )}
      {activeTab === "submissions" && (
        <SubmissionsTab
          staffRole={staffRole}
          openId={openSubmissionId}
          onClearOpenId={() => setOpenSubmissionId(null)}
        />
      )}
      {activeTab === "forms" && <FormsTab staffRole={staffRole} />}
      {activeTab === "bots" && <BotsTab staffRole={staffRole} />}
      {activeTab === "badges" && staffRole === "owner" && <BadgeAdminTab />}
      {activeTab === "users" && <UsersTab staffRole={staffRole} />}
      {activeTab === "moderation" && (
        <ModerationAdminTab staffRole={staffRole} />
      )}
    </div>
  );
}
