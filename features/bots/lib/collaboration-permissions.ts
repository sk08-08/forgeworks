import type {
  BotWorkspaceRole,
  CollaboratorRole,
} from "@/features/bots/types/bot-types";

export const BOT_COLLABORATION_FIELDS = [
  "name",
  "chat_name",
  "short_description",
  "personality",
  "first_message",
  "alternate_greetings",
  "scenario",
  "example_dialogues",
  "tags",
  "rating",
  "image_url",
  "hide_sensitive_fields",
] as const;

export type BotCollaborationField = (typeof BOT_COLLABORATION_FIELDS)[number];

export const EDITOR_EDITABLE_FIELDS = [
  "short_description",
  "personality",
  "first_message",
  "alternate_greetings",
  "scenario",
  "example_dialogues",
  "tags",
  "rating",
] as const satisfies readonly BotCollaborationField[];

export const CO_OWNER_EDITABLE_FIELDS = BOT_COLLABORATION_FIELDS;

const STRING_FIELDS = new Set<BotCollaborationField>([
  "name",
  "chat_name",
  "short_description",
  "personality",
  "first_message",
  "scenario",
  "example_dialogues",
  "image_url",
]);

const STRING_ARRAY_FIELDS = new Set<BotCollaborationField>([
  "alternate_greetings",
  "tags",
]);

export function canRoleEditField(
  role: BotWorkspaceRole,
  field: BotCollaborationField,
): boolean {
  if (role === "owner" || role === "co_owner") return true;
  if (role !== "editor") return false;

  return (EDITOR_EDITABLE_FIELDS as readonly string[]).includes(field);
}

export function canRoleManageNormalMembers(role: BotWorkspaceRole): boolean {
  return role === "owner" || role === "co_owner";
}

export function canRoleManageCoOwners(role: BotWorkspaceRole): boolean {
  return role === "owner";
}

export function canRoleReviewChanges(role: BotWorkspaceRole): boolean {
  return role === "owner" || role === "co_owner";
}

export function sanitizeBotChangeRequestChanges(
  changes: Record<string, unknown>,
  role: Extract<BotWorkspaceRole, "owner" | "editor" | "co_owner">,
): {
  changes: Partial<Record<BotCollaborationField, unknown>>;
  rejectedFields: string[];
} {
  const sanitized: Partial<Record<BotCollaborationField, unknown>> = {};
  const rejectedFields: string[] = [];

  for (const [rawField, value] of Object.entries(changes)) {
    if (!(BOT_COLLABORATION_FIELDS as readonly string[]).includes(rawField)) {
      rejectedFields.push(rawField);
      continue;
    }

    const field = rawField as BotCollaborationField;

    if (!canRoleEditField(role, field)) {
      rejectedFields.push(field);
      continue;
    }

    if (STRING_FIELDS.has(field)) {
      if (value !== null && typeof value !== "string") {
        rejectedFields.push(field);
        continue;
      }
      sanitized[field] = value;
      continue;
    }

    if (STRING_ARRAY_FIELDS.has(field)) {
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "string")
      ) {
        rejectedFields.push(field);
        continue;
      }
      sanitized[field] = value;
      continue;
    }

    if (field === "rating") {
      if (value !== "SFW" && value !== "NSFW") {
        rejectedFields.push(field);
        continue;
      }
      sanitized[field] = value;
      continue;
    }

    if (field === "hide_sensitive_fields") {
      if (typeof value !== "boolean") {
        rejectedFields.push(field);
        continue;
      }
      sanitized[field] = value;
      continue;
    }

    rejectedFields.push(field);
  }

  return { changes: sanitized, rejectedFields };
}

export function isCollaboratorRole(value: unknown): value is CollaboratorRole {
  return value === "viewer" || value === "editor" || value === "co_owner";
}
