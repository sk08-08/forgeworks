"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { BotWorkspaceRole } from "@/features/bots/types/bot-types";
import type { BotCollaborationField } from "@/features/bots/lib/collaboration-permissions";

export type CollaborationConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error"
  | "closed";

export interface BotCollaborationPresenceUser {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: BotWorkspaceRole;
  activeTab: string;
  activeField: BotCollaborationField | null;
  onlineAt: string;
  lastSeenAt: string;
}

export interface BotCollaborationFieldLock {
  field: BotCollaborationField;
  userId: string;
  expiresAt: string;
}

interface PresenceMeta extends BotCollaborationPresenceUser {
  presence_ref?: string;
}

interface PresenceActivityPayload {
  userId: string;
  activeTab: string;
  activeField: BotCollaborationField | null;
  sentAt: string;
}

interface FieldDraftPayload {
  userId: string;
  field: BotCollaborationField;
  value: unknown;
  sentAt: string;
}

interface FieldLockPayload {
  userId: string;
  field: BotCollaborationField;
  state: "acquired" | "released";
  expiresAt?: string;
}

interface FieldValuesPayload {
  userId: string;
  values: Partial<Record<BotCollaborationField, unknown>>;
  sentAt: string;
}

interface UseBotCollaborationRealtimeOptions {
  botId: string;
  role: BotWorkspaceRole;
  activeTab: string;
  onRemoteFieldChange?: (
    field: BotCollaborationField,
    value: unknown,
    userId: string,
  ) => void;
  onRemoteCommit?: (
    values: Partial<Record<BotCollaborationField, unknown>>,
    userId: string,
  ) => void;
  onRemoteReset?: (
    values: Partial<Record<BotCollaborationField, unknown>>,
    userId: string,
  ) => void;
  onRemoteDraftAbandoned?: (
    field: BotCollaborationField,
    userId: string,
  ) => void;
}

const LOCK_TTL_SECONDS = 20;
const LOCK_HEARTBEAT_MS = 8_000;
const LOCK_REFRESH_MS = 5_000;
const RECONNECT_DELAY_MS = 1_500;

function dedupePresence(
  state: Record<string, PresenceMeta[]>,
  activity: Record<string, PresenceActivityPayload | undefined>,
): BotCollaborationPresenceUser[] {
  const users = new Map<string, BotCollaborationPresenceUser>();

  for (const metas of Object.values(state)) {
    for (const meta of metas) {
      if (!meta?.userId) continue;

      const current = users.get(meta.userId);
      const activitySnapshot = activity[meta.userId];
      const candidate: BotCollaborationPresenceUser = {
        userId: meta.userId,
        username: meta.username ?? null,
        displayName: meta.displayName ?? null,
        avatarUrl: meta.avatarUrl ?? null,
        role: meta.role,
        activeTab: activitySnapshot?.activeTab ?? meta.activeTab ?? "editor",
        activeField: activitySnapshot?.activeField ?? meta.activeField ?? null,
        onlineAt: meta.onlineAt,
        lastSeenAt: activitySnapshot?.sentAt ?? meta.lastSeenAt,
      };

      if (
        !current ||
        new Date(candidate.onlineAt).getTime() >=
          new Date(current.onlineAt).getTime()
      ) {
        users.set(meta.userId, candidate);
      }
    }
  }

  return [...users.values()].sort((a, b) =>
    (a.displayName || a.username || "").localeCompare(
      b.displayName || b.username || "",
    ),
  );
}

export function useBotCollaborationRealtime({
  botId,
  role,
  activeTab,
  onRemoteFieldChange,
  onRemoteCommit,
  onRemoteReset,
  onRemoteDraftAbandoned,
}: UseBotCollaborationRealtimeOptions) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const ownFieldsRef = useRef<Set<BotCollaborationField>>(new Set());
  const activeFieldRef = useRef<BotCollaborationField | null>(null);
  const latestActiveTabRef = useRef(activeTab);
  const remoteDraftOwnersRef = useRef<
    Partial<Record<BotCollaborationField, string>>
  >({});
  const activityByUserRef = useRef<
    Record<string, PresenceActivityPayload | undefined>
  >({});
  const connectionStatusRef = useRef<CollaborationConnectionStatus>("connecting");
  const remoteChangeRef = useRef(onRemoteFieldChange);
  const remoteCommitRef = useRef(onRemoteCommit);
  const remoteResetRef = useRef(onRemoteReset);
  const remoteDraftAbandonedRef = useRef(onRemoteDraftAbandoned);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [presenceUsers, setPresenceUsers] = useState<
    BotCollaborationPresenceUser[]
  >([]);
  const [locks, setLocks] = useState<
    Partial<Record<BotCollaborationField, BotCollaborationFieldLock>>
  >({});
  const [activeField, setActiveField] =
    useState<BotCollaborationField | null>(null);
  const [ownedFields, setOwnedFields] = useState<Set<BotCollaborationField>>(
    new Set(),
  );
  const [claimingField, setClaimingField] =
    useState<BotCollaborationField | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<CollaborationConnectionStatus>("connecting");

  const updateConnectionStatus = useCallback(
    (status: CollaborationConnectionStatus) => {
      connectionStatusRef.current = status;
      setConnectionStatus(status);
    },
    [],
  );

  useEffect(() => {
    activeFieldRef.current = activeField;
  }, [activeField]);

  useEffect(() => {
    latestActiveTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    remoteChangeRef.current = onRemoteFieldChange;
  }, [onRemoteFieldChange]);

  useEffect(() => {
    remoteCommitRef.current = onRemoteCommit;
  }, [onRemoteCommit]);

  useEffect(() => {
    remoteResetRef.current = onRemoteReset;
  }, [onRemoteReset]);

  useEffect(() => {
    remoteDraftAbandonedRef.current = onRemoteDraftAbandoned;
  }, [onRemoteDraftAbandoned]);

  const syncPresenceUsers = useCallback((channel: RealtimeChannel) => {
    const state = channel.presenceState<PresenceMeta>();
    const liveUserIds = new Set<string>();

    for (const metas of Object.values(state)) {
      for (const meta of metas) {
        if (meta?.userId) liveUserIds.add(meta.userId);
      }
    }

    for (const userId of Object.keys(activityByUserRef.current)) {
      if (!liveUserIds.has(userId)) {
        delete activityByUserRef.current[userId];
      }
    }

    setPresenceUsers(dedupePresence(state, activityByUserRef.current));
  }, []);

  const publishActivity = useCallback(
    (patch: {
      activeTab?: string;
      activeField?: BotCollaborationField | null;
    }) => {
      const userId = userIdRef.current;
      if (!userId) return;

      const previous = activityByUserRef.current[userId];
      const payload: PresenceActivityPayload = {
        userId,
        activeTab:
          patch.activeTab ?? previous?.activeTab ?? latestActiveTabRef.current,
        activeField:
          patch.activeField !== undefined
            ? patch.activeField
            : previous?.activeField ?? activeFieldRef.current,
        sentAt: new Date().toISOString(),
      };

      activityByUserRef.current[userId] = payload;
      setPresenceUsers((current) =>
        current.map((item) =>
          item.userId === userId
            ? {
                ...item,
                activeTab: payload.activeTab,
                activeField: payload.activeField,
                lastSeenAt: payload.sentAt,
              }
            : item,
        ),
      );

      const channel = channelRef.current;
      if (!channel || connectionStatusRef.current !== "connected") return;

      void channel.send({
        type: "broadcast",
        event: "presence-activity",
        payload,
      });
    },
    [],
  );

  const refreshLocks = useCallback(async () => {
    const { data, error } = await supabase
      .from("bot_collaboration_locks")
      .select("field_key, user_id, expires_at")
      .eq("bot_id", botId)
      .gt("expires_at", new Date().toISOString());

    if (error) return;

    const next: Partial<
      Record<BotCollaborationField, BotCollaborationFieldLock>
    > = {};

    for (const row of data || []) {
      const field = row.field_key as BotCollaborationField;
      next[field] = {
        field,
        userId: row.user_id,
        expiresAt: row.expires_at,
      };
    }

    setLocks(next);

    const currentUserId = userIdRef.current;
    let activeFieldLost = false;
    const nextOwned = new Set(ownFieldsRef.current);

    for (const field of ownFieldsRef.current) {
      const ownLock = next[field];
      if (!ownLock || ownLock.userId !== currentUserId) {
        nextOwned.delete(field);
        if (activeFieldRef.current === field) activeFieldLost = true;
      }
    }

    if (nextOwned.size !== ownFieldsRef.current.size) {
      ownFieldsRef.current = nextOwned;
      setOwnedFields(new Set(nextOwned));
    }

    if (activeFieldLost) {
      activeFieldRef.current = null;
      setActiveField(null);
      publishActivity({ activeField: null });
    }

    for (const [fieldKey, draftOwner] of Object.entries(
      remoteDraftOwnersRef.current,
    )) {
      const field = fieldKey as BotCollaborationField;
      const lock = next[field];
      if (!draftOwner) continue;
      if (!lock || lock.userId !== draftOwner) {
        delete remoteDraftOwnersRef.current[field];
        remoteDraftAbandonedRef.current?.(field, draftOwner);
      }
    }
  }, [botId, publishActivity, supabase]);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: number | null = null;

    const setup = async () => {
      updateConnectionStatus("connecting");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        updateConnectionStatus("error");
        return;
      }

      userIdRef.current = user.id;
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const connectChannel = async () => {
        if (cancelled) return;

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          await supabase.realtime.setAuth(session.access_token);
        }

        const previous = channelRef.current;
        if (previous) {
          channelRef.current = null;
          try {
            await supabase.removeChannel(previous);
          } catch {
            // A failed cleanup must not prevent reconnection.
          }
        }

        if (cancelled) return;

        const now = new Date().toISOString();
        const presence: PresenceMeta = {
          userId: user.id,
          username: profile?.username ?? null,
          displayName: profile?.display_name ?? null,
          avatarUrl: profile?.avatar_url ?? null,
          role,
          activeTab: latestActiveTabRef.current,
          activeField: activeFieldRef.current,
          onlineAt: now,
          lastSeenAt: now,
        };

        const channel = supabase.channel(`bot:${botId}:collaboration`, {
          config: {
            private: true,
            presence: { key: user.id },
            broadcast: { self: false, ack: false },
          },
        });

        channelRef.current = channel;

        const scheduleReconnect = () => {
          if (cancelled || channelRef.current !== channel) return;
          updateConnectionStatus("reconnecting");
          setPresenceUsers([]);
          channelRef.current = null;
          void supabase.removeChannel(channel);
          if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            void connectChannel();
          }, RECONNECT_DELAY_MS);
        };

        channel
          .on("presence", { event: "sync" }, () => {
            if (channelRef.current !== channel) return;
            syncPresenceUsers(channel);
          })
          .on(
            "broadcast",
            { event: "presence-activity" },
            ({ payload }: { payload: PresenceActivityPayload }) => {
              if (!payload || payload.userId === user.id) return;
              activityByUserRef.current[payload.userId] = payload;
              setPresenceUsers((current) =>
                current.map((item) =>
                  item.userId === payload.userId
                    ? {
                        ...item,
                        activeTab: payload.activeTab,
                        activeField: payload.activeField,
                        lastSeenAt: payload.sentAt,
                      }
                    : item,
                ),
              );
            },
          )
          .on(
            "broadcast",
            { event: "field-draft" },
            ({ payload }: { payload: FieldDraftPayload }) => {
              if (!payload || payload.userId === user.id) return;
              if (ownFieldsRef.current.has(payload.field)) return;
              remoteDraftOwnersRef.current[payload.field] = payload.userId;
              remoteChangeRef.current?.(
                payload.field,
                payload.value,
                payload.userId,
              );
            },
          )
          .on(
            "broadcast",
            { event: "field-lock" },
            ({ payload }: { payload: FieldLockPayload }) => {
              if (!payload) return;

              if (payload.state === "released") {
                setLocks((current) => {
                  const next = { ...current };
                  if (next[payload.field]?.userId === payload.userId) {
                    delete next[payload.field];
                  }
                  return next;
                });

                const draftOwner = remoteDraftOwnersRef.current[payload.field];
                if (draftOwner === payload.userId) {
                  delete remoteDraftOwnersRef.current[payload.field];
                  remoteDraftAbandonedRef.current?.(
                    payload.field,
                    payload.userId,
                  );
                }
                return;
              }

              setLocks((current) => ({
                ...current,
                [payload.field]: {
                  field: payload.field,
                  userId: payload.userId,
                  expiresAt:
                    payload.expiresAt ||
                    new Date(
                      Date.now() + LOCK_TTL_SECONDS * 1000,
                    ).toISOString(),
                },
              }));
            },
          )
          .on(
            "broadcast",
            { event: "field-commit" },
            ({ payload }: { payload: FieldValuesPayload }) => {
              if (!payload || payload.userId === user.id) return;
              const safeValues = { ...payload.values };
              for (const field of ownFieldsRef.current) delete safeValues[field];
              for (const fieldKey of Object.keys(payload.values)) {
                const field = fieldKey as BotCollaborationField;
                if (remoteDraftOwnersRef.current[field] === payload.userId) {
                  delete remoteDraftOwnersRef.current[field];
                }
              }
              remoteCommitRef.current?.(safeValues, payload.userId);
            },
          )
          .on(
            "broadcast",
            { event: "field-reset" },
            ({ payload }: { payload: FieldValuesPayload }) => {
              if (!payload || payload.userId === user.id) return;
              const safeValues = { ...payload.values };
              for (const field of ownFieldsRef.current) delete safeValues[field];
              for (const fieldKey of Object.keys(payload.values)) {
                const field = fieldKey as BotCollaborationField;
                if (remoteDraftOwnersRef.current[field] === payload.userId) {
                  delete remoteDraftOwnersRef.current[field];
                }
              }
              remoteResetRef.current?.(safeValues, payload.userId);
            },
          )
          .subscribe(async (status, error) => {
            if (cancelled || channelRef.current !== channel) return;

            if (status === "SUBSCRIBED") {
              updateConnectionStatus("connected");
              try {
                await channel.track(presence);
              } catch (trackError) {
                console.error("Collaboration Presence track failed", trackError);
                scheduleReconnect();
                return;
              }
              await refreshLocks();
              publishActivity({
                activeTab: latestActiveTabRef.current,
                activeField: activeFieldRef.current,
              });
              return;
            }

            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              console.error("Collaboration Realtime channel error", status, error);
              scheduleReconnect();
              return;
            }

            if (status === "CLOSED") {
              scheduleReconnect();
            }
          });
      };

      await connectChannel();
    };

    void setup();

    const handlePageHide = () => {
      const channel = channelRef.current;
      if (channel) void channel.untrack();
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", handlePageHide);
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      const channel = channelRef.current;
      channelRef.current = null;
      setPresenceUsers([]);
      if (channel) {
        void channel.untrack();
        void supabase.removeChannel(channel);
      }
    };
  }, [
    botId,
    publishActivity,
    refreshLocks,
    role,
    supabase,
    syncPresenceUsers,
    updateConnectionStatus,
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshLocks();
    }, LOCK_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [refreshLocks]);

  useEffect(() => {
    publishActivity({ activeTab });
  }, [activeTab, publishActivity]);

  const releaseField = useCallback(
    async (field: BotCollaborationField) => {
      if (!ownFieldsRef.current.has(field)) return;

      const userId = userIdRef.current;
      const nextOwned = new Set(ownFieldsRef.current);
      nextOwned.delete(field);
      ownFieldsRef.current = nextOwned;
      setOwnedFields(new Set(nextOwned));

      if (activeFieldRef.current === field) {
        activeFieldRef.current = null;
        setActiveField(null);
        publishActivity({ activeField: null });
      }

      await supabase.rpc("release_bot_collaboration_lock", {
        p_bot_id: botId,
        p_field_key: field,
      });

      setLocks((current) => {
        const next = { ...current };
        if (next[field]?.userId === userId) delete next[field];
        return next;
      });

      const channel = channelRef.current;
      if (userId && channel && connectionStatus === "connected") {
        void channel.send({
          type: "broadcast",
          event: "field-lock",
          payload: {
            userId,
            field,
            state: "released",
          } satisfies FieldLockPayload,
        });
      }
    },
    [botId, connectionStatus, publishActivity, supabase],
  );

  const deactivateField = useCallback(
    (field: BotCollaborationField) => {
      if (activeFieldRef.current !== field) return;
      activeFieldRef.current = null;
      setActiveField(null);
      publishActivity({ activeField: null });
    },
    [publishActivity],
  );

  const activateField = useCallback(
    (field: BotCollaborationField) => {
      if (!ownFieldsRef.current.has(field)) return false;
      activeFieldRef.current = field;
      setActiveField(field);
      publishActivity({ activeField: field });
      return true;
    },
    [publishActivity],
  );

  const claimField = useCallback(
    async (field: BotCollaborationField): Promise<boolean> => {
      const userId = userIdRef.current;
      if (!userId || connectionStatus !== "connected") return false;

      if (ownFieldsRef.current.has(field)) {
        activateField(field);
        return true;
      }

      setClaimingField(field);
      const { data, error } = await supabase.rpc(
        "claim_bot_collaboration_lock",
        {
          p_bot_id: botId,
          p_field_key: field,
          p_ttl_seconds: LOCK_TTL_SECONDS,
        },
      );
      setClaimingField(null);

      if (error || data !== true) {
        await refreshLocks();
        return false;
      }

      // A successful claim proves any previous owner is gone. If this client
      // was still displaying that owner's uncommitted realtime draft, restore
      // the persisted baseline before local editing begins.
      const abandonedDraftOwner = remoteDraftOwnersRef.current[field];
      if (abandonedDraftOwner && abandonedDraftOwner !== userId) {
        remoteDraftAbandonedRef.current?.(field, abandonedDraftOwner);
        delete remoteDraftOwnersRef.current[field];
      }

      const nextOwned = new Set(ownFieldsRef.current);
      nextOwned.add(field);
      ownFieldsRef.current = nextOwned;
      setOwnedFields(new Set(nextOwned));
      activeFieldRef.current = field;
      setActiveField(field);

      const expiresAt = new Date(
        Date.now() + LOCK_TTL_SECONDS * 1000,
      ).toISOString();

      setLocks((current) => ({
        ...current,
        [field]: { field, userId, expiresAt },
      }));

      publishActivity({ activeField: field });

      const channel = channelRef.current;
      if (channel) {
        void channel.send({
          type: "broadcast",
          event: "field-lock",
          payload: {
            userId,
            field,
            state: "acquired",
            expiresAt,
          } satisfies FieldLockPayload,
        });
      }

      return true;
    },
    [
      activateField,
      botId,
      connectionStatus,
      publishActivity,
      refreshLocks,
      supabase,
    ],
  );

  useEffect(() => {
    if (ownedFields.size === 0) return;

    const timer = window.setInterval(async () => {
      const fields = [...ownFieldsRef.current];
      if (fields.length === 0) return;

      for (const field of fields) {
        const { data } = await supabase.rpc(
          "heartbeat_bot_collaboration_lock",
          {
            p_bot_id: botId,
            p_field_key: field,
            p_ttl_seconds: LOCK_TTL_SECONDS,
          },
        );

        if (data !== true && ownFieldsRef.current.has(field)) {
          const nextOwned = new Set(ownFieldsRef.current);
          nextOwned.delete(field);
          ownFieldsRef.current = nextOwned;
          setOwnedFields(new Set(nextOwned));
          if (activeFieldRef.current === field) {
            activeFieldRef.current = null;
            setActiveField(null);
            publishActivity({ activeField: null });
          }
        }
      }

      await refreshLocks();
    }, LOCK_HEARTBEAT_MS);

    return () => window.clearInterval(timer);
  }, [botId, ownedFields, publishActivity, refreshLocks, supabase]);

  const broadcastFieldChange = useCallback(
    (field: BotCollaborationField, value: unknown) => {
      const channel = channelRef.current;
      const userId = userIdRef.current;
      if (
        connectionStatus !== "connected" ||
        !channel ||
        !userId ||
        !ownFieldsRef.current.has(field) ||
        locks[field]?.userId !== userId
      ) {
        return;
      }

      void channel.send({
        type: "broadcast",
        event: "field-draft",
        payload: {
          userId,
          field,
          value,
          sentAt: new Date().toISOString(),
        } satisfies FieldDraftPayload,
      });
    },
    [connectionStatus, locks],
  );

  const broadcastCommit = useCallback(
    (values: Partial<Record<BotCollaborationField, unknown>>) => {
      const channel = channelRef.current;
      const userId = userIdRef.current;
      if (
        connectionStatus !== "connected" ||
        !channel ||
        !userId ||
        Object.keys(values).length === 0
      ) {
        return;
      }

      void channel.send({
        type: "broadcast",
        event: "field-commit",
        payload: {
          userId,
          values,
          sentAt: new Date().toISOString(),
        } satisfies FieldValuesPayload,
      });
    },
    [connectionStatus],
  );

  const broadcastReset = useCallback(
    (values: Partial<Record<BotCollaborationField, unknown>>) => {
      const channel = channelRef.current;
      const userId = userIdRef.current;
      if (
        connectionStatus !== "connected" ||
        !channel ||
        !userId ||
        Object.keys(values).length === 0
      ) {
        return;
      }

      void channel.send({
        type: "broadcast",
        event: "field-reset",
        payload: {
          userId,
          values,
          sentAt: new Date().toISOString(),
        } satisfies FieldValuesPayload,
      });
    },
    [connectionStatus],
  );

  const getFieldLock = useCallback(
    (field: BotCollaborationField) => {
      const lock = locks[field];
      if (!lock) return null;
      if (new Date(lock.expiresAt).getTime() <= Date.now()) return null;
      return lock;
    },
    [locks],
  );

  const isFieldLockedByOther = useCallback(
    (field: BotCollaborationField) => {
      const lock = getFieldLock(field);
      return Boolean(lock && currentUserId && lock.userId !== currentUserId);
    },
    [currentUserId, getFieldLock],
  );

  const ownsFieldLock = useCallback(
    (field: BotCollaborationField) => {
      const lock = getFieldLock(field);
      return Boolean(
        lock &&
          currentUserId &&
          lock.userId === currentUserId &&
          ownFieldsRef.current.has(field),
      );
    },
    [currentUserId, getFieldLock],
  );

  const canMutateField = useCallback(
    (field: BotCollaborationField) =>
      connectionStatus === "connected" &&
      claimingField !== field &&
      ownsFieldLock(field),
    [claimingField, connectionStatus, ownsFieldLock],
  );

  const getPresenceUser = useCallback(
    (userId: string | null | undefined) =>
      presenceUsers.find((user) => user.userId === userId) ?? null,
    [presenceUsers],
  );

  return {
    connectionStatus,
    currentUserId,
    presenceUsers,
    locks,
    activeField,
    ownedFields,
    claimingField,
    claimField,
    activateField,
    deactivateField,
    releaseField,
    refreshLocks,
    broadcastFieldChange,
    broadcastCommit,
    broadcastReset,
    getFieldLock,
    isFieldLockedByOther,
    ownsFieldLock,
    canMutateField,
    getPresenceUser,
  };
}
