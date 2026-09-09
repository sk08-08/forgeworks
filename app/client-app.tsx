// ============================================================================
// JanitorForge - Client Application Component
// Client-side app wrapper with providers
// ============================================================================

"use client";

import { StoreProvider, useStore } from "@/features/app-shell/store/app-store";
import { DashboardLayout } from "@/features/dashboard/components/layout";
import { DashboardHome } from "@/features/dashboard/components/dashboard-home";
import { AdminPanel } from "@/features/admin/components/admin-panel";
import { BotManager } from "@/features/bots/components/bot-manager";
import { FormManager } from "@/features/forms/components/form-manager";
import { RequestsView } from "@/features/forms/components/submissions/requests-view";
import { CreatorPages } from "@/features/creator-pages/components/creator-pages";
import { ProfilePage } from "@/features/profile/components/profile-page";
import { FeedbackInbox } from "@/features/feedback/components/feedback-inbox";
import ModerationPageContent from "@/app/dashboard/moderation/content";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProfilesHub } from "@/features/hub/components/profiles-hub";

function CommunityRouteRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/community");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">Opening community...</p>
    </div>
  );
}

function ResourcesRouteRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/resources");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">Opening resources...</p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// View Router Component
// Renders the appropriate view based on current navigation state
// ----------------------------------------------------------------------------

function ViewRouter() {
  const { currentView } = useStore();

  switch (currentView) {
    case "dashboard":
      return <DashboardHome />;
    case "bots":
      return <BotManager />;
    case "forms":
      return <FormManager />;
    case "requests":
      return <RequestsView />;
    case "moderation":
      return <ModerationPageContent />;
    case "feedback":
      return <FeedbackInbox />;
    case "creator-pages":
      return <CreatorPages />;
    case "profiles":
      return <ProfilesHub />;
    case "community":
      return <CommunityRouteRedirect />;
    case "resources":
      return <ResourcesRouteRedirect />;
    case "profile":
      return <ProfilePage />;
    case "admin":
      return <AdminPanel />;
    default:
      return <DashboardHome />;
  }
}

// ----------------------------------------------------------------------------
// Main Application Content
// ----------------------------------------------------------------------------

function AppContent({ username }: { username: string }) {
  return (
    <DashboardLayout username={username}>
      <ViewRouter />
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------------
// Client App with Providers
// ----------------------------------------------------------------------------

export function ClientApp({ username }: { username: string }) {
  return (
    <TooltipProvider>
      <StoreProvider>
        <AppContent username={username} />
      </StoreProvider>
    </TooltipProvider>
  );
}
