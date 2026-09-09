"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, FileJson2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createAtlasLorebookAction,
  importJanitorLorebookAction,
} from "@/features/atlas/actions/lorebooks";

export function CreateLorebookDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const [sourceEntries, setSourceEntries] = useState<unknown[] | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setTitle("");
    setDescription("");
    setImportTitle("");
    setFileName("");
    setSourceEntries(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const create = () => {
    startTransition(async () => {
      const result = await createAtlasLorebookAction({ title, description });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      reset();
      router.push(`/atlas/lorebooks/${result.data.id}`);
      router.refresh();
    });
  };

  const importFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      if (!Array.isArray(parsed))
        throw new Error("Expected a JSON array of lorebook entries.");
      setSourceEntries(parsed);
      setFileName(file.name);
      if (!importTitle.trim()) {
        setImportTitle(
          file.name.replace(/\.json$/i, "").replace(/[-_]+/g, " "),
        );
      }
    } catch (error: any) {
      setSourceEntries(null);
      setFileName("");
      toast.error(error?.message || "Could not read this JSON file.");
    }
  };

  const importJanitor = () => {
    if (!sourceEntries) return;
    startTransition(async () => {
      const result = await importJanitorLorebookAction({
        title: importTitle,
        sourceEntries,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Imported ${result.data.importedEntries} entries`);
      setOpen(false);
      reset();
      router.push(`/atlas/lorebooks/${result.data.id}`);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" /> New lorebook
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create a Lorebook</DialogTitle>
          <DialogDescription>
            Build one from reusable Atlas Entries or bring in a Janitor AI
            lorebook JSON.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="new" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">
              <BookOpen className="mr-2 h-4 w-4" /> New
            </TabsTrigger>
            <TabsTrigger value="import">
              <FileJson2 className="mr-2 h-4 w-4" /> Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="new-lorebook-title">Title</Label>
              <Input
                id="new-lorebook-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Nevermore Academy Lorebook"
                maxLength={160}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-lorebook-description">Description</Label>
              <Textarea
                id="new-lorebook-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What this lorebook contains and where you use it."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                className="cursor-pointer"
                onClick={create}
                disabled={pending || !title.trim()}
              >
                {pending ? "Creating..." : "Create lorebook"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="import" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="import-lorebook-title">Lorebook title</Label>
              <Input
                id="import-lorebook-title"
                value={importTitle}
                onChange={(event) => setImportTitle(event.target.value)}
                placeholder="Imported lorebook"
                maxLength={160}
              />
            </div>
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/15 p-5 text-center">
              <Upload className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 text-sm font-medium">
                Janitor AI lorebook JSON
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose the exported JSON array. Atlas creates reusable Entries
                and keeps source metadata for round-tripping.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) =>
                  void importFile(event.target.files?.[0] ?? null)
                }
              />
              <Button
                type="button"
                variant="outline"
                className="mt-4 cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                Choose JSON file
              </Button>
              {fileName && (
                <p className="mt-3 truncate text-xs text-muted-foreground">
                  {fileName} · {sourceEntries?.length ?? 0} entries
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                className="cursor-pointer"
                onClick={importJanitor}
                disabled={pending || !sourceEntries || !importTitle.trim()}
              >
                {pending ? "Importing..." : "Import lorebook"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
