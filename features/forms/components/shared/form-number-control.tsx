"use client";

import { Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormNumberControlProps {
  label: string;

  value?: number;

  onChange: (value: number | undefined) => void;

  min?: number;
  max?: number;
  step?: number;

  suffix?: string;

  placeholder?: string;

  presets?: number[];

  allowEmpty?: boolean;

  className?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function FormNumberControl({
  label,
  value,
  onChange,

  min = 0,
  max = 100000,
  step = 1,

  suffix,

  placeholder = "None",

  presets = [],

  allowEmpty = true,

  className,
}: FormNumberControlProps) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));

  useEffect(() => {
    setDraft(value === undefined ? "" : String(value));
  }, [value]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();

    if (!trimmed) {
      if (allowEmpty) {
        setDraft("");
        onChange(undefined);
        return;
      }

      const next = String(min);

      setDraft(next);
      onChange(min);

      return;
    }

    const parsed = Number(trimmed);

    if (!Number.isFinite(parsed)) {
      setDraft(value === undefined ? "" : String(value));

      return;
    }

    const normalized = clamp(Math.trunc(parsed), min, max);

    setDraft(String(normalized));
    onChange(normalized);
  };

  const adjust = (direction: -1 | 1) => {
    const parsed = Number(draft);

    const base = draft.trim() && Number.isFinite(parsed) ? parsed : min;

    commit(String(base + step * direction));
  };

  const numericValue =
    draft.trim() && Number.isFinite(Number(draft)) ? Number(draft) : undefined;

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs">{label}</Label>

        {suffix && (
          <span className="text-[10px] text-muted-foreground">{suffix}</span>
        )}
      </div>

      <div
        className={cn(
          "grid items-center gap-1.5",
          allowEmpty
            ? "grid-cols-[2.25rem_minmax(0,1fr)_2.25rem_2.25rem]"
            : "grid-cols-[2.25rem_minmax(0,1fr)_2.25rem]",
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 cursor-pointer rounded-lg"
          onClick={() => adjust(-1)}
          disabled={numericValue !== undefined && numericValue <= min}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>

        <div className="relative min-w-0">
          <Input
            type="text"
            inputMode="numeric"
            value={draft}
            placeholder={placeholder}
            onChange={(event) => {
              const next = event.target.value;

              if (next === "" || /^-?\d*$/.test(next)) {
                setDraft(next);
              }
            }}
            onBlur={() => commit(draft)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                adjust(1);
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                adjust(-1);
              }
            }}
            className={cn(
              "h-9 min-w-0 text-center font-mono text-xs tabular-nums",
              suffix && "pr-10",
            )}
            aria-label={label}
          />

          {suffix && (
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 cursor-pointer rounded-lg"
          onClick={() => adjust(1)}
          disabled={numericValue !== undefined && numericValue >= max}
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>

        {allowEmpty && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 cursor-pointer rounded-lg text-muted-foreground"
            disabled={value === undefined && !draft}
            onClick={() => {
              setDraft("");
              onChange(undefined);
            }}
            aria-label={`Clear ${label}`}
            title="No limit"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const active = value === preset;

            return (
              <button
                key={preset}
                type="button"
                className={cn(
                  "cursor-pointer rounded-full border border-border/70 px-2 py-1 text-[10px] tabular-nums text-muted-foreground transition-colors",
                  "hover:border-primary/35 hover:text-foreground",
                  active && "border-primary/35 bg-primary/8 text-primary",
                )}
                onClick={() => commit(String(preset))}
              >
                {preset}
                {suffix}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
