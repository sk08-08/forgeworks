"use client";

import {
  Activity,
  ArrowRight,
  GitPullRequest,
  MessageSquare,
  PencilLine,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACTIVITY_LABELS, FIELD_LABELS } from "../collaboration-config";
import { useCollaborationWorkspace } from "../collaboration-workspace-context";

export function OverviewView() {
  const {
    values,
    userRole,
    approvalRequired,
    collaborators,
    changeRequests,
    activity,
    comments,
    realtime,
    setActiveView,
    tokenCount,
  } = useCollaborationWorkspace();

  const openRequests = changeRequests.filter(
    (item) => item.status === "pending" || item.status === "changes_requested",
  );
  const activeMembers = collaborators.filter(
    (item) => item.status === "accepted",
  );
  const online = realtime.presenceUsers;

  return (
    <div className="space-y-6">
      <section className="group relative overflow-hidden rounded-[1.7rem] border border-border/60 bg-card/75 p-5 shadow-sm transition-all duration-300 hover:border-border/80 hover:shadow-md sm:p-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035] transition-opacity duration-300 group-hover:opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right,currentColor 1px,transparent 1px),linear-gradient(to bottom,currentColor 1px,transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-sm transition-transform duration-300 group-hover:scale-[1.02]">
            {values.image_url ? (
              <img
                src={values.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-muted-foreground">
                {values.name.slice(0, 1).toUpperCase() || "B"}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-2xl font-semibold tracking-tight">
                {values.name || "Untitled bot"}
              </h2>
              <Badge
                variant={values.rating === "SFW" ? "secondary" : "destructive"}
              >
                {values.rating}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {userRole === "owner" ? "Owner" : userRole.replace("_", " ")}
              </Badge>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {values.short_description || "No short description yet."}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>{tokenCount.toLocaleString()} tokens</span>
              <span>{activeMembers.length + 1} team members</span>
              <span>
                {approvalRequired
                  ? "Editor review required"
                  : "Direct editor saves allowed"}
              </span>
            </div>
          </div>

          <Button
            onClick={() => setActiveView("editor")}
            className="group/button cursor-pointer rounded-xl transition-all duration-200 active:scale-[0.98]"
          >
            <PencilLine className="mr-2 h-4 w-4" />
            Continue editing
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <OverviewCard
          icon={ShieldCheck}
          title="Needs attention"
          className="lg:col-span-2"
        >
          {openRequests.length === 0 ? (
            <EmptyLine text="Nothing is blocking the team right now." />
          ) : (
            <div className="space-y-2">
              {openRequests.slice(0, 4).map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => setActiveView("changes")}
                  className="group/request flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border/50 bg-background/55 p-3 text-left outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-muted/30 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30 active:translate-y-0"
                >
                  <GitPullRequest className="h-4 w-4 text-primary transition-transform duration-200 group-hover/request:scale-105" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {request.title ||
                        `${Object.keys(request.proposed_changes || {}).length} proposed field changes`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {request.status === "changes_requested"
                        ? "Changes requested"
                        : "Waiting for review"}{" "}
                      ·{" "}
                      {request.author_display_name ||
                        request.author_username ||
                        "Collaborator"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover/request:translate-x-1 group-hover/request:text-primary" />
                </button>
              ))}
            </div>
          )}
        </OverviewCard>

        <OverviewCard icon={UsersRound} title="Live now">
          <div className="space-y-2">
            {online.length === 0 ? (
              <EmptyLine text="No live collaborators." />
            ) : (
              online.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-2.5 rounded-xl bg-muted/25 p-2.5 transition-colors duration-200 hover:bg-muted/40"
                >
                  <div className="h-8 w-8 overflow-hidden rounded-full bg-primary/10 ring-2 ring-background">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UsersRound className="m-2 h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      {user.displayName || user.username || "Forge user"}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {user.activeField
                        ? `Editing ${FIELD_LABELS[user.activeField]}`
                        : `Viewing ${user.activeTab}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </OverviewCard>

        <OverviewCard
          icon={Activity}
          title="Recent work"
          className="lg:col-span-2"
        >
          <div className="space-y-1">
            {activity.slice(0, 6).map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors duration-200 hover:bg-muted/20"
              >
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                <div>
                  <p className="text-sm">
                    <span className="font-medium">
                      {entry.display_name || entry.username || "Someone"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {ACTIVITY_LABELS[entry.action] ||
                        entry.action.replaceAll("_", " ")}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {activity.length === 0 && <EmptyLine text="No activity yet." />}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="group cursor-pointer mt-2 transition-colors"
            onClick={() => setActiveView("activity")}
          >
            View all activity
            <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </Button>
        </OverviewCard>

        <OverviewCard icon={MessageSquare} title="Discussion">
          <p className="text-3xl font-semibold">{comments.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use Discussion for decisions and feedback tied to this bot.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            onClick={() => setActiveView("discussion")}
          >
            Open discussion
          </Button>
        </OverviewCard>
      </div>
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: typeof Activity;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.4rem] border border-border/60 bg-card/70 p-4 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}
