"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";

import { MarkdownField } from "@/features/markdown/components/markdown-field";
import { getFormBannerPublicUrl } from "@/features/forms/lib/form-assets";
import { IMAGE_PRESETS } from "@/lib/image-presets";
import { MediaPicker } from "@/features/media/components/media-picker";

import type { FormBuilderDraft } from "../../components/builder/form-builder-types";

interface FormGeneralInspectorProps {
  draft: FormBuilderDraft;
  onDraftChange: (draft: FormBuilderDraft) => void;
}

export function FormGeneralInspector({
  draft,
  onDraftChange,
}: FormGeneralInspectorProps) {
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);

  const [bannerCropOpen, setBannerCropOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  const uploadedBannerUrl = draft.bannerAssetPath
    ? getFormBannerPublicUrl(draft.bannerAssetPath)
    : "";

  const bannerPreviewUrl =
    draft.pendingBannerPreviewUrl ||
    uploadedBannerUrl ||
    draft.bannerUrl?.trim() ||
    "";

  const hasBanner = Boolean(bannerPreviewUrl);

  const handleBannerSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setPendingCropFile(file);
    setBannerCropOpen(true);

    event.target.value = "";
  };

  const handleCroppedBanner = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);

    onDraftChange({
      ...draft,

      // Uploaded path no longer represents
      // what the creator currently sees.
      bannerAssetPath: "",

      pendingBannerFile: file,
      pendingBannerPreviewUrl: previewUrl,
    });

    setPendingCropFile(null);
    setBannerCropOpen(false);
  };

  const handleMediaBanner = (url: string) => {
    onDraftChange({
      ...draft,
      bannerAssetPath: "",
      bannerUrl: url,
      pendingBannerFile: null,
      pendingBannerPreviewUrl: null,
    });
  };

  const handleRemoveBanner = () => {
    onDraftChange({
      ...draft,
      bannerAssetPath: "",
      bannerUrl: "",
      pendingBannerFile: null,
      pendingBannerPreviewUrl: null,
    });
  };

  const handleExternalBannerUrlChange = (value: string) => {
    onDraftChange({
      ...draft,

      // External URL becomes the current banner source.
      bannerAssetPath: "",
      bannerUrl: value,

      pendingBannerFile: null,
      pendingBannerPreviewUrl: null,
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Identity */}
        <InspectorSection
          title="Identity"
          description="The title and description visitors see at the top of the form."
        >
          <div className="space-y-2">
            <Label htmlFor="form-builder-title" className="text-xs">
              Form title <span className="text-destructive">*</span>
            </Label>

            <MarkdownField
              id="form-builder-title"
              value={draft.title}
              onChange={(title) =>
                onDraftChange({
                  ...draft,
                  title,
                })
              }
              placeholder="e.g. Contact Form, Commission Request"
              minEditorHeightRem={4}
            />

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Keep it concise. Markdown formatting is supported.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-builder-description" className="text-xs">
              Description
            </Label>

            <MarkdownField
              id="form-builder-description"
              value={draft.description || ""}
              onChange={(description) =>
                onDraftChange({
                  ...draft,
                  description,
                })
              }
              placeholder="Describe what this form is for..."
              minEditorHeightRem={9}
            />

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Markdown is supported and changes appear instantly in the preview.
            </p>
          </div>
        </InspectorSection>

        {/* Banner */}
        <InspectorSection
          title="Banner"
          description="Optional image displayed at the top of the public form."
        >
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
            className="hidden"
            onChange={handleBannerSelect}
          />

          {hasBanner ? (
            <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20">
              <img
                src={bannerPreviewUrl}
                alt="Form banner preview"
                className="aspect-[4/1] w-full object-cover"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMediaOpen(true)}
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/[0.12] px-4 py-7 text-center transition-colors hover:bg-muted/30"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </div>

              <div>
                <p className="text-xs font-medium">Add a banner</p>

                <p className="mt-1 text-[10px] text-muted-foreground">
                  PNG, JPG, WEBP or AVIF
                </p>
              </div>
            </button>
          )}

          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Recommended: 1600 × 400 px · 4:1 ratio. You can reposition and crop
            larger images before using them.
          </p>

          <MediaPicker
            open={mediaOpen}
            onOpenChange={setMediaOpen}
            hideTrigger
            selectedUrls={bannerPreviewUrl ? [bannerPreviewUrl] : []}
            onSelect={(images) => {
              if (images[0]) handleMediaBanner(images[0].url);
            }}
          />

          <div className="grid grid-cols-1 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full cursor-pointer"
              onClick={() => setMediaOpen(true)}
            >
              <ImageIcon className="mr-2 h-3.5 w-3.5" />
              Choose from My Media
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full cursor-pointer"
              onClick={() => bannerInputRef.current?.click()}
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              Upload & crop
            </Button>

            {hasBanner && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full cursor-pointer text-destructive hover:text-destructive"
                onClick={handleRemoveBanner}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>

          <div className="space-y-1.5 border-t border-border/60 pt-4">
            <Label className="text-xs">External banner URL</Label>

            <Input
              value={draft.bannerUrl || ""}
              onChange={(event) =>
                handleExternalBannerUrlChange(event.target.value)
              }
              placeholder="https://example.com/banner.jpg"
            />

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Use this instead of uploading an image.
            </p>
          </div>

          {draft.pendingBannerFile && (
            <div className="rounded-lg border border-primary/20 bg-primary/[0.05] px-3 py-2">
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                This banner is currently a local preview. It will be uploaded
                when the form is saved.
              </p>
            </div>
          )}
        </InspectorSection>
      </div>

      <ImageCropDialog
        open={bannerCropOpen}
        onOpenChange={(open) => {
          setBannerCropOpen(open);

          if (!open) {
            setPendingCropFile(null);
          }
        }}
        file={pendingCropFile}
        aspect={IMAGE_PRESETS.formBanner.aspect}
        cropShape={IMAGE_PRESETS.formBanner.cropShape}
        title="Adjust form banner"
        description="Drag and zoom the image to choose what visitors will see. Recommended size: 1600 × 400 px."
        recommendedWidth={IMAGE_PRESETS.formBanner.recommendedWidth}
        recommendedHeight={IMAGE_PRESETS.formBanner.recommendedHeight}
        outputWidth={IMAGE_PRESETS.formBanner.recommendedWidth}
        outputHeight={IMAGE_PRESETS.formBanner.recommendedHeight}
        onConfirm={handleCroppedBanner}
      />
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
