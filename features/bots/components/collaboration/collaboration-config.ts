import {
  Activity,
  FileClock,
  GitPullRequest,
  LayoutDashboard,
  MessageSquare,
  PencilLine,
  Settings,
  UsersRound,
} from "lucide-react";
import type { BotCollaborationField } from "@/features/bots/lib/collaboration-permissions";

export type CollaborationWorkspaceView =
  | "overview"
  | "editor"
  | "changes"
  | "discussion"
  | "history"
  | "activity"
  | "team"
  | "settings";

export const WORKSPACE_NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "editor", label: "Editor", icon: PencilLine },
  { id: "changes", label: "Changes", icon: GitPullRequest },
  { id: "discussion", label: "Discussion", icon: MessageSquare },
  { id: "history", label: "History", icon: FileClock },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "team", label: "Team", icon: UsersRound },
  { id: "settings", label: "Settings", icon: Settings },
] as const satisfies ReadonlyArray<{
  id: CollaborationWorkspaceView;
  label: string;
  icon: typeof LayoutDashboard;
}>;

export const FIELD_LABELS: Record<BotCollaborationField, string> = {
  name: "Bot Name",
  chat_name: "Chat Name",
  short_description: "Short Description",
  personality: "Personality",
  first_message: "First Message",
  alternate_greetings: "Alternate Greetings",
  scenario: "Scenario",
  example_dialogues: "Example Dialogues",
  tags: "Tags",
  rating: "Rating",
  image_url: "Image",
  hide_sensitive_fields: "Sensitive-field settings",
};

export const EDITOR_SECTIONS = [
  {
    id: "identity",
    label: "Identity",
    fields: [
      "name",
      "chat_name",
      "short_description",
    ] as BotCollaborationField[],
  },
  {
    id: "character",
    label: "Character",
    fields: ["personality", "scenario"] as BotCollaborationField[],
  },
  {
    id: "conversation",
    label: "Conversation",
    fields: [
      "first_message",
      "alternate_greetings",
      "example_dialogues",
    ] as BotCollaborationField[],
  },
  {
    id: "classification",
    label: "Classification",
    fields: ["rating", "tags"] as BotCollaborationField[],
  },
  {
    id: "appearance",
    label: "Appearance & privacy",
    fields: ["image_url", "hide_sensitive_fields"] as BotCollaborationField[],
  },
] as const;

export const ACTIVITY_LABELS: Record<string, string> = {
  created: "created this bot",
  edited: "edited bot content",
  exported: "exported this bot",
  forked: "forked this bot",
  collaborator_invited: "invited a collaborator",
  collaborator_accepted: "accepted the invitation",
  collaborator_declined: "declined the invitation",
  collaborator_removed: "removed a collaborator",
  role_changed: "changed a collaborator role",
  commented: "started or replied to a discussion",
  change_request_submitted: "submitted a change request",
  change_request_approved: "approved a change request",
  change_request_rejected: "rejected a change request",
  change_request_changes_requested: "requested changes on a change request",
  field_saved: "saved collaborative edits",
  version_restored: "restored a previous version",
};
