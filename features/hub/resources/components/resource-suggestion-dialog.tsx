"use client";

import { useEffect, useRef, useState } from "react";

import { FileText, Globe, Loader2, Send, Sparkles } from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  MarkdownField,
  type MarkdownFieldHandle,
} from "@/features/markdown/components/markdown-field";

import {
  importResourceFromUrl,
  submitResourceSuggestion,
} from "@/features/hub/resources/actions/resources";

type ResourceSection = {
  id: string;
  title: string;
};

export type EditableResource = {
  id: string;
  sectionId: string;
  title: string;
  summary: string;
  url: string;
  label: string;
};

type ResourceSuggestionDialogProps = {
  open: boolean;

  onOpenChange: (open: boolean) => void;

  sections: ResourceSection[];

  defaultSectionId?: string | null;

  resource?: EditableResource | null;
};

const NONE_CATEGORY = "__none__";

export function ResourceSuggestionDialog({
  open,
  onOpenChange,
  sections,
  defaultSectionId = null,
  resource = null,
}: ResourceSuggestionDialogProps) {
  const isEditing = Boolean(resource);

  const markdownRef = useRef<MarkdownFieldHandle | null>(null);

  const [sectionId, setSectionId] = useState(defaultSectionId || NONE_CATEGORY);

  const [title, setTitle] = useState("");

  const [label, setLabel] = useState("");

  const [url, setUrl] = useState("");

  const [summary, setSummary] = useState("");

  const [importUrl, setImportUrl] = useState("");

  const [importing, setImporting] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (resource) {
      setSectionId(resource.sectionId || NONE_CATEGORY);
      setTitle(resource.title);
      setLabel(resource.label);
      setUrl(resource.url);
      setSummary(resource.summary);
      setImportUrl("");

      return;
    }

    setSectionId(defaultSectionId || NONE_CATEGORY);
    setTitle("");
    setLabel("");
    setUrl("");
    setSummary("");
    setImportUrl("");
  }, [defaultSectionId, open, resource]);

  const reset = () => {
    setSectionId(defaultSectionId || NONE_CATEGORY);

    setTitle("");

    setLabel("");

    setUrl("");

    setSummary("");

    setImportUrl("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (submitting || importing) {
      return;
    }

    if (!nextOpen) {
      reset();
    }

    onOpenChange(nextOpen);
  };

  const handleImport = async () => {
    if (!importUrl.trim()) {
      toast.error("Paste a URL first.");

      return;
    }

    setImporting(true);

    try {
      const result = await importResourceFromUrl(importUrl);

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      const imported = result.resource;

      setImportUrl(imported.url);

      setUrl(imported.url);

      setTitle(imported.title || "");

      setSummary(imported.summary || "");

      toast.success("Content imported. Review and edit it before submitting.");
    } catch (error) {
      console.error(error);

      toast.error("Could not import that page.");
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Enter a resource title.");

      return;
    }

    if (!summary.trim() && !url.trim()) {
      toast.error("Add some content or provide a URL.");

      return;
    }

    setSubmitting(true);

    try {
      const result = await submitResourceSuggestion({
        sectionId: sectionId === NONE_CATEGORY ? null : sectionId,

        title,

        summary,

        url,

        label,

        submissionType: resource ? "update" : "create",

        targetEntryId: resource?.id || null,
      });

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      toast.success(
        resource ? "Changes sent for review." : "Resource sent for review.",
      );

      reset();

      onOpenChange(false);
    } catch (error) {
      console.error(error);

      toast.error("Could not submit the resource.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        id="resource-suggestion-dialog"
        className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-4xl"
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit your resource" : "Suggest a resource"}
          </DialogTitle>

          <DialogDescription>
            {isEditing
              ? "Update your resource and submit the changes for staff review."
              : "Share a useful guide, tool, reference or article with the Forgeworks community. Suggestions are reviewed before appearing in the public library."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto pr-2">
          <div className="space-y-6 py-1">
            <Tabs defaultValue="write">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="write" className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  Write
                </TabsTrigger>

                <TabsTrigger value="import" className="cursor-pointer">
                  <Globe className="mr-2 h-4 w-4" />
                  Import URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="write" className="mt-4">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-sm font-medium">Create it yourself</p>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Write the resource directly using the full Markdown editor
                    below.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="import" className="mt-4">
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div>
                    <p className="text-sm font-medium">Import from a website</p>

                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Paste an article or guide URL and Forgeworks will try to
                      extract its main written content and convert it to
                      editable Markdown.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={importUrl}
                      onChange={(event) => setImportUrl(event.target.value)}
                      placeholder="https://example.com/guide"
                      disabled={importing}
                    />

                    <Button
                      type="button"
                      onClick={handleImport}
                      disabled={importing}
                      className="cursor-pointer sm:shrink-0"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Import
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Imported content is only a starting point. Images and other
                    embedded media are not imported automatically, so review and
                    edit the result before submitting it.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>

                <Select value={sectionId} onValueChange={setSectionId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value={NONE_CATEGORY}>
                      Let staff decide
                    </SelectItem>

                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>

                <Input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Guide, tool, reference..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>

              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Resource title"
                maxLength={160}
              />
            </div>

            <div className="space-y-2">
              <Label>Source URL</Label>

              <Input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://..."
              />

              <p className="text-xs text-muted-foreground">
                Optional if you are writing the full resource directly inside
                Forgeworks.
              </p>
            </div>

            <div className="space-y-2">
              <div>
                <Label>Content</Label>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  You can use Markdown formatting, headings, lists, quotes,
                  links, code and other supported formatting.
                </p>
              </div>

              <MarkdownField
                ref={markdownRef}
                value={summary}
                onChange={setSummary}
                preset="full"
                slashMenuContainer="#resource-suggestion-dialog"
                minEditorHeightRem={12}
                maxEditorHeightRem={30}
                imageOptions={{
                  enabled: false,
                }}
              />
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex gap-3">
                <Send className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                <div>
                  <p className="text-sm font-medium">
                    Reviewed before publishing
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Your suggestion will not appear publicly immediately.
                    Forgeworks staff can review, adjust and approve it before it
                    is added to the library.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting || importing}
            className="w-full cursor-pointer sm:w-auto"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || importing}
            className="w-full cursor-pointer sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {isEditing ? "Submit changes" : "Submit for review"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
