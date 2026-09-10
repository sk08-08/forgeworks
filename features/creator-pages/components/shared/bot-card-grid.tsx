// ============================================================================
// Forgeworks - Shared Bot Card Components
// Reusable across creator page views, profile pages, and atlas
// ============================================================================

"use client";

import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BotPreview } from "@/features/creator-pages/types/creator-page-types";

// ---------------------------------------------------------------------------
// Bot Card Grid — Large visual card for grid/showcase layouts
// ---------------------------------------------------------------------------

export function BotCardGrid({
  bot,
  themeColor,
  onClick,
}: {
  bot: BotPreview;
  themeColor?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
      onClick={onClick}
      style={
        themeColor
          ? {
              borderColor: `${themeColor}44`,
              boxShadow: `0 4px 6px -1px ${themeColor}11, 0 2px 4px -2px ${themeColor}08`,
            }
          : undefined
      }
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {bot.image_url ? (
          <img
            src={bot.image_url}
            alt={bot.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <Bot className="h-16 w-16 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
        <Badge
          variant={bot.rating === "SFW" ? "secondary" : "destructive"}
          className="absolute top-3 right-3 backdrop-blur-sm shadow-sm"
        >
          {bot.rating}
        </Badge>
      </div>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg font-bold leading-tight">
          {bot.name}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-sm mt-1">
          {bot.short_description || "No description provided"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex flex-wrap gap-1.5">
          {bot.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[11px]">
              {tag}
            </Badge>
          ))}
          {bot.tags.length > 4 && (
            <Badge variant="outline" className="text-[11px]">
              +{bot.tags.length - 4}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
