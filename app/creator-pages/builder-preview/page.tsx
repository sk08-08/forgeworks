"use client";

import { useEffect, useState } from "react";

import { CreatorPageView } from "@/features/creator-pages/components/creator-page-view";

import type {
  BotPreview,
  CreatorFormInspectorItem,
  CreatorLorebookInspectorItem,
  CreatorPageConfig,
  PageSection,
  WorldPreview,
} from "@/features/creator-pages/types/creator-page-types";

const PREVIEW_MESSAGE = "forgeworks:creator-page-preview";
const PREVIEW_READY = "forgeworks:creator-page-preview-ready";
const PREVIEW_SECTION_SELECT = "forgeworks:creator-page-preview-section-select";

interface PreviewPayload {
  sections: PageSection[];
  bots: BotPreview[];
  worlds: WorldPreview[];
  lorebooks: CreatorLorebookInspectorItem[];
  forms: CreatorFormInspectorItem[];
  pageConfig: CreatorPageConfig;
  selectedSectionId: string | null;
  theme: "light" | "dark";
}

export default function CreatorPageBuilderPreviewPage() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type !== PREVIEW_MESSAGE || !event.data.payload) {
        return;
      }

      const nextPayload = event.data.payload as PreviewPayload;

      document.documentElement.classList.toggle(
        "dark",
        nextPayload.theme === "dark",
      );

      setPayload(nextPayload);
    };

    window.addEventListener("message", handleMessage);

    window.parent.postMessage(
      {
        type: PREVIEW_READY,
      },
      window.location.origin,
    );

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  if (!payload) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-sm text-muted-foreground">
        Preparing Creator Page preview…
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <CreatorPageView
        sections={payload.sections}
        bots={payload.bots}
        worlds={payload.worlds}
        lorebooks={payload.lorebooks}
        pageConfig={payload.pageConfig}
        formStates={Object.fromEntries(
          payload.forms.map((form) => [
            form.id,
            {
              id: form.id,
              shareable_link: form.shareable_link,
              is_active: form.is_active,
              deactivated_message: form.deactivated_message,
              deactivated_redirect_url: form.deactivated_redirect_url,
              deactivated_redirect_label: form.deactivated_redirect_label,
              deactivated_accent_color: form.deactivated_accent_color,
            },
          ]),
        )}
        isBuilderPreview
        selectedSectionId={payload.selectedSectionId}
        onSectionSelect={(sectionId) => {
          window.parent.postMessage(
            {
              type: PREVIEW_SECTION_SELECT,
              sectionId,
            },
            window.location.origin,
          );
        }}
      />
    </div>
  );
}
