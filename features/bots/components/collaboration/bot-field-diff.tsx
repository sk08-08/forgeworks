"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BotCollaborationField } from "@/features/bots/lib/collaboration-permissions";
import { FIELD_LABELS } from "./collaboration-config";
import { diffStringArrays, diffText, diffValueEquals } from "./bot-diff";

export function BotFieldDiff({
  field,
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
  conflict = false,
  currentValue,
}: {
  field: BotCollaborationField;
  before: unknown;
  after: unknown;
  beforeLabel?: string;
  afterLabel?: string;
  conflict?: boolean;
  currentValue?: unknown;
}) {
  const changed = !diffValueEquals(before, after);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border",
        conflict ? "border-amber-500/35" : "border-border/60",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/25 px-3 py-2">
        <p className="text-xs font-medium">{FIELD_LABELS[field] || field}</p>
        <div className="flex items-center gap-2">
          {!changed && <Badge variant="secondary" className="text-[9px]">No change</Badge>}
          {conflict && (
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[9px] text-amber-600 dark:text-amber-300">
              <AlertTriangle className="mr-1 h-3 w-3" /> Conflict
            </Badge>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <DiffBody field={field} before={before} after={after} />

        <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>{beforeLabel}</span>
          <ArrowRight className="h-3 w-3" />
          <span>{afterLabel}</span>
        </div>

        {conflict && currentValue !== undefined && (
          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.055] p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Current persisted value changed after this request was created
            </p>
            <div className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-xs leading-5">
              {formatScalar(field, currentValue)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function DiffBody({
  field,
  before,
  after,
}: {
  field: BotCollaborationField;
  before: unknown;
  after: unknown;
}) {
  if (field === "tags" || field === "alternate_greetings") {
    const diff = diffStringArrays(before, after);
    if (diff.added.length === 0 && diff.removed.length === 0) {
      return <p className="text-xs text-muted-foreground">No differences.</p>;
    }

    return (
      <div className="space-y-2 text-xs">
        {diff.removed.map((value, index) => (
          <div key={`removed-${index}-${value}`} className="rounded-md bg-red-500/[0.08] px-2 py-1.5 text-red-700 dark:text-red-300">
            <span className="mr-2 font-mono">−</span>{value || "Empty"}
          </div>
        ))}
        {diff.added.map((value, index) => (
          <div key={`added-${index}-${value}`} className="rounded-md bg-emerald-500/[0.08] px-2 py-1.5 text-emerald-700 dark:text-emerald-300">
            <span className="mr-2 font-mono">+</span>{value || "Empty"}
          </div>
        ))}
      </div>
    );
  }

  if (
    field === "rating" ||
    field === "hide_sensitive_fields" ||
    field === "image_url"
  ) {
    return (
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <ValueCard tone="removed" value={formatScalar(field, before)} />
        <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
        <ValueCard tone="added" value={formatScalar(field, after)} />
      </div>
    );
  }

  const chunks = diffText(before, after);
  if (chunks.length === 0) {
    return <p className="text-xs text-muted-foreground">Both values are empty.</p>;
  }

  return (
    <div className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/15 p-3 font-mono text-xs leading-6">
      {chunks.map((chunk, index) => (
        <span
          key={`${chunk.type}-${index}`}
          className={cn(
            chunk.type === "removed" && "bg-red-500/15 text-red-700 line-through decoration-red-500/60 dark:text-red-300",
            chunk.type === "added" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
          )}
        >
          {chunk.value}
        </span>
      ))}
    </div>
  );
}

function ValueCard({ tone, value }: { tone: "removed" | "added"; value: string }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border px-3 py-2 text-xs",
        tone === "removed"
          ? "border-red-500/15 bg-red-500/[0.05]"
          : "border-emerald-500/15 bg-emerald-500/[0.05]",
      )}
    >
      {value}
    </div>
  );
}

function formatScalar(field: BotCollaborationField, value: unknown): string {
  if (field === "hide_sensitive_fields") return value === true ? "Enabled" : "Disabled";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Empty";
  const text = String(value ?? "");
  return text || "Empty";
}
