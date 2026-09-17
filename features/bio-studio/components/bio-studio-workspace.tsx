"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Braces,
  CheckCircle2,
  Clock3,
  Code2,
  Columns2,
  Eye,
  Import,
  LayoutTemplate,
  Loader2,
  MoreHorizontal,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import {
  deleteBioProjectAction,
  getBioProjectAction,
  updateBioProjectAction,
} from "../actions/bio-projects";
import {
  analyzeBioHtml,
  basicMinifyBioHtml,
  formatBioHtml,
  getBioStats,
} from "../lib/bio-html";
import type {
  BioImportResult,
  BioPreviewMode,
  BioProject,
  BioStudioMode,
  BioVersionSnapshot,
  BioViewport,
} from "../types/bio-types";
import { BioCodeEditor } from "./bio-code-editor";
import { BioHistoryDialog } from "./bio-history-dialog";
import { BioImportDialog } from "./bio-import-dialog";
import { BioPreview } from "./bio-preview";
import { BioPublishDialog } from "./bio-publish-dialog";
import { BioVisualBuilder } from "./bio-visual-builder";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

const HISTORY_KEY = "bioStudioHistory";
const HISTORY_LIMIT = 10;

function readHistory(metadata: Record<string, unknown>): BioVersionSnapshot[] {
  const value = metadata[HISTORY_KEY];
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is BioVersionSnapshot => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<BioVersionSnapshot>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.title === "string" &&
      typeof candidate.html === "string" &&
      typeof candidate.savedAt === "string" &&
      (candidate.sourceKind === "blank" ||
        candidate.sourceKind === "paste" ||
        candidate.sourceKind === "jai_bridge")
    );
  });
}

function createHistoryId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `bio-version-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function stableJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJson);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableJson(nested)]),
    );
  }

  return value;
}

type BioWorkingState = {
  title: string;
  html: string;
  originalHtml: string;
  sourceKind: BioProject["sourceKind"];
  jaiCharacterId: string | null;
  jaiCharacterName: string | null;
  sourceMetadata: Record<string, unknown>;
};

function createFingerprint(state: BioWorkingState) {
  return JSON.stringify(
    stableJson({
      title: state.title.trim(),
      html: state.html,
      originalHtml: state.originalHtml,
      sourceKind: state.sourceKind,
      jaiCharacterId: state.jaiCharacterId,
      jaiCharacterName: state.jaiCharacterName,
      sourceMetadata: state.sourceMetadata,
    }),
  );
}

function createProjectFingerprint(project: BioProject) {
  return createFingerprint({
    title: project.title,
    html: project.sourceHtml,
    originalHtml: project.originalHtml,
    sourceKind: project.sourceKind,
    jaiCharacterId: project.jaiCharacterId,
    jaiCharacterName: project.jaiCharacterName,
    sourceMetadata: project.sourceMetadata,
  });
}

export function BioStudioWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter();

  const [project, setProject] = useState<BioProject | null>(null);
  const [title, setTitle] = useState("Untitled Bio");
  const [html, setHtml] = useState("");
  const [originalHtml, setOriginalHtml] = useState("");
  const [sourceKind, setSourceKind] =
    useState<BioProject["sourceKind"]>("blank");
  const [jaiCharacterId, setJaiCharacterId] = useState<string | null>(null);
  const [jaiCharacterName, setJaiCharacterName] = useState<string | null>(null);
  const [sourceMetadata, setSourceMetadata] = useState<Record<string, unknown>>(
    {},
  );
  const [savedFingerprint, setSavedFingerprint] = useState("");
  const [mode, setMode] = useState<BioStudioMode>("build");
  const [codeSplit, setCodeSplit] = useState(true);
  const [previewMode, setPreviewMode] = useState<BioPreviewMode>("janitor");
  const [viewport, setViewport] = useState<BioViewport>("desktop");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(true);
  const [conflictProject, setConflictProject] = useState<BioProject | null>(
    null,
  );

  const loadedRef = useRef(false);
  const saveInFlightRef = useRef(false);

  const fingerprint = useMemo(
    () =>
      createFingerprint({
        title,
        html,
        originalHtml,
        sourceKind,
        jaiCharacterId,
        jaiCharacterName,
        sourceMetadata,
      }),
    [
      title,
      html,
      originalHtml,
      sourceKind,
      jaiCharacterId,
      jaiCharacterName,
      sourceMetadata,
    ],
  );
  const dirty = loadedRef.current && fingerprint !== savedFingerprint;

  const minified = useMemo(() => basicMinifyBioHtml(html), [html]);
  const diagnostics = useMemo(() => analyzeBioHtml(html), [html]);
  const stats = useMemo(() => getBioStats(html, minified), [html, minified]);
  const warningCount = diagnostics.filter(
    (diagnostic) => diagnostic.level === "warning",
  ).length;
  const versions = useMemo(() => readHistory(sourceMetadata), [sourceMetadata]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        "forgeworks:bio-studio:compatibility-open",
      );
      if (stored !== null) {
        setDiagnosticsOpen(stored === "true");
      }
    } catch {
      // Local preferences are best-effort only.
    }
  }, []);

  useEffect(() => {
    try {
      const storedMode = window.localStorage.getItem(
        "forgeworks:bio-studio:workspace-mode",
      );
      if (
        storedMode === "build" ||
        storedMode === "code" ||
        storedMode === "preview"
      ) {
        setMode(storedMode);
      }

      const storedSplit = window.localStorage.getItem(
        "forgeworks:bio-studio:code-split",
      );
      if (storedSplit !== null) {
        setCodeSplit(storedSplit === "true");
      }
    } catch {
      // Local preferences are best-effort only.
    }
  }, []);

  const changeMode = (next: BioStudioMode) => {
    setMode(next);
    try {
      window.localStorage.setItem("forgeworks:bio-studio:workspace-mode", next);
    } catch {
      // Ignore unavailable localStorage.
    }
  };

  const toggleCodeSplit = () => {
    setCodeSplit((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(
          "forgeworks:bio-studio:code-split",
          String(next),
        );
      } catch {
        // Ignore unavailable localStorage.
      }

      return next;
    });
  };

  const setCompatibilityOpen = (next: boolean) => {
    setDiagnosticsOpen(next);
    try {
      window.localStorage.setItem(
        "forgeworks:bio-studio:compatibility-open",
        String(next),
      );
    } catch {
      // Ignore unavailable localStorage.
    }
  };

  useEffect(() => {
    let cancelled = false;

    // Do not report a new project's initial state as saved against the old
    // project's fingerprint while its data is still loading.
    loadedRef.current = false;
    (async () => {
      setLoading(true);
      try {
        const result = await getBioProjectAction(projectId);
        if (cancelled) return;

        if (!result.success || !result.project) {
          toast.error(result.error || "Could not load this bio");
          setProject(null);
          return;
        }

        setProject(result.project);
        setTitle(result.project.title);
        setHtml(result.project.sourceHtml);
        setOriginalHtml(result.project.originalHtml);
        setSourceKind(result.project.sourceKind);
        setJaiCharacterId(result.project.jaiCharacterId);
        setJaiCharacterName(result.project.jaiCharacterName);
        setSourceMetadata(result.project.sourceMetadata);
        setSavedFingerprint(createProjectFingerprint(result.project));
        loadedRef.current = true;
      } catch (error) {
        if (cancelled) return;
        setProject(null);
        toast.error(
          error instanceof Error && error.message
            ? `Could not load this bio: ${error.message}`
            : "Could not load this bio. Try opening it again.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!dirty) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const save = useCallback(async () => {
    if (!project || !dirty) return true;

    if (saveInFlightRef.current) {
      toast.info(
        "A save is already in progress. New edits are still kept locally.",
      );
      return false;
    }

    const snapshot: BioWorkingState = {
      title,
      html,
      originalHtml,
      sourceKind,
      jaiCharacterId,
      jaiCharacterName,
      sourceMetadata,
    };

    const previousChanged =
      project.sourceHtml !== snapshot.html ||
      project.title.trim() !== snapshot.title.trim() ||
      project.sourceKind !== snapshot.sourceKind;

    const checkpoint: BioVersionSnapshot | null = previousChanged
      ? {
          id: createHistoryId(),
          title: project.title,
          html: project.sourceHtml,
          sourceKind: project.sourceKind,
          savedAt: project.updatedAt || new Date().toISOString(),
          reason: "save",
        }
      : null;

    const existingHistory = readHistory(snapshot.sourceMetadata);
    const nextHistory = checkpoint
      ? [
          checkpoint,
          ...existingHistory.filter(
            (item) =>
              item.html !== checkpoint.html || item.title !== checkpoint.title,
          ),
        ].slice(0, HISTORY_LIMIT)
      : existingHistory;

    const nextMetadata = {
      ...snapshot.sourceMetadata,
      [HISTORY_KEY]: nextHistory,
    };

    saveInFlightRef.current = true;
    setSaving(true);

    try {
      const result = await updateBioProjectAction(project.id, {
        expectedRevision: project.revision,
        title: snapshot.title,
        sourceHtml: snapshot.html,
        originalHtml: snapshot.originalHtml,
        sourceKind: snapshot.sourceKind,
        jaiCharacterId: snapshot.jaiCharacterId,
        jaiCharacterName: snapshot.jaiCharacterName,
        sourceMetadata: nextMetadata,
      });

      if (!result.success || !result.project) {
        if (result.reason === "conflict" && result.project) {
          setConflictProject(result.project);
          toast.warning(
            "This bio changed somewhere else. Your local draft has been kept.",
          );
          return false;
        }

        toast.error(result.error || "Could not save bio");
        return false;
      }

      const savedProject = result.project;

      setProject(savedProject);

      setSourceMetadata((current) => {
        const metadataUnchangedDuringSave =
          JSON.stringify(stableJson(current)) ===
          JSON.stringify(stableJson(snapshot.sourceMetadata));

        if (metadataUnchangedDuringSave) {
          return savedProject.sourceMetadata;
        }

        return {
          ...savedProject.sourceMetadata,
          ...current,
          [HISTORY_KEY]: readHistory(savedProject.sourceMetadata),
        };
      });

      setSavedFingerprint(createProjectFingerprint(savedProject));
      setConflictProject(null);
      toast.success("Bio saved");
      return true;
    } catch (error) {
      // A rejected server action/network failure must not leave the UI with
      // an unhandled rejection or a false saved baseline.
      toast.error(
        error instanceof Error && error.message
          ? `Could not save bio: ${error.message}`
          : "Could not save bio. Your local changes are still here.",
      );
      return false;
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }, [
    dirty,
    html,
    jaiCharacterId,
    jaiCharacterName,
    originalHtml,
    project,
    sourceKind,
    sourceMetadata,
    title,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "s"
      ) {
        return;
      }

      event.preventDefault();
      void save();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  const importIntoProject = ({
    html: importedHtml,
    package: bridgePackage,
  }: BioImportResult) => {
    setHtml(importedHtml);
    setOriginalHtml(importedHtml);
    setSourceKind(bridgePackage ? "jai_bridge" : "paste");

    if (bridgePackage) {
      setJaiCharacterId(bridgePackage.characterId || jaiCharacterId || null);
      setJaiCharacterName(
        bridgePackage.characterName || jaiCharacterName || null,
      );
      setSourceMetadata((current) => ({
        ...current,
        capturedAt: bridgePackage.capturedAt || null,
        bridgeVersion: bridgePackage.version,
      }));

      if (
        bridgePackage.characterName &&
        (title === "Untitled Bio" || title === "Imported JAI Bio")
      ) {
        setTitle(`${bridgePackage.characterName} Bio`);
      }
    }

    toast.success(
      "Imported HTML loaded as an unsaved draft. Save when you are ready.",
    );
  };

  const restoreVersion = (version: BioVersionSnapshot) => {
    setTitle(version.title);
    setHtml(version.html);
    setSourceKind(version.sourceKind);

    setSourceMetadata((current) => ({
      ...current,
      lastRestoredVersion: version.id,
      lastRestoredAt: new Date().toISOString(),
    }));

    toast.success("Checkpoint restored as an unsaved draft");
  };

  const leaveWorkspace = () => {
    if (saveInFlightRef.current) {
      toast.info(
        "Wait for the current save to finish before leaving Bio Studio.",
      );
      return;
    }

    if (dirty) {
      setLeaveConfirmOpen(true);
      return;
    }

    router.push("/bio-studio");
  };

  const leaveWithoutSaving = () => {
    setLeaveConfirmOpen(false);
    router.push("/bio-studio");
  };

  const loadLatestConflictVersion = () => {
    if (!conflictProject) return;

    setProject(conflictProject);
    setTitle(conflictProject.title);
    setHtml(conflictProject.sourceHtml);
    setOriginalHtml(conflictProject.originalHtml);
    setSourceKind(conflictProject.sourceKind);
    setJaiCharacterId(conflictProject.jaiCharacterId);
    setJaiCharacterName(conflictProject.jaiCharacterName);
    setSourceMetadata(conflictProject.sourceMetadata);
    setSavedFingerprint(createProjectFingerprint(conflictProject));
    setConflictProject(null);

    toast.success("Loaded the latest saved version");
  };

  const keepLocalConflictDraft = () => {
    if (!conflictProject) return;

    setProject(conflictProject);
    setSavedFingerprint(createProjectFingerprint(conflictProject));
    setConflictProject(null);

    toast.info(
      "Your local draft was kept. Save again when you are ready to overwrite the newer version.",
    );
  };

  const deleteProject = async () => {
    if (!project || deleting) return;

    if (saveInFlightRef.current) {
      toast.error(
        "Wait for the current save to finish before deleting this bio.",
      );
      return;
    }

    setDeleting(true);
    const result = await deleteBioProjectAction(project.id);

    if (!result.success) {
      setDeleting(false);
      toast.error(result.error || "Could not delete this bio");
      return;
    }

    toast.success("Bio deleted");
    router.replace("/bio-studio");
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Opening Bio Studio…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <TriangleAlert className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Bio project unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have been removed or you may not have access to it.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5 cursor-pointer"
            onClick={leaveWorkspace}
          >
            Back to Bio Studio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
      <header className="flex min-h-14 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 cursor-pointer"
          onClick={leaveWorkspace}
          aria-label="Back to Bio Studio"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="hidden h-7 w-px bg-border sm:block" />

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Braces className="hidden h-4 w-4 shrink-0 text-primary sm:block" />
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-8 min-w-0 max-w-md border-transparent bg-transparent px-2 text-sm font-semibold shadow-none hover:border-border focus-visible:border-border"
            aria-label="Bio project title"
          />
          <Badge
            variant="outline"
            className={cn(
              "hidden shrink-0 text-[10px] sm:inline-flex",
              dirty && "border-amber-500/30 text-amber-500",
            )}
          >
            {dirty ? "Unsaved" : "Saved"}
          </Badge>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer text-muted-foreground"
                aria-label="More Bio Studio actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => setImportOpen(true)}
              >
                <Import className="mr-2 h-4 w-4" />
                Import bio
              </DropdownMenuItem>

              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => setHistoryOpen(true)}
              >
                <Clock3 className="mr-2 h-4 w-4" />
                Version history
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete bio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => setPublishOpen(true)}
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Send to JAI</span>
            <span className="sm:hidden">JAI</span>
          </Button>

          <Button
            type="button"
            size="sm"
            className="cursor-pointer gap-1.5"
            disabled={!dirty || saving}
            onClick={() => void save()}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {saving ? "Saving" : dirty ? "Save" : "Saved"}
            </span>
          </Button>
        </div>
      </header>

      <div className="flex h-[48px] shrink-0 items-center justify-between gap-2 border-b px-2 sm:px-3">
        <div className="flex min-w-0 items-center gap-1 rounded-lg border bg-muted/15 p-1">
          {(
            [
              ["build", LayoutTemplate, "Build"],
              ["code", Code2, "Code"],
              ["preview", Eye, "Preview"],
            ] as const
          ).map(([value, Icon, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={mode === value ? "secondary" : "ghost"}
              className="h-7 min-w-0 cursor-pointer gap-1.5 px-2 sm:px-3"
              onClick={() => changeMode(value)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}

          {mode === "code" && (
            <>
              <div className="mx-0.5 h-5 w-px bg-border" />
              <Button
                type="button"
                size="icon"
                variant={codeSplit ? "secondary" : "ghost"}
                className="h-7 w-7 cursor-pointer"
                onClick={toggleCodeSplit}
                aria-label="Toggle split preview"
                title="Split preview"
              >
                <Columns2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground sm:text-[11px]">
          {jaiCharacterName && (
            <Badge
              variant="secondary"
              className="hidden max-w-44 truncate text-[10px] lg:inline-flex"
            >
              JAI · {jaiCharacterName}
            </Badge>
          )}
          <span className="whitespace-nowrap">
            {formatBytes(stats.sourceBytes)}
          </span>
          <span className="hidden text-border sm:inline">/</span>
          <span className="hidden whitespace-nowrap sm:inline">
            {formatBytes(stats.outputBytes)} minified
          </span>
        </div>
      </div>

      <main
        className={cn(
          "grid min-h-0 min-w-0 flex-1 overflow-hidden",
          mode === "code" &&
            codeSplit &&
            "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:divide-x lg:divide-border/70",
        )}
      >
        {mode === "build" && (
          <BioVisualBuilder html={html} onChange={setHtml} />
        )}

        {mode === "code" && (
          <BioCodeEditor
            value={html}
            onChange={setHtml}
            onFormat={() => {
              const formatted = formatBioHtml(html);
              if (formatted === html) {
                toast.info(
                  "No safe formatting changes needed. Bio text and spacing were preserved.",
                );
              } else {
                setHtml(formatted);
                toast.success(
                  "HTML attributes formatted; text spacing preserved.",
                );
              }
            }}
            onCopy={() => {
              void navigator.clipboard.writeText(html);
              toast.success("HTML copied");
            }}
          />
        )}

        {mode === "code" && codeSplit && (
          <div className="hidden min-h-0 min-w-0 lg:flex">
            <BioPreview
              html={html}
              viewport={viewport}
              mode={previewMode}
              onViewportChange={setViewport}
              onModeChange={setPreviewMode}
            />
          </div>
        )}

        {mode === "preview" && (
          <BioPreview
            html={html}
            viewport={viewport}
            mode={previewMode}
            onViewportChange={setViewport}
            onModeChange={setPreviewMode}
          />
        )}
      </main>

      <footer className="shrink-0 border-t bg-background">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left sm:px-4"
          onClick={() => setCompatibilityOpen(!diagnosticsOpen)}
        >
          <div className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-xs font-semibold">Compatibility</span>
            <span className="truncate text-xs text-muted-foreground">
              {warningCount > 0
                ? `${warningCount} warning${warningCount === 1 ? "" : "s"}`
                : "No blocking issues detected"}
              {" · "}
              {stats.savedPercent.toFixed(1)}% smaller after minify
            </span>
          </div>

          <span className="text-xs text-muted-foreground">
            {diagnosticsOpen ? "Hide" : "Show"}
          </span>
        </button>

        {diagnosticsOpen && (
          <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto border-t px-3 py-2 sm:grid-cols-2 sm:px-4 xl:grid-cols-3">
            {diagnostics.map((item) => (
              <div
                key={item.id}
                className="min-w-0 rounded-lg border bg-muted/20 px-3 py-2"
              >
                <div className="flex items-start gap-2">
                  {item.level === "warning" ? (
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  )}
                  <div>
                    <p className="text-xs font-medium">{item.title}</p>
                    {item.detail && (
                      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                        {item.detail}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {originalHtml && (
              <div className="min-w-0 rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-xs font-medium">Original import preserved</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  The original HTML remains stored separately from the working
                  source.
                </p>
              </div>
            )}
          </div>
        )}
      </footer>

      <BioImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={importIntoProject}
      />

      <BioPublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        html={html}
        characterId={jaiCharacterId}
        characterName={jaiCharacterName}
      />

      <BioHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        versions={versions}
        onRestore={restoreVersion}
      />

      <AlertDialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Bio Studio?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in this bio. Leaving now will discard the
              current local draft changes that have not been saved.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={leaveWithoutSaving}
            >
              Leave without saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(conflictProject)}
        onOpenChange={(open) => {
          if (!open) setConflictProject(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Newer saved version detected</DialogTitle>
            <DialogDescription>
              This Bio Studio project was saved somewhere else after you opened
              it. Your current local draft has not been replaced.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            Loading the latest version replaces your current draft. Keeping your
            draft updates the save baseline only; your next Save will overwrite
            the newer server version.
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={loadLatestConflictVersion}
            >
              Load latest
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              onClick={keepLocalConflictDraft}
            >
              Keep my draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this bio?</DialogTitle>
            <DialogDescription>
              This removes the Bio Studio project from your library. Your JAI
              character is not changed.
            </DialogDescription>
          </DialogHeader>

          {dirty && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              This project also has unsaved changes. They will be discarded.
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="cursor-pointer gap-2"
              onClick={() => void deleteProject()}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete bio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
