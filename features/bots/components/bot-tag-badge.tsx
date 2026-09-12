"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Bot,
  Crown,
  Film,
  Flame,
  Gamepad2,
  Globe,
  Heart,
  Moon,
  Shield,
  Skull,
  Sun,
  Tag,
  UserRound,
  Users,
  Tv,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  BOT_TAG_ICON_EMOJI,
  getBotTagMeta,
  type BotTagIconKey,
} from "@/features/bots/lib/bot-tags";
import { cn } from "@/lib/utils";

const iconMap: Partial<
  Record<BotTagIconKey, React.ComponentType<{ className?: string }>>
> = {
  user: UserRound,
  users: Users,
  heart: Heart,
  tag: Tag,
  shield: Shield,
  flame: Flame,
  skull: Skull,
  bot: Bot,
  book: BookOpen,
  film: Film,
  tv: Tv,
  gamepad: Gamepad2,
  globe: Globe,
  moon: Moon,
  sun: Sun,
  crown: Crown,
};

function getTwemojiSrc(emoji: string) {
  const codePoints = Array.from(emoji)
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter((value): value is string => !!value)
    .join("-")
    .replace(/-fe0f/g, "");

  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoints}.svg`;
}

export function TagVisualIcon({
  iconKey,
  fallback: Fallback,
  className,
}: {
  iconKey: BotTagIconKey;
  fallback?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  const emoji = BOT_TAG_ICON_EMOJI[iconKey];
  const FallbackIcon = Fallback || iconMap[iconKey] || Tag;
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [emoji]);

  if (!emoji || hasError) {
    return <FallbackIcon className={className} />;
  }

  return (
    <img
      src={getTwemojiSrc(emoji)}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={() => setHasError(true)}
      className={cn(className, "select-none")}
    />
  );
}

export function BotTagBadge({
  tag,
  className,
}: {
  tag: string;
  className?: string;
}) {
  const meta = getBotTagMeta(tag);

  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full min-w-0 gap-1.5 border text-xs",
        meta.badgeClassName,
        className,
      )}
    >
      <TagVisualIcon iconKey={meta.icon} className="h-3 w-3 shrink-0" />
      <span className="min-w-0 truncate">{meta.label}</span>
    </Badge>
  );
}

export function BotTagCountBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full gap-1.5 border border-border bg-muted/60 text-xs text-foreground",
        className,
      )}
    >
      <Tag className="h-3 w-3 shrink-0" />
      <span>+{count}</span>
    </Badge>
  );
}
