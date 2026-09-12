"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  FolderKanban,
  LibraryBig,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  deleteAtlasCollectionAction,
  getAtlasCollectionAction,
  getAtlasCollectionEntriesAction,
  setAtlasCollectionEntryLinkAction,
  updateAtlasCollectionAction,
  type AtlasCollectionEntryLink,
  type AtlasCollectionRecord,
} from "@/features/atlas/actions/collections";
import { EntryTypeBadge } from "@/features/atlas/components/entries/entry-type-badge";
import { AtlasCollectionDetailSkeleton } from "@/features/atlas/components/loading/atlas-loading-skeletons";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

type EntryFilter = "all" | "linked" | "unlinked";

export function CollectionView({ collectionId }: { collectionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<AtlasCollectionRecord | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [entries, setEntries] = useState<AtlasCollectionEntryLink[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<EntryFilter>("all");
  const [pending, startTransition] = useTransition();

  const hydrate = useCallback(async () => {
    setLoading(true);
    const [collectionResult, entriesResult] = await Promise.all([
      getAtlasCollectionAction(collectionId),
      getAtlasCollectionEntriesAction(collectionId),
    ]);

    if (!collectionResult.success) {
      toast.error(collectionResult.error);
      setCollection(null);
      setLoading(false);
      return;
    }

    setCollection(collectionResult.data);
    setTitle(collectionResult.data.title);
    setDescription(collectionResult.data.description);
    if (entriesResult.success) setEntries(entriesResult.data);
    else toast.error(entriesResult.error);
    setLoading(false);
  }, [collectionId]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const dirty =
    Boolean(collection) &&
    (title.trim() !== collection?.title ||
      description !== collection?.description);

  const linkedCount = entries.filter((entry) => entry.linked).length;
  const unlinkedCount = Math.max(0, entries.length - linkedCount);

  const filteredEntries = useMemo(() => {
    const needle = normalize(query);

    return entries.filter((entry) => {
      const matchesQuery = !needle || normalize(entry.title).includes(needle);
      const matchesFilter =
        filter === "all" ||
        (filter === "linked" && entry.linked) ||
        (filter === "unlinked" && !entry.linked);

      return matchesQuery && matchesFilter;
    });
  }, [entries, filter, query]);

  const save = () => {
    if (!collection) return;

    startTransition(async () => {
      const result = await updateAtlasCollectionAction({
        id: collection.id,
        title,
        description,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setCollection({ ...result.data, entryCount: linkedCount });
      setTitle(result.data.title);
      setDescription(result.data.description);
      toast.success("Collection saved");
      router.refresh();
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await deleteAtlasCollectionAction(collectionId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Collection deleted");
      router.push("/atlas/collections");
      router.refresh();
    });
  };

  const toggleEntry = (entry: AtlasCollectionEntryLink) => {
    const next = !entry.linked;

    setEntries((current) =>
      current.map((item) =>
        item.id === entry.id ? { ...item, linked: next } : item,
      ),
    );

    startTransition(async () => {
      const result = await setAtlasCollectionEntryLinkAction({
        collectionId,
        entryId: entry.id,
        linked: next,
      });

      if (!result.success) {
        setEntries((current) =>
          current.map((item) =>
            item.id === entry.id ? { ...item, linked: !next } : item,
          ),
        );
        toast.error(result.error);
        return;
      }

      setCollection((current) =>
        current
          ? { ...current, entryCount: current.entryCount + (next ? 1 : -1) }
          : current,
      );
    });
  };

  if (loading) return <AtlasCollectionDetailSkeleton />;

  if (!collection) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Collection not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const filterOptions: Array<[EntryFilter, string, number]> = [
    ["all", "All", entries.length],
    ["linked", "Linked", linkedCount],
    ["unlinked", "Available", unlinkedCount],
  ];

  return (
    <div
      className="mx-auto w-full max-w-[92rem] space-y-6 p-3 sm:p-6 md:p-8 lg:p-10"
      style={{
        paddingBottom: "calc(7rem + env(safe-area-inset-bottom))",
      }}
    >
      <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/70 p-5 shadow-sm sm:p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-48 w-72 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/atlas/collections"
              className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Collections
            </Link>

            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm sm:h-14 sm:w-14">
                <FolderKanban className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                  Collection
                </p>
                <h1 className="mt-1 break-words text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  {collection.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1">
                    {linkedCount} linked
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1">
                    {entries.length} total entries
                  </span>
                </div>
              </div>
            </div>

            {collection.description ? (
              <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                {collection.description}
              </p>
            ) : (
              <p className="mt-5 max-w-2xl text-sm text-muted-foreground">
                Use this Collection to group reusable Atlas Entries without
                changing the Entries themselves.
              </p>
            )}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="cursor-pointer self-start rounded-xl text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete “{collection.title}”?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  The Collection will disappear, but none of its Entries will be
                  deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>
                  Delete collection
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="min-w-0 rounded-[1.6rem] border border-border/70 bg-card/70 shadow-sm">
          <div className="border-b border-border/60 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <LibraryBig className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Entries</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Link or unlink Entries without moving or duplicating their
                  knowledge.
                </p>
              </div>

              <div className="flex flex-wrap gap-1 rounded-xl bg-muted/35 p-1">
                {filterOptions.map(([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={cn(
                      "cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                      filter === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label} <span className="ml-1 opacity-65">{count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your Entries..."
                className="h-11 rounded-xl bg-background/70 pl-9"
              />
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {entries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/15 p-8 text-center">
                <LibraryBig className="mx-auto h-6 w-6 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-medium">No Entries yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create Entries first, then return here to organize them.
                </p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                No Entries match this search and filter.
              </div>
            ) : (
              <div className="grid max-h-[min(42rem,65dvh)] gap-2 overflow-y-auto overscroll-contain pr-1 md:grid-cols-2 2xl:grid-cols-3">
                {filteredEntries.map((entry) => (
                  <label
                    key={entry.id}
                    className={cn(
                      "group flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                      entry.linked
                        ? "border-primary/30 bg-primary/[0.045] hover:bg-primary/[0.07]"
                        : "border-border/65 bg-background/45 hover:bg-muted/30",
                    )}
                  >
                    <Checkbox
                      className="mt-0.5 shrink-0"
                      checked={entry.linked}
                      onCheckedChange={() => toggleEntry(entry)}
                      disabled={pending}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/atlas/entries/${entry.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="block truncate text-sm font-medium transition-colors hover:text-primary"
                      >
                        {entry.title}
                      </Link>
                      <div className="mt-2">
                        <EntryTypeBadge kind={entry.entryType} />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-6">
          <Card className="overflow-hidden border-border/70 bg-card/70 shadow-sm">
            <CardContent className="space-y-5 p-5">
              <div>
                <p className="text-sm font-semibold">Collection details</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  These details describe the set itself. Entry knowledge remains
                  independent.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="collection-title">Title</Label>
                <Input
                  id="collection-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={160}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collection-description">Description</Label>
                <Textarea
                  id="collection-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={6}
                  placeholder="What is this set for?"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border/60 bg-muted/15 p-3 text-center">
                <div>
                  <p className="text-xl font-bold">{linkedCount}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Linked
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold">{unlinkedCount}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Available
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/88 px-3 pt-3 shadow-[0_-10px_30px_-24px_rgba(0,0,0,.5)] backdrop-blur-xl sm:px-4 lg:left-64"
        style={{
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-3">
          <div className="min-w-0 text-xs text-muted-foreground">
            {dirty ? (
              <span className="truncate">
                You have unsaved collection details.
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  All collection details saved
                </span>
                <span className="sm:hidden">Saved</span>
              </span>
            )}
          </div>

          <Button
            onClick={save}
            disabled={!dirty || pending || !title.trim()}
            className="h-10 shrink-0 cursor-pointer rounded-xl px-3 sm:px-4"
          >
            <Save className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">
              {pending ? "Saving..." : "Save collection"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
