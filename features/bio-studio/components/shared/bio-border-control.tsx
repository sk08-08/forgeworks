"use client";

import { Braces, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { BioColorControl } from "./bio-color-control";
import { BioNumberControl } from "./bio-number-control";

type BioBorderControlProps = {
  value: string;
  width: string;
  style: string;
  color: string;
  onChange: (updates: Record<string, string>) => void;
};

const BORDER_STYLES = [
  "none",
  "solid",
  "dashed",
  "dotted",
  "double",
  "groove",
  "ridge",
  "inset",
  "outset",
] as const;

function isSimpleWidth(value: string) {
  return /^(?:0|(?:\d+(?:\.\d*)?|\.\d+)(?:px|rem|em)?)$/i.test(
    value.trim(),
  );
}

function isSimpleStyle(value: string) {
  const raw = value.trim();
  return !raw || BORDER_STYLES.includes(raw as (typeof BORDER_STYLES)[number]);
}

function isSimpleBorder(width: string, style: string) {
  return isSimpleWidth(width) && isSimpleStyle(style);
}

export function BioBorderControl({
  value,
  width,
  style,
  color,
  onChange,
}: BioBorderControlProps) {
  const simple = useMemo(
    () => isSimpleBorder(width, style),
    [style, width],
  );

  const [rawMode, setRawMode] = useState(!simple);
  const [rawDraft, setRawDraft] = useState(value);

  useEffect(() => {
    setRawDraft(value);
    if (!simple) setRawMode(true);
  }, [simple, value]);

  // Reset removes overrides rather than writing a literal 0 border.
  const reset = () => {
    onChange({
      border: "",
      "border-width": "",
      "border-style": "",
      "border-color": "",
      "border-top": "", "border-right": "", "border-bottom": "", "border-left": "",
      "border-top-width": "", "border-right-width": "", "border-bottom-width": "", "border-left-width": "",
      "border-top-style": "", "border-right-style": "", "border-bottom-style": "", "border-left-style": "",
      "border-top-color": "", "border-right-color": "", "border-bottom-color": "", "border-left-color": "",
    });
  };

  if (rawMode) {
    return (
      <div className="min-w-0 space-y-2 rounded-xl border bg-muted/[0.04] p-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold">Border</p>
            <p className="mt-0.5 text-[9px] leading-3.5 text-muted-foreground">
              Mixed side borders and advanced values stay available as raw CSS.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 cursor-pointer rounded-md"
            onClick={() => {
              if (simple) setRawMode(false);
            }}
            disabled={!simple}
            title={simple ? "Use visual border editor" : "This border needs raw CSS"}
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
                onChange({ border: next, "border-width": "", "border-style": "", "border-color": "" });
              } else {
                setRawDraft(value);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="h-8 min-w-0 flex-1 font-mono text-[11px]"
            placeholder="1px solid rgba(255,255,255,.12)"
            spellCheck={false}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground"
            onClick={reset}
            title="Remove inline border (use CSS/default)"
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
          <p className="text-[11px] font-semibold">Border</p>
          <p className="mt-0.5 text-[9px] leading-3.5 text-muted-foreground">
            Width, line style, and color stay grouped as one visual control.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer rounded-md"
            onClick={() => {
              setRawDraft(value);
              setRawMode(true);
            }}
            aria-label="Edit border as raw CSS"
            title="Raw CSS border"
          >
            <Braces className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer rounded-md text-muted-foreground"
            onClick={reset}
            aria-label="Reset border"
            title="Remove inline border (use CSS/default)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <BioNumberControl
        label="Width"
        value={width}
        defaultUnit="px"
        units={["px", "rem", "em"]}
        step={1}
        min={0}
        allowNegative={false}
        placeholder="0"
        presets={["0", "1px", "2px", "3px"]}
        onChange={(nextWidth) =>
          onChange({
            "border-width": nextWidth,
          })
        }
      />

      <div className="min-w-0 space-y-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">
          Style
        </span>

        <Select
          value={style || "none"}
          onValueChange={(nextStyle) =>
            onChange({
              "border-style": nextStyle,
            })
          }
        >
          <SelectTrigger className="h-9 w-full min-w-0 cursor-pointer text-xs">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {BORDER_STYLES.map((option) => (
              <SelectItem
                key={option}
                value={option}
                className="cursor-pointer"
              >
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <BioColorControl
        label="Color"
        value={color}
        emptyLabel="Current color"
        onChange={(nextColor) =>
          onChange({
            "border-color": nextColor,
          })
        }
      />
    </div>
  );
}
