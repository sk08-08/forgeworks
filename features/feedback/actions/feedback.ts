"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { friendlySupabaseError } from "@/lib/error-utils";
import { checkDistributedRateLimit, getClientIp } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { z } from "zod";

const FEEDBACK_IMAGES_BUCKET = "feedback_images";
const MAX_FEEDBACK_IMAGES = 3;
const MAX_FEEDBACK_IMAGE_SIZE = 2 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

const feedbackSchema = z.object({
  feedbackType: z.enum(["suggestion", "bug"]),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(4000),
  contact: z.string().trim().max(160).optional().or(z.literal("")),
  sourcePage: z.string().trim().max(120).optional().default(""),
  sourceLabel: z.string().trim().max(160).optional().default(""),
  sourcePath: z.string().trim().max(240).optional().default(""),
  relatedId: z.string().trim().max(120).optional().or(z.literal("")),
  metadata: z.record(z.unknown()).optional(),
});

type FeedbackImageRecord = {
  name: string;
  size: number;
  url: string;
};

function readOptionalString(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function readMetadata(formData: FormData): Record<string, unknown> {
  const raw = readOptionalString(formData, "metadata");

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Invalid metadata is ignored rather than allowing it
    // to break an otherwise valid feedback submission.
  }

  return {};
}

function getFeedbackImages(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File)
    .filter((file) => file.size > 0);
}

async function removeUploadedFeedbackImages(paths: string[]) {
  if (paths.length === 0) {
    return;
  }

  const adminClient = await createAdminClient();

  if (!adminClient) {
    console.error(
      "Could not clean uploaded feedback images: admin client unavailable",
    );
    return;
  }

  const { error } = await adminClient.storage
    .from(FEEDBACK_IMAGES_BUCKET)
    .remove(paths);

  if (error) {
    console.error("Could not clean uploaded feedback images:", error);
  }
}

export async function submitFeedbackAction(formData: FormData) {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);

  const rateCheck = await checkDistributedRateLimit(`feedback:${clientIp}`, {
    maxRequests: 5,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return {
      success: false,
      error:
        "You've sent too many messages. Please wait a moment and try again.",
    };
  }

  const metadata = readMetadata(formData);

  if (Buffer.byteLength(JSON.stringify(metadata), "utf8") > 32 * 1024) {
    return {
      success: false,
      error: "Feedback metadata is too large.",
    };
  }

  const parsed = feedbackSchema.safeParse({
    feedbackType: readOptionalString(formData, "feedbackType"),
    subject: readOptionalString(formData, "subject"),
    message: readOptionalString(formData, "message"),
    contact: readOptionalString(formData, "contact"),
    sourcePage: readOptionalString(formData, "sourcePage"),
    sourceLabel: readOptionalString(formData, "sourceLabel"),
    sourcePath: readOptionalString(formData, "sourcePath"),
    relatedId: readOptionalString(formData, "relatedId"),
    metadata,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please complete the feedback form before submitting it.",
    };
  }

  const images = getFeedbackImages(formData);

  if (images.length > MAX_FEEDBACK_IMAGES) {
    return {
      success: false,
      error: `You can attach up to ${MAX_FEEDBACK_IMAGES} images.`,
    };
  }

  for (const image of images) {
    if (image.size > MAX_FEEDBACK_IMAGE_SIZE) {
      return {
        success: false,
        error: `${image.name} is too large. Maximum size is 2MB.`,
      };
    }

    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return {
        success: false,
        error: `${image.name} is not a supported image type.`,
      };
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? null;

  const uploadedImages: FeedbackImageRecord[] = [];
  const uploadedPaths: string[] = [];

  if (images.length > 0) {
    const adminClient = await createAdminClient();

    if (!adminClient) {
      return {
        success: false,
        error:
          "Image uploads are temporarily unavailable. Please try again later.",
      };
    }

    /*
     * Authenticated feedback:
     * feedback/<user-id>/<file>
     *
     * Anonymous feedback:
     * feedback/anonymous/<submission-group>/<file>
     */
    const storageOwnerPath = userId
      ? userId
      : `anonymous/${crypto.randomUUID()}`;

    for (const image of images) {
      const extension = ALLOWED_IMAGE_TYPES.get(image.type);

      if (!extension) {
        await removeUploadedFeedbackImages(uploadedPaths);

        return {
          success: false,
          error: `${image.name} is not a supported image type.`,
        };
      }

      const fileName = `${crypto.randomUUID()}.${extension}`;
      const filePath = `feedback/${storageOwnerPath}/${fileName}`;

      const bytes = await image.arrayBuffer();

      const { error: uploadError } = await adminClient.storage
        .from(FEEDBACK_IMAGES_BUCKET)
        .upload(filePath, bytes, {
          contentType: image.type,
          upsert: false,
        });

      if (uploadError) {
        await removeUploadedFeedbackImages(uploadedPaths);

        return {
          success: false,
          error: `Failed to upload image: ${image.name}`,
        };
      }

      uploadedPaths.push(filePath);

      const {
        data: { publicUrl },
      } = adminClient.storage
        .from(FEEDBACK_IMAGES_BUCKET)
        .getPublicUrl(filePath);

      uploadedImages.push({
        name: image.name,
        size: image.size,
        url: publicUrl,
      });
    }
  }

  const payload = {
    feedback_type: parsed.data.feedbackType,
    subject: parsed.data.subject,
    message: parsed.data.message,
    contact: parsed.data.contact?.trim() || null,
    source_page: parsed.data.sourcePage || "",
    source_label: parsed.data.sourceLabel || "",
    source_path: parsed.data.sourcePath || "",
    related_id: parsed.data.relatedId?.trim() || null,

    metadata: {
      ...(parsed.data.metadata ?? {}),
      images: uploadedImages,
      clientIp,
      submittedAt: new Date().toISOString(),
    },

    submitter_user_id: userId,
  };

  const { error } = await supabase.from("feedback_submissions").insert(payload);

  if (error) {
    /*
     * Do not leave orphaned uploads when the DB insert fails.
     */
    await removeUploadedFeedbackImages(uploadedPaths);

    return {
      success: false,
      error: friendlySupabaseError(error, "Failed to send feedback"),
    };
  }

  return {
    success: true,
  };
}
