"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

/** Copy/share only the current address; no analytics, persistence or account data. */
export function BotPageActions({ visibility }: { visibility: "public" | "followers" | "private" }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setError(false);
    } catch { setError(true); setCopied(false); }
  };
  const share = async () => {
    if (typeof navigator.share !== "function") { await copy(); return; }
    try { await navigator.share({ url: window.location.href }); setError(false); }
    catch (failure) { if (failure instanceof Error && failure.name !== "AbortError") setError(true); }
  };
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/70 px-3 py-2.5 text-xs sm:px-4">
      <span className="text-muted-foreground">{visibility === "public" ? "Enjoying this character? Keep the link handy." : "This link does not grant access; only authorized people can open it."}</span>
      <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
        <button type="button" onClick={() => void copy()} className="inline-flex min-h-10 min-w-0 w-full sm:w-auto cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 font-medium transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy link"}
        </button>
        <button type="button" onClick={() => void share()} className="inline-flex min-h-10 min-w-0 w-full sm:w-auto cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 font-medium transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
      </div>
      {error && <span role="alert" className="w-full text-destructive">Sharing failed. Copy the address from your browser instead.</span>}
    </div>
  );
}
