"use client";

import { Braces, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CustomColorPicker } from "@/components/ui/custom-color-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BioColorControlProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  description?: string;
};

function expandHex(value: string) {
  const raw = value.replace("#", "");

  if (raw.length === 3) {
    return `#${raw
      .split("")
      .map((character) => character + character)
      .join("")}`;
  }

  if (raw.length === 4) {
    const [r, g, b, a] = raw;
    if (a?.toLowerCase() !== "f") return null;
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  if (raw.length === 6) return `#${raw}`;

  if (raw.length === 8) {
    if (raw.slice(6).toLowerCase() !== "ff") return null;
    return `#${raw.slice(0, 6)}`;
  }

  return null;
}

function rgbToHex(value: string) {
  const match = value
    .trim()
    .match(
      /^rgba?\(\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*,?\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*,?\s*([+-]?(?:\d+\.?\d*|\.\d+))(?:\s*[,/]\s*([+-]?(?:\d+\.?\d*|\.\d+)%?))?\s*\)$/i,
    );

  if (!match) return null;

  const alphaRaw = match[4];
  if (alphaRaw) {
    const alpha = alphaRaw.endsWith("%")
      ? Number(alphaRaw.slice(0, -1)) / 100
      : Number(alphaRaw);

    if (!Number.isFinite(alpha)) return null;
  }

  const channels = [match[1], match[2], match[3]].map((channel) => {
    const number = Number(channel);
    return Math.max(0, Math.min(255, Math.round(number)));
  });

  if (channels.some((channel) => !Number.isFinite(channel))) return null;

  return `#${channels
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function cssColorToHex(value: string) {
  const raw = value.trim();
  if (!raw) return null;

  if (/^#[0-9a-f]{3,8}$/i.test(raw)) {
    return expandHex(raw);
  }

  const rgb = rgbToHex(raw);
  if (rgb) return rgb;

  if (typeof document === "undefined") return null;

  // Let the browser normalize named colors / hsl() / color() when possible.
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return null;

  const sentinel = "#010203";
  context.fillStyle = sentinel;

  try {
    context.fillStyle = raw;
  } catch {
    return null;
  }

  const normalized = String(context.fillStyle || "");
  if (normalized === sentinel && raw.toLowerCase() !== sentinel) {
    return null;
  }

  if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized;
  return rgbToHex(normalized);
}

function readColorAlpha(value: string) {
  const raw = value.trim();

  const rgba = raw.match(
    /^rgba?\(\s*[+-]?(?:\d+\.?\d*|\.\d+)\s*,?\s*[+-]?(?:\d+\.?\d*|\.\d+)\s*,?\s*[+-]?(?:\d+\.?\d*|\.\d+)(?:\s*[,/]\s*([+-]?(?:\d+\.?\d*|\.\d+)%?))?\s*\)$/i,
  );

  if (!rgba?.[1]) return null;

  const alpha = rgba[1].endsWith("%")
    ? Number(rgba[1].slice(0, -1)) / 100
    : Number(rgba[1]);

  if (!Number.isFinite(alpha)) return null;
  return Math.max(0, Math.min(1, alpha));
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = expandHex(hex);
  if (!normalized) return hex;

  const raw = normalized.slice(1);
  const red = Number.parseInt(raw.slice(0, 2), 16);
  const green = Number.parseInt(raw.slice(2, 4), 16);
  const blue = Number.parseInt(raw.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${Number(alpha.toFixed(3))})`;
}

function isComplexColor(value: string) {
  if (!value.trim()) return false;
  return !cssColorToHex(value);
}

export function BioColorControl({
  label,
  value,
  onChange,
  allowEmpty = true,
  emptyLabel = "Default",
  description,
}: BioColorControlProps) {
  const normalizedHex = useMemo(() => cssColorToHex(value), [value]);
  const preservedAlpha = useMemo(() => readColorAlpha(value), [value]);
  const complex = useMemo(() => isComplexColor(value), [value]);

  const [rawMode, setRawMode] = useState(complex);
  const [rawDraft, setRawDraft] = useState(value);

  useEffect(() => {
    setRawDraft(value);

    if (isComplexColor(value)) {
      setRawMode(true);
      return;
    }

    // rgb(), rgba(), hsl(), named colors and HEX should prefer the visual picker
    // whenever the browser can resolve them to an opaque RGB base.
    setRawMode(false);
  }, [value]);

  if (rawMode) {
    return (
      <div className="min-w-0 space-y-1.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground">
              {label}
            </p>
            {description && (
              <p className="mt-0.5 text-[9px] leading-3.5 text-muted-foreground/70">
                {description}
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 cursor-pointer rounded-md"
            onClick={() => {
              if (normalizedHex || !value.trim()) {
                setRawMode(false);
              }
            }}
            disabled={!normalizedHex && Boolean(value.trim())}
            title={
              normalizedHex || !value.trim()
                ? "Use visual color picker"
                : "This CSS color needs raw mode"
            }
          >
            <Braces className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="h-8 w-8 shrink-0 rounded-lg border border-border/80 shadow-inner"
            style={{
              background:
                normalizedHex ||
                (value.trim() ? value : "transparent"),
            }}
          />

          <Input
            value={rawDraft}
            onChange={(event) => setRawDraft(event.target.value)}
            onBlur={() => {
              const next = rawDraft.trim();
              if (next !== value.trim() && next) onChange(next);
              else setRawDraft(value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="h-8 min-w-0 flex-1 font-mono text-[11px]"
            placeholder="rgb(...), rgba(...), var(...), currentColor"
            spellCheck={false}
          />

          {allowEmpty && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground"
              onClick={() => {
                setRawDraft("");
                setRawMode(false);
                if (value) onChange("");
              }}
              title={`Use ${emptyLabel.toLowerCase()}`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {complex && (
          <p className="text-[9px] leading-3.5 text-muted-foreground/65">
            Complex CSS color preserved as-is. The visual picker is available for
            opaque colors.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="relative">
        <CustomColorPicker
          label={label}
          value={normalizedHex || ""}
          onChange={(nextHex) => {
            if (preservedAlpha !== null && preservedAlpha < 0.999) {
              onChange(hexToRgba(nextHex, preservedAlpha));
              return;
            }

            onChange(nextHex);
          }}
          allowEmpty={allowEmpty}
          emptyLabel={emptyLabel}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute bottom-1.5 right-1.5 z-10 h-7 w-7 cursor-pointer rounded-md text-muted-foreground"
          onClick={() => {
            setRawDraft(value);
            setRawMode(true);
          }}
          aria-label={`Edit ${label} as raw CSS`}
          title="Raw CSS color"
        >
          <Braces className="h-3 w-3" />
        </Button>
      </div>

      {description && (
        <p className="mt-1 text-[9px] leading-3.5 text-muted-foreground/70">
          {description}
        </p>
      )}
    </div>
  );
}
