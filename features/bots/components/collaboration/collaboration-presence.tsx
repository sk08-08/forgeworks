"use client";

import { Radio, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  BotCollaborationFieldLock,
  BotCollaborationPresenceUser,
  CollaborationConnectionStatus,
} from "@/features/bots/hooks/use-bot-collaboration-realtime";

const tabLabels: Record<string, string> = {
  overview: "Overview",
  editor: "Editor",
  changes: "Changes",
  discussion: "Discussion",
  history: "History",
  activity: "Activity",
  team: "Team",
  settings: "Settings",
};

const fieldLabels: Record<string, string> = {
  name: "Bot Name",
  chat_name: "Chat Name",
  short_description: "Short Description",
  personality: "Personality",
  first_message: "First Message",
  alternate_greetings: "Alternate Greetings",
  scenario: "Scenario",
  example_dialogues: "Example Dialogues",
  tags: "Tags",
  rating: "Rating",
  image_url: "Image",
  hide_sensitive_fields: "Sensitive-field settings",
};

function getUserName(user: BotCollaborationPresenceUser): string {
  return user.displayName || user.username || "Forge user";
}

function getUserActivity(user: BotCollaborationPresenceUser): string {
  if (user.activeField) {
    return `Editing ${fieldLabels[user.activeField] || user.activeField}`;
  }
  return `Viewing ${tabLabels[user.activeTab] || user.activeTab}`;
}

function PresenceAvatar({
  user,
  compact = false,
}: {
  user: BotCollaborationPresenceUser;
  compact?: boolean;
}) {
  const name = getUserName(user);

  return (
    <div className="group relative shrink-0">
      <div
        className={cn(
          "relative cursor-default overflow-hidden rounded-full border-2 border-background bg-muted shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:scale-105 group-hover:shadow-md",
          compact ? "h-6 w-6" : "h-8 w-8",
        )}
        aria-label={`${name}: ${getUserActivity(user)}`}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10">
            <UserRound
              className={cn("text-primary", compact ? "h-3 w-3" : "h-4 w-4")}
            />
          </div>
        )}
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
      </div>

      <div className="pointer-events-none absolute right-0 top-full z-[90] mt-2 hidden min-w-52 animate-in rounded-lg border border-border/80 bg-popover p-3 text-left shadow-xl fade-in-0 slide-in-from-top-1 duration-150 group-hover:block">
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-popover-foreground">
              {name}
            </p>
            {user.username && (
              <p className="truncate text-[10px] text-muted-foreground">
                @{user.username}
              </p>
            )}
          </div>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {getUserActivity(user)}
        </p>
      </div>
    </div>
  );
}

export function CollaborationPresence({
  users,
  connectionStatus,
  currentUserId,
  maxVisible = 5,
}: {
  users: BotCollaborationPresenceUser[];
  connectionStatus: CollaborationConnectionStatus;
  currentUserId: string | null;
  maxVisible?: number;
}) {
  const connected = connectionStatus === "connected";
  const displayUsers = connected ? users : [];

  const ordered = [...displayUsers].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return getUserName(a).localeCompare(getUserName(b));
  });

  const visible = ordered.slice(0, maxVisible);
  const extra = Math.max(0, ordered.length - visible.length);

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-1.5 text-[10px] text-muted-foreground sm:flex">
        <Radio
          className={cn(
            "h-3.5 w-3.5",
            connected ? "text-emerald-500" : "text-amber-500",
          )}
        />
        {connected
          ? `${displayUsers.length} live`
          : connectionStatus === "reconnecting"
            ? "Reconnecting…"
            : connectionStatus === "connecting"
              ? "Connecting…"
              : "Offline"}
      </div>

      <div className="flex -space-x-2">
        {visible.map((user) => (
          <PresenceAvatar key={user.userId} user={user} />
        ))}
        {extra > 0 && (
          <div className="flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-background bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
            +{extra}
          </div>
        )}
      </div>
    </div>
  );
}

export function CollaborationFieldPresence({
  lock,
  users,
  currentUserId,
}: {
  lock: BotCollaborationFieldLock | null;
  users: BotCollaborationPresenceUser[];
  currentUserId: string | null;
}) {
  if (!lock || lock.userId === currentUserId) return null;

  const user = users.find((item) => item.userId === lock.userId);
  if (!user) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Someone is editing
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary">
      <PresenceAvatar user={user} compact />
      {getUserName(user)} is editing
    </span>
  );
}
