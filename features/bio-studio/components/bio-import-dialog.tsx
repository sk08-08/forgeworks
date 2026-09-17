"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ClipboardPaste,
  Code2,
  ExternalLink,
  TerminalSquare,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { parseBioImportInput } from "../lib/bio-html";
import {
  buildJaiCaptureScript,
  FORGEWORKS_BIO_BRIDGE_PATH,
} from "../lib/jai-bridge";
import type { BioImportResult } from "../types/bio-types";


type BioImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (result: BioImportResult) => void;
};

export function BioImportDialog({
  open,
  onOpenChange,
  onImport,
}: BioImportDialogProps) {
  const [value, setValue] = useState("");
  const [readingClipboard, setReadingClipboard] = useState(false);

  const parsed = useMemo(() => parseBioImportInput(value), [value]);

  const pasteFromClipboard = async () => {
    setReadingClipboard(true);

    try {
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText.trim()) {
        toast.error("Clipboard is empty");
        return;
      }

      setValue(clipboardText);
      toast.success("JAI bio package pasted");
    } catch {
      toast.error(
        "Browser clipboard access was blocked. Paste the package manually instead.",
      );
    } finally {
      setReadingClipboard(false);
    }
  };

  const copyConsoleFallback = async () => {
    await navigator.clipboard.writeText(buildJaiCaptureScript());
    toast.success("Console fallback copied");
  };

  const submit = () => {
    if (!parsed.html.trim()) return;
    onImport(parsed);
    setValue("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl overflow-x-hidden overflow-y-auto">
        <DialogHeader className="min-w-0">
          <DialogTitle>Import a bio from JanitorAI</DialogTitle>
          <DialogDescription>
            Install the Forgeworks Bridge once, then importing future bios is
            just copy on JAI → paste here.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Forgeworks Bio Bridge</p>
              <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
                One Tampermonkey userscript for every character. It captures the
                full saved bio before JAI&apos;s editor can flatten custom HTML,
                and can also apply Bio Studio exports back to JAI.
              </p>
            </div>

            <Button asChild className="shrink-0 cursor-pointer gap-2">
              <a
                href={FORGEWORKS_BIO_BRIDGE_PATH}
                target="_blank"
                rel="noreferrer"
              >
                Install / Update Bridge
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>

          <div className="mt-4 rounded-xl border bg-background/55 p-3">
            <p className="text-xs font-semibold">After installing</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Open or reload the JAI character edit page. Use the floating
              Forgeworks button → <strong>Copy bio to Forgeworks</strong>. The
              package is copied automatically.
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/15 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Paste the captured bio</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The Bridge already put the import package on your clipboard.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer gap-2"
              onClick={() => void pasteFromClipboard()}
              disabled={readingClipboard}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              {readingClipboard ? "Reading…" : "Paste from clipboard"}
            </Button>
          </div>

          {parsed.package && (
            <div className="mt-3 min-w-0 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
              <span className="font-medium">JAI package detected</span>
              {parsed.package.characterName && (
                <span className="break-words text-muted-foreground">
                  {" "}
                  · {parsed.package.characterName}
                </span>
              )}
            </div>
          )}

          <div className="mt-3 min-w-0">
            <div className="mb-2 flex min-w-0 items-center gap-2">
              <Code2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="truncate text-xs font-medium">
                Import package or raw HTML
              </p>
            </div>

            <Textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              spellCheck={false}
              wrap="soft"
              className="h-52 max-h-[32dvh] min-h-36 w-full min-w-0 resize-y overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-all font-mono text-xs leading-5"
              placeholder='Paste {"forgeworks":"jai-bio",...} or raw <div>HTML</div>'
            />
          </div>
        </div>

        <details className="rounded-xl border bg-muted/10 p-3">
          <summary className="cursor-pointer text-xs font-medium">
            Advanced fallback
          </summary>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            If you cannot use Tampermonkey, the console helper can still import
            normal bios. Complex script-injected bios may be flattened because
            this fallback starts after JAI has loaded.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 cursor-pointer gap-2"
            onClick={() => void copyConsoleFallback()}
          >
            <TerminalSquare className="h-3.5 w-3.5" />
            Copy console fallback
          </Button>
        </details>

        <div className="flex min-w-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={!parsed.html.trim()}
            onClick={submit}
          >
            Import into Bio Studio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
