import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Bot as BotIcon,
  EyeOff,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BotTagBadge } from "@/features/bots/components/bot-tag-badge";
import {
  MarkdownInlineRenderer,
  MarkdownRenderer,
} from "@/features/markdown/components/markdown-renderer";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";
import { loadBotPage } from "@/features/bots/lib/load-bot-page";
import { BotPageActions } from "@/features/bots/components/bot-page-actions";
import { BotPageContent } from "@/features/bots/components/bot-page-content";
import { BotArtworkViewer } from "@/features/bots/components/bot-artwork-viewer";
import { BotVisitLinks } from "@/features/bots/components/bot-visit-links";
import styles from "./bot-page.module.css";
import { getDisplayBotExternalLinks } from "@/features/bots/lib/bot-external-url";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await loadBotPage(id);
  // Private/follower-only metadata should never reveal names or image URLs to crawlers.
  if (!result || result.visibility !== "public") {
    return {
      title: "Bot · Forgeworks",
      robots: { index: false, follow: false },
    };
  }
  const title = stripMarkdownToText(result.bot.name || "Untitled Bot");
  const description = stripMarkdownToText(
    result.bot.short_description || "",
  ).slice(0, 160);
  return {
    title: `${title} · Forgeworks`,
    description: description || `Explore ${title} on Forgeworks.`,
    openGraph: {
      title,
      description: description || `Explore ${title} on Forgeworks.`,
      type: "article",
      images: result.bot.image_url ? [result.bot.image_url] : [],
    },
  };
}

export default async function BotPage({ params }: Props) {
  const { id } = await params;
  const result = await loadBotPage(id);
  if (!result) notFound();
  const { bot, creator, visibility } = result;
  const hidden = bot.hide_sensitive_fields === true;
  const visitLinks = getDisplayBotExternalLinks(
    (bot as { external_links?: unknown }).external_links,
  );
  const tags = Array.isArray(bot.tags) ? bot.tags : [];
  const greetings: string[] = Array.isArray(bot.alternate_greetings)
    ? bot.alternate_greetings.filter(
        (g: unknown): g is string => typeof g === "string" && Boolean(g.trim()),
      )
    : [];
  const creatorHandle = creator?.slug || creator?.username;
  const creatorName = creator?.display_name || creator?.username || "Creator";
  const hasDetails =
    !hidden &&
    Boolean(
      bot.personality?.trim() ||
      bot.scenario?.trim() ||
      bot.first_message?.trim() ||
      greetings.length ||
      bot.example_dialogues?.trim(),
    );
  const messages = [bot.first_message, ...greetings].filter(
    (message): message is string =>
      typeof message === "string" && Boolean(message.trim()),
  );
  // Only public, active bots from this creator are suggested. The caller's RLS
  // remains active; never use service-role queries for these recommendations.
  const related =
    creatorHandle && visibility === "public"
      ? await loadRelatedPublicBots(bot.user_id, bot.id, tags)
      : [];

  return (
    <main className={`${styles.page} min-h-dvh min-w-0 pb-20`}>
      <div className={styles.ambient} aria-hidden="true" />
      <div className="relative mx-auto w-full min-w-0 max-w-7xl space-y-5 px-3 py-5 min-[400px]:px-4 sm:space-y-6 sm:px-6 sm:py-10 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md py-1 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Forgeworks
          </Link>
          <span aria-hidden="true">/</span>
          <span>Bots</span>
          <span aria-hidden="true">/</span>
          <span className="max-w-52 truncate text-foreground">
            {stripMarkdownToText(bot.name || "Untitled Bot")}
          </span>
        </nav>

        <header
          className={`${styles.hero} isolate grid min-w-0 overflow-hidden rounded-3xl border border-primary/15 bg-card/95 shadow-xl shadow-primary/5 grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]`}
        >
          <div
            className={`${styles.heroArt} relative isolate flex min-h-64 items-center justify-center overflow-hidden bg-gradient-to-br from-primary/20 via-muted to-fuchsia-500/15 sm:min-h-80 lg:min-h-[34rem]`}
          >
            {bot.image_url ? (
              <>
                <img
                  src={bot.image_url}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-3xl"
                />
                <BotArtworkViewer
                  imageUrl={bot.image_url}
                  botName={stripMarkdownToText(bot.name || "Untitled Bot")}
                />
              </>
            ) : (
              <BotIcon
                className="h-24 w-24 text-primary/30"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-4 p-4 min-[400px]:p-5 sm:gap-5 sm:p-8 lg:p-12">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={bot.rating === "NSFW" ? "destructive" : "secondary"}
              >
                {bot.rating === "NSFW" ? "NSFW" : "SFW"}
              </Badge>
              {visibility !== "public" && (
                <Badge variant="outline" className="capitalize">
                  {visibility === "followers" ? "Followers only" : "Private"}
                </Badge>
              )}
            </div>
            <h1 className="min-w-0 wrap-anywhere break-words text-2xl font-bold leading-tight tracking-tight min-[400px]:text-3xl sm:text-4xl lg:text-5xl">
              <MarkdownInlineRenderer content={bot.name || "Untitled Bot"} />
            </h1>
            {creator ? (
              creatorHandle ? (
                <Link
                  href={`/profile/${encodeURIComponent(creatorHandle)}`}
                  className="inline-flex w-fit items-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <UserRound
                      className="h-8 w-8 rounded-full bg-muted p-1.5"
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    By{" "}
                    <strong className="font-medium text-foreground">
                      {creatorName}
                    </strong>
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  By {creatorName}
                </p>
              )
            ) : null}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag: string) => (
                  <BotTagBadge key={tag} tag={tag} />
                ))}
              </div>
            )}
            {bot.short_description ? (
              <MarkdownRenderer
                content={bot.short_description}
                className="min-w-0 break-words text-sm leading-7 text-foreground/85 [&>*:last-child]:mb-0 [&_a]:break-all [&_pre]:overflow-x-auto"
              />
            ) : (
              <p className="text-sm italic text-muted-foreground">
                No description yet.
              </p>
            )}
            {visitLinks.length > 0 && (
              <BotVisitLinks links={visitLinks} className="w-full sm:w-fit" />
            )}
            <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              {bot.created_at && (
                <span>
                  Created{" "}
                  {new Date(bot.created_at).toLocaleDateString("en-US", {
                    dateStyle: "medium",
                  })}
                </span>
              )}
              {bot.updated_at && (
                <span>
                  Updated{" "}
                  {new Date(bot.updated_at).toLocaleDateString("en-US", {
                    dateStyle: "medium",
                  })}
                </span>
              )}
            </div>
          </div>
        </header>

        <BotPageActions visibility={visibility} />

        {hidden ? (
          <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
            <EyeOff
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>
              The creator has chosen to hide character definitions, greetings
              and example dialogues.
            </span>
          </div>
        ) : hasDetails ? (
          <div className="min-w-0 space-y-6">
            <BotPageContent
              personality={bot.personality}
              scenario={bot.scenario}
              messages={messages}
              examples={bot.example_dialogues}
            />
            {creatorHandle && related.length === 0 && (
              <div
                className={`${styles.reveal} flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/85 px-5 py-4 text-sm transition-colors hover:border-primary/30`}
              >
                <span className="text-muted-foreground">
                  Discover more characters by{" "}
                  <span className="font-semibold text-foreground">
                    {creatorName}
                  </span>
                </span>
                <Link
                  href={`/profile/${encodeURIComponent(creatorHandle)}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-primary underline-offset-4 transition-all hover:gap-2.5 hover:underline"
                >
                  View creator profile{" "}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-8 text-center text-sm text-muted-foreground">
            There are no additional character details yet.
          </div>
        )}
        {related.length > 0 && (
          <section
            aria-labelledby="more-bots-heading"
            className={`${styles.creatorSpotlight} ${styles.reveal} min-w-0 overflow-hidden rounded-3xl border border-border/70 p-4 shadow-sm sm:p-6 lg:p-7`}
          >
            <div className="mb-5 flex min-w-0 flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {creator?.avatar_url ? (
                  <img
                    src={creator.avatar_url}
                    alt=""
                    loading="lazy"
                    className="h-11 w-11 shrink-0 rounded-2xl border border-primary/20 object-cover sm:h-12 sm:w-12"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary sm:h-12 sm:w-12">
                    <UserRound className="h-5 w-5" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.17em] text-primary">
                    Keep exploring
                  </p>
                  <h2
                    id="more-bots-heading"
                    className="break-words text-lg font-semibold tracking-tight sm:text-xl"
                  >
                    More from {creatorName}
                  </h2>
                </div>
              </div>
              {creatorHandle && (
                <Link
                  href={`/profile/${encodeURIComponent(creatorHandle)}`}
                  className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary/50 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-auto"
                >
                  View creator profile{" "}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
              {related.map((other) => (
                <Link
                  key={other.id}
                  href={`/bots/${other.id}`}
                  className={`${styles.creatorSpotlightCard} group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                >
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-primary/5 sm:aspect-[5/4]">
                    {other.image_url ? (
                      <img
                        src={other.image_url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transform-none"
                      />
                    ) : (
                      <BotIcon
                        className="h-9 w-9 text-primary/35"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-black/55 text-white backdrop-blur-sm"
                      aria-hidden="true"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center p-3 sm:p-3.5">
                    <p className="line-clamp-2 break-words text-xs font-semibold transition-colors group-hover:text-primary sm:text-sm">
                      {stripMarkdownToText(other.name || "Untitled Bot")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

/**
 * Deterministic 32-bit hash: rotation is stable within a UTC day and differs
 * across character pages. No user tracking, Math.random or client state.
 */
function spotlightHash(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

type SpotlightCandidate = {
  id: string;
  name: string;
  image_url: string | null;
  tags: string[] | null;
};

/**
 * Public-only, RLS-scoped recommendations. Samples at most 64 candidates even
 * for a creator with thousands of bots, then balances shared tags with variety.
 * This is a deterministic discovery sampler, not a popularity recommendation.
 */
async function loadRelatedPublicBots(
  ownerId: string,
  currentBotId: string,
  currentTags: string[],
): Promise<Array<Pick<SpotlightCandidate, "id" | "name" | "image_url">>> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const baseQuery = () =>
    supabase
      .from("bots")
      .select("id,name,image_url,tags")
      .eq("user_id", ownerId)
      .eq("visibility", "public")
      .is("deleted_at", null)
      .neq("id", currentBotId);

  // Count is a HEAD request: no character definitions or candidate rows loaded.
  const { count, error: countError } = await supabase
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ownerId)
    .eq("visibility", "public")
    .is("deleted_at", null)
    .neq("id", currentBotId);
  if (countError || !count) return [];

  // The same bot page gives the same suggestions all day. Tomorrow's window
  // changes without requiring a new column, scheduled job or database migration.
  const day = new Date().toISOString().slice(0, 10);
  const seed = `${ownerId}:${currentBotId}:${day}`;
  const windowSize = Math.min(32, count);
  const starts =
    count <= 64
      ? [0]
      : [
          spotlightHash(`${seed}:window-a`) % (count - windowSize + 1),
          spotlightHash(`${seed}:window-b`) % (count - windowSize + 1),
        ];
  // Prefer two distinct areas of the creator's collection when it is large.
  if (starts.length === 2 && Math.abs(starts[0] - starts[1]) < windowSize) {
    starts[1] = starts[0] < count / 2 ? count - windowSize : 0;
  }

  const pages = await Promise.all(
    starts.map((start) =>
      baseQuery()
        .order("id", { ascending: true })
        .range(
          start,
          Math.min(count - 1, start + (count <= 64 ? count : windowSize) - 1),
        ),
    ),
  );
  // Fail closed: an RLS/query error must never be bypassed using service role.
  if (pages.some((page) => page.error)) return [];

  const candidates = Array.from(
    new Map(
      pages
        .flatMap((page) => page.data || [])
        .filter((candidate) => candidate.id !== currentBotId)
        .map((candidate) => [candidate.id, candidate] as const),
    ).values(),
  ) as SpotlightCandidate[];
  if (candidates.length === 0) return [];

  const normalizedTags = new Set(
    currentTags
      .filter((tag: unknown): tag is string => typeof tag === "string")
      .map((tag) => tag.trim().toLocaleLowerCase())
      .filter(Boolean),
  );
  const scored = candidates.map((candidate) => ({
    candidate,
    overlap: new Set(
      (candidate.tags || [])
        .filter((tag: unknown): tag is string => typeof tag === "string")
        .map((tag) => tag.trim().toLocaleLowerCase())
        .filter((tag) => normalizedTags.has(tag)),
    ).size,
    shuffle: spotlightHash(`${seed}:candidate:${candidate.id}`),
  }));

  // Relevant discovery: two shared-tag characters, when available. The other
  // slots use a broader seeded rotation so similar characters don't dominate.
  const related = scored
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.shuffle - b.shuffle)
    .slice(0, 2);
  const picked = new Set(related.map((item) => item.candidate.id));
  const discovery = scored
    .filter((item) => !picked.has(item.candidate.id))
    .sort((a, b) => a.shuffle - b.shuffle)
    .slice(0, 4 - related.length);
  // Re-sort the final mix so relevance does not always occupy the first cards.
  return [...related, ...discovery]
    .sort((a, b) => a.shuffle - b.shuffle)
    .map(({ candidate }) => ({
      id: candidate.id,
      name: candidate.name,
      image_url: candidate.image_url,
    }));
}
