"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CommunitySubmissionDialog } from "../community/components/community-submission-dialog";
import { CommunityReviewDialog } from "../community/components/community-review-dialog";
import type { CommunitySubmissionType } from "@/features/hub/community/actions/community";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Archive,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CircleDot,
  ArrowLeft,
  Flag,
  Info,
  Layers3,
  MessageCircle,
  ClipboardCheck,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CommunityCategory =
  | "moderation"
  | "creator_concern"
  | "platform_change"
  | "policy"
  | "safety_privacy"
  | "bug_reliability"
  | "community_update"
  | "other";

type CommunityStatus =
  | "open"
  | "developing"
  | "acknowledged"
  | "resolved"
  | "partially_resolved"
  | "unresolved"
  | "archived";

type CommunityEvidenceStatus =
  | "reported"
  | "corroborated"
  | "official_response"
  | "confirmed";

type CommunityImpact = "low" | "moderate" | "high";
type CommunityDatePrecision = "date" | "datetime";

type CommunityContributor = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type CommunityRecordRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string | null;
  category: CommunityCategory;
  status: CommunityStatus;
  evidence_status: CommunityEvidenceStatus;
  impact: CommunityImpact | null;
  status_note: string | null;
  evidence_note: string | null;
  occurred_at: string | null;
  occurred_at_precision: CommunityDatePrecision;
  content_warning: string | null;
  is_featured: boolean;
  featured_order: number;
  is_published: boolean;
  published_at: string | null;
  contributor_user_id: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
  contributor: CommunityContributor | null;
};

type CategoryMeta = {
  value: CommunityCategory;
  label: string;
  shortLabel: string;
  icon: typeof Archive;

  toneClassName: string;

  accentColor: string;
  hoverBackground: string;
  activeBackground: string;
};

const CATEGORY_OPTIONS: CategoryMeta[] = [
  {
    value: "moderation",
    label: "Moderation",
    shortLabel: "Moderation",
    icon: ShieldCheck,

    toneClassName: "bg-orange-500/10 text-orange-600 dark:text-orange-400",

    accentColor: "#f97316",
    hoverBackground: "rgba(249, 115, 22, 0.08)",
    activeBackground: "rgba(249, 115, 22, 0.12)",
  },

  {
    value: "creator_concern",
    label: "Creator Concerns",
    shortLabel: "Creators",
    icon: UserRound,

    toneClassName: "bg-pink-500/10 text-pink-600 dark:text-pink-400",

    accentColor: "#ec4899",
    hoverBackground: "rgba(236, 72, 153, 0.08)",
    activeBackground: "rgba(236, 72, 153, 0.12)",
  },

  {
    value: "platform_change",
    label: "Platform Changes",
    shortLabel: "Platform",
    icon: Layers3,

    toneClassName: "bg-blue-500/10 text-blue-600 dark:text-blue-400",

    accentColor: "#3b82f6",
    hoverBackground: "rgba(59, 130, 246, 0.08)",
    activeBackground: "rgba(59, 130, 246, 0.12)",
  },

  {
    value: "policy",
    label: "Policy",
    shortLabel: "Policy",
    icon: BookOpen,

    toneClassName: "bg-violet-500/10 text-violet-600 dark:text-violet-400",

    accentColor: "#8b5cf6",
    hoverBackground: "rgba(139, 92, 246, 0.08)",
    activeBackground: "rgba(139, 92, 246, 0.12)",
  },

  {
    value: "safety_privacy",
    label: "Safety & Privacy",
    shortLabel: "Safety",
    icon: ShieldCheck,

    toneClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",

    accentColor: "#10b981",
    hoverBackground: "rgba(16, 185, 129, 0.08)",
    activeBackground: "rgba(16, 185, 129, 0.12)",
  },

  {
    value: "bug_reliability",
    label: "Bugs & Reliability",
    shortLabel: "Reliability",
    icon: CircleDot,

    toneClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",

    accentColor: "#f59e0b",
    hoverBackground: "rgba(245, 158, 11, 0.08)",
    activeBackground: "rgba(245, 158, 11, 0.12)",
  },

  {
    value: "community_update",
    label: "Community Updates",
    shortLabel: "Updates",
    icon: Sparkles,

    toneClassName: "bg-primary/10 text-primary",

    accentColor: "#a855f7",
    hoverBackground: "rgba(168, 85, 247, 0.08)",
    activeBackground: "rgba(168, 85, 247, 0.12)",
  },

  {
    value: "other",
    label: "Other",
    shortLabel: "Other",
    icon: Archive,

    toneClassName: "bg-muted text-muted-foreground",

    accentColor: "#94a3b8",
    hoverBackground: "rgba(148, 163, 184, 0.08)",
    activeBackground: "rgba(148, 163, 184, 0.12)",
  },
];

const CATEGORY_MAP = Object.fromEntries(
  CATEGORY_OPTIONS.map((category) => [category.value, category]),
) as Record<CommunityCategory, CategoryMeta>;

const STATUS_LABELS: Record<CommunityStatus, string> = {
  open: "Open",
  developing: "Developing",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
  partially_resolved: "Partially resolved",
  unresolved: "Unresolved",
  archived: "Archived",
};

const EVIDENCE_LABELS: Record<CommunityEvidenceStatus, string> = {
  reported: "Reported",
  corroborated: "Corroborated",
  official_response: "Official response",
  confirmed: "Confirmed",
};

const IMPACT_LABELS: Record<CommunityImpact, string> = {
  low: "Low impact",
  moderate: "Moderate impact",
  high: "High impact",
};

function formatDate(
  value: string | null,
  precision: CommunityDatePrecision = "datetime",
) {
  if (!value) return null;

  if (precision === "date") {
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!match) return null;

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
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getContributorName(record: CommunityRecordRow) {
  return (
    record.contributor?.display_name || record.contributor?.username || null
  );
}

function getStatusBadgeClass(status: CommunityStatus) {
  switch (status) {
    case "resolved":
      return "border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300";
    case "partially_resolved":
      return "border-sky-500/25 bg-sky-500/8 text-sky-700 dark:text-sky-300";
    case "acknowledged":
      return "border-blue-500/25 bg-blue-500/8 text-blue-700 dark:text-blue-300";
    case "developing":
      return "border-amber-500/25 bg-amber-500/8 text-amber-700 dark:text-amber-300";
    case "unresolved":
      return "border-orange-500/25 bg-orange-500/8 text-orange-700 dark:text-orange-300";
    case "archived":
      return "border-border/70 bg-muted/45 text-muted-foreground";
    case "open":
    default:
      return "border-primary/25 bg-primary/8 text-primary";
  }
}

function getEvidenceBadgeClass(status: CommunityEvidenceStatus) {
  switch (status) {
    case "confirmed":
      return "border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300";
    case "official_response":
      return "border-blue-500/25 bg-blue-500/8 text-blue-700 dark:text-blue-300";
    case "corroborated":
      return "border-violet-500/25 bg-violet-500/8 text-violet-700 dark:text-violet-300";
    case "reported":
    default:
      return "border-border/70 bg-muted/35 text-muted-foreground";
  }
}

export function CommunityHub() {
  const [records, setRecords] = useState<CommunityRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    CommunityCategory | "all"
  >("all");
  const [statusFilter, setStatusFilter] = useState<CommunityStatus | "all">(
    "all",
  );
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>(
    {},
  );
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {},
  );
  const [myHelpful, setMyHelpful] = useState<Record<string, boolean>>({});
  const [updatingHelpfulIds, setUpdatingHelpfulIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [helpfulAnimations, setHelpfulAnimations] = useState<
    Record<string, "liked" | "unliked" | null>
  >({});

  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [submissionMode, setSubmissionMode] =
    useState<CommunitySubmissionType>("record_create");
  const [submissionRecord, setSubmissionRecord] =
    useState<CommunityRecordRow | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [staffCreateOpen, setStaffCreateOpen] = useState(false);

  const openSubmissionDialog = (
    mode: CommunitySubmissionType,
    record: CommunityRecordRow | null = null,
  ) => {
    setSubmissionMode(mode);
    setSubmissionRecord(record);
    setSubmissionOpen(true);
  };

  const loadMetrics = useCallback(
    async (recordIds: string[], userId: string | null) => {
      if (recordIds.length === 0) {
        setHelpfulCounts({});
        setCommentCounts({});
        setMyHelpful({});
        return;
      }

      const supabase = createClient();

      const [helpfulResult, commentsResult, mineResult] = await Promise.all([
        supabase
          .from("hub_community_record_helpful")
          .select("record_id")
          .in("record_id", recordIds),
        supabase
          .from("hub_community_record_comments")
          .select("record_id")
          .in("record_id", recordIds)
          .is("deleted_at", null),
        userId
          ? supabase
              .from("hub_community_record_helpful")
              .select("record_id")
              .eq("user_id", userId)
              .in("record_id", recordIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const nextHelpfulCounts: Record<string, number> = {};
      const nextCommentCounts: Record<string, number> = {};
      const nextMyHelpful: Record<string, boolean> = {};

      for (const id of recordIds) {
        nextHelpfulCounts[id] = 0;
        nextCommentCounts[id] = 0;
        nextMyHelpful[id] = false;
      }

      if (!helpfulResult.error) {
        for (const row of helpfulResult.data || []) {
          nextHelpfulCounts[row.record_id] =
            (nextHelpfulCounts[row.record_id] || 0) + 1;
        }
      }

      if (!commentsResult.error) {
        for (const row of commentsResult.data || []) {
          nextCommentCounts[row.record_id] =
            (nextCommentCounts[row.record_id] || 0) + 1;
        }
      }

      if (!mineResult.error) {
        for (const row of mineResult.data || []) {
          nextMyHelpful[row.record_id] = true;
        }
      }

      setHelpfulCounts(nextHelpfulCounts);
      setCommentCounts(nextCommentCounts);
      setMyHelpful(nextMyHelpful);
    },
    [],
  );

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const supabase = createClient();
      const access = await getCurrentUserAccess(supabase);

      setIsStaff(access.isStaff);
      setAuthUserId(access.user?.id || null);

      if (access.isStaff) {
        const { count, error: pendingCountError } = await supabase
          .from("hub_community_submissions")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("review_status", "pending");

        if (pendingCountError) {
          console.error(
            "Failed to load Community pending review count:",
            pendingCountError,
          );
          setPendingReviewCount(0);
        } else {
          setPendingReviewCount(count || 0);
        }
      } else {
        setPendingReviewCount(0);
      }

      let query = supabase
        .from("hub_community_records")
        .select(
          `
            id,
            slug,
            title,
            summary,
            content,
            category,
            status,
            evidence_status,
            impact,
            status_note,
            evidence_note,
            occurred_at,
            occurred_at_precision,
            content_warning,
            is_featured,
            featured_order,
            is_published,
            published_at,
            contributor_user_id,
            revision,
            created_at,
            updated_at,
            contributor:profiles!hub_community_records_contributor_user_id_fkey(
              username,
              display_name,
              avatar_url
            )
          `,
        )
        .order("is_featured", { ascending: false })
        .order("featured_order", { ascending: true })
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (!access.isStaff) {
        query = query.eq("is_published", true);
      }

      const { data, error } = await query;
      if (error) throw error;

      const normalizedRecords = (data || []).map((row: any) => ({
        ...row,
        contributor: Array.isArray(row.contributor)
          ? (row.contributor[0] ?? null)
          : row.contributor,
      })) as CommunityRecordRow[];

      setRecords(normalizedRecords);

      await loadMetrics(
        normalizedRecords.map((record) => record.id),
        access.user?.id || null,
      );
    } catch (error: any) {
      console.error("Failed to load Community V2:", error);
      setRecords([]);
      toast.error(error.message || "Failed to load Community");
    } finally {
      setLoading(false);
    }
  }, [loadMetrics]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleHelpful = useCallback(
    async (recordId: string) => {
      if (!authUserId) {
        toast.error("Sign in to mark a record as helpful.");
        return;
      }

      if (updatingHelpfulIds.has(recordId)) {
        return;
      }

      setUpdatingHelpfulIds((current) => {
        const next = new Set(current);
        next.add(recordId);
        return next;
      });

      try {
        const supabase = createClient();

        const currentlyHelpful = myHelpful[recordId] || false;
        const nextHelpful = !currentlyHelpful;

        if (currentlyHelpful) {
          const { error } = await supabase
            .from("hub_community_record_helpful")
            .delete()
            .eq("record_id", recordId)
            .eq("user_id", authUserId);

          if (error) {
            throw error;
          }
        } else {
          const { error } = await supabase
            .from("hub_community_record_helpful")
            .insert({
              record_id: recordId,
              user_id: authUserId,
            });

          if (error) {
            throw error;
          }
        }

        setHelpfulAnimations((current) => ({
          ...current,
          [recordId]: nextHelpful ? "liked" : "unliked",
        }));

        window.setTimeout(() => {
          setHelpfulAnimations((current) => ({
            ...current,
            [recordId]: null,
          }));
        }, 700);

        await loadMetrics(
          records.map((record) => record.id),
          authUserId,
        );
      } catch (error: any) {
        toast.error(error.message || "Could not update Helpful.");
      } finally {
        setUpdatingHelpfulIds((current) => {
          const next = new Set(current);
          next.delete(recordId);
          return next;
        });
      }
    },
    [authUserId, loadMetrics, myHelpful, records, updatingHelpfulIds],
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (categoryFilter !== "all" && record.category !== categoryFilter) {
        return false;
      }

      if (statusFilter !== "all" && record.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) return true;

      const searchable = [
        record.title,
        record.summary,
        record.content,
        record.status_note,
        record.evidence_note,
        CATEGORY_MAP[record.category].label,
        STATUS_LABELS[record.status],
        EVIDENCE_LABELS[record.evidence_status],
        record.contributor?.username,
        record.contributor?.display_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [records, categoryFilter, statusFilter, normalizedSearch]);

  const featuredRecords = useMemo(
    () =>
      filteredRecords
        .filter((record) => record.is_featured)
        .sort((a, b) => {
          if (a.featured_order !== b.featured_order) {
            return a.featured_order - b.featured_order;
          }

          return (
            new Date(b.published_at || b.created_at).getTime() -
            new Date(a.published_at || a.created_at).getTime()
          );
        }),
    [filteredRecords],
  );

  const recentRecords = useMemo(
    () =>
      filteredRecords
        .filter((record) => !record.is_featured)
        .sort((a, b) => {
          const aDate = a.occurred_at || a.published_at || a.created_at;
          const bDate = b.occurred_at || b.published_at || b.created_at;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        }),
    [filteredRecords],
  );

  const activeCount = useMemo(
    () =>
      records.filter(
        (record) =>
          record.status !== "resolved" && record.status !== "archived",
      ).length,
    [records],
  );

  const resolvedCount = useMemo(
    () => records.filter((record) => record.status === "resolved").length,
    [records],
  );

  const categoryCount = useMemo(
    () => new Set(records.map((record) => record.category)).size,
    [records],
  );

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  const hasFilters =
    normalizedSearch.length > 0 ||
    categoryFilter !== "all" ||
    statusFilter !== "all";

  const renderRecordCard = (record: CommunityRecordRow, featured = false) => {
    const category = CATEGORY_MAP[record.category];
    const CategoryIcon = category.icon;
    const contributorName = getContributorName(record);
    const date =
      formatDate(record.occurred_at) ||
      formatDate(record.published_at) ||
      formatDate(record.created_at);

    const isOwner = !!authUserId && record.contributor_user_id === authUserId;

    return (
      <article
        key={record.id}
        className={cn(
          "group relative flex h-full min-w-0 flex-col overflow-hidden rounded-3xl",
          "border border-border/70 bg-card/90 shadow-md shadow-black/[0.04]",
          "backdrop-blur supports-backdrop-filter:bg-card/75",
          "transition-all duration-300",
          "hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/[0.07]",
          featured &&
            "border-primary/20 bg-linear-to-br from-primary/[0.055] via-card/95 to-card/90",
        )}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/[0.045] blur-3xl transition-all duration-500 group-hover:bg-primary/[0.09]" />

        {featured && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/55 to-transparent" />
        )}

        <Link
          href={`/community/${record.slug}`}
          className="relative z-10 flex min-w-0 flex-1 cursor-pointer flex-col p-4 text-left sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/50",
                  category.toneClassName,
                )}
              >
                <CategoryIcon className="h-4.5 w-4.5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {category.label}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      getStatusBadgeClass(record.status),
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                    {STATUS_LABELS[record.status]}
                  </span>

                  {featured && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary">
                      <Sparkles className="h-3 w-3" />
                      Featured
                    </span>
                  )}

                  {isOwner && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/35 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <UserRound className="h-3 w-3" />
                      Your record
                    </span>
                  )}

                  {isStaff && !record.is_published && (
                    <span className="inline-flex rounded-full border border-border/60 bg-muted/35 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Draft
                    </span>
                  )}
                </div>
              </div>
            </div>

            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
          </div>

          <div className="mt-5 flex-1">
            <h3
              title={record.title}
              className={cn(
                "line-clamp-2 text-balance font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary",
                featured ? "text-xl sm:text-[1.4rem]" : "text-[1.05rem]",
              )}
            >
              {record.title}
            </h3>

            <p
              className={cn(
                "mt-2.5 text-sm leading-6 text-muted-foreground",
                featured ? "line-clamp-4" : "line-clamp-3",
              )}
            >
              {record.summary ||
                "No summary has been added to this record yet."}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium",
                getEvidenceBadgeClass(record.evidence_status),
              )}
            >
              <ShieldCheck className="h-3 w-3" />
              {EVIDENCE_LABELS[record.evidence_status]}
            </span>

            {record.impact && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[10px] text-muted-foreground">
                <Flag className="h-3 w-3" />
                {IMPACT_LABELS[record.impact]}
              </span>
            )}
          </div>

          <div className="mt-5 flex min-w-0 flex-col items-start gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
              {date && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {date}
                </span>
              )}

              {contributorName && (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5 shrink-0" />
                  <span className="max-w-36 truncate">{contributorName}</span>
                </span>
              )}
            </div>

            <span className="shrink-0 text-[10px] text-muted-foreground">
              Rev. {record.revision}
            </span>
          </div>
        </Link>

        <div className="relative z-20 flex min-w-0 flex-wrap items-center gap-2 border-t border-border/45 bg-muted/[0.12] px-4 py-3 sm:px-6">
          <div className="relative isolate">
            {helpfulAnimations[record.id] === "liked" && (
              <div
                aria-hidden="true"
                className="helpful-card-celebration pointer-events-none absolute inset-0 z-0"
              >
                <span className="helpful-card-ring" />

                <span className="helpful-card-particle helpful-card-particle-1" />
                <span className="helpful-card-particle helpful-card-particle-2" />
                <span className="helpful-card-particle helpful-card-particle-3" />
                <span className="helpful-card-particle helpful-card-particle-4" />
              </div>
            )}

            <Button
              type="button"
              size="sm"
              variant={myHelpful[record.id] ? "secondary" : "ghost"}
              disabled={updatingHelpfulIds.has(record.id)}
              className={cn(
                "group/helpful-card relative z-10 h-8 cursor-pointer overflow-hidden rounded-full px-3 text-xs",
                "transition-[background-color,color,box-shadow,transform] duration-300",
                "active:scale-[0.96]",
                myHelpful[record.id] &&
                  "bg-primary/10 text-primary shadow-sm shadow-primary/10 hover:bg-primary/15",
                helpfulAnimations[record.id] === "liked" &&
                  "helpful-card-button-liked",
                helpfulAnimations[record.id] === "unliked" &&
                  "helpful-card-button-unliked",
              )}
              onClick={() => toggleHelpful(record.id)}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "helpful-shimmer absolute inset-0 -z-10 opacity-0",
                  helpfulAnimations[record.id] === "liked" &&
                    "helpful-shimmer-active",
                )}
              />

              <span className="relative flex h-4 w-4 items-center justify-center">
                <ThumbsUp
                  className={cn(
                    "absolute h-3.5 w-3.5 transition-[transform,fill] duration-300",
                    myHelpful[record.id] && "fill-current",
                    helpfulAnimations[record.id] === "liked" &&
                      "helpful-icon-liked",
                    helpfulAnimations[record.id] === "unliked" &&
                      "helpful-icon-unliked",
                  )}
                />
              </span>

              <span className="ml-1.5 tabular-nums opacity-70">
                {helpfulCounts[record.id] || 0}
              </span>
            </Button>
          </div>

          <div className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" />

            <span className="tabular-nums">
              {commentCounts[record.id] || 0}
            </span>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="min-w-0 overflow-x-clip p-3 sm:p-6 md:p-8 lg:p-10">
      <div className="mx-auto w-full min-w-0 max-w-[92rem] space-y-8">
        <Link
          href="/"
          onClick={() => {
            localStorage.setItem("currentView", "dashboard");
          }}
          className="group inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to dashboard
        </Link>

        <section className="community-hero group/hero relative isolate overflow-hidden rounded-[2rem] border border-border/70 bg-linear-to-br from-background via-background/95 to-primary/[0.06] shadow-[0_28px_90px_-42px_rgba(0,0,0,0.4)] dark:shadow-primary/10">
          <div className="community-orb community-orb-a" />
          <div className="community-orb community-orb-b" />

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(255,255,255,0.12),transparent_24%),radial-gradient(circle_at_88%_18%,rgba(139,92,246,0.10),transparent_28%),linear-gradient(to_bottom_right,transparent_35%,rgba(59,130,246,0.035))]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.32] [background-image:linear-gradient(rgba(127,127,127,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(127,127,127,0.08)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_right,transparent,black_52%,black)]" />

          <div className="relative z-10 grid min-h-[27rem] items-center gap-10 px-6 py-9 sm:px-9 sm:py-10 xl:grid-cols-[minmax(0,1.06fr)_minmax(21rem,0.94fr)] xl:px-11 xl:py-12">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.09] px-3 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur-xl">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Community Archive
              </div>

              <h1 className="mt-5 max-w-2xl text-balance text-3xl font-bold tracking-[-0.045em] sm:text-5xl xl:text-[3.35rem] xl:leading-[1.02]">
                Keep the context.
                <span className="bg-linear-to-r from-primary via-violet-400 to-blue-400 bg-clip-text text-transparent">
                  {" "}
                  Not just the post.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                Reports, creator concerns, platform updates, and key discussions
                across character platforms — organized with sources, evidence,
                and follow-ups instead of disappearing into a feed.
              </p>

              <div className="relative mt-7 max-w-xl">
                <div className="pointer-events-none absolute inset-0 rounded-full bg-primary/10 opacity-0 blur-xl transition-opacity duration-300 focus-within:opacity-100" />
                <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search records, topics, creators..."
                  className="relative h-12 rounded-full border-border/70 bg-background/80 pl-11 pr-5 shadow-md backdrop-blur-xl transition-all duration-300 hover:border-primary/25 hover:bg-background/90 focus-visible:border-primary/35 focus-visible:shadow-lg"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {authUserId && !isStaff && (
                  <Button
                    type="button"
                    size="sm"
                    className="cursor-pointer rounded-full px-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md w-full justify-center sm:w-auto"
                    onClick={() => openSubmissionDialog("record_create")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Submit a record
                  </Button>
                )}

                {isStaff && (
                  <Button
                    type="button"
                    size="sm"
                    className="cursor-pointer rounded-full px-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md w-full justify-center sm:w-auto"
                    onClick={() => setStaffCreateOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create record
                  </Button>
                )}

                {isStaff && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer rounded-full bg-background/60 px-4 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/[0.045] w-full justify-center sm:w-auto"
                    onClick={() => setReviewOpen(true)}
                  >
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Review submissions
                    {pendingReviewCount > 0 && (
                      <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                        {pendingReviewCount}
                      </span>
                    )}
                  </Button>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full border border-border/55 bg-background/45 px-2.5 py-1 backdrop-blur">
                  {records.length} records
                </span>
                <span className="rounded-full border border-border/55 bg-background/45 px-2.5 py-1 backdrop-blur">
                  {activeCount} active
                </span>
                <span className="rounded-full border border-border/55 bg-background/45 px-2.5 py-1 backdrop-blur">
                  {resolvedCount} resolved
                </span>
                {categoryCount > 0 && (
                  <span className="rounded-full border border-border/55 bg-background/45 px-2.5 py-1 backdrop-blur">
                    {categoryCount} categories
                  </span>
                )}
              </div>
            </div>

            <div className="relative hidden min-h-[20rem] xl:block">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.08] blur-3xl transition-transform duration-700 group-hover/hero:scale-110" />

              <button
                type="button"
                onClick={() => setCategoryFilter("moderation")}
                className="group/card absolute left-[3%] top-[5%] w-[78%] cursor-pointer rounded-3xl border border-border/60 bg-card/70 p-5 text-left shadow-[0_20px_55px_-26px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:rotate-0 hover:border-orange-500/30 hover:bg-card/90 hover:shadow-xl"
                style={{ transform: "rotate(-2deg)" }}
                aria-label="Browse moderation records"
              >
                <div className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-orange-400/50 to-transparent opacity-0 transition-opacity group-hover/card:opacity-100" />

                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 ring-1 ring-orange-500/10 transition-transform duration-300 group-hover/card:scale-105">
                      <ShieldCheck className="h-4.5 w-4.5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500/90">
                        Moderation
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold">
                        Community record
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border border-amber-500/20 bg-amber-500/[0.08] px-2.5 py-1 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                    Developing
                  </span>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="h-2 w-[88%] rounded-full bg-muted/80 transition-all duration-500 group-hover/card:w-[92%]" />
                  <div className="h-2 w-[67%] rounded-full bg-muted/55 transition-all duration-500 group-hover/card:w-[72%]" />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-violet-500/15 bg-violet-500/[0.06] px-2.5 py-1 text-[9px] text-violet-600 dark:text-violet-300">
                    Corroborated
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/55 px-2.5 py-1 text-[9px] text-muted-foreground">
                    4 sources
                  </span>

                  <span className="ml-auto flex items-center gap-1 text-[9px] font-medium text-muted-foreground transition-colors group-hover/card:text-foreground">
                    Open archive
                    <ArrowRight className="h-3 w-3 transition-transform group-hover/card:translate-x-0.5" />
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("developing")}
                className="group/timeline absolute bottom-[2%] right-[1%] w-[67%] cursor-pointer rounded-2xl border border-blue-500/15 bg-card/75 p-4 text-left shadow-[0_18px_45px_-24px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-card/95 hover:shadow-xl"
                style={{ transform: "rotate(2deg)" }}
                aria-label="Browse developing records"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-blue-500">
                    <Layers3 className="h-4 w-4" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em]">
                      Follow the timeline
                    </span>
                  </div>

                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover/timeline:translate-x-1 group-hover/timeline:text-blue-500" />
                </div>

                <div className="relative mt-4 space-y-3">
                  <div className="absolute bottom-1 left-[3px] top-1 w-px bg-linear-to-b from-primary/60 via-blue-400/45 to-emerald-400/35" />

                  <div className="relative flex items-center gap-3 pl-0">
                    <span className="z-10 h-2 w-2 shrink-0 rounded-full bg-primary ring-4 ring-primary/10" />
                    <div className="flex-1">
                      <div className="h-1.5 w-[78%] rounded-full bg-muted/75" />
                    </div>
                    <span className="text-[8px] text-muted-foreground">
                      Report
                    </span>
                  </div>

                  <div className="relative flex items-center gap-3">
                    <span className="z-10 h-2 w-2 shrink-0 rounded-full bg-blue-400 ring-4 ring-blue-400/10" />
                    <div className="flex-1">
                      <div className="h-1.5 w-[64%] rounded-full bg-muted/55" />
                    </div>
                    <span className="text-[8px] text-muted-foreground">
                      Response
                    </span>
                  </div>

                  <div className="relative flex items-center gap-3">
                    <span className="z-10 h-2 w-2 shrink-0 rounded-full bg-emerald-400 ring-4 ring-emerald-400/10" />
                    <div className="flex-1">
                      <div className="h-1.5 w-[48%] rounded-full bg-muted/45" />
                    </div>
                    <span className="text-[8px] text-muted-foreground">
                      Follow-up
                    </span>
                  </div>
                </div>
              </button>

              <div className="group/evidence absolute right-[0%] top-[0%] rounded-2xl border border-violet-500/20 bg-background/80 px-3.5 py-3 shadow-lg backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-violet-500/35 hover:shadow-xl">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>

                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-violet-500">
                      Evidence
                    </p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">
                      Context preserved
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-1">
                  <span className="h-1.5 w-5 rounded-full bg-violet-500/70" />
                  <span className="h-1.5 w-5 rounded-full bg-violet-500/45" />
                  <span className="h-1.5 w-5 rounded-full bg-violet-500/20" />
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-[20%] left-[0%] rounded-full border border-border/50 bg-background/65 px-3 py-1.5 text-[9px] text-muted-foreground shadow-sm backdrop-blur-xl transition-transform duration-700 group-hover/hero:-translate-y-1">
                Sources → evidence → follow-ups
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-3 border-t border-border/50 bg-background/25 px-6 py-4 backdrop-blur-md sm:px-9 xl:flex-row xl:items-center xl:justify-between xl:px-12">
            <div className="flex max-w-3xl items-start gap-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p>
                A record can preserve a community report before every detail is
                independently verified. Evidence status shows how strongly the
                available sources support it.
              </p>
            </div>

            {isStaff && (
              <Badge
                variant="outline"
                className="w-fit shrink-0 rounded-full border-primary/20 bg-primary/5"
              >
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Staff view
              </Badge>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                Explore
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Browse the archive
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Move through the archive by topic, then narrow it by outcome.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as CommunityStatus | "all")
                }
              >
                <SelectTrigger className="h-9 w-full min-w-0 rounded-full bg-background/60 sm:w-48">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {(
                    Object.entries(STATUS_LABELS) as Array<
                      [CommunityStatus, string]
                    >
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 cursor-pointer rounded-full"
                  onClick={clearFilters}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="-mx-1 flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              data-state={categoryFilter === "all" ? "on" : "off"}
              className={cn(
                "group h-9 shrink-0 rounded-full px-4 text-xs transition-all",
                "data-[state=on]:cursor-default data-[state=off]:cursor-pointer",
                "data-[state=on]:bg-primary/10 data-[state=on]:text-primary",
                "data-[state=off]:text-muted-foreground",
                "data-[state=off]:hover:bg-primary/7 data-[state=off]:hover:text-primary",
              )}
              onClick={() => {
                if (categoryFilter !== "all") {
                  setCategoryFilter("all");
                }
              }}
            >
              <span
                className={cn(
                  "mr-2 h-1.5 w-1.5 rounded-full transition-all",
                  categoryFilter === "all"
                    ? "bg-primary shadow-[0_0_8px] shadow-primary/40"
                    : "bg-muted-foreground/50 group-hover:bg-primary",
                )}
              />
              All records
            </Button>

            {CATEGORY_OPTIONS.map((category) => {
              const active = categoryFilter === category.value;

              return (
                <Button
                  key={category.value}
                  type="button"
                  size="sm"
                  variant="ghost"
                  data-state={active ? "on" : "off"}
                  className={cn(
                    "group h-9 shrink-0 rounded-full px-4 text-xs transition-all",
                    "data-[state=on]:cursor-default data-[state=off]:cursor-pointer",
                    "data-[state=off]:text-muted-foreground",
                  )}
                  style={
                    active
                      ? {
                          backgroundColor: category.activeBackground,
                          color: category.accentColor,
                        }
                      : undefined
                  }
                  onMouseEnter={(event) => {
                    if (active) return;

                    event.currentTarget.style.backgroundColor =
                      category.hoverBackground;

                    event.currentTarget.style.color = category.accentColor;
                  }}
                  onMouseLeave={(event) => {
                    if (active) return;

                    event.currentTarget.style.backgroundColor = "";
                    event.currentTarget.style.color = "";
                  }}
                  onClick={() => {
                    if (!active) {
                      setCategoryFilter(category.value);
                    }
                  }}
                >
                  <span
                    className="mr-2 h-1.5 w-1.5 rounded-full transition-all"
                    style={{
                      backgroundColor: category.accentColor,
                      boxShadow: active
                        ? `0 0 8px ${category.accentColor}66`
                        : undefined,
                    }}
                  />

                  {category.shortLabel}
                </Button>
              );
            })}
          </div>
        </section>

        {loading ? (
          <Card className="overflow-hidden border-border/70 bg-card/80 shadow-md backdrop-blur">
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/7">
                <Archive className="h-6 w-6 animate-pulse text-primary" />
              </div>
              <div>
                <p className="font-medium">Opening the archive</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Loading community records...
                </p>
              </div>
            </CardContent>
          </Card>
        ) : filteredRecords.length === 0 ? (
          <section className="relative overflow-hidden rounded-3xl border border-dashed border-border/70 bg-card/55 px-6 py-10 text-center shadow-sm backdrop-blur sm:py-12">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

            <div className="relative mx-auto flex max-w-lg flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background/60 shadow-sm">
                {records.length === 0 ? (
                  <Archive className="h-5 w-5 text-primary" />
                ) : (
                  <Search className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <p className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-primary">
                {records.length === 0 ? "Fresh archive" : "No matches"}
              </p>

              <h3 className="mt-2 text-xl font-semibold tracking-tight">
                {records.length === 0
                  ? "Community is ready for its first record."
                  : "Nothing matched this view."}
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {records.length === 0
                  ? "Reports, platform changes, creator concerns and important community events will appear here as they are documented."
                  : "Try another topic, status or search term."}
              </p>

              {hasFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-5 cursor-pointer rounded-full"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </section>
        ) : (
          <div className="space-y-10">
            {featuredRecords.length > 0 && (
              <section className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                      In focus
                    </p>
                  </div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    Important right now
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Records currently worth keeping close at hand.
                  </p>
                </div>

                <div className="grid items-stretch gap-4 xl:grid-cols-2">
                  {featuredRecords.map((record) =>
                    renderRecordCard(record, true),
                  )}
                </div>
              </section>
            )}

            {recentRecords.length > 0 && (
              <section className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                    Archive
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    {normalizedSearch ? "Search results" : "Recent records"}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {normalizedSearch
                      ? `${recentRecords.length + featuredRecords.length} ${
                          recentRecords.length + featuredRecords.length === 1
                            ? "record"
                            : "records"
                        } matching “${searchQuery.trim()}”.`
                      : "Reports, changes and follow-ups preserved with context."}
                  </p>
                </div>

                <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {recentRecords.map((record) => renderRecordCard(record))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {isStaff && (
        <CommunitySubmissionDialog
          open={staffCreateOpen}
          onOpenChange={setStaffCreateOpen}
          mode="record_create"
          record={null}
          directCreate
          onSubmitted={async () => {
            await loadData();
          }}
        />
      )}

      <CommunitySubmissionDialog
        open={submissionOpen}
        onOpenChange={(open) => {
          setSubmissionOpen(open);

          if (!open) {
            setSubmissionRecord(null);
          }
        }}
        mode={submissionMode}
        record={submissionRecord}
        onSubmitted={loadData}
      />

      {isStaff && (
        <CommunityReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          onPendingCountChange={setPendingReviewCount}
          onReviewed={loadData}
        />
      )}
    </div>
  );
}
