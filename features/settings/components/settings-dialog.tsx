// ============================================================================
// Forgeworks - Settings Dialog
// General platform settings: appearance, notifications, data, shortcuts, security
// ============================================================================

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme, type Theme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { deleteCurrentAccount } from "@/features/settings/actions/delete-account";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { changePin, getSession } from "@/features/auth/actions/auth";
import {
  getNotificationPreferences,
  updateNotificationPreference,
} from "@/features/notifications/actions/preferences";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/features/notifications/lib/preferences";
import {
  Bell,
  Database,
  Download,
  ExternalLink,
  Keyboard,
  Loader2,
  Moon,
  Monitor,
  Palette,
  Shield,
  Sun,
  Trash2,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

type SettingsSection =
  | "appearance"
  | "notifications"
  | "data"
  | "shortcuts"
  | "account";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SessionInfo {
  userId: string;
  username: string;
  loggedInAt: string;
}

// ----------------------------------------------------------------------------
// Keyboard shortcuts reference
// ----------------------------------------------------------------------------

const shortcuts = [
  {
    category: "Search",
    items: [{ keys: ["/"], description: "Focus search" }],
  },
  {
    category: "Navigation",
    items: [
      {
        keys: ["Alt", "1"],
        description: "Open People",
      },
      {
        keys: ["Alt", "2"],
        description: "Open Resources",
      },
      {
        keys: ["Alt", "3"],
        description: "Open Logs",
      },
      {
        keys: ["Alt", "4"],
        description: "Open Dashboard",
      },
      {
        keys: ["Alt", "5"],
        description: "Open Bot Manager",
      },
      {
        keys: ["Alt", "6"],
        description: "Open Forms",
      },
      {
        keys: ["Alt", "7"],
        description: "Open Submissions",
      },
      {
        keys: ["Alt", "8"],
        description: "Open Moderation",
      },
      {
        keys: ["Alt", "9"],
        description: "Open Atlas",
      },
      {
        keys: ["Alt", "0"],
        description: "Open Creator Pages",
      },
    ],
  },
  {
    category: "Actions",
    items: [{ keys: ["Esc"], description: "Close dialog / cancel" }],
  },
];

const themeOptions: ReadonlyArray<{
  value: Theme;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const dataExports = [
  {
    label: "Bots",
    description: "Bots and related workspace data.",
    href: "/api/settings/export/bots",
  },
  {
    label: "Forms",
    description: "Forms, submissions, moderation data, and templates.",
    href: "/api/settings/export/forms",
  },
  {
    label: "Creator Pages",
    description: "Creator pages and their sections.",
    href: "/api/settings/export/creator-pages",
  },
  {
    label: "Atlas",
    description: "Worlds, lorebooks, entries, and related world data.",
    href: "/api/settings/export/atlas",
  },
] as const;

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("appearance");
  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  const [notificationPrefsLoading, setNotificationPrefsLoading] =
    useState(false);
  const [notificationPrefSaving, setNotificationPrefSaving] = useState<
    keyof NotificationPreferences | null
  >(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [changingPin, setChangingPin] = useState(false);

  // Load current account settings
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const loadSettings = async () => {
      setNotificationPrefsLoading(true);

      try {
        const supabase = createClient();

        const [access, session, preferencesResult] = await Promise.all([
          getCurrentUserAccess(supabase),
          getSession(),
          getNotificationPreferences(),
        ]);

        if (cancelled) return;

        setUsername(access.profile?.username ?? "");
        setSessionInfo(session as SessionInfo | null);

        if (preferencesResult.success) {
          setNotificationPrefs(preferencesResult.preferences);
        } else {
          setNotificationPrefs(DEFAULT_NOTIFICATION_PREFERENCES);

          console.error(
            "Failed to load notification preferences:",
            preferencesResult.error,
          );
        }
      } finally {
        if (!cancelled) {
          setNotificationPrefsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const validatePinValue = (value: string) => /^\d{4}$/.test(value);

  const handleChangePin = useCallback(async () => {
    const cleanUsername = username.toLowerCase().trim();
    if (!cleanUsername) {
      toast.error("Enter your username");
      return;
    }
    if (!validatePinValue(currentPin)) {
      toast.error("Current PIN must be exactly 4 digits");
      return;
    }
    if (!validatePinValue(newPin)) {
      toast.error("New PIN must be exactly 4 digits");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("New PIN confirmation does not match");
      return;
    }

    setChangingPin(true);
    try {
      const result = await changePin(cleanUsername, currentPin, newPin);
      if (!result.success) {
        toast.error(result.error || "Could not update PIN");
        return;
      }

      toast.success("PIN updated successfully");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (error) {
      console.error("Change PIN failed:", error);
      toast.error("Could not update PIN");
    } finally {
      setChangingPin(false);
    }
  }, [confirmPin, currentPin, newPin, username]);

  // Save notification prefs
  const updateNotificationPref = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      const previousValue = notificationPrefs[key];

      // Optimistic update
      setNotificationPrefs((prev) => ({
        ...prev,
        [key]: value,
      }));

      setNotificationPrefSaving(key);

      try {
        const result = await updateNotificationPreference(key, value);

        if (!result.success) {
          setNotificationPrefs((prev) => ({
            ...prev,
            [key]: previousValue,
          }));

          toast.error(
            result.error || "Could not update notification preference",
          );
          return;
        }

        setNotificationPrefs(result.preferences);
      } catch (error) {
        console.error("Notification preference update failed:", error);

        setNotificationPrefs((prev) => ({
          ...prev,
          [key]: previousValue,
        }));

        toast.error("Could not update notification preference");
      } finally {
        setNotificationPrefSaving(null);
      }
    },
    [notificationPrefs],
  );

  // Delete account
  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmText !== "DELETE") return;

    setDeleting(true);

    try {
      const result = await deleteCurrentAccount();

      if (!result.success) {
        throw new Error(result.error || "Could not delete account");
      }

      if ("storageCleanupWarning" in result && result.storageCleanupWarning) {
        console.warn(
          "Account deleted with Storage cleanup warning:",
          result.storageCleanupWarning,
        );
      }

      toast.success("Account deleted");

      window.location.href = "/login";
    } catch (error) {
      console.error("Account deletion failed:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete account. Contact support.",
      );
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setDeleteConfirmText("");
    }
  }, [deleteConfirmText]);

  // Section definitions
  const sections = useMemo(
    () => [
      {
        id: "appearance" as SettingsSection,
        label: "Appearance",
        icon: Palette,
      },
      {
        id: "notifications" as SettingsSection,
        label: "Notifications",
        icon: Bell,
      },
      {
        id: "data" as SettingsSection,
        label: "Data & Privacy",
        icon: Database,
      },
      {
        id: "shortcuts" as SettingsSection,
        label: "Shortcuts",
        icon: Keyboard,
      },
      {
        id: "account" as SettingsSection,
        label: "Account",
        icon: Shield,
      },
    ],
    [],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-hidden p-0 sm:max-w-3xl">
          <div className="flex h-full max-h-[85vh] flex-col overflow-hidden sm:flex-row">
            {/* ── Sidebar nav ── */}
            <nav className="shrink-0 border-b border-border/60 bg-muted/30 p-3 sm:border-b-0 sm:border-r sm:w-48 sm:p-4">
              <DialogHeader className="mb-3 sm:mb-4">
                <DialogTitle className="text-lg">Settings</DialogTitle>
                <DialogDescription className="text-xs">
                  Platform preferences
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-x-visible">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                        isActive
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* ── Content ── */}
            <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-5 sm:p-6">
              {/* Appearance */}
              {activeSection === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold">Appearance</h3>
                    <p className="text-sm text-muted-foreground">
                      Customize the look and feel of Forgeworks.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Theme</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {themeOptions.map((option) => {
                        const Icon = option.icon;
                        const isActive = theme === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setTheme(option.value)}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all cursor-pointer",
                              isActive
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border/60 hover:border-primary/30",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-5 w-5",
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground",
                              )}
                            />
                            <span
                              className={cn(
                                "text-sm font-medium",
                                isActive && "text-primary",
                              )}
                            >
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeSection === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold">Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose which in-app notification categories you want to
                      receive.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        key: "social" as const,
                        label: "Social",
                        description: "New followers and profile activity",
                      },
                      {
                        key: "collaborations" as const,
                        label: "Collaborations",
                        description:
                          "Invites, role changes, and important collaboration activity",
                      },
                      {
                        key: "moderation" as const,
                        label: "Moderation",
                        description:
                          "Flagged submissions and moderation alerts",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/30 p-4 transition-colors hover:bg-muted/20"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <Switch
                          checked={notificationPrefs[item.key]}
                          onCheckedChange={(value) =>
                            void updateNotificationPref(item.key, value)
                          }
                          disabled={
                            notificationPrefsLoading ||
                            notificationPrefSaving === item.key
                          }
                          className="cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data */}
              {activeSection === "data" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold">Data & Privacy</h3>
                    <p className="text-sm text-muted-foreground">
                      Export your account data and review Forgeworks&apos;
                      privacy information.
                    </p>
                  </div>

                  {/* Full export */}
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium">
                          Export account data
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Download a copy of your Forgeworks account data in a
                          single JSON file.
                        </p>
                      </div>
                      <Button asChild className="w-full shrink-0 sm:w-auto">
                        <a href="/api/settings/export/account">
                          <Download className="mr-2 h-4 w-4" />
                          Export account data
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Individual exports */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">
                        Individual exports
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Download data from a specific Forgeworks workspace.
                      </p>
                    </div>

                    {dataExports.map((item) => (
                      <div
                        key={item.href}
                        className="flex flex-col gap-3 rounded-xl border border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="w-full shrink-0 sm:w-auto"
                        >
                          <a href={item.href}>
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Export
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Privacy & legal
                    </Label>

                    <div className="rounded-xl border border-border/60 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium">
                            Privacy and terms
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Learn how Forgeworks handles your data and review
                            the platform rules.
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/privacy" target="_blank">
                              Privacy
                              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                            </Link>
                          </Button>

                          <Button variant="outline" size="sm" asChild>
                            <Link href="/terms" target="_blank">
                              Terms
                              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Shortcuts */}
              {activeSection === "shortcuts" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold">
                      Keyboard shortcuts
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Speed up your workflow with these shortcuts.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {shortcuts.map((group) => (
                      <div key={group.category} className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                          {group.category}
                        </h4>
                        <div className="space-y-1">
                          {group.items.map((item) => (
                            <div
                              key={item.description}
                              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/30"
                            >
                              <span className="text-sm min-w-0">
                                {item.description}
                              </span>
                              <div className="flex shrink-0 items-center gap-1">
                                {item.keys.map((key, i) => (
                                  <span key={i}>
                                    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border/60 bg-muted/50 px-1.5 text-[11px] font-medium text-muted-foreground">
                                      {key}
                                    </kbd>
                                    {i < item.keys.length - 1 && (
                                      <span className="mx-0.5 text-xs text-muted-foreground">
                                        +
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    More shortcuts coming soon. Some shortcuts may not be
                    available on all pages.
                  </p>
                </div>
              )}

              {/* Security */}
              {activeSection === "account" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold">Account</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your account, PIN, session, and account deletion.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Account</Label>
                    <div className="rounded-xl border border-border/60 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-medium">Username</p>
                          <p className="text-xs text-muted-foreground">
                            This is your login identifier.
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="shrink-0 truncate max-w-40"
                        >
                          {username || "Loading..."}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Change PIN</Label>
                    <div className="rounded-xl border border-border/60 p-4 space-y-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="current-pin" className="text-xs">
                            Current PIN
                          </Label>
                          <Input
                            id="current-pin"
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={currentPin}
                            onChange={(e) => setCurrentPin(e.target.value)}
                            placeholder="••••"
                            autoComplete="current-password"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="new-pin" className="text-xs">
                            New PIN
                          </Label>
                          <Input
                            id="new-pin"
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            placeholder="••••"
                            autoComplete="new-password"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirm-pin" className="text-xs">
                            Confirm PIN
                          </Label>
                          <Input
                            id="confirm-pin"
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value)}
                            placeholder="••••"
                            autoComplete="new-password"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="min-w-0 text-xs text-muted-foreground">
                          Enter your current PIN to authorize the change.
                        </p>
                        <Button
                          onClick={handleChangePin}
                          disabled={changingPin}
                          className="cursor-pointer shrink-0"
                        >
                          {changingPin ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Update PIN
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Session</Label>
                    <div className="rounded-xl border border-border/60 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-medium">Current session</p>
                          <p className="text-xs text-muted-foreground break-all">
                            {sessionInfo
                              ? `Signed in as @${sessionInfo.username} · ${new Date(sessionInfo.loggedInAt).toLocaleString()}`
                              : "No active session found"}
                          </p>
                        </div>
                        <Badge
                          variant="default"
                          className={cn(
                            "shrink-0",
                            sessionInfo
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {sessionInfo ? "Active" : "Unavailable"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-destructive">
                      Danger zone
                    </Label>
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium text-destructive">
                            Delete account
                          </p>
                          <p className="text-xs text-muted-foreground">
                            This opens a confirmation dialog before anything is
                            deleted.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteConfirmOpen(true)}
                          className="cursor-pointer shrink-0"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete account
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete account confirmation ── */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account, all your bots, forms,
              submissions, Atlas worlds, lorebooks, and entries. Nothing is
              removed yet until you confirm below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 px-6">
            <Label htmlFor="delete-confirm" className="text-sm">
              Type <span className="font-mono font-semibold">DELETE</span> to
              confirm:
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              onClick={() => {
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || deleting}
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete my account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
