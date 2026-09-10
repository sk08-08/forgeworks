// ============================================================================
// Forgeworks - Dashboard Home View
// Dynamic workspace dashboard with animated hero, timeline, and quick actions
// ============================================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  BotIcon,
  CalendarDays,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Inbox,
  Lightbulb,
  ListChecks,
  Star,
  Upload,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/features/app-shell/store/app-store";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { FeedbackActions } from "@/features/feedback/components/feedback-actions";
import type { NavigationView } from "@/features/app-shell/types/navigation";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(date);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// function getDailyFlavorText(hour: number): string {
//   if (hour < 10)
//     return "Good morning! Great time to bring a new character idea to life.";
//   if (hour < 14)
//     return "Keep the momentum going. Take a moment to review requests or polish your bots.";
//   if (hour < 19)
//     return "Good time to check the queue and knock out some pending submissions.";
//   return "It's getting late. Wrap things up and we'll keep building tomorrow.";
// }

// ----------------------------------------------------------------------------
// UI Components
// ----------------------------------------------------------------------------

interface WorkspaceStats {
  totalBots: number;
  activeForms: number;
  pendingRequests: number;
  completedRequests: number;
}

interface StatTileProps {
  title: string;
  value: number;
  subtitle: string;
  icon: typeof Bot;
  toneClassName: string;
  onClick?: () => void;
}

function StatTile({
  title,
  value,
  subtitle,
  icon: Icon,
  toneClassName,
  onClick,
}: StatTileProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "dashboard-rise-item shadow-md dark:shadow-primary/15 overflow-hidden border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75 transition-all",
        onClick &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-border/60",
              toneClassName,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

interface TimelineItem {
  id: string;
  title: string;
  imageUrl?: string;
  description: string;
  when: Date;
  icon: typeof Activity;
  toneClassName: string;
  targetView?: NavigationView;
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl shadow-md dark:shadow-primary/15 border border-dashed border-border/70 bg-muted/20 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      <Button className="mt-5 cursor-pointer" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

function ChecklistStep({
  label,
  done,
  onAction,
}: {
  label: string;
  done: boolean;
  onAction: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAction}
      data-state={done ? "on" : "off"}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl data-[state=off]:cursor-pointer data-[state=on]:cursor-default border px-3 py-2.5 text-left transition-colors",
        done
          ? "border-primary/30 bg-primary/10"
          : "border-border/70 bg-background/60 hover:bg-primary/5",
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          done
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        {done ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <Clock3 className="h-3.5 w-3.5" />
        )}
      </div>
      <span
        className={cn(
          "text-sm",
          done ? "text-muted-foreground line-through" : "font-medium",
        )}
      >
        {label}
      </span>
      <ChevronRight
        className={cn(
          "ml-auto h-4 w-4 text-muted-foreground transition-transform",
          !done && "group-hover:translate-x-1",
        )}
      />
    </button>
  );
}

// ----------------------------------------------------------------------------
// Dashboard Home Component
// ----------------------------------------------------------------------------

export function DashboardHome() {
  const {
    bots,
    forms,
    requests,
    setCurrentView,
    setSelectedBotId,
    collaborativeBots,
    refreshCollaborativeBots,
  } = useStore();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [accessLoaded, setAccessLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const supabase = createClient();
        const access = await getCurrentUserAccess(supabase);

        if (!mounted) return;
        setCurrentUserId(access.user?.id ?? null);
        setUserName(
          access.profile?.display_name ||
            access.profile?.username ||
            access.user?.email?.split("@")[0] ||
            null,
        );
      } catch {
        if (!mounted) return;
        setCurrentUserId(null);
      } finally {
        if (mounted) setAccessLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (accessLoaded && currentUserId) {
      refreshCollaborativeBots();
    }
  }, [accessLoaded, currentUserId, refreshCollaborativeBots]);

  const formOwnerMap = useMemo(
    () => new Map(forms.map((form) => [form.id, form.ownerId ?? null])),
    [forms],
  );

  const visibleBots =
    accessLoaded && currentUserId
      ? bots.filter((bot) => bot.ownerId === currentUserId)
      : [];

  const visibleForms =
    accessLoaded && currentUserId
      ? forms.filter((form) => form.ownerId === currentUserId)
      : [];

  const visibleRequests =
    accessLoaded && currentUserId
      ? requests.filter((request) => {
          if (request.ownerId === currentUserId) return true;
          const formOwnerId = formOwnerMap.get(request.formId);
          return formOwnerId === currentUserId;
        })
      : [];

  const stats: WorkspaceStats = {
    totalBots: visibleBots.length,
    activeForms: visibleForms.filter((form) => form.isActive).length,
    pendingRequests: visibleRequests.filter(
      (request) => request.status === "new" || request.status === "accepted",
    ).length,
    completedRequests: visibleRequests.filter(
      (request) => request.status === "completed",
    ).length,
  };

  const totalRequests = visibleRequests.length;
  const completionRate =
    totalRequests > 0
      ? Math.round((stats.completedRequests / totalRequests) * 100)
      : 0;
  const activeFormRate =
    visibleForms.length > 0
      ? Math.round((stats.activeForms / visibleForms.length) * 100)
      : 0;

  const recentBots = [...visibleBots]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 4);

  const recentRequests = [...visibleRequests]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 4);

  const oldestPendingRequest = [...visibleRequests]
    .filter(
      (request) => request.status === "new" || request.status === "accepted",
    )
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

  const heroMessage = useMemo(() => {
    if (stats.totalBots === 0) {
      return "Your studio is empty. Let's start by creating your first character.";
    }
    if (stats.pendingRequests >= 6) {
      return "Your queue is piling up. Take a look and clear out some submissions.";
    }
    if (stats.activeForms === 0 && visibleForms.length > 0) {
      return "Your forms are paused. Reactivate one whenever you're ready to receive requests again.";
    }
    if (stats.completedRequests >= 12) {
      return "You're on a roll! You've been clearing a lot of requests lately.";
    }
    return "Everything looks good. Your workspace is ready for you to keep creating.";
  }, [stats, visibleForms.length]);

  const heroPrimaryAction = useMemo(() => {
    if (stats.totalBots === 0) {
      return {
        label: "Create first bot",
        subtitle: "Start from scratch or import a card",
        icon: Bot,
        onClick: () => setCurrentView("bots"),
      };
    }

    if (stats.pendingRequests > 0) {
      return {
        label: "Review submissions",
        subtitle: `${stats.pendingRequests} waiting in queue`,
        icon: Inbox,
        onClick: () => setCurrentView("requests"),
      };
    }

    return {
      label: "Design next form",
      subtitle: "Add a new entry point for requests",
      icon: FileText,
      onClick: () => setCurrentView("forms"),
    };
  }, [setCurrentView, stats]);

  const checklistSteps = useMemo(
    () => [
      {
        id: "bot",
        label: "Create or update one bot",
        done: stats.totalBots > 0,
        onAction: () => setCurrentView("bots"),
      },
      {
        id: "form",
        label: "Keep at least one form active",
        done: stats.activeForms > 0,
        onAction: () => setCurrentView("forms"),
      },
      {
        id: "submission",
        label: "Process pending submissions",
        done: stats.pendingRequests === 0,
        onAction: () => setCurrentView("requests"),
      },
      {
        id: "profile",
        label: "Polish your public profile",
        done: false,
        onAction: () => setCurrentView("profile"),
      },
    ],
    [setCurrentView, stats],
  );

  const completedChecklistSteps = checklistSteps.filter(
    (step) => step.done,
  ).length;
  const checklistProgress = Math.round(
    (completedChecklistSteps / checklistSteps.length) * 100,
  );

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    recentBots.slice(0, 3).forEach((bot) => {
      items.push({
        id: `bot-${bot.id}`,
        imageUrl: bot.imageUrl,
        title: `Updated ${bot.name}`,
        description: "Bot content and metadata adjusted",
        when: bot.updatedAt,
        icon: Bot,
        toneClassName: "bg-green-500/10 text-green-600",
        targetView: "bots",
      });
    });

    recentRequests.slice(0, 4).forEach((request) => {
      const done = request.status === "completed";
      items.push({
        id: `req-${request.id}`,
        title: done ? "Submission completed" : "Submission received",
        description: `${request.submitterName || "Anonymous"} • ${request.formTitle}`,
        when: request.createdAt,
        icon: done ? CheckCircle : Inbox,
        toneClassName: done
          ? "bg-primary-500/10 text-primary"
          : "bg-blue-500/10 text-blue-600",
        targetView: "requests",
      });
    });

    visibleForms.slice(0, 2).forEach((form) => {
      items.push({
        id: `form-${form.id}`,
        title: `Form ${form.isActive ? "live" : "paused"}`,
        description: form.title,
        when: form.updatedAt,
        icon: FileText,
        toneClassName: form.isActive
          ? "bg-muted-foreground/10 text-foreground/90"
          : "bg-muted text-muted-foreground",
        targetView: "forms",
      });
    });

    collaborativeBots.slice(0, 2).forEach((bot) => {
      items.push({
        id: `shared-${bot.id}`,
        title: `Shared bot: ${bot.name}`,
        description: `Role: ${bot.collaborator_role || "collaborator"}`,
        when: bot.updated_at ? new Date(bot.updated_at) : new Date(),
        icon: UsersRound,
        toneClassName: "bg-violet-500/10 text-violet-600",
        targetView: "bots",
      });
    });

    return items
      .sort((a, b) => b.when.getTime() - a.when.getTime())
      .slice(0, 8);
  }, [collaborativeBots, recentBots, recentRequests, visibleForms]);

  const quickActions = useMemo(
    () => [
      {
        id: "bot-create",
        title: "Create new bot",
        description: "Draft personality, scenario, and first message",
        icon: Bot,
        toneClassName: "bg-green-500/10 text-green-600",
        onClick: () => setCurrentView("bots"),
      },
      {
        id: "import-card",
        title: "Import character",
        description: "Bring PNG/JSON card data into your workspace",
        icon: Upload,
        toneClassName: "bg-emerald-500/10 text-emerald-600",
        onClick: () => setCurrentView("bots"),
      },
      {
        id: "new-form",
        title: "Design form",
        description: "Create an intake flow for submissions",
        icon: FileText,
        toneClassName: "bg-muted-foreground/10 text-muted-foreground/90",
        onClick: () => setCurrentView("forms"),
      },
      {
        id: "review-queue",
        title: "Triage queue",
        description:
          stats.pendingRequests > 0
            ? `${stats.pendingRequests} pending items`
            : "Queue currently clear",
        icon: BarChart3,
        toneClassName: "bg-amber-500/10 text-amber-600",
        onClick: () => setCurrentView("requests"),
      },
      {
        id: "atlas",
        title: "Open atlas",
        description: "Organize worlds, lorebooks, and relationships",
        icon: BookOpen,
        toneClassName: "bg-pink-500/10 text-pink-600",
        onClick: () => setCurrentView("atlas"),
      },
      {
        id: "profile",
        title: "Improve profile",
        description: "Refine your public creator page",
        icon: Star,
        toneClassName: "bg-muted-foreground/10 text-muted-foreground/90",
        onClick: () => setCurrentView("profile"),
      },
    ],
    [setCurrentView, stats.pendingRequests],
  );

  const isNewUser =
    accessLoaded &&
    currentUserId &&
    stats.totalBots === 0 &&
    visibleForms.length === 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-8 w-full min-w-0">
        <Card className="dashboard-hero dark:shadow-primary/40 relative overflow-hidden border border-border/70 bg-linear-to-br from-background via-background/90 to-primary/6 shadow-[0_20px_70px_-30px_rgba(0,0,0,0.25)] w-full min-w-0">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(120,119,198,0.12),transparent_48%)]" />

          <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
            <div className="absolute top-[10%] right-[-10%] h-64 w-64 rounded-full bg-primary/10 blur-[60px] sm:top-[20%] sm:right-[10%] sm:bg-primary/20" />
            <div className="absolute bottom-[-10%] left-[-10%] h-40 w-40 rounded-full bg-purple-500/10 blur-[50px] animate-pulse sm:bottom-0 sm:left-[10%] sm:bg-purple-500/20" />

            <WandSparkles className="absolute top-[15%] right-[10%] h-6 w-6 text-primary/30 anim-float-2 sm:top-[10%] sm:left-[55%] sm:h-7 sm:w-7" />
            <Star className="absolute bottom-[20%] right-[20%] h-4 w-4 text-purple-400/40 anim-float-1 sm:right-[10%] sm:h-5 sm:w-5" />
            <div className="absolute top-[40%] left-[5%] h-2 w-2 rounded-full bg-emerald-500/30 anim-float-3 sm:h-2.5 sm:w-2.5" />
            <div className="absolute bottom-[15%] left-[10%] h-3 w-3 rounded-full border-2 border-primary/30 anim-float-2 sm:bottom-[10%] sm:left-[25%] sm:h-3.5 sm:w-3.5" />
          </div>

          <CardContent className="relative z-10 grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_1.3fr] lg:items-center min-h-90 w-full min-w-0">
            <style
              dangerouslySetInnerHTML={{
                __html: `
      @keyframes float-1 {
        0%, 100% { transform: translateY(0px) rotate(-6deg); }
        50% { transform: translateY(-15px) rotate(-4deg); }
      }
      @keyframes float-2 {
        0%, 100% { transform: translateY(0px) rotate(8deg); }
        50% { transform: translateY(-20px) rotate(10deg); }
      }
      @keyframes float-3 {
        0%, 100% { transform: translateY(0px) rotate(-3deg); }
        50% { transform: translateY(-12px) rotate(-5deg); }
      }
      .anim-float-1 { animation: float-1 6s ease-in-out infinite; }
      .anim-float-2 { animation: float-2 7s ease-in-out infinite 1s; }
      .anim-float-3 { animation: float-3 5s ease-in-out infinite 0.5s; }
    `,
              }}
            />

            <div className="space-y-5 relative z-20 flex flex-col items-center text-center lg:items-start lg:text-left w-full min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-background/50 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-md">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>

              <div className="space-y-3 w-full min-w-0">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl leading-[1.1] wrap-break-word">
                  {getGreeting()}, <br />
                  <span className="bg-linear-to-r from-primary via-purple-400 to-primary bg-clip-text font-serif text-transparent italic pr-2">
                    {userName ? userName : "Creator"}
                  </span>
                </h1>

                <p className="max-w-md text-base text-muted-foreground leading-relaxed mx-auto lg:mx-0 wrap-break-word">
                  {heroMessage}
                </p>
              </div>

              <div className="flex flex-wrap justify-center lg:justify-start gap-3 pt-2 w-full">
                <Button
                  className="cursor-pointer rounded-full px-6 shadow-md shadow-primary/20 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px] hover:shadow-primary/40"
                  onClick={heroPrimaryAction.onClick}
                >
                  <heroPrimaryAction.icon className="mr-2 h-4 w-4" />
                  {heroPrimaryAction.label}
                </Button>
              </div>
            </div>

            <div className="relative hidden lg:block h-full w-full min-h-75">
              <div className="relative h-full w-full">
                {recentBots.length > 0 ? (
                  recentBots.slice(0, 3).map((bot, index) => {
                    const layoutStyles = [
                      "top-[0%] left-[8%] anim-float-1 z-10",
                      "top-[15%] right-[0%] anim-float-2 z-20 scale-110",
                      "bottom-[0%] left-[40%] anim-float-3 z-30",
                    ];

                    return (
                      <div
                        key={bot.id}
                        onClick={() => {
                          setSelectedBotId(bot.id);
                          setCurrentView("bots");
                        }}
                        className={cn(
                          "absolute flex w-37.5 cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/70 p-2 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-125 hover:rotate-0! hover:z-50 hover:bg-card hover:shadow-primary/50",
                          layoutStyles[index] || "top-1/2 left-1/2",
                        )}
                      >
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted/50">
                          {bot.imageUrl ? (
                            <img
                              src={bot.imageUrl}
                              alt={bot.name}
                              className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-primary/10">
                              <BotIcon className="h-8 w-8 text-primary/50" />
                            </div>
                          )}
                          <Badge
                            variant={
                              bot.rating === "SFW" ? "secondary" : "destructive"
                            }
                            className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] backdrop-blur-md shadow-sm"
                          >
                            {bot.rating}
                          </Badge>
                        </div>
                        <div className="mt-2 px-1 pb-1 w-full min-w-0">
                          <p className="truncate text-xs font-bold text-foreground">
                            {bot.name}
                          </p>
                          <p className="truncate text-[9px] text-muted-foreground">
                            Edited {formatRelativeTime(bot.updatedAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center anim-float-1">
                    <div className="flex h-28 w-20 rounded-2xl border border-white/10 bg-card/60 shadow-2xl backdrop-blur-xl p-2.5">
                      <div className="w-full h-full border-2 border-dashed border-primary/40 rounded-xl flex items-center justify-center">
                        <WandSparkles className="h-5 w-5 text-primary/50" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="dashboard-stagger-grid grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 w-full min-w-0">
          <StatTile
            title="Total Bots"
            value={stats.totalBots}
            subtitle="Characters created"
            icon={Bot}
            toneClassName="bg-green-500/10 text-green-600"
            onClick={() => setCurrentView("bots")}
          />
          <StatTile
            title="Active Forms"
            value={stats.activeForms}
            subtitle={
              visibleForms.length > 0
                ? `${activeFormRate}% active right now`
                : "No forms yet"
            }
            icon={FileText}
            toneClassName="bg-muted-foreground/10 text-muted-foreground/90"
            onClick={() => setCurrentView("forms")}
          />
          <StatTile
            title="Pending"
            value={stats.pendingRequests}
            subtitle={
              oldestPendingRequest
                ? `Oldest from ${formatDate(oldestPendingRequest.createdAt)}`
                : "Queue is clear"
            }
            icon={Inbox}
            toneClassName="bg-blue-500/10 text-blue-600"
            onClick={() => setCurrentView("requests")}
          />
          <StatTile
            title="Completed"
            value={stats.completedRequests}
            subtitle={`${completionRate}% completion rate`}
            icon={CheckCircle}
            toneClassName="bg-success/10 text-success"
            onClick={() => setCurrentView("requests")}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] w-full min-w-0">
          <div className="space-y-6 w-full min-w-0">
            <Card className="dashboard-rise-item shadow-md dark:shadow-primary/15 border-border/70 w-full min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <WandSparkles className="h-5 w-5 text-primary" />
                  Today in your studio
                </CardTitle>
                <CardDescription>
                  A quick glance at rhythm, priorities, and last actions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {timelineItems.length > 0 ? (
                  timelineItems.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        item.targetView && setCurrentView(item.targetView)
                      }
                      className={cn(
                        "dashboard-rise-item flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card/70 p-3 text-left transition-colors min-w-0",
                        item.targetView && "cursor-pointer hover:bg-primary/5",
                      )}
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          item.toneClassName,
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.title}
                        </p>
                        <MarkdownRenderer
                          className="truncate text-xs text-muted-foreground"
                          content={item.description}
                        />
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTime(item.when)}
                      </span>
                    </button>
                  ))
                ) : (
                  <EmptyPanel
                    icon={Activity}
                    title="Nothing on the timeline yet"
                    description="Once you create bots, forms, or receive submissions, your activity stream will become your command log."
                    actionLabel="Create first bot"
                    onAction={() => setCurrentView("bots")}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="dashboard-rise-item shadow-md dark:shadow-primary/15 border-border/70 w-full min-w-0">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 items-start">
                <div className="w-full sm:w-auto min-w-0 space-y-1.5">
                  <CardTitle className="text-lg">Recent submissions</CardTitle>
                  <CardDescription>
                    Latest requests across your forms.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  className="cursor-pointer w-full sm:w-auto shrink-0"
                  onClick={() => setCurrentView("requests")}
                >
                  View all
                </Button>
              </CardHeader>
              <CardContent>
                {recentRequests.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 w-full min-w-0">
                    {recentRequests.map((request) => {
                      const requestTone =
                        request.status === "completed"
                          ? "bg-success/10 text-success"
                          : request.status === "accepted"
                            ? "bg-chart-2/10 text-chart-2"
                            : request.status === "rejected"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary";

                      return (
                        <button
                          key={request.id}
                          type="button"
                          onClick={() => setCurrentView("requests")}
                          className="dashboard-rise-item w-full group cursor-pointer rounded-xl border border-border/70 bg-card/80 p-4 text-left transition-colors hover:bg-primary/5 min-w-0"
                        >
                          <div className="flex w-full items-start justify-between gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium rendered-markdown [&>*:last-child]:mb-0">
                                <MarkdownRenderer content={request.formTitle} />
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground truncate">
                                {request.submitterName || "Anonymous submitter"}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-1 text-[11px] font-medium",
                                requestTone,
                              )}
                            >
                              {request.status}
                            </span>
                          </div>

                          {request.notes && (
                            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground wrap-break-word whitespace-normal min-w-0">
                              {request.notes}
                            </p>
                          )}

                          <div className="mt-3 group-hover:bg-primary/10 rounded-lg p-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3 w-3" />
                              {formatRelativeTime(request.createdAt)}
                            </span>
                            <div className="transition-transform group-hover:translate-x-0.5">
                              <ChevronRight className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyPanel
                    icon={Inbox}
                    title="No submissions yet"
                    description="When people use your forms, requests will appear here for quick triage."
                    actionLabel="Open forms"
                    onAction={() => setCurrentView("forms")}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 w-full min-w-0">
            <Card className="dashboard-rise-item shadow-md dark:shadow-primary/15 border-border/70 w-full min-w-0">
              <CardHeader>
                <div className="flex items-center gap-2 text-lg">
                  <ListChecks className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Progress checklist</CardTitle>
                </div>
                <CardDescription>
                  Keep your workspace in good shape with these key actions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm">
                  <style
                    dangerouslySetInnerHTML={{
                      __html: `
      @keyframes gradient-flow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .anim-bg-flow {
        background-size: 200% 200%;
        animation: gradient-flow 3s ease infinite;
      }
      @keyframes glass-shine {
        0% { transform: translateX(-150%) skewX(-20deg); }
        100% { transform: translateX(250%) skewX(-20deg); }
      }
      .anim-glass-shine {
        animation: glass-shine 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      }
      @keyframes stripes-move {
        0% { background-position: 28px 0; }
        100% { background-position: 0 0; }
      }
      .anim-stripes {
        background-image: repeating-linear-gradient(
          -45deg,
          rgba(255, 255, 255, 0.15),
          rgba(255, 255, 255, 0.15) 10px,
          transparent 10px,
          transparent 20px
        );
        background-size: 28px 28px;
        animation: stripes-move 1s linear infinite;
      }
    `,
                    }}
                  />

                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>Completion</span>
                    <span className="text-foreground">
                      {checklistProgress}%
                    </span>
                  </div>

                  <div className="relative h-2.5 overflow-hidden rounded-full bg-muted/60 p-0.5 shadow-inner w-full min-w-0">
                    <div
                      className="relative h-full rounded-full bg-linear-to-r from-primary via-purple-400 to-primary anim-bg-flow transition-all duration-1000 ease-out overflow-hidden"
                      style={{ width: `${checklistProgress}%` }}
                    >
                      <div className="absolute inset-0 anim-stripes w-full h-full mix-blend-overlay" />

                      <div className="absolute top-0 -left-10 h-full w-[40%] bg-linear-to-r from-transparent via-white/50 to-transparent anim-glass-shine" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {checklistSteps.map((step) => (
                    <ChecklistStep
                      key={step.id}
                      label={step.label}
                      done={step.done}
                      onAction={step.onAction}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="dashboard-rise-item shadow-md dark:shadow-primary/15 border-border/70 w-full min-w-0">
              <CardHeader>
                <CardTitle className="text-lg">Quick actions</CardTitle>
                <CardDescription>
                  Jump to the most frequent workflows.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 w-full min-w-0">
                {quickActions.map((action, index) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.onClick}
                    className="dashboard-rise-item cursor-pointer group rounded-xl border border-border/70 bg-card/80 p-3 text-left transition-colors hover:bg-primary/5 w-full min-w-0"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="flex items-start gap-3 w-full min-w-0">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          action.toneClassName,
                        )}
                      >
                        <action.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {action.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground truncate">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 group-hover:bg-primary/10 rounded-lg p-1 flex items-center justify-end text-xs text-muted-foreground transition-transform group-hover:translate-x-0.5">
                      Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {collaborativeBots.length > 0 && (
          <Card className="dashboard-rise-item shadow-md dark:shadow-primary/15 border-border/70 w-full min-w-0">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 items-start">
              <div className="w-full sm:w-auto min-w-0 space-y-1.5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UsersRound className="h-5 w-5 text-primary" />
                  Shared with you
                </CardTitle>
                <CardDescription>
                  Bots where you are collaborating.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                className="cursor-pointer w-full sm:w-auto shrink-0"
                onClick={() => setCurrentView("bots")}
              >
                Open Bot Manager
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 w-full min-w-0">
              {collaborativeBots.slice(0, 4).map((bot) => (
                <button
                  key={bot.id}
                  type="button"
                  onClick={() => {
                    setSelectedBotId(bot.id);
                    setCurrentView("bots");
                  }}
                  className="dashboard-rise-item rounded-xl border border-border/70 bg-card/80 p-4 text-left transition-colors hover:bg-primary/5 w-full min-w-0"
                >
                  <div className="flex w-full items-start justify-between gap-2 min-w-0">
                    <p className="truncate text-sm font-semibold">{bot.name}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {bot.collaborator_role || "collaborator"}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground wrap-break-word whitespace-normal min-w-0">
                    {bot.short_description}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground truncate">
                    by{" "}
                    {bot.owner_display_name || bot.owner_username || "Unknown"}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="dashboard-rise-item shadow-md dark:shadow-primary/15 border-border/70 w-full min-w-0">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 items-start">
            <div className="w-full sm:w-auto min-w-0 space-y-1.5">
              <CardTitle className="text-lg">Recent bots</CardTitle>
              <CardDescription>
                Your latest character edits and creations.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              className="cursor-pointer w-full sm:w-auto shrink-0"
              onClick={() => setCurrentView("bots")}
            >
              View all bots
            </Button>
          </CardHeader>
          <CardContent>
            {recentBots.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 w-full min-w-0">
                {recentBots.map((bot, index) => (
                  <button
                    key={bot.id}
                    type="button"
                    onClick={() => {
                      setSelectedBotId(bot.id);
                      setCurrentView("bots");
                    }}
                    className="dashboard-rise-item cursor-pointer group rounded-xl border border-border/70 bg-card/80 p-4 text-left transition-colors hover:bg-primary/5 w-full min-w-0"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <div className="flex w-full items-start justify-between gap-2 min-w-0">
                      <div className="flex flex-1 min-w-0 items-center gap-2">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                          {bot.imageUrl ? (
                            <img
                              src={bot.imageUrl}
                              alt={bot.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <BotIcon className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <p className="truncate text-sm font-semibold">
                          {bot.name}
                        </p>
                      </div>
                      <Badge
                        variant={
                          bot.rating === "SFW" ? "secondary" : "destructive"
                        }
                        className="shrink-0 text-[10px]"
                      >
                        {bot.rating}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground wrap-break-word whitespace-normal w-full min-w-0">
                      {bot.shortDescription}
                    </p>
                    <div className="mt-3 flex group-hover:bg-primary/10 rounded-lg p-1 items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate pr-2">
                        {formatRelativeTime(bot.updatedAt)}
                      </span>
                      <span className="group-hover:translate-x-0.5 transition-transform inline-flex items-center shrink-0">
                        Edit <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyPanel
                icon={Bot}
                title="No bots yet"
                description="Create your first bot to unlock recommendations, analytics, and a richer dashboard timeline."
                actionLabel="Create your first bot"
                onAction={() => setCurrentView("bots")}
              />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 w-full min-w-0">
          <Card className="dashboard-rise-item shadow-md dark:shadow-primary/15 border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75 w-full min-w-0">
            <CardHeader className="space-y-2 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-primary" />
                Send a suggestion
              </CardTitle>
              <CardDescription>
                Share ideas for improvements, workflows, or features.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <FeedbackActions
                compact
                mode="suggestion"
                context={{
                  sourcePage: "Dashboard",
                  sourceLabel: "Dashboard - Suggestion card",
                  sourcePath: "/dashboard",
                }}
              />
            </CardContent>
          </Card>

          <Card className="dashboard-rise-item shadow-md dark:shadow-primary/15 border-border/70 bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75 w-full min-w-0">
            <CardHeader className="space-y-2 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Report a bug
              </CardTitle>
              <CardDescription>
                Found something broken? Send details so we can fix it faster.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <FeedbackActions
                compact
                mode="bug"
                context={{
                  sourcePage: "Dashboard",
                  sourceLabel: "Dashboard - Bug report card",
                  sourcePath: "/dashboard",
                }}
              />
            </CardContent>
          </Card>
        </div>

        {isNewUser && (
          <Card className="dashboard-rise-item shadow-md dark:shadow-primary/15 border-primary/20 bg-linear-to-br from-primary/5 via-card to-chart-2/5 w-full min-w-0">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  First-time creator boost
                </p>
                <p className="text-sm text-muted-foreground wrap-break-word whitespace-normal min-w-0">
                  Start with one bot, one form, then test one submission flow.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto shrink-0">
                <Button
                  className="cursor-pointer w-full sm:w-auto"
                  onClick={() => setCurrentView("bots")}
                >
                  Start with bot
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer w-full sm:w-auto"
                  onClick={() => setCurrentView("forms")}
                >
                  Build first form
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
