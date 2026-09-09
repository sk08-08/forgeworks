"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type {
  Bot,
  BotActivityEntry,
  BotChangeRequest,
  BotComment,
  BotFormData,
  BotVersion,
  BotWorkspaceRole,
  CollaborativeBot,
  CollaboratorRole,
} from "@/features/bots/types/bot-types";
import {
  canRoleEditField,
  canRoleManageCoOwners,
  canRoleManageNormalMembers,
  canRoleReviewChanges,
  type BotCollaborationField,
} from "@/features/bots/lib/collaboration-permissions";
import { applyRatingTagToBotTags } from "@/features/bots/lib/bot-tags";
import { countBotTokens, exportCharacterCardPNG } from "@/features/bots/lib/bot-utils";
import { updateBotAction } from "@/features/bots/actions/bots";
import {
  getBotVersions,
  restoreBotVersion,
} from "@/features/bots/actions/bot-history";
import {
  addBotComment,
  approveChangeRequest,
  deleteBotComment,
  getBotActivity,
  getBotApprovalSetting,
  getBotChangeRequests,
  getBotCollaborators,
  getBotComments,
  inviteCollaborator,
  rejectChangeRequest,
  removeCollaborator,
  requestChangesOnChangeRequest,
  submitChangeRequest,
  toggleBotApproval,
  updateCollaboratorRole,
} from "@/features/bots/actions/collaboration";
import { useBotCollaborationRealtime } from "@/features/bots/hooks/use-bot-collaboration-realtime";
import type { CollaborationWorkspaceView } from "./collaboration-config";
import {
  cloneWorkspaceValues,
  normalizeWorkspaceBot,
  workspaceValueEquals,
  type WorkspaceBotValues,
  type WorkspaceCollaborator,
} from "./collaboration-types";

type ConflictResolution = "local" | "remote";

interface CollaborationWorkspaceContextValue {
  userRole: BotWorkspaceRole;
  onBack: () => void;
  activeView: CollaborationWorkspaceView;
  setActiveView: (view: CollaborationWorkspaceView) => void;
  loading: boolean;
  saving: boolean;
  values: WorkspaceBotValues;
  baseline: WorkspaceBotValues;
  dirtyFields: Set<BotCollaborationField>;
  remoteConflicts: Set<BotCollaborationField>;
  tokenCount: number;
  approvalRequired: boolean;
  collaborators: WorkspaceCollaborator[];
  changeRequests: BotChangeRequest[];
  comments: BotComment[];
  activity: BotActivityEntry[];
  versions: BotVersion[];
  restoringVersionId: string | null;
  realtime: ReturnType<typeof useBotCollaborationRealtime>;
  canManageMembers: boolean;
  canManageCoOwners: boolean;
  canReview: boolean;
  canEditField: (field: BotCollaborationField) => boolean;
  requestFieldAccess: (field: BotCollaborationField) => Promise<boolean>;
  releaseField: (field: BotCollaborationField) => Promise<void>;
  updateField: (field: BotCollaborationField, value: unknown) => void;
  discardAll: () => void;
  resolveConflict: (field: BotCollaborationField, resolution: ConflictResolution) => void;
  saveChanges: () => Promise<void>;
  exportBot: () => Promise<void>;
  refreshActivity: () => Promise<void>;
  refreshVersions: () => Promise<void>;
  restoreVersion: (versionId: string) => Promise<boolean>;
  refreshChangeRequests: () => Promise<void>;
  addComment: (content: string, parentId?: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<void>;
  inviteMember: (
    username: string,
    role: CollaboratorRole,
    message?: string,
  ) => Promise<boolean>;
  removeMember: (collaboratorId: string) => Promise<void>;
  changeMemberRole: (
    collaboratorId: string,
    role: CollaboratorRole,
  ) => Promise<void>;
  approveRequest: (id: string) => Promise<void>;
  requestChanges: (id: string, comment: string) => Promise<boolean>;
  rejectRequest: (id: string, reason?: string) => Promise<boolean>;
  setApprovalRequirement: (next: boolean) => Promise<void>;
}

const CollaborationWorkspaceContext =
  createContext<CollaborationWorkspaceContextValue | null>(null);

function fieldToFormData(
  field: BotCollaborationField,
  value: unknown,
  target: Partial<BotFormData>,
) {
  switch (field) {
    case "name":
      target.name = String(value ?? "");
      break;
    case "chat_name":
      target.chatName = value ? String(value) : undefined;
      break;
    case "short_description":
      target.shortDescription = String(value ?? "");
      break;
    case "personality":
      target.personality = String(value ?? "");
      break;
    case "first_message":
      target.firstMessage = String(value ?? "");
      break;
    case "alternate_greetings":
      target.alternateGreetings = Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
      break;
    case "scenario":
      target.scenario = String(value ?? "");
      break;
    case "example_dialogues":
      target.exampleDialogues = String(value ?? "");
      break;
    case "tags":
      target.tags = Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
      break;
    case "rating":
      if (value === "SFW" || value === "NSFW") target.rating = value;
      break;
    case "image_url":
      target.imageUrl = value ? String(value) : undefined;
      break;
    case "hide_sensitive_fields":
      target.hideSensitiveFields = value === true;
      break;
  }
}

function coerceWorkspaceValue(
  field: BotCollaborationField,
  value: unknown,
): unknown {
  if (field === "chat_name" || field === "image_url") return value == null ? "" : String(value);
  if (field === "alternate_greetings" || field === "tags") {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }
  if (field === "hide_sensitive_fields") return value === true;
  if (field === "rating") return value === "NSFW" ? "NSFW" : "SFW";
  return String(value ?? "");
}

function sanitizeFieldValue(
  field: BotCollaborationField,
  value: unknown,
): unknown {
  switch (field) {
    case "name":
    case "short_description":
      return String(value ?? "").trim();
    case "chat_name":
    case "image_url": {
      const text = String(value ?? "").trim();
      return text || null;
    }
    case "alternate_greetings":
    case "tags":
      return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
    case "rating":
      return value === "NSFW" ? "NSFW" : "SFW";
    case "hide_sensitive_fields":
      return value === true;
    default:
      return String(value ?? "");
  }
}

export function CollaborationWorkspaceProvider({
  bot,
  userRole,
  onBack,
  onBotUpdated,
  children,
}: {
  bot: Bot | CollaborativeBot;
  userRole: BotWorkspaceRole;
  onBack: () => void;
  onBotUpdated?: () => void;
  children: React.ReactNode;
}) {
  const botId = bot.id;
  const initialValues = useMemo(() => normalizeWorkspaceBot(bot), [bot]);
  const [activeView, setActiveView] =
    useState<CollaborationWorkspaceView>("overview");
  const [values, setValues] = useState<WorkspaceBotValues>(() =>
    cloneWorkspaceValues(initialValues),
  );
  const [baseline, setBaseline] = useState<WorkspaceBotValues>(() =>
    cloneWorkspaceValues(initialValues),
  );
  const [touchedFields, setTouchedFields] = useState<Set<BotCollaborationField>>(
    new Set(),
  );
  const [remoteConflicts, setRemoteConflicts] = useState<
    Set<BotCollaborationField>
  >(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [collaborators, setCollaborators] = useState<WorkspaceCollaborator[]>([]);
  const [changeRequests, setChangeRequests] = useState<BotChangeRequest[]>([]);
  const [comments, setComments] = useState<BotComment[]>([]);
  const [activity, setActivity] = useState<BotActivityEntry[]>([]);
  const [versions, setVersions] = useState<BotVersion[]>([]);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(
    null,
  );

  const valuesRef = useRef(values);
  const baselineRef = useRef(baseline);
  const touchedRef = useRef(touchedFields);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);
  useEffect(() => {
    baselineRef.current = baseline;
  }, [baseline]);
  useEffect(() => {
    touchedRef.current = touchedFields;
  }, [touchedFields]);

  useEffect(() => {
    const normalized = normalizeWorkspaceBot(bot);
    setValues(cloneWorkspaceValues(normalized));
    setBaseline(cloneWorkspaceValues(normalized));
    setTouchedFields(new Set());
    setRemoteConflicts(new Set());
  }, [bot]);

  const applyRemoteDraft = useCallback(
    (field: BotCollaborationField, value: unknown) => {
      if (touchedRef.current.has(field)) return;
      setValues((current) => ({ ...current, [field]: coerceWorkspaceValue(field, value) }));
    },
    [],
  );

  const applyRemoteCommit = useCallback(
    (updates: Partial<Record<BotCollaborationField, unknown>>) => {
      setBaseline((current) => {
        const next = { ...current } as WorkspaceBotValues;
        for (const [key, value] of Object.entries(updates)) {
          const field = key as BotCollaborationField;
          (next as unknown as Record<string, unknown>)[field] = coerceWorkspaceValue(field, value);
        }
        baselineRef.current = next;
        return next;
      });

      setValues((current) => {
        const next = { ...current } as WorkspaceBotValues;
        const conflicts = new Set<BotCollaborationField>();
        for (const [key, value] of Object.entries(updates)) {
          const field = key as BotCollaborationField;
          if (touchedRef.current.has(field)) {
            conflicts.add(field);
            continue;
          }
          (next as unknown as Record<string, unknown>)[field] = coerceWorkspaceValue(field, value);
        }
        if (conflicts.size > 0) {
          setRemoteConflicts((existing) => new Set([...existing, ...conflicts]));
        }
        return next;
      });
    },
    [],
  );

  const revertAbandonedRemoteDraft = useCallback(
    (field: BotCollaborationField) => {
      if (touchedRef.current.has(field)) return;
      const persisted = baselineRef.current[field];
      setValues((current) => ({ ...current, [field]: persisted }));
    },
    [],
  );

  const realtime = useBotCollaborationRealtime({
    botId,
    role: userRole,
    activeTab: activeView,
    onRemoteFieldChange: applyRemoteDraft,
    onRemoteCommit: applyRemoteCommit,
    onRemoteReset: applyRemoteCommit,
    onRemoteDraftAbandoned: revertAbandonedRemoteDraft,
  });

  const canEdit = userRole === "owner" || userRole === "co_owner" || userRole === "editor";
  const canManageMembers = canRoleManageNormalMembers(userRole);
  const canManageCoOwners = canRoleManageCoOwners(userRole);
  const canReview = canRoleReviewChanges(userRole);

  const dirtyFields = useMemo(() => {
    const dirty = new Set<BotCollaborationField>();
    for (const field of touchedFields) {
      if (!workspaceValueEquals(values[field], baseline[field])) dirty.add(field);
    }
    return dirty;
  }, [baseline, touchedFields, values]);

  const hasDirty = dirtyFields.size > 0;

  const tokenCount = useMemo(
    () =>
      countBotTokens({
        personality: values.personality,
        firstMessage: values.first_message,
        alternateGreetings: values.alternate_greetings,
        scenario: values.scenario,
        exampleDialogues: values.example_dialogues,
      }),
    [values],
  );

  const refreshCollaborators = useCallback(async () => {
    const result = await getBotCollaborators(botId);
    if (result.success) {
      setCollaborators(result.collaborators as WorkspaceCollaborator[]);
    }
  }, [botId]);

  const refreshChangeRequests = useCallback(async () => {
    const result = await getBotChangeRequests(botId);
    if (result.success) {
      setChangeRequests(result.changeRequests as BotChangeRequest[]);
    }
  }, [botId]);

  const refreshComments = useCallback(async () => {
    const result = await getBotComments(botId);
    if (result.success) setComments(result.comments as BotComment[]);
  }, [botId]);

  const refreshActivity = useCallback(async () => {
    const result = await getBotActivity(botId, 80);
    if (result.success) setActivity(result.activity as BotActivityEntry[]);
  }, [botId]);

  const refreshVersions = useCallback(async () => {
    const result = await getBotVersions(botId, 120);
    if (result.success) setVersions(result.versions);
  }, [botId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      getBotCollaborators(botId),
      getBotChangeRequests(botId),
      getBotApprovalSetting(botId),
      getBotActivity(botId, 30),
      getBotComments(botId),
      getBotVersions(botId, 120),
    ]).then(
      ([members, requests, approval, activityResult, commentResult, versionsResult]) => {
      if (!mounted) return;
      if (members.success)
        setCollaborators(members.collaborators as WorkspaceCollaborator[]);
      if (requests.success)
        setChangeRequests(requests.changeRequests as BotChangeRequest[]);
      if (approval.success) setApprovalRequired(approval.requireApproval);
      if (activityResult.success)
        setActivity(activityResult.activity as BotActivityEntry[]);
      if (commentResult.success)
        setComments(commentResult.comments as BotComment[]);
      if (versionsResult.success) setVersions(versionsResult.versions);
      setLoading(false);
    },
    );
    return () => {
      mounted = false;
    };
  }, [botId]);

  const canEditField = useCallback(
    (field: BotCollaborationField) =>
      canRoleEditField(userRole, field) && realtime.canMutateField(field),
    [realtime, userRole],
  );

  const requestFieldAccess = useCallback(
    async (field: BotCollaborationField) => {
      if (!canRoleEditField(userRole, field)) return false;
      if (realtime.ownsFieldLock(field)) {
        realtime.activateField(field);
        return true;
      }
      const claimed = await realtime.claimField(field);
      if (!claimed) toast.info("Someone else is editing this field");
      return claimed;
    },
    [realtime, userRole],
  );

  const releaseField = useCallback(
    async (field: BotCollaborationField) => {
      if (realtime.ownsFieldLock(field)) await realtime.releaseField(field);
    },
    [realtime],
  );

  const updateField = useCallback(
    (field: BotCollaborationField, value: unknown) => {
      if (!canRoleEditField(userRole, field) || !realtime.canMutateField(field)) {
        return;
      }
      setValues((current) => ({ ...current, [field]: value }));
      setTouchedFields((current) => {
        const next = new Set(current);
        next.add(field);
        touchedRef.current = next;
        return next;
      });
      realtime.broadcastFieldChange(field, value);
    },
    [realtime, userRole],
  );

  const discardField = useCallback(
    (field: BotCollaborationField) => {
      const value = baselineRef.current[field];
      setValues((current) => ({ ...current, [field]: value }));
      setTouchedFields((current) => {
        const next = new Set(current);
        next.delete(field);
        touchedRef.current = next;
        return next;
      });
      setRemoteConflicts((current) => {
        const next = new Set(current);
        next.delete(field);
        return next;
      });
      realtime.broadcastReset({ [field]: value });
      void releaseField(field);
    },
    [realtime, releaseField],
  );

  const discardAll = useCallback(() => {
    const fields = [...dirtyFields];
    setValues(cloneWorkspaceValues(baselineRef.current));
    setTouchedFields(new Set());
    touchedRef.current = new Set();
    setRemoteConflicts(new Set());
    const resetValues: Partial<Record<BotCollaborationField, unknown>> = {};
    for (const field of fields) {
      resetValues[field] = baselineRef.current[field];
      void releaseField(field);
    }
    realtime.broadcastReset(resetValues);
  }, [dirtyFields, realtime, releaseField]);

  const resolveConflict = useCallback(
    (field: BotCollaborationField, resolution: ConflictResolution) => {
      if (resolution === "remote") {
        discardField(field);
        return;
      }
      setRemoteConflicts((current) => {
        const next = new Set(current);
        next.delete(field);
        return next;
      });
    },
    [discardField],
  );

  const saveChanges = useCallback(async () => {
    if (!canEdit || !hasDirty || saving) return;
    if (remoteConflicts.size > 0) {
      toast.error("Resolve remote updates before saving your draft");
      return;
    }
    if (realtime.connectionStatus !== "connected") {
      toast.error("Realtime is reconnecting. Wait until the workspace is online before saving.");
      return;
    }

    const fields = [...dirtyFields];
    const acquiredBySave: BotCollaborationField[] = [];
    for (const field of fields) {
      if (realtime.ownsFieldLock(field)) continue;
      const claimed = await realtime.claimField(field);
      if (!claimed) {
        for (const acquired of acquiredBySave) void realtime.releaseField(acquired);
        toast.error(
          "A changed field is being edited by someone else. Your local draft is still safe.",
        );
        return;
      }
      acquiredBySave.push(field);
    }

    const changes: Partial<Record<BotCollaborationField, unknown>> = {};
    for (const field of fields) {
      let value = sanitizeFieldValue(field, valuesRef.current[field]);
      if (field === "tags") {
        value = applyRatingTagToBotTags(
          value as string[],
          valuesRef.current.rating,
        );
      }
      changes[field] = value;
    }

    setSaving(true);
    try {
      if (approvalRequired && userRole === "editor") {
        const result = await submitChangeRequest(botId, changes);
        if (!result.success) throw new Error(result.error || "Failed to submit changes");
        toast.success("Change request submitted for review");
        const resetValues: Partial<Record<BotCollaborationField, unknown>> = {};
        for (const field of fields) resetValues[field] = baselineRef.current[field];
        setValues(cloneWorkspaceValues(baselineRef.current));
        setTouchedFields(new Set());
        touchedRef.current = new Set();
        realtime.broadcastReset(resetValues);
        setActiveView("changes");
        await Promise.all([refreshChangeRequests(), refreshActivity()]);
      } else {
        const formData: Partial<BotFormData> = {};
        for (const [key, value] of Object.entries(changes)) {
          fieldToFormData(key as BotCollaborationField, value, formData);
        }
        const result = await updateBotAction(botId, formData);
        if (!result.success) throw new Error(result.error || "Failed to save changes");

        const nextBaseline = cloneWorkspaceValues(valuesRef.current);
        for (const [key, value] of Object.entries(changes)) {
          const field = key as BotCollaborationField;
          (nextBaseline as unknown as Record<string, unknown>)[field] = coerceWorkspaceValue(field, value);
        }
        nextBaseline.tags = applyRatingTagToBotTags(nextBaseline.tags, nextBaseline.rating);
        setValues(nextBaseline);
        setBaseline(nextBaseline);
        baselineRef.current = nextBaseline;
        setTouchedFields(new Set());
        touchedRef.current = new Set();
        setRemoteConflicts(new Set());
        realtime.broadcastCommit(changes);
        toast.success("Bot saved successfully");
        onBotUpdated?.();
        await Promise.all([refreshActivity(), refreshVersions()]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save changes");
    } finally {
      for (const field of fields) void realtime.releaseField(field);
      setSaving(false);
    }
  }, [
    approvalRequired,
    botId,
    canEdit,
    dirtyFields,
    hasDirty,
    onBotUpdated,
    realtime,
    refreshActivity,
    refreshVersions,
    refreshChangeRequests,
    remoteConflicts,
    saving,
    userRole,
  ]);

  const exportBot = useCallback(async () => {
    try {
      const current = valuesRef.current;
      const blob = await exportCharacterCardPNG({
        id: botId,
        name: current.name,
        chatName: current.chat_name,
        shortDescription: current.short_description,
        personality: current.personality,
        firstMessage: current.first_message,
        alternateGreetings: current.alternate_greetings,
        scenario: current.scenario,
        exampleDialogues: current.example_dialogues,
        tags: applyRatingTagToBotTags(current.tags, current.rating),
        rating: current.rating,
        imageUrl: current.image_url,
        hideSensitiveFields: current.hide_sensitive_fields,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${current.name.replace(/\s+/g, "_")}_card.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Character card exported");
    } catch {
      toast.error("Failed to export character card");
    }
  }, [botId]);

  const addComment = useCallback(
    async (content: string, parentId?: string) => {
      const result = await addBotComment(botId, content, parentId);
      if (!result.success) {
        toast.error(result.error || "Failed to post comment");
        return false;
      }
      await Promise.all([refreshComments(), refreshActivity()]);
      return true;
    },
    [botId, refreshActivity, refreshComments],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const result = await deleteBotComment(commentId);
      if (!result.success) toast.error(result.error || "Failed to delete comment");
      else await refreshComments();
    },
    [refreshComments],
  );

  const inviteMember = useCallback(
    async (username: string, role: CollaboratorRole, message?: string) => {
      const result = await inviteCollaborator(botId, username, role, message);
      if (!result.success) {
        toast.error(result.error || "Failed to send invitation");
        return false;
      }
      toast.success(`Invitation sent to @${result.invitedUsername}`);
      await Promise.all([refreshCollaborators(), refreshActivity()]);
      return true;
    },
    [botId, refreshActivity, refreshCollaborators],
  );

  const removeMember = useCallback(
    async (collaboratorId: string) => {
      const result = await removeCollaborator(collaboratorId);
      if (!result.success) toast.error(result.error || "Failed to remove collaborator");
      else {
        toast.success("Collaborator removed");
        await Promise.all([refreshCollaborators(), refreshActivity()]);
      }
    },
    [refreshActivity, refreshCollaborators],
  );

  const changeMemberRole = useCallback(
    async (collaboratorId: string, role: CollaboratorRole) => {
      const result = await updateCollaboratorRole(collaboratorId, role);
      if (!result.success) toast.error(result.error || "Failed to update role");
      else {
        toast.success("Role updated");
        await Promise.all([refreshCollaborators(), refreshActivity()]);
      }
    },
    [refreshActivity, refreshCollaborators],
  );

  const approveRequest = useCallback(
    async (id: string) => {
      const result = await approveChangeRequest(id);
      if (!result.success) {
        const conflictSuffix =
          Array.isArray(result.conflictFields) && result.conflictFields.length > 0
            ? `: ${result.conflictFields.join(", ")}`
            : "";
        toast.error(
          `${result.error || "Failed to approve request"}${conflictSuffix}`,
        );
        await Promise.all([refreshChangeRequests(), refreshVersions()]);
        return;
      }

      applyRemoteCommit(result.changes);
      realtime.broadcastCommit(result.changes);
      toast.success("Change request approved");
      await Promise.all([
        refreshChangeRequests(),
        refreshActivity(),
        refreshVersions(),
      ]);
      onBotUpdated?.();
    },
    [
      applyRemoteCommit,
      onBotUpdated,
      realtime,
      refreshActivity,
      refreshChangeRequests,
      refreshVersions,
    ],
  );

  const requestChanges = useCallback(
    async (id: string, comment: string) => {
      const result = await requestChangesOnChangeRequest(id, comment);
      if (!result.success) {
        toast.error(result.error || "Failed to request changes");
        return false;
      }
      toast.success("Changes requested");
      await Promise.all([refreshChangeRequests(), refreshActivity()]);
      return true;
    },
    [refreshActivity, refreshChangeRequests],
  );

  const rejectRequest = useCallback(
    async (id: string, reason?: string) => {
      const result = await rejectChangeRequest(id, reason);
      if (!result.success) {
        toast.error(result.error || "Failed to reject request");
        return false;
      }
      toast.success("Change request rejected");
      await Promise.all([refreshChangeRequests(), refreshActivity()]);
      return true;
    },
    [refreshActivity, refreshChangeRequests],
  );

  const restoreVersion = useCallback(
    async (versionId: string) => {
      if (hasDirty) {
        toast.error("Save or discard your local draft before restoring a version");
        return false;
      }
      if (userRole !== "owner" && userRole !== "co_owner") {
        toast.error("Only an Owner or Co-owner can restore versions");
        return false;
      }
      if (realtime.connectionStatus !== "connected") {
        toast.error("Realtime is reconnecting. Wait until the workspace is online");
        return false;
      }

      setRestoringVersionId(versionId);
      try {
        const result = await restoreBotVersion(versionId);
        if (!result.success) {
          toast.error(result.error || "Failed to restore version");
          return false;
        }

        const restoredValues = normalizeWorkspaceBot(result.bot);
        setValues(cloneWorkspaceValues(restoredValues));
        setBaseline(cloneWorkspaceValues(restoredValues));
        valuesRef.current = cloneWorkspaceValues(restoredValues);
        baselineRef.current = cloneWorkspaceValues(restoredValues);
        setTouchedFields(new Set());
        touchedRef.current = new Set();
        setRemoteConflicts(new Set());

        const commit = {
          name: restoredValues.name,
          chat_name: restoredValues.chat_name,
          short_description: restoredValues.short_description,
          personality: restoredValues.personality,
          first_message: restoredValues.first_message,
          alternate_greetings: restoredValues.alternate_greetings,
          scenario: restoredValues.scenario,
          example_dialogues: restoredValues.example_dialogues,
          tags: restoredValues.tags,
          rating: restoredValues.rating,
          image_url: restoredValues.image_url,
          hide_sensitive_fields: restoredValues.hide_sensitive_fields,
        } satisfies Partial<Record<BotCollaborationField, unknown>>;

        realtime.broadcastCommit(commit);
        toast.success(`Restored version ${result.version.version_number}`);
        onBotUpdated?.();
        await Promise.all([refreshVersions(), refreshActivity()]);
        return true;
      } finally {
        setRestoringVersionId(null);
      }
    },
    [
      hasDirty,
      onBotUpdated,
      realtime,
      refreshActivity,
      refreshVersions,
      userRole,
    ],
  );

  const setApprovalRequirement = useCallback(
    async (next: boolean) => {
      const previous = approvalRequired;
      setApprovalRequired(next);
      const result = await toggleBotApproval(botId, next);
      if (!result.success) {
        setApprovalRequired(previous);
        toast.error(result.error || "Failed to update review settings");
        return;
      }
      toast.success(next ? "Editor review enabled" : "Editor review disabled");
    },
    [approvalRequired, botId],
  );

  const contextValue = useMemo<CollaborationWorkspaceContextValue>(
    () => ({
      userRole,
      onBack,
      activeView,
      setActiveView,
      loading,
      saving,
      values,
      baseline,
      dirtyFields,
      remoteConflicts,
      tokenCount,
      approvalRequired,
      collaborators,
      changeRequests,
      comments,
      activity,
      versions,
      restoringVersionId,
      realtime,
      canManageMembers,
      canManageCoOwners,
      canReview,
      canEditField,
      requestFieldAccess,
      releaseField,
      updateField,
      discardAll,
      resolveConflict,
      saveChanges,
      exportBot,
      refreshActivity,
      refreshVersions,
      restoreVersion,
      refreshChangeRequests,
      addComment,
      deleteComment,
      inviteMember,
      removeMember,
      changeMemberRole,
      approveRequest,
      requestChanges,
      rejectRequest,
      setApprovalRequirement,
    }),
    [
      activeView,
      activity,
      versions,
      restoringVersionId,
      addComment,
      approvalRequired,
      approveRequest,
      baseline,
      canEditField,
      canManageCoOwners,
      canManageMembers,
      canReview,
      changeMemberRole,
      changeRequests,
      collaborators,
      comments,
      deleteComment,
      dirtyFields,
      discardAll,
      exportBot,
      inviteMember,
      loading,
      onBack,
      realtime,
      rejectRequest,
      releaseField,
      remoteConflicts,
      removeMember,
      requestChanges,
      requestFieldAccess,
      resolveConflict,
      saveChanges,
      saving,
      setApprovalRequirement,
      tokenCount,
      updateField,
      userRole,
      values,
      refreshActivity,
      refreshVersions,
      restoreVersion,
      refreshChangeRequests,
    ],
  );

  return (
    <CollaborationWorkspaceContext.Provider value={contextValue}>
      {children}
    </CollaborationWorkspaceContext.Provider>
  );
}

export function useCollaborationWorkspace() {
  const context = useContext(CollaborationWorkspaceContext);
  if (!context) {
    throw new Error(
      "useCollaborationWorkspace must be used inside CollaborationWorkspaceProvider",
    );
  }
  return context;
}
