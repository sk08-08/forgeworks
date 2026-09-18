"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDisplayBotExternalLinks, type BotExternalLink } from "@/features/bots/lib/bot-external-url";
import { BotVisitLinks } from "./bot-visit-links";
import { ArrowUpRight, Bot as BotIcon, EyeOff, Sparkles } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BotTagBadge, BotTagCountBadge } from "./bot-tag-badge";
import {
  MarkdownRenderer, MarkdownInlineRenderer,
} from "@/features/markdown/components/markdown-renderer";

interface BotDetailData {
  id: string;
  name: string;
  shortDescription?: string | null;
  short_description?: string | null;
  tags?: string[];
  rating?: string;
  imageUrl?: string | null;
  image_url?: string | null;
  hideSensitiveFields?: boolean;
  hide_sensitive_fields?: boolean;
}

interface BotDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bot: BotDetailData | null;
}

/** Fast discovery surface. Full content is fetched with fresh authorization on /bots/[id]. */
export function BotDetailModal({ open, onOpenChange, bot }: BotDetailModalProps) {
  const [visitLinks, setVisitLinks] = useState<BotExternalLink[]>([]);
  useEffect(() => {
    setVisitLinks([]);
    if (!open || !bot?.id) return;
    let cancelled = false;
    // Request only the destination from a caller-RLS-scoped row; never trust
    // potentially stale public card props or use a service-role client.
    const load = async () => {
      try {
        const { data, error } = await (createClient() as any).from("bots")
          .select("external_links")
          .eq("id", bot.id)
          .is("deleted_at", null)
          .maybeSingle();
        if (!cancelled && !error) {
          setVisitLinks(getDisplayBotExternalLinks((data as { external_links?: unknown } | null)?.external_links));
        }
      } catch {
        if (!cancelled) setVisitLinks([]);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [open, bot?.id]);
  if (!bot) return null;
  const image = bot.imageUrl || bot.image_url;
  const description = bot.shortDescription || bot.short_description || "";
  const tags = Array.isArray(bot.tags) ? bot.tags : [];
  const hidden = bot.hideSensitiveFields === true || bot.hide_sensitive_fields === true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,50rem)] w-[calc(100vw-1rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0 shadow-2xl sm:w-full">
        <div className="relative isolate h-44 shrink-0 overflow-hidden bg-gradient-to-br from-primary/20 via-muted to-fuchsia-500/10 sm:h-56">
          {image ? (
            <>
              <img src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-2xl" />
              <img src={image} alt={bot.name} className="relative h-full w-full object-contain p-3 drop-shadow-xl" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center"><BotIcon className="h-16 w-16 text-primary/35" aria-hidden="true" /></div>
          )}
          <span className="absolute bottom-3 left-4 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/90 px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" /> Character preview
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <DialogHeader className="min-w-0 space-y-2 text-left">
            <div className="flex min-w-0 flex-wrap items-start gap-2 pr-7">
              <DialogTitle className="min-w-0 flex-1 break-words text-2xl font-bold leading-tight tracking-tight">
                <MarkdownInlineRenderer content={bot.name || "Untitled Bot"} />
              </DialogTitle>
              {bot.rating && <Badge variant={bot.rating === "NSFW" ? "destructive" : "secondary"} className="shrink-0">{bot.rating}</Badge>}
            </div>
            <DialogDescription className="sr-only">Preview of {bot.name || "Untitled Bot"}</DialogDescription>
          </DialogHeader>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 6).map((tag) => <BotTagBadge key={tag} tag={tag} className="text-[11px]" />)}
              {tags.length > 6 && <BotTagCountBadge count={tags.length - 6} className="text-[11px]" />}
            </div>
          )}

          {description ? (
            <section aria-label="Description" className="min-w-0 rounded-xl border border-border/60 bg-muted/20 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">About this character</h3>
              <MarkdownRenderer content={description} className="max-h-44 min-w-0 overflow-hidden break-words text-sm leading-relaxed [&>*:last-child]:mb-0 [&_a]:break-all [&_pre]:overflow-x-auto" />
            </section>
          ) : (
            <p className="text-sm italic text-muted-foreground">The creator hasn’t added a description yet.</p>
          )}
          {hidden && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <EyeOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Some character details are hidden by the creator.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border/70 bg-background/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <Button type="button" variant="outline" className="w-full cursor-pointer sm:w-auto" onClick={() => onOpenChange(false)}>Close</Button>
          {visitLinks.length > 0 && <BotVisitLinks links={visitLinks} className="w-full sm:w-auto" onVisit={() => onOpenChange(false)} />}
          <Button asChild className="w-full cursor-pointer sm:w-auto">
            <Link href={`/bots/${encodeURIComponent(bot.id)}`} onClick={() => onOpenChange(false)}>
              View Bot <ArrowUpRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
