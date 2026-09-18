export const MEDIA_BUCKET = "media-library";
export const MAX_MEDIA_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_MEDIA_ITEMS_PER_USER = 100;
export const MEDIA_ACCEPT = "image/png,image/jpeg,image/webp,image/avif";

export type MediaAsset = {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

// Existing URL-only consumers remain compatible; mediaId is optional metadata.
export type MediaSelection = {
  mediaId: string | null;
  url: string;
  name: string;
};
