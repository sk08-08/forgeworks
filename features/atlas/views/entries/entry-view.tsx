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
  BookOpen,
  Bot,
  Check,
  FolderKanban,
  Globe2,
  Link2,
  ListChecks,
  Plus,
  Save,
  Tags,
  Trash2,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { MarkdownField } from "@/features/markdown/components/markdown-field";
import {
  createAtlasRelationAction,
  deleteAtlasEntryAction,
  deleteAtlasRelationAction,
  getAtlasEntryAction,
  getAtlasEntryConnectionsAction,
  getAtlasEntryPropertiesAction,
  saveAtlasEntryPropertyValuesAction,
  setAtlasEntryBotLinkAction,
  setAtlasEntryCollectionLinkAction,
  setAtlasEntryLorebookLinkAction,
  setAtlasEntryWorldLinkAction,
  updateAtlasEntryAction,
  type AtlasEntryBotLink,
  type AtlasEntryCollectionLink,
  type AtlasEntryLorebookLink,
  type AtlasEntryPropertyDefinition,
  type AtlasEntryRecord,
  type AtlasEntryRelationRecord,
  type AtlasEntryWorldLink,
  type AtlasEntryOption,
} from "@/features/atlas/actions/entries";
import {
  ATLAS_ENTRY_TYPE_LABELS,
  EntryTypeBadge,
} from "@/features/atlas/components/entries/entry-type-badge";
import type { AtlasEntryKind } from "@/features/atlas/types/atlas-types";
import { AtlasEntryDetailSkeleton } from "@/features/atlas/components/loading/atlas-loading-skeletons";

const kinds = Object.keys(ATLAS_ENTRY_TYPE_LABELS) as AtlasEntryKind[];

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

function JoinTokens({ values }: { values: string[] }) {
  if (values.length === 0)
    return <span className="text-muted-foreground">None</span>;
  return <>{values.join(", ")}</>;
}

function getPropertyChoices(definition: AtlasEntryPropertyDefinition) {
  return Array.isArray(definition.options.choices)
    ? definition.options.choices.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
}

function PropertyEditor({
  definition,
  value,
  entryOptions,
  onChange,
}: {
  definition: AtlasEntryPropertyDefinition;
  value: unknown;
  entryOptions: AtlasEntryOption[];
  onChange: (value: unknown) => void;
}) {
  const choices = getPropertyChoices(definition);

  if (definition.valueType === "boolean") {
    return (
      <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-background/50 px-3 py-2">
        <Checkbox
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <span className="text-sm">{Boolean(value) ? "Yes" : "No"}</span>
      </label>
    );
  }

  if (definition.valueType === "select") {
    const current = typeof value === "string" && value ? value : "__none";
    return (
      <Select
        value={current}
        onValueChange={(next) => onChange(next === "__none" ? null : next)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">Not set</SelectItem>
          {choices.map((choice) => (
            <SelectItem key={choice} value={choice}>
              {choice}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (definition.valueType === "multi_select") {
    const selected = new Set(
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [],
    );
    return (
      <div className="grid gap-2 rounded-xl border border-border/70 bg-background/40 p-3 sm:grid-cols-2">
        {choices.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No choices are configured for this property yet.
          </p>
        ) : (
          choices.map((choice) => (
            <label
              key={choice}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={selected.has(choice)}
                onCheckedChange={(checked) => {
                  const next = new Set(selected);
                  if (checked === true) next.add(choice);
                  else next.delete(choice);
                  onChange(Array.from(next));
                }}
              />
              <span>{choice}</span>
            </label>
          ))
        )}
      </div>
    );
  }

  if (definition.valueType === "entry_reference") {
    const current = typeof value === "string" && value ? value : "__none";
    return (
      <Select
        value={current}
        onValueChange={(next) => onChange(next === "__none" ? null : next)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">Not set</SelectItem>
          {entryOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.title} · {ATLAS_ENTRY_TYPE_LABELS[option.entryType]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      type={
        definition.valueType === "number"
          ? "number"
          : definition.valueType === "date"
            ? "date"
            : definition.valueType === "url"
              ? "url"
              : "text"
      }
      value={
        typeof value === "string" || typeof value === "number"
          ? String(value)
          : ""
      }
      onChange={(event) => onChange(event.target.value)}
      placeholder={definition.valueType === "url" ? "https://..." : "Not set"}
    />
  );
}

export function EntryView({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<AtlasEntryRecord | null>(null);
  const [title, setTitle] = useState("");
  const [entryType, setEntryType] = useState<AtlasEntryKind>("note");
  const [content, setContent] = useState("");
  const [aliasesInput, setAliasesInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [entryOptions, setEntryOptions] = useState<AtlasEntryOption[]>([]);
  const [relations, setRelations] = useState<AtlasEntryRelationRecord[]>([]);
  const [worlds, setWorlds] = useState<AtlasEntryWorldLink[]>([]);
  const [collections, setCollections] = useState<AtlasEntryCollectionLink[]>(
    [],
  );
  const [lorebooks, setLorebooks] = useState<AtlasEntryLorebookLink[]>([]);
  const [bots, setBots] = useState<AtlasEntryBotLink[]>([]);
  const [propertyDefinitions, setPropertyDefinitions] = useState<
    AtlasEntryPropertyDefinition[]
  >([]);
  const [propertyValues, setPropertyValues] = useState<Record<string, unknown>>(
    {},
  );
  const [savedPropertyValues, setSavedPropertyValues] = useState<
    Record<string, unknown>
  >({});
  const [propertyEntryOptions, setPropertyEntryOptions] = useState<
    AtlasEntryOption[]
  >([]);
  const [relationTargetId, setRelationTargetId] = useState("");
  const [relationLabel, setRelationLabel] = useState("");
  const [relationInverseLabel, setRelationInverseLabel] = useState("");
  const [pending, startTransition] = useTransition();

  const hydrate = useCallback(async () => {
    setLoading(true);
    const [entryResult, connectionsResult, propertiesResult] =
      await Promise.all([
        getAtlasEntryAction(entryId),
        getAtlasEntryConnectionsAction(entryId),
        getAtlasEntryPropertiesAction(entryId),
      ]);

    if (!entryResult.success) {
      toast.error(entryResult.error);
      setEntry(null);
      setLoading(false);
      return;
    }

    const record = entryResult.data;
    setEntry(record);
    setTitle(record.title);
    setEntryType(record.entryType);
    setContent(record.content);
    setAliasesInput(record.aliases.join(", "));
    setTagsInput(record.tags.join(", "));

    if (connectionsResult.success) {
      setEntryOptions(connectionsResult.data.entryOptions);
      setRelations(connectionsResult.data.relations);
      setWorlds(connectionsResult.data.worlds);
      setCollections(connectionsResult.data.collections);
      setLorebooks(connectionsResult.data.lorebooks);
      setBots(connectionsResult.data.bots);
    } else {
      toast.error(connectionsResult.error);
    }

    if (propertiesResult.success) {
      setPropertyDefinitions(propertiesResult.data.definitions);
      setPropertyValues(propertiesResult.data.values);
      setSavedPropertyValues(propertiesResult.data.values);
      setPropertyEntryOptions(propertiesResult.data.entryOptions);
    } else {
      toast.error(propertiesResult.error);
    }
    setLoading(false);
  }, [entryId]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const aliases = useMemo(() => splitTokens(aliasesInput), [aliasesInput]);
  const tags = useMemo(() => splitTokens(tagsInput), [tagsInput]);
  const entryDirty = useMemo(() => {
    if (!entry) return false;
    return (
      title.trim() !== entry.title ||
      entryType !== entry.entryType ||
      content !== entry.content ||
      aliases.join("\0") !== entry.aliases.join("\0") ||
      tags.join("\0") !== entry.tags.join("\0")
    );
  }, [entry, title, entryType, content, aliases, tags]);
  const propertyDirty = useMemo(
    () =>
      JSON.stringify(propertyValues) !== JSON.stringify(savedPropertyValues),
    [propertyValues, savedPropertyValues],
  );
  const dirty = entryDirty || propertyDirty;

  const save = () => {
    if (!entry) return;
    startTransition(async () => {
      let savedEntry = entry;

      if (entryDirty) {
        const result = await updateAtlasEntryAction({
          id: entry.id,
          title,
          entryType,
          content,
          aliases,
          tags,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        savedEntry = result.data;
        setEntry(result.data);
        setTitle(result.data.title);
        setEntryType(result.data.entryType);
        setContent(result.data.content);
        setAliasesInput(result.data.aliases.join(", "));
        setTagsInput(result.data.tags.join(", "));
      }

      if (propertyDirty) {
        const propertyResult = await saveAtlasEntryPropertyValuesAction({
          entryId: entry.id,
          values: propertyDefinitions.map((definition) => ({
            propertyDefinitionId: definition.id,
            value: propertyValues[definition.id] ?? null,
          })),
        });
        if (!propertyResult.success) {
          setEntry(savedEntry);
          toast.error(propertyResult.error);
          return;
        }
        setPropertyValues(propertyResult.data);
        setSavedPropertyValues(propertyResult.data);
      }

      toast.success("Entry saved");
      router.refresh();
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await deleteAtlasEntryAction(entryId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Entry moved out of Atlas");
      router.push("/atlas/entries");
      router.refresh();
    });
  };

  const addRelation = () => {
    if (!relationTargetId) return;
    startTransition(async () => {
      const result = await createAtlasRelationAction({
        sourceEntryId: entryId,
        targetEntryId: relationTargetId,
        relationType: relationLabel || "related_to",
        label: relationLabel,
        inverseLabel: relationInverseLabel,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setRelations((current) => [...current, result.data]);
      setRelationTargetId("");
      setRelationLabel("");
      setRelationInverseLabel("");
      toast.success("Relation added");
    });
  };

  const removeRelation = (relationId: string) => {
    startTransition(async () => {
      const result = await deleteAtlasRelationAction(relationId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setRelations((current) =>
        current.filter((item) => item.id !== relationId),
      );
    });
  };

  const toggleWorld = (world: AtlasEntryWorldLink) => {
    const next = !world.linked;
    setWorlds((current) =>
      current.map((item) =>
        item.id === world.id ? { ...item, linked: next } : item,
      ),
    );
    startTransition(async () => {
      const result = await setAtlasEntryWorldLinkAction({
        entryId,
        worldId: world.id,
        linked: next,
      });
      if (!result.success) {
        setWorlds((current) =>
          current.map((item) =>
            item.id === world.id ? { ...item, linked: !next } : item,
          ),
        );
        toast.error(result.error);
        return;
      }

      const propertiesResult = await getAtlasEntryPropertiesAction(entryId);
      if (propertiesResult.success) {
        setPropertyDefinitions(propertiesResult.data.definitions);
        setPropertyValues(propertiesResult.data.values);
        setSavedPropertyValues(propertiesResult.data.values);
        setPropertyEntryOptions(propertiesResult.data.entryOptions);
      }
    });
  };

  const toggleCollection = (collection: AtlasEntryCollectionLink) => {
    const next = !collection.linked;
    setCollections((current) =>
      current.map((item) =>
        item.id === collection.id ? { ...item, linked: next } : item,
      ),
    );
    startTransition(async () => {
      const result = await setAtlasEntryCollectionLinkAction({
        entryId,
        collectionId: collection.id,
        linked: next,
      });
      if (!result.success) {
        setCollections((current) =>
          current.map((item) =>
            item.id === collection.id ? { ...item, linked: !next } : item,
          ),
        );
        toast.error(result.error);
      }
    });
  };

  const toggleLorebook = (lorebook: AtlasEntryLorebookLink) => {
    const next = !lorebook.linked;
    setLorebooks((current) =>
      current.map((item) =>
        item.id === lorebook.id ? { ...item, linked: next } : item,
      ),
    );
    startTransition(async () => {
      const result = await setAtlasEntryLorebookLinkAction({
        entryId,
        lorebookId: lorebook.id,
        linked: next,
      });
      if (!result.success) {
        setLorebooks((current) =>
          current.map((item) =>
            item.id === lorebook.id ? { ...item, linked: !next } : item,
          ),
        );
        toast.error(result.error);
      }
    });
  };

  const toggleBot = (bot: AtlasEntryBotLink) => {
    const next = !bot.linked;
    setBots((current) =>
      current.map((item) =>
        item.id === bot.id ? { ...item, linked: next } : item,
      ),
    );
    startTransition(async () => {
      const result = await setAtlasEntryBotLinkAction({
        entryId,
        botId: bot.id,
        linked: next,
      });
      if (!result.success) {
        setBots((current) =>
          current.map((item) =>
            item.id === bot.id ? { ...item, linked: !next } : item,
          ),
        );
        toast.error(result.error);
      }
    });
  };

  if (loading) {
    return <AtlasEntryDetailSkeleton />;
  }

  if (!entry) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <h1 className="text-2xl font-semibold">Entry not found</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/atlas/entries">Back to entries</Link>
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
              href="/atlas/entries"
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> All entries
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {entry.title}
              </h1>
              <EntryTypeBadge kind={entry.entryType} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Updated{" "}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(entry.updatedAt))}
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
                <AlertDialogTitle>Delete “{entry.title}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  The entry will be soft-deleted and disappear from Worlds,
                  Collections, Lorebooks and Relations through their links.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>
                  Delete entry
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <Card className="border-border/70 bg-card/85 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Identity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-[1fr_14rem]">
              <div className="space-y-2">
                <Label htmlFor="entry-title">Title</Label>
                <Input
                  id="entry-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={160}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={entryType}
                  onValueChange={(value) =>
                    setEntryType(value as AtlasEntryKind)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kinds.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {ATLAS_ENTRY_TYPE_LABELS[kind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="entry-aliases">Aliases</Label>
                <Input
                  id="entry-aliases"
                  value={aliasesInput}
                  onChange={(event) => setAliasesInput(event.target.value)}
                  placeholder="Aurelia, Princess Aurelia, The Silver Princess"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated names. These can later help references and
                  lorebook activation suggestions.
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="entry-tags">Tags</Label>
                <Input
                  id="entry-tags"
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder="royalty, protagonist, elven"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/85 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tags className="h-5 w-5 text-primary" /> Knowledge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MarkdownField
                value={content}
                onChange={setContent}
                placeholder="Write the canonical information for this entry..."
                minEditorHeightRem={22}
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/85 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListChecks className="h-5 w-5 text-primary" /> World properties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {propertyDefinitions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 p-5 text-sm text-muted-foreground">
                  This Entry has no World properties yet. Link it to a World,
                  then define fields such as affiliation, age, status, or home
                  from that World.
                </div>
              ) : (
                Array.from(
                  new Set(
                    propertyDefinitions.map((definition) => definition.worldId),
                  ),
                ).map((worldId) => {
                  const definitions = propertyDefinitions.filter(
                    (definition) => definition.worldId === worldId,
                  );
                  const worldTitle = definitions[0]?.worldTitle ?? "World";
                  return (
                    <div
                      key={worldId}
                      className="space-y-3 rounded-2xl border border-border/70 bg-muted/10 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{worldTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            Fields defined by this World
                          </p>
                        </div>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/atlas/worlds/${worldId}`}>
                            Open World
                          </Link>
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {definitions.map((definition) => (
                          <div
                            key={definition.id}
                            className={
                              definition.valueType === "multi_select"
                                ? "space-y-2 md:col-span-2"
                                : "space-y-2"
                            }
                          >
                            <Label>{definition.name}</Label>
                            <PropertyEditor
                              definition={definition}
                              value={propertyValues[definition.id]}
                              entryOptions={propertyEntryOptions.filter(
                                (option) => option.id !== entryId,
                              )}
                              onChange={(value) =>
                                setPropertyValues((current) => ({
                                  ...current,
                                  [definition.id]: value,
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/85 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link2 className="h-5 w-5 text-primary" /> Relations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {relations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 p-5 text-sm text-muted-foreground">
                  No semantic relations yet. Connect this entry to another piece
                  of your canon.
                </div>
              ) : (
                <div className="space-y-2">
                  {relations.map((relation) => (
                    <div
                      key={relation.id}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/50 px-3 py-2.5"
                    >
                      <Badge variant="outline">
                        {relation.label ||
                          relation.relationType.replaceAll("_", " ")}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      {relation.target ? (
                        <Link
                          href={`/atlas/entries/${relation.target.id}`}
                          className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary"
                        >
                          {relation.target.title}
                        </Link>
                      ) : (
                        <span className="flex-1 text-sm text-muted-foreground">
                          Missing entry
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRelation(relation.id)}
                        disabled={pending}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {entryOptions.length > 0 && (
                <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/15 p-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Target entry</Label>
                    <Select
                      value={relationTargetId}
                      onValueChange={setRelationTargetId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose an entry" />
                      </SelectTrigger>
                      <SelectContent>
                        {entryOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.title} ·{" "}
                            {ATLAS_ENTRY_TYPE_LABELS[option.entryType]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Relation label</Label>
                    <Input
                      value={relationLabel}
                      onChange={(e) => setRelationLabel(e.target.value)}
                      placeholder="lives in"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Inverse label</Label>
                    <Input
                      value={relationInverseLabel}
                      onChange={(e) => setRelationInverseLabel(e.target.value)}
                      placeholder="home of"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={addRelation}
                      disabled={!relationTargetId || pending}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add relation
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="border-border/70 bg-card/85 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe2 className="h-4 w-4 text-primary" /> Worlds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {worlds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No Worlds yet. Entries do not require one.
                </p>
              ) : (
                worlds.map((world) => (
                  <label
                    key={world.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={world.linked}
                      onCheckedChange={() => toggleWorld(world)}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {world.title}
                    </span>
                  </label>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/85 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderKanban className="h-4 w-4 text-primary" /> Collections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {collections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No Collections yet.
                </p>
              ) : (
                collections.map((collection) => (
                  <label
                    key={collection.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={collection.linked}
                      onCheckedChange={() => toggleCollection(collection)}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {collection.title}
                    </span>
                  </label>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/85 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-primary" /> Lorebooks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lorebooks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No Lorebooks yet.
                </p>
              ) : (
                lorebooks.map((lorebook) => (
                  <label
                    key={lorebook.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={lorebook.linked}
                      onCheckedChange={() => toggleLorebook(lorebook)}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {lorebook.title}
                    </span>
                  </label>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/85 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4 text-primary" /> Used by bots
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No bots available.
                </p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {bots.map((bot) => (
                    <label
                      key={bot.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/30"
                    >
                      <Checkbox
                        checked={bot.linked}
                        onCheckedChange={() => toggleBot(bot)}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {bot.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/85 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Current metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Aliases</p>
                <p className="mt-1">
                  <JoinTokens values={aliases} />
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tags</p>
                <p className="mt-1">
                  <JoinTokens values={tags} />
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 px-3 pt-3 backdrop-blur-xl sm:px-4 lg:left-64"
        style={{
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4">
          <div className="min-w-0 text-xs text-muted-foreground">
            {dirty ? (
              <>
                <span className="sm:hidden">Unsaved changes</span>
                <span className="hidden sm:inline">
                  You have unsaved changes.
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">Saved</span>
                <span className="hidden sm:inline">All changes saved</span>
              </span>
            )}
          </div>
          <Button
            onClick={save}
            disabled={!dirty || pending || !title.trim()}
            className="h-10 shrink-0 rounded-xl px-3 sm:px-4 cursor-pointer"
          >
            <Save className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">
              {pending ? "Saving..." : "Save entry"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
