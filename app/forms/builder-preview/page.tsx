"use client";

import { useEffect, useState } from "react";

import PublicForm from "@/features/forms/components/public-form";

import { FormDeactivationPage } from "@/features/forms/components/form-deactivation-page";

import { defaultFormAppearance } from "@/features/forms/lib/form-appearance";

import type {
  FormAppearance,
  FormSection,
} from "@/features/forms/types/form-types";

import { normalizeHttpUrl } from "@/lib/safe-url";

type PreviewMode = "form" | "deactivation";

interface PreviewPayload {
  previewMode: PreviewMode;

  theme: "light" | "dark";

  form: {
    id: string;

    title: string;

    description?: string;

    bannerAssetPath?: string;

    bannerUrl?: string;

    isActive: boolean;

    sections: FormSection[];

    appearance?: FormAppearance | null;

    userId?: string | null;
  };

  deactivation: {
    title: string;

    message: string;

    redirectUrl: string;

    redirectLabel: string;

    accentColor: string;
  };
}

const PREVIEW_MESSAGE = "forgeworks:form-builder-preview";

const PREVIEW_READY_MESSAGE = "forgeworks:form-builder-preview-ready";

export default function FormBuilderPreviewPage() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type !== PREVIEW_MESSAGE) {
        return;
      }

      const nextPayload = event.data?.payload as PreviewPayload;

      if (!nextPayload) {
        return;
      }

      setPayload(nextPayload);

      document.documentElement.classList.toggle(
        "dark",
        nextPayload.theme === "dark",
      );
    };

    window.addEventListener("message", handleMessage);

    /*
     * Tell the parent that hydration has
     * finished and the message listener is
     * ready.
     */
    window.parent.postMessage(
      {
        type: PREVIEW_READY_MESSAGE,
      },
      window.location.origin,
    );

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  if (!payload) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <p className="text-xs text-muted-foreground">Preparing preview…</p>
      </div>
    );
  }

  if (payload.previewMode === "deactivation") {
    const normalizedRedirect = payload.deactivation.redirectUrl?.trim()
      ? normalizeHttpUrl(payload.deactivation.redirectUrl)
      : null;

    const accent = /^#[0-9a-fA-F]{6}$/.test(
      payload.deactivation.accentColor || "",
    )
      ? payload.deactivation.accentColor
      : "#7c3aed";

    return (
      <FormDeactivationPage
        title={payload.deactivation.title || "Untitled Form"}
        message={payload.deactivation.message || ""}
        redirectUrl={normalizedRedirect || ""}
        redirectLabel={payload.deactivation.redirectLabel || ""}
        accentColor={accent}
        preview
      />
    );
  }

  return (
    <PublicForm
      preview
      form={{
        ...payload.form,

        appearance: payload.form.appearance || defaultFormAppearance,
      }}
    />
  );
}
