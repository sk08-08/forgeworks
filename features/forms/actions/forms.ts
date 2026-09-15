"use server";

import { createClient } from "@/lib/supabase/server";
import type { RequestForm } from "@/features/forms/types/form-types";
import { friendlySupabaseError, ensureShareableLink } from "@/lib/error-utils";
import { v4 as uuidv4 } from "uuid";
import { resolveFormAppearance } from "@/features/forms/lib/form-appearance";
import { z } from "zod";
import {
  FORM_ASSETS_BUCKET,
  FORM_BANNERS_BUCKET,
  extractFormAssetPathsFromSections,
  getFormBannerPublicUrl,
  getFormAssetPublicUrl,
} from "@/features/forms/lib/form-assets";
import { normalizeHttpUrl } from "@/lib/safe-url";
import { normalizeResourceVisibility } from "@/lib/resource-visibility";

const ALLOWED_FORM_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
];
const MAX_FORM_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const MAX_FORM_SECTIONS = 20;
const MAX_FORM_FIELDS = 50;
const MAX_FIELD_OPTIONS = 30;

const conditionSchema = z.object({
  fieldId: z.string().min(1).max(100),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "is_not_empty",
    "is_empty",
  ]),
  value: z.string().max(500).optional(),
});

const formFieldSchema = z.object({
  id: z.string().min(1).max(100),

  minLength: z.number().int().min(0).max(100000).optional(),

  maxLength: z.number().int().min(1).max(100000).optional(),

  minSelections: z.number().int().min(0).max(MAX_FIELD_OPTIONS).optional(),

  maxSelections: z.number().int().min(1).max(MAX_FIELD_OPTIONS).optional(),

  pattern: z.string().max(500).optional(),

  type: z.enum([
    "text",
    "textarea",
    "select",
    "radio",
    "checkbox",
    "rating-type",
    "tags",
  ]),

  label: z.string().max(2000),
  description: z.string().max(10000).optional().default(""),
  placeholder: z.string().max(500).optional(),

  required: z.boolean(),

  options: z
    .array(z.string().min(1).max(200))
    .max(MAX_FIELD_OPTIONS)
    .optional(),

  allowOther: z.boolean().optional(),

  textAlignment: z.enum(["left", "center", "right"]).optional(),

  conditions: z.array(conditionSchema).max(20).optional(),
});

const formSectionSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().max(3000),
  description: z.string().max(15000).optional(),

  fields: z.array(formFieldSchema),

  custom: z
    .object({
      headerAlignment: z.enum(["left", "center", "right"]).optional(),

      collapsible: z.boolean().optional(),
      defaultExpanded: z.boolean().optional(),

      imageAssetPath: z.string().max(1000).optional(),
      imageUrl: z.string().max(2000).optional(),
      gifUrl: z.string().max(2000).optional(),
    })
    .optional(),
});

const deactivationSettingsSchema = z.object({
  message: z.string().max(10000),
  redirectUrl: z.string().max(2000),
  redirectLabel: z.string().max(100),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid accent color"),
});

const formPayloadSchema = z.object({
  title: z.string().trim().min(1).max(3000),
  description: z.string().max(20000).default(""),

  bannerAssetPath: z.string().max(1000).optional(),
  bannerUrl: z.string().max(2000).optional(),

  sections: z.array(formSectionSchema).min(1).max(MAX_FORM_SECTIONS),

  isActive: z.boolean(),

  visibility: z.enum(["public", "followers", "private"]).default("private"),

  shareableLink: z.string().max(100).optional(),

  appearance: z.any().optional(),

  deactivatedMessage: z.string().max(10000).default(""),

  deactivatedRedirectUrl: z.string().max(2000).default(""),

  deactivatedRedirectLabel: z.string().max(100).default(""),

  deactivatedAccentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid accent color")
    .default("#7c3aed"),
});

function validateFormStructure(sections: z.infer<typeof formSectionSchema>[]) {
  const sectionIds = new Set<string>();
  const fieldIds = new Set<string>();

  let totalFields = 0;

  // First pass:
  // collect and validate all IDs.
  for (const section of sections) {
    if (sectionIds.has(section.id)) {
      return `Duplicate section id: ${section.id}`;
    }

    sectionIds.add(section.id);

    for (const field of section.fields) {
      totalFields += 1;

      if (totalFields > MAX_FORM_FIELDS) {
        return `Forms can contain up to ${MAX_FORM_FIELDS} fields`;
      }

      if (fieldIds.has(field.id)) {
        return `Duplicate field id: ${field.id}`;
      }

      fieldIds.add(field.id);
    }
  }

  // Second pass:
  // validate field rules and dependencies.
  for (const section of sections) {
    for (const field of section.fields) {
      if (
        field.minLength !== undefined &&
        field.maxLength !== undefined &&
        field.minLength > field.maxLength
      ) {
        return `Minimum length cannot exceed maximum length`;
      }

      if (
        field.minSelections !== undefined &&
        field.maxSelections !== undefined &&
        field.minSelections > field.maxSelections
      ) {
        return `Minimum selections cannot exceed maximum selections`;
      }

      if (field.pattern) {
        try {
          new RegExp(field.pattern);
        } catch {
          return `Invalid validation pattern`;
        }
      }

      for (const condition of field.conditions || []) {
        if (!fieldIds.has(condition.fieldId)) {
          return `Condition references a field that does not exist`;
        }

        if (condition.fieldId === field.id) {
          return `A field cannot depend on itself`;
        }

        const requiresValue =
          condition.operator === "equals" ||
          condition.operator === "not_equals" ||
          condition.operator === "contains";

        if (requiresValue && !String(condition.value || "").trim()) {
          return `Conditional rules using "${condition.operator}" require a value`;
        }
      }
    }
  }

  // Third pass:
  // reject circular conditional dependencies.
  const dependencies = new Map<string, string[]>();

  for (const section of sections) {
    for (const field of section.fields) {
      dependencies.set(
        field.id,
        (field.conditions || []).map((condition) => condition.fieldId),
      );
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const hasCycle = (fieldId: string): boolean => {
    if (visiting.has(fieldId)) {
      return true;
    }

    if (visited.has(fieldId)) {
      return false;
    }

    visiting.add(fieldId);

    for (const dependency of dependencies.get(fieldId) || []) {
      if (hasCycle(dependency)) {
        return true;
      }
    }

    visiting.delete(fieldId);
    visited.add(fieldId);

    return false;
  };

  for (const fieldId of fieldIds) {
    if (hasCycle(fieldId)) {
      return `Conditional logic cannot contain circular dependencies`;
    }
  }

  return null;
}

async function resolveUserIdForActions() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      userId: undefined,
    };
  }

  return {
    supabase,
    userId: user.id,
  };
}

export async function getFormForBuilderAction(formId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false as const,
      error: "Unauthenticated",
    };
  }

  const { data, error } = await supabase
    .from("request_forms")
    .select(
      `
        id,
        user_id,
        title,
        description,
        banner_asset_path,
        banner_url,
        sections,
        appearance,
        shareable_link,
        is_active,
        visibility,
        deactivated_message,
        deactivated_redirect_url,
        deactivated_redirect_label,
        deactivated_accent_color,
        created_at,
        updated_at
      `,
    )
    .eq("id", formId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return {
      success: false as const,
      error: friendlySupabaseError(error, "Failed to load form"),
    };
  }

  if (!data) {
    return {
      success: false as const,
      error: "Form not found",
    };
  }

  return {
    success: true as const,
    form: {
      id: data.id,
      ownerId: data.user_id,
      title: data.title || "",
      description: data.description || "",
      bannerAssetPath: data.banner_asset_path || "",
      bannerUrl: data.banner_url || "",
      sections: data.sections || [],
      appearance: resolveFormAppearance(data.appearance || null),
      shareableLink: data.shareable_link || "",
      isActive: data.is_active !== false,
      visibility: normalizeResourceVisibility(data.visibility),

      deactivatedMessage: data.deactivated_message || "",
      deactivatedRedirectUrl: data.deactivated_redirect_url || "",
      deactivatedRedirectLabel: data.deactivated_redirect_label || "",
      deactivatedAccentColor: data.deactivated_accent_color || "#7c3aed",

      createdAt: data.created_at ? new Date(data.created_at) : new Date(),

      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
    } satisfies RequestForm,
  };
}

export async function getFormTemplateForBuilderAction(templateId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false as const,
      error: "Unauthenticated",
    };
  }

  const { data, error } = await supabase
    .from("form_templates")
    .select(
      `
        id,
        name,
        description,
        category,
        icon,
        sections,
        appearance,
        is_builtin
      `,
    )
    .eq("id", templateId)
    .maybeSingle();

  if (error) {
    return {
      success: false as const,
      error: friendlySupabaseError(error, "Failed to load template"),
    };
  }

  if (!data) {
    return {
      success: false as const,
      error: "Template not found",
    };
  }

  return {
    success: true as const,
    template: data,
  };
}

async function removeFormAssetsByPath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
) {
  const deduped = Array.from(
    new Set(paths.map((p) => String(p || "").trim()).filter(Boolean)),
  );

  if (deduped.length === 0) return;
  await supabase.storage.from(FORM_ASSETS_BUCKET).remove(deduped);
}

export async function uploadFormSectionImageAction(formData: FormData) {
  const { supabase, userId } = await resolveUserIdForActions();
  if (!userId) return { success: false, error: "Unauthenticated" };

  const file = formData.get("file");
  const existingPath = String(formData.get("existingPath") || "").trim();

  if (!(file instanceof File)) {
    return { success: false, error: "No image file provided" };
  }

  if (!ALLOWED_FORM_IMAGE_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "Unsupported image type. Use PNG, JPG, WEBP or AVIF",
    };
  }

  if (file.size > MAX_FORM_IMAGE_SIZE_BYTES) {
    return { success: false, error: "Image is too large (max 5MB)" };
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();

  const path = `${userId}/form-banner-${Date.now()}-${uuidv4()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(FORM_ASSETS_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      success: false,
      error: friendlySupabaseError(uploadError, "Failed to upload image"),
    };
  }

  if (
    existingPath &&
    existingPath.startsWith(`${userId}/`) &&
    existingPath !== path
  ) {
    await removeFormAssetsByPath(supabase, [existingPath]);
  }

  return {
    success: true,
    path,
    publicUrl: getFormAssetPublicUrl(path),
  };
}

export async function removeFormSectionImageAction(path: string) {
  const { supabase, userId } = await resolveUserIdForActions();
  if (!userId) return { success: false, error: "Unauthenticated" };

  const target = String(path || "").trim();
  if (!target) return { success: true };

  if (!target.startsWith(`${userId}/`)) {
    return { success: false, error: "Forbidden" };
  }

  const { error } = await supabase.storage
    .from(FORM_ASSETS_BUCKET)
    .remove([target]);
  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to remove image"),
    };
  }

  return { success: true };
}

export async function uploadFormBannerAction(formData: FormData) {
  const { supabase, userId } = await resolveUserIdForActions();

  if (!userId) {
    return {
      success: false,
      error: "Unauthenticated",
    };
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return {
      success: false,
      error: "No image file provided",
    };
  }

  if (!ALLOWED_FORM_IMAGE_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "Unsupported image type. Use PNG, JPG, WEBP or AVIF",
    };
  }

  if (file.size > MAX_FORM_IMAGE_SIZE_BYTES) {
    return {
      success: false,
      error: "Image is too large (max 5MB)",
    };
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();

  const path = `${userId}/form-banner-${Date.now()}-${uuidv4()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(FORM_BANNERS_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("Failed to upload form banner:", uploadError);

    return {
      success: false,
      error: friendlySupabaseError(uploadError, "Failed to upload banner"),
    };
  }

  return {
    success: true,
    path,
    publicUrl: getFormBannerPublicUrl(path),
  };
}

export async function removeFormBannerAction(path: string) {
  const { supabase, userId } = await resolveUserIdForActions();
  if (!userId) return { success: false, error: "Unauthenticated" };

  const target = String(path || "").trim();
  if (!target) return { success: true };

  if (!target.startsWith(`${userId}/`)) {
    return { success: false, error: "Forbidden" };
  }

  const { error } = await supabase.storage
    .from(FORM_BANNERS_BUCKET)
    .remove([target]);
  if (error) {
    console.error("Failed to remove form banner:", error);

    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to remove banner"),
    };
  }

  return { success: true };
}

export async function createFormAction(
  form: Omit<RequestForm, "id" | "createdAt" | "updatedAt">,
) {
  const { supabase, userId } = await resolveUserIdForActions();

  if (!userId) return { success: false, error: "Unauthenticated" };

  const parsed = formPayloadSchema.safeParse(form);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid form data",
    };
  }

  const structureError = validateFormStructure(parsed.data.sections);

  if (structureError) {
    return {
      success: false,
      error: structureError,
    };
  }

  const safeForm = parsed.data;

  const normalizedBannerUrl = safeForm.bannerUrl?.trim()
    ? normalizeHttpUrl(safeForm.bannerUrl)
    : "";

  if (safeForm.bannerUrl?.trim() && !normalizedBannerUrl) {
    return {
      success: false,
      error: "Invalid banner URL",
    };
  }

  const normalizedRedirectUrl = safeForm.deactivatedRedirectUrl?.trim()
    ? normalizeHttpUrl(safeForm.deactivatedRedirectUrl)
    : "";

  if (safeForm.deactivatedRedirectUrl?.trim() && !normalizedRedirectUrl) {
    return {
      success: false,
      error: "Invalid redirect URL",
    };
  }

  const payload = {
    user_id: userId,

    title: safeForm.title,
    description: safeForm.description ?? "",

    banner_asset_path: safeForm.bannerAssetPath || null,

    banner_url: normalizedBannerUrl || null,

    sections: safeForm.sections || [],

    appearance: resolveFormAppearance(safeForm.appearance ?? null),

    shareable_link: ensureShareableLink(safeForm.shareableLink),

    is_active: !!safeForm.isActive,

    visibility: normalizeResourceVisibility(safeForm.visibility),

    deactivated_message: safeForm.deactivatedMessage ?? "",

    deactivated_redirect_url: normalizedRedirectUrl || "",

    deactivated_redirect_label: safeForm.deactivatedRedirectLabel ?? "",

    deactivated_accent_color: safeForm.deactivatedAccentColor || "#7c3aed",
  };

  const { data: inserted, error } = await supabase
    .from("request_forms")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to create form"),
    };
  }
  return { success: true, form: inserted };
}

export async function updateFormAction(id: string, data: Partial<RequestForm>) {
  const { supabase, userId } = await resolveUserIdForActions();

  if (!userId) {
    return {
      success: false,
      error: "Unauthenticated",
    };
  }

  const { data: existingForm, error: existingError } = await supabase
    .from("request_forms")
    .select("id, user_id, sections, banner_asset_path")
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingError) {
    console.error("[updateFormAction] Failed to load form:", existingError);

    return {
      success: false,
      error: existingError.message || "Failed to load form",
    };
  }

  if (!existingForm) {
    return {
      success: false,
      error: "Form not found",
    };
  }

  if (existingForm.user_id !== userId) {
    return {
      success: false,
      error: "You don't have permission to update this form",
    };
  }

  const touchesDeactivationSettings =
    data.deactivatedMessage !== undefined ||
    data.deactivatedRedirectUrl !== undefined ||
    data.deactivatedRedirectLabel !== undefined ||
    data.deactivatedAccentColor !== undefined;

  if (touchesDeactivationSettings) {
    const parsedDeactivation = deactivationSettingsSchema.safeParse({
      message: data.deactivatedMessage ?? "",
      redirectUrl: data.deactivatedRedirectUrl ?? "",
      redirectLabel: data.deactivatedRedirectLabel ?? "",
      accentColor: data.deactivatedAccentColor ?? "#7c3aed",
    });

    if (!parsedDeactivation.success) {
      return {
        success: false,
        error: "Invalid deactivation settings",
      };
    }
  }

  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined)
    payload.description = data.description ?? "";
  if (data.bannerAssetPath !== undefined)
    payload.banner_asset_path = data.bannerAssetPath ?? null;
  if (data.bannerUrl !== undefined) {
    const normalizedBannerUrl = data.bannerUrl
      ? normalizeHttpUrl(data.bannerUrl)
      : null;

    if (data.bannerUrl && !normalizedBannerUrl) {
      return {
        success: false,
        error: "Invalid banner URL",
      };
    }

    payload.banner_url = normalizedBannerUrl;
  }
  let validatedSections: z.infer<typeof formSectionSchema>[] | undefined;

  if (data.sections !== undefined) {
    const parsedSections = z
      .array(formSectionSchema)
      .min(1)
      .max(MAX_FORM_SECTIONS)
      .safeParse(data.sections);

    if (!parsedSections.success) {
      return {
        success: false,
        error: "Invalid form structure",
      };
    }

    const structureError = validateFormStructure(parsedSections.data);

    if (structureError) {
      return {
        success: false,
        error: structureError,
      };
    }

    validatedSections = parsedSections.data;
    payload.sections = validatedSections;
  }
  if (data.appearance !== undefined)
    payload.appearance = resolveFormAppearance(data.appearance ?? null);
  if (data.shareableLink !== undefined)
    payload.shareable_link = ensureShareableLink(data.shareableLink as any);
  if (data.isActive !== undefined) payload.is_active = data.isActive;
  if (data.visibility !== undefined)
    payload.visibility = normalizeResourceVisibility(data.visibility);
  if (data.deactivatedMessage !== undefined)
    payload.deactivated_message = data.deactivatedMessage ?? "";
  if (data.deactivatedRedirectUrl !== undefined) {
    const normalizedRedirect = data.deactivatedRedirectUrl
      ? normalizeHttpUrl(data.deactivatedRedirectUrl)
      : "";

    if (data.deactivatedRedirectUrl && !normalizedRedirect) {
      return {
        success: false,
        error: "Invalid redirect URL",
      };
    }

    payload.deactivated_redirect_url = normalizedRedirect || "";
  }
  if (data.deactivatedRedirectLabel !== undefined)
    payload.deactivated_redirect_label = data.deactivatedRedirectLabel ?? "";
  if (data.deactivatedAccentColor !== undefined)
    payload.deactivated_accent_color = data.deactivatedAccentColor ?? "";

  const { data: updated, error } = await supabase
    .from("request_forms")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("*")
    .single();
  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to update form"),
    };
  }

  if (data.sections !== undefined) {
    const beforePaths = extractFormAssetPathsFromSections(
      existingForm.sections,
    );
    const afterPaths = extractFormAssetPathsFromSections(
      validatedSections ?? data.sections,
    );
    const removedPaths = beforePaths.filter((p) => !afterPaths.includes(p));
    await removeFormAssetsByPath(supabase, removedPaths);
  }

  if (data.bannerAssetPath !== undefined) {
    const beforeBannerPath = String(
      (existingForm as any).banner_asset_path || "",
    );
    const nextBannerPath = String(data.bannerAssetPath || "");
    if (
      beforeBannerPath &&
      beforeBannerPath.startsWith(`${userId}/`) &&
      beforeBannerPath !== nextBannerPath
    ) {
      await supabase.storage
        .from(FORM_BANNERS_BUCKET)
        .remove([beforeBannerPath]);
    }
  }

  return { success: true, form: updated };
}

export async function deleteFormAction(id: string) {
  const { supabase, userId } = await resolveUserIdForActions();
  if (!userId) return { success: false, error: "Unauthenticated" };

  // Verify ownership before deleting
  const { data: form, error: fetchError } = await supabase
    .from("request_forms")
    .select("user_id, sections, banner_asset_path, shareable_link")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchError || !form) {
    return { success: false, error: "Form not found" };
  }
  if (form.user_id !== userId) {
    return {
      success: false,
      error: "You don't have permission to delete this form",
    };
  }

  const assetPaths = extractFormAssetPathsFromSections((form as any).sections);
  if (assetPaths.length > 0) {
    await removeFormAssetsByPath(supabase, assetPaths);
  }

  const bannerPath = String((form as any).banner_asset_path || "").trim();
  if (bannerPath && bannerPath.startsWith(`${userId}/`)) {
    await supabase.storage.from(FORM_BANNERS_BUCKET).remove([bannerPath]);
  }

  const deletedSuffix = `-deleted-${Date.now()}`;
  const { error } = await supabase
    .from("request_forms")
    .update({
      deleted_at: new Date().toISOString(),
      banner_asset_path: null,
      banner_url: null,
      shareable_link: `${(form as any).shareable_link}${deletedSuffix}`,
    })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to delete form"),
    };
  }
  return { success: true };
}
