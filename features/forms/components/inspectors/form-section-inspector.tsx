"use client";

import {
  Image as ImageIcon,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { IGif } from "@giphy/js-types";
import { GiphyFetch } from "@giphy/js-fetch-api";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";

import { MarkdownField } from "@/features/markdown/components/markdown-field";

import { getFormAssetPublicUrl } from "@/features/forms/lib/form-assets";

import type { FormSection } from "@/features/forms/types/form-types";

import type { FormBuilderDraft } from "../builder/form-builder-types";

const giphyFetch = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY || "");

interface FormSectionInspectorProps {
  draft: FormBuilderDraft;
  sectionId: string;
  onDraftChange: (draft: FormBuilderDraft) => void;
}

export function FormSectionInspector({
  draft,
  sectionId,
  onDraftChange,
}: FormSectionInspectorProps) {
  const section = draft.sections.find((item) => item.id === sectionId);

  const sectionImageInputRef = useRef<HTMLInputElement | null>(null);

  const [gifDialogOpen, setGifDialogOpen] = useState(false);

  const [gifSearch, setGifSearch] = useState("");

  const [debouncedGifSearch, setDebouncedGifSearch] = useState("");

  const [gifItems, setGifItems] = useState<IGif[]>([]);

  const [gifLoading, setGifLoading] = useState(false);

  const [gifError, setGifError] = useState("");

  if (!section) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 p-4">
        <p className="text-xs text-muted-foreground">
          This section no longer exists.
        </p>
      </div>
    );
  }

  const updateSection = (nextSection: FormSection) => {
    onDraftChange({
      ...draft,
      sections: draft.sections.map((item) =>
        item.id === section.id ? nextSection : item,
      ),
    });
  };

  const updateCustom = (patch: Partial<NonNullable<FormSection["custom"]>>) => {
    updateSection({
      ...section,
      custom: {
        ...(section.custom || {}),
        ...patch,
      },
    });
  };

  const pendingImage = draft.pendingSectionImages?.[section.id];

  const uploadedImageUrl = section.custom?.imageAssetPath
    ? getFormAssetPublicUrl(section.custom.imageAssetPath)
    : "";

  const sectionImageUrl =
    pendingImage?.previewUrl ||
    uploadedImageUrl ||
    section.custom?.imageUrl ||
    "";

  const handleSectionImageSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    onDraftChange({
      ...draft,

      sections: draft.sections.map((item) =>
        item.id === section.id
          ? {
              ...item,
              custom: {
                ...(item.custom || {}),
                imageAssetPath: undefined,
              },
            }
          : item,
      ),

      pendingSectionImages: {
        ...(draft.pendingSectionImages || {}),
        [section.id]: {
          file,
          previewUrl,
        },
      },
    });

    event.target.value = "";
  };

  const handleRemoveImage = () => {
    const nextPending = {
      ...(draft.pendingSectionImages || {}),
    };

    delete nextPending[section.id];

    onDraftChange({
      ...draft,

      pendingSectionImages: nextPending,

      sections: draft.sections.map((item) =>
        item.id === section.id
          ? {
              ...item,
              custom: {
                ...(item.custom || {}),
                imageAssetPath: undefined,
                imageUrl: "",
              },
            }
          : item,
      ),
    });
  };

  const handleExternalImageUrlChange = (value: string) => {
    const nextPending = {
      ...(draft.pendingSectionImages || {}),
    };

    delete nextPending[section.id];

    onDraftChange({
      ...draft,

      pendingSectionImages: nextPending,

      sections: draft.sections.map((item) =>
        item.id === section.id
          ? {
              ...item,
              custom: {
                ...(item.custom || {}),
                imageAssetPath: undefined,
                imageUrl: value,
              },
            }
          : item,
      ),
    });
  };

  const loadGifs = useCallback(async (query: string) => {
    setGifLoading(true);
    setGifError("");

    try {
      const result = query
        ? await giphyFetch.search(query, {
            limit: 24,
            rating: "r",
            lang: "en",
          })
        : await giphyFetch.trending({
            limit: 24,
            rating: "r",
          });

      setGifItems(Array.isArray(result.data) ? (result.data as IGif[]) : []);
    } catch (error) {
      setGifError(
        error instanceof Error ? error.message : "Failed to load GIFs.",
      );

      setGifItems([]);
    } finally {
      setGifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!gifDialogOpen) return;

    const timeout = setTimeout(() => {
      setDebouncedGifSearch(gifSearch.trim());
    }, 400);

    return () => clearTimeout(timeout);
  }, [gifDialogOpen, gifSearch]);

  useEffect(() => {
    if (!gifDialogOpen) return;

    void loadGifs(debouncedGifSearch);
  }, [debouncedGifSearch, gifDialogOpen, loadGifs]);

  return (
    <>
      <div className="space-y-6">
        {/* Content */}
        <InspectorSection
          title="Content"
          description="Title and supporting text displayed for this section."
        >
          <div className="space-y-2">
            <Label className="text-xs">Section title</Label>

            <MarkdownField
              id={`builder-section-title-${section.id}`}
              value={section.title || ""}
              onChange={(title) =>
                updateSection({
                  ...section,
                  title,
                })
              }
              placeholder="Section title"
              minEditorHeightRem={4}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Description</Label>

            <MarkdownField
              id={`builder-section-description-${section.id}`}
              value={section.description || ""}
              onChange={(description) =>
                updateSection({
                  ...section,
                  description,
                })
              }
              placeholder="Optional description..."
              minEditorHeightRem={6}
            />
          </div>
        </InspectorSection>

        {/* Layout */}
        <InspectorSection
          title="Layout"
          description="Control the section header alignment and collapsing behavior."
        >
          <div className="space-y-1.5">
            <Label className="text-xs">Header alignment</Label>

            <Select
              value={section.custom?.headerAlignment || "left"}
              onValueChange={(value) =>
                updateCustom({
                  headerAlignment: value as "left" | "center" | "right",
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="left">Left</SelectItem>

                <SelectItem value="center">Center</SelectItem>

                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SettingRow
            title="Collapsible"
            description="Allow visitors to expand and collapse this section."
          >
            <Switch
              checked={section.custom?.collapsible === true}
              onCheckedChange={(checked) =>
                updateCustom({
                  collapsible: checked,

                  ...(checked
                    ? {}
                    : {
                        defaultExpanded: false,
                      }),
                })
              }
            />
          </SettingRow>

          {section.custom?.collapsible && (
            <SettingRow
              title="Open by default"
              description="Start this section expanded when the form loads."
            >
              <Switch
                checked={section.custom?.defaultExpanded === true}
                onCheckedChange={(checked) =>
                  updateCustom({
                    defaultExpanded: checked,
                  })
                }
              />
            </SettingRow>
          )}
        </InspectorSection>

        {/* Image */}
        <InspectorSection
          title="Image"
          description="Optional supporting image for this section."
        >
          <input
            ref={sectionImageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
            className="hidden"
            onChange={handleSectionImageSelect}
          />

          {sectionImageUrl ? (
            <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20">
              <img
                src={sectionImageUrl}
                alt="Section preview"
                className="max-h-48 w-full object-contain"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => sectionImageInputRef.current?.click()}
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/[0.12] px-4 py-6 transition-colors hover:bg-muted/30"
            >
              <ImageIcon className="h-5 w-5 text-muted-foreground" />

              <span className="text-xs font-medium">Add section image</span>
            </button>
          )}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => sectionImageInputRef.current?.click()}
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              {sectionImageUrl ? "Replace image" : "Upload image"}
            </Button>

            {sectionImageUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer text-destructive hover:text-destructive"
                onClick={handleRemoveImage}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>

          <div className="space-y-1.5 border-t border-border/60 pt-4">
            <Label className="text-xs">External image URL</Label>

            <Input
              value={section.custom?.imageUrl || ""}
              onChange={(event) =>
                handleExternalImageUrlChange(event.target.value)
              }
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {pendingImage && (
            <div className="rounded-lg border border-primary/20 bg-primary/[0.05] px-3 py-2">
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                This image is currently local and will be uploaded when the form
                is saved.
              </p>
            </div>
          )}
        </InspectorSection>

        {/* GIF */}
        <InspectorSection
          title="GIF"
          description="Optional animated media powered by GIPHY."
        >
          {section.custom?.gifUrl && (
            <div className="overflow-hidden rounded-xl border border-border/70">
              <img
                src={section.custom.gifUrl}
                alt="Selected GIF"
                className="max-h-48 w-full object-contain"
              />
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setGifDialogOpen(true)}
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" />

              {section.custom?.gifUrl ? "Replace GIF" : "Pick GIF"}
            </Button>

            {section.custom?.gifUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer text-destructive hover:text-destructive"
                onClick={() =>
                  updateCustom({
                    gifUrl: "",
                  })
                }
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        </InspectorSection>
      </div>

      <Dialog open={gifDialogOpen} onOpenChange={setGifDialogOpen}>
        <DialogContent
          overlayClassName="z-[100]"
          className="z-[101] flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-3xl flex-col overflow-hidden"
        >
          <DialogHeader>
            <DialogTitle>Select a GIF</DialogTitle>

            <DialogDescription>
              Search or choose a trending GIF.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={gifSearch}
              onChange={(event) => setGifSearch(event.target.value)}
              placeholder="Search GIPHY"
              className="pl-9"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border p-2">
            {gifLoading ? (
              <div className="flex min-h-40 items-center justify-center text-xs text-muted-foreground">
                Loading GIFs...
              </div>
            ) : gifError ? (
              <div className="p-6 text-center">
                <p className="text-xs text-destructive">{gifError}</p>
              </div>
            ) : gifItems.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-muted-foreground">No GIFs found.</p>
              </div>
            ) : (
              <div className="columns-2 gap-2 sm:columns-3">
                {gifItems.map((gif) => {
                  const preview =
                    gif.images.fixed_width_downsampled?.url ||
                    gif.images.fixed_width?.url ||
                    gif.images.original?.url;

                  if (!preview) {
                    return null;
                  }

                  return (
                    <button
                      key={gif.id}
                      type="button"
                      className="mb-2 block w-full cursor-pointer break-inside-avoid overflow-hidden rounded-lg border border-border/60 p-1 transition hover:border-primary/60"
                      onClick={() => {
                        updateCustom({
                          gifUrl: gif.images.original.url,
                        });

                        setGifDialogOpen(false);
                      }}
                    >
                      <img
                        src={preview}
                        alt={gif.title || "GIF"}
                        loading="lazy"
                        className="h-auto w-full object-contain"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground">Powered by GIPHY</p>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InspectorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-semibold">{title}</p>

        {description && (
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-medium">{title}</p>

        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="shrink-0">{children}</div>
    </div>
  );
}
