// ============================================================================
// Forgeworks - Follow List Modal
// Shows followers or following list in a dialog
// ============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, UserRound, UsersRound } from "lucide-react";
import { getFollowers, getFollowing } from "@/features/profile/actions/profile";
import Link from "next/link";
import { getReadableProfileAccentColor } from "@/features/profile/lib/profile-theme";

interface FollowUser {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  slug: string | null;
  tagline: string | null;
  followed_at?: string;
}

interface FollowListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  tab: "followers" | "following";
  themeColor?: string;
  isOwnProfile?: boolean;
}

export function FollowListModal({
  open,
  onOpenChange,
  userId,
  tab,
  themeColor = "#7c3aed",
  isOwnProfile = false,
}: FollowListModalProps) {
  const readableThemeColor = getReadableProfileAccentColor(themeColor);
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"followers" | "following">(tab);

  const loadUsers = useCallback(
    async (type: "followers" | "following") => {
      setLoading(true);
      try {
        const result =
          type === "followers"
            ? await getFollowers(userId)
            : await getFollowing(userId);
        setUsers(result.users as FollowUser[]);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (open) {
      setActiveTab(tab);
      loadUsers(tab);
    }
  }, [open, tab, loadUsers]);

  const handleTabChange = (newTab: "followers" | "following") => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    loadUsers(newTab);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Connections</DialogTitle>
          <DialogDescription className="sr-only">
            View followers and following
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "followers"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => handleTabChange("followers")}
          >
            Followers
          </button>
          <button
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "following"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => handleTabChange("following")}
          >
            Following
          </button>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-1">
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={user.username ? `/profile/${user.username}` : "#"}
                  onClick={() => onOpenChange(false)}
                >
                  <div className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted cursor-pointer">
                    <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.display_name || "User"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserRound
                          className="h-5 w-5"
                          style={{ color: readableThemeColor }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.display_name || user.username || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.username
                          ? `@${user.username}`
                          : user.tagline || ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-3">
                <UsersRound className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                {activeTab === "followers"
                  ? "No followers yet"
                  : isOwnProfile
                    ? "You're not following anyone yet"
                    : "Not following anyone yet"}
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                {activeTab === "followers"
                  ? isOwnProfile
                    ? "When someone follows you, they'll appear here."
                    : "No one follows this creator yet."
                  : isOwnProfile
                    ? "People you follow will appear here."
                    : "This creator isn't following anyone yet."}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
