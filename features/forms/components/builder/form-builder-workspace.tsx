"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createFormAction,
  getFormForBuilderAction,
  getFormTemplateForBuilderAction,
  removeFormBannerAction,
  removeFormSectionImageAction,
  updateFormAction,
  uploadFormBannerAction,
  uploadFormSectionImageAction,
} from "@/features/forms/actions/forms";
import { normalizeHttpUrl } from "@/lib/safe-url";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  defaultFormAppearance,
  resolveFormAppearance,
} from "@/features/forms/lib/form-appearance";
import type {
  FormField,
  FormSection,
  RequestForm,
} from "@/features/forms/types/form-types";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";
import {
  FormBuilderHeader,
  type FormBuilderWorkspaceView,
} from "./form-builder-header";
import { FormBuilderPreview } from "./form-builder-preview";
import { FormBuilderStructurePanel } from "./form-builder-structure-panel";
import { FormBuilderInspector } from "./form-builder-inspector";

import type {
  FormBuilderDraft,
  FormBuilderPreviewMode,
  FormBuilderSelection,
  FormBuilderViewport,
} from "./form-builder-types";

interface FormBuilderWorkspaceProps {
  formId?: string;
  templateId?: string | null;
  mode?: "create" | "edit";
}

const MAX_FORM_SECTIONS = 20;
const MAX_FORM_FIELDS = 50;

function getTotalFieldCount(sections: FormSection[]) {
  return sections.reduce((total, section) => total + section.fields.length, 0);
}

function createBlankField(): FormField {
  return {
    id: uuidv4(),
    type: "text",
    label: "New field",
    description: "",
    placeholder: "",
    required: false,
    textAlignment: "left",
  };
}

function cloneField(field: FormField, id = uuidv4()): FormField {
  return {
    ...field,
    id,

    options: field.options ? [...field.options] : undefined,

    conditions: field.conditions
      ? field.conditions.map((condition) => ({
          ...condition,
        }))
      : undefined,
  };
}

function removeConditionReferences(
  sections: FormSection[],
  removedFieldIds: Set<string>,
) {
  return sections.map((section) => ({
    ...section,

    fields: section.fields.map((field) => {
      const nextConditions = (field.conditions || []).filter(
        (condition) => !removedFieldIds.has(condition.fieldId),
      );

      return {
        ...field,
        conditions: nextConditions.length > 0 ? nextConditions : undefined,
      };
    }),
  }));
}

function createBlankSection(): FormSection {
  return {
    id: uuidv4(),
    title: "Basic Information",
    description: "",
    fields: [],
  };
}

function createBlankDraft(): FormBuilderDraft {
  return {
    id: "",
    title: "Untitled Form",
    description: "",
    bannerAssetPath: "",
    bannerUrl: "",
    sections: [createBlankSection()],
    shareableLink: "",
    isActive: true,
    appearance: resolveFormAppearance(defaultFormAppearance),

    deactivatedMessage: "",
    deactivatedRedirectUrl: "",
    deactivatedRedirectLabel: "",
    deactivatedAccentColor: "#7c3aed",
  };
}

type PersistableForm = Omit<RequestForm, "id" | "createdAt" | "updatedAt">;

function getDraftSnapshot(draft: FormBuilderDraft) {
  return JSON.stringify({
    title: draft.title || "",
    description: draft.description || "",

    bannerAssetPath: draft.bannerAssetPath || "",
    bannerUrl: draft.bannerUrl || "",

    sections: draft.sections,

    shareableLink: draft.shareableLink || "",

    isActive: draft.isActive,

    appearance: draft.appearance,

    deactivatedMessage: draft.deactivatedMessage || "",

    deactivatedRedirectUrl: draft.deactivatedRedirectUrl || "",

    deactivatedRedirectLabel: draft.deactivatedRedirectLabel || "",

    deactivatedAccentColor: draft.deactivatedAccentColor || "#7c3aed",
  });
}

function toPersistableForm(draft: FormBuilderDraft): PersistableForm {
  return {
    ownerId: draft.ownerId,

    title: draft.title,

    description: draft.description || "",

    bannerAssetPath: draft.bannerAssetPath || "",

    bannerUrl: draft.bannerUrl || "",

    sections: draft.sections,

    appearance: draft.appearance,

    shareableLink: draft.shareableLink || "",

    isActive: draft.isActive,

    deactivatedMessage: draft.deactivatedMessage || "",

    deactivatedRedirectUrl: draft.deactivatedRedirectUrl || "",

    deactivatedRedirectLabel: draft.deactivatedRedirectLabel || "",

    deactivatedAccentColor: draft.deactivatedAccentColor || "#7c3aed",

    securitySensitivity: draft.securitySensitivity,
  };
}

function mapSavedRowToDraft(
  current: FormBuilderDraft,
  row: any,
): FormBuilderDraft {
  return {
    ...current,

    id: row?.id || current.id,

    ownerId: row?.user_id || current.ownerId,

    title: row?.title ?? current.title,

    description: row?.description ?? "",

    bannerAssetPath: row?.banner_asset_path ?? "",

    bannerUrl: row?.banner_url ?? "",

    sections: Array.isArray(row?.sections)
      ? (row.sections as FormSection[])
      : current.sections,

    appearance: resolveFormAppearance(
      row?.appearance ?? current.appearance ?? null,
    ),

    shareableLink: row?.shareable_link ?? current.shareableLink ?? "",

    isActive: row?.is_active !== false,

    deactivatedMessage:
      row?.deactivated_message ?? current.deactivatedMessage ?? "",

    deactivatedRedirectUrl:
      row?.deactivated_redirect_url ?? current.deactivatedRedirectUrl ?? "",

    deactivatedRedirectLabel:
      row?.deactivated_redirect_label ?? current.deactivatedRedirectLabel ?? "",

    deactivatedAccentColor:
      row?.deactivated_accent_color ||
      current.deactivatedAccentColor ||
      "#7c3aed",

    createdAt: row?.created_at ? new Date(row.created_at) : current.createdAt,

    updatedAt: row?.updated_at ? new Date(row.updated_at) : new Date(),

    pendingBannerFile: null,
    pendingBannerPreviewUrl: null,
    pendingSectionImages: {},
  };
}

export function FormBuilderWorkspace({
  formId,
  templateId,
  mode = formId ? "edit" : "create",
}: FormBuilderWorkspaceProps) {
  const router = useRouter();

  const [viewport, setViewport] = useState<FormBuilderViewport>("desktop");

  const [workspaceView, setWorkspaceView] =
    useState<FormBuilderWorkspaceView>("structure");

  const [previewMode, setPreviewMode] =
    useState<FormBuilderPreviewMode>("form");

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [savedSnapshot, setSavedSnapshot] = useState("");

  const [justSaved, setJustSaved] = useState(false);

  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  const [pendingNavigation, setPendingNavigation] = useState<
    | {
        type: "back";
      }
    | {
        type: "browser-back";
      }
    | {
        type: "href";
        href: string;
      }
    | null
  >(null);

  const [draft, setDraft] = useState<FormBuilderDraft>(() =>
    createBlankDraft(),
  );

  const [selection, setSelection] = useState<FormBuilderSelection>({
    type: "form",
  });

  const pendingSectionImagesRef = useRef(draft.pendingSectionImages || {});

  const historyGuardActiveRef = useRef(false);

  const allowHistoryNavigationRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadBuilder() {
      setLoading(true);
      setLoadError(null);

      try {
        if (mode === "edit") {
          if (!formId) {
            toast.error("Missing form ID");
            router.replace("/dashboard");
            return;
          }

          const result = await getFormForBuilderAction(formId);

          if (!result.success) {
            const message = result.error || "Failed to load form";

            setLoadError(message);

            toast.error(message);

            return;
          }

          if (!cancelled) {
            const nextDraft = result.form as FormBuilderDraft;

            setDraft(nextDraft);

            setSavedSnapshot(getDraftSnapshot(nextDraft));

            setPreviewMode(nextDraft.isActive ? "form" : "deactivation");

            setSelection({
              type: "form",
            });
          }

          return;
        }

        if (templateId) {
          const result = await getFormTemplateForBuilderAction(templateId);

          if (!result.success) {
            toast.error(result.error || "Failed to load template");

            if (!cancelled) {
              const nextDraft = createBlankDraft();

              setDraft(nextDraft);

              setSavedSnapshot(getDraftSnapshot(nextDraft));

              setPreviewMode(nextDraft.isActive ? "form" : "deactivation");

              setSelection({
                type: "form",
              });
            }

            return;
          }

          if (!cancelled) {
            const nextDraft: FormBuilderDraft = {
              ...createBlankDraft(),

              title: result.template.name || "Untitled Form",

              description: result.template.description || "",

              sections:
                Array.isArray(result.template.sections) &&
                result.template.sections.length > 0
                  ? (result.template.sections as FormSection[])
                  : [createBlankSection()],

              appearance: resolveFormAppearance(
                result.template.appearance || null,
              ),
            };

            setDraft(nextDraft);

            setSavedSnapshot(getDraftSnapshot(nextDraft));

            setPreviewMode(nextDraft.isActive ? "form" : "deactivation");

            setSelection({
              type: "form",
            });
          }

          return;
        }

        if (!cancelled) {
          if (!cancelled) {
            const nextDraft = createBlankDraft();

            setDraft(nextDraft);

            setSavedSnapshot(getDraftSnapshot(nextDraft));

            setSelection({
              type: "form",
            });
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadBuilder();

    return () => {
      cancelled = true;
    };
  }, [formId, mode, router, templateId]);

  useEffect(() => {
    const previewUrl = draft.pendingBannerPreviewUrl;

    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [draft.pendingBannerPreviewUrl]);

  useEffect(() => {
    const previous = pendingSectionImagesRef.current;

    const current = draft.pendingSectionImages || {};

    for (const [sectionId, pending] of Object.entries(previous)) {
      if (!pending?.previewUrl) {
        continue;
      }

      const currentUrl = current[sectionId]?.previewUrl;

      if (
        pending.previewUrl !== currentUrl &&
        pending.previewUrl.startsWith("blob:")
      ) {
        URL.revokeObjectURL(pending.previewUrl);
      }
    }

    pendingSectionImagesRef.current = current;
  }, [draft.pendingSectionImages]);

  useEffect(() => {
    return () => {
      for (const pending of Object.values(pendingSectionImagesRef.current)) {
        if (pending?.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(pending.previewUrl);
        }
      }
    };
  }, []);

  const formTitle = useMemo(
    () => stripMarkdownToText(draft.title || "").trim() || "Untitled Form",
    [draft.title],
  );

  const publicHref =
    mode === "edit" && draft.shareableLink
      ? `/form/${encodeURIComponent(draft.shareableLink)}`
      : null;

  const headerStatus =
    mode === "create" ? "draft" : draft.isActive ? "active" : "inactive";

  const headerSubtitle =
    mode === "create"
      ? templateId
        ? "New form · Template"
        : "New form · Blank"
      : draft.shareableLink
        ? `/form/${draft.shareableLink}`
        : "Form builder";

  const saveLabel = mode === "create" ? "Create Form" : "Save";

  const previewSections = useMemo(() => {
    return draft.sections.map((section) => {
      const pending = draft.pendingSectionImages?.[section.id];

      if (!pending) {
        return section;
      }

      return {
        ...section,
        custom: {
          ...(section.custom || {}),

          // Mientras exista una imagen local,
          // hacemos que PublicForm use el blob URL.
          imageAssetPath: undefined,
          imageUrl: pending.previewUrl,
        },
      };
    });
  }, [draft.sections, draft.pendingSectionImages]);

  const currentSnapshot = useMemo(() => getDraftSnapshot(draft), [draft]);

  const hasPendingAssets =
    Boolean(draft.pendingBannerFile) ||
    Object.values(draft.pendingSectionImages || {}).some(Boolean);

  const isDirty =
    Boolean(savedSnapshot) &&
    (currentSnapshot !== savedSnapshot || hasPendingAssets);

  const canSave = mode === "create" || isDirty;

  const handleBuilderSelectionChange = useCallback(
    (nextSelection: FormBuilderSelection) => {
      setSelection(nextSelection);

      /*
       * On narrow screens only one workspace panel is visible.
       * Jump directly to the Inspector after choosing something
       * from Structure. On xl+ this state is ignored because all
       * three columns remain visible.
       */
      setWorkspaceView("inspector");
    },
    [],
  );

  const handleAddSection = () => {
    if (draft.sections.length >= MAX_FORM_SECTIONS) {
      toast.error(`Forms can contain up to ${MAX_FORM_SECTIONS} sections`);
      return;
    }

    const section: FormSection = {
      id: uuidv4(),
      title: "New Section",
      description: "",
      fields: [],
    };

    setDraft((current) => ({
      ...current,
      sections: [...current.sections, section],
    }));

    setSelection({
      type: "section",
      sectionId: section.id,
    });

    setWorkspaceView("inspector");
  };

  const handleAddField = (sectionId: string) => {
    if (getTotalFieldCount(draft.sections) >= MAX_FORM_FIELDS) {
      toast.error(`Forms can contain up to ${MAX_FORM_FIELDS} fields`);
      return;
    }

    const field = createBlankField();

    setDraft((current) => ({
      ...current,

      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: [...section.fields, field],
            }
          : section,
      ),
    }));

    setSelection({
      type: "field",
      sectionId,
      fieldId: field.id,
    });

    setWorkspaceView("inspector");
  };

  const handleDuplicateField = (sectionId: string, fieldId: string) => {
    if (getTotalFieldCount(draft.sections) >= MAX_FORM_FIELDS) {
      toast.error(`Forms can contain up to ${MAX_FORM_FIELDS} fields`);
      return;
    }

    const sourceSection = draft.sections.find(
      (section) => section.id === sectionId,
    );

    const sourceField = sourceSection?.fields.find(
      (field) => field.id === fieldId,
    );

    if (!sourceSection || !sourceField) {
      return;
    }

    const duplicate = cloneField(sourceField);

    duplicate.label = sourceField.label
      ? `${sourceField.label} Copy`
      : "New field";

    setDraft((current) => ({
      ...current,

      sections: current.sections.map((section) => {
        if (section.id !== sectionId) {
          return section;
        }

        const index = section.fields.findIndex((field) => field.id === fieldId);

        if (index === -1) {
          return section;
        }

        const fields = [...section.fields];

        fields.splice(index + 1, 0, duplicate);

        return {
          ...section,
          fields,
        };
      }),
    }));

    setSelection({
      type: "field",
      sectionId,
      fieldId: duplicate.id,
    });

    setWorkspaceView("inspector");
  };

  const handleDuplicateSection = (sectionId: string) => {
    const sourceIndex = draft.sections.findIndex(
      (section) => section.id === sectionId,
    );

    const source = draft.sections[sourceIndex];

    if (!source) return;

    if (draft.sections.length >= MAX_FORM_SECTIONS) {
      toast.error(`Forms can contain up to ${MAX_FORM_SECTIONS} sections`);
      return;
    }

    if (
      getTotalFieldCount(draft.sections) + source.fields.length >
      MAX_FORM_FIELDS
    ) {
      toast.error(
        `Duplicating this section would exceed the ${MAX_FORM_FIELDS}-field limit`,
      );
      return;
    }

    /*
     * Every copied field needs a fresh ID.
     *
     * Conditions pointing to another field
     * inside the duplicated section are
     * remapped to its duplicate.
     *
     * Conditions pointing outside the
     * section continue pointing outside.
     */
    const fieldIdMap = new Map<string, string>();

    for (const field of source.fields) {
      fieldIdMap.set(field.id, uuidv4());
    }

    const duplicateFields = source.fields.map((field) => {
      const duplicate = cloneField(field, fieldIdMap.get(field.id)!);

      if (duplicate.conditions) {
        duplicate.conditions = duplicate.conditions.map((condition) => ({
          ...condition,

          fieldId: fieldIdMap.get(condition.fieldId) ?? condition.fieldId,
        }));
      }

      return duplicate;
    });

    const duplicate: FormSection = {
      ...source,

      id: uuidv4(),

      title: source.title ? `${source.title} Copy` : "New Section",

      fields: duplicateFields,

      custom: source.custom
        ? {
            ...source.custom,
          }
        : undefined,
    };

    const sections = [...draft.sections];

    sections.splice(sourceIndex + 1, 0, duplicate);

    setDraft((current) => ({
      ...current,
      sections,
    }));

    setSelection({
      type: "section",
      sectionId: duplicate.id,
    });

    setWorkspaceView("inspector");
  };

  const handleDeleteField = (sectionId: string, fieldId: string) => {
    const sourceSection = draft.sections.find(
      (section) => section.id === sectionId,
    );

    if (!sourceSection) return;

    const fieldIndex = sourceSection.fields.findIndex(
      (field) => field.id === fieldId,
    );

    if (fieldIndex === -1) return;

    const remainingFields = sourceSection.fields.filter(
      (field) => field.id !== fieldId,
    );

    const nextField =
      remainingFields[fieldIndex] ?? remainingFields[fieldIndex - 1];

    const removedIds = new Set([fieldId]);

    const sections = removeConditionReferences(
      draft.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: remainingFields,
            }
          : section,
      ),
      removedIds,
    );

    setDraft((current) => ({
      ...current,
      sections,
    }));

    if (nextField) {
      setSelection({
        type: "field",
        sectionId,
        fieldId: nextField.id,
      });
    } else {
      setSelection({
        type: "section",
        sectionId,
      });
    }
  };

  const handleDeleteSection = (sectionId: string) => {
    const sectionIndex = draft.sections.findIndex(
      (section) => section.id === sectionId,
    );

    const source = draft.sections[sectionIndex];

    if (!source) return;

    const removedFieldIds = new Set(source.fields.map((field) => field.id));

    let sections = draft.sections.filter((section) => section.id !== sectionId);

    sections = removeConditionReferences(sections, removedFieldIds);

    const nextPendingImages = {
      ...(draft.pendingSectionImages || {}),
    };

    delete nextPendingImages[sectionId];

    setDraft((current) => ({
      ...current,

      sections,

      pendingSectionImages: nextPendingImages,
    }));

    const nextSection = sections[sectionIndex] ?? sections[sectionIndex - 1];

    if (nextSection) {
      setSelection({
        type: "section",
        sectionId: nextSection.id,
      });
    } else {
      setSelection({
        type: "form",
      });
    }
  };

  const handleMoveSection = (sectionId: string, direction: -1 | 1) => {
    const index = draft.sections.findIndex(
      (section) => section.id === sectionId,
    );

    const target = index + direction;

    if (index === -1 || target < 0 || target >= draft.sections.length) {
      return;
    }

    const sections = [...draft.sections];

    [sections[index], sections[target]] = [sections[target], sections[index]];

    setDraft((current) => ({
      ...current,
      sections,
    }));
  };

  const handleMoveField = (
    sectionId: string,
    fieldId: string,
    direction: -1 | 1,
  ) => {
    setDraft((current) => ({
      ...current,

      sections: current.sections.map((section) => {
        if (section.id !== sectionId) {
          return section;
        }

        const index = section.fields.findIndex((field) => field.id === fieldId);

        const target = index + direction;

        if (index === -1 || target < 0 || target >= section.fields.length) {
          return section;
        }

        const fields = [...section.fields];

        [fields[index], fields[target]] = [fields[target], fields[index]];

        return {
          ...section,
          fields,
        };
      }),
    }));
  };

  const handleSave = useCallback(async () => {
    if (saving) {
      return;
    }

    if (mode === "edit" && !isDirty) {
      return;
    }

    const plainTitle = stripMarkdownToText(draft.title || "").trim();

    if (!plainTitle) {
      toast.error("Add a form title before saving.");
      return;
    }

    for (const section of draft.sections) {
      for (const field of section.fields) {
        const plainLabel = stripMarkdownToText(field.label || "").trim();

        if (!plainLabel) {
          toast.error(
            "Every field needs a label before the form can be saved.",
          );

          setSelection({
            type: "field",
            sectionId: section.id,
            fieldId: field.id,
          });

          setWorkspaceView("inspector");

          return;
        }
      }
    }

    const redirectInput = draft.deactivatedRedirectUrl?.trim() || "";

    const normalizedRedirect = redirectInput
      ? normalizeHttpUrl(redirectInput)
      : "";

    if (redirectInput && !normalizedRedirect) {
      toast.error("Enter a valid deactivation redirect URL.");

      setSelection({
        type: "availability",
      });

      setWorkspaceView("inspector");

      return;
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(draft.deactivatedAccentColor || "")) {
      toast.error("Enter a valid deactivation accent color.");

      setSelection({
        type: "availability",
      });

      return;
    }

    const bannerUrlInput = draft.bannerUrl?.trim() || "";

    const normalizedBannerUrl = bannerUrlInput
      ? normalizeHttpUrl(bannerUrlInput)
      : "";

    if (bannerUrlInput && !normalizedBannerUrl) {
      toast.error("Enter a valid external banner URL.");

      setSelection({
        type: "form",
      });

      setWorkspaceView("inspector");

      return;
    }

    setSaving(true);
    setJustSaved(false);

    const uploadedBannerPaths: string[] = [];

    const uploadedSectionPaths: string[] = [];

    let persisted = false;

    try {
      let workingDraft: FormBuilderDraft = {
        ...draft,

        bannerUrl: normalizedBannerUrl || "",

        deactivatedRedirectUrl: normalizedRedirect || "",
      };

      /*
       * 1. Upload pending banner.
       *
       * Do NOT send the old path here.
       * updateFormAction cleans the previous
       * persisted asset after a successful
       * database update.
       */
      if (workingDraft.pendingBannerFile) {
        const formData = new FormData();

        formData.append("file", workingDraft.pendingBannerFile);

        const uploadResult = await uploadFormBannerAction(formData);

        if (!uploadResult.success || !uploadResult.path) {
          throw new Error(uploadResult.error || "Failed to upload banner.");
        }

        uploadedBannerPaths.push(uploadResult.path);

        workingDraft = {
          ...workingDraft,

          bannerAssetPath: uploadResult.path,

          // Uploaded image is now the
          // canonical banner source.
          bannerUrl: "",

          pendingBannerFile: null,
          pendingBannerPreviewUrl: null,
        };
      }

      /*
       * 2. Upload pending section images.
       */
      let nextSections = workingDraft.sections;

      for (const [sectionId, pending] of Object.entries(
        draft.pendingSectionImages || {},
      )) {
        if (!pending) {
          continue;
        }

        const formData = new FormData();

        formData.append("file", pending.file);

        const uploadResult = await uploadFormSectionImageAction(formData);

        if (!uploadResult.success || !uploadResult.path) {
          throw new Error(
            uploadResult.error || "Failed to upload section image.",
          );
        }

        uploadedSectionPaths.push(uploadResult.path);

        nextSections = nextSections.map((section) =>
          section.id === sectionId
            ? {
                ...section,

                custom: {
                  ...(section.custom || {}),

                  imageAssetPath: uploadResult.path,

                  imageUrl: "",
                },
              }
            : section,
        );
      }

      /*
       * 3. Normalize external section URLs.
       */
      nextSections = nextSections.map((section) => {
        const imageUrl = section.custom?.imageUrl?.trim() || "";

        if (!imageUrl) {
          return section;
        }

        const normalized = normalizeHttpUrl(imageUrl);

        if (!normalized) {
          throw new Error(
            `Enter a valid image URL for "${
              stripMarkdownToText(section.title || "Untitled section").trim() ||
              "Untitled section"
            }".`,
          );
        }

        return {
          ...section,

          custom: {
            ...(section.custom || {}),
            imageUrl: normalized,
          },
        };
      });

      workingDraft = {
        ...workingDraft,

        sections: nextSections,

        pendingSectionImages: {},
      };

      const payload = toPersistableForm(workingDraft);

      const targetFormId = formId || workingDraft.id;

      if (mode === "edit" && !targetFormId) {
        throw new Error(
          "Missing form ID. Your changes are still in the builder and have not been discarded.",
        );
      }

      const result =
        mode === "create"
          ? await createFormAction(payload)
          : await updateFormAction(targetFormId, payload);

      if (!result.success) {
        throw new Error(
          result.error ||
            (mode === "create"
              ? "Failed to create form."
              : "Failed to save form."),
        );
      }

      /*
       * From this point onward the DB now
       * references the uploaded files, so
       * they must NOT be rolled back.
       */
      persisted = true;

      const savedDraft = mapSavedRowToDraft(workingDraft, result.form);

      setDraft(savedDraft);

      setSavedSnapshot(getDraftSnapshot(savedDraft));

      setJustSaved(true);

      toast.success(mode === "create" ? "Form created" : "Form saved");

      if (mode === "create" && savedDraft.id) {
        router.replace(`/forms/${encodeURIComponent(savedDraft.id)}/builder`);
      }
    } catch (error) {
      /*
       * If persistence failed, newly
       * uploaded files are orphaned and
       * safe to roll back.
       *
       * Existing DB assets were never
       * deleted during the upload phase.
       */
      if (!persisted) {
        await Promise.allSettled([
          ...uploadedBannerPaths.map((path) => removeFormBannerAction(path)),

          ...uploadedSectionPaths.map((path) =>
            removeFormSectionImageAction(path),
          ),
        ]);
      }

      toast.error(
        error instanceof Error ? error.message : "Failed to save form.",
      );
    } finally {
      setSaving(false);
    }
  }, [draft, formId, isDirty, mode, router, saving]);

  useEffect(() => {
    if (!isDirty || saving) {
      if (historyGuardActiveRef.current) {
        historyGuardActiveRef.current = false;
      }

      return;
    }

    if (!historyGuardActiveRef.current) {
      window.history.pushState(
        {
          ...(window.history.state || {}),
          forgeworksFormBuilderGuard: true,
        },
        "",
        window.location.href,
      );

      historyGuardActiveRef.current = true;
    }

    const handlePopState = () => {
      if (allowHistoryNavigationRef.current) {
        allowHistoryNavigationRef.current = false;

        return;
      }

      window.history.pushState(
        {
          ...(window.history.state || {}),
          forgeworksFormBuilderGuard: true,
        },
        "",
        window.location.href,
      );

      historyGuardActiveRef.current = true;

      setPendingNavigation({
        type: "browser-back",
      });

      setDiscardDialogOpen(true);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty, saving]);

  useEffect(() => {
    if (isDirty) {
      setJustSaved(false);
    }
  }, [isDirty]);

  useEffect(() => {
    if (!justSaved) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setJustSaved(false);
    }, 1800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [justSaved]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSaveShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";

      if (!isSaveShortcut) {
        return;
      }

      /*
       * Cancels the browser's default "Save page" behavior:
       * Chrome/Edge/Firefox "Save page"
       * macOS Cmd+S
       */
      event.preventDefault();

      if (event.repeat || saving || !canSave) {
        return;
      }

      void handleSave();
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [canSave, handleSave, saving]);

  useEffect(() => {
    if (!isDirty || saving) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();

      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, saving]);

  const handleBack = useCallback(() => {
    if (!isDirty || saving) {
      router.back();
      return;
    }

    setPendingNavigation({
      type: "back",
    });

    setDiscardDialogOpen(true);
  }, [isDirty, router, saving]);

  useEffect(() => {
    if (!isDirty || saving) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");

      if (!anchor) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      if (anchor.hasAttribute("download")) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);

      if (url.origin !== window.location.origin) {
        return;
      }

      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      const destination = `${url.pathname}${url.search}${url.hash}`;

      if (destination === current) {
        return;
      }

      event.preventDefault();

      setPendingNavigation({
        type: "href",
        href: destination,
      });

      setDiscardDialogOpen(true);
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isDirty, saving]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />

          <p className="text-sm">
            {mode === "edit"
              ? "Loading form builder…"
              : "Preparing form builder…"}
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Could not load this form</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {loadError === "Unauthenticated"
              ? "Your session may have expired. Sign in again and reopen the form."
              : loadError}
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
              onClick={() => {
                window.location.reload();
              }}
            >
              Try again
            </button>

            <button
              type="button"
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              onClick={() => {
                router.push("/");
              }}
            >
              Back to Forgeworks
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <FormBuilderHeader
        title={formTitle}
        status={headerStatus}
        subtitle={headerSubtitle}
        viewport={viewport}
        workspaceView={workspaceView}
        saving={saving}
        isDirty={isDirty}
        canSave={canSave}
        justSaved={justSaved}
        publicHref={publicHref}
        saveLabel={saveLabel}
        onBack={handleBack}
        onViewportChange={setViewport}
        onWorkspaceViewChange={setWorkspaceView}
        onSave={() => {
          void handleSave();
        }}
      />

      {/* Workspace */}
      <div
        className="w-full flex-1 xl:grid xl:grid-cols-[17rem_minmax(0,1fr)_24rem]
2xl:grid-cols-[18rem_minmax(0,1fr)_26rem]"
      >
        {/* Structure */}
        <div
          className={cn(
            "min-w-0 xl:block",
            workspaceView === "structure" ? "block" : "hidden",
          )}
        >
          <FormBuilderStructurePanel
            draft={draft}
            selection={selection}
            onSelectionChange={handleBuilderSelectionChange}
            onAddSection={handleAddSection}
            onAddField={handleAddField}
            onDuplicateSection={handleDuplicateSection}
            onDuplicateField={handleDuplicateField}
            onDeleteSection={handleDeleteSection}
            onDeleteField={handleDeleteField}
            onMoveSection={handleMoveSection}
            onMoveField={handleMoveField}
          />
        </div>

        {/* Live preview */}
        <div
          className={cn(
            "min-w-0 xl:block",
            workspaceView === "preview" ? "block" : "hidden",
          )}
        >
          <FormBuilderPreview
            draft={draft}
            sections={previewSections}
            viewport={viewport}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
          />
        </div>

        {/* Inspector */}
        <div
          className={cn(
            "min-w-0 xl:block",
            workspaceView === "inspector" ? "block" : "hidden",
          )}
        >
          <FormBuilderInspector
            draft={draft}
            selection={selection}
            onDraftChange={setDraft}
          />
        </div>
      </div>

      <AlertDialog
        open={discardDialogOpen}
        onOpenChange={(open) => {
          setDiscardDialogOpen(open);

          if (!open) {
            setPendingNavigation(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>

            <AlertDialogDescription>
              You have changes that have not been saved yet. Leaving the builder
              will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Keep editing
            </AlertDialogCancel>

            <AlertDialogAction
              className="cursor-pointer"
              onClick={() => {
                const target = pendingNavigation;

                setPendingNavigation(null);

                setDiscardDialogOpen(false);

                if (!target) {
                  return;
                }

                if (target.type === "browser-back") {
                  allowHistoryNavigationRef.current = true;

                  historyGuardActiveRef.current = false;

                  window.history.go(-2);

                  return;
                }

                if (target.type === "back") {
                  router.back();
                  return;
                }

                router.push(target.href);
              }}
            >
              Leave builder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
