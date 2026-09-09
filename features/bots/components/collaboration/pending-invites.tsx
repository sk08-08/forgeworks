// ============================================================================
// JanitorForge - Pending Collaboration Invites (Overhaul)
// Shows pending invites with bot images, inviter avatars, and role details
// ============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Check,
  X,
  Loader2,
  Crown,
  Eye,
  Pencil,
  Inbox,
  Bot as BotIcon,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMyPendingInvites,
  respondToInvite,
} from "@/features/bots/actions/collaboration";
import { useStore } from "@/features/app-shell/store/app-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  CollaboratorRole,
  PendingInvite,
} from "@/features/bots/types/bot-types";
import { roleConfig } from "@/features/bots/types/bot-types";

const roleIcons: Record<CollaboratorRole, typeof Eye> = {
  viewer: Eye,
  editor: Pencil,
  co_owner: Crown,
};

export function PendingInvites() {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const { refreshCollaborativeBots } = useStore();

  const loadInvites = useCallback(async () => {
    setLoading(true);
    const result = await getMyPendingInvites();
    if (result.success) {
      setInvites(result.invites as PendingInvite[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleRespond = async (inviteId: string, accept: boolean) => {
    setRespondingId(inviteId);
    const result = await respondToInvite(inviteId, accept);
    setRespondingId(null);

    if (result.success) {
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      toast.success(
        accept
          ? "Invite accepted! The bot is now available in your Bot Manager."
          : "Invite declined",
      );
      // Refresh the collaborative bots in the store
      if (accept) {
        await refreshCollaborativeBots();
      }
    } else {
      toast.error(result.error || "Failed to respond to invite");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[20vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Loading invites…</p>
        </div>
      </div>
    );
  }

  if (invites.length === 0) {
    return null; // Don't show anything if no invites
  }

  return (
    <Card className="border-primary/20 bg-primary/[0.02] mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Inbox className="h-4 w-4 text-primary" />
          </div>
          Collaboration Invites
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {invites.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invites.map((invite) => {
          const roleConf = roleConfig[invite.role];
          const RoleIcon = roleIcons[invite.role];
          const inviterName =
            invite.inviter_display_name || invite.inviter_username || "Someone";
          const botName = invite.bot_name || "a bot";

          return (
            <div
              key={invite.id}
              className="group relative flex flex-col gap-3 rounded-xl border border-border/70 bg-background/80 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:flex-row sm:items-center"
            >
              {/* Bot image */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-muted">
                  {invite.bot_image_url ? (
                    <img
                      src={invite.bot_image_url}
                      alt={botName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <BotIcon className="h-6 w-6 text-primary/40" />
                    </div>
                  )}
                </div>

                {/* Invite info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-medium">{inviterName}</span>{" "}
                    <span className="text-muted-foreground">
                      invited you to collaborate on
                    </span>{" "}
                    <span className="font-semibold text-foreground">
                      {botName}
                    </span>
                  </p>
                  {invite.bot_short_description && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                      {invite.bot_short_description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Inviter avatar */}
                    <div className="flex items-center gap-1">
                      <div className="h-4 w-4 rounded-full bg-primary/10 overflow-hidden shrink-0">
                        {invite.inviter_avatar_url ? (
                          <img
                            src={invite.inviter_avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserRound className="h-3 w-3 text-primary p-0.5" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        @{invite.inviter_username || "unknown"}
                      </span>
                    </div>
                    {/* Role badge */}
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        roleConf.className,
                      )}
                    >
                      <RoleIcon className="h-2.5 w-2.5 mr-0.5" />
                      {roleConf.label}
                    </Badge>
                    {/* Time */}
                    <span className="text-[10px] text-muted-foreground/60">
                      {new Date(invite.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 sm:flex-col">
                <Button
                  size="sm"
                  className="flex-1 cursor-pointer transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed sm:flex-none"
                  onClick={() => handleRespond(invite.id, true)}
                  disabled={respondingId === invite.id}
                >
                  {respondingId === invite.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" /> Accept
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 cursor-pointer transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed sm:flex-none"
                  onClick={() => handleRespond(invite.id, false)}
                  disabled={respondingId === invite.id}
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Decline
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
