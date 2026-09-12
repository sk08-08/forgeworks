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
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] min-h-0 w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden p-0 sm:max-w-lg">
        {/* Image container — fixed height, never overlaps text */}
        {imgSrc && (
          <div className="relative h-40 w-full shrink-0 bg-muted sm:h-52">
            <img
              src={imgSrc}
              alt={bot.name}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        )}

        {/* Content area — starts strictly below image, scrolls within remaining height */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:pb-5">
          {/* Header */}
          <DialogHeader className="min-w-0 text-left">
            <DialogTitle className="flex min-w-0 flex-wrap items-center gap-2 break-words pr-6 text-lg">
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
              className="min-w-0 break-words text-sm text-foreground/90 [&>*:last-child]:mb-0 [&_a]:break-all [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto"
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
                className="min-w-0 break-words text-sm text-foreground/80 [&>*:last-child]:mb-0 [&_a]:break-all [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto"
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
                className="min-w-0 break-words text-sm text-foreground/80 [&>*:last-child]:mb-0 [&_a]:break-all [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto"
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
                className="min-w-0 break-words text-sm text-foreground/80 [&>*:last-child]:mb-0 [&_a]:break-all [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto"
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
                    className="min-w-0 rounded-xl border bg-muted/20 p-3"
                  >
                    <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                      Greeting {index + 2}
                    </p>

                    <MarkdownRenderer
                      content={message}
                      className="min-w-0 break-words text-sm text-foreground/80 [&>*:last-child]:mb-0 [&_a]:break-all [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto"
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
                className="min-w-0 break-words text-sm text-foreground/80 [&>*:last-child]:mb-0 [&_a]:break-all [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto"
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
