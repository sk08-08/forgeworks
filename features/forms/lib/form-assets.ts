// ============================================================================
// Forgeworks - Form Assets Helpers
// Shared helpers for section image assets used by request forms.
// ============================================================================

export const FORM_ASSETS_BUCKET = "form-assets";
export const FORM_BANNERS_BUCKET = "form-banners";

function normalizePathSegment(segment: string) {
  return encodeURIComponent(segment).replace(/%2F/g, "/");
}

export function getFormAssetPublicUrl(path?: string | null) {
  const safePath = String(path || "").trim();
  if (!safePath) return "";

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return "";

  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${FORM_ASSETS_BUCKET}/${normalizePathSegment(safePath)}`;
}

export function extractFormAssetPathsFromSections(sections: unknown): string[] {
  if (!Array.isArray(sections)) return [];

  const paths = new Set<string>();

  for (const section of sections as any[]) {
    const maybePath = String(section?.custom?.imageAssetPath || "").trim();
    if (maybePath) {
      paths.add(maybePath);
    }
  }

  return Array.from(paths);
}

export function getFormBannerPublicUrl(path?: string | null) {
  const safePath = String(path || "").trim();
  if (!safePath) return "";

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return "";

  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${FORM_BANNERS_BUCKET}/${normalizePathSegment(safePath)}`;
}
