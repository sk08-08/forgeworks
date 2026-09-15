"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  FileClock,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  listChangelogEntriesAdmin,
  setChangelogEntryStatus,
} from "@/features/changelog/actions/changelog";
import type { ChangelogEntry } from "@/features/changelog/types";

export function ChangelogAdminHub() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listChangelogEntriesAdmin();

    if (!result.success) {
      toast.error(result.error || "Could not load changelog entries");
      setLoading(false);
      return;
    }

    setEntries(result.entries || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleStatus = async (entry: ChangelogEntry) => {
    setWorkingId(entry.id);
    const next = entry.status === "published" ? "draft" : "published";
    const result = await setChangelogEntryStatus(entry.id, next);

    if (!result.success) {
      toast.error(result.error || "Could not update release status");
      setWorkingId(null);
      return;
    }

    toast.success(next === "published" ? "Release published" : "Release moved to draft");
    await load();
    setWorkingId(null);
  };

  const publishedCount = entries.filter((entry) => entry.status === "published").length;
  const draftCount = entries.filter((entry) => entry.status === "draft").length;
  const latest = entries.slice(0, 6);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-16 h-48 w-48 rounded-full bg-pink-500/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-4 w-4" />
              Release archive
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Changelog
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Keep the release archive organized here. Long-form writing gets its own
              workspace so the Admin Panel stays compact.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="w-full cursor-pointer sm:w-auto">
              <Link href="/changelog" target="_blank">
                Public changelog <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild className="w-full cursor-pointer sm:w-auto">
              <Link href="/admin/changelog">
                <Plus className="mr-2 h-4 w-4" />
                Open Changelog Studio
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-background/65 p-4">
            <p className="text-xs text-muted-foreground">Total entries</p>
            <p className="mt-1 text-2xl font-semibold">{entries.length}</p>
          </div>
          <div className="rounded-xl border bg-background/65 p-4">
            <p className="text-xs text-muted-foreground">Published</p>
            <p className="mt-1 text-2xl font-semibold text-green-600">{publishedCount}</p>
          </div>
          <div className="rounded-xl border bg-background/65 p-4">
            <p className="text-xs text-muted-foreground">Drafts</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{draftCount}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div>
            <p className="text-sm font-semibold">Recent entries</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Quick status management without opening the full editor.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void load()}
            disabled={loading}
            className="cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loading ? (
          <div className="flex min-h-44 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : latest.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <FileClock className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-3 text-sm font-medium">Nothing written yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The first release can start in Changelog Studio.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {latest.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        entry.status === "published"
                          ? "border-green-500/25 bg-green-500/10 text-green-600"
                          : "border-amber-500/25 bg-amber-500/10 text-amber-600"
                      }
                    >
                      {entry.status}
                    </Badge>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {entry.version ? `v${entry.version.replace(/^v/i, "")}` : entry.releaseType}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm font-medium">{entry.title}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {entry.summary || "No summary yet."}
                  </p>
                </div>

                <div className="flex w-full gap-2 sm:w-auto">
                  <Button asChild variant="outline" size="sm" className="flex-1 cursor-pointer sm:flex-none">
                    <Link href={`/admin/changelog?id=${entry.id}`}>Edit</Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={entry.status === "published" ? "secondary" : "default"}
                    className="flex-1 cursor-pointer sm:flex-none"
                    disabled={workingId === entry.id}
                    onClick={() => void toggleStatus(entry)}
                  >
                    {workingId === entry.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : entry.status === "published" ? (
                      "Unpublish"
                    ) : (
                      "Publish"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
