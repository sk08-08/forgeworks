"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Archive,
  ArchiveX,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  CircleDot,
  Clock3,
  ExternalLink,
  FileText,
  Flag,
  Globe2,
  Link2,
  Loader2,
  MessageCircle,
  MessageSquareText,
  Newspaper,
  Pencil,
  Send,
  Share2,
  Settings2,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Trash2,
  UserRound,
} from "lucide-react";

import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";
import { CommunitySubmissionDialog } from "@/features/hub/community/components/community-submission-dialog";
import { CommunityStaffControlsDialog } from "@/features/hub/community/components/community-staff-controls-dialog";
import {
  archiveCommunityRecordDirect,
  unarchiveCommunityRecordDirect,
  deleteCommunityCommentDirect,
  deleteCommunityRecordDirect,
  type CommunityCategory,
  type CommunityEvidenceStatus,
  type CommunityImpact,
  type CommunityDatePrecision,
  type CommunityStatus,
  type CommunitySubmissionType,
} from "@/features/hub/community/actions/community";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type CommunityContributor = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type CommunityRecordPageRecord = {
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

type CommunitySource = {
  id: string;
  record_id: string;
  source_name: string;
  source_url: string;
  archive_url: string | null;
  source_type: string;
  note: string | null;
  published_at: string | null;
  contributor_user_id: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  contributor: CommunityContributor | null;
};

type CommunityUpdate = {
  id: string;
  record_id: string;
  title: string;
  body: string | null;
  occurred_at: string;
  source_id: string | null;
  contributor_user_id: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  contributor: CommunityContributor | null;
};

type CommunityComment = {
  id: string;
  record_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  author: CommunityContributor | null;
};

type RelatedRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  category: CommunityCategory;
  status: CommunityStatus;
  evidence_status: CommunityEvidenceStatus;
  occurred_at: string | null;
  occurred_at_precision?: CommunityDatePrecision;
  published_at: string | null;
};

type RecordLinkRow = {
  id: string;
  record_id: string;
  related_record_id: string;
  relation_type: string;
};

type CategoryMeta = {
  label: string;
  icon: typeof Archive;
  toneClassName: string;
};

const CATEGORY_MAP: Record<CommunityCategory, CategoryMeta> = {
  moderation: {
    label: "Moderation",
    icon: ShieldCheck,
    toneClassName: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  creator_concern: {
    label: "Creator Concerns",
    icon: UserRound,
    toneClassName: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
  platform_change: {
    label: "Platform Changes",
    icon: Globe2,
    toneClassName: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  policy: {
    label: "Policy",
    icon: BookOpen,
    toneClassName: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  safety_privacy: {
    label: "Safety & Privacy",
    icon: ShieldCheck,
    toneClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  bug_reliability: {
    label: "Bugs & Reliability",
    icon: CircleDot,
    toneClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  community_update: {
    label: "Community Updates",
    icon: Sparkles,
    toneClassName: "bg-primary/10 text-primary",
  },
  other: {
    label: "Other",
    icon: Archive,
    toneClassName: "bg-muted text-muted-foreground",
  },
};

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

const SOURCE_TYPE_META: Record<string, { label: string; icon: typeof Link2 }> =
  {
    community: { label: "Community", icon: UserRound },
    official: { label: "Official", icon: ShieldCheck },
    platform: { label: "Platform", icon: Globe2 },
    social: { label: "Social", icon: MessageCircle },
    article: { label: "Article", icon: Newspaper },
    other: { label: "Source", icon: Link2 },
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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRecordOccurredAt(
  value: string | null,
  precision: CommunityDatePrecision = "datetime",
) {
  if (!value) return null;

  return precision === "date"
    ? formatDate(value, "date")
    : formatDateTime(value);
}

function getContributorName(contributor: CommunityContributor | null) {
  return contributor?.display_name || contributor?.username || null;
}

function getInitials(contributor: CommunityContributor | null) {
  const source = contributor?.display_name || contributor?.username || "User";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
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

function SectionHeading({
  eyebrow,
  title,
  description,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon: typeof FileText;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-primary">
          {eyebrow}
        </p>

        <h2 className="mt-1 break-words text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>

        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/25 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

export function CommunityRecordPage({
  record,
  initialAuthUserId,
  initialIsStaff,
}: {
  record: CommunityRecordPageRecord;
  initialAuthUserId: string | null;
  initialIsStaff: boolean;
}) {
  const router = useRouter();
  const [authUserId] = useState(initialAuthUserId);
  const [isStaff] = useState(initialIsStaff);

  const [sources, setSources] = useState<CommunitySource[]>([]);
  const [updates, setUpdates] = useState<CommunityUpdate[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [relatedRecords, setRelatedRecords] = useState<RelatedRecord[]>([]);

  const [loadingDetail, setLoadingDetail] = useState(true);
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [helpfulCount, setHelpfulCount] = useState(0);
  const [isHelpful, setIsHelpful] = useState(false);
  const [updatingHelpful, setUpdatingHelpful] = useState(false);
  const [helpfulAnimation, setHelpfulAnimation] = useState<
    "liked" | "unliked" | null
  >(null);

  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [submissionMode, setSubmissionMode] =
    useState<CommunitySubmissionType>("source");
  const [staffControlsOpen, setStaffControlsOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordAdminAction, setRecordAdminAction] = useState<
    "archive" | "restore" | "delete" | null
  >(null);
  const [commentDeleteId, setCommentDeleteId] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const category = CATEGORY_MAP[record.category];
  const CategoryIcon = category.icon;

  const contributorName = getContributorName(record.contributor);
  const displayDate =
    formatDate(record.occurred_at) ||
    formatDate(record.published_at) ||
    formatDate(record.created_at);

  const isOwner = !!authUserId && record.contributor_user_id === authUserId;

  const sourceById = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );

  const commentToDelete = useMemo(
    () =>
      commentDeleteId
        ? comments.find((comment) => comment.id === commentDeleteId) || null
        : null,
    [commentDeleteId, comments],
  );

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);

    try {
      const supabase = createClient();

      const [
        sourcesResult,
        updatesResult,
        commentsResult,
        linksResult,
        helpfulResult,
      ] = await Promise.all([
        supabase
          .from("hub_community_record_sources")
          .select(
            `
                id,
                record_id,
                source_name,
                source_url,
                archive_url,
                source_type,
                note,
                published_at,
                contributor_user_id,
                sort_order,
                is_published,
                created_at,
                updated_at,
                contributor:profiles!hub_community_record_sources_contributor_user_id_fkey(
                  username,
                  display_name,
                  avatar_url
                )
              `,
          )
          .eq("record_id", record.id)
          .order("sort_order", { ascending: true })
          .order("published_at", {
            ascending: true,
            nullsFirst: false,
          })
          .order("created_at", { ascending: true }),

        supabase
          .from("hub_community_record_updates")
          .select(
            `
                id,
                record_id,
                title,
                body,
                occurred_at,
                source_id,
                contributor_user_id,
                sort_order,
                is_published,
                created_at,
                updated_at,
                contributor:profiles!hub_community_record_updates_contributor_user_id_fkey(
                  username,
                  display_name,
                  avatar_url
                )
              `,
          )
          .eq("record_id", record.id)
          .order("occurred_at", { ascending: true })
          .order("sort_order", { ascending: true }),

        supabase
          .from("hub_community_record_comments")
          .select(
            `
                id,
                record_id,
                user_id,
                body,
                created_at,
                updated_at,
                deleted_at,
                author:profiles!hub_community_record_comments_user_id_fkey(
                  username,
                  display_name,
                  avatar_url
                )
              `,
          )
          .eq("record_id", record.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: true }),

        supabase
          .from("hub_community_record_links")
          .select("id, record_id, related_record_id, relation_type")
          .eq("record_id", record.id),

        supabase
          .from("hub_community_record_helpful")
          .select("user_id")
          .eq("record_id", record.id),
      ]);

      if (sourcesResult.error) throw sourcesResult.error;
      if (updatesResult.error) throw updatesResult.error;
      if (commentsResult.error) throw commentsResult.error;
      if (linksResult.error) throw linksResult.error;
      if (helpfulResult.error) throw helpfulResult.error;

      setSources(
        (sourcesResult.data || []).map((row: any) => ({
          ...row,
          contributor: Array.isArray(row.contributor)
            ? (row.contributor[0] ?? null)
            : row.contributor,
        })) as CommunitySource[],
      );

      setUpdates(
        (updatesResult.data || []).map((row: any) => ({
          ...row,
          contributor: Array.isArray(row.contributor)
            ? (row.contributor[0] ?? null)
            : row.contributor,
        })) as CommunityUpdate[],
      );

      setComments(
        (commentsResult.data || []).map((row: any) => ({
          ...row,
          author: Array.isArray(row.author)
            ? (row.author[0] ?? null)
            : row.author,
        })) as CommunityComment[],
      );

      const helpfulRows = helpfulResult.data || [];
      setHelpfulCount(helpfulRows.length);
      setIsHelpful(
        Boolean(
          authUserId && helpfulRows.some((row) => row.user_id === authUserId),
        ),
      );

      const links = (linksResult.data || []) as RecordLinkRow[];
      const relatedIds = Array.from(
        new Set(links.map((link) => link.related_record_id)),
      );

      if (relatedIds.length === 0) {
        setRelatedRecords([]);
      } else {
        const relatedResult = await supabase
          .from("hub_community_records")
          .select(
            `
              id,
              slug,
              title,
              summary,
              category,
              status,
              evidence_status,
              occurred_at,
              occurred_at_precision,
              published_at
            `,
          )
          .in("id", relatedIds)
          .eq("is_published", true)
          .order("occurred_at", {
            ascending: false,
            nullsFirst: false,
          });

        if (relatedResult.error) throw relatedResult.error;

        setRelatedRecords((relatedResult.data || []) as RelatedRecord[]);
      }
    } catch (error: any) {
      console.error("Failed to load Community record page:", error);
      toast.error(error.message || "Could not load the full community record.");
    } finally {
      setLoadingDetail(false);
    }
  }, [authUserId, record.id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const toggleHelpful = async () => {
    if (!authUserId) {
      toast.error("Sign in to mark this record as helpful.");
      return;
    }

    const nextHelpful = !isHelpful;

    setUpdatingHelpful(true);

    try {
      const supabase = createClient();

      if (isHelpful) {
        const { error } = await supabase
          .from("hub_community_record_helpful")
          .delete()
          .eq("record_id", record.id)
          .eq("user_id", authUserId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("hub_community_record_helpful")
          .insert({
            record_id: record.id,
            user_id: authUserId,
          });

        if (error) throw error;
      }

      setHelpfulAnimation(nextHelpful ? "liked" : "unliked");

      await loadDetail();

      window.setTimeout(() => {
        setHelpfulAnimation(null);
      }, 750);
    } catch (error: any) {
      toast.error(error.message || "Could not update Helpful.");
    } finally {
      setUpdatingHelpful(false);
    }
  };

  const submitComment = async () => {
    if (!authUserId) {
      toast.error("Sign in to join the discussion.");
      return;
    }

    const body = commentDraft.trim();

    if (!body) {
      toast.error("Write a comment first.");
      return;
    }

    if (body.length > 5000) {
      toast.error("Comments can be up to 5,000 characters.");
      return;
    }

    setPostingComment(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("hub_community_record_comments")
        .insert({
          record_id: record.id,
          user_id: authUserId,
          body,
        });

      if (error) throw error;

      setCommentDraft("");
      await loadDetail();

      toast.success("Comment added.");
    } catch (error: any) {
      toast.error(error.message || "Could not add your comment.");
    } finally {
      setPostingComment(false);
    }
  };

  const deleteComment = async () => {
    if (!isStaff || !commentDeleteId || deletingComment) return;

    setDeletingComment(true);

    try {
      const result = await deleteCommunityCommentDirect(commentDeleteId);

      if (!result.success) {
        toast.error(result.error || "Could not delete this comment.");
        return;
      }

      toast.success(
        "alreadyDeleted" in result && result.alreadyDeleted
          ? "This comment was already removed."
          : "Comment removed.",
      );

      setCommentDeleteId(null);
      await loadDetail();
    } catch (error) {
      console.error(error);
      toast.error("Could not delete this comment.");
    } finally {
      setDeletingComment(false);
    }
  };

  const openContribution = (mode: CommunitySubmissionType) => {
    setSubmissionMode(mode);
    setSubmissionOpen(true);
  };

  const archiveRecord = async () => {
    if (!isStaff || recordAdminAction) return;

    setRecordAdminAction("archive");

    try {
      const result = await archiveCommunityRecordDirect(record.id);

      if (!result.success) {
        toast.error(result.error || "Could not archive this record.");
        return;
      }

      toast.success(
        "alreadyArchived" in result && result.alreadyArchived
          ? "This record is already archived."
          : "Community record archived.",
      );

      setArchiveConfirmOpen(false);
      router.refresh();
      await loadDetail();
    } catch (error) {
      console.error(error);
      toast.error("Could not archive this record.");
    } finally {
      setRecordAdminAction(null);
    }
  };

  const restoreRecord = async () => {
    if (!isStaff || recordAdminAction) return;

    setRecordAdminAction("restore");

    try {
      const result = await unarchiveCommunityRecordDirect(record.id);

      if (!result.success) {
        toast.error(result.error || "Could not restore this record.");
        return;
      }

      toast.success(
        "alreadyRestored" in result && result.alreadyRestored
          ? "This record is already active."
          : "Community record restored.",
      );

      setArchiveConfirmOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Could not restore this record.");
    } finally {
      setRecordAdminAction(null);
    }
  };

  const deleteRecord = async () => {
    if (!isStaff || recordAdminAction) return;

    setRecordAdminAction("delete");

    try {
      const result = await deleteCommunityRecordDirect(record.id);

      if (!result.success) {
        toast.error(result.error || "Could not delete this record.");
        return;
      }

      if ("cleanupWarning" in result && result.cleanupWarning) {
        toast.warning(result.cleanupWarning);
      }

      toast.success("Community record permanently deleted.");
      setDeleteConfirmOpen(false);

      // The current /community/[slug] route no longer exists after deletion.
      // Use a hard replace so Next.js cannot revalidate the deleted route
      // before the navigation finishes and briefly render the 404 page.
      window.location.replace("/community");
    } catch (error) {
      console.error(error);
      toast.error("Could not delete this record.");
    } finally {
      setRecordAdminAction(null);
    }
  };

  const shareRecord = async () => {
    try {
      const url = window.location.href;

      if (navigator.share) {
        await navigator.share({
          title: record.title,
          text: record.summary || undefined,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      toast.success("Record link copied.");
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        toast.error("Could not share this record.");
      }
    }
  };

  const navItems = [
    { id: "context", label: "Context", icon: FileText },
    { id: "sources", label: "Sources", icon: Link2 },
    { id: "related", label: "Related", icon: ArrowUpRight },
    { id: "discussion", label: "Discussion", icon: MessageCircle },
  ];

  return (
    <>
      <main className="min-h-screen bg-background">
        <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[34rem] bg-[radial-gradient(circle_at_18%_0%,rgba(139,92,246,0.10),transparent_38%),radial-gradient(circle_at_82%_10%,rgba(59,130,246,0.08),transparent_32%)]" />

        <div className="relative z-10 mx-auto w-full max-w-[90rem] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/community"
              className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-all hover:border-primary/25 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              Back to Community
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative isolate">
                {helpfulAnimation === "liked" && (
                  <div
                    aria-hidden="true"
                    className="helpful-celebration pointer-events-none absolute inset-0 z-0"
                  >
                    <span className="helpful-burst-ring" />
                    <span className="helpful-burst-halo" />

                    <span className="helpful-particle helpful-particle-1" />
                    <span className="helpful-particle helpful-particle-2" />
                    <span className="helpful-particle helpful-particle-3" />
                    <span className="helpful-particle helpful-particle-4" />
                    <span className="helpful-particle helpful-particle-5" />
                    <span className="helpful-particle helpful-particle-6" />
                  </div>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant={isHelpful ? "secondary" : "outline"}
                  className={cn(
                    "group/helpful relative z-10 cursor-pointer overflow-hidden rounded-full",
                    "transition-[background-color,border-color,color,box-shadow,transform] duration-300",
                    "active:scale-[0.97]",
                    isHelpful &&
                      "border-primary/20 bg-primary/10 text-primary shadow-sm shadow-primary/10 hover:bg-primary/15",
                    helpfulAnimation === "liked" && "helpful-button-liked",
                    helpfulAnimation === "unliked" && "helpful-button-unliked",
                  )}
                  disabled={updatingHelpful}
                  onClick={toggleHelpful}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "helpful-shimmer absolute inset-0 -z-10 opacity-0",
                      helpfulAnimation === "liked" && "helpful-shimmer-active",
                    )}
                  />

                  {updatingHelpful ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="relative mr-2 flex h-4 w-4 items-center justify-center">
                      <ThumbsUp
                        className={cn(
                          "absolute h-3.5 w-3.5 transition-[transform,fill] duration-300",
                          isHelpful && "fill-current",
                          helpfulAnimation === "liked" && "helpful-icon-liked",
                          helpfulAnimation === "unliked" &&
                            "helpful-icon-unliked",
                        )}
                      />
                    </span>
                  )}

                  <span
                    key={isHelpful ? "helpful-active" : "helpful-idle"}
                    className={cn(
                      "inline-block",
                      helpfulAnimation && "helpful-label-change",
                    )}
                  >
                    Helpful
                  </span>

                  <span className="ml-1.5 tabular-nums opacity-70">
                    {helpfulCount}
                  </span>
                </Button>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full cursor-pointer rounded-full sm:w-auto"
                onClick={shareRecord}
              >
                <Share2 className="mr-2 h-3.5 w-3.5" />
                Share
              </Button>

              {isStaff && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="cursor-pointer rounded-full border-primary/20 bg-primary/[0.04] text-primary hover:bg-primary/[0.08]"
                  onClick={() => setStaffControlsOpen(true)}
                >
                  <Settings2 className="mr-2 h-3.5 w-3.5" />
                  Staff controls
                </Button>
              )}
            </div>
          </div>

          <header className="group/hero relative overflow-hidden rounded-[2rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary/[0.055] shadow-[0_30px_90px_-46px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_90%_12%,rgba(139,92,246,0.12),transparent_28%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.24] [background-image:linear-gradient(rgba(127,127,127,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(127,127,127,0.08)_1px,transparent_1px)] [background-size:34px_34px] [mask-image:linear-gradient(to_right,transparent,black_45%,black)]" />

            <div className="relative grid gap-8 px-6 py-7 sm:px-8 sm:py-9 xl:grid-cols-[minmax(0,1fr)_19rem] lg:px-10 lg:py-10">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium",
                      category.toneClassName,
                    )}
                  >
                    <CategoryIcon className="h-3 w-3" />
                    {category.label}
                  </span>

                  {record.is_featured && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-primary/20 bg-primary/5 text-primary"
                    >
                      <Sparkles className="mr-1.5 h-3 w-3" />
                      Featured
                    </Badge>
                  )}

                  {isOwner && (
                    <Badge variant="secondary" className="rounded-full">
                      Your record
                    </Badge>
                  )}

                  {isStaff && !record.is_published && (
                    <Badge variant="outline" className="rounded-full">
                      Draft
                    </Badge>
                  )}
                </div>

                <h1 className="mt-5 max-w-5xl text-balance text-3xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-[3.5rem]">
                  {record.title}
                </h1>

                {record.summary && (
                  <p className="mt-5 max-w-4xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
                    {record.summary}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  {displayDate && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {displayDate}
                    </span>
                  )}

                  {contributorName && (
                    <span className="inline-flex items-center gap-1.5">
                      <UserRound className="h-3.5 w-3.5" />
                      {record.contributor?.username ? (
                        <Link
                          href={`/profile/${record.contributor.username}`}
                          className="font-medium transition-colors hover:text-primary hover:underline"
                        >
                          {contributorName}
                        </Link>
                      ) : (
                        contributorName
                      )}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    Revision {record.revision}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-2xl border border-border/60 bg-background/55 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      Outcome
                    </span>
                    <CircleDot className="h-3.5 w-3.5 text-primary" />
                  </div>

                  <span
                    className={cn(
                      "mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium",
                      getStatusBadgeClass(record.status),
                    )}
                  >
                    {STATUS_LABELS[record.status]}
                  </span>

                  {record.status_note && (
                    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                      {record.status_note}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/55 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      Evidence
                    </span>
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  </div>

                  <span
                    className={cn(
                      "mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium",
                      getEvidenceBadgeClass(record.evidence_status),
                    )}
                  >
                    {EVIDENCE_LABELS[record.evidence_status]}
                  </span>

                  {record.evidence_note && (
                    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                      {record.evidence_note}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/55 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      Impact
                    </span>
                    <Flag className="h-3.5 w-3.5 text-primary" />
                  </div>

                  <p className="mt-2 text-sm font-medium">
                    {record.impact
                      ? IMPACT_LABELS[record.impact]
                      : "Not assessed"}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex flex-wrap items-center gap-2 border-t border-border/50 bg-background/25 px-6 py-3.5 backdrop-blur sm:px-8 lg:px-10">
              {isStaff ? (
                <>
                  <div className="mr-1 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.055] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Staff
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer rounded-full bg-background/60"
                    onClick={() => openContribution("record_edit")}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit record
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer rounded-full bg-background/60"
                    onClick={() => openContribution("source")}
                  >
                    <Link2 className="mr-2 h-3.5 w-3.5" />
                    Add source
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer rounded-full bg-background/60"
                    onClick={() => openContribution("timeline_update")}
                  >
                    <CalendarPlus className="mr-2 h-3.5 w-3.5" />
                    Add timeline update
                  </Button>

                  <div className="mx-1 hidden h-5 w-px bg-border/70 sm:block" />

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "cursor-pointer rounded-full text-muted-foreground",
                      record.status === "archived"
                        ? "hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                        : "hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400",
                    )}
                    onClick={() => setArchiveConfirmOpen(true)}
                  >
                    {record.status === "archived" ? (
                      <>
                        <ArrowUpRight className="mr-2 h-3.5 w-3.5" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive className="mr-2 h-3.5 w-3.5" />
                        Archive
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="cursor-pointer rounded-full text-muted-foreground hover:bg-destructive/10"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </>
              ) : authUserId ? (
                <>
                  {isOwner && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="cursor-pointer rounded-full bg-background/60"
                      onClick={() => openContribution("record_edit")}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit my record
                    </Button>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer rounded-full bg-background/60"
                    onClick={() => openContribution("source")}
                  >
                    <Link2 className="mr-2 h-3.5 w-3.5" />
                    Add source
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer rounded-full bg-background/60"
                    onClick={() => openContribution("timeline_update")}
                  >
                    <CalendarPlus className="mr-2 h-3.5 w-3.5" />
                    Suggest update
                  </Button>

                  {!isOwner && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="cursor-pointer rounded-full bg-background/60"
                      onClick={() => openContribution("correction")}
                    >
                      <MessageSquareText className="mr-2 h-3.5 w-3.5" />
                      Suggest correction
                    </Button>
                  )}

                  {isOwner && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="cursor-pointer rounded-full text-muted-foreground"
                      onClick={() => openContribution("archive_request")}
                    >
                      <ArchiveX className="mr-2 h-3.5 w-3.5" />
                      Request archive/removal
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sign in to contribute sources, updates or corrections.
                </p>
              )}
            </div>
          </header>

          {record.content_warning && (
            <div className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
              <div className="flex gap-3">
                <Flag className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Content note</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {record.content_warning}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 space-y-7">
              <section
                id="context"
                className="scroll-mt-6 rounded-[1.75rem] border border-border/60 bg-card/65 p-5 shadow-sm sm:p-7"
              >
                <SectionHeading
                  eyebrow="Record"
                  title="Context"
                  description="The preserved account, background and details attached to this record."
                  icon={FileText}
                />

                <div className="prose-wrap min-w-0">
                  {record.content ? (
                    <MarkdownRenderer content={record.content} />
                  ) : (
                    <p className="text-sm leading-6 text-muted-foreground">
                      No additional context has been added yet.
                    </p>
                  )}
                </div>
              </section>

              <section
                id="sources"
                className="scroll-mt-6 rounded-[1.75rem] border border-border/60 bg-card/55 p-5 shadow-sm sm:p-7"
              >
                <SectionHeading
                  eyebrow="Evidence"
                  title="Sources"
                  description="References used to preserve, corroborate or contextualize this record."
                  icon={Link2}
                />

                {loadingDetail ? (
                  <div className="flex min-h-32 items-center justify-center rounded-2xl border border-border/50 bg-muted/10">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : sources.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/65 bg-muted/[0.12] p-5">
                    <p className="text-sm font-medium">
                      No sources listed yet.
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Sources will appear here when they are added to the
                      record.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
                    {sources.map((source) => {
                      const sourceMeta =
                        SOURCE_TYPE_META[source.source_type] ||
                        SOURCE_TYPE_META.other;

                      const SourceIcon = sourceMeta.icon;

                      const sourceContributor = getContributorName(
                        source.contributor,
                      );

                      return (
                        <article
                          key={source.id}
                          className={cn(
                            "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl",
                            "border border-border/60 bg-background/45 p-4",
                            "transition-all duration-300",
                            "hover:-translate-y-0.5 hover:border-primary/25",
                            "hover:bg-primary/[0.025] hover:shadow-md",
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary ring-1 ring-primary/10">
                              <SourceIcon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 flex-wrap items-start gap-2">
                                <p className="min-w-0 flex-1 break-words text-sm font-semibold">
                                  {source.source_name}
                                </p>

                                <Badge
                                  variant="outline"
                                  className="shrink-0 rounded-full text-[9px] font-normal"
                                >
                                  {sourceMeta.label}
                                </Badge>
                              </div>

                              {source.note && (
                                <p className="mt-1.5 break-words text-xs leading-5 text-muted-foreground">
                                  {source.note}
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                                {source.published_at && (
                                  <span>{formatDate(source.published_at)}</span>
                                )}

                                {sourceContributor && (
                                  <>
                                    {source.published_at && (
                                      <span className="hidden sm:inline">
                                        •
                                      </span>
                                    )}

                                    {source.contributor?.username ? (
                                      <span className="inline-flex min-w-0 items-center gap-1">
                                        <span>Added by</span>

                                        <Link
                                          href={`/profile/${source.contributor.username}`}
                                          className="min-w-0 truncate font-medium text-foreground/80 transition-colors hover:text-primary hover:underline"
                                        >
                                          {sourceContributor}
                                        </Link>
                                      </span>
                                    ) : (
                                      <span>Added by {sourceContributor}</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/45 pt-3">
                            <a
                              href={source.source_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className={cn(
                                "inline-flex h-8 items-center gap-1.5 rounded-full",
                                "border border-border/60 bg-background/70 px-3",
                                "text-xs font-medium",
                                "transition-colors hover:border-primary/30",
                                "hover:bg-primary/5 hover:text-primary",
                              )}
                            >
                              Open source
                              <ExternalLink className="h-3 w-3" />
                            </a>

                            {source.archive_url && (
                              <a
                                href={source.archive_url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                              >
                                Archived copy
                                <ArrowUpRight className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section
                id="related"
                className="scroll-mt-6 rounded-[1.75rem] border border-border/60 bg-card/55 p-5 shadow-sm sm:p-7"
              >
                <SectionHeading
                  eyebrow="Connected"
                  title="Related records"
                  description="Other preserved records connected to this incident, topic or follow-up."
                  icon={ArrowUpRight}
                />

                {loadingDetail ? (
                  <div className="flex min-h-28 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : relatedRecords.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/65 bg-muted/[0.12] p-5">
                    <p className="text-sm text-muted-foreground">
                      No related records have been linked yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {relatedRecords.map((related) => {
                      const relatedCategory = CATEGORY_MAP[related.category];
                      const RelatedIcon = relatedCategory.icon;

                      return (
                        <Link
                          key={related.id}
                          href={`/community/${related.slug}`}
                          className="group rounded-2xl border border-border/60 bg-background/45 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/[0.025] hover:shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                                relatedCategory.toneClassName,
                              )}
                            >
                              <RelatedIcon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="line-clamp-2 text-sm font-semibold">
                                  {related.title}
                                </p>
                                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                              </div>

                              {related.summary && (
                                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                  {related.summary}
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                  {relatedCategory.label}
                                </span>
                                <span className="text-[9px] text-muted-foreground">
                                  {STATUS_LABELS[related.status]}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>

              <section
                id="discussion"
                className="scroll-mt-6 rounded-[1.75rem] border border-border/60 bg-card/55 p-5 shadow-sm sm:p-7"
              >
                <SectionHeading
                  eyebrow="Community"
                  title="Discussion"
                  description="Add useful context, corrections or follow-up discussion."
                  icon={MessageCircle}
                />

                {authUserId ? (
                  <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
                    <Textarea
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      placeholder="Add useful context to the discussion..."
                      rows={4}
                      maxLength={5000}
                      className="resize-y bg-background/65"
                    />

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[10px] text-muted-foreground">
                        {commentDraft.length.toLocaleString()} / 5,000
                      </span>

                      <Button
                        type="button"
                        size="sm"
                        className="w-full cursor-pointer rounded-full sm:w-auto"
                        disabled={
                          postingComment || commentDraft.trim().length === 0
                        }
                        onClick={submitComment}
                      >
                        {postingComment ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-3.5 w-3.5" />
                        )}
                        Add comment
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/65 bg-background/35 p-4">
                    <p className="text-sm font-medium">
                      Sign in to join the discussion.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Discussion is public, but posting requires an account.
                    </p>
                  </div>
                )}

                {loadingDetail ? (
                  <div className="flex min-h-28 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-border/50 bg-muted/[0.12] p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No discussion yet.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {comments.map((comment) => {
                      const authorName =
                        getContributorName(comment.author) ||
                        "Community member";

                      return (
                        <article
                          key={comment.id}
                          className="group rounded-2xl border border-border/55 bg-background/40 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarImage
                                src={comment.author?.avatar_url || undefined}
                                alt={authorName}
                              />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(comment.author)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                                  {comment.author?.username ? (
                                    <Link
                                      href={`/profile/${comment.author.username}`}
                                      className="break-words text-sm font-medium transition-colors hover:text-primary hover:underline"
                                    >
                                      {authorName}
                                    </Link>
                                  ) : (
                                    <p className="break-words text-sm font-medium">
                                      {authorName}
                                    </p>
                                  )}

                                  <span className="shrink-0 text-[10px] text-muted-foreground">
                                    {formatDateTime(comment.created_at)}
                                  </span>
                                </div>

                                {isStaff && (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 shrink-0 cursor-pointer rounded-full text-muted-foreground opacity-70 transition hover:bg-destructive/10 group-hover:opacity-100"
                                    onClick={() =>
                                      setCommentDeleteId(comment.id)
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span className="sr-only">
                                      Delete comment by {authorName}
                                    </span>
                                  </Button>
                                )}
                              </div>

                              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
                                {comment.body}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <aside className="min-w-0 xl:sticky xl:top-5">
              <div className="space-y-4">
                <section className="rounded-[1.5rem] border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                    On this record
                  </p>

                  <nav className="mt-3 space-y-1">
                    {navItems.map((item) => {
                      const Icon = item.icon;

                      return (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          className="group flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-primary/[0.05] hover:text-foreground"
                        >
                          <Icon className="h-3.5 w-3.5 text-primary/70" />
                          <span>{item.label}</span>
                          <ArrowRight className="ml-auto h-3 w-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                        </a>
                      );
                    })}
                  </nav>
                </section>

                <section className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-card/70 shadow-sm backdrop-blur">
                  <div className="border-b border-border/55 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                          Follow-up
                        </p>
                        <h2 className="mt-1 text-sm font-semibold">
                          Record timeline
                        </h2>
                      </div>

                      <Badge
                        variant="outline"
                        className="rounded-full font-normal"
                      >
                        {updates.length}
                      </Badge>
                    </div>

                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      A compact index of meaningful developments.
                    </p>
                  </div>

                  <div className="max-h-[min(62vh,36rem)] overflow-y-auto px-4 py-4">
                    {loadingDetail ? (
                      <div className="flex min-h-28 items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : updates.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          No timeline updates yet.
                        </p>
                      </div>
                    ) : (
                      <div className="relative pl-5">
                        <div className="absolute bottom-2 left-[0.43rem] top-2 w-px bg-linear-to-b from-primary/70 via-border to-border/20" />

                        <div className="space-y-4">
                          {updates.map((update, index) => {
                            const linkedSource = update.source_id
                              ? sourceById.get(update.source_id)
                              : null;
                            const updateContributor = getContributorName(
                              update.contributor,
                            );

                            return (
                              <article
                                key={update.id}
                                className="group relative"
                              >
                                <div
                                  className={cn(
                                    "absolute -left-5 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background ring-1 ring-border/70",
                                    index === updates.length - 1
                                      ? "bg-primary"
                                      : "bg-muted-foreground/45",
                                  )}
                                />

                                <div className="rounded-xl border border-border/55 bg-background/40 p-3 transition-colors group-hover:border-primary/20 group-hover:bg-primary/[0.02]">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium leading-5">
                                        {update.title}
                                      </p>
                                      <p className="mt-0.5 text-[9px] text-muted-foreground">
                                        {formatDateTime(update.occurred_at)}
                                      </p>
                                    </div>

                                    {linkedSource && (
                                      <a
                                        href={linkedSource.source_url}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="shrink-0 text-primary"
                                        title="Open linked source"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </div>

                                  {update.body && (
                                    <div className="mt-2 text-[11px] leading-5 text-muted-foreground">
                                      <MarkdownRenderer content={update.body} />
                                    </div>
                                  )}

                                  {updateContributor && (
                                    <div className="mt-2 text-[9px] text-muted-foreground/80">
                                      <span>by </span>
                                      {update.contributor?.username ? (
                                        <Link
                                          href={`/profile/${update.contributor.username}`}
                                          className="transition-colors hover:text-primary hover:underline"
                                        >
                                          {updateContributor}
                                        </Link>
                                      ) : (
                                        updateContributor
                                      )}
                                    </div>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border/50 bg-muted/[0.10] px-4 py-3">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{sources.length} sources</span>
                      <span>{comments.length} comments</span>
                      <span>Rev. {record.revision}</span>
                    </div>
                  </div>
                </section>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Context preserved
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <CommunitySubmissionDialog
        open={submissionOpen}
        onOpenChange={setSubmissionOpen}
        mode={submissionMode}
        record={record}
        staffDirect={isStaff}
        onSubmitted={async () => {
          await loadDetail();
          router.refresh();
        }}
      />

      {isStaff && (
        <AlertDialog
          open={Boolean(commentDeleteId)}
          onOpenChange={(open) => {
            if (!open && !deletingComment) {
              setCommentDeleteId(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this comment?</AlertDialogTitle>
              <AlertDialogDescription>
                The comment will no longer be visible in the Community record.
                It will be soft-deleted so moderation history is preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {commentToDelete && (
              <div className="rounded-xl border border-border/60 bg-muted/[0.18] p-3">
                <p className="text-xs font-medium">
                  {getContributorName(commentToDelete.author) ||
                    "Community member"}
                </p>

                <p className="mt-1 line-clamp-4 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">
                  {commentToDelete.body}
                </p>
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={deletingComment}
                className="w-full cursor-pointer sm:w-auto"
              >
                Cancel
              </AlertDialogCancel>

              <AlertDialogAction
                disabled={deletingComment}
                onClick={(event) => {
                  event.preventDefault();
                  void deleteComment();
                }}
                className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletingComment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing…
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove comment
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isStaff && (
        <>
          <AlertDialog
            open={archiveConfirmOpen}
            onOpenChange={(open) => {
              if (!recordAdminAction) setArchiveConfirmOpen(open);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {record.status === "archived"
                    ? "Restore this Community record?"
                    : "Archive this Community record?"}
                </AlertDialogTitle>

                <AlertDialogDescription>
                  {record.status === "archived"
                    ? "The record will return to Open status and be published again in Community. It will not be Featured automatically."
                    : "The record will move to Archived status, be unpublished from Community and removed from Featured placement. Its content stays preserved for staff and can be restored later."}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={
                    recordAdminAction === "archive" ||
                    recordAdminAction === "restore"
                  }
                  className="w-full cursor-pointer sm:w-auto"
                >
                  Cancel
                </AlertDialogCancel>

                <AlertDialogAction
                  disabled={
                    recordAdminAction === "archive" ||
                    recordAdminAction === "restore"
                  }
                  onClick={(event) => {
                    event.preventDefault();

                    if (record.status === "archived") {
                      void restoreRecord();
                    } else {
                      void archiveRecord();
                    }
                  }}
                  className={cn(
                    "cursor-pointer text-white",
                    record.status === "archived"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-600 hover:bg-amber-700",
                  )}
                >
                  {recordAdminAction === "archive" ||
                  recordAdminAction === "restore" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {recordAdminAction === "restore"
                        ? "Restoring…"
                        : "Archiving…"}
                    </>
                  ) : record.status === "archived" ? (
                    <>
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                      Restore record
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive record
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog
            open={deleteConfirmOpen}
            onOpenChange={(open) => {
              if (!recordAdminAction) setDeleteConfirmOpen(open);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Permanently delete this Community record?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. The record and its sources, timeline
                  updates, comments, Helpful marks, related links and pending
                  submissions will be permanently removed. Managed Community
                  images attached to the record will also be cleaned up.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={recordAdminAction === "delete"}
                  className="w-full cursor-pointer sm:w-auto"
                >
                  Cancel
                </AlertDialogCancel>

                <AlertDialogAction
                  disabled={recordAdminAction === "delete"}
                  onClick={(event) => {
                    event.preventDefault();
                    void deleteRecord();
                  }}
                  className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {recordAdminAction === "delete" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete permanently
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {isStaff && (
        <CommunityStaffControlsDialog
          open={staffControlsOpen}
          onOpenChange={setStaffControlsOpen}
          record={record}
          onSaved={async () => {
            await loadDetail();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
