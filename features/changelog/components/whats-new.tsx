"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BellDot,
  Loader2,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LatestEntry = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  published_at: string | null;
  release_type: string;
  areas: string[];
};

function shortDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function WhatsNewButton({
  compact = true,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LatestEntry[]>([]);
  const [unread, setUnread] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserId(user?.id || null);

    const { data: latest } = await supabase
      .from("changelog_entries")
      .select(
        "id, slug, title, summary, published_at, release_type, areas",
      )
      .eq("status", "published")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(4);

    const nextEntries = (latest || []) as LatestEntry[];
    setEntries(nextEntries);

    if (!user) {
      setUnread(0);
      setLoading(false);
      return;
    }

    const { data: readState } = await supabase
      .from("changelog_reads")
      .select("last_seen_published_at")
      .eq("user_id", user.id)
      .maybeSingle();

    let countQuery = supabase
      .from("changelog_entries")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString());

    if (readState?.last_seen_published_at) {
      countQuery = countQuery.gt(
        "published_at",
        readState.last_seen_published_at,
      );
    }

    const { count } = await countQuery;
    setUnread(count || 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markSeen = useCallback(async () => {
    if (!userId || entries.length === 0) return;

    const newest = entries[0];
    if (!newest?.published_at) return;

    const supabase = createClient();
    await supabase.from("changelog_reads").upsert(
      {
        user_id: userId,
        last_seen_entry_id: newest.id,
        last_seen_published_at: newest.published_at,
        seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    setUnread(0);
  }, [entries, userId]);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (next) void markSeen();
  };

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={compact ? "icon-sm" : "sm"}
          className={cn(
            "relative cursor-pointer",
            !compact && "justify-start gap-2",
            className,
          )}
          aria-label={
            unread > 0
              ? `What's new, ${unread} unread update${unread === 1 ? "" : "s"}`
              : "What's new"
          }
        >
          <Sparkles className="h-4 w-4 text-primary" />
          {!compact && <span>What&apos;s new</span>}
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-sm">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden p-0"
      >
        <div className="relative overflow-hidden border-b p-4">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/15 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-primary">
                <BellDot className="h-3.5 w-3.5" />
                WHAT&apos;S NEW
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Recent changes around Forgeworks.
              </p>
            </div>
            {unread > 0 && (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                {unread} UNREAD
              </span>
            )}
          </div>
        </div>

        <div className="max-h-[min(24rem,calc(100svh-10rem))] overflow-y-auto p-2">
          {loading ? (
            <div className="flex min-h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm font-medium">Nothing published yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The release archive is getting ready.
              </p>
            </div>
          ) : (
            entries.map((entry) => (
              <Link
                key={entry.id}
                href={`/changelog#${entry.slug}`}
                onClick={() => setOpen(false)}
                className="group block rounded-xl px-3 py-3 transition-colors hover:bg-muted/70"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <span>{shortDate(entry.published_at)}</span>
                  <span>•</span>
                  <span>{entry.release_type}</span>
                </div>
                <div className="mt-1.5 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">{entry.title}</p>
                    {entry.summary && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {entry.summary}
                      </p>
                    )}
                  </div>
                  <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="border-t p-2">
          <Button asChild variant="ghost" className="w-full justify-between">
            <Link href="/changelog" onClick={() => setOpen(false)}>
              View full changelog
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
