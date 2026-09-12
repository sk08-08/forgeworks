"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { HexColorPicker } from "react-colorful";
import { RotateCcw } from "lucide-react";

const defaultPresets = [
  { label: "Violet", value: "#7c3aed" },
  { label: "Emerald", value: "#10b981" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Slate", value: "#64748b" },
  { label: "Fuchsia", value: "#d946ef" },
  { label: "Teal", value: "#14b8a6" },
];

interface CustomColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets?: Array<{ label: string; value: string }>;

  /**
   * When enabled, an empty string represents "inherit/default".
   * Existing usages remain unchanged because this defaults to false.
   */
  allowEmpty?: boolean;
  emptyLabel?: string;
}

function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function CustomColorPicker({
  label,
  value,
  onChange,
  presets = defaultPresets,
  allowEmpty = false,
  emptyLabel = "Default",
}: CustomColorPickerProps) {
  const rawValue = String(value || "").trim();
  const isEmpty = allowEmpty && !rawValue;

  const normalized = isHexColor(rawValue) ? rawValue : "#7c3aed";

  const isCustomColor =
    !isEmpty &&
    normalized &&
    !presets.some(
      (preset) => preset.value.toLowerCase() === normalized.toLowerCase(),
    );

  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-xs">{label}</Label>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full min-w-0 cursor-pointer justify-start gap-3 border-border/80 bg-card/85 px-3 shadow-sm transition-colors hover:bg-muted/55"
          >
            <span
              className={cn(
                "relative h-5 w-5 shrink-0 overflow-hidden rounded-full border border-foreground/15 shadow-sm ring-1 ring-black/5",
                isEmpty && "bg-muted",
              )}
              style={!isEmpty ? { backgroundColor: normalized } : undefined}
            >
              {isEmpty && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 h-px w-7 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-muted-foreground/70"
                />
              )}
            </span>

            <span className="flex min-w-0 flex-1 flex-col items-start text-left">
              <span className="truncate text-sm font-medium">{label}</span>
              <span className="truncate font-mono text-[11px] uppercase text-muted-foreground">
                {isEmpty ? emptyLabel : normalized}
              </span>
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[20rem] border-border/80 bg-popover p-4 shadow-xl"
          align="center"
          side="bottom"
          sideOffset={8}
        >
          <div className="space-y-4">
            <div className="h-32 w-full overflow-hidden rounded-lg border border-border/50 shadow-inner sm:h-36">
              <HexColorPicker
                color={normalized}
                onChange={onChange}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Suggested colors</p>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(3.75rem,1fr))] gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    data-state={
                      !isEmpty &&
                      normalized.toLowerCase() === preset.value.toLowerCase()
                        ? "on"
                        : "off"
                    }
                    className={cn(
                      "group flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-xl border border-border/70 bg-card/70 p-2 transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-muted/40",
                      !isEmpty &&
                        normalized.toLowerCase() ===
                          preset.value.toLowerCase() &&
                        "border-primary/70 bg-primary/10 shadow-sm",
                    )}
                    onClick={() => onChange(preset.value)}
                  >
                    <span
                      className="h-7 w-7 rounded-full border shadow-sm transition-transform group-hover:scale-105"
                      style={{ backgroundColor: preset.value }}
                    />

                    <span className="max-w-full truncate text-[10px] font-medium text-muted-foreground">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs">Custom hex</Label>

              <Input
                value={isEmpty ? "" : rawValue || normalized}
                onChange={(event) => onChange(event.target.value)}
                placeholder="#7C3AED"
                className="h-9 font-mono text-xs uppercase"
                maxLength={7}
                spellCheck={false}
              />

              {isCustomColor && (
                <div
                  className="mt-2 h-1.5 w-full rounded-full shadow-inner transition-colors duration-300"
                  style={{ backgroundColor: normalized }}
                />
              )}
            </div>

            {allowEmpty && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full cursor-pointer justify-start rounded-lg text-xs text-muted-foreground"
                onClick={() => onChange("")}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Use {emptyLabel.toLowerCase()}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
