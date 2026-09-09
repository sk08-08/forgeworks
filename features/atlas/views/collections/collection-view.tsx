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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const filteredEntries = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return entries;
    return entries.filter((entry) => normalize(entry.title).includes(needle));
  }, [entries, query]);

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
  if (!collection)
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Collection not found.
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-28 sm:p-6 md:p-8 lg:p-10">
      <section className="sticky top-14 z-20 -mx-2 flex flex-col gap-4 rounded-2xl border border-border/50 bg-background/90 px-2 py-3 backdrop-blur-xl sm:flex-row sm:items-start sm:justify-between md:-mx-3 md:px-3">
        <div className="min-w-0">
          <Link
            href="/atlas/collections"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Collections
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold tracking-tight sm:text-4xl">
                {collection.title}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {linkedCount} linked entries
              </p>
            </div>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{collection.title}”?</AlertDialogTitle>
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
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(20rem,0.78fr)_minmax(0,1.62fr)]">
        <Card className="border-border/70 bg-card/85 shadow-sm xl:sticky xl:top-40">
          <CardHeader>
            <CardTitle className="text-lg">Collection details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                rows={5}
                placeholder="What is this set for?"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LibraryBig className="h-5 w-5 text-primary" /> Entries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your Entries..."
                className="pl-9"
              />
            </div>
            {entries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 p-6 text-center text-sm text-muted-foreground">
                Create Entries first, then return here to organize them.
              </div>
            ) : (
              <div className="max-h-[36rem] space-y-2 overflow-y-auto pr-1">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-xl border border-border/65 bg-background/45 px-3 py-2.5"
                  >
                    <Checkbox
                      checked={entry.linked}
                      onCheckedChange={() => toggleEntry(entry)}
                      disabled={pending}
                    />
                    <Link
                      href={`/atlas/entries/${entry.id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary"
                    >
                      {entry.title}
                    </Link>
                    <EntryTypeBadge kind={entry.entryType} />
                  </div>
                ))}
                {filteredEntries.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No Entries match that search.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 px-4 py-3 backdrop-blur-xl lg:left-64">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            {dirty ? (
              "You have unsaved collection details."
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" /> All collection details saved
              </span>
            )}
          </div>
          <Button
            onClick={save}
            disabled={!dirty || pending || !title.trim()}
            className="rounded-xl cursor-pointer"
          >
            <Save className="mr-2 h-4 w-4" />{" "}
            {pending ? "Saving..." : "Save collection"}
          </Button>
        </div>
      </div>
    </div>
  );
}
