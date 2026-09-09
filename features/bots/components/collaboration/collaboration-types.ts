import type {
  Bot,
  CollaborativeBot,
  CollaboratorRole,
} from "@/features/bots/types/bot-types";
export interface WorkspaceBotValues {
  name: string;
  chat_name: string;
  short_description: string;
  personality: string;
  first_message: string;
  alternate_greetings: string[];
  scenario: string;
  example_dialogues: string;
  tags: string[];
  rating: "SFW" | "NSFW";
  image_url: string;
  hide_sensitive_fields: boolean;
}

export interface WorkspaceCollaborator {
  id: string;
  user_id: string;
  invited_by: string;
  role: CollaboratorRole;
  status: "pending" | "accepted" | "declined";
  invite_message?: string | null;
  created_at: string;
  updated_at?: string;
  expires_at?: string | null;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  inviter?: {
    username: string | null;
    display_name: string | null;
    avatar_url?: string | null;
  } | null;
}

export function normalizeWorkspaceBot(
  bot: Bot | CollaborativeBot,
): WorkspaceBotValues {
  const source = bot as Bot & Partial<CollaborativeBot>;
  const rating = source.rating === "NSFW" ? "NSFW" : "SFW";
  const alternateGreetings = Array.isArray(source.alternateGreetings)
    ? source.alternateGreetings
    : Array.isArray(source.alternate_greetings)
      ? source.alternate_greetings
      : [];

  return {
    name: source.name || "",
    chat_name: source.chatName ?? source.chat_name ?? "",
    short_description:
      source.shortDescription ?? source.short_description ?? "",
    personality: source.personality || "",
    first_message: source.firstMessage ?? source.first_message ?? "",
    alternate_greetings: alternateGreetings,
    scenario: source.scenario || "",
    example_dialogues:
      source.exampleDialogues ?? source.example_dialogues ?? "",
    tags: Array.isArray(source.tags) ? source.tags : [],
    rating,
    image_url: source.imageUrl ?? source.image_url ?? "",
    hide_sensitive_fields:
      source.hideSensitiveFields === true ||
      (source as unknown as { hide_sensitive_fields?: boolean })
        .hide_sensitive_fields === true,
  };
}

export function cloneWorkspaceValues(
  values: WorkspaceBotValues,
): WorkspaceBotValues {
  return {
    ...values,
    alternate_greetings: [...values.alternate_greetings],
    tags: [...values.tags],
  };
}

export function workspaceValueEquals(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  }
  return a === b;
}
