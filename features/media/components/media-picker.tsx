"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ImagePlus,
  Loader2,
  UploadCloud,
  X,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import {
  listMediaAssetsAction,
  prepareMediaUploadAction,
  registerMediaAssetAction,
} from "../actions/media-assets";
import {
  MEDIA_ACCEPT,
  MEDIA_BUCKET,
  MAX_MEDIA_IMAGE_BYTES,
  type MediaAsset,
  type MediaSelection,
} from "../types/media";
import {
  MEDIA_MIME_EXTENSIONS,
  hasMediaSignature,
} from "../lib/media-validation";

export type MediaPickerProps = {
  onSelect: (images: MediaSelection[]) => void;
  multiple?: boolean;
  maxSelection?: number;
  selectedUrls?: string[];
  label?: string;
  disabled?: boolean;
  className?: string;
  /** Optional controlled dialog for editor commands and custom triggers. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  /** Hide URL-only choices when this picker is used to manage registered uploads. */
  allowExternalUrls?: boolean;
};

function normalizedExternalUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    )
      return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function MediaPicker({
  onSelect,
  multiple = false,
  maxSelection = 20,
  selectedUrls = [],
  label,
  disabled = false,
  className,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  allowExternalUrls = true,
}: MediaPickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (value: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(value);
    onOpenChange?.(value);
  };
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [picked, setPicked] = useState<MediaSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const limit = multiple ? Math.max(1, Math.min(50, maxSelection)) : 1;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listMediaAssetsAction();
      if (!result.success) throw new Error(result.error);
      setAssets(result.assets);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load your library.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setPicked([]);
    setUrlInput("");
    void load();
  }, [open, load]);

  const toggle = (candidate: MediaSelection) => {
    setPicked((current) => {
      if (!multiple) return [candidate];
      const exists = current.some((item) => item.url === candidate.url);
      if (exists) return current.filter((item) => item.url !== candidate.url);
      if (current.length >= limit) {
        toast.error(`Select up to ${limit} images at once.`);
        return current;
      }
      return [...current, candidate];
    });
  };

  const upload = async (fileList: FileList | null) => {
    if (!fileList?.length || uploading) return;
    const remaining = limit - picked.length;
    if (remaining <= 0) {
      toast.error(`You can select up to ${limit} images at once.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const selectedFiles = Array.from(fileList).slice(0, remaining);
    if (fileList.length > selectedFiles.length)
      toast.message(`Only ${remaining} more images can be selected.`);
    setUploading(true);
    let successes = 0;
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user)
        throw new Error("Sign in before uploading images.");
      for (const file of selectedFiles) {
        try {
          const extension = MEDIA_MIME_EXTENSIONS[file.type];
          if (
            !extension ||
            file.size < 1 ||
            file.size > MAX_MEDIA_IMAGE_BYTES
          ) {
            throw new Error("Choose PNG, JPG, WEBP or AVIF up to about 5 MB.");
          }
          // HTTPS/localhost supports SubtleCrypto. The server rechecks this digest
          // against the actual Storage object before saving metadata.
          const buffer = await file.arrayBuffer();
          if (!hasMediaSignature(new Uint8Array(buffer), file.type)) {
            throw new Error("The image contents do not match its file type.");
          }
          const digest = await crypto.subtle.digest("SHA-256", buffer);
          const hash = Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
          const preflight = await prepareMediaUploadAction({
            hash,
            mimeType: file.type,
            byteSize: file.size,
          });
          if (!preflight.success) throw new Error(preflight.error);
          let asset = preflight.asset;
          if (!asset) {
            const path = preflight.path;
            if (!path || !path.startsWith(`${user.id}/`)) {
              throw new Error("Invalid upload destination.");
            }
            if (!preflight.token)
              throw new Error("Upload authorization is missing.");
            const { error: uploadError } = await supabase.storage
              .from(MEDIA_BUCKET)
              .uploadToSignedUrl(path, preflight.token, file, {
                contentType: file.type,
                cacheControl: "31536000",
              });
            // An existing path can be an incomplete earlier upload. The server
            // verifies actual bytes before treating it as a valid asset.
            const result = await registerMediaAssetAction({
              hash,
              mimeType: file.type,
              name: file.name,
              byteSize: file.size,
            });
            if (!result.success)
              throw new Error(
                result.error ||
                  uploadError?.message ||
                  "Image registration failed.",
              );
            asset = result.asset;
          }
          successes++;
          setAssets((current) => [
            asset,
            ...current.filter((item) => item.id !== asset.id),
          ]);
          setPicked((current) => {
            const candidate = {
              mediaId: asset.id,
              url: asset.url,
              name: asset.name,
            };
            if (!multiple) return [candidate];
            if (current.some((item) => item.url === candidate.url))
              return current;
            return current.length < limit ? [...current, candidate] : current;
          });
        } catch (error) {
          toast.error(
            `${file.name}: ${error instanceof Error ? error.message : "Upload failed"}`,
          );
        }
      }
      if (successes)
        toast.success(
          `${successes} image${successes === 1 ? "" : "s"} ready to use.`,
        );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
      setUploading(false);
    }
  };

  const addExternalUrl = () => {
    const url = normalizedExternalUrl(urlInput);
    if (!url) {
      toast.error("Enter a valid http(s) image URL.");
      return;
    }
    toggle({ mediaId: null, url, name: "External image" });
    setUrlInput("");
  };

  const apply = () => {
    if (!picked.length) return;
    onSelect(picked);
    setOpen(false);
  };

  return (
    <>
      {!hideTrigger && (
        <Button
          type="button"
          variant="outline"
          className={className || "w-full cursor-pointer"}
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          {label ||
            (multiple ? "Add images from My Media" : "Choose or upload image")}
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!uploading) setOpen(value);
        }}
      >
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-4 pb-3 pt-5 sm:px-6">
            <DialogTitle>My Media</DialogTitle>
            <DialogDescription>
              Reuse your images across Forgeworks, upload new ones, or paste a
              URL.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={MEDIA_ACCEPT}
                multiple={multiple}
                className="sr-only"
                aria-label="Upload images"
                disabled={uploading}
                onChange={(event) => void upload(event.target.files)}
              />
              <Button
                type="button"
                className="cursor-pointer"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                {uploading
                  ? "Uploading…"
                  : multiple
                    ? "Upload images"
                    : "Upload image"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={loading || uploading}
                onClick={() => void load()}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                {picked.length}/{limit} selected · about 5 MB per image
              </span>
            </div>
            {allowExternalUrls && (
              <div className="flex min-w-0 gap-2">
                <Input
                  value={urlInput}
                  disabled={uploading}
                  onChange={(event) => setUrlInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addExternalUrl();
                    }
                  }}
                  placeholder="https://example.com/image.webp"
                  aria-label="External image URL"
                  className="min-w-0"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="cursor-pointer"
                  disabled={uploading}
                  onClick={addExternalUrl}
                >
                  Add URL
                </Button>
              </div>
            )}
            {picked.some((item) => item.mediaId === null) && (
              <div className="flex flex-wrap gap-2">
                {picked
                  .filter((item) => item.mediaId === null)
                  .map((item) => (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() => toggle(item)}
                      className="flex max-w-full items-center group transition-colors gap-1 rounded-full border px-3 py-1 text-xs cursor-pointer"
                    >
                      <span className="max-w-48 truncate">{item.url}</span>
                      <X className="h-3 w-3 group-hover:text-destructive" />
                    </button>
                  ))}
              </div>
            )}
            {loading ? (
              <div className="flex min-h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : assets.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Your library is empty. Upload an image to get started.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {assets.map((asset) => {
                  const selected = picked.some(
                    (item) => item.url === asset.url,
                  );
                  const alreadyUsed = selectedUrls.includes(asset.url);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      disabled={uploading}
                      aria-pressed={selected}
                      aria-label={`${selected ? "Deselect" : "Select"} ${asset.name}`}
                      onClick={() =>
                        toggle({
                          mediaId: asset.id,
                          url: asset.url,
                          name: asset.name,
                        })
                      }
                      className={`group relative min-w-0 overflow-hidden rounded-xl border text-left transition-colors cursor-pointer ${selected ? "border-primary ring-2 ring-primary/50" : "border-border hover:border-primary/50"}`}
                    >
                      <div className="aspect-square bg-muted">
                        <img
                          src={asset.url}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="truncate p-2 text-xs" title={asset.name}>
                        {asset.name}
                      </div>
                      {(selected || alreadyUsed) && (
                        <span
                          className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                          title={
                            alreadyUsed ? "Used in current field" : "Selected"
                          }
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-border/60 px-4 py-2 sm:px-6">
            <a
              href="/?view=media"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-primary underline-offset-4 transition-colors hover:bg-primary/10 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Open your full My Media library in a new tab"
            >
              Manage full library{" "}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
          <DialogFooter className="shrink-0 border-t px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={uploading}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={!picked.length || uploading}
              onClick={apply}
            >
              {multiple
                ? `Use ${picked.length} image${picked.length === 1 ? "" : "s"}`
                : "Use image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
