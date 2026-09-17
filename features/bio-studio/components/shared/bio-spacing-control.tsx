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
import { cn } from "@/lib/utils";

type SpacingSide = "top" | "right" | "bottom" | "left";

type ParsedSpacingValue = {
  numberText: string;
  unit: string;
  auto: boolean;
};

type BioSpacingControlProps = {
  label: string;
  property: "padding" | "margin";
  value: string;
  top: string;
  right: string;
  bottom: string;
  left: string;
  onChange: (updates: Record<string, string>) => void;
  allowNegative?: boolean;
  allowAuto?: boolean;
  units?: readonly string[];
  defaultUnit?: string;
  step?: number;
};

const UNITLESS = "__unitless__";
const AUTO = "__auto__";

const NUMBER_PATTERN =
  /^(-?(?:\d+(?:\.\d*)?|\.\d+))([a-z%]*)$/i;

const EDITABLE_NUMBER_PATTERN =
  /^-?(?:\d*(?:\.\d*)?)?$/;

function parseValue(
  value: string,
  defaultUnit: string,
): ParsedSpacingValue | null {
  const raw = value.trim();

  if (!raw) {
    return {
      numberText: "0",
      unit: defaultUnit,
      auto: false,
    };
  }

  if (raw.toLowerCase() === "auto") {
    return {
      numberText: "",
      unit: "",
      auto: true,
    };
  }

  const match = raw.match(NUMBER_PATTERN);
  if (!match) return null;

  return {
    numberText: match[1],
    unit: match[2] || defaultUnit,
    auto: false,
  };
}

function normalizeNumber(value: number) {
  return Number(value.toFixed(6));
}

function sideProperty(
  property: "padding" | "margin",
  side: SpacingSide,
) {
  return `${property}-${side}`;
}

function areEquivalent(
  values: Record<SpacingSide, ParsedSpacingValue>,
) {
  const first = values.top;

  return (["right", "bottom", "left"] as SpacingSide[]).every((side) => {
    const current = values[side];

    if (first.auto || current.auto) {
      return first.auto === current.auto;
    }

    return (
      Number(first.numberText || 0) === Number(current.numberText || 0) &&
      first.unit === current.unit
    );
  });
}

function serializeParsed(value: ParsedSpacingValue) {
  if (value.auto) return "auto";
  return `${value.numberText || "0"}${value.unit}`;
}

function SideInput({
  label,
  value,
  units,
  defaultUnit,
  allowNegative,
  allowAuto,
  step,
  onCommit,
}: {
  label: string;
  value: ParsedSpacingValue;
  units: readonly string[];
  defaultUnit: string;
  allowNegative: boolean;
  allowAuto: boolean;
  step: number;
  onCommit: (value: ParsedSpacingValue) => void;
}) {
  const [draft, setDraft] = useState(value.numberText);
  const editedRef = useRef(false);

  useEffect(() => {
    setDraft(value.numberText);
  }, [value.numberText]);

  const commit = () => {
    if (!editedRef.current) return;
    editedRef.current = false;
    if (value.auto) return;

    const raw = draft.trim();

    if (!raw || raw === "-" || raw === "." || raw === "-.") {
      setDraft(value.numberText);
      return;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setDraft(value.numberText);
      return;
    }

    const safe = allowNegative ? parsed : Math.max(0, parsed);
    const normalized = String(normalizeNumber(safe));

    if (Number(value.numberText) === Number(normalized)) {
      setDraft(value.numberText);
      return;
    }
    setDraft(normalized);
    onCommit({
      numberText: normalized,
      unit: value.unit || defaultUnit,
      auto: false,
    });
  };

  const nudge = (direction: -1 | 1) => {
    editedRef.current = false;
    if (value.auto) {
      onCommit({
        numberText: String(step),
        unit: defaultUnit,
        auto: false,
      });
      return;
    }

    const current = Number(draft);
    const base = Number.isFinite(current) ? current : 0;
    const safe = allowNegative
      ? base + step * direction
      : Math.max(0, base + step * direction);

    const normalized = String(normalizeNumber(safe));
    setDraft(normalized);

    onCommit({
      numberText: normalized,
      unit: value.unit || defaultUnit,
      auto: false,
    });
  };

  const selectValue = value.auto
    ? AUTO
    : value.unit || UNITLESS;

  return (
    <div className="min-w-0 space-y-1">
      <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
        {label}
      </span>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_4.25rem] gap-1">
        <Input
          type="text"
          inputMode="decimal"
          value={value.auto ? "auto" : draft}
          disabled={value.auto}
          onChange={(event) => {
            const next = event.target.value;
            if (!allowNegative && next.startsWith("-")) return;

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
          aria-label={`${label} spacing`}
        />

        <Select
          value={selectValue}
          onValueChange={(next) => {
            editedRef.current = false;
            if (next === AUTO) {
              onCommit({
                numberText: "",
                unit: "",
                auto: true,
              });
              return;
            }

            const nextUnit = next === UNITLESS ? "" : next;
            if (!value.auto && nextUnit === value.unit) return;
            const numeric = Number(draft);
            onCommit({
              numberText: value.auto || !draft.trim() || !Number.isFinite(numeric)
                ? "0" : String(numeric),
              unit: nextUnit,
              auto: false,
            });
          }}
        >
          <SelectTrigger
            className="h-8 w-full min-w-0 cursor-pointer gap-1 px-2 font-mono text-[10px] text-muted-foreground"
            aria-label={`${label} unit`}
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

            {allowAuto && (
              <SelectItem
                value={AUTO}
                className="cursor-pointer font-mono text-xs"
              >
                auto
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function BioSpacingControl({
  label,
  property,
  value,
  top,
  right,
  bottom,
  left,
  onChange,
  allowNegative = false,
  allowAuto = false,
  units = ["rem", "px", "em", "%", "vw", "vh"],
  defaultUnit = "rem",
  step = 0.05,
}: BioSpacingControlProps) {
  const parsed = useMemo(() => {
    const next = {
      top: parseValue(top, defaultUnit),
      right: parseValue(right, defaultUnit),
      bottom: parseValue(bottom, defaultUnit),
      left: parseValue(left, defaultUnit),
    };

    if (
      !next.top ||
      !next.right ||
      !next.bottom ||
      !next.left
    ) {
      return null;
    }

    return next as Record<SpacingSide, ParsedSpacingValue>;
  }, [bottom, defaultUnit, left, right, top]);

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

  const clearLonghands = () => ({
    [sideProperty(property, "top")]: "",
    [sideProperty(property, "right")]: "",
    [sideProperty(property, "bottom")]: "",
    [sideProperty(property, "left")]: "",
  });

  // Reset removes inline declarations; computed CSS may still resolve to 0px.
  const reset = () => {
    onChange({
      [property]: "",
      ...clearLonghands(),
    });
  };

  const commitSide = (
    side: SpacingSide,
    nextValue: ParsedSpacingValue,
  ) => {
    if (!parsed) return;

    if (linked) {
      onChange({
        [property]: serializeParsed(nextValue),
        ...clearLonghands(),
      });
      return;
    }

    const next = {
      ...parsed,
      [side]: nextValue,
    };

    onChange({
      [property]: "",
      [sideProperty(property, "top")]: serializeParsed(next.top),
      [sideProperty(property, "right")]: serializeParsed(next.right),
      [sideProperty(property, "bottom")]: serializeParsed(next.bottom),
      [sideProperty(property, "left")]: serializeParsed(next.left),
    });
  };

  if (rawMode || !parsed) {
    return (
      <div className="min-w-0 space-y-2 rounded-xl border bg-muted/[0.04] p-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold">{label}</p>
            <p className="mt-0.5 text-[9px] leading-3.5 text-muted-foreground">
              Advanced shorthand is preserved exactly.
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
            title={parsed ? "Use visual spacing editor" : "This value needs raw CSS"}
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
              if (next !== value.trim() && next) {
                onChange({ [property]: next, ...clearLonghands() });
              } else {
                setRawDraft(value);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="h-8 min-w-0 flex-1 font-mono text-[11px]"
            placeholder={property === "margin" ? "0 auto" : "1rem 1.5rem"}
            spellCheck={false}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground"
            onClick={reset}
            title={`Remove inline ${label.toLowerCase()} (use CSS/default)`}
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
          <p className="text-[11px] font-semibold">{label}</p>
          <p className="mt-0.5 text-[9px] leading-3.5 text-muted-foreground">
            {linked
              ? "Sides are linked. One change applies everywhere."
              : "Edit each side independently."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant={linked ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7 cursor-pointer rounded-md"
            onClick={() => setLinked((current) => !current)}
            aria-label={linked ? `Unlink ${label}` : `Link ${label}`}
            title={linked ? "Unlink sides" : "Link sides"}
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
            aria-label={`Edit ${label} as raw CSS`}
            title="Raw CSS spacing"
          >
            <Braces className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer rounded-md text-muted-foreground"
            onClick={reset}
            aria-label={`Reset ${label}`}
            title={`Remove inline ${label.toLowerCase()} (use CSS/default)`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid min-w-0 gap-2",
          "grid-cols-1 min-[350px]:grid-cols-2",
        )}
      >
        <SideInput
          label="Top"
          value={parsed.top}
          units={units}
          defaultUnit={defaultUnit}
          allowNegative={allowNegative}
          allowAuto={allowAuto}
          step={step}
          onCommit={(next) => commitSide("top", next)}
        />
        <SideInput
          label="Right"
          value={parsed.right}
          units={units}
          defaultUnit={defaultUnit}
          allowNegative={allowNegative}
          allowAuto={allowAuto}
          step={step}
          onCommit={(next) => commitSide("right", next)}
        />
        <SideInput
          label="Bottom"
          value={parsed.bottom}
          units={units}
          defaultUnit={defaultUnit}
          allowNegative={allowNegative}
          allowAuto={allowAuto}
          step={step}
          onCommit={(next) => commitSide("bottom", next)}
        />
        <SideInput
          label="Left"
          value={parsed.left}
          units={units}
          defaultUnit={defaultUnit}
          allowNegative={allowNegative}
          allowAuto={allowAuto}
          step={step}
          onCommit={(next) => commitSide("left", next)}
        />
      </div>
    </div>
  );
}
