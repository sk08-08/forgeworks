// ============================================================================
// Forgeworks - Main Application Page
// Entry point that renders the dashboard with dynamic views
// ============================================================================

import { getSession } from "@/features/auth/actions/auth";
import { ClientApp } from "./client-app";
import { LandingPage } from "@/components/landing/landing-page";

// ----------------------------------------------------------------------------
// Page Component - Server side auth check
// Shows landing page for visitors, dashboard for authenticated users
// ----------------------------------------------------------------------------

export default async function Page() {
  const session = await getSession();

  if (!session) {
    return <LandingPage />;
  }

  return <ClientApp username={session.username} />;
}
