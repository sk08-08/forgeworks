import { notFound, redirect } from "next/navigation";

import { getSession } from "@/features/auth/actions/auth";
import { getBotWorkspace } from "@/features/bots/actions/collaboration";
import { BotWorkspaceClient } from "./workspace-client";

interface BotWorkspacePageProps {
  params: Promise<{
    botId: string;
  }>;
}

export default async function BotWorkspacePage({
  params,
}: BotWorkspacePageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { botId } = await params;
  const result = await getBotWorkspace(botId);

  if (!result.success) {
    notFound();
  }

  return <BotWorkspaceClient bot={result.bot} userRole={result.role} />;
}
