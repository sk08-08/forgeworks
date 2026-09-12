import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Boxes,
  CircleDot,
  Clock3,
  FolderKanban,
  Globe2,
  LibraryBig,
  Network,
  NotebookTabs,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAtlasOverviewAction,
  type AtlasRecentItem,
} from "@/features/atlas/actions/overview";
import { CreateEntryDialog } from "@/features/atlas/components/entries/create-entry-dialog";
import { EntryTypeBadge } from "@/features/atlas/components/entries/entry-type-badge";

const quickCards = [
  {
    key: "entries" as const,
    title: "Entries",
    description:
      "Create the people, places, events, objects, and ideas that make up your canon.",
    icon: LibraryBig,
    href: "/atlas/entries",
  },
  {
    key: "worlds" as const,
    title: "Worlds",
    description:
      "Bring related Entries together into settings, universes, series, or projects.",
    icon: Globe2,
    href: "/atlas/worlds",
  },
  {
    key: "collections" as const,
    title: "Collections",
    description:
      "Group Entries into flexible sets for casts, arcs, research, or references.",
    icon: FolderKanban,
    href: "/atlas/collections",
  },
  {
    key: "lorebooks" as const,
    title: "Lorebooks",
    description:
      "Assemble reusable knowledge and control how each Entry behaves when exported.",
    icon: NotebookTabs,
    href: "/atlas/lorebooks",
  },
];

function RecentIcon({ kind }: { kind: AtlasRecentItem["kind"] }) {
  if (kind === "world") return <Globe2 className="h-4 w-4" />;
  if (kind === "collection") return <FolderKanban className="h-4 w-4" />;
  if (kind === "lorebook") return <NotebookTabs className="h-4 w-4" />;
  return <LibraryBig className="h-4 w-4" />;
}

function relativeTime(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Recently";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

export async function AtlasHomeView() {
  const overview = await getAtlasOverviewAction();
  const stats = overview.success
    ? overview.data.stats
    : { entries: 0, worlds: 0, collections: 0, lorebooks: 0 };
  const recent = overview.success ? overview.data.recent : [];

  return (
    <div className="mx-auto w-full max-w-[92rem] space-y-8 p-3 pb-20 sm:p-6 md:p-8 lg:p-10">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-0 -z-20 bg-linear-to-br from-primary/[0.09] via-background/10 to-fuchsia-500/[0.05]" />

        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-24 -top-28 h-80 w-80 rounded-full bg-primary/15 blur-[100px]" />
          <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-[120px]" />

          <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:42px_42px]" />
        </div>

        <div className="grid xl:min-h-[26rem] xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div className="flex min-w-0 flex-col justify-center p-5 sm:p-8 lg:p-10 xl:p-12">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                <Network className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold tracking-tight">Atlas</p>
                <p className="text-xs text-muted-foreground">
                  Worldbuilding, canon & reusable knowledge
                </p>
              </div>
            </div>

            <h1 className="max-w-3xl text-balance text-3xl font-bold tracking-[-0.04em] sm:text-4xl lg:text-[3.25rem] lg:leading-[1.05]">
              Build a canon you can actually reuse.
            </h1>

            <p className="mt-5 max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
              Create characters, places, events, factions, lore, and
              relationships once, then reuse that knowledge across Worlds,
              Collections, Lorebooks, and your creator workflow.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <div className="w-full sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">
                <CreateEntryDialog />
              </div>

              <Button
                asChild
                variant="outline"
                className="w-full cursor-pointer rounded-xl border-border/70 bg-background/60 hover:bg-muted/60 sm:w-auto"
              >
                <Link href="/atlas/lorebooks">
                  <NotebookTabs className="mr-2 h-4 w-4" />
                  Open Lorebooks
                </Link>
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CircleDot className="h-3.5 w-3.5 text-primary" />
                Create once
              </span>

              <span className="inline-flex items-center gap-1.5">
                <CircleDot className="h-3.5 w-3.5 text-primary" />
                Organize freely
              </span>

              <span className="inline-flex items-center gap-1.5">
                <CircleDot className="h-3.5 w-3.5 text-primary" />
                Reuse everywhere
              </span>
            </div>
          </div>

          <div className="relative flex min-h-[18rem] items-center border-t border-border/60 bg-background/30 p-5 sm:min-h-[20rem] sm:p-7 xl:min-h-[22rem] xl:border-l xl:border-t-0 xl:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.09),transparent_65%)]" />

            <div className="relative mx-auto w-full max-w-md">
              <div className="rounded-3xl border border-border/70 bg-card/75 p-4 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-5">
                <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <LibraryBig className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold">Your knowledge</p>
                      <p className="text-xs text-muted-foreground">
                        Reusable across Atlas
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                    Connected
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-background/45 p-3 transition-colors hover:border-primary/25 hover:bg-primary/[0.04]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <LibraryBig className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium">
                        Wednesday Addams
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Character Entry
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>

                  <div className="ml-5 border-l border-dashed border-primary/30 pl-4">
                    <div className="rounded-2xl border border-border/60 bg-background/45 p-3">
                      <div className="flex items-center gap-2">
                        <Globe2 className="h-4 w-4 text-primary" />

                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium">
                            Wednesday Universe
                          </p>
                          <p className="text-xs text-muted-foreground">World</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-5 border-l border-dashed border-primary/30 pl-4">
                    <div className="rounded-2xl border border-border/60 bg-background/45 p-3">
                      <div className="flex items-center gap-2">
                        <NotebookTabs className="h-4 w-4 text-primary" />

                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            Nevermore Lorebook
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Reuses the same Entry
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.05] px-3 py-2.5">
                  <p className="text-xs leading-5 text-muted-foreground">
                    Knowledge stays canonical. Worlds and Lorebooks add context
                    without duplicating the Entry.
                  </p>
                </div>
              </div>

              <div className="absolute -right-3 -top-4 hidden rounded-xl border border-border/60 bg-card/80 px-3 py-2 shadow-lg backdrop-blur sm:block">
                <div className="flex items-center gap-2">
                  <Network className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-medium">Relations</span>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-3 hidden rounded-xl border border-border/60 bg-card/80 px-3 py-2 shadow-lg backdrop-blur sm:block">
                <div className="flex items-center gap-2">
                  <BookOpenText className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-medium">
                    Reusable knowledge
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Explore
          </p>

          <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Your workspace
            </h2>

            <p className="max-w-xl text-sm text-muted-foreground">
              Jump into the part of Atlas you want to work on.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {quickCards.map(({ key, title, description, icon: Icon, href }) => (
            <Link key={title} href={href} className="group min-w-0">
              <Card className="h-full overflow-hidden border-border/70 bg-card/80 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/35 group-hover:bg-card group-hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-primary/8 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-2xl font-semibold tabular-nums tracking-tight">
                      {stats[key]}
                    </span>
                  </div>
                  <CardTitle className="flex min-w-0 items-center justify-between gap-3 text-base">
                    {title}
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <Card className="overflow-hidden border-border/70 bg-card/85 shadow-md">
          <CardHeader className="flex flex-col gap-3 border-b border-border/50 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                <Clock3 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <CardTitle className="text-lg">Continue building</CardTitle>

                {recent.length > 0 ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Pick up where you left off.
                  </p>
                ) : null}
              </div>
            </div>

            {recent.length > 0 ? (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full cursor-pointer justify-between rounded-xl sm:w-auto sm:justify-center"
              >
                <Link href="/atlas/entries">
                  <span className="hidden sm:inline">Browse library</span>
                  <ArrowRight className="h-4 w-4 sm:ml-2" />
                </Link>
              </Button>
            ) : null}
          </CardHeader>

          <CardContent className="p-0">
            {recent.length === 0 ? (
              <div className="m-4 rounded-2xl border border-dashed border-border/70 bg-muted/15 p-8 text-center sm:m-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background/60">
                  <LibraryBig className="h-6 w-6 text-muted-foreground" />
                </div>

                <h3 className="mt-4 font-medium">Your Atlas is empty</h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Start with one person, place, event, or idea. You can organize
                  it later without committing to a World first.
                </p>

                <div className="mt-5 w-full sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">
                  <CreateEntryDialog />
                </div>
              </div>
            ) : (
              <div>
                <div className="divide-y divide-border/60">
                  {recent.map((item) => (
                    <Link
                      key={`${item.kind}:${item.id}`}
                      href={item.href}
                      className="group flex min-w-0 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/35 sm:px-5"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/35 text-muted-foreground transition-colors group-hover:border-primary/20 group-hover:bg-primary/10 group-hover:text-primary">
                        <RecentIcon kind={item.kind} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                            {item.title}
                          </p>

                          {item.kind === "entry" && item.entryType ? (
                            <div className="hidden shrink-0 sm:block">
                              <EntryTypeBadge kind={item.entryType} />
                            </div>
                          ) : null}
                        </div>

                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="hidden text-xs text-muted-foreground sm:block">
                          {relativeTime(item.updatedAt)}
                        </span>

                        <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Build freely. Organize when it helps.
            </h2>

            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Atlas keeps your knowledge reusable without forcing it into a
              single structure.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            <div className="rounded-2xl border border-border/65 bg-card/65 p-4 transition-colors hover:border-primary/20 hover:bg-card/85">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LibraryBig className="h-4 w-4" />
              </div>

              <h3 className="text-sm font-semibold">Start anywhere</h3>

              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                An Entry does not need a World or Lorebook to exist.
              </p>
            </div>

            <div className="rounded-2xl border border-border/65 bg-card/65 p-4 transition-colors hover:border-primary/20 hover:bg-card/85">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Boxes className="h-4 w-4" />
              </div>

              <h3 className="text-sm font-semibold">Reuse what you build</h3>

              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                One Entry can belong to multiple Worlds, Collections, and
                Lorebooks.
              </p>
            </div>

            <div className="rounded-2xl border border-border/65 bg-card/65 p-4 transition-colors hover:border-primary/20 hover:bg-card/85">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpenText className="h-4 w-4" />
              </div>

              <h3 className="text-sm font-semibold">Keep context separate</h3>

              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                Lorebook activation belongs to the membership, not the canonical
                Entry.
              </p>
            </div>

            <div className="rounded-2xl border border-border/65 bg-card/65 p-4 transition-colors hover:border-primary/20 hover:bg-card/85">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Network className="h-4 w-4" />
              </div>

              <h3 className="text-sm font-semibold">Connect your canon</h3>

              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                Relations connect ideas without forcing your knowledge into a
                rigid hierarchy.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
