"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  Columns2,
  Eye,
  FileClock,
  FilePenLine,
  Loader2,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MarkdownField,
  type MarkdownFieldHandle,
} from "@/features/markdown/components/markdown-field";
import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";
import { commitMarkdownImages } from "@/features/markdown/lib/markdown-image-assets";
import {
  CHANGELOG_AREAS,
  CHANGELOG_CHANGE_TYPES,
  CHANGELOG_RELEASE_TYPES,
  type ChangelogEntry,
  type ChangelogEntryInput,
  type ChangelogReleaseType,
} from "@/features/changelog/types";
import {
  deleteChangelogEntry,
  listChangelogEntriesAdmin,
  saveChangelogEntry,
  setChangelogEntryStatus,
} from "@/features/changelog/actions/changelog";
import { TechnicalTerminal } from "./technical-terminal";

type EditorMode = "write" | "preview" | "split";

type EditorDraft = {
  id: string | null;
  slug: string;
  version: string;
  releaseNumber: string;
  title: string;
  headline: string;
  summary: string;
  bodyMarkdown: string;
  technicalMarkdown: string;
  releaseType: ChangelogReleaseType;
  status: "draft" | "published";
  areas: string[];
  changeTypes: string[];
  isFeatured: boolean;
};

const EMPTY: EditorDraft = {
  id: null,
  slug: "",
  version: "",
  releaseNumber: "",
  title: "",
  headline: "",
  summary: "",
  bodyMarkdown: "",
  technicalMarkdown: "",
  releaseType: "development",
  status: "draft",
  areas: ["Platform"],
  changeTypes: ["Improved"],
  isFeatured: false,
};

function toDraft(entry: ChangelogEntry): EditorDraft {
  return {
    id: entry.id,
    slug: entry.slug,
    version: entry.version || "",
    releaseNumber:
      entry.releaseNumber == null ? "" : String(entry.releaseNumber),
    title: entry.title,
    headline: entry.headline,
    summary: entry.summary,
    bodyMarkdown: entry.bodyMarkdown,
    technicalMarkdown: entry.technicalMarkdown,
    releaseType: entry.releaseType,
    status: entry.status,
    areas: entry.areas,
    changeTypes: entry.changeTypes,
    isFeatured: entry.isFeatured,
  };
}

function draftFingerprint(draft: EditorDraft) {
  return JSON.stringify({
    ...draft,
    // Order is not meaningful for these classifications.
    areas: [...draft.areas].sort(),
    changeTypes: [...draft.changeTypes].sort(),
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function draftReleaseLabel(draft: EditorDraft) {
  if (draft.releaseType === "archive") return "ARCHIVE";
  if (draft.version) return `V${draft.version.replace(/^v/i, "")}`;
  if (draft.releaseNumber) {
    return `RELEASE ${String(draft.releaseNumber).padStart(3, "0")}`;
  }
  return "BETA UPDATE";
}

function ModeButton({
  mode,
  current,
  icon: Icon,
  children,
  onClick,
}: {
  mode: EditorMode;
  current: EditorMode;
  icon: typeof Eye;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="fw-cl-editor-mode"
      data-active={current === mode ? "true" : "false"}
      onClick={onClick}
    >
      <Icon size={14} />
      <span>{children}</span>
    </button>
  );
}

function ChangelogEntryPreview({ draft }: { draft: EditorDraft }) {
  const releaseNumber =
    draft.releaseNumber ||
    (draft.releaseType === "archive"
      ? "000"
      : draft.version.replace(/^v/i, "") || "β");

  return (
    <div className="fw-changelog fw-cl-editor-public-preview">
      <article
        className="fw-changelog-release"
        data-archive={draft.releaseType === "archive" ? "true" : undefined}
      >
        <span className="fw-changelog-release-number" aria-hidden="true">
          {releaseNumber}
        </span>

        <div className="fw-changelog-release-content">
          <div className="fw-changelog-release-head">
            <div className="fw-changelog-release-meta">
              <span>PREVIEW</span>
              <span>{draftReleaseLabel(draft)}</span>
              {draft.isFeatured && <b>FEATURED</b>}
            </div>

            <div className="fw-changelog-title-row">
              <div>
                {draft.releaseType === "archive" && (
                  <p className="fw-changelog-archive-label">
                    ARCHIVE RECOVERED / PARTIAL RECORD
                  </p>
                )}

                <h2>{draft.title || "Untitled release"}</h2>

                {draft.headline && <h3>{draft.headline}</h3>}
              </div>
            </div>

            {draft.summary && (
              <p className="fw-changelog-summary">{draft.summary}</p>
            )}

            <div className="fw-changelog-tag-groups">
              {draft.areas.length > 0 && (
                <div
                  className="fw-changelog-tag-group"
                  data-group="areas"
                  aria-label="Release areas"
                >
                  <span className="fw-changelog-tag-label">AREAS</span>
                  <div className="fw-changelog-tags">
                    {draft.areas.map((item) => (
                      <span key={`area-${item}`}>{item}</span>
                    ))}
                  </div>
                </div>
              )}

              {draft.changeTypes.length > 0 && (
                <div
                  className="fw-changelog-tag-group"
                  data-group="changes"
                  aria-label="Change types"
                >
                  <span className="fw-changelog-tag-label">CHANGES</span>
                  <div className="fw-changelog-tags">
                    {draft.changeTypes.map((item) => (
                      <span
                        key={`change-${item}`}
                        data-change={item.toLowerCase()}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="fw-changelog-body">
            {draft.bodyMarkdown ? (
              <MarkdownRenderer content={draft.bodyMarkdown} />
            ) : (
              <p className="fw-cl-preview-placeholder">
                Your release body will appear here using the same public
                changelog styles.
              </p>
            )}
          </div>

          {draft.technicalMarkdown && (
            <div className="fw-changelog-technical">
              <div className="fw-changelog-section-label">
                <Terminal size={15} />
                TECHNICAL NOTES
                <span />
              </div>
              <TechnicalTerminal
                content={draft.technicalMarkdown}
                label={`${draftReleaseLabel(draft)} output`}
              />
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

export function ChangelogEditorPage({
  initialId,
}: {
  initialId?: string | null;
}) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<EditorDraft>(EMPTY);
  const [savedSnapshot, setSavedSnapshot] = useState<EditorDraft | null>(null);
  const [mode, setMode] = useState<EditorMode>("write");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);
  const [draftAssetKey, setDraftAssetKey] = useState(
    () => `draft-${crypto.randomUUID?.() || Date.now()}`,
  );
  const bodyRef = useRef<MarkdownFieldHandle>(null);

  const selected = useMemo(
    () => entries.find((entry) => entry.id === draft.id) || null,
    [entries, draft.id],
  );

  const hasUnsavedChanges = useMemo(() => {
    const baseline = savedSnapshot ?? EMPTY;
    return draftFingerprint(draft) !== draftFingerprint(baseline);
  }, [draft, savedSnapshot]);

  const canSave =
    hasUnsavedChanges && Boolean(draft.title.trim()) && !saving;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listChangelogEntriesAdmin();

    if (!result.success) {
      toast.error(result.error || "Could not load changelog entries");
      setLoading(false);
      return;
    }

    const nextEntries = result.entries || [];
    setEntries(nextEntries);

    if (initialId) {
      const target = nextEntries.find((entry) => entry.id === initialId);
      if (target) {
        const nextDraft = toDraft(target);
        setDraft(nextDraft);
        setSavedSnapshot(nextDraft);
        setDraftAssetKey(target.id);
      }
    }

    setLoading(false);
  }, [initialId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    try {
      setLibraryCollapsed(
        window.localStorage.getItem("forgeworks.changelog.libraryCollapsed") ===
          "true",
      );
    } catch {
      // Local storage is optional UI state only.
    }
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const toggleLibrary = () => {
    if (window.matchMedia("(max-width: 1024px)").matches) {
      setLibraryOpen((value) => !value);
      return;
    }

    setLibraryCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(
          "forgeworks.changelog.libraryCollapsed",
          String(next),
        );
      } catch {
        // Ignore storage failures; collapsing still works for this session.
      }
      return next;
    });
  };

  const startNew = () => {
    setDraft(EMPTY);
    setSavedSnapshot(null);
    setDraftAssetKey(`draft-${crypto.randomUUID?.() || Date.now()}`);
    setMode("write");
    setLibraryOpen(false);
  };

  const selectEntry = (entry: ChangelogEntry) => {
    const nextDraft = toDraft(entry);
    setDraft(nextDraft);
    setSavedSnapshot(nextDraft);
    setDraftAssetKey(entry.id);
    setLibraryOpen(false);
  };

  const toggleListValue = (key: "areas" | "changeTypes", value: string) => {
    setDraft((current) => {
      const values = current[key];
      return {
        ...current,
        [key]: values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value],
      };
    });
  };

  const buildInput = (bodyMarkdown: string): ChangelogEntryInput => ({
    id: draft.id,
    slug: draft.slug || slugify(draft.title),
    version: draft.version || null,
    releaseNumber: draft.releaseNumber ? Number(draft.releaseNumber) : null,
    title: draft.title,
    headline: draft.headline,
    summary: draft.summary,
    bodyMarkdown,
    technicalMarkdown: draft.technicalMarkdown,
    releaseType: draft.releaseType,
    status: draft.status,
    areas: draft.areas,
    changeTypes: draft.changeTypes,
    isFeatured: draft.isFeatured,
  });

  const save = async () => {
    if (!hasUnsavedChanges) {
      return;
    }

    if (!draft.title.trim()) {
      toast.error("Give the release a title first");
      return;
    }

    setSaving(true);

    const result = await commitMarkdownImages({
      draftMarkdown: draft.bodyMarkdown,
      previousMarkdown: selected?.bodyMarkdown || "",
      pendingImages: bodyRef.current?.getPendingImages() || [],
      uploadContext: {
        context: "changelog",
        resourceKey: draft.id || draft.slug || draftAssetKey,
      },
      save: async (finalMarkdown) => {
        const response = await saveChangelogEntry(buildInput(finalMarkdown));

        if (!response.success || !response.entry) {
          return {
            success: false,
            error: response.error || "Could not save changelog entry",
          };
        }

        const nextDraft = toDraft(response.entry);
        setDraft(nextDraft);
        setSavedSnapshot(nextDraft);
        setDraftAssetKey(response.entry.id);
        bodyRef.current?.applyCommittedMarkdown(finalMarkdown);

        return { success: true };
      },
    });

    if (!result.success) {
      toast.error(result.error || "Could not save changelog entry");
      setSaving(false);
      return;
    }

    if (result.cleanupWarning) {
      toast.warning(result.cleanupWarning);
    } else {
      toast.success("Changelog entry saved");
    }

    await load();
    setSaving(false);
  };

  const changeStatus = async (status: "draft" | "published") => {
    if (!draft.id) {
      toast.error("Save the entry before publishing it");
      return;
    }

    setSaving(true);
    const result = await setChangelogEntryStatus(draft.id, status);

    if (!result.success || !result.entry) {
      toast.error(result.error || "Could not update release status");
      setSaving(false);
      return;
    }

    const nextDraft = toDraft(result.entry);
    setDraft(nextDraft);
    setSavedSnapshot(nextDraft);
    await load();
    toast.success(
      status === "published" ? "Release published" : "Release moved to draft",
    );
    setSaving(false);
  };

  const remove = async () => {
    if (!draft.id) return;
    if (!window.confirm(`Delete "${draft.title}" permanently?`)) return;

    setSaving(true);
    const result = await deleteChangelogEntry(draft.id);

    if (!result.success) {
      toast.error(result.error || "Could not delete changelog entry");
      setSaving(false);
      return;
    }

    startNew();
    await load();
    toast.success("Changelog entry deleted");
    setSaving(false);
  };

  return (
    <div className="fw-cl-editor">
      <header className="fw-cl-editor-topbar">
        <div className="fw-cl-editor-topbar-left">
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer"
          >
            <Link href="/" aria-label="Back to Forgeworks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="fw-cl-editor-brand">
            <FileClock size={16} />
            <div>
              <strong>Changelog Studio</strong>
              <span>{draft.title || "Untitled release"}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="hidden cursor-pointer lg:inline-flex"
            onClick={toggleLibrary}
            aria-label={
              libraryCollapsed ? "Show release library" : "Hide release library"
            }
            title={
              libraryCollapsed ? "Show release library" : "Hide release library"
            }
          >
            {libraryCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>

          <Badge
            variant="outline"
            className={
              draft.status === "published"
                ? "border-green-500/25 bg-green-500/10 text-green-600"
                : "border-amber-500/25 bg-amber-500/10 text-amber-600"
            }
          >
            {draft.status}
          </Badge>

          {hasUnsavedChanges && (
            <Badge
              variant="outline"
              className="border-primary/25 bg-primary/8 text-primary"
            >
              Unsaved changes
            </Badge>
          )}
        </div>

        <div className="fw-cl-editor-topbar-center">
          <div className="fw-cl-editor-mode-switcher" aria-label="Editor view">
            <ModeButton
              mode="write"
              current={mode}
              icon={FilePenLine}
              onClick={() => setMode("write")}
            >
              Write
            </ModeButton>
            <ModeButton
              mode="preview"
              current={mode}
              icon={Eye}
              onClick={() => setMode("preview")}
            >
              Preview
            </ModeButton>
            <ModeButton
              mode="split"
              current={mode}
              icon={Columns2}
              onClick={() => setMode("split")}
            >
              Split
            </ModeButton>
          </div>
        </div>

        <div className="fw-cl-editor-topbar-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer lg:hidden"
            onClick={toggleLibrary}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Entries
          </Button>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden cursor-pointer sm:inline-flex"
          >
            <a href="/changelog" target="_blank" rel="noreferrer">
              Public <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </a>
          </Button>

          {draft.id && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={saving || hasUnsavedChanges}
              title={
                hasUnsavedChanges
                  ? "Save your changes before changing publication status"
                  : undefined
              }
              onClick={() =>
                void changeStatus(
                  draft.status === "published" ? "draft" : "published",
                )
              }
            >
              {draft.status === "published" ? "Unpublish" : "Publish"}
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            className="cursor-pointer"
            disabled={!canSave}
            title={
              !draft.title.trim()
                ? "Add a title before saving"
                : !hasUnsavedChanges
                  ? "No changes to save"
                  : undefined
            }
            onClick={() => void save()}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </header>

      <div
        className="fw-cl-editor-workspace"
        data-mode={mode}
        data-library-collapsed={libraryCollapsed ? "true" : "false"}
      >
        <aside
          className="fw-cl-editor-library"
          data-open={libraryOpen ? "true" : "false"}
        >
          <div className="fw-cl-editor-library-head">
            <div>
              <span>RELEASE LIBRARY</span>
              <small>{entries.length} entries</small>
            </div>

            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="cursor-pointer"
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                className="cursor-pointer"
                onClick={startNew}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="fw-cl-editor-library-list">
            {entries.map((entry) => (
              <button
                type="button"
                key={entry.id}
                onClick={() => selectEntry(entry)}
                data-active={draft.id === entry.id ? "true" : "false"}
                className="fw-cl-editor-library-item"
              >
                <div>
                  <span>
                    {entry.version
                      ? `v${entry.version.replace(/^v/i, "")}`
                      : entry.releaseType}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      entry.status === "published"
                        ? "border-green-500/20 bg-green-500/8 text-green-600"
                        : "border-amber-500/20 bg-amber-500/8 text-amber-600"
                    }
                  >
                    {entry.status}
                  </Badge>
                </div>
                <strong>{entry.title}</strong>
                <p>{entry.summary || "No summary yet."}</p>
              </button>
            ))}

            {!loading && entries.length === 0 && (
              <div className="fw-cl-editor-library-empty">
                <Sparkles size={19} />
                <strong>No releases yet.</strong>
                <span>Start the archive with something real.</span>
              </div>
            )}
          </div>
        </aside>

        <main className="fw-cl-editor-main">
          <section
            className="fw-cl-editor-write-pane"
            data-visible={
              mode === "write" || mode === "split" ? "true" : "false"
            }
          >
            <div className="fw-cl-editor-canvas">
              <div className="fw-cl-editor-document-head">
                <div>
                  <span>RELEASE DRAFT</span>
                  <h1>{draft.title || "Untitled release"}</h1>
                  <p>
                    Structure the release, write the story, then leave the
                    technical receipts underneath.
                  </p>
                </div>
              </div>

              <section className="fw-cl-editor-section">
                <div className="fw-cl-editor-section-heading">
                  <span>01</span>
                  <div>
                    <strong>Release identity</strong>
                    <small>How this update appears in the archive.</small>
                  </div>
                </div>

                <div className="fw-cl-editor-fields">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Title</Label>
                    <Input
                      value={draft.title}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          title: event.target.value,
                          slug:
                            current.id || current.slug
                              ? current.slug
                              : slugify(event.target.value),
                        }))
                      }
                      placeholder="Platform foundations, visibility & staff access"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      value={draft.slug}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          slug: slugify(event.target.value),
                        }))
                      }
                      placeholder="platform-foundations"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Release type</Label>
                    <Select
                      value={draft.releaseType}
                      onValueChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          releaseType: value as ChangelogReleaseType,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANGELOG_RELEASE_TYPES.map((item) => (
                          <SelectItem
                            key={item.value}
                            value={item.value}
                            className="cursor-pointer"
                          >
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Version</Label>
                    <Input
                      value={draft.version}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          version: event.target.value,
                        }))
                      }
                      placeholder="0.9.4 or Beta"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Release number</Label>
                    <Input
                      inputMode="numeric"
                      value={draft.releaseNumber}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          releaseNumber: event.target.value.replace(/\D/g, ""),
                        }))
                      }
                      placeholder="24"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Hero line</Label>
                    <Input
                      value={draft.headline}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          headline: event.target.value,
                        }))
                      }
                      placeholder="Resources finally got their own rules."
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Summary</Label>
                    <Textarea
                      value={draft.summary}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          summary: event.target.value,
                        }))
                      }
                      rows={3}
                      className="min-h-24 resize-y"
                      placeholder="A short human-readable explanation of the release."
                    />
                  </div>
                </div>
              </section>

              <section className="fw-cl-editor-section">
                <div className="fw-cl-editor-section-heading">
                  <span>02</span>
                  <div>
                    <strong>Classification</strong>
                    <small>Keep releases easy to scan and filter.</small>
                  </div>
                </div>

                <div className="fw-cl-editor-taxonomy">
                  <div>
                    <Label>Areas</Label>
                    <div className="fw-cl-editor-chipset">
                      {CHANGELOG_AREAS.map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() => toggleListValue("areas", item)}
                          data-active={draft.areas.includes(item)}
                        >
                          {draft.areas.includes(item) && <Check size={12} />}
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Change types</Label>
                    <div className="fw-cl-editor-chipset">
                      {CHANGELOG_CHANGE_TYPES.map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() => toggleListValue("changeTypes", item)}
                          data-active={draft.changeTypes.includes(item)}
                        >
                          {draft.changeTypes.includes(item) && (
                            <Check size={12} />
                          )}
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="fw-cl-editor-section fw-cl-editor-section-body">
                <div className="fw-cl-editor-section-heading">
                  <span>03</span>
                  <div>
                    <strong>Release story</strong>
                    <small>Full Markdown, including managed images.</small>
                  </div>
                </div>

                <MarkdownField
                  ref={bodyRef}
                  value={draft.bodyMarkdown}
                  onChange={(bodyMarkdown) =>
                    setDraft((current) => ({ ...current, bodyMarkdown }))
                  }
                  preset="full"
                  imageOptions={{ enabled: true, maxImages: 12 }}
                  minEditorHeightRem={22}
                  maxEditorHeightRem={48}
                  placeholder="Write the release story, highlights, fixes, migration notes..."
                />
              </section>

              <section className="fw-cl-editor-section">
                <div className="fw-cl-editor-section-heading">
                  <span>04</span>
                  <div>
                    <strong>Technical terminal</strong>
                    <small>
                      Plain text terminal output. Prefix process lines with &gt;;
                      they render with the Forgeworks prompt.
                    </small>
                  </div>
                </div>

                <Textarea
                  value={draft.technicalMarkdown}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      technicalMarkdown: event.target.value,
                    }))
                  }
                  spellCheck={false}
                  className="min-h-[18rem] resize-y font-mono text-sm leading-relaxed"
                  placeholder={`$ forgeworks release --inspect

> migrating access model...
✓ staff_role authoritative
✓ legacy references: 0`}
                />
              </section>

              <section className="fw-cl-editor-section fw-cl-editor-footer-settings">
                <label
                  htmlFor="changelog-featured-release"
                  className="cursor-pointer"
                >
                  <Checkbox
                    id="changelog-featured-release"
                    checked={draft.isFeatured}
                    onCheckedChange={(checked) =>
                      setDraft((current) => ({
                        ...current,
                        isFeatured: checked === true,
                      }))
                    }
                    className="mt-0.5 cursor-pointer"
                  />
                  <span>
                    <strong>Featured release</strong>
                    <small>
                      Give this update the strongest treatment in the archive.
                    </small>
                  </span>
                </label>

                {draft.id && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={() => void remove()}
                    disabled={saving}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete release
                  </Button>
                )}
              </section>
            </div>
          </section>

          <section
            className="fw-cl-editor-preview-pane"
            data-visible={
              mode === "preview" || mode === "split" ? "true" : "false"
            }
          >
            <div className="fw-cl-editor-preview-toolbar">
              <div>
                <Monitor size={15} />
                <span>PUBLIC RELEASE PREVIEW</span>
              </div>
              <small>
                Same release styles as <code>/changelog</code>
              </small>
            </div>

            <div className="fw-cl-editor-preview-scroll">
              <ChangelogEntryPreview draft={draft} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
