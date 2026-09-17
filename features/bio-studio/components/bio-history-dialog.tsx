"use client";

import { Clock3, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { BioVersionSnapshot } from "../types/bio-types";

type BioHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: BioVersionSnapshot[];
  onRestore: (version: BioVersionSnapshot) => void;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBytes(value: string) {
  const bytes = new TextEncoder().encode(value).byteLength;
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KiB`;
}

export function BioHistoryDialog({
  open,
  onOpenChange,
  versions,
  onRestore,
}: BioHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            Forgeworks keeps the last saved checkpoints inside this Bio Studio
            project. Restoring a checkpoint creates an unsaved draft first.
          </DialogDescription>
        </DialogHeader>

        {versions.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Clock3 className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No checkpoints yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              A checkpoint is created when you save over an existing version.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className="flex flex-col gap-3 rounded-xl border bg-muted/10 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">
                      {version.title || "Untitled Bio"}
                    </p>
                    {index === 0 && (
                      <span className="rounded-md border px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                        latest checkpoint
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDate(version.savedAt)} · {formatBytes(version.html)} ·{" "}
                    {version.sourceKind.replace("_", " ")}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 cursor-pointer gap-2"
                  onClick={() => {
                    onRestore(version);
                    onOpenChange(false);
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore as draft
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
