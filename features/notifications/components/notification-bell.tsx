// ============================================================================
// Forgeworks - Notification Bell
// Important account activity: social, collaboration, and moderation
// ============================================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  GitPullRequest,
  Inbox,
  Loader2,
  ShieldAlert,
  Trash2,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";

import {
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "@/features/notifications/actions/notifications";

import {
  isNotificationType,
  type NotificationRecord,
  type NotificationType,
} from "@/features/notifications/lib/notification-types";

import { useStore } from "@/features/app-shell/store/app-store";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Notification UI config
// ---------------------------------------------------------------------------

type NotificationDestination = "profile" | "bots" | "moderation";

interface NotificationConfig {
  icon: LucideIcon;
  iconClassName: string;
  borderClassName: string;
  destination: NotificationDestination;
}

const notificationConfig: Record<NotificationType, NotificationConfig> = {
  new_follower: {
    icon: UserRoundCheck,
    iconClassName: "text-green-500",
    borderClassName: "border-l-green-500/60",
    destination: "profile",
  },

  collaboration_invite: {
    icon: UsersRound,
    iconClassName: "text-purple-500",
    borderClassName: "border-l-purple-500/60",
    destination: "bots",
  },

  collaboration_accepted: {
    icon: UsersRound,
    iconClassName: "text-purple-500",
    borderClassName: "border-l-purple-500/60",
    destination: "bots",
  },

  collaboration_declined: {
    icon: UsersRound,
    iconClassName: "text-purple-500",
    borderClassName: "border-l-purple-500/60",
    destination: "bots",
  },

  collaboration_role_changed: {
    icon: UsersRound,
    iconClassName: "text-purple-500",
    borderClassName: "border-l-purple-500/60",
    destination: "bots",
  },

  collaborator_removed: {
    icon: UsersRound,
    iconClassName: "text-purple-500",
    borderClassName: "border-l-purple-500/60",
    destination: "bots",
  },

  change_request_created: {
    icon: GitPullRequest,
    iconClassName: "text-purple-500",
    borderClassName: "border-l-purple-500/60",
    destination: "bots",
  },

  change_request_approved: {
    icon: GitPullRequest,
    iconClassName: "text-purple-500",
    borderClassName: "border-l-purple-500/60",
    destination: "bots",
  },

  change_request_rejected: {
    icon: GitPullRequest,
    iconClassName: "text-purple-500",
    borderClassName: "border-l-purple-500/60",
    destination: "bots",
  },

  flagged_submission: {
    icon: ShieldAlert,
    iconClassName: "text-amber-500",
    borderClassName: "border-l-amber-500/60",
    destination: "moderation",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTimeAgo(dateStr: string): string {
  const then = new Date(dateStr).getTime();

  if (!Number.isFinite(then)) {
    return "";
  }

  const diff = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function notificationFromRealtimePayload(
  payload: Record<string, unknown>,
): NotificationRecord | null {
  if (
    typeof payload.id !== "string" ||
    !isNotificationType(payload.type) ||
    typeof payload.title !== "string" ||
    typeof payload.created_at !== "string"
  ) {
    return null;
  }

  return {
    id: payload.id,
    type: payload.type,
    title: payload.title,
    message: typeof payload.message === "string" ? payload.message : null,
    link: typeof payload.link === "string" ? payload.link : null,
    is_read: payload.is_read === true,
    metadata:
      payload.metadata &&
      typeof payload.metadata === "object" &&
      !Array.isArray(payload.metadata)
        ? (payload.metadata as Record<string, unknown>)
        : null,
    created_at: payload.created_at,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const { setCurrentView } = useStore();

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<{
    createdAt: string;
    id: string;
  } | null>(null);

  const refreshCount = useCallback(async () => {
    const result = await getUnreadCount();

    if (result.success) {
      setUnreadCount(result.count);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getNotifications(20);

      if (result.success) {
        setNotifications(result.notifications);
        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreNotifications = useCallback(async () => {
    if (!nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);

    try {
      const result = await getNotifications(20, nextCursor);

      if (!result.success) {
        toast.error(result.error || "Could not load more notifications");
        return;
      }

      setNotifications((current) => {
        const existingIds = new Set(current.map((item) => item.id));

        const nextItems = result.notifications.filter(
          (item) => !existingIds.has(item.id),
        );

        return [...current, ...nextItems];
      });

      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor]);

  // -------------------------------------------------------------------------
  // Realtime + fallback count refresh
  // -------------------------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    const supabase = createClient();

    void refreshCount();

    const interval = window.setInterval(() => {
      void refreshCount();
    }, 60_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshCount();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) {
        return;
      }

      channel = supabase
        .channel(`notifications-bell-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const notification = notificationFromRealtimePayload(
              payload.new as Record<string, unknown>,
            );

            if (!notification) {
              return;
            }

            setNotifications((current) => {
              if (current.some((item) => item.id === notification.id)) {
                return current;
              }

              return [notification, ...current];
            });

            if (!notification.is_read) {
              setUnreadCount((current) => current + 1);
            }
          },
        )
        .subscribe();
    };

    void setupRealtime();

    return () => {
      mounted = false;

      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [refreshCount]);

  // -------------------------------------------------------------------------
  // Load notification list when opened
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (open) {
      void loadNotifications();
    }
  }, [open, loadNotifications]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    const result = await markAsRead(notificationId);

    if (!result.success) {
      return false;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification,
      ),
    );

    setUnreadCount((current) => Math.max(0, current - 1));

    return true;
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    const result = await markAllAsRead();

    if (!result.success) {
      toast.error(result.error || "Could not mark notifications as read");
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
      })),
    );

    setUnreadCount(0);

    toast.success("All notifications marked as read");
  }, []);

  const handleDelete = useCallback(
    async (notificationId: string) => {
      const notification = notifications.find(
        (item) => item.id === notificationId,
      );

      const result = await deleteNotification(notificationId);

      if (!result.success) {
        toast.error(result.error || "Could not dismiss notification");
        return;
      }

      setNotifications((current) =>
        current.filter((item) => item.id !== notificationId),
      );

      if (notification && !notification.is_read) {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    },
    [notifications],
  );

  const navigateToNotification = useCallback(
    async (notification: NotificationRecord) => {
      if (!notification.is_read) {
        await handleMarkAsRead(notification.id);
      }

      if (
        notification.link &&
        notification.link.startsWith("/") &&
        !notification.link.startsWith("/dashboard")
      ) {
        window.location.assign(notification.link);
        return;
      }

      const config = notificationConfig[notification.type];

      setCurrentView(config.destination);
      setOpen(false);
    },
    [handleMarkAsRead, setCurrentView],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 cursor-pointer"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
        >
          <Bell className="h-4 w-4" />

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-1rem)] max-w-96 overflow-hidden p-0"
      >
        {/* Header */}
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border/50 px-4 py-2.5">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Notifications</h3>

            {unreadCount > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {unreadCount} unread
              </p>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleMarkAllAsRead()}
              className="h-8 shrink-0 cursor-pointer text-xs text-muted-foreground"
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Scrollable content */}
        <div className="max-h-[min(26rem,70vh)] overflow-y-auto">
          {loading ? (
            <div className="flex min-h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-44 flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Inbox className="h-5 w-5 text-muted-foreground" />
              </div>

              <p className="text-sm font-medium">You&apos;re all caught up</p>

              <p className="mt-1 max-w-56 text-xs leading-relaxed text-muted-foreground">
                Important social, collaboration, and moderation activity will
                appear here.
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => {
                const config = notificationConfig[notification.type];
                const Icon = config.icon;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative flex border-b border-border/30 border-l-2 transition-colors last:border-b-0",
                      config.borderClassName,
                      !notification.is_read && "bg-primary/[0.035]",
                    )}
                  >
                    {/* Main notification action */}
                    <button
                      type="button"
                      onClick={() => void navigateToNotification(notification)}
                      className="min-w-0 flex-1 cursor-pointer px-3 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/70",
                            config.iconClassName,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p
                              className={cn(
                                "min-w-0 truncate text-sm",
                                notification.is_read
                                  ? "font-medium text-muted-foreground"
                                  : "font-semibold text-foreground",
                              )}
                            >
                              {notification.title}
                            </p>

                            {!notification.is_read && (
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                                aria-label="Unread"
                              />
                            )}
                          </div>

                          {notification.message && (
                            <div
                              className={cn(
                                "mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground",
                                "[&>p]:m-0 [&>p]:inline",
                                "[&_*]:text-xs [&_*]:leading-relaxed",
                              )}
                            >
                              <MarkdownRenderer
                                content={notification.message}
                              />
                            </div>
                          )}

                          <p className="mt-1 text-[10px] text-muted-foreground/70">
                            {getTimeAgo(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Secondary actions */}
                    <div className="flex shrink-0 items-start gap-0.5 py-2 pr-2 opacity-70 transition-opacity hover:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleMarkAsRead(notification.id)}
                          className="h-7 w-7 cursor-pointer text-muted-foreground"
                          aria-label="Mark as read"
                          title="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleDelete(notification.id)}
                        className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-white"
                        aria-label="Dismiss notification"
                        title="Dismiss"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <div className="border-t border-border/40 p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void loadMoreNotifications()}
                    disabled={loadingMore}
                    className="w-full cursor-pointer text-xs text-muted-foreground"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Loading more...
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
