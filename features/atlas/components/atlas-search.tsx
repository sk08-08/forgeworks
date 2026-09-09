"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  BookOpenText,
  FolderKanban,
  Globe2,
  LibraryBig,
  Loader2,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setResults([]);
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

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 sm:max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        placeholder="Search entries, worlds, collections, lorebooks..."
        className="h-10 rounded-xl border-border/70 bg-muted/30 pl-9 pr-10"
        aria-label="Search Atlas"
      />
      {isPending && (
        <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-border/70 bg-popover/95 shadow-2xl backdrop-blur-xl">
          <div className="max-h-[min(28rem,65vh)] overflow-y-auto p-2">
            {!isPending && results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No Atlas items match “{query.trim()}”.
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((result) => (
                  <Link
                    key={`${result.kind}:${result.id}`}
                    href={result.href}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/70"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground">
                      <ResultIcon kind={result.kind} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {result.title}
                      </p>
                      <p className="truncate text-xs capitalize text-muted-foreground">
                        {result.subtitle}
                      </p>
                    </div>
                    {result.kind === "entry" && result.entryType ? (
                      <EntryTypeBadge kind={result.entryType} />
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
            Search currently matches titles across your private Atlas workspace.
          </div>
        </div>
      )}
    </div>
  );
}
