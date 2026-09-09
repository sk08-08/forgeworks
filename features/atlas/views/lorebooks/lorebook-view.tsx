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
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-28 sm:p-6 md:p-8 lg:p-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/atlas/lorebooks"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All Lorebooks
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-3xl font-bold tracking-tight sm:text-4xl">
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
      </section>

      <Tabs defaultValue="builder" className="space-y-5">
        <TabsList>
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

        <TabsContent value="builder" className="space-y-6">
          <Card className="border-border/70 bg-card/85 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Lorebook details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={160}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <Card className="border-border/70 bg-card/85 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Ordered Entries</CardTitle>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 p-5 text-sm text-muted-foreground">
                    No Entries yet. Use the Add Entries tab to build this
                    Lorebook.
                  </div>
                ) : (
                  <div className="max-h-[36rem] space-y-2 overflow-y-auto pr-1">
                    {entries.map((entry, index) => (
                    <button
                      type="button"
                      key={entry.entryId}
                      onClick={() => setSelectedEntryId(entry.entryId)}
                      className={`w-full cursor-pointer rounded-xl border px-3 py-3 text-left transition ${selectedEntryId === entry.entryId ? "border-primary/50 bg-primary/8" : "border-border/70 bg-background/45 hover:bg-muted/30"}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-xs font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {entry.title}
                            </span>
                            {!entry.enabled && (
                              <Badge variant="outline">Off</Badge>
                            )}
                          </div>
                          <div className="mt-1">
                            <EntryTypeBadge kind={entry.entryType} />
                          </div>
                        </div>
                      </div>
                    </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/85 shadow-sm self-start">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings2 className="h-4 w-4 text-primary" /> Entry settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selected ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 p-8 text-center text-sm text-muted-foreground">
                    Select a Lorebook Entry to configure its activation and
                    insertion behavior.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate font-semibold">
                            {selected.title}
                          </h2>
                          <EntryTypeBadge kind={selected.entryType} />
                        </div>
                        <Link
                          href={`/atlas/entries/${selected.entryId}`}
                          className="mt-1 inline-block text-xs text-primary hover:underline"
                        >
                          Open canonical Entry
                        </Link>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => moveSelected(-1)}
                          disabled={
                            pending || entries[0]?.entryId === selected.entryId
                          }
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => moveSelected(1)}
                          disabled={
                            pending ||
                            entries.at(-1)?.entryId === selected.entryId
                          }
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border/70 bg-background/50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">Enabled</p>
                        <p className="text-xs text-muted-foreground">
                          Disabled Entries stay in the Lorebook but are exported
                          as inactive.
                        </p>
                      </div>
                      <Checkbox
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
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Primary keys</Label>
                          <Textarea
                            value={selected.primaryKeys.join(", ")}
                            onChange={(event) =>
                              updateSelected({
                                primaryKeys: splitTokens(event.target.value),
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
                                secondaryKeys: splitTokens(event.target.value),
                              })
                            }
                            rows={4}
                            placeholder="Optional secondary activation keys"
                          />
                        </div>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5 text-sm">
                          <Checkbox
                            checked={selected.caseSensitive}
                            onCheckedChange={(checked) =>
                              updateSelected({
                                caseSensitive: checked === true,
                              })
                            }
                          />{" "}
                          Case sensitive
                        </label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5 text-sm">
                          <Checkbox
                            checked={selected.matchWholeWords}
                            onCheckedChange={(checked) =>
                              updateSelected({
                                matchWholeWords: checked === true,
                              })
                            }
                          />{" "}
                          Match whole words
                        </label>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        className="bg-primary hover:bg-primary/90 cursor-pointer"
                        onClick={saveSelectedConfig}
                        disabled={pending}
                      >
                        <Save className="mr-2 h-4 w-4" /> Save entry settings
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 px-4 py-3 backdrop-blur-xl lg:left-64">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            {lorebookDirty ? (
              "Lorebook details have unsaved changes."
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" /> Lorebook details saved
              </span>
            )}
          </div>
          <Button
            onClick={saveLorebook}
            disabled={!lorebookDirty || pending || !title.trim()}
            className="rounded-xl"
          >
            <Save className="mr-2 h-4 w-4" />{" "}
            {pending ? "Saving..." : "Save Lorebook"}
          </Button>
        </div>
      </div>
    </div>
  );
}
