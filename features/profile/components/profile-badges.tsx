// ============================================================================
// Forgeworks - Shared Profile Badges Section
// Normalized badge renderer with empty state and badge icon support
// ============================================================================

"use client";

import { useState } from "react";
import { Award } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProfileBadgeIcon } from "@/features/profile/lib/profile-badge-icons";
import type { ProfileBadgeRecord } from "@/features/profile/lib/profile-badges";
import {
  getProfileBackgroundTintColor,
  getProfileBorderTintColor,
  getReadableProfileAccentColor,
} from "@/features/profile/lib/profile-theme";
import { cn } from "@/lib/utils";

interface ProfileBadgesProps {
  badges: ProfileBadgeRecord[];
  themeColor: string;
  showBadges?: boolean;
  className?: string;
  titleClassName?: string;
  listClassName?: string;
  badgeClassName?: string;
  emptyClassName?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

function formatAwardedAt(dateValue?: string) {
  if (!dateValue) return "Award date unavailable";

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return "Award date unavailable";

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function BadgeDetailsPanel({
  badge,
  accentColor,
}: {
  badge: ProfileBadgeRecord;
  accentColor: string;
}) {
  const Icon = getProfileBadgeIcon(badge.icon);
  const readableAccentColor = getReadableProfileAccentColor(
    accentColor,
    "medium",
  );
  const borderTint = getProfileBorderTintColor(accentColor, 36);
  const backgroundTint = getProfileBackgroundTintColor(accentColor, 14);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
          style={{
            borderColor: borderTint,
            backgroundColor: backgroundTint,
          }}
        >
          <Icon className="h-5 w-5" style={{ color: readableAccentColor }} />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="font-semibold leading-tight">{badge.label}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Awarded on {formatAwardedAt(badge.awardedAt)}
          </p>
        </div>
      </div>

      {badge.description && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {badge.description}
        </p>
      )}

      {badge.note && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {badge.note}
        </p>
      )}
    </div>
  );
}

function BadgePill({
  badge,
  themeColor,
  className,
}: {
  badge: ProfileBadgeRecord;
  themeColor: string;
  className?: string;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const Icon = getProfileBadgeIcon(badge.icon);
  const accentColor = badge.color || themeColor;
  const readableAccentColor = getReadableProfileAccentColor(
    accentColor,
    "medium",
  );
  const borderTint = getProfileBorderTintColor(accentColor, 32);
  const triggerClassName = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    className,
  );
  const triggerLabel = `${badge.label}. Awarded on ${formatAwardedAt(badge.awardedAt)}`;

  const pill = (
    <span className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" style={{ color: readableAccentColor }} />
      <span className="text-xs font-medium leading-none">{badge.label}</span>
    </span>
  );

  if (isMobile) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={triggerClassName}
            style={{ borderColor: borderTint }}
            aria-label={triggerLabel}
          >
            {pill}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={10}
          className="w-80 rounded-2xl border border-border/70 bg-popover p-4 shadow-xl"
        >
          <BadgeDetailsPanel badge={badge} accentColor={accentColor} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={triggerClassName}
          style={{ borderColor: borderTint }}
          aria-label={triggerLabel}
        >
          {pill}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={10}
        className="w-80 rounded-2xl border border-border/70 bg-popover p-4 text-popover-foreground shadow-xl"
      >
        <BadgeDetailsPanel badge={badge} accentColor={accentColor} />
      </TooltipContent>
    </Tooltip>
  );
}

export function ProfileBadgesSection({
  badges,
  themeColor,
  showBadges = true,
  className,
  titleClassName,
  listClassName,
  badgeClassName,
  emptyClassName,
  emptyTitle = "No badges yet",
  emptyDescription = "Badges will appear here once they are awarded.",
}: ProfileBadgesProps) {
  if (!showBadges) return null;
  const readableThemeColor = getReadableProfileAccentColor(themeColor);

  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-4">
        <Award className="h-5 w-5" style={{ color: readableThemeColor }} />
        <h2 className={cn("text-lg font-semibold", titleClassName)}>Badges</h2>
      </div>

      {badges.length > 0 ? (
        <div className={listClassName || "flex flex-wrap gap-2 mt-2"}>
          {badges.map((badge) => (
            <BadgePill
              key={badge.id}
              badge={badge}
              themeColor={themeColor}
              className={badgeClassName}
            />
          ))}
        </div>
      ) : (
        <Empty
          className={
            emptyClassName ||
            "rounded-lg border border-dashed bg-card/40 px-5 py-7"
          }
        >
          <EmptyContent>
            <EmptyMedia variant="icon">
              <Award
                className="h-5 w-5"
                style={{
                  color: readableThemeColor,
                }}
              />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
