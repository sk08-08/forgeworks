import {
  removeMarkdownAssetsAction,
  uploadMarkdownAssetAction,
} from "@/features/markdown/actions/markdown-assets";
import type { MarkdownImageContext } from "@/features/markdown/config/markdown-assets-config";

export type { MarkdownImageContext } from "@/features/markdown/config/markdown-assets-config";

// ============================================================================
// Types
// ============================================================================

export interface MarkdownPendingImage {
  id: string;
  file: File;
  previewUrl: string;
  alt: string;
}

export interface MarkdownImageUploadContext {
  context: MarkdownImageContext;

  /**
   * Existing resource ID is ideal.
   *
   * For a not-yet-created resource,
   * this may also be a stable draft ID.
   */
  resourceKey: string;
}

interface UploadedMarkdownImage {
  id: string;
  path: string;
  publicUrl: string;
}

export interface MarkdownImageCommitResult {
  success: boolean;
  finalMarkdown?: string;
  error?: string;
  cleanupWarning?: string;
}

// ============================================================================
// Constants
// ============================================================================

export const MARKDOWN_PENDING_IMAGE_PREFIX = "jf-pending-image://";

const MARKDOWN_ASSETS_BUCKET = "markdown-assets";

// ============================================================================
// Pending placeholders
// ============================================================================

export function getPendingImagePlaceholder(assetId: string) {
  return `${MARKDOWN_PENDING_IMAGE_PREFIX}${assetId}`;
}

export function getPendingImageId(src: string): string | null {
  if (!src.startsWith(MARKDOWN_PENDING_IMAGE_PREFIX)) {
    return null;
  }

  const id = src.slice(MARKDOWN_PENDING_IMAGE_PREFIX.length);

  return id || null;
}

export function replacePreviewUrlsWithPlaceholders(
  markdown: string,
  pendingImages: MarkdownPendingImage[],
) {
  let result = markdown || "";

  for (const asset of pendingImages) {
    if (!asset.previewUrl) {
      continue;
    }

    result = result
      .split(asset.previewUrl)
      .join(getPendingImagePlaceholder(asset.id));
  }

  return result;
}

export function getReferencedPendingImageIds(markdown: string) {
  const ids = new Set<string>();

  const regex = /jf-pending-image:\/\/([a-zA-Z0-9_-]+)/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown))) {
    if (match[1]) {
      ids.add(match[1]);
    }
  }

  return ids;
}

// ============================================================================
// Markdown image extraction
// ============================================================================

export function extractMarkdownImageUrls(markdown: string) {
  const urls = new Set<string>();

  /*
   * Handles the normal syntax we generate:
   *
   * ![alt](https://...)
   * ![alt](https://... "title")
   */
  const regex = /!\[[^\]]*]\(\s*([^\s)]+)(?:\s+["'][^"']*["'])?\s*\)/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown || ""))) {
    if (match[1]) {
      urls.add(match[1]);
    }
  }

  return Array.from(urls);
}

// ============================================================================
// Supabase managed-path detection
// ============================================================================

export function extractManagedMarkdownAssetPath(
  urlValue: string,
): string | null {
  const value = String(urlValue || "").trim();

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    const marker = `/storage/v1/object/public/${MARKDOWN_ASSETS_BUCKET}/`;

    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const encodedPath = url.pathname.slice(markerIndex + marker.length);

    if (!encodedPath) {
      return null;
    }

    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}

export function extractManagedMarkdownAssetPaths(markdown: string) {
  return Array.from(
    new Set(
      extractMarkdownImageUrls(markdown)
        .map(extractManagedMarkdownAssetPath)
        .filter((path): path is string => Boolean(path)),
    ),
  );
}

// ============================================================================
// Commit transaction
// ============================================================================

export async function commitMarkdownImages({
  draftMarkdown,
  pendingImages,
  uploadContext,
  save,
}: {
  draftMarkdown: string;
  previousMarkdown: string;
  pendingImages: MarkdownPendingImage[];

  uploadContext: MarkdownImageUploadContext;

  /**
   * This callback must perform the REAL database save.
   *
   * The images are only considered committed if
   * this returns success: true.
   */
  save: (finalMarkdown: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
}): Promise<MarkdownImageCommitResult> {
  const referencedIds = getReferencedPendingImageIds(draftMarkdown);

  const referencedPending = pendingImages.filter((asset) =>
    referencedIds.has(asset.id),
  );

  const uploaded: UploadedMarkdownImage[] = [];

  let finalMarkdown = draftMarkdown;

  // ------------------------------------------------------------------------
  // 1. Upload ONLY pending images that still exist in Markdown
  // ------------------------------------------------------------------------

  try {
    for (const asset of referencedPending) {
      const formData = new FormData();

      formData.append("file", asset.file);

      formData.append("context", uploadContext.context);

      formData.append("resourceKey", uploadContext.resourceKey);

      formData.append("assetId", asset.id);

      const result = await uploadMarkdownAssetAction(formData);

      if (!result.success || !result.path || !result.publicUrl) {
        /*
         * Roll back everything uploaded
         * earlier in this same attempt.
         */
        if (uploaded.length > 0) {
          await removeMarkdownAssetsAction(uploaded.map((item) => item.path));
        }

        return {
          success: false,
          error: `Image upload failed: ${
            result.error || "Failed to upload Markdown image"
          }`,
        };
      }

      uploaded.push({
        id: asset.id,
        path: result.path,
        publicUrl: result.publicUrl,
      });

      finalMarkdown = finalMarkdown
        .split(getPendingImagePlaceholder(asset.id))
        .join(result.publicUrl);
    }

    // ----------------------------------------------------------------------
    // 2. Real DB save
    // ----------------------------------------------------------------------

    const saveResult = await save(finalMarkdown);

    if (!saveResult.success) {
      /*
       * DB failed.
       *
       * New uploads are NOT valid because
       * the stored Markdown still points to
       * the old state.
       */
      if (uploaded.length > 0) {
        await removeMarkdownAssetsAction(uploaded.map((item) => item.path));
      }

      return {
        success: false,
        error: `Entry save failed: ${
          saveResult.error || "Failed to save Markdown"
        }`,
      };
    }

    // Previously saved image URLs may now be reused in other Forgeworks
    // resources. Do not delete old images just because they disappeared from
    // this one Markdown document. Only pending uploads created in a failed
    // transaction are rolled back above.
    const cleanupWarning: string | undefined = undefined;

    return {
      success: true,
      finalMarkdown,
      cleanupWarning,
    };
  } catch (error) {
    /*
     * Unexpected failure before commit.
     *
     * Try to remove anything uploaded by
     * this attempt.
     */
    if (uploaded.length > 0) {
      try {
        await removeMarkdownAssetsAction(uploaded.map((item) => item.path));
      } catch {
        // Nothing more we can safely do here.
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unexpected Markdown image save error",
    };
  }
}
