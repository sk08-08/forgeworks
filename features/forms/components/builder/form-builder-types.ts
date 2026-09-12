import type { RequestForm } from "@/features/forms/types/form-types";

export type FormBuilderViewport = "desktop" | "tablet" | "mobile";

export type FormBuilderPreviewMode = "form" | "deactivation";

export type FormBuilderSelection =
  | { type: "form" }
  | { type: "appearance" }
  | { type: "availability" }
  | { type: "section"; sectionId: string }
  | { type: "field"; sectionId: string; fieldId: string };

export type PendingSectionImage = {
  file: File;
  previewUrl: string;
};

export type FormBuilderDraft = Omit<RequestForm, "createdAt" | "updatedAt"> & {
  createdAt?: Date;
  updatedAt?: Date;

  pendingBannerFile?: File | null;
  pendingBannerPreviewUrl?: string | null;

  pendingSectionImages?: Record<string, PendingSectionImage | undefined>;
};
