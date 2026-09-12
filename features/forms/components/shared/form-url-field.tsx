"use client";

import { Check, ExternalLink, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";
import { normalizeHttpUrl } from "@/lib/safe-url";

interface FormUrlFieldProps {
  id: string;
  label: string;
  value: string;

  onChange: (value: string) => void;

  placeholder?: string;
  description?: string;

  optional?: boolean;
}

export function FormUrlField({
  id,
  label,
  value,
  onChange,
  placeholder = "https://example.com",
  description,
  optional = false,
}: FormUrlFieldProps) {
  const trimmed = value.trim();

  const normalized = trimmed ? normalizeHttpUrl(trimmed) : null;

  const invalid = Boolean(trimmed) && !normalized;

  const valid = Boolean(trimmed) && Boolean(normalized);

  const handleBlur = () => {
    if (!normalized) {
      return;
    }

    if (normalized !== value) {
      onChange(normalized);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-medium">
          {label}
        </Label>

        {optional && (
          <span className="text-[9px] text-muted-foreground">Optional</span>
        )}
      </div>

      <div className="relative">
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          className={cn(
            "h-9 pr-9 text-xs",
            invalid && "border-destructive focus-visible:ring-destructive/30",
            valid && "border-emerald-500/70 focus-visible:ring-emerald-500/20",
          )}
          onChange={(event) => onChange(event.target.value)}
          onBlur={handleBlur}
        />

        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
          {invalid ? (
            <X className="h-3.5 w-3.5 text-destructive" />
          ) : valid ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60" />
          )}
        </div>
      </div>

      {invalid ? (
        <p className="text-[10px] leading-relaxed text-destructive">
          Enter a valid HTTP or HTTPS URL.
        </p>
      ) : description ? (
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
