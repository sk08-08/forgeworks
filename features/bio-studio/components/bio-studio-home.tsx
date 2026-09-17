"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Braces,
  Clock3,
  Copy,
  FileCode2,
  Import,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  TerminalSquare,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

import {
  createBioProjectAction,
  deleteBioProjectAction,
  listBioProjectsAction,
} from "../actions/bio-projects";
import type { BioImportResult, BioProject } from "../types/bio-types";
import { BioImportDialog } from "./bio-import-dialog";

const STARTER_HTML = `<div style="
  max-width:760px;
  margin:0 auto;
  padding:24px;
  border:1px solid rgba(255,255,255,.12);
  border-radius:18px;
  background:#15111d;
">
  <p style="
    margin:0;
    color:#e955e5;
    font-size:12px;
    font-weight:800;
    letter-spacing:.16em;
    text-transform:uppercase;
  ">
    Character bio
  </p>

  <h2 style="
    margin:10px 0 0;
    color:#fff;
    font-size:36px;
    line-height:1;
  ">
    Start building here.
  </h2>

  <p style="
    margin:16px 0 0;
    color:#b8afc2;
    line-height:1.7;
  ">
    Edit this HTML and watch the JAI preview update immediately.
  </p>
</div>`;

function formatProjectDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(date);
}

export function BioStudioHome() {
  const router = useRouter();
  const [projects, setProjects] = useState<BioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [projectPendingDelete, setProjectPendingDelete] =
    useState<BioProject | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");

  const loadProjects = async () => {
    setLoading(true);
    const result = await listBioProjectsAction();

    if (!result.success) {
      toast.error(result.error || "Could not load Bio Studio");
      setProjects([]);
    } else {
      setProjects(result.projects);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const createBlank = async () => {
    setCreating(true);

    const result = await createBioProjectAction({
      title: "Untitled Bio",
      sourceHtml: STARTER_HTML,
      originalHtml: "",
      sourceKind: "blank",
    });

    setCreating(false);

    if (!result.success || !result.project) {
      toast.error(result.error || "Could not create bio project");
      return;
    }

    router.push(`/bio-studio/${result.project.id}`);
  };

  const importBio = async ({
    html,
    package: bridgePackage,
  }: BioImportResult) => {
    setCreating(true);

    const result = await createBioProjectAction({
      title: bridgePackage?.characterName
        ? `${bridgePackage.characterName} Bio`
        : "Imported JAI Bio",
      sourceHtml: html,
      originalHtml: html,
      sourceKind: bridgePackage ? "jai_bridge" : "paste",
      jaiCharacterId: bridgePackage?.characterId || null,
      jaiCharacterName: bridgePackage?.characterName || null,
      sourceMetadata: bridgePackage
        ? {
            capturedAt: bridgePackage.capturedAt || null,
            bridgeVersion: bridgePackage.version,
          }
        : {},
    });

    setCreating(false);

    if (!result.success || !result.project) {
      toast.error(result.error || "Could not import bio");
      return;
    }

    router.push(`/bio-studio/${result.project.id}`);
  };

  const duplicateProject = async (project: BioProject) => {
    const result = await createBioProjectAction({
      title: `${project.title} Copy`,
      sourceHtml: project.sourceHtml,
      originalHtml: project.originalHtml,
      sourceKind: project.sourceKind,
      jaiCharacterId: project.jaiCharacterId,
      jaiCharacterName: project.jaiCharacterName,
      sourceMetadata: {
        ...project.sourceMetadata,
        duplicatedFrom: project.id,
      },
    });

    if (!result.success || !result.project) {
      toast.error(result.error || "Could not duplicate bio");
      return;
    }

    toast.success("Bio duplicated");
    router.push(`/bio-studio/${result.project.id}`);
  };

  const deleteProject = async () => {
    const project = projectPendingDelete;
    if (!project || deletingProjectId) return;

    setDeletingProjectId(project.id);

    const result = await deleteBioProjectAction(project.id);
    if (!result.success) {
      setDeletingProjectId(null);
      toast.error(result.error || "Could not delete bio");
      return;
    }

    setProjects((current) =>
      current.filter((candidate) => candidate.id !== project.id),
    );
    setDeletingProjectId(null);
    setProjectPendingDelete(null);
    toast.success("Bio deleted");
  };

  const filteredProjects = projects.filter((project) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;

    return [project.title, project.jaiCharacterName, project.sourceKind]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));
  });

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-[92rem] space-y-8 px-3 py-5 sm:px-6 sm:py-8 lg:px-10">
        <Link
          href="/"
          onClick={() => {
            localStorage.setItem("currentView", "dashboard");
          }}
          className="group inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to dashboard
        </Link>

        <header className="overflow-hidden rounded-3xl border bg-card">
          <div className="relative isolate px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_10%,rgba(233,85,229,.14),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(91,217,255,.10),transparent_26%),radial-gradient(circle_at_55%_120%,rgba(124,92,255,.12),transparent_38%)]" />

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <Braces className="h-3 w-3 text-primary" />
                Bio Studio
              </Badge>
              <Badge variant="secondary">Beta</Badge>
            </div>

            <div className="mt-5 max-w-3xl">
              <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Build the bio. Preview it. Send it to JAI.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Import custom HTML from an existing JanitorAI character, edit it
                safely in Forgeworks, test desktop/tablet/mobile views, then
                generate the final save helper when you are ready.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                size="lg"
                className="cursor-pointer gap-2"
                onClick={() => setImportOpen(true)}
                disabled={creating}
              >
                <Import className="h-4 w-4" />
                Import existing JAI bio
              </Button>

              <Button
                type="button"
                size="lg"
                variant="outline"
                className="cursor-pointer gap-2"
                onClick={createBlank}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Start blank
              </Button>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-primary/10 text-primary">
                <TerminalSquare className="h-4 w-4" />
              </div>
              <p className="mt-4 text-sm font-semibold">1 · Capture</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Install the Forgeworks Bio Bridge once. From then on, copy the
                saved JAI bio directly from the character edit page.
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-primary/10 text-primary">
                <FileCode2 className="h-4 w-4" />
              </div>
              <p className="mt-4 text-sm font-semibold">2 · Build + preview</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Work on the raw HTML with a live sandboxed preview and real
                desktop, tablet and mobile widths.
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-primary/10 text-primary">
                <ArrowRight className="h-4 w-4" />
              </div>
              <p className="mt-4 text-sm font-semibold">3 · Send back to JAI</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Copy the final Bridge package and apply it from the same
                Forgeworks control on the JanitorAI edit page.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Your bio projects</h2>
              <p className="text-xs text-muted-foreground">
                Standalone by default. Linking to a Forgeworks Bot is optional.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative hidden sm:block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-9 w-56 pl-8 text-xs"
                  placeholder="Search bios"
                />
              </div>

              <Button
                type="button"
                size="icon"
                variant="outline"
                className="cursor-pointer"
                onClick={() => void loadProjects()}
                aria-label="Refresh bio projects"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mb-3 sm:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 pl-8 text-xs"
                placeholder="Search bios"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border py-14 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading Bio Studio…
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/10 px-5 py-12 text-center">
              <Braces className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-4 text-sm font-semibold">No bio projects yet</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                You do not need a Forgeworks Bot. Import the HTML from any JAI
                character or start with a standalone blank project.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="cursor-pointer"
                  onClick={() => setImportOpen(true)}
                >
                  Import from JAI
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={createBlank}
                >
                  Start blank
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className="group rounded-2xl border bg-card p-4 text-left transition hover:-translate-y-px hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5"
                  onClick={() => router.push(`/bio-studio/${project.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
                      <Braces className="h-4 w-4 text-primary" />
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-pointer opacity-70 transition hover:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          void duplicateProject(project);
                        }}
                        aria-label={`Duplicate ${project.title}`}
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-pointer text-muted-foreground opacity-70 transition hover:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          setProjectPendingDelete(project);
                        }}
                        aria-label={`Delete ${project.title}`}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {project.sourceKind === "jai_bridge"
                        ? "JAI import"
                        : project.sourceKind === "paste"
                          ? "HTML import"
                          : "Standalone"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {(
                        new TextEncoder().encode(project.sourceHtml)
                          .byteLength / 1024
                      ).toFixed(1)}{" "}
                      KiB
                    </span>
                  </div>

                  <p className="mt-4 truncate text-sm font-semibold">
                    {project.title}
                  </p>

                  {project.jaiCharacterName ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      JAI · {project.jaiCharacterName}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      No JAI character metadata
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    Updated {formatProjectDate(project.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <BioImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={(result) => void importBio(result)}
      />

      <AlertDialog
        open={Boolean(projectPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingProjectId) {
            setProjectPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bio?</AlertDialogTitle>
            <AlertDialogDescription>
              {projectPendingDelete
                ? `"${projectPendingDelete.title}" will be removed from Bio Studio. This does not change the character on JanitorAI.`
                : "This Bio Studio project will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              disabled={Boolean(deletingProjectId)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={Boolean(deletingProjectId)}
              onClick={(event) => {
                event.preventDefault();
                void deleteProject();
              }}
            >
              {deletingProjectId ? "Deleting…" : "Delete bio"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
