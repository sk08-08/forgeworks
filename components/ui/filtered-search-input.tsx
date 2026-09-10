// ============================================================================
// Forgeworks - Filtered Search Input
// SearchInput combined with a Select filter dropdown (e.g. status, rating)
// ============================================================================

"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "./search-input";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface FilteredSearchInputProps {
  // Search props
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  debounce?: number;
  shortcutKey?: string;

  // Filter props
  filterOptions: FilterOption[];
  filterValue: string;
  onFilterChange: (value: string) => void;
  filterPlaceholder?: string;

  // Layout
  className?: string;
  /** Stack filter below search on mobile. Default: true */
  stackOnMobile?: boolean;
}

export function FilteredSearchInput({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  debounce = 300,
  shortcutKey,
  filterOptions,
  filterValue,
  onFilterChange,
  filterPlaceholder = "Filter",
  className,
  stackOnMobile = true,
}: FilteredSearchInputProps) {
  return (
    <div
      className={cn(
        "flex gap-2",
        stackOnMobile ? "flex-col sm:flex-row" : "flex-row",
        className,
      )}
    >
      <SearchInput
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        debounce={debounce}
        shortcutKey={shortcutKey}
        className="flex-1 sm:max-w-sm"
      />
      <Select value={filterValue} onValueChange={onFilterChange}>
        <SelectTrigger
          className={cn(stackOnMobile ? "w-full sm:w-32" : "w-32")}
        >
          <SelectValue placeholder={filterPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {filterOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-1.5">
                {option.icon}
                {option.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
