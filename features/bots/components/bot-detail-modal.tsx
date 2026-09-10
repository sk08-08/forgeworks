// ============================================================================
// Forgeworks - Bot Detail Modal
// Shared modal for viewing bot details across the app
// ============================================================================

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BotTagBadge, BotTagCountBadge } from "./bot-tag-badge";

import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";

interface BotDetailData {
  id: string;
  name: string;
  shortDescription?: string;
  short_description?: string;
  personality?: string;
  firstMessage?: string;
  scenario?: string;
  exampleDialogues?: string;
  alternateGreetings?: string[];
  alternate_greetings?: string[];
  tags?: string[];
  rating?: string;
  imageUrl?: string;
  image_url?: string;
  hideSensitiveFields?: boolean;
}

interface BotDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bot: BotDetailData | null;
}

export function BotDetailModal({
  open,
  onOpenChange,
  bot,
}: BotDetailModalProps) {
  if (!bot) return null;

  const hideSensitive = bot.hideSensitiveFields === true;
  const imgSrc = bot.imageUrl || bot.image_url;
  const description =
    bot.shortDescription || bot.short_description || "No description";
  const alternateGreetings = Array.isArray(bot.alternateGreetings)
    ? bot.alternateGreetings
    : Array.isArray(bot.alternate_greetings)
      ? bot.alternate_greetings
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-md max-h-[85vh] p-0 flex flex-col overflow-hidden">
        {/* Image container — fixed height, never overlaps text */}
        {imgSrc && (
          <div className="w-full h-40 sm:h-48 bg-muted shrink-0 relative">
            <img
              src={imgSrc}
              alt={bot.name}
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>
        )}

        {/* Content area — starts strictly below image, scrolls within remaining height */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-5 space-y-4">
          {/* Header */}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {bot.name}
              {bot.rating && (
                <Badge
                  variant={bot.rating === "SFW" ? "secondary" : "destructive"}
                  className="text-[10px]"
                >
                  {bot.rating}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Bot details for {bot.name}
            </DialogDescription>
          </DialogHeader>

          {/* Tags */}
          {bot.tags && bot.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {bot.tags.slice(0, 8).map((t) => (
                <BotTagBadge key={t} tag={t} className="text-[11px]" />
              ))}
              {bot.tags.length > 8 && (
                <BotTagCountBadge
                  count={bot.tags.length - 8}
                  className="text-[11px]"
                />
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
              Description
            </p>
            <MarkdownRenderer
              content={description}
              className="text-sm text-foreground/90 [&>*:last-child]:mb-0"
            />
          </div>

          {/* Sensitive fields */}
          {!hideSensitive && bot.personality && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                Personality
              </p>
              <MarkdownRenderer
                content={bot.personality}
                className="text-sm text-foreground/80 [&>*:last-child]:mb-0"
              />
            </div>
          )}

          {!hideSensitive && bot.scenario && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                Scenario
              </p>
              <MarkdownRenderer
                content={bot.scenario}
                className="text-sm text-foreground/80 [&>*:last-child]:mb-0"
              />
            </div>
          )}

          {!hideSensitive && bot.firstMessage && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                First Message
              </p>
              <MarkdownRenderer
                content={bot.firstMessage}
                className="text-sm text-foreground/80 [&>*:last-child]:mb-0"
              />
            </div>
          )}

          {!hideSensitive && alternateGreetings.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Alternate Greetings
              </p>

              <div className="space-y-2">
                {alternateGreetings.map((message, index) => (
                  <div
                    key={index}
                    className="rounded-lg border bg-muted/20 p-3"
                  >
                    <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                      Greeting {index + 2}
                    </p>

                    <MarkdownRenderer
                      content={message}
                      className="text-sm text-foreground/80 [&>*:last-child]:mb-0"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hideSensitive && bot.exampleDialogues && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                Example Dialogues
              </p>
              <MarkdownRenderer
                content={bot.exampleDialogues}
                className="text-sm text-foreground/80 [&>*:last-child]:mb-0"
              />
            </div>
          )}

          {hideSensitive && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-muted-foreground/30 pl-3">
              Some fields are hidden by the creator.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
