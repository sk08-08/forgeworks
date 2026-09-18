"use client";

import { Bot as BotIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getProfileCardClass,
  type ProfileCardStyle,
  type ProfileLayout,
} from "@/features/profile/lib/profile-theme";

export interface ProfileBotCardData {
  id: string;
  name: string;
  shortDescription?: string;
  rating?: "SFW" | "NSFW" | string;
  imageUrl?: string | null;
  tags?: string[];
}

interface ProfileBotCardProps {
  bot: ProfileBotCardData;
  onClick?: () => void;
  cardStyle?: ProfileCardStyle;
  layout?: ProfileLayout;
  accentColor?: string;
}

export function ProfileBotGridCard({
  bot,
  onClick,
  cardStyle = "default",
  layout = "grid",
  accentColor,
}: ProfileBotCardProps) {
  const cardClass = getProfileCardClass(cardStyle);
  const cardStyleOverrides =
    accentColor && cardStyle !== "minimal"
      ? ({ borderColor: `${accentColor}4a` } as const)
      : undefined;

  return (
    <div
      className={cn(
        "group min-w-0 max-w-full overflow-hidden cursor-pointer transition-all h-full flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        cardClass,
        layout === "list" && "sm:flex-row sm:items-start sm:gap-4",
      )}
      style={cardStyleOverrides}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div
        className={cn(
          "bg-muted overflow-hidden shrink-0 rounded-md relative",
          layout === "list"
            ? "h-24 w-24 sm:h-auto sm:w-28 sm:aspect-4/5"
            : "aspect-square sm:aspect-5/6 w-full",
        )}
      >
        {bot.imageUrl ? (
          <img
            src={bot.imageUrl}
            alt={bot.name}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-primary/5">
            <BotIcon className="h-8 w-8 text-primary/30" />
          </div>
        )}

        {layout === "grid" && bot.rating && (
          <Badge
            variant={bot.rating === "SFW" ? "secondary" : "destructive"}
            className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] backdrop-blur-md shadow-sm opacity-90"
          >
            {bot.rating}
          </Badge>
        )}
      </div>

      <div
        className={cn(
          "min-w-0 flex-1 flex flex-col",
          layout === "list" ? "pt-2 sm:pt-1" : "pt-2",
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <p
            className="text-sm font-semibold truncate text-foreground transition-colors duration-200 group-hover:text-[var(--bot-accent)]"
            style={
              {
                "--bot-accent": accentColor || "#7c3aed",
              } as React.CSSProperties
            }
          >
            {bot.name}
          </p>
          {layout === "list" && bot.rating && (
            <Badge
              variant={bot.rating === "SFW" ? "secondary" : "destructive"}
              className="text-[10px] shrink-0"
            >
              {bot.rating}
            </Badge>
          )}
        </div>
        <p
          className={cn(
            "text-xs text-muted-foreground",
            layout === "list" ? "line-clamp-2" : "line-clamp-2",
          )}
        >
          {bot.shortDescription || "No description"}
        </p>
      </div>
    </div>
  );
}

export function ProfileFeaturedBotListCard({
  bot,
  onClick,
  cardStyle = "default",
  accentColor,
}: ProfileBotCardProps) {
  const cardClass = getProfileCardClass(cardStyle);
  const cardStyleOverrides =
    accentColor && cardStyle !== "minimal"
      ? ({ borderColor: `${accentColor}4a` } as const)
      : undefined;

  return (
    <div
      className={cn(
        "group flex w-full min-w-0 max-w-full items-center gap-3 overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        cardClass,
      )}
      style={cardStyleOverrides}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="h-14 w-20 rounded bg-muted overflow-hidden shrink-0">
        {bot.imageUrl ? (
          <img
            src={bot.imageUrl}
            alt={bot.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-primary/10">
            <BotIcon className="h-5 w-5 text-primary/70" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p
            className="min-w-0 flex-1 truncate text-sm font-medium text-foreground transition-colors duration-200 group-hover:text-[var(--bot-accent)]"
            style={
              {
                "--bot-accent": accentColor || "#7c3aed",
              } as React.CSSProperties
            }
          >
            {bot.name}
          </p>
          {bot.rating && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {bot.rating}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {bot.shortDescription || "No description"}
        </p>
      </div>
    </div>
  );
}
