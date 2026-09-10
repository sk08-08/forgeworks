"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  FORM_ASSETS_BUCKET,
  FORM_BANNERS_BUCKET,
  extractFormAssetPathsFromSections,
} from "@/features/forms/lib/form-assets";
import {
  BOT_ASSETS_BUCKET,
  PROFILE_ASSETS_BUCKET,
  extractStorageObjectPathFromPublicUrl,
} from "@/lib/storage-assets";

// ============================================================================
// Constants
// ============================================================================

const FEEDBACK_IMAGES_BUCKET = "feedback_images";

// ============================================================================
// Types
// ============================================================================

type AdminClient = NonNullable<Awaited<ReturnType<typeof createAdminClient>>>;

type StorageCleanupPlan = {
  profilePaths: string[];
  botPaths: string[];
  formAssetPaths: string[];
  formBannerPaths: string[];
  feedbackImagePaths: string[];
};

type FeedbackImageMetadata = {
  url?: string | null;
};

// ============================================================================
// Helpers
// ============================================================================

function extractFeedbackImageUrls(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") {
    return [];
  }

  const images = (metadata as { images?: unknown }).images;

  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => {
      if (!image || typeof image !== "object") {
        return null;
      }

      const url = (image as FeedbackImageMetadata).url;

      return typeof url === "string" && url.trim() ? url.trim() : null;
    })
    .filter((url): url is string => Boolean(url));
}

async function collectProfileStoragePaths(
  adminClient: AdminClient,
  userId: string,
  avatarUrl?: string | null,
  bannerUrl?: string | null,
): Promise<string[]> {
  const paths = new Set<string>();

  const avatarPath = extractStorageObjectPathFromPublicUrl(
    avatarUrl,
    PROFILE_ASSETS_BUCKET,
  );

  const bannerPath = extractStorageObjectPathFromPublicUrl(
    bannerUrl,
    PROFILE_ASSETS_BUCKET,
  );

  if (avatarPath) {
    paths.add(avatarPath);
  }

  if (bannerPath) {
    paths.add(bannerPath);
  }

  /*
   * Current profile uploads live under:
   *
   *   <user-id>/avatar-...
   *   <user-id>/banner-...
   *
   * Listing the folder also catches old/replaced files that are no longer
   * referenced by avatar_url or banner_url.
   */
  const { data: folderObjects, error: listError } = await adminClient.storage
    .from(PROFILE_ASSETS_BUCKET)
    .list(userId, {
      limit: 1000,
      offset: 0,
      sortBy: {
        column: "name",
        order: "asc",
      },
    });

  if (listError) {
    throw new Error(`Could not inspect profile assets: ${listError.message}`);
  }

  for (const object of folderObjects ?? []) {
    if (!object?.name) continue;

    // Ignore Storage folder placeholders.
    if (object.id === null) continue;

    paths.add(`${userId}/${object.name}`);
  }

  return [...paths];
}

function collectBotStoragePaths(
  imageUrls: Array<string | null | undefined>,
): string[] {
  const paths = new Set<string>();

  for (const imageUrl of imageUrls) {
    const path = extractStorageObjectPathFromPublicUrl(
      imageUrl,
      BOT_ASSETS_BUCKET,
    );

    if (path) {
      paths.add(path);
    }
  }

  return [...paths];
}

function collectFormStoragePaths(
  forms: Array<{
    sections: unknown;
    banner_asset_path: string | null;
  }>,
) {
  const assetPaths = new Set<string>();
  const bannerPaths = new Set<string>();

  for (const form of forms) {
    for (const path of extractFormAssetPathsFromSections(form.sections)) {
      assetPaths.add(path);
    }

    const bannerPath = String(form.banner_asset_path ?? "").trim();

    if (bannerPath) {
      bannerPaths.add(bannerPath);
    }
  }

  return {
    assetPaths: [...assetPaths],
    bannerPaths: [...bannerPaths],
  };
}

function collectFeedbackStoragePaths(metadataRows: unknown[]): string[] {
  const paths = new Set<string>();

  for (const metadata of metadataRows) {
    const urls = extractFeedbackImageUrls(metadata);

    for (const url of urls) {
      const path = extractStorageObjectPathFromPublicUrl(
        url,
        FEEDBACK_IMAGES_BUCKET,
      );

      if (path) {
        paths.add(path);
      }
    }
  }

  return [...paths];
}

async function removeStorageObjects(
  adminClient: AdminClient,
  bucket: string,
  paths: string[],
) {
  if (paths.length === 0) {
    return;
  }

  /*
   * remove() supports multiple paths, but keeping each call scoped to a
   * single bucket makes failures easier to understand and avoids mixing
   * unrelated account assets.
   */
  const { error } = await adminClient.storage.from(bucket).remove(paths);

  if (error) {
    throw new Error(`Could not remove files from ${bucket}: ${error.message}`);
  }
}

async function executeStorageCleanup(
  adminClient: AdminClient,
  plan: StorageCleanupPlan,
) {
  await removeStorageObjects(
    adminClient,
    PROFILE_ASSETS_BUCKET,
    plan.profilePaths,
  );

  await removeStorageObjects(adminClient, BOT_ASSETS_BUCKET, plan.botPaths);

  await removeStorageObjects(
    adminClient,
    FORM_ASSETS_BUCKET,
    plan.formAssetPaths,
  );

  await removeStorageObjects(
    adminClient,
    FORM_BANNERS_BUCKET,
    plan.formBannerPaths,
  );

  await removeStorageObjects(
    adminClient,
    FEEDBACK_IMAGES_BUCKET,
    plan.feedbackImagePaths,
  );
}

// ============================================================================
// Delete current account
// ============================================================================

export async function deleteCurrentAccount() {
  const supabase = await createClient();

  // --------------------------------------------------------------------------
  // Authenticate
  // --------------------------------------------------------------------------

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: "Unauthenticated",
    };
  }

  const userId = user.id;

  // --------------------------------------------------------------------------
  // Load everything needed to build the Storage cleanup plan BEFORE deleting
  // the database records.
  // --------------------------------------------------------------------------

  const [profileResult, botsResult, formsResult, feedbackResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("avatar_url, banner_url")
        .eq("id", userId)
        .maybeSingle(),

      supabase.from("bots").select("image_url").eq("user_id", userId),

      supabase
        .from("request_forms")
        .select("sections, banner_asset_path")
        .eq("user_id", userId),

      supabase
        .from("feedback_submissions")
        .select("metadata")
        .eq("submitter_user_id", userId),
    ]);

  if (profileResult.error) {
    return {
      success: false,
      error: profileResult.error.message,
    };
  }

  if (!profileResult.data) {
    return {
      success: false,
      error: "Profile not found",
    };
  }

  if (botsResult.error) {
    return {
      success: false,
      error: botsResult.error.message,
    };
  }

  if (formsResult.error) {
    return {
      success: false,
      error: formsResult.error.message,
    };
  }

  if (feedbackResult.error) {
    return {
      success: false,
      error: feedbackResult.error.message,
    };
  }

  // --------------------------------------------------------------------------
  // Service-role Storage client
  // --------------------------------------------------------------------------

  const adminClient = await createAdminClient();

  if (!adminClient) {
    return {
      success: false,
      error: "Server storage access is not configured",
    };
  }

  // --------------------------------------------------------------------------
  // Build cleanup plan
  // --------------------------------------------------------------------------

  let profilePaths: string[];

  try {
    profilePaths = await collectProfileStoragePaths(
      adminClient,
      userId,
      profileResult.data.avatar_url,
      profileResult.data.banner_url,
    );
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not inspect profile assets",
    };
  }

  const botPaths = collectBotStoragePaths(
    (botsResult.data ?? []).map((bot) => bot.image_url),
  );

  const formPaths = collectFormStoragePaths(formsResult.data ?? []);

  const feedbackImagePaths = collectFeedbackStoragePaths(
    (feedbackResult.data ?? []).map((row) => row.metadata),
  );

  const cleanupPlan: StorageCleanupPlan = {
    profilePaths,
    botPaths,
    formAssetPaths: formPaths.assetPaths,
    formBannerPaths: formPaths.bannerPaths,
    feedbackImagePaths,
  };

  // --------------------------------------------------------------------------
  // Delete database/Auth data first.
  //
  // This RPC handles the Forgeworks FK graph:
  // profiles, bots, forms, submissions, Atlas, Creator Pages,
  // collaboration, notifications, profile data, etc.
  // --------------------------------------------------------------------------

  const { error: deleteError } = await supabase.rpc("delete_user_account");

  if (deleteError) {
    return {
      success: false,
      error: deleteError.message,
    };
  }

  // --------------------------------------------------------------------------
  // Delete physical Storage objects using the Storage API.
  //
  // The paths were captured before deleting the database records, so they
  // remain available even though the account no longer exists.
  // --------------------------------------------------------------------------

  try {
    await executeStorageCleanup(adminClient, cleanupPlan);
  } catch (error) {
    /*
     * The account itself is already deleted at this point.
     *
     * Do NOT report this as a failed account deletion because retrying the
     * account RPC would be impossible. Log the orphan cleanup problem so it
     * can be investigated separately.
     */
    console.error("Account deleted, but some Storage cleanup failed:", error);

    return {
      success: true,
      storageCleanupWarning:
        error instanceof Error
          ? error.message
          : "Some account files could not be removed",
    };
  }

  return {
    success: true,
  };
}
