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
  Bot,
  Braces,
  Globe2,
  LibraryBig,
  Plus,
  Save,
  Search,
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
import { MarkdownField } from "@/features/markdown/components/markdown-field";
import { EntryTypeBadge } from "@/features/atlas/components/entries/entry-type-badge";
import { AtlasWorldDetailSkeleton } from "@/features/atlas/components/loading/atlas-loading-skeletons";
import {
  createAtlasWorldPropertyAction,
  deleteAtlasWorldAction,
  deleteAtlasWorldPropertyAction,
  getAtlasWorldAction,
  getAtlasWorldConnectionsAction,
  setAtlasWorldBotLinkAction,
  setAtlasWorldEntryLinkAction,
  updateAtlasWorldAction,
  type AtlasWorldBotLink,
  type AtlasWorldEntryLink,
  type AtlasWorldPropertyDefinition,
  type AtlasWorldRecord,
  type AtlasWorldVisibility,
} from "@/features/atlas/actions/worlds";

const propertyTypeLabels: Record<
  AtlasWorldPropertyDefinition["valueType"],
  string
> = {
  text: "Text",
  number: "Number",
  boolean: "Boolean",
  date: "Date",
  select: "Select",
  multi_select: "Multi-select",
  entry_reference: "Entry reference",
  url: "URL",
};

export function WorldView({ worldId }: { worldId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [world, setWorld] = useState<AtlasWorldRecord | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loreSummary, setLoreSummary] = useState("");
  const [visibility, setVisibility] = useState<AtlasWorldVisibility>("private");
  const [entries, setEntries] = useState<AtlasWorldEntryLink[]>([]);
  const [bots, setBots] = useState<AtlasWorldBotLink[]>([]);
  const [properties, setProperties] = useState<AtlasWorldPropertyDefinition[]>(
    [],
  );
  const [entryQuery, setEntryQuery] = useState("");
  const [botQuery, setBotQuery] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [propertyType, setPropertyType] =
    useState<AtlasWorldPropertyDefinition["valueType"]>("text");
  const [propertyChoices, setPropertyChoices] = useState("");
  const [pending, startTransition] = useTransition();

  const hydrate = useCallback(async () => {
    setLoading(true);
    const [worldResult, connectionsResult] = await Promise.all([
      getAtlasWorldAction(worldId),
      getAtlasWorldConnectionsAction(worldId),
    ]);

    if (!worldResult.success) {
      toast.error(worldResult.error);
      setWorld(null);
      setLoading(false);
      return;
    }

    setWorld(worldResult.data);
    setTitle(worldResult.data.title);
    setDescription(worldResult.data.description);
    setLoreSummary(worldResult.data.loreSummary);
    setVisibility(worldResult.data.visibility);

    if (connectionsResult.success) {
      setEntries(connectionsResult.data.entries);
      setBots(connectionsResult.data.bots);
      setProperties(connectionsResult.data.properties);
    } else {
      toast.error(connectionsResult.error);
    }

    setLoading(false);
  }, [worldId]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const dirty = useMemo(() => {
    if (!world) return false;
    return (
      title.trim() !== world.title ||
      description !== world.description ||
      loreSummary !== world.loreSummary ||
      visibility !== world.visibility
    );
  }, [world, title, description, loreSummary, visibility]);

  const linkedEntries = entries.filter((entry) => entry.linked);
  const linkedBots = bots.filter((bot) => bot.linked);

  const visibleEntries = useMemo(() => {
    const query = entryQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => entry.title.toLowerCase().includes(query));
  }, [entries, entryQuery]);

  const visibleBots = useMemo(() => {
    const query = botQuery.trim().toLowerCase();
    if (!query) return bots;
    return bots.filter((bot) =>
      `${bot.name} ${bot.shortDescription ?? ""}`.toLowerCase().includes(query),
    );
  }, [bots, botQuery]);

  const save = () => {
    if (!world) return;
    startTransition(async () => {
      const result = await updateAtlasWorldAction({
        id: world.id,
        title,
        description,
        loreSummary,
        visibility,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setWorld(result.data);
      setTitle(result.data.title);
      setDescription(result.data.description);
      setLoreSummary(result.data.loreSummary);
      setVisibility(result.data.visibility);
      toast.success("World saved");
      router.refresh();
    });
  };

  const removeWorld = () => {
    startTransition(async () => {
      const result = await deleteAtlasWorldAction(worldId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("World deleted. Its Entries were kept.");
      router.push("/atlas/worlds");
      router.refresh();
    });
  };

  const toggleEntry = (entry: AtlasWorldEntryLink) => {
    const next = !entry.linked;
    setEntries((current) =>
      current.map((item) =>
        item.id === entry.id ? { ...item, linked: next } : item,
      ),
    );

    startTransition(async () => {
      const result = await setAtlasWorldEntryLinkAction({
        worldId,
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
      }
    });
  };

  const toggleBot = (bot: AtlasWorldBotLink) => {
    const next = !bot.linked;
    setBots((current) =>
      current.map((item) =>
        item.id === bot.id ? { ...item, linked: next } : item,
      ),
    );

    startTransition(async () => {
      const result = await setAtlasWorldBotLinkAction({
        worldId,
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

  const addProperty = () => {
    const choices = propertyChoices
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await createAtlasWorldPropertyAction({
        worldId,
        name: propertyName,
        valueType: propertyType,
        choices,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setProperties((current) => [...current, result.data]);
      setPropertyName("");
      setPropertyChoices("");
      setPropertyType("text");
      toast.success("Property added");
    });
  };

  const removeProperty = (propertyId: string) => {
    startTransition(async () => {
      const result = await deleteAtlasWorldPropertyAction({
        worldId,
        propertyId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setProperties((current) =>
        current.filter((item) => item.id !== propertyId),
      );
      toast.success("Property removed");
    });
  };

  if (loading) {
    return <AtlasWorldDetailSkeleton />;
  }

  if (!world) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <Globe2 className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">World not found</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/atlas/worlds">Back to Worlds</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-28 sm:p-6 md:p-8 lg:p-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/atlas/worlds"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All Worlds
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Globe2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                {world.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                /{world.slug}
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
              <Trash2 className="mr-2 h-4 w-4" /> Delete World
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {world.title}?</AlertDialogTitle>
              <AlertDialogDescription>
                The World and its memberships will be removed. Your Entries,
                Bots, and Lorebooks will not be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={removeWorld}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              >
                Delete World
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/70 bg-card/85">
          <CardContent className="flex items-center gap-3 p-4">
            <LibraryBig className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-bold">{linkedEntries.length}</p>
              <p className="text-xs text-muted-foreground">Entries</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardContent className="flex items-center gap-3 p-4">
            <Bot className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-bold">{linkedBots.length}</p>
              <p className="text-xs text-muted-foreground">Bots</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardContent className="flex items-center gap-3 p-4">
            <Braces className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-bold">{properties.length}</p>
              <p className="text-xs text-muted-foreground">Custom properties</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-muted/35 p-1 sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="entries">
            Entries{" "}
            <span className="ml-1 text-xs text-muted-foreground">
              {linkedEntries.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="bots">
            Bots{" "}
            <span className="ml-1 text-xs text-muted-foreground">
              {linkedBots.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="properties">
            Properties{" "}
            <span className="ml-1 text-xs text-muted-foreground">
              {properties.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <Card className="border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle>World details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="world-title">Title</Label>
                <Input
                  id="world-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={160}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="world-description">Description</Label>
                <Textarea
                  id="world-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  placeholder="A short explanation of this World and its scope."
                />
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={visibility}
                  onValueChange={(value) =>
                    setVisibility(value as AtlasWorldVisibility)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Private Worlds stay inside your Atlas workspace. Public Worlds
                  can appear on your public Profile and published Creator Pages
                  when those surfaces include them.
                </p>
              </div>
              <div className="space-y-2">
                <Label>World notes</Label>
                <p className="text-xs text-muted-foreground">
                  Use Markdown for longer setting notes, rules, themes, eras, or
                  context that belongs to the World rather than one Entry.
                </p>
                <MarkdownField
                  value={loreSummary}
                  onChange={setLoreSummary}
                  minEditorHeightRem={14}
                  placeholder="Write World-level notes..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/70 bg-card/85">
              <CardHeader>
                <CardTitle className="text-base">
                  Recently linked Entries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {linkedEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No Entries linked yet.
                  </p>
                ) : (
                  linkedEntries.slice(0, 6).map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/atlas/entries/${entry.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5 hover:bg-muted/35"
                    >
                      <span className="truncate text-sm font-medium">
                        {entry.title}
                      </span>
                      <EntryTypeBadge kind={entry.entryType} />
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-card/85">
              <CardHeader>
                <CardTitle className="text-base">Linked Bots</CardTitle>
              </CardHeader>
              <CardContent>
                {linkedBots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No Bots linked yet.
                  </p>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {linkedBots.map((bot) => (
                      <div
                        key={bot.id}
                        className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                          {bot.imageUrl ? (
                            <img
                              src={bot.imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Bot className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {bot.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {bot.shortDescription || "No short description"}
                          </p>
                        </div>
                        {bot.rating && (
                          <Badge variant="outline">{bot.rating}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="entries">
          <Card className="border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle>Entries in this World</CardTitle>
              <p className="text-sm text-muted-foreground">
                Membership is many-to-many. Linking an Entry here never moves or
                duplicates it.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={entryQuery}
                  onChange={(event) => setEntryQuery(event.target.value)}
                  placeholder="Search Entries..."
                  className="pl-9"
                />
              </div>
              {entries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  Create Entries first, then link them to this World.
                </div>
              ) : (
                <div className="max-h-[34rem] overflow-y-auto pr-1">
                  <div className="grid gap-2 md:grid-cols-2">
                    {visibleEntries.map((entry) => (
                      <label
                        key={entry.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/65 bg-background/40 p-3 transition-colors hover:bg-muted/30"
                      >
                        <Checkbox
                          checked={entry.linked}
                          onCheckedChange={() => toggleEntry(entry)}
                          disabled={pending}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {entry.title}
                          </p>
                        </div>
                        <EntryTypeBadge kind={entry.entryType} />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bots">
          <Card className="border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle>Bots in this World</CardTitle>
              <p className="text-sm text-muted-foreground">
                Use this to group Bots that share continuity or source material.
                Entry-to-Bot knowledge links remain separate.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={botQuery}
                  onChange={(event) => setBotQuery(event.target.value)}
                  placeholder="Search Bots..."
                  className="pl-9"
                />
              </div>
              {bots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  No Bots are available in your account yet.
                </div>
              ) : (
                <div className="max-h-[34rem] overflow-y-auto pr-1">
                  <div className="grid gap-2 md:grid-cols-2">
                    {visibleBots.map((bot) => (
                      <label
                        key={bot.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/65 bg-background/40 p-3 transition-colors hover:bg-muted/30"
                      >
                        <Checkbox
                          checked={bot.linked}
                          onCheckedChange={() => toggleBot(bot)}
                          disabled={pending}
                        />
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                          {bot.imageUrl ? (
                            <img
                              src={bot.imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Bot className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {bot.name}
                          </p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {bot.shortDescription || "No short description"}
                          </p>
                        </div>
                        {bot.rating && (
                          <Badge variant="outline">{bot.rating}</Badge>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties">
          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <Card className="border-border/70 bg-card/85">
              <CardHeader>
                <CardTitle className="text-base">
                  Add property definition
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Define reusable fields for Entries associated with this World.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Property name</Label>
                  <Input
                    value={propertyName}
                    onChange={(event) => setPropertyName(event.target.value)}
                    placeholder="e.g. Affiliation"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={propertyType}
                    onValueChange={(value) =>
                      setPropertyType(
                        value as AtlasWorldPropertyDefinition["valueType"],
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(propertyTypeLabels).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {(propertyType === "select" ||
                  propertyType === "multi_select") && (
                  <div className="space-y-2">
                    <Label>Choices</Label>
                    <Input
                      value={propertyChoices}
                      onChange={(event) =>
                        setPropertyChoices(event.target.value)
                      }
                      placeholder="Student, Teacher, Staff"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated.
                    </p>
                  </div>
                )}
                <Button
                  onClick={addProperty}
                  className="w-full cursor-pointer"
                  disabled={pending || !propertyName.trim()}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add property
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/85">
              <CardHeader>
                <CardTitle className="text-base">
                  World property schema
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  These definitions are ready for per-Entry values. Value
                  editing will be connected in the next Atlas refinement.
                </p>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    No custom properties yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {properties.map((property) => (
                      <div
                        key={property.id}
                        className="flex items-center gap-3 rounded-xl border border-border/65 bg-muted/15 px-3 py-3"
                      >
                        <Braces className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {property.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {property.key} ·{" "}
                            {propertyTypeLabels[property.valueType]}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProperty(property.id)}
                          disabled={pending}
                          aria-label={`Delete ${property.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 p-3 shadow-[0_-10px_30px_-20px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:left-64">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-1 sm:px-4">
            <p className="text-sm text-muted-foreground">
              You have unsaved World changes.
            </p>
            <Button onClick={save} disabled={pending || !title.trim()}>
              <Save className="mr-2 h-4 w-4" />{" "}
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
