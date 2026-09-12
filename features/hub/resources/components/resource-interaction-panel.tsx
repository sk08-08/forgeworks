"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { MessageCircle, Send, ThumbsUp, Pencil } from "lucide-react";

import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";

import { ResourceSuggestionDialog } from "@/features/hub/resources/components/resource-suggestion-dialog";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CommentRow = {
  id: string;
  body: string;
  created_at: string;

  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

const VIEWER_KEY = "forgeworks-resources-viewer";

function getViewerFingerprint() {
  const existing = localStorage.getItem(VIEWER_KEY);

  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();

  localStorage.setItem(VIEWER_KEY, next);

  return next;
}

type EditableResource = {
  id: string;
  sectionId: string;
  title: string;
  summary: string;
  url: string;
  label: string;
};

type ResourceSectionOption = {
  id: string;
  title: string;
};

export function ResourceInteractionPanel({
  entryId,
  contributorUserId,
  resource,
  sections,
}: {
  entryId: string;
  contributorUserId: string | null;
  resource: EditableResource;
  sections: ResourceSectionOption[];
}) {
  const [userId, setUserId] = useState<string | null>(null);

  const [helpfulCount, setHelpfulCount] = useState(0);

  const [helpful, setHelpful] = useState(false);

  const [comments, setComments] = useState<CommentRow[]>([]);

  const [draft, setDraft] = useState("");

  const [sending, setSending] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [helpfulAnimation, setHelpfulAnimation] = useState<
    "liked" | "unliked" | null
  >(null);

  const helpfulAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const load = useCallback(async () => {
    const supabase = createClient();

    const access = await getCurrentUserAccess(supabase);

    const currentUserId = access.user?.id || null;

    setUserId(currentUserId);

    const [reactionsResult, commentsResult] = await Promise.all([
      supabase
        .from("hub_resource_entry_reactions")
        .select("user_id, reaction")
        .eq("entry_id", entryId)
        .eq("reaction", 1),

      supabase
        .from("active_hub_resource_entry_comments")
        .select(
          `
          id,
          body,
          created_at,
          profiles:user_id(
            username,
            display_name,
            avatar_url
          )
          `,
        )
        .eq("entry_id", entryId)
        .order("created_at", {
          ascending: true,
        }),
    ]);

    const reactionRows = reactionsResult.data || [];

    setHelpfulCount(reactionRows.length);

    setHelpful(
      Boolean(
        currentUserId &&
        reactionRows.some((row) => row.user_id === currentUserId),
      ),
    );

    const normalizedComments = (commentsResult.data || []).map((row: any) => ({
      ...row,

      profiles: Array.isArray(row.profiles)
        ? (row.profiles[0] ?? null)
        : row.profiles,
    }));

    setComments(normalizedComments as CommentRow[]);
  }, [entryId]);

  useEffect(() => {
    return () => {
      if (helpfulAnimationTimerRef.current) {
        clearTimeout(helpfulAnimationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    void load();

    const supabase = createClient();

    const fingerprint = getViewerFingerprint();

    void supabase.rpc("record_hub_resource_entry_view", {
      p_entry_id: entryId,
      p_viewer_fingerprint: fingerprint,
      p_user_id: null,
    });
  }, [entryId, load]);

  const toggleHelpful = async () => {
    if (!userId) {
      toast.error("Sign in to mark resources as helpful.");

      return;
    }

    const supabase = createClient();

    if (helpful) {
      const { error } = await supabase
        .from("hub_resource_entry_reactions")
        .delete()
        .eq("entry_id", entryId)
        .eq("user_id", userId);

      if (error) {
        toast.error(error.message);

        return;
      }
    } else {
      const { error } = await supabase
        .from("hub_resource_entry_reactions")
        .upsert(
          {
            entry_id: entryId,

            user_id: userId,

            reaction: 1,
          },
          {
            onConflict: "entry_id,user_id",
          },
        );

      if (error) {
        toast.error(error.message);

        return;
      }
    }

    if (helpfulAnimationTimerRef.current) {
      clearTimeout(helpfulAnimationTimerRef.current);
    }

    setHelpfulAnimation(helpful ? "unliked" : "liked");

    helpfulAnimationTimerRef.current = setTimeout(() => {
      setHelpfulAnimation(null);
    }, 850);

    await load();
  };

  const submitComment = async () => {
    if (!userId) {
      toast.error("Sign in to join the discussion.");

      return;
    }

    const body = draft.trim();

    if (!body) {
      return;
    }

    setSending(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("hub_resource_entry_comments")
        .insert({
          entry_id: entryId,

          user_id: userId,

          body,
        });

      if (error) {
        toast.error(error.message);

        return;
      }

      setDraft("");

      await load();
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <section className="relative min-w-0 overflow-hidden rounded-3xl border border-primary/15 bg-primary/[0.045] p-4 sm:p-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,hsl(var(--primary)/0.05),transparent_32%)]" />
        </div>

        <div className="relative flex min-w-0 flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <ThumbsUp className="h-4 w-4 text-primary" />
              </div>

              <p className="font-semibold">Was this resource useful?</p>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:pl-10">
              {helpfulCount === 1
                ? "1 forger found this helpful."
                : `${helpfulCount} forgers found this helpful.`}
            </p>
          </div>

          <div className="relative isolate w-full shrink-0 md:w-auto">
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
              variant={helpful ? "default" : "outline"}
              className={cn(
                "group/helpful relative z-10 w-full cursor-pointer overflow-hidden rounded-full px-5 md:w-auto md:min-w-[10.75rem]",
                "transition-[background-color,border-color,color,box-shadow,transform] duration-300",
                "active:scale-[0.97]",
                helpful && "shadow-lg shadow-primary/20",
                helpfulAnimation === "liked" && "helpful-button-liked",
                helpfulAnimation === "unliked" && "helpful-button-unliked",
              )}
              onClick={toggleHelpful}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "helpful-shimmer absolute inset-0 -z-10 opacity-0",
                  helpfulAnimation === "liked" && "helpful-shimmer-active",
                )}
              />

              <span className="relative mr-2 flex h-5 w-5 items-center justify-center">
                <ThumbsUp
                  className={cn(
                    "absolute h-4 w-4 transition-[transform,fill] duration-300",
                    helpful && "fill-current",
                    helpfulAnimation === "liked" && "helpful-icon-liked",
                    helpfulAnimation === "unliked" && "helpful-icon-unliked",
                  )}
                />
              </span>

              <span
                key={helpful ? "helpful" : "mark-helpful"}
                className={cn(
                  "inline-block whitespace-nowrap",
                  helpfulAnimation && "helpful-label-change",
                )}
              >
                {helpful ? "Helpful" : "Mark as helpful"}
              </span>
            </Button>
          </div>
        </div>
      </section>

      {userId && contributorUserId === userId && (
        <section className="mt-4 flex min-w-0 flex-col gap-4 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">You contributed this resource</p>

            <p className="mt-1 text-xs text-muted-foreground">
              Suggest an update and staff will review it before it goes live.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full cursor-pointer rounded-full md:w-auto"
            onClick={() => setEditDialogOpen(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit resource
          </Button>
        </section>
      )}

      <section className="mt-10 min-w-0 sm:mt-14">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageCircle className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Discussion</h2>

            <p className="text-sm text-muted-foreground">
              Add context, corrections or useful information.
            </p>
          </div>
        </div>

        <div className="mt-6 min-w-0 rounded-3xl border border-border/70 bg-card/80 p-3 shadow-sm sm:p-4">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            disabled={!userId}
            placeholder={
              userId
                ? "Share something useful..."
                : "Sign in to join the discussion."
            }
            className="resize-none border-0 bg-muted/30 shadow-none focus-visible:ring-1"
          />

          <div className="mt-3 flex justify-stretch sm:justify-end">
            <Button
              className="w-full cursor-pointer rounded-full sm:w-auto"
              onClick={submitComment}
              disabled={!userId || !draft.trim() || sending}
            >
              <Send className="mr-2 h-4 w-4" />
              {sending ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {comments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/70 bg-muted/10 p-6 text-center sm:p-10">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
              </div>

              <p className="mt-4 text-sm font-medium">No discussion yet</p>

              <p className="mt-1 text-xs text-muted-foreground">
                Be the first to add something useful.
              </p>
            </div>
          ) : (
            comments.map((comment) => {
              const name =
                comment.profiles?.display_name ||
                comment.profiles?.username ||
                "User";

              return (
                <article
                  key={comment.id}
                  className="min-w-0 rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm sm:p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                        <div>
                          <p className="text-sm font-medium">{name}</p>

                          {comment.profiles?.username && (
                            <p className="text-xs text-muted-foreground">
                              @{comment.profiles.username}
                            </p>
                          )}
                        </div>

                        <time className="text-[11px] text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </time>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
                        {comment.body}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <ResourceSuggestionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        sections={sections}
        defaultSectionId={resource.sectionId}
        resource={resource}
      />
    </>
  );
}
