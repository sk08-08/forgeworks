// ============================================================================
// Forgeworks - Shared Bot Card List (compact)
// ============================================================================

"use client";

import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { BotPreview } from "@/features/creator-pages/types/creator-page-types";

export function BotCardList({
  bot,
  onClick,
}: {
  bot: BotPreview;
  themeColor?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className="group overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
          {bot.image_url ? (
            <img
              src={bot.image_url}
              alt={bot.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <Bot className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{bot.name}</h3>
            <Badge
              variant={bot.rating === "SFW" ? "secondary" : "destructive"}
              className="text-[10px] shrink-0"
            >
              {bot.rating}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
            {bot.short_description || "No description"}
          </p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {bot.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
