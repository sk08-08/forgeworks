"use server";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  MAX_MEDIA_IMAGE_BYTES,
  MAX_MEDIA_ITEMS_PER_USER,
  MEDIA_BUCKET,
  type MediaAsset,
} from "../types/media";
import { MEDIA_MIME_EXTENSIONS, hasMediaSignature } from "../lib/media-validation";

type Client = Awaited<ReturnType<typeof createClient>>;
type Registration = { hash: string; mimeType: string; name: string; byteSize: number };
type MediaRow = {
  id: string; storage_path: string; original_name: string;
  content_type: string; byte_size: number; created_at: string;
};
const FIELDS = "id, storage_path, original_name, content_type, byte_size, created_at";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Please sign in to use My Media.");
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("id, is_blocked").eq("id", user.id).maybeSingle();
  if (profileError || !profile || profile.is_blocked) {
    throw new Error("Media access is not available for this account.");
  }
  return { supabase, user };
}

function publicAsset(row: MediaRow, supabase: Client): MediaAsset {
  return {
    id: row.id,
    url: supabase.storage.from(MEDIA_BUCKET).getPublicUrl(row.storage_path).data.publicUrl,
    name: row.original_name,
    mimeType: row.content_type,
    size: row.byte_size,
    createdAt: row.created_at,
  };
}

function validInput(input: Omit<Registration,"name">) {
  return Boolean(
    input && typeof input.hash === "string" && /^[a-f0-9]{64}$/.test(input.hash) &&
    typeof input.mimeType === "string" && MEDIA_MIME_EXTENSIONS[input.mimeType] &&
    Number.isSafeInteger(input.byteSize) && input.byteSize >= 1 &&
    input.byteSize <= MAX_MEDIA_IMAGE_BYTES,
  );
}

export async function listMediaAssetsAction() {
  try {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase.from("media_assets")
      .select(FIELDS).eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(MAX_MEDIA_ITEMS_PER_USER);
    if (error) throw error;
    return { success: true as const, assets: (data || []).map(row => publicAsset(row, supabase)) };
  } catch (error) {
    return { success: false as const, assets: [] as MediaAsset[],
      error: error instanceof Error ? error.message : "Could not load media." };
  }
}

/** The server authorizes one path and issues an upload token, never a general INSERT policy. */
export async function prepareMediaUploadAction(input: Omit<Registration,"name">) {
  try {
    const { supabase, user } = await requireUser();
    if (!validInput(input)) return { success: false as const, error: "Invalid image metadata." };
    const { data: existing, error: lookupError } = await supabase.from("media_assets")
      .select(FIELDS).eq("user_id", user.id).eq("sha256", input.hash).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return { success: true as const, asset: publicAsset(existing, supabase), path: null, token: null };

    const admin = await createAdminClient();
    if (!admin) throw new Error("Server media upload is not configured.");
    // Atomic quota + short-lived reservation in SQL; this RPC is service-role only.
    const { error: reserveError } = await admin.rpc("reserve_media_upload", {
      p_user_id: user.id,
      p_sha256: input.hash,
      p_content_type: input.mimeType,
      p_byte_size: input.byteSize,
    });
    if (reserveError) throw new Error(reserveError.message || "Could not reserve upload.");
    const path = `${user.id}/${input.hash}.${MEDIA_MIME_EXTENSIONS[input.mimeType]}`;
    const { data: signed, error: signError } = await admin.storage
      .from(MEDIA_BUCKET).createSignedUploadUrl(path, { upsert: false });
    if (signError || !signed?.token) throw new Error(signError?.message || "Could not authorize upload.");
    return { success: true as const, asset: null, path, token: signed.token };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Could not prepare image upload." };
  }
}

/** Verifies actual stored bytes before registering: no client metadata is trusted. */
export async function registerMediaAssetAction(input: Registration) {
  try {
    const { supabase, user } = await requireUser();
    if (!validInput(input)) return { success: false as const, error: "Invalid image metadata." };
    const findExisting = () => supabase.from("media_assets").select(FIELDS)
      .eq("user_id", user.id).eq("sha256", input.hash).maybeSingle();
    const { data: existing, error: lookupError } = await findExisting();
    if (lookupError) throw lookupError;
    if (existing) return { success: true as const, asset: publicAsset(existing, supabase), reused: true };

    const admin = await createAdminClient();
    if (!admin) throw new Error("Server media registration is not configured.");
    const { data: reservation, error: reservationError } = await admin
      .from("media_upload_reservations")
      .select("id, byte_size, content_type, expires_at")
      .eq("user_id", user.id).eq("sha256", input.hash).maybeSingle();
    if (reservationError) throw reservationError;
    if (!reservation || reservation.byte_size !== input.byteSize ||
        reservation.content_type !== input.mimeType ||
        new Date(reservation.expires_at).getTime() <= Date.now()) {
      throw new Error("Upload authorization expired or does not match. Upload again.");
    }

    const path = `${user.id}/${input.hash}.${MEDIA_MIME_EXTENSIONS[input.mimeType]}`;
    const { data: downloaded, error: downloadError } = await admin.storage
      .from(MEDIA_BUCKET).download(path);
    if (downloadError || !downloaded) throw new Error("Uploaded image could not be verified. Please retry.");
    const bytes = new Uint8Array(await downloaded.arrayBuffer());
    if (bytes.length !== input.byteSize || bytes.length > MAX_MEDIA_IMAGE_BYTES ||
        !hasMediaSignature(bytes, input.mimeType) ||
        createHash("sha256").update(bytes).digest("hex") !== input.hash) {
      throw new Error("Stored image verification failed. Choose a valid image and try again.");
    }
    const name = (String(input.name || "").trim() ||
      `Image.${MEDIA_MIME_EXTENSIONS[input.mimeType]}`).slice(0, 255);
    const { data: inserted, error: insertError } = await admin.from("media_assets")
      .insert({ user_id: user.id, bucket: MEDIA_BUCKET, storage_path: path,
        sha256: input.hash, original_name: name, content_type: input.mimeType,
        byte_size: bytes.length }).select(FIELDS).single();
    if (insertError || !inserted) {
      const { data: race } = await findExisting();
      if (race) return { success: true as const, asset: publicAsset(race, supabase), reused: true };
      throw insertError || new Error("Could not register image.");
    }
    return { success: true as const, asset: publicAsset(inserted, supabase), reused: false };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Image registration failed." };
  }
}

/** Rename only the library label. The immutable object path and public URL never change. */
export async function renameMediaAssetAction(assetId: string, requestedName: string) {
  try {
    const { supabase, user } = await requireUser();
    if (typeof assetId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId)) {
      return { success: false as const, error: "Invalid image identifier." };
    }
    if (typeof requestedName !== "string") {
      return { success: false as const, error: "Enter a name." };
    }
    const name = requestedName.trim();
    if (!name || name.length > 255 || /[\u0000-\u001f\u007f]/.test(name)) {
      return { success: false as const, error: "Use a name between 1 and 255 characters without control characters." };
    }
    // Client grants intentionally do not include UPDATE; service role changes one allowlisted field.
    const admin = await createAdminClient();
    if (!admin) throw new Error("Server media management is not configured.");
    const { data, error } = await admin.from("media_assets")
      .update({ original_name: name })
      .eq("id", assetId).eq("user_id", user.id).eq("bucket", MEDIA_BUCKET)
      .select(FIELDS).maybeSingle();
    if (error) throw error;
    if (!data) return { success: false as const, error: "Image not found in your library." };
    return { success: true as const, asset: publicAsset(data, supabase) };
  } catch (error) {
    return { success: false as const,
      error: error instanceof Error ? error.message : "Could not rename image." };
  }
}


/** Read-only usage details. References are maintained by the SQL migration's triggers. */
export type MediaUsage = {
  kind: string;
  sourceId: string;
  label: string;
  historical: boolean;
  removed: boolean;
  href?: string;
};

export async function getMediaUsagesAction(assetId: string) {
  try {
    const { supabase, user } = await requireUser();
    if (typeof assetId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetId)) {
      return { success: false as const, error: "Invalid image.", usages: [] as MediaUsage[], hasOtherReferences: false };
    }
    // First establish asset ownership using the signed-in user's RLS-scoped client.
    const { data: asset, error: lookupError } = await supabase.from("media_assets")
      .select("id").eq("id", assetId).eq("user_id", user.id).eq("bucket", MEDIA_BUCKET).maybeSingle();
    if (lookupError) throw lookupError;
    if (!asset) return { success: false as const, error: "Image not found.", usages: [] as MediaUsage[], hasOtherReferences: false };

    const admin = await createAdminClient();
    if (!admin) throw new Error("Server media usage lookup is not configured.");
    // No direct client SELECT grant exists on this table. Other owners' content
    // is counted but titles, record IDs, and record kinds never leave the server.
    const refClient = admin as unknown as SupabaseClient;
    const { data, error } = await refClient.from("media_asset_references")
      .select("source_table, source_id, source_owner_id, source_label, source_deleted")
      .eq("media_id", assetId).limit(1001);
    if (error) throw error;
    const all = data || [];
    const truncated = all.length > 1000;
    const limited = all.slice(0, 1000);
    // A staff-created Resources article can have contributor_user_id = NULL.
    // Display it only after independently verifying that it is published.
    // Never reveal labels or IDs of draft resources, private submissions, or
    // other users' unpublished records from the service-role reference index.
    const platformResourceIds = limited
      .filter((row) => row.source_table === "hub_resource_entries" && row.source_owner_id === null)
      .map((row) => row.source_id);
    const publishedPlatformIds = new Set<string>();
    if (platformResourceIds.length > 0) {
      const { data: published, error: publishedError } = await refClient
        .from("hub_resource_entries")
        .select("id")
        .in("id", platformResourceIds)
        .eq("is_published", true);
      if (publishedError) throw publishedError;
      for (const entry of published || []) publishedPlatformIds.add(entry.id);
    }
    const canDisplay = (row: (typeof all)[number]) =>
      row.source_owner_id === user.id ||
      (row.source_table === "hub_resource_entries" &&
        publishedPlatformIds.has(row.source_id));
    const visible = limited.filter(canDisplay);
    // Resolve navigation IDs from authenticated, owned parent resources only.
    // A history row has a version ID, not a bot ID; a block has a section ID,
    // not a page ID. Never construct a link from an unrelated source ID.
    const versionIds = visible.filter((row) => row.source_table === "bot_versions" && row.source_owner_id === user.id).map((row) => row.source_id);
    const sectionIds = visible.filter((row) => row.source_table === "creator_page_sections" && row.source_owner_id === user.id).map((row) => row.source_id);
    const versionInfo = new Map<string, { botId: string; version: number }>();
    const sectionInfo = new Map<string, { pageId: string; title: string }>();
    const botNames = new Map<string, string>();
    const pageNames = new Map<string, string>();
    if (versionIds.length) {
      const { data: versions, error: versionError } = await refClient.from("bot_versions")
        .select("id, bot_id, version_number").in("id", versionIds);
      if (versionError) throw versionError;
      for (const row of versions || []) versionInfo.set(row.id, { botId: row.bot_id, version: row.version_number });
      const botIds = [...new Set([...versionInfo.values()].map((value) => value.botId))];
      if (botIds.length) {
        const { data: bots, error: botError } = await refClient.from("bots")
          .select("id, user_id, name").in("id", botIds).eq("user_id", user.id);
        if (botError) throw botError;
        for (const bot of bots || []) botNames.set(bot.id, bot.name || "Untitled Bot");
      }
    }
    if (sectionIds.length) {
      const { data: sections, error: sectionError } = await refClient.from("creator_page_sections")
        .select("id, page_id, title").in("id", sectionIds);
      if (sectionError) throw sectionError;
      for (const row of sections || []) sectionInfo.set(row.id, { pageId: row.page_id, title: row.title || "Untitled block" });
      const pageIds = [...new Set([...sectionInfo.values()].map((value) => value.pageId))];
      if (pageIds.length) {
        const { data: pages, error: pageError } = await refClient.from("creator_pages")
          .select("id, user_id, title").in("id", pageIds).eq("user_id", user.id);
        if (pageError) throw pageError;
        for (const page of pages || []) pageNames.set(page.id, page.title || "Untitled page");
      }
    }
    return {
      success: true as const,
      usages: visible.map((row): MediaUsage => {
        const version = row.source_table === "bot_versions" ? versionInfo.get(row.source_id) : undefined;
        const section = row.source_table === "creator_page_sections" ? sectionInfo.get(row.source_id) : undefined;
        const botName = version ? botNames.get(version.botId) : undefined;
        const pageName = section ? pageNames.get(section.pageId) : undefined;
        const historical = row.source_table === "bot_versions";
        return {
          kind: row.source_table,
          sourceId: row.source_id,
          label: botName && version ? `${botName} · Version #${version.version}`
            : pageName && section ? `${pageName} · ${section.title}`
            : row.source_label || "Untitled resource",
          historical,
          removed: row.source_deleted === true,
          href: !row.source_deleted && pageName && section
            ? `/creator-pages/${section.pageId}/builder`
            : !row.source_deleted && row.source_table === "creator_pages" && row.source_owner_id === user.id
              ? `/creator-pages/${row.source_id}/builder`
              : undefined,
        };
      }),
      hasOtherReferences: truncated || limited.some((row) => !canDisplay(row)),
      truncated,
    };
  } catch (error) {
    return { success: false as const,
      error: error instanceof Error ? error.message : "Could not load image usage.",
      usages: [] as MediaUsage[], hasOtherReferences: false };
  }
}
