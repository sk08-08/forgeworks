"use client";

import { Braces, Link2, RotateCcw, Unlink2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RadiusCorner =
  | "top-left"
  | "top-right"
  | "bottom-right"
  | "bottom-left";

type ParsedRadius = {
  numberText: string;
  unit: string;
};

type BioRadiusControlProps = {
  value: string;
  topLeft: string;
  topRight: string;
  bottomRight: string;
  bottomLeft: string;
  onChange: (updates: Record<string, string>) => void;
  units?: readonly string[];
  defaultUnit?: string;
  step?: number;
};

const UNITLESS = "__unitless__";

const NUMBER_PATTERN =
  /^((?:\d+(?:\.\d*)?|\.\d+))([a-z%]*)$/i;

const EDITABLE_NUMBER_PATTERN =
  /^(?:\d*(?:\.\d*)?)?$/;

function parseRadius(
  value: string,
  defaultUnit: string,
): ParsedRadius | null {
  const raw = value.trim();

  if (!raw) {
    return {
      numberText: "0",
      unit: defaultUnit,
    };
  }

  const match = raw.match(NUMBER_PATTERN);
  if (!match) return null;

  return {
    numberText: match[1],
    unit: match[2] || defaultUnit,
  };
}

function normalizeNumber(value: number) {
  return Number(value.toFixed(6));
}

function serializeRadius(value: ParsedRadius) {
  return `${value.numberText || "0"}${value.unit}`;
}

function cornerProperty(corner: RadiusCorner) {
  return `border-${corner}-radius`;
}

function areEquivalent(values: Record<RadiusCorner, ParsedRadius>) {
  const first = values["top-left"];

  return (
    ["top-right", "bottom-right", "bottom-left"] as RadiusCorner[]
  ).every((corner) => {
    const current = values[corner];

    return (
      Number(first.numberText || 0) === Number(current.numberText || 0) &&
      first.unit === current.unit
    );
  });
}

function RadiusInput({
  label,
  value,
  units,
  defaultUnit,
  step,
  onCommit,
}: {
  label: string;
  value: ParsedRadius;
  units: readonly string[];
  defaultUnit: string;
  step: number;
  onCommit: (value: ParsedRadius) => void;
}) {
  const [draft, setDraft] = useState(value.numberText);
  const editedRef = useRef(false);

  useEffect(() => {
    setDraft(value.numberText);
  }, [value.numberText]);

  const commit = () => {
    if (!editedRef.current) return;
    editedRef.current = false;
    const raw = draft.trim();

    if (!raw || raw === ".") {
      setDraft(value.numberText);
      return;
    }

    const parsed = Number(raw);

    if (!Number.isFinite(parsed)) {
      setDraft(value.numberText);
      return;
    }

    const normalized = String(normalizeNumber(Math.max(0, parsed)));
    if (Number(value.numberText) === Number(normalized)) {
      setDraft(value.numberText);
      return;
    }
    setDraft(normalized);

    onCommit({
      numberText: normalized,
      unit: value.unit || defaultUnit,
    });
  };

  const nudge = (direction: -1 | 1) => {
    editedRef.current = false;
    const current = Number(draft);
    const base = Number.isFinite(current) ? current : 0;
    const normalized = String(
      normalizeNumber(Math.max(0, base + step * direction)),
    );

    setDraft(normalized);

    onCommit({
      numberText: normalized,
      unit: value.unit || defaultUnit,
    });
  };

  return (
    <div className="min-w-0 space-y-1">
      <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
        {label}
      </span>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_4.25rem] gap-1">
        <Input
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(event) => {
            const next = event.target.value;

            if (next === "" || EDITABLE_NUMBER_PATTERN.test(next)) {
              editedRef.current = true;
              setDraft(next);
            }
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              nudge(1);
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              nudge(-1);
            }
          }}
          className="h-8 min-w-0 px-2 text-center font-mono text-[11px] tabular-nums"
          aria-label={`${label} radius`}
        />

        <Select
          value={value.unit || UNITLESS}
          onValueChange={(next) => {
            editedRef.current = false;
            const nextUnit = next === UNITLESS ? "" : next;
            if (nextUnit === value.unit) return;
            const numeric = Number(draft);
            onCommit({
              numberText: draft.trim() && Number.isFinite(numeric)
                ? String(numeric) : value.numberText,
              unit: nextUnit,
            });
          }}
        >
          <SelectTrigger
            className="h-8 w-full min-w-0 cursor-pointer gap-1 px-2 font-mono text-[10px] text-muted-foreground"
            aria-label={`${label} radius unit`}
          >
            <SelectValue />
          </SelectTrigger>

          <SelectContent align="end" className="min-w-[5rem]">
            {units.map((unit) => (
              <SelectItem
                key={unit || UNITLESS}
                value={unit || UNITLESS}
                className="cursor-pointer font-mono text-xs"
              >
                {unit || "Unitless"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function BioRadiusControl({
  value,
  topLeft,
  topRight,
  bottomRight,
  bottomLeft,
  onChange,
  units = ["rem", "px", "em", "%"],
  defaultUnit = "rem",
  step = 0.05,
}: BioRadiusControlProps) {
  const parsed = useMemo(() => {
    const next = {
      "top-left": parseRadius(topLeft, defaultUnit),
      "top-right": parseRadius(topRight, defaultUnit),
      "bottom-right": parseRadius(bottomRight, defaultUnit),
      "bottom-left": parseRadius(bottomLeft, defaultUnit),
    };

    if (
      !next["top-left"] ||
      !next["top-right"] ||
      !next["bottom-right"] ||
      !next["bottom-left"]
    ) {
      return null;
    }

    return next as Record<RadiusCorner, ParsedRadius>;
  }, [bottomLeft, bottomRight, defaultUnit, topLeft, topRight]);

  const [rawMode, setRawMode] = useState(parsed === null);
  const [rawDraft, setRawDraft] = useState(value);
  const [linked, setLinked] = useState(
    parsed ? areEquivalent(parsed) : false,
  );
  const wasParseableRef = useRef(parsed !== null);

  useEffect(() => {
    setRawDraft(value);
    const parseable = parsed !== null;
    if (!parseable) setRawMode(true);
    else if (!wasParseableRef.current) setRawMode(false);
    wasParseableRef.current = parseable;
    // Only the selected-element key resets linked; changes to computed CSS
    // never override a link/unlink decision made by the user.
  }, [parsed, value]);

  const clearCorners = () => ({
    "border-top-left-radius": "",
    "border-top-right-radius": "",
    "border-bottom-right-radius": "",
    "border-bottom-left-radius": "",
  });

  // Reset removes inline declarations; CSS/default radius may still be 0px.
  const reset = () => {
    onChange({
      "border-radius": "",
      ...clearCorners(),
    });
  };

  const commitCorner = (
    corner: RadiusCorner,
    nextValue: ParsedRadius,
  ) => {
    if (!parsed) return;

    if (linked) {
      onChange({
        "border-radius": serializeRadius(nextValue),
        ...clearCorners(),
      });
      return;
    }

    const next = {
      ...parsed,
      [corner]: nextValue,
    };

    onChange({
      "border-radius": "",
      "border-top-left-radius": serializeRadius(next["top-left"]),
      "border-top-right-radius": serializeRadius(next["top-right"]),
      "border-bottom-right-radius": serializeRadius(next["bottom-right"]),
      "border-bottom-left-radius": serializeRadius(next["bottom-left"]),
    });
  };

  if (rawMode || !parsed) {
    return (
      <div className="min-w-0 space-y-2 rounded-xl border bg-muted/[0.04] p-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold">Corner radius</p>
            <p className="mt-0.5 text-[9px] leading-3.5 text-muted-foreground">
              Elliptical or advanced radius syntax is preserved exactly.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 cursor-pointer rounded-md"
            onClick={() => {
              if (parsed) setRawMode(false);
            }}
            disabled={!parsed}
            title={parsed ? "Use visual radius editor" : "This radius needs raw CSS"}
          >
            <Braces className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex min-w-0 items-center gap-1.5">
          <Input
            value={rawDraft}
            onChange={(event) => setRawDraft(event.target.value)}
            onBlur={() => {
              const next = rawDraft.trim();
              if (next && next !== value.trim()) {
                onChange({ "border-radius": next, ...clearCorners() });
              } else {
                setRawDraft(value);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="h-8 min-w-0 flex-1 font-mono text-[11px]"
            placeholder="1rem 1rem .5rem .5rem"
            spellCheck={false}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground"
            onClick={reset}
            title="Remove inline radius (use CSS/default)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3 rounded-xl border bg-muted/[0.04] p-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold">Corner radius</p>
          <p className="mt-0.5 text-[9px] leading-3.5 text-muted-foreground">
            {linked
              ? "Corners are linked. One change applies everywhere."
              : "Edit each corner independently."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant={linked ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7 cursor-pointer rounded-md"
            onClick={() => setLinked((current) => !current)}
            aria-label={linked ? "Unlink radius corners" : "Link radius corners"}
            title={linked ? "Unlink corners" : "Link corners"}
          >
            {linked ? (
              <Link2 className="h-3.5 w-3.5" />
            ) : (
              <Unlink2 className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer rounded-md"
            onClick={() => {
              setRawDraft(value);
              setRawMode(true);
            }}
            aria-label="Edit radius as raw CSS"
            title="Raw CSS radius"
          >
            <Braces className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer rounded-md text-muted-foreground"
            onClick={reset}
            aria-label="Reset radius"
            title="Remove inline radius (use CSS/default)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-2 min-[350px]:grid-cols-2">
        <RadiusInput
          label="Top left"
          value={parsed["top-left"]}
          units={units}
          defaultUnit={defaultUnit}
          step={step}
          onCommit={(next) => commitCorner("top-left", next)}
        />
        <RadiusInput
          label="Top right"
          value={parsed["top-right"]}
          units={units}
          defaultUnit={defaultUnit}
          step={step}
          onCommit={(next) => commitCorner("top-right", next)}
        />
        <RadiusInput
          label="Bottom left"
          value={parsed["bottom-left"]}
          units={units}
          defaultUnit={defaultUnit}
          step={step}
          onCommit={(next) => commitCorner("bottom-left", next)}
        />
        <RadiusInput
          label="Bottom right"
          value={parsed["bottom-right"]}
          units={units}
          defaultUnit={defaultUnit}
          step={step}
          onCommit={(next) => commitCorner("bottom-right", next)}
        />
      </div>
    </div>
  );
}
