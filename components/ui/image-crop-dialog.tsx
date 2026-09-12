"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Cropper, { type Area } from "react-easy-crop";

import {
  Crop,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  ZoomIn,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { createCroppedImageFile, type PixelCrop } from "@/lib/image-crop";

interface ImageCropDialogProps {
  open: boolean;

  onOpenChange: (open: boolean) => void;

  file: File | null;

  title: string;
  description?: string;

  aspect: number;

  cropShape?: "rect" | "round";

  recommendedWidth: number;
  recommendedHeight: number;

  outputWidth: number;
  outputHeight: number;

  onConfirm: (croppedFile: File) => void | Promise<void>;
}

export function ImageCropDialog({
  open,
  onOpenChange,
  file,
  title,
  description,
  aspect,
  cropShape = "rect",
  recommendedWidth,
  recommendedHeight,
  outputWidth,
  outputHeight,
  onConfirm,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({
    x: 0,
    y: 0,
  });

  const [zoom, setZoom] = useState(1);

  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(
    null,
  );

  const [processing, setProcessing] = useState(false);

  const imageSrc = useMemo(() => {
    if (!file) return "";

    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageSrc]);

  useEffect(() => {
    if (!open) {
      setCrop({
        x: 0,
        y: 0,
      });

      setZoom(1);

      setCroppedAreaPixels(null);

      setProcessing(false);
    }
  }, [open]);

  const handleCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels({
      x: pixels.x,
      y: pixels.y,
      width: pixels.width,
      height: pixels.height,
    });
  }, []);

  const handleReset = () => {
    setCrop({
      x: 0,
      y: 0,
    });

    setZoom(1);
  };

  const handleConfirm = async () => {
    if (!file || !imageSrc || !croppedAreaPixels || processing) {
      return;
    }

    setProcessing(true);

    try {
      const baseName = file.name.replace(/\.[^/.]+$/, "").trim() || "image";

      const croppedFile = await createCroppedImageFile({
        imageSrc,
        crop: croppedAreaPixels,
        outputWidth,
        outputHeight,
        fileName: `${baseName}-cropped.jpg`,
      });

      await onConfirm(croppedFile);

      onOpenChange(false);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (processing) return;

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        overlayClassName="z-[100]"
        className="
        z-101
        flex
        max-h-[90vh]
        w-[calc(100vw-2rem)]
        max-w-3xl
        flex-col
        overflow-hidden
        p-0
        sm:max-w-3xl
      "
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 sm:px-6">
          <DialogTitle>{title}</DialogTitle>

          <DialogDescription>
            {description ||
              `Recommended size: ${recommendedWidth} × ${recommendedHeight} px.`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 p-5 sm:p-6">
            {/* Crop area */}
            <div
              className="
                relative
                h-[22rem]
                max-h-[50vh]
                min-h-[18rem]
                overflow-hidden
                rounded-xl
                border
                bg-black
              "
            >
              {imageSrc ? (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  cropShape={cropShape}
                  showGrid={cropShape !== "round"}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                  minZoom={1}
                  maxZoom={3}
                  zoomSpeed={0.1}
                  objectFit="contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex gap-3">
                <Crop className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                <div>
                  <p className="text-sm font-medium">Reposition your image</p>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Drag the image to choose what remains visible. Use zoom if
                    you need a closer crop.
                  </p>
                </div>
              </div>
            </div>

            {/* Zoom */}
            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ZoomIn className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-medium">Zoom</p>

                    <p className="text-xs text-muted-foreground">
                      Fine-tune the image scale.
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="font-mono text-xs">
                  {zoom.toFixed(2)}×
                </Badge>
              </div>

              <Slider
                min={1}
                max={3}
                step={0.01}
                value={[zoom]}
                onValueChange={(values) => setZoom(values[0] ?? 1)}
                disabled={processing}
                className="py-1"
              />
            </div>

            {/* Output info */}
            <div className="flex flex-col gap-2 rounded-xl border bg-background p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Final image</p>

                <p className="mt-0.5 text-muted-foreground">
                  {outputWidth} × {outputHeight} px
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={processing}
                className="w-full cursor-pointer sm:w-auto"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset position
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t bg-background/95 px-5 py-4 backdrop-blur sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
            className="w-full cursor-pointer sm:w-auto"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={processing || !croppedAreaPixels}
            className="w-full cursor-pointer sm:w-auto"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Crop className="mr-2 h-4 w-4" />
                Apply Crop
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
