"use client";

import { Braces, Minus, Plus, RotateCcw } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type BioNumberPreset = number | string;

type ParsedCssNumber = {
  number: number;
  numberText: string;
  unit: string;
};

type BioNumberControlProps = {
  label: string;
  value?: string;
  onChange: (value: string) => void;

  min?: number;
  max?: number;
  step?: number;

  units?: readonly string[];
  defaultUnit?: string;

  placeholder?: string;
  description?: string;

  presets?: readonly BioNumberPreset[];

  allowEmpty?: boolean;
  allowNegative?: boolean;
  allowRaw?: boolean;

  className?: string;
};

const SIMPLE_NUMBER_PATTERN =
  /^(-?(?:\d+(?:\.\d*)?|\.\d+))([a-z%]*)$/i;

const EDITABLE_NUMBER_PATTERN =
  /^-?(?:\d*(?:\.\d*)?)?$/;

const UNITLESS_VALUE = "__unitless__";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeFloat(value: number) {
  return Number(value.toFixed(6));
}

function parseCssNumber(value: string): ParsedCssNumber | null {
  const match = value.trim().match(SIMPLE_NUMBER_PATTERN);
  if (!match) return null;

  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return null;

  return {
    number: parsed,
    numberText: match[1],
    unit: match[2] || "",
  };
}

function formatPreset(preset: BioNumberPreset) {
  return typeof preset === "number" ? String(preset) : preset;
}

export function BioNumberControl({
  label,
  value = "",
  onChange,

  min = -100000,
  max = 100000,
  step = 0.1,

  units = ["rem", "px", "em", "%", "vw", "vh"],
  defaultUnit = "rem",

  placeholder = "Auto",
  description,

  presets = [],

  allowEmpty = true,
  allowNegative = true,
  allowRaw = true,

  className,
}: BioNumberControlProps) {
  const parsedValue = useMemo(() => parseCssNumber(value), [value]);

  const normalizedUnits = useMemo(() => {
    const next = [...units];

    if (parsedValue?.unit && !next.includes(parsedValue.unit)) {
      next.unshift(parsedValue.unit);
    }

    if (defaultUnit && !next.includes(defaultUnit)) {
      next.unshift(defaultUnit);
    }

    return next;
  }, [defaultUnit, parsedValue?.unit, units]);

  const [rawMode, setRawMode] = useState(
    Boolean(value.trim() && !parsedValue && allowRaw),
  );
  const [draft, setDraft] = useState(
    parsedValue?.numberText ?? (value.trim() ? "" : ""),
  );
  const [unit, setUnit] = useState(
    parsedValue?.unit ?? defaultUnit,
  );
  const [rawDraft, setRawDraft] = useState(value);
  const editedRef = useRef(false);
  const rawEditedRef = useRef(false);

  useEffect(() => {
    const parsed = parseCssNumber(value);

    if (parsed) {
      setDraft(parsed.numberText);
      setUnit(parsed.unit || defaultUnit);
      setRawDraft(value);
      setRawMode(false);
      return;
    }

    if (!value.trim()) {
      setDraft("");
      setUnit(defaultUnit);
      setRawDraft("");
      setRawMode(false);
      return;
    }

    setRawDraft(value);

    if (allowRaw) {
      setRawMode(true);
    }
  }, [allowRaw, defaultUnit, value]);

  const emitNumeric = (
    numericValue: number,
    nextUnit = unit,
  ) => {
    const bounded = clamp(
      allowNegative ? numericValue : Math.max(0, numericValue),
      min,
      max,
    );
    const normalized = normalizeFloat(bounded);

    setDraft(String(normalized));
    setUnit(nextUnit);
    const next = `${normalized}${nextUnit}`;
    if (next !== value) onChange(next);
  };

  const commitDraft = () => {
    if (!editedRef.current) return;
    editedRef.current = false;
    const trimmed = draft.trim();

    // An intermediate empty/partial draft isn't a Reset action.
    if (!trimmed || trimmed === "-" || trimmed === "." || trimmed === "-.") {
      setDraft(parseCssNumber(value)?.numberText ?? "");
      return;
    }

    const parsed = Number(trimmed);

    if (!Number.isFinite(parsed)) {
      const fallback = parseCssNumber(value);
      setDraft(fallback?.numberText ?? "");
      return;
    }

    // Preserve the original CSS text if the user ends on the same number.
    if (parsed === parsedValue?.number && unit === (parsedValue.unit || defaultUnit)) {
      setDraft(parsedValue.numberText);
      return;
    }
    emitNumeric(parsed);
  };

  const adjust = (direction: -1 | 1) => {
    const parsed = Number(draft);
    const fromValue = parseCssNumber(value)?.number;

    const base =
      draft.trim() && Number.isFinite(parsed)
        ? parsed
        : fromValue ?? 0;

    editedRef.current = false;
    emitNumeric(normalizeFloat(base + step * direction));
  };

  const changeUnit = (nextUnit: string) => {
    if (nextUnit === unit) return;
    editedRef.current = false;
    setUnit(nextUnit);

    const parsed = Number(draft);
    if (draft.trim() && Number.isFinite(parsed)) {
      emitNumeric(parsed, nextUnit);
    }
  };

  const clear = () => {
    setDraft("");
    setRawDraft("");
    setRawMode(false);
    editedRef.current = false;
    rawEditedRef.current = false;
    if (value) onChange("");
  };

  const switchToRaw = () => {
    setRawDraft(value);
    setRawMode(true);
  };

  const switchToNumeric = () => {
    const parsed = parseCssNumber(rawDraft);

    if (parsed) {
      setDraft(parsed.numberText);
      setUnit(parsed.unit || defaultUnit);
      setRawMode(false);
      // Switching modes never writes a CSS value.
      return;
    }

    setDraft("");
    setUnit(defaultUnit);
    setRawMode(false);
  };

  return (
    <div className={cn("w-full min-w-0 max-w-full space-y-2 overflow-hidden", className)}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <Label className="text-[11px]">{label}</Label>
          {description && (
            <p className="mt-0.5 text-[9px] leading-3.5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {allowRaw && (
          <Button
            type="button"
            variant={rawMode ? "secondary" : "ghost"}
            size="icon"
            className="h-6 w-6 shrink-0 cursor-pointer rounded-md text-muted-foreground"
            onClick={rawMode ? switchToNumeric : switchToRaw}
            aria-label={rawMode ? `Use numeric ${label}` : `Use raw CSS for ${label}`}
            title={rawMode ? "Use numeric control" : "Use raw CSS value"}
          >
            <Braces className="h-3 w-3" />
          </Button>
        )}
      </div>

      {rawMode ? (
        <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_2rem] items-center gap-1.5">
          <Input
            value={rawDraft}
            onChange={(event) => {
              rawEditedRef.current = true;
              setRawDraft(event.target.value);
            }}
            onBlur={() => {
              if (!rawEditedRef.current) return;
              rawEditedRef.current = false;
              const next = rawDraft.trim();
              if (next && next !== value) onChange(next);
              else setRawDraft(value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            className="h-9 min-w-0 w-full font-mono text-xs"
            placeholder={placeholder}
            aria-label={`${label} raw CSS value`}
          />

          {allowEmpty && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 cursor-pointer rounded-lg text-muted-foreground"
              onClick={clear}
              disabled={!value && !rawDraft}
              aria-label={`Clear ${label}`}
              title="Clear value"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid min-w-0 max-w-full grid-cols-[2rem_minmax(0,1fr)_4.5rem_2rem] items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0 cursor-pointer rounded-lg"
              onClick={() => adjust(-1)}
              aria-label={`Decrease ${label}`}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>

            <Input
              type="text"
              inputMode="decimal"
              value={draft}
              placeholder={placeholder}
              onChange={(event) => {
                const next = event.target.value;

                if (!allowNegative && next.startsWith("-")) return;

                if (next === "" || EDITABLE_NUMBER_PATTERN.test(next)) {
                  editedRef.current = true;
                  setDraft(next);
                }
              }}
              onBlur={commitDraft}
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
              className="h-8 min-w-0 w-full text-center font-mono text-xs tabular-nums"
              aria-label={label}
            />

            {normalizedUnits.length > 0 ? (
              <Select
                value={unit || UNITLESS_VALUE}
                onValueChange={(nextValue) =>
                  changeUnit(
                    nextValue === UNITLESS_VALUE ? "" : nextValue,
                  )
                }
              >
                <SelectTrigger
                  className="h-8 w-full min-w-0 cursor-pointer gap-1 rounded-lg px-2 font-mono text-[10px] text-muted-foreground"
                  aria-label={`${label} unit`}
                >
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>

                <SelectContent
                  position="popper"
                  align="end"
                  className="min-w-[5rem]"
                >
                  {normalizedUnits.map((option) => (
                    <SelectItem
                      key={option || UNITLESS_VALUE}
                      value={option || UNITLESS_VALUE}
                      className="cursor-pointer font-mono text-xs"
                    >
                      {option || "Unitless"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="shrink-0 px-1 text-[10px] text-muted-foreground">
                —
              </span>
            )}

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0 cursor-pointer rounded-lg"
              onClick={() => adjust(1)}
              aria-label={`Increase ${label}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex min-h-5 min-w-0 items-start justify-between gap-2">
            {presets.length > 0 ? (
              <div className="flex min-w-0 flex-1 flex-wrap gap-1 overflow-hidden">
                {presets.map((preset) => {
                  const formatted = formatPreset(preset);
                  const active = value === formatted;

                  return (
                    <button
                      key={formatted}
                      type="button"
                      className={cn(
                        "cursor-pointer rounded-full border border-border/70 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground transition-colors",
                        "hover:border-primary/35 hover:text-foreground",
                        active && "border-primary/35 bg-primary/8 text-primary",
                      )}
                      onClick={() => {
                        const parsed = parseCssNumber(formatted);

                        if (parsed) {
                          setDraft(parsed.numberText);
                          setUnit(parsed.unit || defaultUnit);
                          if (formatted !== value) onChange(formatted);
                        } else if (allowRaw) {
                          setRawDraft(formatted);
                          setRawMode(true);
                          if (formatted !== value) onChange(formatted);
                        }
                      }}
                    >
                      {formatted}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span />
            )}

            {allowEmpty && (
              <button
                type="button"
                className="shrink-0 cursor-pointer text-[9px] text-muted-foreground transition hover:text-foreground disabled:cursor-default disabled:opacity-40"
                onClick={clear}
                disabled={!value && !draft}
              >
                Reset
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
