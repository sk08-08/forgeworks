"use client";

import { Loader2 } from "lucide-react";
import type {
  Bot,
  BotWorkspaceRole,
  CollaborativeBot,
} from "@/features/bots/types/bot-types";
import { CollaborationHeader } from "./collaboration-header";
import { CollaborationSidebar } from "./collaboration-sidebar";
import {
  CollaborationWorkspaceProvider,
  useCollaborationWorkspace,
} from "./collaboration-workspace-context";
import { OverviewView } from "./views/overview-view";
import { EditorView } from "./views/editor-view";
import { ChangesView } from "./views/changes-view";
import { DiscussionView } from "./views/discussion-view";
import { HistoryView } from "./views/history-view";
import { ActivityView } from "./views/activity-view";
import { TeamView } from "./views/team-view";
import { SettingsView } from "./views/settings-view";

interface CollaborationWorkspaceProps {
  bot: Bot | CollaborativeBot;
  userRole: BotWorkspaceRole;
  onBack: () => void;
  onBotUpdated?: () => void;
}

export function CollaborationWorkspace(props: CollaborationWorkspaceProps) {
  return (
    <CollaborationWorkspaceProvider {...props}>
      <WorkspaceShell />
    </CollaborationWorkspaceProvider>
  );
}

function WorkspaceShell() {
  const { activeView, loading } = useCollaborationWorkspace();

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
      <CollaborationHeader />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <CollaborationSidebar />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="w-full px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8 xl:px-10">
            {loading ? (
              <div className="flex min-h-[45vh] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading workspace…
              </div>
            ) : (
              <div
                key={activeView}
                className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
              >
                <WorkspaceView view={activeView} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function WorkspaceView({
  view,
}: {
  view: ReturnType<typeof useCollaborationWorkspace>["activeView"];
}) {
  switch (view) {
    case "editor":
      return <EditorView />;
    case "changes":
      return <ChangesView />;
    case "discussion":
      return <DiscussionView />;
    case "history":
      return <HistoryView />;
    case "activity":
      return <ActivityView />;
    case "team":
      return <TeamView />;
    case "settings":
      return <SettingsView />;
    case "overview":
    default:
      return <OverviewView />;
  }
}
