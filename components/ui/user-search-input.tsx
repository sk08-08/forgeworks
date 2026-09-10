// ============================================================================
// Forgeworks - Reusable User Search Input
// Search for users by username with avatar, suggestions, and profile links
// ============================================================================

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface UserSuggestion {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface UserSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when a suggestion is selected */
  onSelect?: (user: UserSuggestion) => void;
  /** Pre-loaded suggestions (e.g. from getMyFollowing) */
  suggestions: UserSuggestion[];
  /** IDs to exclude from suggestions (e.g. already-invited users) */
  excludeIds?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Whether suggestions are still loading */
  loading?: boolean;
  /** Max number of suggestions to show */
  maxSuggestions?: number;
}

export function UserSearchInput({
  value,
  onChange,
  onSelect,
  suggestions,
  excludeIds = [],
  placeholder = "Search by username...",
  disabled = false,
  className,
  loading = false,
  maxSuggestions = 8,
}: UserSearchInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input value
  const filtered = suggestions
    .filter((s) => !excludeIds.includes(s.id))
    .filter((s) => {
      if (!value.trim()) return false;
      const q = value.toLowerCase();
      return (
        (s.username || "").toLowerCase().includes(q) ||
        (s.display_name || "").toLowerCase().includes(q)
      );
    })
    .slice(0, maxSuggestions);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlighted index when filtered changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filtered.length]);

  const handleSelect = useCallback(
    (user: UserSuggestion) => {
      if (onSelect) {
        onSelect(user);
      } else {
        onChange(user.username || "");
      }
      setShowDropdown(false);
    },
    [onSelect, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown || filtered.length === 0) {
        if (e.key === "ArrowDown" && filtered.length > 0) {
          setShowDropdown(true);
          setHighlightedIndex(0);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filtered.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filtered.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
            handleSelect(filtered[highlightedIndex]);
          }
          break;
        case "Escape":
          setShowDropdown(false);
          break;
      }
    },
    [showDropdown, filtered, highlightedIndex, handleSelect],
  );

  const showResults = showDropdown && value.trim().length > 0;

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value.toLowerCase());
            setShowDropdown(e.target.value.length > 0);
          }}
          onFocus={() => {
            if (value.length > 0) setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 text-sm"
          maxLength={48}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground animate-spin" />
        )}
      </div>

      {showResults && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
          role="listbox"
        >
          {filtered.length > 0 ? (
            <div className="max-h-52 overflow-y-auto py-1">
              {filtered.map((user, index) => (
                <button
                  key={user.id}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer",
                    index === highlightedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted/60",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(user);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={index === highlightedIndex}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {user.display_name || user.username || "Unknown"}
                    </p>
                    {user.username && user.display_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{user.username}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No users found matching &quot;{value}&quot;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
