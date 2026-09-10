// ============================================================================
// Forgeworks - Shared Profile Completeness Card
// Shows missing profile areas and a progress bar until the profile is complete
// ============================================================================

"use client";

import { CheckCircle2, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getProfileBackgroundTintColor,
  getProfileBorderTintColor,
  getReadableProfileAccentColor,
} from "@/features/profile/lib/profile-theme";
import { cn } from "@/lib/utils";

type ProfileCompletionSource = {
  display_name?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  tagline?: string | null;
  bio?: string | null;
  pronouns?: string | null;
  location?: string | null;
  website_url?: string | null;
  specialties?: string[] | null;
  active_profile_featured_bots?: Array<{
    sort_order?: number;
    bot?: { id?: string | null } | null;
  }> | null;
  social_links?: Record<string, string> | null;
};

type CompletionItem = {
  key: string;
  label: string;
  done: boolean;
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function getSocialLinkCount(profile: ProfileCompletionSource) {
  const socialLinks = (profile.social_links as Record<string, string>) || {};
  return Object.values(socialLinks).filter((value) => value && value.trim())
    .length;
}

export function getProfileCompletionItems(
  profile: ProfileCompletionSource,
): CompletionItem[] {
  const specialties = (profile.specialties as string[]) || [];
  const featuredBotIds = (profile.active_profile_featured_bots || [])
    .map((relation) => relation?.bot?.id)
    .filter((id): id is string => Boolean(id));

  return [
    {
      key: "display_name",
      label: "Add a display name",
      done: hasText(profile.display_name),
    },
    {
      key: "avatar_url",
      label: "Add an avatar",
      done: hasText(profile.avatar_url),
    },
    {
      key: "banner_url",
      label: "Add a banner",
      done: hasText(profile.banner_url),
    },
    {
      key: "tagline",
      label: "Write a tagline",
      done: hasText(profile.tagline),
    },
    { key: "bio", label: "Write a bio", done: hasText(profile.bio) },
    {
      key: "pronouns",
      label: "Set pronouns",
      done: hasText(profile.pronouns) && profile.pronouns !== "none",
    },
    {
      key: "location",
      label: "Add a location",
      done: hasText(profile.location),
    },
    {
      key: "website_url",
      label: "Add a website",
      done: hasText(profile.website_url) || getSocialLinkCount(profile) > 0,
    },
    {
      key: "specialties",
      label: "Add specialties",
      done: specialties.length > 0,
    },
    {
      key: "active_profile_featured_bots",
      label: "Pick featured bots",
      done: featuredBotIds.length > 0,
    },
  ];
}

export function ProfileCompletenessCard({
  profile,
  completeness,
  themeColor,
  hideNudge = false,
  onEdit,
  className,
}: {
  profile: ProfileCompletionSource;
  completeness: number;
  themeColor: string;
  hideNudge?: boolean;
  onEdit?: () => void;
  className?: string;
}) {
  if (hideNudge || completeness >= 100) return null;
  const readableThemeColor = getReadableProfileAccentColor(themeColor);
  const borderTint = getProfileBorderTintColor(themeColor, 30);
  const softTint = getProfileBackgroundTintColor(themeColor, 10);

  const missingItems = getProfileCompletionItems(profile).filter(
    (item) => !item.done,
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed bg-card/70 p-4 sm:p-5 shadow-sm",
        className,
      )}
      style={{ borderColor: borderTint }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles
              className="h-3.5 w-3.5"
              style={{ color: readableThemeColor }}
            />
            Profile completeness
          </div>
          <h3 className="text-base font-semibold leading-tight">
            Finish setting up your profile
          </h3>

          <p className="text-sm text-muted-foreground">
            You&apos;re {completeness}% of the way there. Complete the remaining
            details to make your profile more useful to visitors.
          </p>
        </div>
        <div
          className="rounded-2xl border px-3 py-2 text-right"
          style={{ borderColor: borderTint }}
        >
          <p
            className="text-2xl font-bold"
            style={{ color: readableThemeColor }}
          >
            {completeness}%
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            complete
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.max(0, Math.min(completeness, 100))}%`,
            backgroundColor: readableThemeColor,
          }}
        />
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          What is missing
        </p>
        <div className="flex flex-wrap gap-2">
          {missingItems.slice(0, 5).map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs"
              style={{
                borderColor: borderTint,
                backgroundColor: softTint,
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 opacity-60" />
              {item.label}
            </span>
          ))}
          {missingItems.length > 5 && (
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground">
              +{missingItems.length - 5} more
            </span>
          )}
        </div>
      </div>

      {onEdit && (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="cursor-pointer"
            onClick={onEdit}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Complete profile
          </Button>
        </div>
      )}
    </div>
  );
}
