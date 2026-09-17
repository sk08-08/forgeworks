"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

import type { BioImportSource, BioProject } from "../types/bio-types";

/**
 * These are deliberately generous limits.
 *
 * Bio Studio works with imported/custom HTML, so we should not reject
 * reasonably complex bios just because they are larger than normal text.
 */
const MAX_TITLE_LENGTH = 160;
const MAX_HTML_BYTES = 1024 * 1024; // 1 MiB per HTML field
const MAX_METADATA_BYTES = 256 * 1024; // 256 KiB
const MAX_CHARACTER_ID_LENGTH = 512;
const MAX_CHARACTER_NAME_LENGTH = 256;

function utf8Length(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function metadataByteLength(value: Record<string, unknown>) {
  try {
    return utf8Length(JSON.stringify(value));
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

const sourceKindSchema = z.enum(["blank", "paste", "jai_bridge"]);

const nullableCharacterIdSchema = z
  .string()
  .max(MAX_CHARACTER_ID_LENGTH)
  .nullable()
  .optional();

const nullableCharacterNameSchema = z
  .string()
  .max(MAX_CHARACTER_NAME_LENGTH)
  .nullable()
  .optional();

const metadataSchema = z
  .record(z.unknown())
  .refine(
    (value) => metadataByteLength(value) <= MAX_METADATA_BYTES,
    "Bio project metadata is too large",
  );

const optionalMetadataSchema = metadataSchema.optional();

const titleSchema = z
  .string()
  .max(
    MAX_TITLE_LENGTH,
    `Title must be ${MAX_TITLE_LENGTH} characters or less`,
  );

const htmlSchema = z
  .string()
  .refine(
    (value) => utf8Length(value) <= MAX_HTML_BYTES,
    "Bio HTML is too large",
  );

const createBioProjectSchema = z.object({
  title: titleSchema.optional(),
  sourceHtml: htmlSchema.optional(),
  originalHtml: htmlSchema.optional(),
  sourceKind: sourceKindSchema.optional(),
  jaiCharacterId: nullableCharacterIdSchema,
  jaiCharacterName: nullableCharacterNameSchema,
  sourceMetadata: optionalMetadataSchema,
});

const updateBioProjectSchema = z.object({
  expectedRevision: z
    .number()
    .int()
    .min(1, "Invalid project revision")
    .max(Number.MAX_SAFE_INTEGER),

  title: titleSchema,
  sourceHtml: htmlSchema,
  originalHtml: htmlSchema.optional(),
  sourceKind: sourceKindSchema.optional(),
  jaiCharacterId: nullableCharacterIdSchema,
  jaiCharacterName: nullableCharacterNameSchema,
  sourceMetadata: optionalMetadataSchema,
});

function validationMessage(error: z.ZodError) {
  return error.issues[0]?.message || "Bio Studio received invalid project data";
}

async function resolveUserId() {
  const supabase = await createClient();

  // A legacy Forgeworks cookie is NOT evidence of an active Supabase session.
  // getUser() verifies the user against Supabase Auth; an expired or invalid
  // session must not be replaced with a userId from a second cookie.
  try {
    const { data, error } = await supabase.auth.getUser();

    return {
      supabase,
      userId: error ? null : (data.user?.id ?? null),
    };
  } catch {
    return {
      supabase,
      userId: null,
    };
  }
}

function mapProject(row: any): BioProject {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || "Untitled Bio",
    originalHtml: row.original_html || "",
    sourceHtml: row.source_html || "",
    sourceKind: (row.source_kind || "blank") as BioImportSource,
    jaiCharacterId: row.jai_character_id || null,
    jaiCharacterName: row.jai_character_name || null,
    botId: row.bot_id || null,

    sourceMetadata:
      row.source_metadata &&
      typeof row.source_metadata === "object" &&
      !Array.isArray(row.source_metadata)
        ? row.source_metadata
        : {},

    revision:
      typeof row.revision === "number" && Number.isFinite(row.revision)
        ? row.revision
        : 1,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listBioProjectsAction() {
  const { supabase, userId } = await resolveUserId();

  if (!userId) {
    return {
      success: false as const,
      error: "Unauthenticated",
      projects: [],
    };
  }

  const { data, error } = await supabase
    .from("bio_projects")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      success: false as const,
      error: error.message,
      projects: [],
    };
  }

  return {
    success: true as const,
    projects: (data || []).map(mapProject),
  };
}

export async function getBioProjectAction(projectId: string) {
  const { supabase, userId } = await resolveUserId();

  if (!userId) {
    return {
      success: false as const,
      error: "Unauthenticated",
      project: null,
    };
  }

  const { data, error } = await supabase
    .from("bio_projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return {
      success: false as const,
      error: error.message,
      project: null,
    };
  }

  if (!data) {
    return {
      success: false as const,
      error: "Bio project not found",
      project: null,
    };
  }

  return {
    success: true as const,
    project: mapProject(data),
  };
}

export async function createBioProjectAction(input: {
  title?: string;
  sourceHtml?: string;
  originalHtml?: string;
  sourceKind?: BioImportSource;
  jaiCharacterId?: string | null;
  jaiCharacterName?: string | null;
  sourceMetadata?: Record<string, unknown>;
}) {
  const parsed = createBioProjectSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      reason: "validation" as const,
      error: validationMessage(parsed.error),
      project: null,
    };
  }

  const { supabase, userId } = await resolveUserId();

  if (!userId) {
    return {
      success: false as const,
      reason: "error" as const,
      error: "Unauthenticated",
      project: null,
    };
  }

  const values = parsed.data;

  const title =
    values.title?.trim() || values.jaiCharacterName?.trim() || "Untitled Bio";

  const sourceHtml = values.sourceHtml || "";
  const originalHtml =
    values.originalHtml !== undefined ? values.originalHtml : sourceHtml;

  const { data, error } = await supabase
    .from("bio_projects")
    .insert({
      user_id: userId,
      title,
      source_html: sourceHtml,
      original_html: originalHtml,
      source_kind: values.sourceKind || "blank",
      jai_character_id: values.jaiCharacterId || null,
      jai_character_name: values.jaiCharacterName || null,
      source_metadata: values.sourceMetadata || {},
    })
    .select("*")
    .single();

  if (error) {
    return {
      success: false as const,
      reason: "error" as const,
      error: error.message,
      project: null,
    };
  }

  revalidatePath("/bio-studio");

  return {
    success: true as const,
    project: mapProject(data),
  };
}

export async function updateBioProjectAction(
  projectId: string,
  input: {
    expectedRevision: number;
    title: string;
    sourceHtml: string;
    originalHtml?: string;
    sourceKind?: BioImportSource;
    jaiCharacterId?: string | null;
    jaiCharacterName?: string | null;
    sourceMetadata?: Record<string, unknown>;
  },
) {
  const parsed = updateBioProjectSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      reason: "validation" as const,
      error: validationMessage(parsed.error),
      project: null,
    };
  }

  const { supabase, userId } = await resolveUserId();

  if (!userId) {
    return {
      success: false as const,
      reason: "error" as const,
      error: "Unauthenticated",
      project: null,
    };
  }

  const values = parsed.data;

  /**
   * Optimistic concurrency:
   *
   * The UPDATE only succeeds if the project's current revision still equals
   * the revision the client originally loaded.
   *
   * Two tabs saving revision 4 cannot both win:
   * - first one updates revision 4 -> 5
   * - second one's WHERE revision = 4 no longer matches
   */
  const { data, error } = await supabase
    .from("bio_projects")
    .update({
      title: values.title.trim() || "Untitled Bio",
      source_html: values.sourceHtml,

      ...(values.originalHtml !== undefined
        ? { original_html: values.originalHtml }
        : {}),

      ...(values.sourceKind !== undefined
        ? { source_kind: values.sourceKind }
        : {}),

      jai_character_id: values.jaiCharacterId ?? null,
      jai_character_name: values.jaiCharacterName ?? null,
      source_metadata: values.sourceMetadata || {},

      revision: values.expectedRevision + 1,

      // Do not manually set updated_at here.
      // bio_projects already has touch_bio_projects_updated_at.
    })
    .eq("id", projectId)
    .eq("user_id", userId)
    .eq("revision", values.expectedRevision)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();

  if (error) {
    return {
      success: false as const,
      reason: "error" as const,
      error: error.message,
      project: null,
    };
  }

  if (!data) {
    /**
     * No matching row can mean:
     *
     * 1. the project was deleted / does not belong to this user
     * 2. another save already incremented the revision
     *
     * Read the current project to distinguish the two.
     */
    const { data: currentData, error: currentError } = await supabase
      .from("bio_projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (currentError) {
      return {
        success: false as const,
        reason: "error" as const,
        error: currentError.message,
        project: null,
      };
    }

    if (!currentData) {
      return {
        success: false as const,
        reason: "not_found" as const,
        error: "Bio project not found",
        project: null,
      };
    }

    return {
      success: false as const,
      reason: "conflict" as const,
      error: "This bio was changed somewhere else after you opened it.",
      project: mapProject(currentData),
    };
  }

  revalidatePath("/bio-studio");
  revalidatePath(`/bio-studio/${projectId}`);

  return {
    success: true as const,
    project: mapProject(data),
  };
}

export async function deleteBioProjectAction(projectId: string) {
  const { supabase, userId } = await resolveUserId();

  if (!userId) {
    return {
      success: false as const,
      error: "Unauthenticated",
    };
  }

  const { error } = await supabase
    .from("bio_projects")
    .update({
      deleted_at: new Date().toISOString(),

      // updated_at is handled by the existing database trigger.
    })
    .eq("id", projectId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) {
    return {
      success: false as const,
      error: error.message,
    };
  }

  revalidatePath("/bio-studio");

  return {
    success: true as const,
  };
}
