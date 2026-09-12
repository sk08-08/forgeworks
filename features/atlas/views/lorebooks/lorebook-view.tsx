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
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  Download,
  FileJson2,
  ListPlus,
  Save,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteAtlasLorebookAction,
  exportAtlasLorebookFkfAction,
  exportAtlasLorebookJanitorAction,
  getAtlasLorebookAction,
  getAtlasLorebookEntriesAction,
  reorderAtlasLorebookEntriesAction,
  setAtlasLorebookEntryLinkAction,
  updateAtlasLorebookAction,
  updateAtlasLorebookEntryConfigAction,
  type AtlasLorebookEntryCandidate,
  type AtlasLorebookEntryRecord,
  type AtlasLorebookRecord,
} from "@/features/atlas/actions/lorebooks";
import {
  ATLAS_ENTRY_TYPE_LABELS,
  EntryTypeBadge,
} from "@/features/atlas/components/entries/entry-type-badge";
import type { ForgeLorebookActivationMode } from "@/features/atlas/fkf/fkf-types";
import { AtlasLorebookDetailSkeleton } from "@/features/atlas/components/loading/atlas-loading-skeletons";

function splitTokens(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(title: string) {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || "atlas-lorebook";
}

export function LorebookView({ lorebookId }: { lorebookId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lorebook, setLorebook] = useState<AtlasLorebookRecord | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [entries, setEntries] = useState<AtlasLorebookEntryRecord[]>([]);
  const [candidates, setCandidates] = useState<AtlasLorebookEntryCandidate[]>(
    [],
  );
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const hydrate = useCallback(async () => {
    setLoading(true);
    const [lorebookResult, entriesResult] = await Promise.all([
      getAtlasLorebookAction(lorebookId),
      getAtlasLorebookEntriesAction(lorebookId),
    ]);
    if (!lorebookResult.success) {
      toast.error(lorebookResult.error);
      setLorebook(null);
      setLoading(false);
      return;
    }
    setLorebook(lorebookResult.data);
    setTitle(lorebookResult.data.title);
    setDescription(lorebookResult.data.description);
    if (entriesResult.success) {
      setEntries(entriesResult.data.entries);
      setCandidates(entriesResult.data.candidates);
      setSelectedEntryId((current) => {
        if (
          current &&
          entriesResult.data.entries.some((entry) => entry.entryId === current)
        )
          return current;
        return entriesResult.data.entries[0]?.entryId ?? null;
      });
    } else {
      toast.error(entriesResult.error);
    }
    setLoading(false);
  }, [lorebookId]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const selected = useMemo(
    () => entries.find((entry) => entry.entryId === selectedEntryId) ?? null,
    [entries, selectedEntryId],
  );

  const lorebookDirty = useMemo(() => {
    if (!lorebook) return false;
    return (
      title.trim() !== lorebook.title || description !== lorebook.description
    );
  }, [lorebook, title, description]);

  const filteredCandidates = useMemo(() => {
    const needle = candidateQuery.trim().toLowerCase();
    if (!needle) return candidates;
    return candidates.filter((candidate) =>
      `${candidate.title} ${ATLAS_ENTRY_TYPE_LABELS[candidate.entryType]}`
        .toLowerCase()
        .includes(needle),
    );
  }, [candidates, candidateQuery]);

  const saveLorebook = () => {
    if (!lorebook || !lorebookDirty) return;
    startTransition(async () => {
      const result = await updateAtlasLorebookAction({
        id: lorebook.id,
        title,
        description,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setLorebook(result.data);
      setTitle(result.data.title);
      setDescription(result.data.description);
      toast.success("Lorebook saved");
      router.refresh();
    });
  };

  const removeLorebook = () => {
    startTransition(async () => {
      const result = await deleteAtlasLorebookAction(lorebookId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Lorebook deleted");
      router.push("/atlas/lorebooks");
      router.refresh();
    });
  };

  const toggleCandidate = (candidate: AtlasLorebookEntryCandidate) => {
    const next = !candidate.linked;
    setCandidates((current) =>
      current.map((item) =>
        item.id === candidate.id ? { ...item, linked: next } : item,
      ),
    );
    startTransition(async () => {
      const result = await setAtlasLorebookEntryLinkAction({
        lorebookId,
        entryId: candidate.id,
        linked: next,
      });
      if (!result.success) {
        setCandidates((current) =>
          current.map((item) =>
            item.id === candidate.id ? { ...item, linked: !next } : item,
          ),
        );
        toast.error(result.error);
        return;
      }
      const refreshed = await getAtlasLorebookEntriesAction(lorebookId);
      if (!refreshed.success) {
        toast.error(refreshed.error);
        return;
      }
      setEntries(refreshed.data.entries);
      setCandidates(refreshed.data.candidates);
      if (next) setSelectedEntryId(candidate.id);
      else if (selectedEntryId === candidate.id)
        setSelectedEntryId(refreshed.data.entries[0]?.entryId ?? null);
    });
  };

  const updateSelected = (patch: Partial<AtlasLorebookEntryRecord>) => {
    if (!selected) return;
    setEntries((current) =>
      current.map((entry) =>
        entry.entryId === selected.entryId ? { ...entry, ...patch } : entry,
      ),
    );
  };

  const saveSelectedConfig = () => {
    if (!selected) return;
    startTransition(async () => {
      const result = await updateAtlasLorebookEntryConfigAction({
        lorebookId,
        entryId: selected.entryId,
        enabled: selected.enabled,
        activationMode: selected.activationMode,
        primaryKeys: selected.primaryKeys,
        secondaryKeys: selected.secondaryKeys,
        caseSensitive: selected.caseSensitive,
        matchWholeWords: selected.matchWholeWords,
        priority: selected.priority,
        depth: selected.depth,
        probability: selected.probability,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Entry settings saved");
    });
  };

  const moveSelected = (direction: -1 | 1) => {
    if (!selected) return;
    const index = entries.findIndex(
      (entry) => entry.entryId === selected.entryId,
    );
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= entries.length) return;
    const reordered = [...entries];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, moved);
    const normalized = reordered.map((entry, position) => ({
      ...entry,
      sortOrder: position,
    }));
    setEntries(normalized);
    startTransition(async () => {
      const result = await reorderAtlasLorebookEntriesAction({
        lorebookId,
        entryIds: normalized.map((entry) => entry.entryId),
      });
      if (!result.success) {
        toast.error(result.error);
        void hydrate();
      }
    });
  };

  const exportFkf = () => {
    startTransition(async () => {
      const result = await exportAtlasLorebookFkfAction(lorebookId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      downloadJson(`${safeFilename(title)}.fkf.json`, result.data);
      toast.success("FKF export ready");
    });
  };

  const exportJanitor = () => {
    startTransition(async () => {
      const result = await exportAtlasLorebookJanitorAction(lorebookId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      downloadJson(`${safeFilename(title)}.janitor-ai.json`, result.data);
      toast.success("Janitor AI export ready");
    });
  };

  if (loading) {
    return <AtlasLorebookDetailSkeleton />;
  }

  if (!lorebook) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <h1 className="text-2xl font-semibold">Lorebook not found</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/atlas/lorebooks">Back to Lorebooks</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-[92rem] space-y-6 p-3 sm:p-6 md:p-8 lg:p-10"
      style={{
        paddingBottom: "calc(7rem + env(safe-area-inset-bottom))",
      }}
    >
      <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/70 p-5 shadow-sm sm:p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/atlas/lorebooks"
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> All Lorebooks
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {lorebook.title}
              </h1>
              <Badge variant="secondary">{entries.length} entries</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              A Lorebook references canonical Atlas Entries. Membership settings
              control how each Entry behaves when exported.
            </p>
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
                <AlertDialogTitle>Delete “{lorebook.title}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  The Lorebook and its memberships will be removed. The reusable
                  Entries themselves stay in Atlas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={removeLorebook}>
                  Delete Lorebook
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      <Tabs defaultValue="builder" className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-2xl bg-muted/35 p-1 sm:w-fit">
          <TabsTrigger value="builder">
            <BookOpen className="mr-2 h-4 w-4" /> Builder
          </TabsTrigger>
          <TabsTrigger value="entries">
            <ListPlus className="mr-2 h-4 w-4" /> Add Entries
          </TabsTrigger>
          <TabsTrigger value="export">
            <FileJson2 className="mr-2 h-4 w-4" /> Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-5">
          <section className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/70 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-border/60 bg-muted/[0.12] px-4 py-4 sm:px-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">Lorebook setup</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Basic information for this Lorebook.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1.5fr)]">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={160}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  className="min-h-10 resize-y"
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/70 shadow-sm">
            <div className="flex flex-col gap-1 border-b border-border/60 bg-muted/[0.12] px-4 py-4 sm:px-5">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Entry builder</h2>
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Choose an ordered Entry, then configure how it behaves when this
                Lorebook is exported.
              </p>
            </div>

            <div className="grid min-h-0 xl:grid-cols-[21rem_minmax(0,1fr)]">
              <aside className="min-w-0 border-b border-border/60 bg-muted/[0.06] xl:border-b-0 xl:border-r">
                <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">Ordered Entries</p>
                    <p className="text-[10px] text-muted-foreground">
                      {entries.length}{" "}
                      {entries.length === 1 ? "entry" : "entries"}
                    </p>
                  </div>
                </div>

                {entries.length === 0 ? (
                  <div className="p-4">
                    <div className="rounded-xl border border-dashed border-border/70 bg-background/35 p-5 text-center">
                      <BookOpen className="mx-auto h-5 w-5 text-primary" />
                      <p className="mt-2 text-sm font-medium">No Entries yet</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        Use Add Entries to start building this Lorebook.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-[24rem] space-y-1.5 overflow-y-auto overscroll-contain p-2.5 xl:max-h-[36rem]">
                    {entries.map((entry, index) => {
                      const active = selectedEntryId === entry.entryId;

                      return (
                        <button
                          type="button"
                          key={entry.entryId}
                          onClick={() => setSelectedEntryId(entry.entryId)}
                          className={cn(
                            "group flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                            active
                              ? "border-primary/45 bg-primary/[0.08] shadow-sm"
                              : "border-transparent bg-transparent hover:border-border/60 hover:bg-background/55",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {index + 1}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-sm font-medium">
                                {entry.title}
                              </span>

                              {!entry.enabled && (
                                <Badge
                                  variant="outline"
                                  className="h-5 shrink-0 px-1.5 text-[9px]"
                                >
                                  Off
                                </Badge>
                              )}
                            </div>

                            <div className="mt-1.5">
                              <EntryTypeBadge kind={entry.entryType} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </aside>

              <div className="min-w-0 bg-background/20">
                {!selected ? (
                  <div className="flex min-h-[22rem] items-center justify-center p-5 sm:p-8">
                    <div className="max-w-sm text-center">
                      <Settings2 className="mx-auto h-6 w-6 text-primary" />
                      <p className="mt-3 text-sm font-semibold">
                        Select an Entry
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Choose an Entry from the ordered list to configure its
                        activation, insertion, keys, and export behavior.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold">
                            {selected.title}
                          </h3>
                          <EntryTypeBadge kind={selected.entryType} />
                        </div>

                        <Link
                          href={`/atlas/entries/${selected.entryId}`}
                          className="mt-1 inline-flex text-xs font-medium text-primary hover:underline"
                        >
                          Open canonical Entry
                        </Link>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 cursor-pointer rounded-lg"
                          onClick={() => moveSelected(-1)}
                          disabled={
                            pending || entries[0]?.entryId === selected.entryId
                          }
                          aria-label="Move Entry up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 cursor-pointer rounded-lg"
                          onClick={() => moveSelected(1)}
                          disabled={
                            pending ||
                            entries.at(-1)?.entryId === selected.entryId
                          }
                          aria-label="Move Entry down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-5 p-4 sm:p-5">
                      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border/65 bg-muted/[0.08] px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Enabled</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            Disabled Entries stay in the Lorebook but are
                            exported as inactive.
                          </p>
                        </div>

                        <Checkbox
                          className="mt-0.5 shrink-0"
                          checked={selected.enabled}
                          onCheckedChange={(checked) =>
                            updateSelected({ enabled: checked === true })
                          }
                        />
                      </label>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Activation mode</Label>
                          <Select
                            value={selected.activationMode}
                            onValueChange={(value) =>
                              updateSelected({
                                activationMode:
                                  value as ForgeLorebookActivationMode,
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="keywords">Keywords</SelectItem>
                              <SelectItem value="always">
                                Always active
                              </SelectItem>
                              <SelectItem value="conditional">
                                Conditional
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Probability %</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={selected.probability ?? ""}
                            onChange={(event) =>
                              updateSelected({
                                probability:
                                  event.target.value === ""
                                    ? null
                                    : Number(event.target.value),
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Priority</Label>
                          <Input
                            type="number"
                            value={selected.priority}
                            onChange={(event) =>
                              updateSelected({
                                priority: Number(event.target.value) || 0,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Depth</Label>
                          <Input
                            type="number"
                            value={selected.depth ?? ""}
                            onChange={(event) =>
                              updateSelected({
                                depth:
                                  event.target.value === ""
                                    ? null
                                    : Number(event.target.value),
                              })
                            }
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      {selected.activationMode !== "always" && (
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Primary keys</Label>
                              <Textarea
                                value={selected.primaryKeys.join(", ")}
                                onChange={(event) =>
                                  updateSelected({
                                    primaryKeys: splitTokens(
                                      event.target.value,
                                    ),
                                  })
                                }
                                rows={4}
                                placeholder="Wednesday, Addams"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Secondary keys</Label>
                              <Textarea
                                value={selected.secondaryKeys.join(", ")}
                                onChange={(event) =>
                                  updateSelected({
                                    secondaryKeys: splitTokens(
                                      event.target.value,
                                    ),
                                  })
                                }
                                rows={4}
                                placeholder="Optional secondary activation keys"
                              />
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/65 px-3 py-3 text-sm">
                              <Checkbox
                                checked={selected.caseSensitive}
                                onCheckedChange={(checked) =>
                                  updateSelected({
                                    caseSensitive: checked === true,
                                  })
                                }
                              />
                              Case sensitive
                            </label>

                            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/65 px-3 py-3 text-sm">
                              <Checkbox
                                checked={selected.matchWholeWords}
                                onCheckedChange={(checked) =>
                                  updateSelected({
                                    matchWholeWords: checked === true,
                                  })
                                }
                              />
                              Match whole words
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="sticky bottom-0 flex justify-end border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:px-5">
                      <Button
                        className="w-full cursor-pointer rounded-xl bg-primary hover:bg-primary/90 sm:w-auto"
                        onClick={saveSelectedConfig}
                        disabled={pending}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save entry settings
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="entries">
          <Card className="border-border/70 bg-card/85 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Add reusable Entries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={candidateQuery}
                  onChange={(event) => setCandidateQuery(event.target.value)}
                  placeholder="Search Atlas Entries"
                  className="pl-9"
                />
              </div>
              {filteredCandidates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 p-8 text-center text-sm text-muted-foreground">
                  No Entries match this search.
                </div>
              ) : (
                <div className="max-h-[36rem] overflow-y-auto pr-1">
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {filteredCandidates.map((candidate) => (
                      <label
                        key={candidate.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-3 py-3 hover:bg-muted/25"
                      >
                        <Checkbox
                          checked={candidate.linked}
                          onCheckedChange={() => toggleCandidate(candidate)}
                          disabled={pending}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {candidate.title}
                          </p>
                          <div className="mt-1">
                            <EntryTypeBadge kind={candidate.entryType} />
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/70 bg-card/85 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileJson2 className="h-5 w-5 text-primary" /> Forge Knowledge
                  Format
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  Exports the canonical Entries, Lorebook membership settings,
                  and relations between included Entries in FKF v1.
                </p>
                <Button
                  className="bg-primary hover:bg-primary/90 cursor-pointer"
                  onClick={exportFkf}
                  disabled={pending}
                >
                  <Download className="mr-2 h-4 w-4" /> Export FKF
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-card/85 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-primary" /> Janitor AI
                  adapter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  Maps canonical activation settings to Janitor AI fields.
                  Imported source metadata is retained when available, including
                  fields Atlas does not edit directly.
                </p>
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={exportJanitor}
                  disabled={pending}
                >
                  <Download className="mr-2 h-4 w-4" /> Export Janitor AI JSON
                </Button>
              </CardContent>
            </Card>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 text-xs leading-5 text-muted-foreground">
            Atlas keeps <code>priority</code> and source{" "}
            <code>insertion_order</code> separate. For imported Janitor AI data
            the original insertion order is preserved; for native Atlas
            memberships export order is derived from the Lorebook ordering
            instead of pretending both fields mean the same thing.
          </div>
        </TabsContent>
      </Tabs>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 px-3 pt-3 backdrop-blur-xl sm:px-4 lg:left-64"
        style={{
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4">
          <div className="min-w-0 text-xs text-muted-foreground">
            {lorebookDirty ? (
              <>
                <span className="sm:hidden">Unsaved details</span>
                <span className="hidden sm:inline">
                  Lorebook details have unsaved changes.
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">Saved</span>
                <span className="hidden sm:inline">Lorebook details saved</span>
              </span>
            )}
          </div>
          <Button
            onClick={saveLorebook}
            disabled={!lorebookDirty || pending || !title.trim()}
            className="h-10 shrink-0 rounded-xl px-3 sm:px-4"
          >
            <Save className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">
              {pending ? "Saving..." : "Save Lorebook"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
