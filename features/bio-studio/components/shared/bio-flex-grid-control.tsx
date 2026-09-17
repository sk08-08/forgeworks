"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Braces, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import type { BioBuilderStyleValue } from "../../types/bio-types";
import { BioNumberControl } from "./bio-number-control";

type Styles = Record<string, BioBuilderStyleValue>;
type LayoutProps = {
  styles: Styles;
  onChange: (property: string, value: string) => void;
};

const FLEX_DIRECTIONS = [
  { value: "row", label: "Row", icon: ArrowRight },
  { value: "column", label: "Column", icon: ArrowDown },
  { value: "row-reverse", label: "Reverse row", icon: ArrowLeft },
  { value: "column-reverse", label: "Reverse column", icon: ArrowUp },
] as const;

const JUSTIFY = ["normal", "start", "end", "center", "flex-start", "flex-end", "space-between", "space-around", "space-evenly", "stretch"];
const ALIGN = ["normal", "stretch", "start", "end", "center", "flex-start", "flex-end", "baseline"];
const CONTENT = ["normal", "stretch", "start", "end", "center", "flex-start", "flex-end", "space-between", "space-around", "space-evenly"];
const GRID_JUSTIFY_ITEMS = ["normal", "stretch", "start", "end", "center", "baseline"];

function read(styles: Styles, property: string) {
  return styles[property]?.resolved || "";
}
function authored(styles: Styles, property: string) {
  return styles[property]?.inline || "";
}

// Only infer an editable count from an explicitly authored simple track list.
// Computed grid templates resolve to pixel tracks and must NEVER be rewritten as fr units.
export function parseSimpleGridColumns(value: string): number | null {
  const text = value.trim().replace(/\s+/g, " ");
  if (!text) return null;
  const repeated = text.match(/^repeat\(\s*(\d+)\s*,\s*(?:minmax\(\s*0(?:px)?\s*,\s*1fr\s*\)|1fr)\s*\)$/i);
  if (repeated) {
    const count = Number(repeated[1]);
    return count >= 1 && count <= 12 ? count : null;
  }
  const tracks = text.match(/^1fr(?:\s+1fr)*$/i);
  if (!tracks) return null;
  const count = text.split(/\s+/).length;
  return count <= 12 ? count : null;
}

function Option({
  label, property, options, styles, onChange,
}: {
  label: string; property: string; options: readonly string[];
  styles: Styles; onChange: LayoutProps["onChange"];
}) {
  const value = read(styles, property);
  const custom = Boolean(value && !options.includes(value));
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        {!authored(styles, property) && value && (
          <span className="text-[9px] text-muted-foreground/60">computed</span>
        )}
      </div>
      <Select
        value={custom ? "__custom__" : value || "__default__"}
        onValueChange={(next) => {
          if (next === "__custom__") return;
          onChange(property, next === "__default__" ? "" : next);
        }}
      >
        <SelectTrigger className="h-9 w-full min-w-0 cursor-pointer text-xs" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__default__">Default (remove inline)</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
          {custom && <SelectItem value="__custom__" disabled>{value} (custom)</SelectItem>}
        </SelectContent>
      </Select>
    </div>
  );
}

function RawTrack({ label, property, styles, onChange, placeholder }: {
  label: string; property: string; styles: Styles;
  onChange: LayoutProps["onChange"]; placeholder: string;
}) {
  const current = authored(styles, property);
  const [draft, setDraft] = useState(current);
  useEffect(() => setDraft(current), [current]);
  const commit = () => {
    const next = draft.trim();
    if (next !== current) onChange(property, next);
  };
  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-[11px] font-medium text-muted-foreground" htmlFor={`bio-${property}`}>
        {label} · CSS
      </label>
      <Input
        id={`bio-${property}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        placeholder={placeholder}
        className="h-9 min-w-0 w-full font-mono text-[11px]"
        spellCheck={false}
      />
      {!current && read(styles, property) && (
        <p className="break-all text-[9px] leading-4 text-muted-foreground/70">
          Computed: {read(styles, property)} · unchanged until you edit.
        </p>
      )}
    </div>
  );
}

function Gaps({ styles, onChange }: LayoutProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 border-t pt-3 min-[350px]:grid-cols-2">
      <BioNumberControl
        label="Row gap"
        value={read(styles, "row-gap")}
        defaultUnit="rem"
        units={["rem", "px", "em", "%", "vw", "vh"]}
        min={0}
        allowNegative={false}
        step={0.05}
        placeholder="0"
        onChange={(next) => onChange("row-gap", next)}
      />
      <BioNumberControl
        label="Column gap"
        value={read(styles, "column-gap")}
        defaultUnit="rem"
        units={["rem", "px", "em", "%", "vw", "vh"]}
        min={0}
        allowNegative={false}
        step={0.05}
        placeholder="0"
        onChange={(next) => onChange("column-gap", next)}
      />
      <p className="col-span-full text-[9px] leading-4 text-muted-foreground/70">
        Gaps are independent. Editing one preserves the other and any existing gap shorthand.
      </p>
    </div>
  );
}

export function BioFlexGridControl({ styles, onChange }: LayoutProps) {
  const display = read(styles, "display");
  const isFlex = display === "flex" || display === "inline-flex";
  const isGrid = display === "grid" || display === "inline-grid";
  const columnCSS = authored(styles, "grid-template-columns");
  const columnCount = parseSimpleGridColumns(columnCSS);
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => setAdvanced(false), [display]);
  if (!isFlex && !isGrid) return null;

  const changeCount = (next: number) => {
    if (!Number.isInteger(next) || next < 1 || next > 12 || next === columnCount) return;
    onChange("grid-template-columns", `repeat(${next}, minmax(0, 1fr))`);
  };

  return (
    <div className="min-w-0 space-y-3 rounded-xl border bg-muted/[0.04] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold">{isFlex ? "Flex layout" : "Grid layout"}</p>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
            Changes affect the selected container only. Existing advanced CSS stays intact.
          </p>
        </div>
        {isGrid && (
          <Button
            type="button" size="icon" variant={advanced ? "secondary" : "ghost"}
            className="h-7 w-7 shrink-0 cursor-pointer"
            aria-label={advanced ? "Hide advanced grid CSS" : "Show advanced grid CSS"}
            title="Advanced grid CSS"
            onClick={() => setAdvanced((old) => !old)}
          >
            <Braces className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {isFlex && (
        <>
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">Direction</span>
            <div className="grid grid-cols-4 gap-1">
              {FLEX_DIRECTIONS.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value} type="button" size="icon"
                  variant={read(styles, "flex-direction") === value ? "secondary" : "outline"}
                  className="h-9 w-full min-w-0 cursor-pointer"
                  aria-label={label} aria-pressed={read(styles, "flex-direction") === value}
                  title={label}
                  onClick={() => onChange("flex-direction", value)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>
          <Option label="Wrap" property="flex-wrap" options={["nowrap", "wrap", "wrap-reverse"]} styles={styles} onChange={onChange} />
          <Option label="Justify items along the main axis" property="justify-content" options={JUSTIFY} styles={styles} onChange={onChange} />
          <Option label="Align items along the cross axis" property="align-items" options={ALIGN} styles={styles} onChange={onChange} />
          {read(styles, "flex-wrap") !== "nowrap" && (
            <Option label="Align wrapped lines" property="align-content" options={CONTENT} styles={styles} onChange={onChange} />
          )}
        </>
      )}

      {isGrid && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Equal-width columns</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {columnCount === null ? "Custom / inherited" : columnCount}
              </span>
            </div>
            {columnCount === null && (
              <p className="text-[10px] leading-4 text-muted-foreground">
                {columnCSS
                  ? "Advanced columns detected. Use CSS below to keep them, or explicitly replace them with equal columns."
                  : "No simple inline columns. Set a count only if you want to override the current grid."}
              </p>
            )}
            <div className="grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2">
              <Button type="button" size="icon" variant="outline" className="h-8 w-8 cursor-pointer"
                disabled={columnCount === null || columnCount <= 1}
                aria-label="Remove one column" onClick={() => changeCount((columnCount ?? 1) - 1)}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <div className="flex flex-wrap justify-center gap-1">
                {Array.from({ length: columnCount ?? 2 }, (_, index) => (
                  <span key={index} className="h-7 min-w-0 flex-1 rounded border border-primary/30 bg-primary/10" />
                ))}
              </div>
              <Button type="button" size="icon" variant="outline" className="h-8 w-8 cursor-pointer"
                disabled={columnCount !== null && columnCount >= 12}
                aria-label={columnCount === null ? "Set two equal columns" : "Add one column"}
                onClick={() => changeCount(columnCount === null ? 2 : columnCount + 1)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Option label="Justify grid content" property="justify-content" options={JUSTIFY} styles={styles} onChange={onChange} />
          <Option label="Align grid content" property="align-content" options={CONTENT} styles={styles} onChange={onChange} />
          <Option label="Justify items within cells" property="justify-items" options={GRID_JUSTIFY_ITEMS} styles={styles} onChange={onChange} />
          <Option label="Align items within cells" property="align-items" options={ALIGN} styles={styles} onChange={onChange} />
        </>
      )}
      <Gaps styles={styles} onChange={onChange} />
      {isGrid && (advanced || (columnCSS !== "" && columnCount === null)) && (
        <div className="space-y-3 border-t pt-3">
          <RawTrack label="Grid columns" property="grid-template-columns" styles={styles}
            onChange={onChange} placeholder="repeat(2, minmax(0, 1fr))" />
          <RawTrack label="Grid rows" property="grid-template-rows" styles={styles}
            onChange={onChange} placeholder="auto 1fr" />
        </div>
      )}
    </div>
  );
}
