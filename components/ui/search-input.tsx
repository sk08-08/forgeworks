// ============================================================================
// Forgeworks - Search Input Component
// Reusable search input with icon, clear button, and optional debounce
// ============================================================================

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Debounce delay in ms. 0 = no debounce. Default: 300 */
  debounce?: number;
  /** Show a keyboard shortcut hint (e.g. "/") */
  shortcutKey?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Disable the input */
  disabled?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
  debounce = 300,
  shortcutKey,
  autoFocus,
  disabled,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value when external value changes (e.g. clear)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  const handleChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue);
      if (debounce > 0) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          onChange(newValue);
        }, debounce);
      } else {
        onChange(newValue);
      }
    },
    [onChange, debounce],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Keyboard shortcut (press "/" to focus)
  useEffect(() => {
    if (!shortcutKey) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === shortcutKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcutKey]);

  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn("pl-9 pr-9 transition-colors", localValue && "pr-9")}
      />
      {localValue && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={handleClear}
          tabIndex={-1}
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
      {!localValue && shortcutKey && (
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          {shortcutKey}
        </kbd>
      )}
    </div>
  );
}
