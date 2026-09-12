"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  BookOpenText,
  CornerDownLeft,
  FolderKanban,
  Globe2,
  LibraryBig,
  Loader2,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  searchAtlasAction,
  type AtlasSearchResult,
} from "@/features/atlas/actions/overview";
import { EntryTypeBadge } from "@/features/atlas/components/entries/entry-type-badge";

function ResultIcon({ kind }: { kind: AtlasSearchResult["kind"] }) {
  const className = "h-4 w-4";
  if (kind === "world") return <Globe2 className={className} />;
  if (kind === "collection") return <FolderKanban className={className} />;
  if (kind === "lorebook") return <BookOpenText className={className} />;
  return <LibraryBig className={className} />;
}

export function AtlasSearch() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AtlasSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPending, startTransition] = useTransition();

  const visibleResults = useMemo(() => results.slice(0, 12), [results]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const normalized = query.trim();
    setActiveIndex(-1);

    if (normalized.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        const result = await searchAtlasAction(normalized);
        setResults(result.success ? result.data : []);
        setOpen(true);
      });
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const closeAndReset = () => {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
  };

  return (
    <div ref={rootRef} className="relative min-w-0 w-full sm:max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        onKeyDown={(event) => {
          if (!open || visibleResults.length === 0) {
            if (event.key === "Escape") setOpen(false);
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) =>
              current >= visibleResults.length - 1 ? 0 : current + 1,
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) =>
              current <= 0 ? visibleResults.length - 1 : current - 1,
            );
          } else if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            window.location.assign(visibleResults[activeIndex].href);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search Atlas..."
        className="h-10 min-w-0 rounded-xl border-border/70 bg-muted/30 pl-9 pr-10 sm:placeholder:text-transparent md:placeholder:text-muted-foreground"
        aria-label="Search Atlas"
        aria-expanded={open}
        aria-controls="atlas-search-results"
      />
      {isPending && (
        <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {open && query.trim().length >= 2 && (
        <div
          id="atlas-search-results"
          className="fixed inset-x-3 top-[4.5rem] z-[80] overflow-hidden rounded-2xl border border-border/70 bg-popover/98 shadow-2xl backdrop-blur-xl sm:absolute sm:inset-x-auto sm:left-0 sm:top-[calc(100%+0.5rem)] sm:w-[min(46rem,calc(100vw-3rem))]"
        >
          <div className="max-h-[min(32rem,70dvh)] overflow-y-auto overscroll-contain p-2">
            {!isPending && results.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Search className="mx-auto mb-3 h-5 w-5 text-muted-foreground/60" />
                <p className="text-sm font-medium">No Atlas matches</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Nothing matched “{query.trim()}”.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {visibleResults.map((result, index) => (
                  <Link
                    key={`${result.kind}:${result.id}`}
                    href={result.href}
                    onClick={closeAndReset}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex min-w-0 items-start gap-3 rounded-xl px-3 py-3 transition-colors sm:items-center",
                      activeIndex === index
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/70",
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground">
                      <ResultIcon kind={result.kind} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {result.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs capitalize text-muted-foreground sm:line-clamp-1">
                        {result.subtitle}
                      </p>
                      {result.kind === "entry" && result.entryType ? (
                        <div className="mt-2 sm:hidden">
                          <EntryTypeBadge kind={result.entryType} />
                        </div>
                      ) : null}
                    </div>
                    {result.kind === "entry" && result.entryType ? (
                      <div className="hidden shrink-0 sm:block">
                        <EntryTypeBadge kind={result.entryType} />
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="truncate">
              Searches titles across your private Atlas workspace.
            </span>
            <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
              <CornerDownLeft className="h-3 w-3" /> open
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
