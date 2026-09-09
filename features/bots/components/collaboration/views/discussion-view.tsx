"use client";

import { useMemo, useState } from "react";
import {
  CornerDownRight,
  MessageSquare,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCollaborationWorkspace } from "../collaboration-workspace-context";
import { ViewHeading } from "./activity-view";
import type { BotComment } from "@/features/bots/types/bot-types";

export function DiscussionView() {
  const { comments, addComment, deleteComment } = useCollaborationWorkspace();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const roots = useMemo(
    () => comments.filter((comment) => !comment.parent_id),
    [comments],
  );

  const replies = useMemo(() => {
    const map = new Map<string, BotComment[]>();
    for (const item of comments) {
      if (!item.parent_id) continue;
      const list = map.get(item.parent_id) || [];
      list.push(item);
      map.set(item.parent_id, list);
    }
    return map;
  }, [comments]);

  const send = async (parentId?: string, content?: string) => {
    const body = (content ?? text).trim();
    if (!body) return false;

    setSending(true);
    const ok = await addComment(body, parentId);
    setSending(false);

    if (ok && !parentId) setText("");
    return ok;
  };

  return (
    <div>
      <ViewHeading
        title="Discussion"
        description="Keep decisions and feedback attached to the bot instead of losing them in chat."
      />

      <div className="mb-5 rounded-[1.4rem] border border-border/60 bg-card/70 p-4 shadow-sm transition-shadow duration-200 focus-within:shadow-md">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Start a discussion…"
          className="min-h-24 resize-y"
          maxLength={2000}
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[10px] text-muted-foreground">
            Keep messages focused on decisions, review or bot content.
          </span>
          <Button
            size="sm"
            disabled={!text.trim() || sending}
            onClick={() => void send()}
            className="cursor-pointer transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {sending ? "Posting…" : "Post"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {roots.length === 0 ? (
          <div className="rounded-[1.4rem] border border-dashed border-border/60 p-10 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No discussions yet.
            </p>
          </div>
        ) : (
          roots.map((comment) => (
            <Thread
              key={comment.id}
              comment={comment}
              replies={replies.get(comment.id) || []}
              onReply={send}
              onDelete={deleteComment}
            />
          ))
        )}
      </div>
    </div>
  );
}

function Thread({
  comment,
  replies,
  onReply,
  onDelete,
}: {
  comment: BotComment;
  replies: BotComment[];
  onReply: (parentId: string, content: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [reply, setReply] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <article className="rounded-[1.4rem] border border-border/60 bg-card/65 p-4 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md">
      <CommentHeader comment={comment} onDelete={onDelete} />
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
        {comment.content}
      </p>

      <div className="mt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen((value) => !value)}
          className="group cursor-pointer transition-colors"
          aria-expanded={open}
        >
          <CornerDownRight className="mr-1.5 h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          Reply {replies.length > 0 && `(${replies.length})`}
        </Button>
      </div>

      {replies.length > 0 && (
        <div className="mt-3 space-y-3 border-l border-border/60 pl-4">
          {replies.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-muted/20 p-3 transition-colors duration-200 hover:bg-muted/30"
            >
              <CommentHeader comment={item} onDelete={onDelete} />
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {item.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-3 flex animate-in flex-col gap-2 fade-in-0 slide-in-from-top-1 duration-150 sm:flex-row">
          <Textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            className="min-h-16 resize-none"
            placeholder="Reply…"
            autoFocus
          />
          <Button
            size="sm"
            disabled={!reply.trim() || submitting}
            className="cursor-pointer transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed"
            onClick={async () => {
              setSubmitting(true);
              const ok = await onReply(comment.id, reply);
              setSubmitting(false);
              if (ok) {
                setReply("");
                setOpen(false);
              }
            }}
          >
            {submitting ? "Sending…" : "Send"}
          </Button>
        </div>
      )}
    </article>
  );
}

function CommentHeader({
  comment,
  onDelete,
}: {
  comment: BotComment;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary/10">
        {comment.profile?.avatar_url ? (
          <img
            src={comment.profile.avatar_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <UserRound className="h-3.5 w-3.5 text-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">
          {comment.profile?.display_name ||
            comment.profile?.username ||
            "Forge user"}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(comment.created_at).toLocaleString()}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 cursor-pointer text-muted-foreground opacity-60 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive hover:opacity-100 active:scale-[0.95]"
        onClick={() => void onDelete(comment.id)}
        aria-label="Delete comment"
        title="Delete comment"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
