"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  HardDrive,
  ImageIcon,
  Images,
  Info,
  Link2,
  Loader2,
  Pencil,
  RefreshCw,
  SearchX,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  listMediaAssetsAction,
  renameMediaAssetAction,
  getMediaUsagesAction,
  type MediaUsage,
} from "../actions/media-assets";
import { MAX_MEDIA_ITEMS_PER_USER, type MediaAsset } from "../types/media";
import { MediaPicker } from "./media-picker";
import { MarkdownInlineRenderer } from "@/features/markdown/components/markdown-renderer";

type SortOption = "newest" | "oldest" | "name" | "size";
const SORT_OPTIONS: ReadonlyArray<{ value: SortOption; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "size", label: "Largest first" },
];

/** Friendly decimal sizes: 1 MB = 1,000,000 bytes; upload validation stays at 5 MiB (5,242,880 bytes). */
function formatBytes(value: number): string {
  if (value < 1_000) return `${value} B`;
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)} KB`;
  return `${(value / 1_000_000).toFixed(2)} MB`;
}

function extensionOf(asset: MediaAsset): string {
  const extension = {
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "image/webp": "WEBP",
    "image/avif": "AVIF",
  }[asset.mimeType];
  return (
    extension ||
    asset.name.match(/\.([a-z\d]{2,6})$/i)?.[1]?.toUpperCase() ||
    "IMAGE"
  );
}

export function MediaLibraryManager({
  className = "",
}: {
  className?: string;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [draftName, setDraftName] = useState("");
  const [usageAsset, setUsageAsset] = useState<MediaAsset | null>(null);
  const [usages, setUsages] = useState<MediaUsage[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [hasOtherReferences, setHasOtherReferences] = useState(false);
  const [usageTruncated, setUsageTruncated] = useState(false);
  const usageRequestId = useRef(0);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLibraryError(null);
    try {
      const result = await listMediaAssetsAction();
      if (!result.success)
        throw new Error(result.error || "Could not load your library.");
      setAssets(result.assets);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load your library.";
      setLibraryError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totalBytes = useMemo(
    () => assets.reduce((sum, asset) => sum + asset.size, 0),
    [assets],
  );
  const visible = useMemo(() => {
    const text = query.trim().toLocaleLowerCase();
    return assets
      .filter((asset) =>
        `${asset.name} ${extensionOf(asset)}`
          .toLocaleLowerCase()
          .includes(text),
      )
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "size"
            ? b.size - a.size
            : sort === "oldest"
              ? a.createdAt.localeCompare(b.createdAt)
              : b.createdAt.localeCompare(a.createdAt),
      );
  }, [assets, query, sort]);

  const openRename = (asset: MediaAsset) => {
    setEditing(asset);
    setDraftName(asset.name);
  };
  const saveName = async () => {
    if (!editing || saving || !draftName.trim()) return;
    setSaving(true);
    try {
      const result = await renameMediaAssetAction(editing.id, draftName);
      if (!result.success) throw new Error(result.error || "Rename failed.");
      setAssets((current) =>
        current.map((item) =>
          item.id === result.asset.id ? result.asset : item,
        ),
      );
      setEditing(null);
      toast.success("Image renamed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rename failed.");
    } finally {
      setSaving(false);
    }
  };

  const openUsage = async (asset: MediaAsset) => {
    const requestId = ++usageRequestId.current;
    setUsageAsset(asset);
    setUsages([]);
    setHasOtherReferences(false);
    setUsageError(null);
    setUsageTruncated(false);
    setUsageLoading(true);
    try {
      const result = await getMediaUsagesAction(asset.id);
      if (!result.success) throw new Error(result.error);
      if (requestId !== usageRequestId.current) return;
      setUsages(result.usages);
      setHasOtherReferences(result.hasOtherReferences);
      setUsageTruncated(result.truncated);
    } catch (error) {
      if (requestId === usageRequestId.current) {
        setUsageError(error instanceof Error ? error.message : "Could not load usage.");
      }
    } finally {
      if (requestId === usageRequestId.current) setUsageLoading(false);
    }
  };

  const closeUsage = () => {
    ++usageRequestId.current;
    setUsageAsset(null);
    setUsageLoading(false);
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Image URL copied.");
    } catch {
      toast.error("Could not copy the image URL.");
    }
  };

  return (
    <section
      className={cn("min-w-0 space-y-6 pb-10", className)}
      aria-label="My Media library"
    >
      <header className="relative isolate overflow-hidden rounded-3xl border border-primary/20 bg-card/70 px-4 py-6 shadow-sm sm:px-7 sm:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-24 -z-10 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl"
        />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/15 text-primary">
                <Images className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  My Media
                </h1>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  One place for the images you reuse across your creative
                  workspace.
                </p>
              </div>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 min-[420px]:flex-row sm:w-auto sm:items-center">
            <MediaPicker
              label="Add images"
              multiple
              maxSelection={5}
              allowExternalUrls={false}
              onSelect={() => {
                void refresh();
              }}
              onOpenChange={(open) => {
                if (!open) void refresh();
              }}
              className="w-full cursor-pointer sm:w-auto"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full shrink-0 cursor-pointer sm:w-auto"
              disabled={loading || saving}
              onClick={() => void refresh()}
            >
              <RefreshCw
                aria-hidden="true"
                className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
              />{" "}
              Refresh library
            </Button>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="relative min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm sm:p-5">
          <Images
            className="pointer-events-none absolute -right-4 -bottom-5 h-24 w-24 text-primary/10"
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Images className="h-4 w-4 text-primary" aria-hidden="true" />{" "}
            Images in your library
          </div>
          <p className="relative mt-3 text-3xl font-semibold tracking-tight tabular-nums">
            {assets.length}
            <span className="ml-2 text-base font-medium text-muted-foreground">
              / {MAX_MEDIA_ITEMS_PER_USER}
            </span>
          </p>
          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Image library capacity"
            aria-valuenow={assets.length}
            aria-valuemin={0}
            aria-valuemax={MAX_MEDIA_ITEMS_PER_USER}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{
                width: `${Math.min(100, (assets.length / MAX_MEDIA_ITEMS_PER_USER) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {Math.max(0, MAX_MEDIA_ITEMS_PER_USER - assets.length)} image slots
            available
          </p>
        </div>
        <div className="relative min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm sm:p-5">
          <HardDrive
            className="pointer-events-none absolute -right-4 -bottom-5 h-24 w-24 text-fuchsia-500/10"
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <HardDrive
              className="h-4 w-4 text-fuchsia-500"
              aria-hidden="true"
            />{" "}
            Library file sizes
          </div>
          <p className="relative mt-3 text-3xl font-semibold tracking-tight tabular-nums">
            {formatBytes(totalBytes)}
          </p>
          <p className="relative mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Total size of the images registered in My Media, not your entire
            account storage.
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-start gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
        <Info
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
        />
        <p>
          Images use public URLs when shared. Removing an image from an editor
          does not delete it from your library. File totals exclude pending
          uploads and other storage areas.
        </p>
      </div>

      <div className="min-w-0 rounded-2xl border border-border/70 bg-card/65 p-3 shadow-sm sm:p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label
              htmlFor="media-library-search"
              className="text-xs font-medium text-muted-foreground"
            >
              Find an image
            </label>
            <SearchInput
              id="media-library-search"
              value={query}
              onChange={setQuery}
              debounce={0}
              placeholder="Search by filename or format…"
              className="w-full"
            />
          </div>
          <div className="w-full shrink-0 space-y-1.5 sm:w-44">
            <label
              htmlFor="media-library-sort"
              className="text-xs font-medium text-muted-foreground"
            >
              Sort images
            </label>
            <Select
              value={sort}
              onValueChange={(value) => setSort(value as SortOption)}
            >
              <SelectTrigger
                id="media-library-sort"
                aria-label="Sort images"
                className="w-full cursor-pointer"
              >
                <SelectValue placeholder="Sort by…" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem
                    className="cursor-pointer"
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {!loading && (
          <p className="mt-3 text-xs text-muted-foreground" role="status">
            Showing {visible.length} of {assets.length}{" "}
            {assets.length === 1 ? "image" : "images"}
          </p>
        )}
      </div>

      {libraryError && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="break-words text-destructive">{libraryError} Your last loaded images are retained.</p>
          <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={() => void refresh()}>Retry</Button>
        </div>
      )}
      {loading ? (
        <div
          role="status"
          className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card/30 p-8 text-muted-foreground"
        >
          <Loader2
            className="h-7 w-7 animate-spin text-primary"
            aria-hidden="true"
          />
          <span className="text-sm">Loading your images…</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/40 p-6 text-center sm:p-10">
          <div className="rounded-2xl bg-primary/10 p-4 text-primary">
            {assets.length ? (
              <SearchX className="h-7 w-7" />
            ) : (
              <ImageIcon className="h-7 w-7" />
            )}
          </div>
          <h2 className="text-base font-semibold">
            {assets.length ? "No images found" : "Your library is ready"}
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {assets.length
              ? "Try another filename or format."
              : "Use “Add images” above to upload once and reuse your images across your workspace."}
          </p>
          {assets.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setQuery("")}
            >
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 min-[380px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visible.map((asset) => (
            <article
              key={asset.id}
              className="group min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card/85 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg motion-reduce:transform-none"
            >
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block aspect-[5/4] cursor-pointer overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                aria-label={`Open ${asset.name} in a new tab`}
              >
                {asset.url ? (
                  <img
                    src={asset.url}
                    alt={asset.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.035] motion-reduce:transform-none"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon
                      className="h-8 w-8 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                )}
                <span className="absolute bottom-2 left-2 rounded-md border border-white/15 bg-black/65 px-2 py-1 text-[10px] font-semibold tracking-wider text-white backdrop-blur-sm">
                  {extensionOf(asset)}
                </span>
                <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </a>
              <div className="min-w-0 space-y-3 p-3 sm:p-4">
                <div className="min-w-0">
                  <h3
                    className="truncate text-sm font-semibold"
                    title={asset.name}
                  >
                    {asset.name}
                  </h3>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{extensionOf(asset)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatBytes(asset.size)}</span>
                  </p>
                </div>
                <div className="flex min-w-0 flex-row gap-2 sm:flex-col">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-w-0 w-full cursor-pointer px-2 text-xs"
                    onClick={() => openRename(asset)}
                    disabled={saving}
                    aria-label={`Rename ${asset.name}`}
                  >
                    <Pencil
                      className="mr-1 h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />{" "}
                    Rename
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-w-0 w-full cursor-pointer px-2 text-xs"
                    onClick={() => void copyUrl(asset.url)}
                    aria-label={`Copy URL for ${asset.name}`}
                  >
                    <Copy
                      className="mr-1 h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />{" "}
                    Copy URL
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full cursor-pointer text-xs"
                  onClick={() => void openUsage(asset)}
                  aria-label={`Show saved uses for ${asset.name}`}
                >
                  <Link2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Used in
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={usageAsset !== null}
        onOpenChange={(open) => {
          if (!open) closeUsage();
        }}
      >
        <DialogContent className="max-h-[min(85dvh,44rem)] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="break-words">
              Where is this image used?
            </DialogTitle>
            <DialogDescription className="break-all">
              {usageAsset?.name} · Saved references in indexed Forgeworks
              resources.
            </DialogDescription>
          </DialogHeader>
          {usageLoading ? (
            <div
              className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground"
              role="status"
            >
              <Loader2 className="h-4 w-4 animate-spin" /> Checking saved uses…
            </div>
          ) : usageError ? (
            <p
              className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
              role="alert"
            >
              {usageError}
            </p>
          ) : (
            <div className="space-y-3">
              {usages.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground" role="status">
                  {usages.length} {usages.length === 1 ? "saved use" : "saved uses"} shown
                  {hasOtherReferences || usageTruncated ? " · Additional uses may be hidden" : ""}
                </p>
              )}
              {usages.length === 0 && !hasOtherReferences ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No uses found in the indexed resources. This does not prove
                  that the public URL is unused elsewhere.
                </p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {usages.map((usage) => (
                    <div
                      key={`${usage.kind}:${usage.sourceId}`}
                      className="min-w-0 rounded-xl border border-border/70 bg-muted/20 p-3"
                    >
                      <div className="min-w-0 break-words text-sm font-medium [&>*]:m-0 [&_p]:m-0 [&_img]:hidden">
                        <MarkdownInlineRenderer content={usage.label} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {usage.kind.replaceAll("_", " ")}
                        {usage.historical ? " · Historical version" : ""}
                        {usage.removed ? " · Archived/removed" : ""}
                      </p>
                      {usage.href && (
                        <a
                          className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                          href={usage.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open page editor{" "}
                          <ArrowUpRight
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                        </a>
                      )}
                    </div>
                  ))}
                  {hasOtherReferences && (
                    <p className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                      Some references belong to other users or platform-managed
                      content. Their details and counts remain private.
                    </p>
                  )}
                </div>
              )}
              {usageTruncated && (
                <p className="text-xs text-muted-foreground">
                  More than 1,000 references exist. This is a partial view.
                </p>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                This index covers selected stored Forgeworks content, Resources
                entries and bot history. Drafts, external websites, copied URLs
                and other unindexed data may still use this image. Physical
                deletion is unavailable.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={closeUsage}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(value) => {
          if (!value && !saving) setEditing(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Rename image</DialogTitle>
            <DialogDescription>
              This changes only the library label. The image and its existing
              public URL stay the same.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="media-rename" className="text-sm font-medium">
              Image name
            </label>
            <Input
              id="media-rename"
              autoFocus
              value={draftName}
              maxLength={255}
              disabled={saving}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveName();
                }
              }}
            />
          </div>
          <DialogFooter className="gap-0 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full cursor-pointer sm:w-auto"
              disabled={saving}
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full cursor-pointer sm:w-auto"
              disabled={
                saving || !draftName.trim() || draftName === editing?.name
              }
              onClick={() => void saveName()}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}{" "}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
