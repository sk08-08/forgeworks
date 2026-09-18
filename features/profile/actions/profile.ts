"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";
import { friendlySupabaseError } from "@/lib/error-utils";
import {
  PROFILE_ASSETS_BUCKET,
  extractStorageObjectPathFromPublicUrl,
  getStoragePublicUrl,
} from "@/lib/storage-assets";
import { loadProfileBadges } from "@/features/profile/lib/profile-badges";
import { normalizeHttpUrl } from "@/lib/safe-url";
import {
  PROFILE_SOCIAL_KEYS,
  getProfileSocialHref,
  isProfileSocialLink,
} from "@/features/profile/lib/profile-socials";

const ALLOWED_PROFILE_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
];
const ALLOWED_PROFILE_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"];
const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function getSafeImageExtension(file: File) {
  const byName = String(file.name || "")
    .split(".")
    .pop()
    ?.toLowerCase()
    .trim();
  if (byName && ALLOWED_PROFILE_IMAGE_EXTENSIONS.includes(byName)) {
    return byName;
  }

  const byMime =
    String(file.type || "")
      .toLowerCase()
      .split("/")[1] || "";
  if (byMime && ALLOWED_PROFILE_IMAGE_EXTENSIONS.includes(byMime)) {
    return byMime;
  }

  return "jpg";
}

function withRawErrorDetails(err: unknown, fallback: string) {
  const friendly = friendlySupabaseError(err, fallback);
  const rawMessage =
    typeof err === "object" && err !== null && "message" in (err as any)
      ? String((err as any).message || "").trim()
      : "";

  if (!rawMessage) return friendly;
  if (friendly.toLowerCase().includes(rawMessage.toLowerCase())) {
    return friendly;
  }
  return `${friendly} (${rawMessage})`;
}

// ---------------------------------------------------------------------------
// Get own profile
// ---------------------------------------------------------------------------

export async function getOwnProfile() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated", profile: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
  *,
  profile_sections (
    section_key,
    enabled,
    sort_order,
    selection_mode,
    config
  ),
  profile_section_bots (
    bot_id,
    sort_order
  ),
  profile_section_forms (
    form_id,
    sort_order
  ),
  profile_section_creator_pages (
    creator_page_id,
    sort_order
  ),
  profile_section_worlds (
    world_id,
    sort_order
  ),
  active_profile_featured_bots (
    sort_order,
    bot:active_bots (*)
  )
`,
    )
    .eq("id", access.user.id)
    .single();

  if (error) {
    return { success: false, error: error.message, profile: null };
  }

  const profile = {
    ...data,
    profile_badges: await loadProfileBadges(supabase, access.user.id),
  };

  return { success: true, profile };
}

// ---------------------------------------------------------------------------
// Get public profile by slug
// ---------------------------------------------------------------------------

export async function getPublicProfile(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
  id, username, display_name, bio, tagline, avatar_url, banner_url, social_links, theme, slug, created_at, pronouns, location, website_url, specialties, status_message, visibility, profile_completeness,
  profile_sections (
    section_key,
    enabled,
    sort_order,
    selection_mode,
    config
  ),
  active_profile_featured_bots (
    sort_order,
    bot:active_bots (*)
  )
`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) {
    return { success: false, error: "Profile not found", profile: null };
  }

  const profile = {
    ...data,
    profile_badges: await loadProfileBadges(supabase, data.id),
  };

  return { success: true, profile };
}

// ---------------------------------------------------------------------------
// Update profile
// ---------------------------------------------------------------------------

interface UpdateProfileSectionsInput {
  featured_bots?: boolean;
  bots?: boolean;
  creator_pages?: boolean;
  worlds?: boolean;
  forms?: boolean;
}

type ProfileSectionSelectionMode = "all" | "selected";

interface UpdateProfileSectionSelectionInput {
  selectionMode: ProfileSectionSelectionMode;
  selectedIds?: string[];
}

interface UpdateProfileSectionSelectionsInput {
  bots?: UpdateProfileSectionSelectionInput;
  creator_pages?: UpdateProfileSectionSelectionInput;
  worlds?: UpdateProfileSectionSelectionInput;
  forms?: UpdateProfileSectionSelectionInput;
}

interface UpdateProfileInput {
  display_name?: string;
  bio?: string;
  tagline?: string;
  avatar_url?: string;
  banner_url?: string;
  social_links?: Record<string, string>;
  theme?: Record<string, unknown>;
  slug?: string;
  pronouns?: string;
  location?: string;
  website_url?: string;
  specialties?: string[];
  status_message?: string;
  visibility?: string;
  featuredBotIds?: string[];
  custom_css?: string;
  profileSections?: UpdateProfileSectionsInput;
  profileSectionSelections?: UpdateProfileSectionSelectionsInput;
}

function normalizeProfileSelectionIds(ids: string[] | undefined) {
  return Array.from(
    new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean)),
  );
}

export async function updateProfile(input: UpdateProfileInput) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }
  const userId = access.user.id;

  const requestedFeaturedBotIds = input.featuredBotIds;

  const requestedProfileSections = input.profileSections;

  const requestedProfileSectionSelections = input.profileSectionSelections;

  // Validate slug format if provided
  if (input.slug !== undefined) {
    const cleanSlug = input.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (!cleanSlug || cleanSlug.length < 2) {
      return {
        success: false,
        error: "Slug must be at least 2 characters (letters, numbers, hyphens)",
      };
    }

    // Check slug uniqueness
    const { data: existingSlug } = await supabase
      .from("profiles")
      .select("id")
      .eq("slug", cleanSlug)
      .neq("id", userId)
      .maybeSingle();

    if (existingSlug) {
      return { success: false, error: "This slug is already taken" };
    }
    input.slug = cleanSlug;
  }

  if (
    input.visibility !== undefined &&
    input.visibility !== "public" &&
    input.visibility !== "followers" &&
    input.visibility !== "private"
  ) {
    return {
      success: false,
      error: "Invalid profile visibility",
    };
  }

  const textLimits: Array<{
    value: string | undefined;
    max: number;
    label: string;
  }> = [
    {
      value: input.display_name,
      max: 64,
      label: "Display name",
    },
    {
      value: input.tagline,
      max: 120,
      label: "Tagline",
    },
    {
      value: input.bio,
      max: 2000,
      label: "Bio",
    },
    {
      value: input.location,
      max: 100,
      label: "Location",
    },
    {
      value: input.status_message,
      max: 128,
      label: "Status",
    },
  ];

  for (const field of textLimits) {
    if (field.value !== undefined && field.value.length > field.max) {
      return {
        success: false,
        error: `${field.label} cannot exceed ${field.max} characters`,
      };
    }
  }

  if (input.specialties !== undefined) {
    if (input.specialties.length > 10) {
      return {
        success: false,
        error: "You can add up to 10 specialties",
      };
    }

    const normalizedSpecialties = Array.from(
      new Set(
        input.specialties.map((specialty) => specialty.trim()).filter(Boolean),
      ),
    );

    if (normalizedSpecialties.some((specialty) => specialty.length > 30)) {
      return {
        success: false,
        error: "Specialties cannot exceed 30 characters",
      };
    }

    input.specialties = normalizedSpecialties;
  }

  if (input.website_url !== undefined) {
    const website = input.website_url.trim();

    if (website) {
      const normalizedWebsite = normalizeHttpUrl(website);

      if (!normalizedWebsite) {
        return {
          success: false,
          error: "Website must be a valid HTTP or HTTPS URL",
        };
      }

      input.website_url = normalizedWebsite;
    } else {
      input.website_url = "";
    }
  }

  if (input.social_links !== undefined) {
    const allowedSocialKeys = new Set<string>(PROFILE_SOCIAL_KEYS);

    const normalizedSocialLinks: Record<string, string> = {};

    for (const [key, rawValue] of Object.entries(input.social_links)) {
      if (!allowedSocialKeys.has(key)) {
        continue;
      }

      const value = String(rawValue || "").trim();

      if (!value) {
        normalizedSocialLinks[key] = "";
        continue;
      }

      if (value.length > 500) {
        return {
          success: false,
          error: "Social links cannot exceed 500 characters",
        };
      }

      // Discord may be either a username or an HTTP(S) link.
      if (key === "discord") {
        if (isProfileSocialLink(key, value)) {
          const discordUrl = getProfileSocialHref(key, value);

          if (!discordUrl) {
            return {
              success: false,
              error: "Invalid Discord link",
            };
          }

          normalizedSocialLinks[key] = discordUrl;
        } else {
          normalizedSocialLinks[key] = value;
        }

        continue;
      }

      const normalizedUrl = normalizeHttpUrl(value);

      if (!normalizedUrl) {
        return {
          success: false,
          error: `Invalid ${key} URL`,
        };
      }

      normalizedSocialLinks[key] = normalizedUrl;
    }

    input.social_links = normalizedSocialLinks;
  }

  const payload: Record<string, unknown> = {};
  if (input.display_name !== undefined)
    payload.display_name = input.display_name.trim();
  if (input.bio !== undefined) payload.bio = input.bio.trim();
  if (input.tagline !== undefined) payload.tagline = input.tagline.trim();
  if (input.avatar_url !== undefined) payload.avatar_url = input.avatar_url;
  if (input.banner_url !== undefined) payload.banner_url = input.banner_url;
  if (input.social_links !== undefined)
    payload.social_links = input.social_links;
  if (input.theme !== undefined) payload.theme = input.theme;
  if (input.slug !== undefined) payload.slug = input.slug;
  if (input.pronouns !== undefined) payload.pronouns = input.pronouns.trim();
  if (input.location !== undefined) payload.location = input.location.trim();
  if (input.website_url !== undefined)
    payload.website_url = input.website_url.trim();
  if (input.specialties !== undefined) payload.specialties = input.specialties;
  if (input.status_message !== undefined)
    payload.status_message = input.status_message.trim();
  if (input.visibility !== undefined) payload.visibility = input.visibility;
  if (input.custom_css !== undefined) payload.custom_css = input.custom_css;

  if (
    Object.keys(payload).length === 0 &&
    requestedFeaturedBotIds === undefined &&
    requestedProfileSections === undefined &&
    requestedProfileSectionSelections === undefined
  ) {
    return { success: false, error: "Nothing to update" };
  }

  if (requestedFeaturedBotIds !== undefined) {
    const normalizedFeaturedBotIds = Array.from(
      new Set((requestedFeaturedBotIds || []).filter(Boolean)),
    );

    const { error: clearError } = await supabase
      .from("profile_featured_bots")
      .delete()
      .eq("profile_id", userId);

    if (clearError) {
      return { success: false, error: clearError.message };
    }

    if (normalizedFeaturedBotIds.length > 0) {
      const { error: insertError } = await supabase
        .from("profile_featured_bots")
        .insert(
          normalizedFeaturedBotIds.map((botId, index) => ({
            profile_id: userId,
            bot_id: botId,
            sort_order: index,
          })),
        );

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }
  }

  if (requestedProfileSections !== undefined) {
    const sectionDefaults = {
      featured_bots: {
        sort_order: 10,
        selection_mode: "selected",
      },
      bots: {
        sort_order: 20,
        selection_mode: "all",
      },
      creator_pages: {
        sort_order: 30,
        selection_mode: "all",
      },
      worlds: {
        sort_order: 40,
        selection_mode: "all",
      },
      forms: {
        sort_order: 50,
        selection_mode: "all",
      },
    } as const;

    const requestedEntries = Object.entries(requestedProfileSections).filter(
      (entry): entry is [keyof typeof sectionDefaults, boolean] => {
        const [sectionKey, enabled] = entry;

        return sectionKey in sectionDefaults && typeof enabled === "boolean";
      },
    );

    if (requestedEntries.length > 0) {
      const requestedKeys = requestedEntries.map(([sectionKey]) => sectionKey);

      const { data: existingSections, error: existingSectionsError } =
        await supabase
          .from("profile_sections")
          .select("section_key, sort_order, selection_mode, config")
          .eq("profile_id", userId)
          .in("section_key", requestedKeys);

      if (existingSectionsError) {
        return {
          success: false,
          error: existingSectionsError.message,
        };
      }

      const existingByKey = new Map(
        (existingSections || []).map((section) => [
          section.section_key,
          section,
        ]),
      );

      const rows = requestedEntries.map(([sectionKey, enabled]) => {
        const existing = existingByKey.get(sectionKey);
        const defaults = sectionDefaults[sectionKey];

        return {
          profile_id: userId,
          section_key: sectionKey,
          enabled,
          sort_order: existing?.sort_order ?? defaults.sort_order,
          selection_mode: existing?.selection_mode ?? defaults.selection_mode,
          config: existing?.config ?? {},
        };
      });

      const { error: sectionsError } = await supabase
        .from("profile_sections")
        .upsert(rows, {
          onConflict: "profile_id,section_key",
        });

      if (sectionsError) {
        return {
          success: false,
          error: sectionsError.message,
        };
      }
    }
  }

  if (requestedProfileSectionSelections !== undefined) {
    const selectionSectionDefaults = {
      bots: 20,
      creator_pages: 30,
      worlds: 40,
      forms: 50,
    } as const;

    const requestedEntries = Object.entries(
      requestedProfileSectionSelections,
    ).filter(
      (
        entry,
      ): entry is [
        keyof typeof selectionSectionDefaults,
        UpdateProfileSectionSelectionInput,
      ] => {
        const [sectionKey, value] = entry;

        return (
          sectionKey in selectionSectionDefaults &&
          !!value &&
          (value.selectionMode === "all" || value.selectionMode === "selected")
        );
      },
    );

    if (requestedEntries.length > 0) {
      const requestedKeys = requestedEntries.map(([sectionKey]) => sectionKey);

      const { data: existingSections, error: existingSectionsError } =
        await supabase
          .from("profile_sections")
          .select("section_key, enabled, sort_order, selection_mode, config")
          .eq("profile_id", userId)
          .in("section_key", requestedKeys);

      if (existingSectionsError) {
        return {
          success: false,
          error: existingSectionsError.message,
        };
      }

      const existingByKey = new Map(
        (existingSections || []).map((section) => [
          section.section_key,
          section,
        ]),
      );

      const rows = requestedEntries.map(([sectionKey, selection]) => {
        const existing = existingByKey.get(sectionKey);

        return {
          profile_id: userId,
          section_key: sectionKey,
          enabled: existing?.enabled ?? true,
          sort_order:
            existing?.sort_order ?? selectionSectionDefaults[sectionKey],
          selection_mode: selection.selectionMode,
          config: existing?.config ?? {},
        };
      });

      const { error: selectionSectionsError } = await supabase
        .from("profile_sections")
        .upsert(rows, {
          onConflict: "profile_id,section_key",
        });

      if (selectionSectionsError) {
        return {
          success: false,
          error: selectionSectionsError.message,
        };
      }
    }
  }

  if (requestedProfileSectionSelections?.bots?.selectedIds !== undefined) {
    const selectedIds = normalizeProfileSelectionIds(
      requestedProfileSectionSelections.bots.selectedIds,
    );

    const { data: existingRows, error: existingRowsError } = await supabase
      .from("profile_section_bots")
      .select("bot_id")
      .eq("profile_id", userId);

    if (existingRowsError) {
      return {
        success: false,
        error: existingRowsError.message,
      };
    }

    if (selectedIds.length > 0) {
      const { error: upsertError } = await supabase
        .from("profile_section_bots")
        .upsert(
          selectedIds.map((botId, index) => ({
            profile_id: userId,
            bot_id: botId,
            sort_order: index,
          })),
          {
            onConflict: "profile_id,bot_id",
          },
        );

      if (upsertError) {
        return {
          success: false,
          error: upsertError.message,
        };
      }
    }

    const removedIds = (existingRows || [])
      .map((row) => row.bot_id)
      .filter((id) => !selectedIds.includes(id));

    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("profile_section_bots")
        .delete()
        .eq("profile_id", userId)
        .in("bot_id", removedIds);

      if (deleteError) {
        return {
          success: false,
          error: deleteError.message,
        };
      }
    }
  }

  if (requestedProfileSectionSelections?.forms?.selectedIds !== undefined) {
    const selectedIds = normalizeProfileSelectionIds(
      requestedProfileSectionSelections.forms.selectedIds,
    );

    const { data: existingRows, error: existingRowsError } = await supabase
      .from("profile_section_forms")
      .select("form_id")
      .eq("profile_id", userId);

    if (existingRowsError) {
      return {
        success: false,
        error: existingRowsError.message,
      };
    }

    if (selectedIds.length > 0) {
      const { error: upsertError } = await supabase
        .from("profile_section_forms")
        .upsert(
          selectedIds.map((formId, index) => ({
            profile_id: userId,
            form_id: formId,
            sort_order: index,
          })),
          {
            onConflict: "profile_id,form_id",
          },
        );

      if (upsertError) {
        return {
          success: false,
          error: upsertError.message,
        };
      }
    }

    const removedIds = (existingRows || [])
      .map((row) => row.form_id)
      .filter((id) => !selectedIds.includes(id));

    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("profile_section_forms")
        .delete()
        .eq("profile_id", userId)
        .in("form_id", removedIds);

      if (deleteError) {
        return {
          success: false,
          error: deleteError.message,
        };
      }
    }
  }

  if (
    requestedProfileSectionSelections?.creator_pages?.selectedIds !== undefined
  ) {
    const selectedIds = normalizeProfileSelectionIds(
      requestedProfileSectionSelections.creator_pages.selectedIds,
    );

    const { data: existingRows, error: existingRowsError } = await supabase
      .from("profile_section_creator_pages")
      .select("creator_page_id")
      .eq("profile_id", userId);

    if (existingRowsError) {
      return {
        success: false,
        error: existingRowsError.message,
      };
    }

    if (selectedIds.length > 0) {
      const { error: upsertError } = await supabase
        .from("profile_section_creator_pages")
        .upsert(
          selectedIds.map((creatorPageId, index) => ({
            profile_id: userId,
            creator_page_id: creatorPageId,
            sort_order: index,
          })),
          {
            onConflict: "profile_id,creator_page_id",
          },
        );

      if (upsertError) {
        return {
          success: false,
          error: upsertError.message,
        };
      }
    }

    const removedIds = (existingRows || [])
      .map((row) => row.creator_page_id)
      .filter((id) => !selectedIds.includes(id));

    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("profile_section_creator_pages")
        .delete()
        .eq("profile_id", userId)
        .in("creator_page_id", removedIds);

      if (deleteError) {
        return {
          success: false,
          error: deleteError.message,
        };
      }
    }
  }

  if (requestedProfileSectionSelections?.worlds?.selectedIds !== undefined) {
    const selectedIds = normalizeProfileSelectionIds(
      requestedProfileSectionSelections.worlds.selectedIds,
    );

    const { data: existingRows, error: existingRowsError } = await supabase
      .from("profile_section_worlds")
      .select("world_id")
      .eq("profile_id", userId);

    if (existingRowsError) {
      return {
        success: false,
        error: existingRowsError.message,
      };
    }

    if (selectedIds.length > 0) {
      const { error: upsertError } = await supabase
        .from("profile_section_worlds")
        .upsert(
          selectedIds.map((worldId, index) => ({
            profile_id: userId,
            world_id: worldId,
            sort_order: index,
          })),
          {
            onConflict: "profile_id,world_id",
          },
        );

      if (upsertError) {
        return {
          success: false,
          error: upsertError.message,
        };
      }
    }

    const removedIds = (existingRows || [])
      .map((row) => row.world_id)
      .filter((id) => !selectedIds.includes(id));

    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("profile_section_worlds")
        .delete()
        .eq("profile_id", userId)
        .in("world_id", removedIds);

      if (deleteError) {
        return {
          success: false,
          error: deleteError.message,
        };
      }
    }
  }

  if (Object.keys(payload).length > 0) {
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  // Retain existing profile objects after a successful update. Their public URLs
  // might be used elsewhere, including old exports and other modules. Physical
  // cleanup must be reference-aware and is intentionally not performed here.

  return { success: true };
}

export async function uploadProfileAssetAction(formData: FormData) {
  try {
    const kind = String(formData.get("kind") || "").trim();

    if (kind !== "avatar" && kind !== "banner") {
      return {
        success: false,
        error: "Invalid asset kind",
      };
    }

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return {
        success: false,
        error: "No image file provided",
      };
    }

    const fileType = String(file.type || "").toLowerCase();

    const fileExt = getSafeImageExtension(file);

    if (
      !fileType ||
      !ALLOWED_PROFILE_IMAGE_TYPES.includes(fileType) ||
      !ALLOWED_PROFILE_IMAGE_EXTENSIONS.includes(fileExt)
    ) {
      return {
        success: false,
        error: "Unsupported image type. Use PNG, JPG, WEBP or AVIF",
      };
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
      return {
        success: false,
        error: "Image is too large (max 5MB)",
      };
    }

    const supabase = await createClient();

    const access = await getCurrentUserAccess(supabase);

    if (!access.user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const targetPath = `${access.user.id}/${kind}-${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_ASSETS_BUCKET)
      .upload(targetPath, file, {
        upsert: false,
        contentType: fileType || undefined,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Failed to upload profile image:", uploadError);

      return {
        success: false,
        error: withRawErrorDetails(uploadError, "Failed to upload image"),
      };
    }

    const publicUrl = getStoragePublicUrl(PROFILE_ASSETS_BUCKET, targetPath);

    return {
      success: true,
      url: publicUrl,
      path: targetPath,
      kind,
    };
  } catch (error) {
    console.error("Unexpected profile asset upload error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while uploading image";

    return {
      success: false,
      error: message,
    };
  }
}

export async function removeTemporaryProfileAssetAction(path: string) {
  const supabase = await createClient();

  const access = await getCurrentUserAccess(supabase);

  if (!access.user) {
    return {
      success: false,
      error: "Not authenticated",
    };
  }

  const target = String(path || "").trim();

  if (!target) {
    return {
      success: true,
    };
  }

  if (!target.startsWith(`${access.user.id}/`)) {
    return {
      success: false,
      error: "Forbidden",
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("avatar_url, banner_url")
    .eq("id", access.user.id)
    .maybeSingle();

  const currentAvatarPath = extractStorageObjectPathFromPublicUrl(
    currentProfile?.avatar_url,
    PROFILE_ASSETS_BUCKET,
  );

  const currentBannerPath = extractStorageObjectPathFromPublicUrl(
    currentProfile?.banner_url,
    PROFILE_ASSETS_BUCKET,
  );

  if (target === currentAvatarPath || target === currentBannerPath) {
    return {
      success: false,
      error: "Cannot remove an asset currently used by the profile",
    };
  }

  const { error } = await supabase.storage
    .from(PROFILE_ASSETS_BUCKET)
    .remove([target]);

  if (error) {
    console.error("Failed to remove temporary profile asset:", error);

    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to remove image"),
    };
  }

  return {
    success: true,
  };
}

export async function removeProfileAssetAction(kind: "avatar" | "banner") {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) {
    return { success: false, error: "Not authenticated" };
  }

  const column = kind === "avatar" ? "avatar_url" : "banner_url";
  // Do not delete the underlying object here: its URL may have other
  // references. First clear the profile field, leave garbage collection to
  // the future reference-aware asset manager.
  const { error } = await supabase
    .from("profiles")
    .update({ [column]: null })
    .eq("id", access.user.id);

  if (error) {
    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to remove image"),
    };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Follow / Unfollow
// ---------------------------------------------------------------------------

export async function followUser(targetUserId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { success: false, error: "Not authenticated" };
  if (access.user.id === targetUserId)
    return { success: false, error: "Cannot follow yourself" };

  const { error } = await supabase
    .from("profile_follows")
    .insert({ follower_id: access.user.id, following_id: targetUserId });

  if (error) {
    if (error.code === "23505")
      return { success: false, error: "Already following" };
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function unfollowUser(targetUserId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("profile_follows")
    .delete()
    .eq("follower_id", access.user.id)
    .eq("following_id", targetUserId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getFollowCounts(userId: string) {
  const supabase = await createClient();

  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from("profile_follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("profile_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  return { followers: followers || 0, following: following || 0 };
}

export async function checkIsFollowing(targetUserId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { isFollowing: false };

  const { data } = await supabase
    .from("profile_follows")
    .select("follower_id")
    .eq("follower_id", access.user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  return { isFollowing: !!data };
}

// ---------------------------------------------------------------------------
// Get followers/following lists with profile info
// ---------------------------------------------------------------------------

export async function getFollowers(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_follows")
    .select(
      "follower_id, created_at, profiles!profile_follows_follower_id_fkey(id, display_name, username, avatar_url, slug, tagline)",
    )
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { users: [] as Array<Record<string, unknown>> };
  return {
    users: (data || []).map((r: any) => ({
      ...r.profiles,
      followed_at: r.created_at,
    })),
  };
}

export async function getFollowing(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_follows")
    .select(
      "following_id, created_at, profiles!profile_follows_following_id_fkey(id, display_name, username, avatar_url, slug, tagline)",
    )
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { users: [] as Array<Record<string, unknown>> };
  return {
    users: (data || []).map((r: any) => ({
      ...r.profiles,
      followed_at: r.created_at,
    })),
  };
}
