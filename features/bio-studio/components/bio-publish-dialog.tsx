"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  ExternalLink,
  Minimize2,
  Send,
  ShieldCheck,
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

import { basicMinifyBioHtml, getBioStats } from "../lib/bio-html";
import {
  buildJaiExportPackage,
  buildJaiSaveScript,
  FORGEWORKS_BIO_BRIDGE_PATH,
} from "../lib/jai-bridge";

type BioPublishDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  characterId?: string | null;
  characterName?: string | null;
};

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(2)} KiB`;
}

export function BioPublishDialog({
  open,
  onOpenChange,
  html,
  characterId,
  characterName,
}: BioPublishDialogProps) {
  const minified = useMemo(() => basicMinifyBioHtml(html), [html]);
  const stats = useMemo(() => getBioStats(html, minified), [html, minified]);
  const exportPackage = useMemo(
    () =>
      JSON.stringify(
        buildJaiExportPackage({
          html: minified,
          characterId,
          characterName,
        }),
      ),
    [characterId, characterName, minified],
  );

  const [copied, setCopied] = useState<"package" | "html" | "fallback" | null>(
    null,
  );

  const copy = async (
    kind: "package" | "html" | "fallback",
    value: string,
    message: string,
  ) => {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    toast.success(message);
    window.setTimeout(() => setCopied(null), 1600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send this bio to JanitorAI</DialogTitle>
          <DialogDescription>
            Copy once in Forgeworks, then apply it from the global Bio Bridge on
            the JAI edit page.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/20 p-3">
            <Minimize2 className="mb-2 h-4 w-4 text-primary" />
            <p className="text-xs font-semibold">Minified</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatBytes(stats.sourceBytes)} → {formatBytes(stats.outputBytes)}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <ShieldCheck className="mb-2 h-4 w-4 text-primary" />
            <p className="text-xs font-semibold">Script cleanup</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Script tags and common inline handlers are removed. Review imported HTML before publishing.
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <Send className="mb-2 h-4 w-4 text-primary" />
            <p className="text-xs font-semibold">Bridge-ready</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Character metadata is included when the bio came from JAI.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
          <p className="text-sm font-semibold">Fast path</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Copy the export package, open the matching JAI character edit page,
            then use Forgeworks → <strong>Apply bio from Forgeworks</strong>.
            The Bridge triggers JAI&apos;s normal save flow.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="cursor-pointer gap-2"
              onClick={() =>
                void copy(
                  "package",
                  exportPackage,
                  "Bio Studio export copied",
                )
              }
            >
              {copied === "package" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Clipboard className="h-4 w-4" />
              )}
              {copied === "package" ? "Copied" : "Copy for JAI Bridge"}
            </Button>

            <Button asChild type="button" variant="outline" className="gap-2">
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
        </div>

        <details className="rounded-xl border bg-muted/10 p-3">
          <summary className="cursor-pointer text-xs font-medium">
            Manual / advanced exports
          </summary>

          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer gap-2"
                onClick={() =>
                  void copy("html", minified, "Minified HTML copied")
                }
              >
                <Clipboard className="h-3.5 w-3.5" />
                Copy minified HTML
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer gap-2"
                onClick={() =>
                  void copy(
                    "fallback",
                    buildJaiSaveScript(minified),
                    "Console save fallback copied",
                  )
                }
              >
                <Clipboard className="h-3.5 w-3.5" />
                Copy console save fallback
              </Button>
            </div>

            <Textarea
              readOnly
              value={minified}
              className="h-40 max-h-[28dvh] resize-y overflow-x-hidden whitespace-pre-wrap break-all font-mono text-xs leading-5"
            />
          </div>
        </details>
      </DialogContent>
    </Dialog>
  );
}
