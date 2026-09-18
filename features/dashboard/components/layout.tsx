// ============================================================================
// Forgeworks - Dashboard Layout
// Main layout wrapper with sidebar navigation
// ============================================================================

"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Bot,
  FileText,
  Inbox,
  Globe,
  BookOpen,
  Users,
  ChevronLeft,
  ChevronRight,
  Hash,
  LogOut,
  UserRound,
  Shield,
  Menu,
  AppWindow,
  Images,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "@/features/auth/actions/auth";
import { cn } from "@/lib/utils";
import { useStore } from "@/features/app-shell/store/app-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Image from "next/image";
import type { NavigationView } from "@/features/app-shell/types/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { getOwnProfile } from "@/features/profile/actions/profile";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { WhatsNewButton } from "@/features/changelog/components/whats-new";
import { SettingsDialog } from "@/features/settings/components/settings-dialog";
import { Settings } from "lucide-react";

// ----------------------------------------------------------------------------
// Navigation Configuration
// ----------------------------------------------------------------------------

interface NavItem {
  id: NavigationView;
  label: string;
  icon: typeof LayoutDashboard;
  color?: string;
  activeBg?: string;
  description: string;
}

type NavSectionId = "hub" | "forge" | "admin";

const NAV_SECTION_STORAGE_KEY = "dashboard-nav-section-collapsed";

const hubNavItems: NavItem[] = [
  {
    id: "profiles",
    label: "People",
    icon: Users,
    color: "text-purple-500",
    activeBg: "bg-purple-500/10",
    description: "Browse creator profiles and discover new accounts",
  },
  {
    id: "resources",
    label: "Resources",
    icon: BookOpen,
    color: "text-purple-500",
    activeBg: "bg-purple-500/10",
    description: "Directory of Janitor resources and references",
  },
  {
    id: "community",
    label: "Community",
    icon: Hash,
    color: "text-purple-500",
    activeBg: "bg-purple-500/10",
    description:
      "Visit a community area for platform updates, reports, issues, feedback, and discussion",
  },
];

const forgeNavItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "text-primary",
    activeBg: "bg-primary/10",
    description: "Overview and quick stats",
  },
  {
    id: "bots",
    label: "Bot Manager",
    icon: Bot,
    color: "text-green-500",
    activeBg: "bg-green-500/10",
    description: "Create and manage your bots",
  },
  {
    id: "forms",
    label: "Forms",
    icon: FileText,
    color: "text-muted-foreground",
    activeBg: "bg-primary/10",
    description: "Design custom forms",
  },
  {
    id: "requests",
    label: "Submissions",
    icon: Inbox,
    color: "text-blue-500",
    activeBg: "bg-blue-500/10",
    description: "Manage incoming submissions",
  },
  {
    id: "moderation",
    label: "Moderation",
    icon: Shield,
    color: "text-orange-500",
    activeBg: "bg-orange-500/10",
    description: "Review flagged submissions",
  },
  {
    id: "atlas",
    label: "Atlas",
    icon: Globe,
    color: "text-pink-500",
    activeBg: "bg-pink-500/10",
    description: "Organize series, lore, and creator spaces",
  },
  {
    id: "creator-pages",
    label: "Creator Pages",
    icon: AppWindow,
    color: "text-yellow-500",
    activeBg: "bg-yellow-500/10",
    description: "Design and manage public creator pages",
  },
  {
    id: "media",
    label: "My Media",
    icon: Images,
    color: "text-violet-500",
    activeBg: "bg-violet-500/10",
    description: "Manage images reused across your creator tools",
  },
];

// ----------------------------------------------------------------------------
// Dashboard Layout Component
// ----------------------------------------------------------------------------

interface DashboardLayoutProps {
  children: ReactNode;
  username: string;
}

export function DashboardLayout({ children, username }: DashboardLayoutProps) {
  const { currentView, setCurrentView, requests, forms } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<NavSectionId, boolean>
  >({ hub: false, forge: false, admin: false });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [pendingModerationCount, setPendingModerationCount] = useState(0);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem(NAV_SECTION_STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<
        Record<NavSectionId, boolean>
      >;
      setCollapsedSections((prev) => ({
        hub: parsed.hub ?? prev.hub,
        forge: parsed.forge ?? prev.forge,
        admin: parsed.admin ?? prev.admin,
      }));
    } catch {
      // Ignore malformed persisted state.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      NAV_SECTION_STORAGE_KEY,
      JSON.stringify(collapsedSections),
    );
  }, [collapsedSections]);

  // Load profile avatar on mount
  useEffect(() => {
    let mounted = true;
    getOwnProfile().then((result) => {
      if (!mounted) return;
      if (result.success && result.profile) {
        setUserAvatarUrl(result.profile.avatar_url || null);
        setUserDisplayName(result.profile.display_name || null);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);
  const isMobile = useIsMobile();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const supabase = createClient();
        const access = await getCurrentUserAccess(supabase);
        if (!mounted) return;

        if (access.isBlocked) {
          await logout();
          router.replace("/login");
          router.refresh();
          setCurrentUserId(null);
          setIsStaff(false);
          return;
        }

        setCurrentUserId(access.user?.id ?? null);
        setIsStaff(access.isStaff);
      } catch {
        if (!mounted) return;
        setCurrentUserId(null);
        setIsStaff(false);
      } finally {
        if (mounted) setAccessLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const formOwnerMap = useMemo(
    () => new Map(forms.map((form) => [form.id, form.ownerId ?? null])),
    [forms],
  );

  const newRequestsCount = accessLoaded
    ? requests.filter((request) => {
        if (request.status !== "new" || !currentUserId) return false;
        const formOwnerId = formOwnerMap.get(request.formId);
        return (
          request.ownerId === currentUserId || formOwnerId === currentUserId
        );
      }).length
    : 0;

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!accessLoaded || !currentUserId) {
        if (mounted) setPendingModerationCount(0);
        return;
      }

      try {
        const supabase = createClient();
        const { count, error } = await supabase
          .from("flagged_requests")
          .select("id, requests!inner(id)", { count: "exact", head: true })
          .eq("reviewed", false)
          .is("requests.deleted_at", null);

        if (!mounted) return;

        if (error) {
          console.error("Failed to load moderation count:", error);
          setPendingModerationCount(0);
          return;
        }

        setPendingModerationCount(count || 0);
      } catch {
        if (mounted) setPendingModerationCount(0);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [accessLoaded, currentUserId]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  const handleNavClick = (view: NavigationView) => {
    if (view === "resources") {
      router.push("/resources");

      if (isMobile) {
        setMobileMenuOpen(false);
      }

      return;
    }

    if (view === "atlas") {
      router.push("/atlas");

      if (isMobile) {
        setMobileMenuOpen(false);
      }

      return;
    }

    setCurrentView(view);

    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || !event.altKey) return;
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement ||
        (document.activeElement instanceof HTMLElement &&
          document.activeElement.isContentEditable)
      ) {
        return;
      }

      const nextView: NavigationView | null =
        event.key === "1"
          ? "profiles"
          : event.key === "2"
            ? "resources"
            : event.key === "3"
              ? "community"
              : event.key === "4"
                ? "dashboard"
                : event.key === "5"
                  ? "bots"
                  : event.key === "6"
                    ? "forms"
                    : event.key === "7"
                      ? "requests"
                      : event.key === "8"
                        ? "moderation"
                        : event.key === "9"
                          ? "atlas"
                          : event.key === "0"
                            ? "creator-pages"
                            : null;

      if (!nextView) return;

      event.preventDefault();
      handleNavClick(nextView);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNavClick]);

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = currentView === item.id;
    const showBadge = item.id === "requests" && newRequestsCount > 0;
    const showModerationBadge =
      item.id === "moderation" && pendingModerationCount > 0;
    const badgeValue =
      item.id === "requests"
        ? newRequestsCount
        : item.id === "moderation"
          ? pendingModerationCount
          : 0;

    const button = (
      <Button
        key={item.id}
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 transition-all cursor-pointer",
          isActive &&
            cn(
              "cursor-default",
              item.activeBg || "bg-sidebar-accent/50",
              item.color || "text-sidebar-accent-foreground",
            ),
          !isActive &&
            "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
          collapsed && "justify-center px-2",
        )}
        onClick={() => handleNavClick(item.id)}
      >
        <div className="relative flex items-center justify-center">
          <Icon className={cn("h-5 w-5", item.color)} />

          {(showBadge || showModerationBadge) && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {badgeValue}
            </span>
          )}
        </div>
        {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
      </Button>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-1">
            <span className="font-medium">{item.label}</span>
            <span className="text-xs text-muted-foreground">
              {item.description}
            </span>
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  const toggleSection = (sectionId: NavSectionId) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const renderNavSection = (
    sectionId: NavSectionId,
    title: string,
    items: NavItem[],
  ) => (
    <div className="space-y-1">
      {!collapsed && (
        <button
          type="button"
          className="flex w-full items-center cursor-pointer justify-between px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:bg-primary/15 rounded-lg hover:text-foreground"
          onClick={() => toggleSection(sectionId)}
          aria-expanded={!collapsedSections[sectionId]}
        >
          <span>{title}</span>
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300 ease-out",
              !collapsedSections[sectionId] && "rotate-90",
            )}
          />
        </button>
      )}
      {collapsed && (
        <button
          type="button"
          className="flex w-full items-center cursor-pointer justify-center px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:bg-primary/15 rounded-lg hover:text-foreground"
          onClick={() => toggleSection(sectionId)}
          aria-expanded={!collapsedSections[sectionId]}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300 ease-out",
              !collapsedSections[sectionId] && "rotate-90",
            )}
          />
        </button>
      )}
      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
          collapsedSections[sectionId] ? "opacity-0" : "opacity-100",
        )}
        style={{
          maxHeight: collapsedSections[sectionId] ? 0 : 600,
        }}
      >
        <div
          className={cn(
            "space-y-1 pt-1 transition-opacity duration-300 ease-out",
            collapsedSections[sectionId] && "pointer-events-none",
          )}
        >
          {items.map(renderNavItem)}
        </div>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
            collapsed ? "w-16" : "w-64",
          )}
          style={
            {
              "--accent": "oklch(0.15 0.22 295)",
            } as React.CSSProperties
          }
        >
          {/* Logo */}
          <div
            className={cn(
              "flex h-16 items-center border-b border-sidebar-border px-4",
              collapsed ? "justify-center" : "gap-3",
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 neon-glow-sm">
              <Image
                src="/logo.svg"
                alt="Forgeworks Logo"
                width={24}
                height={24}
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-semibold text-sidebar-foreground">
                  Forgeworks (Beta)
                </span>
                <span className="text-xs text-muted-foreground">
                  Bot Creator Toolkit
                </span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 min-h-0 space-y-3 overflow-y-auto p-2 pr-1">
            {renderNavSection("hub", "Hub", hubNavItems)}
            <div className="border-t border-sidebar-border/60 pt-2">
              {renderNavSection("forge", "Forge", forgeNavItems)}
            </div>
            {isStaff && (
              <div className="border-t border-sidebar-border/60 pt-2">
                {renderNavSection("admin", "Admin", [
                  {
                    id: "feedback",
                    label: "Feedback Inbox",
                    icon: Inbox,
                    color: "text-purple-500",
                    activeBg: "bg-purple-500/10",
                    description: "Review admin feedback and suggestions",
                  },
                  {
                    id: "admin",
                    label: "Admin Panel",
                    icon: ShieldAlert,
                    color: "text-purple-500",
                    activeBg: "bg-purple-500/10",
                    description: "Manage users, content, and platform settings",
                  },
                ])}
              </div>
            )}
          </nav>

          {/* Collapse Toggle & User */}
          <div className="border-t border-sidebar-border p-2 space-y-2">
            {/* User Info — clickable to open profile, with notification bell */}
            <button
              className={cn(
                "flex w-full items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent/50 text-left transition-colors hover:bg-sidebar-accent cursor-pointer",
                collapsed && "justify-center",
              )}
              onClick={() => setCurrentView("profile")}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 overflow-hidden shrink-0">
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt={userDisplayName || username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-4 w-4 text-primary" />
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1 text-sm font-medium truncate">
                    {userDisplayName || username}
                  </span>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="cursor-pointer h-7 w-7"
                          onClick={() => setSettingsOpen(true)}
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Settings</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <WhatsNewButton />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">What&apos;s new</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger>
                        <NotificationBell />
                      </TooltipTrigger>
                      <TooltipContent side="top">Notifications</TooltipContent>
                    </Tooltip>
                  </div>
                </>
              )}
            </button>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full hover:text-white hover:bg-destructive/10 cursor-pointer",
                collapsed ? "justify-center" : "justify-start gap-2",
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 text-destructive" />
              {!collapsed && <span>Sign Out</span>}
            </Button>

            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center cursor-pointer"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background relative">
          {/* Mobile Top Bar */}
          {isMobile && (
            <div className="absolute top-3 left-3 right-3 z-40 flex items-center justify-between md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-1">
                <WhatsNewButton />
                <NotificationBell />
              </div>
            </div>
          )}

          {/* Mobile Sidebar Menu */}
          {isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetContent
                side="left"
                className="w-64 p-0"
                style={
                  {
                    "--accent": "oklch(0.15 0.22 295)",
                  } as React.CSSProperties
                }
              >
                <SheetHeader className="border-b border-sidebar-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 neon-glow-sm overflow-hidden">
                      <Image
                        src="/logo.svg"
                        alt="Forgeworks Logo"
                        width={24}
                        height={24}
                      />
                    </div>
                    <div className="flex flex-col">
                      <SheetTitle>Forgeworks (Beta)</SheetTitle>
                      <SheetDescription>Bot Creator Toolkit</SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                {/* Mobile Navigation */}
                <nav className="flex-1 min-h-0 space-y-3 overflow-y-auto p-2 pr-1">
                  {renderNavSection("hub", "Hub", hubNavItems)}
                  <div className="border-t border-sidebar-border/60 pt-2">
                    {renderNavSection("forge", "Forge", forgeNavItems)}
                  </div>
                  {isStaff && (
                    <div className="border-t border-sidebar-border/60 pt-2">
                      {renderNavSection("admin", "Admin", [
                        {
                          id: "feedback",
                          label: "Feedback Inbox",
                          icon: Inbox,
                          color: "text-purple-500",
                          activeBg: "bg-purple-500/10",
                          description: "Review admin feedback and suggestions",
                        },
                        {
                          id: "admin",
                          label: "Admin Panel",
                          icon: ShieldAlert,
                          color: "text-purple-500",
                          activeBg: "bg-purple-500/10",
                          description:
                            "Manage users, content, and platform settings",
                        },
                      ])}
                    </div>
                  )}
                </nav>

                {/* Mobile User & Logout */}
                <div className="border-t border-sidebar-border p-2 space-y-2">
                  {/* Profile — clickable */}
                  <button
                    className="flex w-full items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent/50 text-left transition-colors hover:bg-sidebar-accent cursor-pointer"
                    onClick={() => {
                      handleNavClick("profile");
                    }}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 overflow-hidden shrink-0">
                      {userAvatarUrl ? (
                        <img
                          src={userAvatarUrl}
                          alt={userDisplayName || username}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserRound className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <span className="flex-1 text-sm font-medium truncate">
                      {userDisplayName || username}
                    </span>
                  </button>
                  <WhatsNewButton
                    compact={false}
                    className="w-full justify-start"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full cursor-pointer justify-start gap-2"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setSettingsOpen(true);
                    }}
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Settings</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:text-white hover:bg-destructive/10 cursor-pointer justify-start gap-2"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )}

          <div className="h-full pt-16 md:pt-0">
            <div
              key={currentView}
              className="h-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out"
            >
              {children}
            </div>
          </div>

          {/* Settings Dialog — mounted at root so it's accessible from anywhere */}
          <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        </main>
      </div>
    </TooltipProvider>
  );
}
