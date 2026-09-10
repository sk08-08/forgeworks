// ============================================================================
// Forgeworks - Application Store
// Client-side state management using React Context
// ============================================================================

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  Bot,
  BotFormData,
  CollaborativeBot,
} from "@/features/bots/types/bot-types";

import type {
  RequestForm,
  Request,
  RequestStatus,
} from "@/features/forms/types/form-types";

import type { NavigationView } from "@/features/app-shell/types/navigation";
import { getCurrentUserAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/client";

const validNavigationViews: NavigationView[] = [
  "profiles",
  "resources",
  "community",
  "dashboard",
  "bots",
  "forms",
  "requests",
  "moderation",
  "feedback",
  "atlas",
  "creator-pages",
  "profile",
  "admin",
];

function toNavigationView(value: string | null): NavigationView | null {
  if (!value) return null;
  if (value === "release-generator") return "atlas";

  return validNavigationViews.includes(value as NavigationView)
    ? (value as NavigationView)
    : null;
}

// ----------------------------------------------------------------------------
// Store State Interface
// ----------------------------------------------------------------------------

interface StoreState {
  // Navigation
  currentView: NavigationView;
  setCurrentView: (view: NavigationView) => void;

  // Bots
  bots: Bot[];
  addBot: (data: BotFormData) => Bot;
  upsertBot: (bot: Bot) => void;
  updateBot: (id: string, data: Partial<BotFormData>) => void;
  deleteBot: (id: string) => void;
  getBot: (id: string) => Bot | undefined;

  // Collaborative Bots (shared with current user)
  collaborativeBots: CollaborativeBot[];
  refreshCollaborativeBots: () => Promise<void>;

  // Forms
  forms: RequestForm[];
  addForm: (
    form: Omit<RequestForm, "id" | "shareableLink" | "createdAt" | "updatedAt">,
  ) => RequestForm;
  upsertForm: (form: RequestForm) => void;
  updateForm: (id: string, data: Partial<RequestForm>) => void;
  deleteForm: (id: string) => void;
  getForm: (id: string) => RequestForm | undefined;

  // Requests
  requests: Request[];
  addRequest: (
    request: Omit<Request, "id" | "createdAt" | "updatedAt">,
  ) => Request;
  updateRequestStatus: (
    id: string,
    status: RequestStatus,
    notes?: string,
  ) => void;
  updateRequestNotes: (id: string, notes: string) => void;
  deleteRequest: (id: string) => void;
  getRequestsByFormId: (formId: string) => Request[];
  getRequestsByStatus: (status: RequestStatus) => Request[];

  // UI State
  selectedBotId: string | null;
  setSelectedBotId: (id: string | null) => void;
  selectedFormId: string | null;
  setSelectedFormId: (id: string | null) => void;
}

// ----------------------------------------------------------------------------
// Context Creation
// ----------------------------------------------------------------------------

const StoreContext = createContext<StoreState | null>(null);

// No sample data: the store starts empty and components must handle empty states.
// ----------------------------------------------------------------------------
// Store Provider Component
// ----------------------------------------------------------------------------

export function StoreProvider({ children }: { children: ReactNode }) {
  // Navigation state - hydrate from localStorage before the first paint.
  const [currentView, setCurrentViewState] = useState<NavigationView>(() => {
    if (typeof window === "undefined") return "dashboard";

    const savedView = localStorage.getItem("currentView");
    const normalizedSavedView = toNavigationView(savedView);
    return normalizedSavedView ?? "dashboard";
  });

  // Wrapper to persist navigation to localStorage
  const setCurrentView = useCallback((view: NavigationView) => {
    setCurrentViewState(view);
    if (typeof window !== "undefined") {
      localStorage.setItem("currentView", view);
    }
  }, []);

  // Data state (start empty; fetch from Supabase on mount)
  const [bots, setBots] = useState<Bot[]>([]);
  const [collaborativeBots, setCollaborativeBots] = useState<
    CollaborativeBot[]
  >([]);
  const [forms, setForms] = useState<RequestForm[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  // Try to load real data from Supabase on client mount. Fall back to sample data on error.
  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    let activeRequestsChannel: { remove: () => void } | null = null;
    let loadVersion = 0;

    const clearPrivateData = () => {
      setBots([]);
      setCollaborativeBots([]);
      setForms([]);
      setRequests([]);
    };

    const removeRequestsChannel = () => {
      activeRequestsChannel?.remove();
      activeRequestsChannel = null;
    };

    const setUpRequestsChannel = async (userId: string) => {
      removeRequestsChannel();

      const ch = supabase
        .channel("requests-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "requests",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const r = payload.new as any;
              if (r.deleted_at) return;
              setRequests((prev) => {
                if (prev.some((req) => req.id === r.id)) return prev;
                return [
                  ...prev,
                  {
                    id: r.id,
                    formId: r.form_id,
                    ownerId: r.user_id || undefined,
                    formTitle: r.form_title,
                    status: r.status,
                    submitterName: r.submitter_name,
                    responses: r.responses || {},
                    responseLabels: r.response_labels || {},
                    notes: r.notes,
                    createdAt: r.created_at
                      ? new Date(r.created_at)
                      : new Date(),
                    updatedAt: r.updated_at
                      ? new Date(r.updated_at)
                      : new Date(),
                  },
                ];
              });
            } else if (payload.eventType === "UPDATE") {
              const r = payload.new as any;
              if (r.deleted_at) {
                setRequests((prev) => prev.filter((req) => req.id !== r.id));
                return;
              }
              setRequests((prev) =>
                prev.map((req) =>
                  req.id === r.id
                    ? {
                        ...req,
                        formTitle: r.form_title || req.formTitle,
                        status: r.status,
                        submitterName: r.submitter_name || req.submitterName,
                        responses: r.responses || req.responses,
                        responseLabels: r.response_labels || req.responseLabels,
                        notes: r.notes ?? req.notes,
                        updatedAt: r.updated_at
                          ? new Date(r.updated_at)
                          : new Date(),
                      }
                    : req,
                ),
              );
            } else if (payload.eventType === "DELETE") {
              const oldId = (payload.old as any)?.id;
              if (oldId) {
                setRequests((prev) => prev.filter((req) => req.id !== oldId));
              }
            }
          },
        )
        .subscribe();

      activeRequestsChannel = {
        remove: () => {
          supabase.removeChannel(ch);
        },
      };
    };

    async function load() {
      const currentLoad = ++loadVersion;
      try {
        // Get current authenticated user; if not authenticated, do not fetch private data.
        const { user, isAdmin } = await getCurrentUserAccess(supabase);

        if (!mounted || currentLoad !== loadVersion) return;

        if (!user) {
          // Not signed in: don't fetch or expose any user-scoped lists.
          clearPrivateData();
          removeRequestsChannel();
          return;
        }

        // Fetch collaborative bots (shared with this user)
        const { getCollaborativeBots } =
          await import("@/features/bots/actions/collaboration");
        const collabResult = await getCollaborativeBots();
        if (mounted && currentLoad === loadVersion && collabResult.success) {
          setCollaborativeBots((collabResult.bots || []) as CollaborativeBot[]);
        }

        // Fetch only data belonging to the authenticated user
        const formsQuery = isAdmin
          ? supabase.from("request_forms").select("*").is("deleted_at", null)
          : supabase
              .from("request_forms")
              .select("*")
              .eq("user_id", user.id)
              .is("deleted_at", null);
        const requestsQuery = isAdmin
          ? supabase.from("active_requests").select("*")
          : supabase.from("active_requests").select("*").eq("user_id", user.id);
        const [
          { data: botsData, error: botsError },
          { data: formsData, error: formsError },
          { data: requestsData, error: requestsError },
        ] = await Promise.all([
          supabase
            .from("active_bots")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false }),
          formsQuery,
          requestsQuery,
        ]);

        if (botsError) throw botsError;
        if (formsError) throw formsError;
        if (requestsError) throw requestsError;

        if (!mounted || currentLoad !== loadVersion) return;

        // Map rows to app types
        setBots(
          Array.isArray(botsData)
            ? botsData.map((r: any) => ({
                id: r.id,
                ownerId: r.user_id || undefined,
                name: r.name,
                chatName: r.chat_name || undefined,
                shortDescription: r.short_description || "",
                personality: r.personality || "",
                firstMessage: r.first_message || "",
                alternateGreetings: Array.isArray(r.alternate_greetings)
                  ? r.alternate_greetings
                  : [],
                scenario: r.scenario || "",
                exampleDialogues: r.example_dialogues || "",
                tags: Array.isArray(r.tags) ? r.tags : [],
                rating: r.rating === "NSFW" ? "NSFW" : "SFW",
                imageUrl: r.image_url || undefined,
                hideSensitiveFields: r.hide_sensitive_fields === true,
                createdAt: r.created_at ? new Date(r.created_at) : new Date(),
                updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
              }))
            : [],
        );

        setForms(
          Array.isArray(formsData)
            ? formsData.map((r: any) => ({
                id: r.id,
                ownerId: r.user_id || undefined,
                title: r.title,
                description: r.description || "",
                bannerAssetPath: r.banner_asset_path || "",
                bannerUrl: r.banner_url || "",
                sections: r.sections || [],
                appearance: r.appearance || undefined,
                shareableLink: r.shareable_link || "",
                isActive: !!r.is_active,
                deactivatedMessage: r.deactivated_message || "",
                deactivatedRedirectUrl: r.deactivated_redirect_url || "",
                deactivatedRedirectLabel: r.deactivated_redirect_label || "",
                deactivatedAccentColor: r.deactivated_accent_color || "#7c3aed",
                createdAt: r.created_at ? new Date(r.created_at) : new Date(),
                updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
              }))
            : [],
        );

        setRequests(
          Array.isArray(requestsData)
            ? requestsData.map((r: any) => ({
                id: r.id,
                formId: r.form_id,
                ownerId: r.user_id || undefined,
                formTitle: r.form_title,
                status: r.status,
                submitterName: r.submitter_name,
                responses: r.responses || {},
                responseLabels: r.response_labels || {},
                notes: r.notes,
                createdAt: r.created_at ? new Date(r.created_at) : new Date(),
                updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
              }))
            : [],
        );

        await setUpRequestsChannel(user.id);
      } catch (err: unknown) {
        // If anything goes wrong (no env, network, or permissions), log and leave store empty
        const msg =
          typeof err === "object" && err !== null && "message" in err
            ? (err as any).message
            : String(err);
        console.info("Supabase load failed:", msg);
        if (mounted && currentLoad === loadVersion) {
          clearPrivateData();
          removeRequestsChannel();
        }
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void (async () => {
        try {
          await supabase.auth.refreshSession();
        } catch {
          // Ignore refresh failures and let the next load decide.
        }
        await load();
      })();
    };

    const handleWindowFocus = () => {
      void (async () => {
        try {
          await supabase.auth.refreshSession();
        } catch {
          // Ignore refresh failures and let the next load decide.
        }
        await load();
      })();
    };

    const authListener = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT" || !session?.user) {
        clearPrivateData();
        removeRequestsChannel();
        return;
      }

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "INITIAL_SESSION"
      ) {
        void load();
      }
    });

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    void load();

    return () => {
      mounted = false;
      removeRequestsChannel();
      authListener.data.subscription.unsubscribe();
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // UI state
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  // Bot operations
  const addBot = useCallback((data: BotFormData): Bot => {
    const newBot: Bot = {
      id: uuidv4(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setBots((prev) => [...prev, newBot]);
    return newBot;
  }, []);

  const upsertBot = useCallback((bot: Bot) => {
    setBots((prev) => {
      const exists = prev.some((b) => b.id === bot.id);
      if (exists) return prev.map((b) => (b.id === bot.id ? bot : b));
      return [...prev, bot];
    });
  }, []);

  const updateBot = useCallback((id: string, data: Partial<BotFormData>) => {
    setBots((prev) =>
      prev.map((bot) =>
        bot.id === id ? { ...bot, ...data, updatedAt: new Date() } : bot,
      ),
    );
  }, []);

  const deleteBot = useCallback((id: string) => {
    setBots((prev) => prev.filter((bot) => bot.id !== id));
  }, []);

  const getBot = useCallback(
    (id: string) => {
      return bots.find((bot) => bot.id === id);
    },
    [bots],
  );

  // Refresh collaborative bots
  const refreshCollaborativeBots = useCallback(async () => {
    try {
      const { getCollaborativeBots } =
        await import("@/features/bots/actions/collaboration");
      const result = await getCollaborativeBots();
      if (result.success) {
        setCollaborativeBots((result.bots || []) as CollaborativeBot[]);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  // Form operations
  const addForm = useCallback(
    (
      formData: Omit<
        RequestForm,
        "id" | "shareableLink" | "createdAt" | "updatedAt"
      >,
    ): RequestForm => {
      const newForm: RequestForm = {
        id: uuidv4(),
        ...formData,
        shareableLink: `form-${uuidv4().slice(0, 8)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setForms((prev) => [...prev, newForm]);
      return newForm;
    },
    [],
  );

  const upsertForm = useCallback((form: RequestForm) => {
    setForms((prev) => {
      const exists = prev.some((f) => f.id === form.id);
      if (exists) return prev.map((p) => (p.id === form.id ? form : p));
      return [...prev, form];
    });
  }, []);

  const updateForm = useCallback((id: string, data: Partial<RequestForm>) => {
    setForms((prev) =>
      prev.map((form) =>
        form.id === id ? { ...form, ...data, updatedAt: new Date() } : form,
      ),
    );
  }, []);

  const deleteForm = useCallback((id: string) => {
    setForms((prev) => prev.filter((form) => form.id !== id));
  }, []);

  const getForm = useCallback(
    (id: string) => {
      return forms.find((form) => form.id === id);
    },
    [forms],
  );

  // Request operations
  const addRequest = useCallback(
    (requestData: Omit<Request, "id" | "createdAt" | "updatedAt">): Request => {
      const newRequest: Request = {
        id: uuidv4(),
        ...requestData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setRequests((prev) => [...prev, newRequest]);
      return newRequest;
    },
    [],
  );

  const updateRequestStatus = useCallback(
    async (id: string, status: RequestStatus, notes?: string) => {
      // Update UI immediately
      setRequests((prev) =>
        prev.map((req) =>
          req.id === id
            ? {
                ...req,
                status,
                notes: notes ?? req.notes,
                updatedAt: new Date(),
              }
            : req,
        ),
      );

      // Update in Supabase in the background
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error } = await supabase
          .from("requests")
          .update({
            status,
            notes: notes ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) {
          console.error("Error updating request status:", error);
        }
      } catch (err) {
        console.error("Failed to update request status in Supabase:", err);
      }
    },
    [],
  );

  const updateRequestNotes = useCallback(async (id: string, notes: string) => {
    // Update UI immediately
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id ? { ...req, notes, updatedAt: new Date() } : req,
      ),
    );

    // Update in Supabase in the background
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("requests")
        .update({
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Error updating request notes:", error);
      }
    } catch (err) {
      console.error("Failed to update request notes in Supabase:", err);
    }
  }, []);

  const deleteRequest = useCallback(async (id: string) => {
    // Remove from UI immediately
    setRequests((prev) => prev.filter((req) => req.id !== id));

    // Soft delete: set deleted_at instead of hard delete
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("requests")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        console.error("Error soft-deleting request:", error);
      }
    } catch (err) {
      console.error("Failed to soft-delete request in Supabase:", err);
    }
  }, []);

  const getRequestsByFormId = useCallback(
    (formId: string) => {
      return requests.filter((req) => req.formId === formId);
    },
    [requests],
  );

  const getRequestsByStatus = useCallback(
    (status: RequestStatus) => {
      return requests.filter((req) => req.status === status);
    },
    [requests],
  );

  const value: StoreState = {
    currentView,
    setCurrentView,
    bots,
    addBot,
    upsertBot,
    updateBot,
    deleteBot,
    getBot,
    collaborativeBots,
    refreshCollaborativeBots,
    forms,
    addForm,
    upsertForm,
    updateForm,
    deleteForm,
    getForm,
    requests,
    addRequest,
    updateRequestStatus,
    updateRequestNotes,
    deleteRequest,
    getRequestsByFormId,
    getRequestsByStatus,
    selectedBotId,
    setSelectedBotId,
    selectedFormId,
    setSelectedFormId,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

// ----------------------------------------------------------------------------
// Custom Hook for accessing the store
// ----------------------------------------------------------------------------

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
