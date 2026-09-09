"use client";

import { useRouter } from "next/navigation";

import { TooltipProvider } from "@/components/ui/tooltip";
import { CollaborationWorkspace } from "@/features/bots/components/collaboration/collaboration-workspace";
import type { Bot, BotWorkspaceRole } from "@/features/bots/types/bot-types";

interface BotWorkspaceClientProps {
  bot: Bot;
  userRole: BotWorkspaceRole;
}

export function BotWorkspaceClient({ bot, userRole }: BotWorkspaceClientProps) {
  const router = useRouter();

  const handleBack = () => {
    localStorage.setItem("currentView", "bots");
    router.push("/");
  };

  return (
    <TooltipProvider>
      <CollaborationWorkspace
        bot={bot}
        userRole={userRole}
        onBack={handleBack}
      />
    </TooltipProvider>
  );
}
