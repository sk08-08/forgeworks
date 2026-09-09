"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpenText,
  Grid2X2,
  LibraryBig,
  List,
  Search,
  SlidersHorizontal,
  Tag,
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

import {
  listAtlasEntriesAction,
  type AtlasEntryRecord,
} from "@/features/atlas/actions/entries";
import { CreateEntryDialog } from "@/features/atlas/components/entries/create-entry-dialog";
import {
  ATLAS_ENTRY_TYPE_LABELS,
  EntryTypeBadge,
} from "@/features/atlas/components/entries/entry-type-badge";
import type { AtlasEntryKind } from "@/features/atlas/types/atlas-types";

type SortMode = "updated" | "title" | "type";
type ViewMode = "grid" | "list";

const entryKinds = Object.keys(ATLAS_ENTRY_TYPE_LABELS) as AtlasEntryKind[];

function relativeDate(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();

  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function makeExcerpt(content: string) {
  const plain = content
    .replace(/[#*_>`~[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return plain || "No content yet.";
}

function EntryGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border/60 bg-card/60 p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="h-5 w-36 animate-pulse rounded-lg bg-muted/30" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-muted/25" />
            </div>

            <div className="h-3 w-16 animate-pulse rounded bg-muted/25" />
          </div>

          <div className="mt-5 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-muted/25" />
            <div className="h-3 w-11/12 animate-pulse rounded bg-muted/25" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted/25" />
          </div>

          <div className="mt-5 flex gap-2">
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted/25" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-muted/25" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EntryListSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-border/50 p-4 last:border-b-0"
        >
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-muted/30" />

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

export function EntriesView() {
  const searchParams = useSearchParams();

  const requestedType = searchParams.get("type") as AtlasEntryKind | null;

  const initialType =
    requestedType && requestedType in ATLAS_ENTRY_TYPE_LABELS
      ? requestedType
      : "all";

  const [entries, setEntries] = useState<AtlasEntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<AtlasEntryKind | "all">(initialType);
  const [sort, setSort] = useState<SortMode>("updated");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  const load = useCallback(async () => {
    setLoading(true);

    const result = await listAtlasEntriesAction();

    if (!result.success) {
      toast.error(result.error);
      setEntries([]);
    } else {
      setEntries(result.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const result = new Map<AtlasEntryKind, number>();

    entries.forEach((entry) => {
      result.set(entry.entryType, (result.get(entry.entryType) ?? 0) + 1);
    });

    return result;
  }, [entries]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const result = entries.filter((entry) => {
      if (type !== "all" && entry.entryType !== type) {
        return false;
      }

      if (!needle) return true;

      return [entry.title, entry.content, ...entry.aliases, ...entry.tags]
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

      if (sort === "type") {
        const typeCompare = ATLAS_ENTRY_TYPE_LABELS[a.entryType].localeCompare(
          ATLAS_ENTRY_TYPE_LABELS[b.entryType],
        );

        if (typeCompare !== 0) {
          return typeCompare;
        }

        return a.title.localeCompare(b.title);
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return result;
  }, [entries, query, type, sort]);

  const activeFilters = query.trim().length > 0 || type !== "all";

  const clearFilters = () => {
    setQuery("");
    setType("all");
  };

  const selectedTypeLabel =
    type === "all" ? "All Entries" : ATLAS_ENTRY_TYPE_LABELS[type];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 p-4 pb-16 sm:p-6 md:p-8 lg:p-10">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-border/70 bg-card/85 shadow-md">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-primary/[0.07] via-transparent to-fuchsia-500/[0.035]" />

        <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between lg:p-8">
          <div className="min-w-0 max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <LibraryBig className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold">Knowledge library</p>

                <p className="text-xs text-muted-foreground">
                  {entries.length} {entries.length === 1 ? "Entry" : "Entries"}{" "}
                  in your Atlas
                </p>
              </div>
            </div>

            <h1 className="text-balance text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
              Your canon, one Entry at a time.
            </h1>

            <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              Create knowledge once, then reuse it across Worlds, Collections,
              Lorebooks, bots, and relationships without duplicating the source.
            </p>
          </div>

          <div className="shrink-0">
            <CreateEntryDialog />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Browse by type</h2>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Focus the library without changing your Entry structure.
            </p>
          </div>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          <button
            type="button"
            onClick={() => setType("all")}
            className={`group flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
              type === "all"
                ? "border-primary/35 bg-primary/10 text-foreground shadow-sm"
                : "border-border/65 bg-card/65 text-muted-foreground hover:border-primary/25 hover:bg-muted/30 hover:text-foreground"
            }`}
          >
            <LibraryBig
              className={`h-4 w-4 ${type === "all" ? "text-primary" : ""}`}
            />

            <span className="text-sm font-medium">All</span>

            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] tabular-nums">
              {entries.length}
            </span>
          </button>

          {entryKinds.map((kind) => {
            const selected = type === kind;

            return (
              <button
                key={kind}
                type="button"
                onClick={() => setType(selected ? "all" : kind)}
                className={`group flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                  selected
                    ? "border-primary/35 bg-primary/10 text-foreground shadow-sm"
                    : "border-border/65 bg-card/65 text-muted-foreground hover:border-primary/25 hover:bg-muted/30 hover:text-foreground"
                }`}
              >
                <span className="text-sm font-medium">
                  {ATLAS_ENTRY_TYPE_LABELS[kind]}
                </span>

                <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] tabular-nums">
                  {counts.get(kind) ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/65 bg-card/65 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/50 p-3 sm:p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles, content, aliases, or tags..."
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
              value={type}
              onValueChange={(value) =>
                setType(value as AtlasEntryKind | "all")
              }
            >
              <SelectTrigger className="h-10 min-h-10 min-w-44 flex-1 cursor-pointer rounded-xl border-border/65 bg-background/60 px-3 py-0 sm:flex-none">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All types</SelectItem>

                {entryKinds.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {ATLAS_ENTRY_TYPE_LABELS[kind]}
                  </SelectItem>
                ))}
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
                <SelectItem value="type">Entry type</SelectItem>
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
                {filtered.length}
              </strong>{" "}
              {filtered.length === 1 ? "Entry" : "Entries"}
            </span>

            {type !== "all" ? (
              <>
                <span className="text-border">•</span>

                <EntryTypeBadge kind={type} />
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

      {loading ? (
        viewMode === "grid" ? (
          <EntryGridSkeleton />
        ) : (
          <EntryListSkeleton />
        )
      ) : filtered.length === 0 ? (
        <Card className="overflow-hidden border-dashed border-border/70 bg-muted/10 shadow-none">
          <CardContent className="px-5 py-14 text-center sm:py-16">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background/60">
              <BookOpenText className="h-6 w-6 text-muted-foreground" />
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              {entries.length === 0
                ? "Start your knowledge library"
                : "Nothing matches these filters"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {entries.length === 0
                ? "Create your first Entry. It can stand on its own now and be connected to Worlds, Collections, Lorebooks, or bots later."
                : `No ${selectedTypeLabel.toLowerCase()} matched your current search. Try another term or clear the filters.`}
            </p>

            {entries.length === 0 ? (
              <div className="mt-5">
                <CreateEntryDialog />
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
        <div className="max-h-[68vh] overflow-y-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((entry) => (
              <Link
                key={entry.id}
                href={`/atlas/entries/${entry.id}`}
                className="group min-w-0"
              >
                <Card className="relative h-full overflow-hidden border-border/70 bg-card/80 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:bg-card group-hover:shadow-md">
                  <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold tracking-tight transition-colors group-hover:text-primary">
                          {entry.title}
                        </h2>

                        <div className="mt-2">
                          <EntryTypeBadge kind={entry.entryType} />
                        </div>
                      </div>

                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {relativeDate(entry.updatedAt)}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-muted-foreground">
                      {makeExcerpt(entry.content)}
                    </p>

                    <div className="mt-auto pt-5">
                      {entry.aliases.length > 0 || entry.tags.length > 0 ? (
                        <div className="flex min-h-6 flex-wrap gap-1.5">
                          {entry.aliases.slice(0, 2).map((alias) => (
                            <Badge
                              key={`alias-${alias}`}
                              variant="outline"
                              className="max-w-32 truncate text-[10px] font-normal"
                            >
                              {alias}
                            </Badge>
                          ))}

                          {entry.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={`tag-${tag}`}
                              variant="secondary"
                              className="max-w-32 truncate text-[10px] font-normal"
                            >
                              #{tag}
                            </Badge>
                          ))}

                          {entry.aliases.length + entry.tags.length > 4 ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-normal text-muted-foreground"
                            >
                              +{entry.aliases.length + entry.tags.length - 4}
                            </Badge>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex h-6 items-center gap-1.5 text-[11px] text-muted-foreground/70">
                          <Tag className="h-3 w-3" />
                          No aliases or tags
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                        <span className="text-[11px] text-muted-foreground">
                          Open Entry
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
          {filtered.map((entry) => (
            <Link
              key={entry.id}
              href={`/atlas/entries/${entry.id}`}
              className="group flex min-w-0 items-center gap-3 border-b border-border/50 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/30 sm:gap-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-primary/8 text-primary">
                <LibraryBig className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                    {entry.title}
                  </h2>

                  <div className="hidden shrink-0 sm:block">
                    <EntryTypeBadge kind={entry.entryType} />
                  </div>
                </div>

                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {makeExcerpt(entry.content)}
                </p>
              </div>

              <div className="hidden max-w-48 shrink-0 flex-wrap justify-end gap-1.5 lg:flex">
                {entry.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="max-w-24 truncate text-[10px] font-normal"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>

              <span className="hidden w-20 shrink-0 text-right text-[11px] text-muted-foreground md:block">
                {relativeDate(entry.updatedAt)}
              </span>

              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
