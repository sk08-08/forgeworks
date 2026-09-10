// ============================================================================
// Forgeworks - Form Moderation Page
// Access moderation panel for any form
// ============================================================================

import ModerationPageContent from "./content";

export default function ModerationPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-8">
        <ModerationPageContent />
      </div>
    </div>
  );
}
