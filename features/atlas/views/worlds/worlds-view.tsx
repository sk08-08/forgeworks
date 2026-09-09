"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Grid2X2,
  Globe2,
  LibraryBig,
  List,
  Lock,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CreateWorldDialog } from "@/features/atlas/components/worlds/create-world-dialog";
import {
  listAtlasWorldsAction,
  type AtlasWorldRecord,
} from "@/features/atlas/actions/worlds";

type SortMode = "updated" | "title" | "entries" | "bots";

type VisibilityFilter = "all" | "private" | "public";

type ViewMode = "grid" | "list";

function relativeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const diff = Date.now() - date.getTime();

  if (diff < 60_000) return "just now";

  if (diff < 3_600_000) {
    return `${Math.floor(diff / 60_000)}m ago`;
  }

  if (diff < 86_400_000) {
    return `${Math.floor(diff / 3_600_000)}h ago`;
  }

  if (diff < 604_800_000) {
    return `${Math.floor(diff / 86_400_000)}d ago`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(date);
}

function WorldGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border/60 bg-card/60 p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="h-11 w-11 animate-pulse rounded-xl bg-muted/30" />

            <div className="h-5 w-16 animate-pulse rounded-full bg-muted/25" />
          </div>

          <div className="mt-5 h-5 w-44 animate-pulse rounded-lg bg-muted/30" />

          <div className="mt-4 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-muted/25" />
            <div className="h-3 w-10/12 animate-pulse rounded bg-muted/25" />
            <div className="h-3 w-7/12 animate-pulse rounded bg-muted/25" />
          </div>

          <div className="mt-5 flex gap-2">
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted/25" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-muted/25" />
          </div>
        </div>
      ))}
    </div>
  );
}

function WorldListSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-border/50 p-4 last:border-b-0"
        >
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-muted/30" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-44 animate-pulse rounded bg-muted/30" />
            <div className="h-3 w-72 max-w-full animate-pulse rounded bg-muted/25" />
          </div>

          <div className="hidden h-5 w-20 animate-pulse rounded-full bg-muted/25 sm:block" />
        </div>
      ))}
    </div>
  );
}

function VisibilityBadge({
  visibility,
}: {
  visibility: AtlasWorldRecord["visibility"];
}) {
  if (visibility === "public") {
    return (
      <Badge
        variant="outline"
        className="border-primary/20 bg-primary/[0.06] text-[10px] font-medium text-primary"
      >
        <Globe2 className="mr-1 h-3 w-3" />
        Public
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="text-[10px] font-medium text-muted-foreground"
    >
      <Lock className="mr-1 h-3 w-3" />
      Private
    </Badge>
  );
}

export function WorldsView() {
  const [worlds, setWorlds] = useState<AtlasWorldRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [sort, setSort] = useState<SortMode>("updated");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const load = useCallback(async () => {
    setLoading(true);

    const result = await listAtlasWorldsAction();

    if (!result.success) {
      toast.error(result.error);
      setWorlds([]);
    } else {
      setWorlds(result.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalEntryLinks = useMemo(
    () => worlds.reduce((sum, world) => sum + world.entryCount, 0),
    [worlds],
  );

  const totalBotLinks = useMemo(
    () => worlds.reduce((sum, world) => sum + world.botCount, 0),
    [worlds],
  );

  const publicWorlds = useMemo(
    () => worlds.filter((world) => world.visibility === "public").length,
    [worlds],
  );

  const visibleWorlds = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const result = worlds.filter((world) => {
      if (visibility !== "all" && world.visibility !== visibility) {
        return false;
      }

      if (!needle) return true;

      return [world.title, world.description, world.loreSummary, world.slug]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    result.sort((a, b) => {
      if (sort === "title") {
        return a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        });
      }

      if (sort === "entries") {
        return b.entryCount - a.entryCount || a.title.localeCompare(b.title);
      }

      if (sort === "bots") {
        return b.botCount - a.botCount || a.title.localeCompare(b.title);
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return result;
  }, [worlds, query, visibility, sort]);

  const activeFilters = query.trim().length > 0 || visibility !== "all";

  const clearFilters = () => {
    setQuery("");
    setVisibility("all");
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 p-4 pb-16 sm:p-6 md:p-8 lg:p-10">
      {/* Header */}
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-border/70 bg-card/85 shadow-md">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-primary/[0.07] via-transparent to-fuchsia-500/[0.035]" />

        <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between lg:p-8">
          <div className="min-w-0 max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Globe2 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold">Worlds</p>

                <p className="text-xs text-muted-foreground">
                  {worlds.length} {worlds.length === 1 ? "World" : "Worlds"} in
                  your workspace
                </p>
              </div>
            </div>

            <h1 className="text-balance text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
              Give your knowledge a place to belong.
            </h1>

            <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              Bring related Entries and Bots together into settings, universes,
              series, or projects while keeping the underlying knowledge
              reusable everywhere else.
            </p>
          </div>

          <div className="shrink-0">
            <CreateWorldDialog />
          </div>
        </div>

        {/* Compact summary */}
        <div className="grid border-t border-border/50 sm:grid-cols-4">
          <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4 sm:border-b-0 sm:border-r sm:px-6">
            <Globe2 className="h-4 w-4 text-primary" />

            <div>
              <p className="text-lg font-semibold tabular-nums">
                {worlds.length}
              </p>
              <p className="text-[11px] text-muted-foreground">Worlds</p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4 sm:border-b-0 sm:border-r sm:px-6">
            <LibraryBig className="h-4 w-4 text-primary" />

            <div>
              <p className="text-lg font-semibold tabular-nums">
                {totalEntryLinks}
              </p>
              <p className="text-[11px] text-muted-foreground">Entry links</p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4 sm:border-b-0 sm:border-r sm:px-6">
            <Bot className="h-4 w-4 text-primary" />

            <div>
              <p className="text-lg font-semibold tabular-nums">
                {totalBotLinks}
              </p>
              <p className="text-[11px] text-muted-foreground">Bot links</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
            <Globe2 className="h-4 w-4 text-primary" />

            <div>
              <p className="text-lg font-semibold tabular-nums">
                {publicWorlds}
              </p>
              <p className="text-[11px] text-muted-foreground">Public</p>
            </div>
          </div>
        </div>
      </section>

      {/* Library controls */}
      <section className="overflow-hidden rounded-2xl border border-border/65 bg-card/65 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/50 p-3 sm:p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Worlds by title, description, lore, or slug..."
              className="h-10 min-h-10 rounded-xl border-border/65 bg-background/60 pl-9 pr-9"
            />

            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Select
              value={visibility}
              onValueChange={(value) =>
                setVisibility(value as VisibilityFilter)
              }
            >
              <SelectTrigger className="h-10 min-h-10 min-w-44 flex-1 cursor-pointer rounded-xl border-border/65 bg-background/60 px-3 py-0 sm:flex-none">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All visibility</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sort}
              onValueChange={(value) => setSort(value as SortMode)}
            >
              <SelectTrigger className="h-10 min-h-10 min-w-44 flex-1 cursor-pointer rounded-xl border-border/65 bg-background/60 px-3 py-0 sm:flex-none">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="updated">Recently updated</SelectItem>

                <SelectItem value="title">Title A–Z</SelectItem>

                <SelectItem value="entries">Most Entries</SelectItem>

                <SelectItem value="bots">Most Bots</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex h-10 items-center rounded-xl border border-border/65 bg-background/60 p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-label="Grid view"
              >
                <Grid2X2 className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              <strong className="font-medium text-foreground">
                {visibleWorlds.length}
              </strong>{" "}
              {visibleWorlds.length === 1 ? "World" : "Worlds"}
            </span>

            {visibility !== "all" ? (
              <>
                <span className="text-border">•</span>

                <span className="capitalize">{visibility}</span>
              </>
            ) : null}

            {query.trim() ? (
              <>
                <span className="text-border">•</span>

                <span className="max-w-52 truncate">
                  Results for “{query.trim()}”
                </span>
              </>
            ) : null}
          </div>

          {activeFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 w-fit cursor-pointer rounded-lg px-2 text-xs"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear filters
            </Button>
          ) : null}
        </div>
      </section>

      {/* Results */}
      {loading ? (
        viewMode === "grid" ? (
          <WorldGridSkeleton />
        ) : (
          <WorldListSkeleton />
        )
      ) : visibleWorlds.length === 0 ? (
        <Card className="overflow-hidden border-dashed border-border/70 bg-muted/10 shadow-none">
          <CardContent className="px-5 py-14 text-center sm:py-16">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background/60">
              <Globe2 className="h-6 w-6 text-muted-foreground" />
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              {worlds.length === 0
                ? "Create your first World"
                : "No Worlds match these filters"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {worlds.length === 0
                ? "Use Worlds to bring Entries and Bots together around a shared setting, project, continuity, series, or universe."
                : "Try another search, change the visibility filter, or clear the current filters."}
            </p>

            {worlds.length === 0 ? (
              <div className="mt-5">
                <CreateWorldDialog />
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="mt-5 cursor-pointer rounded-xl"
              >
                <X className="mr-2 h-4 w-4" />
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="max-h-[68vh] overflow-y-auto px-1 pt-1">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleWorlds.map((world) => (
              <Link
                key={world.id}
                href={`/atlas/worlds/${world.id}`}
                className="group min-w-0"
              >
                <Card className="relative h-full overflow-hidden border-border/70 bg-card/80 shadow-sm transition-all duration-200 group-hover:-translate-y-px group-hover:border-primary/30 group-hover:bg-card group-hover:shadow-md">
                  <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-primary/8 text-primary">
                        <Globe2 className="h-5 w-5" />
                      </div>

                      <VisibilityBadge visibility={world.visibility} />
                    </div>

                    <div className="mt-5 min-w-0">
                      <h2 className="truncate text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
                        {world.title}
                      </h2>

                      <p className="mt-1 truncate text-[11px] text-muted-foreground/70">
                        /{world.slug}
                      </p>
                    </div>

                    <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-muted-foreground">
                      {world.description || "No description yet."}
                    </p>

                    <div className="mt-auto pt-5">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/25 px-2.5 py-1 text-xs text-muted-foreground">
                          <LibraryBig className="h-3.5 w-3.5" />

                          <span className="font-medium text-foreground">
                            {world.entryCount}
                          </span>

                          {world.entryCount === 1 ? "Entry" : "Entries"}
                        </span>

                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/25 px-2.5 py-1 text-xs text-muted-foreground">
                          <Bot className="h-3.5 w-3.5" />

                          <span className="font-medium text-foreground">
                            {world.botCount}
                          </span>

                          {world.botCount === 1 ? "Bot" : "Bots"}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                        <span className="text-[11px] text-muted-foreground">
                          Updated {relativeDate(world.updatedAt)}
                        </span>

                        <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-h-[68vh] overflow-y-auto rounded-2xl border border-border/70 bg-card/70 shadow-sm">
          {visibleWorlds.map((world) => (
            <Link
              key={world.id}
              href={`/atlas/worlds/${world.id}`}
              className="group flex min-w-0 items-center gap-3 border-b border-border/50 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/30 sm:gap-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-primary/8 text-primary">
                <Globe2 className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                    {world.title}
                  </h2>

                  <div className="hidden shrink-0 sm:block">
                    <VisibilityBadge visibility={world.visibility} />
                  </div>
                </div>

                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {world.description || "No description yet."}
                </p>
              </div>

              <div className="hidden shrink-0 items-center gap-4 text-xs text-muted-foreground md:flex">
                <span className="inline-flex items-center gap-1.5">
                  <LibraryBig className="h-3.5 w-3.5" />
                  {world.entryCount}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5" />
                  {world.botCount}
                </span>
              </div>

              <span className="hidden w-20 shrink-0 text-right text-[11px] text-muted-foreground lg:block">
                {relativeDate(world.updatedAt)}
              </span>

              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
