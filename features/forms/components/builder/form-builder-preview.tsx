"use client";

import { FileText, ShieldOff } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

import type { FormSection } from "@/features/forms/types/form-types";

import { cn } from "@/lib/utils";

import type {
  FormBuilderDraft,
  FormBuilderPreviewMode,
  FormBuilderViewport,
} from "./form-builder-types";

interface FormBuilderPreviewProps {
  draft: FormBuilderDraft;
  sections: FormSection[];
  viewport: FormBuilderViewport;

  previewMode: FormBuilderPreviewMode;

  onPreviewModeChange: (mode: FormBuilderPreviewMode) => void;
}

const PREVIEW_MESSAGE = "forgeworks:form-builder-preview";

const PREVIEW_READY_MESSAGE = "forgeworks:form-builder-preview-ready";

export function FormBuilderPreview({
  draft,
  sections,
  viewport,
  previewMode,
  onPreviewModeChange,
}: FormBuilderPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const previewLabel =
    viewport === "desktop"
      ? "Responsive"
      : viewport === "tablet"
        ? "768 × 1024"
        : "390 × 844";

  const frameClass =
    viewport === "mobile"
      ? "h-[844px] w-[390px] max-w-full"
      : viewport === "tablet"
        ? "h-[1024px] w-[768px] max-w-full"
        : "h-[min(78vh,900px)] min-h-[680px] w-full max-w-5xl";

  const sendPreview = useCallback(() => {
    const target = iframeRef.current?.contentWindow;

    if (!target) {
      return;
    }

    const theme = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";

    target.postMessage(
      {
        type: PREVIEW_MESSAGE,

        payload: {
          previewMode,
          theme,

          form: {
            id: draft.id || "__builder-preview__",

            title: draft.title || "Untitled Form",

            description: draft.description || "",

            bannerAssetPath: draft.pendingBannerPreviewUrl
              ? ""
              : draft.bannerAssetPath || "",

            bannerUrl: draft.pendingBannerPreviewUrl || draft.bannerUrl || "",

            /*
             * Preview availability is
             * independent from whether the
             * saved form is active.
             */
            isActive: true,

            sections,

            appearance: draft.appearance,

            userId: draft.ownerId || null,
          },

          deactivation: {
            title: draft.title || "Untitled Form",

            message: draft.deactivatedMessage || "",

            redirectUrl: draft.deactivatedRedirectUrl || "",

            redirectLabel: draft.deactivatedRedirectLabel || "",

            accentColor: draft.deactivatedAccentColor || "#7c3aed",
          },
        },
      },
      window.location.origin,
    );
  }, [draft, previewMode, sections]);

  /*
   * Keep the iframe synchronized with
   * every live builder change.
   */
  useEffect(() => {
    sendPreview();
  }, [sendPreview]);

  /*
   * The child announces when its React
   * listener is ready. This avoids a race
   * where iframe onLoad fires before the
   * preview page has hydrated.
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      if (event.data?.type === PREVIEW_READY_MESSAGE) {
        sendPreview();
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [sendPreview]);

  /*
   * Keep dark/light mode synchronized
   * even when the draft itself has not
   * changed.
   */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      sendPreview();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, [sendPreview]);

  return (
    <main className="min-w-0 bg-muted/20">
      <div className="sticky top-[69px] z-50 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-background px-4 py-2">
        <div>
          <p className="text-xs font-medium">Live form</p>

          <p className="text-[10px] text-muted-foreground">
            {previewMode === "form" ? "Form preview" : "Deactivation preview"} ·{" "}
            {previewLabel}
          </p>
        </div>

        <div className="flex h-9 items-center rounded-full border border-border/70 bg-muted/25 p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={previewMode === "form"}
            className={cn(
              "h-7 cursor-pointer rounded-full px-2.5 text-[10px] transition-colors",

              previewMode === "form"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onPreviewModeChange("form")}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Form
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={previewMode === "deactivation"}
            className={cn(
              "h-7 cursor-pointer rounded-full px-2.5 text-[10px] transition-colors",

              previewMode === "deactivation"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onPreviewModeChange("deactivation")}
          >
            <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
            Deactivation
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-[70vh] justify-center overflow-auto p-3 sm:p-5 lg:p-7">
        <div
          className={cn(
            "relative shrink-0 overflow-visible",
            viewport === "desktop" && "w-full",
          )}
        >
          <iframe
            ref={iframeRef}
            src="/forms/builder-preview"
            title={`${previewLabel} form preview`}
            onLoad={sendPreview}
            className={cn(
              "mx-auto block rounded-[1.4rem] border border-border/70 bg-background shadow-lg shadow-black/[0.05]",
              frameClass,
            )}
          />
        </div>
      </div>
    </main>
  );
}
