import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/access";

import { buildCurrentUserBotsExport } from "@/features/settings/lib/build-bots-export";
import { buildCurrentUserFormsExport } from "@/features/settings/lib/build-forms-export";
import { buildCurrentUserCreatorPagesExport } from "@/features/settings/lib/build-creator-pages-export";
import { buildCurrentUserAtlasExport } from "@/features/settings/lib/build-atlas-export";

import {
  asExportRecords,
  fetchAllPages,
} from "@/features/settings/lib/export-utils";

import {
  ACCOUNT_EXPORT_FORMAT,
  ACCOUNT_EXPORT_VERSION,
  type ExportRecord,
  type JanitorForgeAccountExportV1,
} from "@/features/settings/lib/export-types";

export async function buildCurrentUserAccountExport(): Promise<
  | {
      success: true;
      username: string;
      data: JanitorForgeAccountExportV1;
    }
  | {
      success: false;
      error: string;
    }
> {
  try {
    const supabase = await createClient();
    const access = await getCurrentUserAccess(supabase);

    if (!access.user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const userId = access.user.id;

    // -----------------------------------------------------------------------
    // Account / profile
    // -----------------------------------------------------------------------

    const [
      profileResult,
      preferencesResult,
      badgeAwardsResult,
      profileSectionsResult,
      featuredBotsResult,
      sectionBotsResult,
      sectionFormsResult,
      sectionCreatorPagesResult,
      sectionWorldsResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          `
          id,
          username,
          display_name,
          pronouns,
          tagline,
          bio,
          avatar_url,
          banner_url,
          location,
          website_url,
          status_message,
          specialties,
          social_links,
          visibility,
          theme,
          custom_css,
          slug,
          created_at,
          updated_at
        `,
        )
        .eq("id", userId)
        .maybeSingle(),

      supabase
        .from("notification_preferences")
        .select(
          `
          social,
          collaborations,
          moderation,
          created_at,
          updated_at
        `,
        )
        .eq("user_id", userId)
        .maybeSingle(),

      supabase
        .from("profile_badge_awards")
        .select(
          `
          id,
          badge_slug,
          awarded_at,
          metadata,
          created_at,
          updated_at
        `,
        )
        .eq("profile_id", userId)
        .order("awarded_at", { ascending: true }),

      supabase
        .from("profile_sections")
        .select(
          `
          profile_id,
          section_key,
          enabled,
          sort_order,
          selection_mode,
          config,
          created_at,
          updated_at
        `,
        )
        .eq("profile_id", userId)
        .order("sort_order", { ascending: true }),

      supabase
        .from("profile_featured_bots")
        .select(
          `
          profile_id,
          bot_id,
          sort_order,
          created_at
        `,
        )
        .eq("profile_id", userId)
        .order("sort_order", { ascending: true }),

      supabase
        .from("profile_section_bots")
        .select(
          `
          profile_id,
          bot_id,
          sort_order,
          created_at
        `,
        )
        .eq("profile_id", userId)
        .order("sort_order", { ascending: true }),

      supabase
        .from("profile_section_forms")
        .select(
          `
          profile_id,
          form_id,
          sort_order,
          created_at
        `,
        )
        .eq("profile_id", userId)
        .order("sort_order", { ascending: true }),

      supabase
        .from("profile_section_creator_pages")
        .select(
          `
          profile_id,
          creator_page_id,
          sort_order,
          created_at
        `,
        )
        .eq("profile_id", userId)
        .order("sort_order", { ascending: true }),

      supabase
        .from("profile_section_worlds")
        .select(
          `
          profile_id,
          world_id,
          sort_order,
          created_at
        `,
        )
        .eq("profile_id", userId)
        .order("sort_order", { ascending: true }),
    ]);

    const initialResults = [
      ["profile", profileResult.error],
      ["notification preferences", preferencesResult.error],
      ["badge awards", badgeAwardsResult.error],
      ["profile sections", profileSectionsResult.error],
      ["featured bots", featuredBotsResult.error],
      ["profile bot selections", sectionBotsResult.error],
      ["profile form selections", sectionFormsResult.error],
      ["profile creator page selections", sectionCreatorPagesResult.error],
      ["profile world selections", sectionWorldsResult.error],
    ] as const;

    for (const [label, error] of initialResults) {
      if (error) {
        throw new Error(`Failed to export ${label}: ${error.message}`);
      }
    }

    // -----------------------------------------------------------------------
    // Main product data
    //
    // Reuse the same builders as the individual exports so Account and
    // Individual exports cannot drift apart.
    // -----------------------------------------------------------------------

    const [botsResult, formsResult, creatorPagesResult, atlasResult] =
      await Promise.all([
        buildCurrentUserBotsExport(),
        buildCurrentUserFormsExport(),
        buildCurrentUserCreatorPagesExport(),
        buildCurrentUserAtlasExport(),
      ]);

    if (!botsResult.success) {
      throw new Error(`Failed to export bots: ${botsResult.error}`);
    }

    if (!formsResult.success) {
      throw new Error(`Failed to export forms: ${formsResult.error}`);
    }

    if (!creatorPagesResult.success) {
      throw new Error(
        `Failed to export Creator Pages: ${creatorPagesResult.error}`,
      );
    }

    if (!atlasResult.success) {
      throw new Error(`Failed to export Atlas: ${atlasResult.error}`);
    }

    // -----------------------------------------------------------------------
    // Social graph
    // -----------------------------------------------------------------------

    const following = await fetchAllPages(
      "following relationships",
      async (from, to) =>
        await supabase
          .from("profile_follows")
          .select("following_id, created_at")
          .eq("follower_id", userId)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    const followers = await fetchAllPages(
      "follower relationships",
      async (from, to) =>
        await supabase
          .from("profile_follows")
          .select("follower_id, created_at")
          .eq("following_id", userId)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    // -----------------------------------------------------------------------
    // Notifications
    // -----------------------------------------------------------------------

    const notifications = await fetchAllPages(
      "notifications",
      async (from, to) =>
        await supabase
          .from("notifications")
          .select(
            `
            id,
            type,
            title,
            message,
            link,
            is_read,
            metadata,
            created_at,
            deleted_at
          `,
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    // -----------------------------------------------------------------------
    // Hub activity
    // -----------------------------------------------------------------------

    const [
      hubLogComments,
      hubLogReactions,
      hubResourceComments,
      hubResourceReactions,
    ] = await Promise.all([
      fetchAllPages(
        "Hub log comments",
        async (from, to) =>
          await supabase
            .from("hub_log_post_comments")
            .select(
              `
              id,
              post_id,
              body,
              created_at,
              updated_at,
              deleted_at
            `,
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: true })
            .range(from, to),
      ),

      fetchAllPages(
        "Hub log reactions",
        async (from, to) =>
          await supabase
            .from("hub_log_post_reactions")
            .select(
              `
              post_id,
              reaction,
              created_at,
              updated_at
            `,
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: true })
            .range(from, to),
      ),

      fetchAllPages(
        "Hub resource comments",
        async (from, to) =>
          await supabase
            .from("hub_resource_entry_comments")
            .select(
              `
              id,
              entry_id,
              body,
              created_at,
              updated_at,
              deleted_at
            `,
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: true })
            .range(from, to),
      ),

      fetchAllPages(
        "Hub resource reactions",
        async (from, to) =>
          await supabase
            .from("hub_resource_entry_reactions")
            .select(
              `
              entry_id,
              reaction,
              created_at,
              updated_at
            `,
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: true })
            .range(from, to),
      ),
    ]);

    // -----------------------------------------------------------------------
    // Feedback
    //
    // Deliberately excludes staff workflow fields:
    // - assigned_to
    // - priority
    // - is_read
    // -----------------------------------------------------------------------

    const feedback = await fetchAllPages(
      "feedback",
      async (from, to) =>
        await supabase
          .from("feedback_submissions")
          .select(
            `
            id,
            feedback_type,
            subject,
            message,
            contact,
            source_label,
            source_page,
            source_path,
            related_id,
            created_at,
            updated_at,
            deleted_at
          `,
          )
          .eq("submitter_user_id", userId)
          .order("created_at", { ascending: true })
          .range(from, to),
    );

    // -----------------------------------------------------------------------
    // Assemble export
    // -----------------------------------------------------------------------

    const username =
      profileResult.data?.username || access.profile?.username || "account";

    const exportData: JanitorForgeAccountExportV1 = {
      format: ACCOUNT_EXPORT_FORMAT,
      version: ACCOUNT_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),

      account: {
        profile: profileResult.data as ExportRecord | null,
        notificationPreferences: preferencesResult.data as ExportRecord | null,
        badges: asExportRecords(badgeAwardsResult.data ?? []),
      },

      profile: {
        sections: asExportRecords(profileSectionsResult.data ?? []),
        featuredBots: asExportRecords(featuredBotsResult.data ?? []),
        sectionBots: asExportRecords(sectionBotsResult.data ?? []),
        sectionForms: asExportRecords(sectionFormsResult.data ?? []),
        sectionCreatorPages: asExportRecords(
          sectionCreatorPagesResult.data ?? [],
        ),
        sectionWorlds: asExportRecords(sectionWorldsResult.data ?? []),
      },

      bots: botsResult.data.bots,
      forms: formsResult.data.forms,
      creatorPages: creatorPagesResult.data.creatorPages,
      atlas: atlasResult.data,

      social: {
        following: asExportRecords(following),
        followers: asExportRecords(followers),
      },

      activity: {
        notifications: asExportRecords(notifications),
        hubLogComments: asExportRecords(hubLogComments),
        hubLogReactions: asExportRecords(hubLogReactions),
        hubResourceComments: asExportRecords(hubResourceComments),
        hubResourceReactions: asExportRecords(hubResourceReactions),
        feedback: asExportRecords(feedback),
      },
    };

    return {
      success: true,
      username,
      data: exportData,
    };
  } catch (error) {
    console.error("Account export failed:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not build account export",
    };
  }
}
