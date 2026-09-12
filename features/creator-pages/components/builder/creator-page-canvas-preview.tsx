"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  BotPreview,
  CreatorBuilderViewport,
  CreatorFormInspectorItem,
  CreatorLorebookInspectorItem,
  CreatorPageConfig,
  PageSection,
  WorldPreview,
} from "@/features/creator-pages/types/creator-page-types";

interface CreatorPageCanvasPreviewProps {
  viewport: CreatorBuilderViewport;
  sections: PageSection[];
  bots: BotPreview[];
  worlds: WorldPreview[];
  lorebooks: CreatorLorebookInspectorItem[];
  forms: CreatorFormInspectorItem[];
  pageConfig: CreatorPageConfig;
  selectedSectionId: string | null;
  onSectionSelect: (sectionId: string) => void;
}

const PREVIEW_MESSAGE = "forgeworks:creator-page-preview";
const PREVIEW_READY = "forgeworks:creator-page-preview-ready";
const PREVIEW_SECTION_SELECT = "forgeworks:creator-page-preview-section-select";

const FRAME_SIZE: Record<
  CreatorBuilderViewport,
  { width: number; height: number; label: string }
> = {
  desktop: {
    width: 1280,
    height: 900,
    label: "1280px",
  },
  tablet: {
    width: 768,
    height: 1024,
    label: "768px",
  },
  mobile: {
    width: 390,
    height: 844,
    label: "390px",
  },
};

export function CreatorPageCanvasPreview({
  viewport,
  sections,
  bots,
  worlds,
  lorebooks,
  forms,
  pageConfig,
  selectedSectionId,
  onSectionSelect,
}: CreatorPageCanvasPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const previewAreaRef = useRef<HTMLDivElement | null>(null);

  const [fitScale, setFitScale] = useState(1);

  const frame = FRAME_SIZE[viewport];

  const updateFitScale = useCallback(() => {
    const previewArea = previewAreaRef.current;

    if (!previewArea) {
      return;
    }

    /*
     * Keep a little breathing room around the device frame.
     * The iframe itself always keeps its real CSS viewport
     * (1280 / 768 / 390). Only its visual presentation is scaled.
     */
    const horizontalPadding = 16;
    const availableWidth = Math.max(
      0,
      previewArea.clientWidth - horizontalPadding,
    );

    const nextScale = Math.min(1, availableWidth / frame.width);

    setFitScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
  }, [frame.width]);

  useEffect(() => {
    updateFitScale();

    const previewArea = previewAreaRef.current;

    if (!previewArea) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateFitScale();
    });

    observer.observe(previewArea);

    return () => {
      observer.disconnect();
    };
  }, [updateFitScale]);

  const sendPayload = useCallback(() => {
    const target = iframeRef.current?.contentWindow;

    if (!target) {
      return;
    }

    target.postMessage(
      {
        type: PREVIEW_MESSAGE,
        payload: {
          sections,
          bots,
          worlds,
          lorebooks,
          forms,
          pageConfig,
          selectedSectionId,
          theme: document.documentElement.classList.contains("dark")
            ? "dark"
            : "light",
        },
      },
      window.location.origin,
    );
  }, [bots, forms, lorebooks, pageConfig, sections, selectedSectionId, worlds]);

  useEffect(() => {
    sendPayload();
  }, [sendPayload]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === PREVIEW_READY) {
        sendPayload();
        return;
      }

      if (
        event.data?.type === PREVIEW_SECTION_SELECT &&
        typeof event.data.sectionId === "string"
      ) {
        onSectionSelect(event.data.sectionId);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [onSectionSelect, sendPayload]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      sendPayload();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, [sendPayload]);

  const scaledWidth = frame.width * fitScale;
  const scaledHeight = frame.height * fitScale;

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-muted/20">
      <div className="shrink-0 border-b border-border/60 bg-background px-4 py-2">
        <div>
          <p className="text-xs font-medium">Live canvas</p>
          <p className="text-[10px] text-muted-foreground">
            Builder preview · {frame.label}
            {fitScale < 0.999 ? ` · Fit ${Math.round(fitScale * 100)}%` : ""}
          </p>
        </div>
      </div>

      <div
        ref={previewAreaRef}
        className="relative z-0 flex min-h-0 flex-1 justify-center overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-5 lg:p-7"
      >
        <div
          className="relative shrink-0"
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
          }}
        >
          <iframe
            ref={iframeRef}
            src="/creator-pages/builder-preview"
            title={`Creator Page ${frame.label} preview`}
            className="absolute left-0 top-0 rounded-[1.4rem] border border-border/70 bg-background shadow-lg shadow-black/[0.05]"
            style={{
              width: `${frame.width}px`,
              height: `${frame.height}px`,
              transform: `scale(${fitScale})`,
              transformOrigin: "top left",
            }}
            onLoad={sendPayload}
          />
        </div>
      </div>
    </section>
  );
}
