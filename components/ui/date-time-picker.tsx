"use client";

import { useMemo, useRef, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  RotateCcw,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

type DateTimePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default" | "lg";

  /**
   * Allows the value to be saved as YYYY-MM-DD without a time component.
   * Existing datetime values automatically open with time enabled.
   */
  allowDateOnly?: boolean;

  /**
   * Initial time state when allowDateOnly is enabled and value is empty.
   */
  defaultIncludeTime?: boolean;

  /**
   * Locale used for month/date labels. Forgeworks defaults to English.
   */
  locale?: string;
};

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);

const MINUTES = [
  "00",
  "05",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function hasTimeComponent(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(value || ""));
}

function parseLocalValue(value: string): DateTimeParts | null {
  const raw = String(value || "").trim();

  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dateTimeMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);

  const match = dateTimeMatch || dateOnlyMatch;

  if (!match) {
    return null;
  }

  const parts: DateTimeParts = {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3]),
    hour: dateTimeMatch ? Number(dateTimeMatch[4]) : 12,
    minute: dateTimeMatch ? Number(dateTimeMatch[5]) : 0,
  };

  const date = new Date(
    parts.year,
    parts.month,
    parts.day,
    parts.hour,
    parts.minute,
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return parts;
}

function serializeDateOnly(parts: DateTimeParts) {
  return `${parts.year}-${pad2(parts.month + 1)}-${pad2(parts.day)}`;
}

function serializeLocalValue(parts: DateTimeParts) {
  return `${parts.year}-${pad2(parts.month + 1)}-${pad2(parts.day)}T${pad2(
    parts.hour,
  )}:${pad2(parts.minute)}`;
}

function getDefaultParts(): DateTimeParts {
  const now = new Date();

  const roundedMinutes = Math.ceil(now.getMinutes() / 5) * 5;
  const adjusted = new Date(now);

  adjusted.setSeconds(0, 0);

  if (roundedMinutes >= 60) {
    adjusted.setHours(adjusted.getHours() + 1, 0, 0, 0);
  } else {
    adjusted.setMinutes(roundedMinutes, 0, 0);
  }

  return {
    year: adjusted.getFullYear(),
    month: adjusted.getMonth(),
    day: adjusted.getDate(),
    hour: adjusted.getHours(),
    minute: adjusted.getMinutes(),
  };
}

function sameDay(
  a: Pick<DateTimeParts, "year" | "month" | "day">,
  b: Pick<DateTimeParts, "year" | "month" | "day">,
) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function formatDisplayValue(value: string, locale: string) {
  const parts = parseLocalValue(value);

  if (!parts) {
    return null;
  }

  const date = new Date(
    parts.year,
    parts.month,
    parts.day,
    parts.hour,
    parts.minute,
  );

  if (!hasTimeComponent(value)) {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function DateTimePicker({
  id,
  value,
  onChange,
  placeholder = "Choose date and time",
  disabled = false,
  className,
  size = "default",
  allowDateOnly = false,
  defaultIncludeTime = true,
  locale = "en-US",
}: DateTimePickerProps) {
  const current = parseLocalValue(value);

  const initialView = current || getDefaultParts();

  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const [open, setOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const [preferredSide, setPreferredSide] = useState<"top" | "bottom">(
    "bottom",
  );
  const [layoutMode, setLayoutMode] = useState<
    "normal" | "compact" | "emergency"
  >("normal");
  const compact = layoutMode !== "normal";

  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);
  const [draft, setDraft] = useState<DateTimeParts>(initialView);
  const [includeTime, setIncludeTime] = useState(
    allowDateOnly
      ? value
        ? hasTimeComponent(value)
        : defaultIncludeTime
      : true,
  );

  const displayValue = formatDisplayValue(value, locale);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startWeekDay = firstDay.getDay();

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const daysInPreviousMonth = new Date(viewYear, viewMonth, 0).getDate();

    // Always render a 6-week calendar grid (42 cells).
    // This keeps the popover height and month navigation controls perfectly
    // stable when moving between months with 4, 5 or 6 visible weeks.
    const visibleCellCount = 42;

    return Array.from({ length: visibleCellCount }, (_, index) => {
      const rawDay = index - startWeekDay + 1;

      if (rawDay < 1) {
        const day = daysInPreviousMonth + rawDay;
        const date = new Date(viewYear, viewMonth - 1, day);

        return {
          year: date.getFullYear(),
          month: date.getMonth(),
          day: date.getDate(),
          outside: true,
        };
      }

      if (rawDay > daysInMonth) {
        const date = new Date(viewYear, viewMonth + 1, rawDay - daysInMonth);

        return {
          year: date.getFullYear(),
          month: date.getMonth(),
          day: date.getDate(),
          outside: true,
        };
      }

      return {
        year: viewYear,
        month: viewMonth,
        day: rawDay,
        outside: false,
      };
    });
  }, [viewMonth, viewYear]);

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(viewYear, viewMonth, 1));

  const todayDate = new Date();

  const today = {
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
    day: todayDate.getDate(),
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const nextPortalContainer =
        triggerRef.current?.closest<HTMLElement>('[role="dialog"]') ?? null;

      setPortalContainer(nextPortalContainer);

      const next = parseLocalValue(value) || getDefaultParts();

      setDraft(next);
      setViewYear(next.year);
      setViewMonth(next.month);

      if (allowDateOnly) {
        setIncludeTime(value ? hasTimeComponent(value) : defaultIncludeTime);
      }

      const rect = triggerRef.current?.getBoundingClientRect();

      if (rect) {
        const viewportHeight = window.innerHeight;
        const safeGap = 24;

        const roomAbove = Math.max(0, rect.top - safeGap);
        const roomBelow = Math.max(0, viewportHeight - rect.bottom - safeGap);

        const nextSide = roomBelow >= roomAbove ? "bottom" : "top";
        const room = nextSide === "bottom" ? roomBelow : roomAbove;

        setPreferredSide(nextSide);
        // Prefer resizing over scrolling:
        // - normal: roomy desktop/laptop space
        // - compact: shorter layout with fixed-height day cells
        // - emergency: only very small available height gets internal scroll
        setLayoutMode(
          room >= 470 ? "normal" : room >= 340 ? "compact" : "emergency",
        );
      }
    }

    setOpen(nextOpen);
  };

  const changeMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonth + offset, 1);

    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const selectDay = (day: { year: number; month: number; day: number }) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      year: day.year,
      month: day.month,
      day: day.day,
    }));

    if (day.month !== viewMonth || day.year !== viewYear) {
      setViewYear(day.year);
      setViewMonth(day.month);
    }
  };

  const chooseNow = () => {
    const next = getDefaultParts();

    setDraft(next);
    setViewYear(next.year);
    setViewMonth(next.month);

    if (allowDateOnly) {
      setIncludeTime(true);
    }
  };

  const apply = () => {
    onChange(
      allowDateOnly && !includeTime
        ? serializeDateOnly(draft)
        : serializeLocalValue(draft),
    );
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setOpen(false);
  };

  const triggerSizeClass = {
    sm: "h-8",
    default: "h-9",
    lg: "h-10",
  }[size];

  const clearButtonSizeClass = {
    sm: "h-8 w-8",
    default: "h-9 w-9",
    lg: "h-10 w-10",
  }[size];

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <div className={cn("flex w-full items-center gap-2", className)}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            data-state={open ? "on" : "off"}
            className={cn(
              "group min-w-0 flex-1 cursor-pointer justify-start rounded-md",
              triggerSizeClass,
              "border-input bg-transparent px-3 text-left font-normal shadow-xs",
              "transition-[color,box-shadow,border-color,background-color]",
              "hover:bg-accent/45 hover:text-foreground",
              "data-[state=on]:border-ring data-[state=on]:ring-[3px] data-[state=on]:ring-ring/50",
              !displayValue && "text-muted-foreground",
            )}
          >
            <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary group-data-[state=on]:text-primary" />

            <span className="min-w-0 flex-1 truncate">
              {displayValue || placeholder}
            </span>

            {(!allowDateOnly || hasTimeComponent(value)) && (
              <Clock3 className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
            )}
          </Button>
        </PopoverTrigger>

        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "shrink-0 cursor-pointer rounded-md text-muted-foreground hover:bg-destructive/10",
              clearButtonSizeClass,
            )}
            aria-label={allowDateOnly ? "Clear date" : "Clear date and time"}
            onClick={clear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <PopoverPrimitive.Portal container={portalContainer ?? undefined}>
        <PopoverPrimitive.Content
          align="start"
          side={preferredSide}
          sideOffset={8}
          alignOffset={0}
          avoidCollisions
          collisionPadding={16}
          sticky="always"
          style={{
            height: compact
              ? "min(28rem, var(--radix-popover-content-available-height, calc(100dvh - 2rem)))"
              : "min(32rem, var(--radix-popover-content-available-height, calc(100dvh - 2rem)))",
            maxHeight: "calc(100dvh - 2rem)",
          }}
          className={cn(
            "z-50 grid w-[min(21rem,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl outline-none",
            "border border-border/80 bg-popover/95 p-0 text-popover-foreground shadow-xl backdrop-blur-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:slide-in-from-top-2",
            "data-[side=top]:origin-bottom data-[side=bottom]:origin-top",
            compact && "w-[min(20rem,calc(100vw-2rem))]",
          )}
        >
          <div
            className={cn(
              "shrink-0 border-b border-border/60 bg-primary/[0.025]",
              compact ? "px-3 py-2" : "px-3.5 py-2.5",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {allowDateOnly ? "Date" : "Date & time"}
                </p>

                <p className="mt-0.5 text-xs font-medium">
                  {formatDisplayValue(
                    allowDateOnly && !includeTime
                      ? serializeDateOnly(draft)
                      : serializeLocalValue(draft),
                    locale,
                  )}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer rounded-full px-2.5 text-[11px]"
                onClick={chooseNow}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Now
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain",
              compact ? "p-2.5" : "p-3.5",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "cursor-pointer rounded-full",
                  compact ? "h-6 w-6" : "h-7 w-7",
                )}
                aria-label="Previous month"
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <p
                className={cn(
                  "font-semibold tracking-tight",
                  compact ? "text-xs" : "text-sm",
                )}
              >
                {monthLabel}
              </p>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "cursor-pointer rounded-full",
                  compact ? "h-6 w-6" : "h-7 w-7",
                )}
                aria-label="Next month"
                onClick={() => changeMonth(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div
              className={cn(
                "grid grid-cols-7",
                compact ? "mt-1.5 gap-x-0.5 gap-y-0" : "mt-2.5 gap-0.5",
              )}
            >
              {WEEK_DAYS.map((day) => (
                <div
                  key={day}
                  className={cn(
                    "flex items-center justify-center font-medium text-muted-foreground",
                    compact ? "h-5 text-[8px]" : "h-6 text-[9px]",
                  )}
                >
                  {day}
                </div>
              ))}

              {calendarDays.map((day) => {
                const selected = sameDay(draft, day);
                const isToday = sameDay(today, day);

                return (
                  <button
                    key={`${day.year}-${day.month}-${day.day}`}
                    type="button"
                    data-state={selected ? "on" : "off"}
                    className={cn(
                      "relative flex items-center justify-center rounded-md transition-all",
                      compact
                        ? "h-7 text-[10px]"
                        : "aspect-square min-h-7 text-[11px]",
                      "data-[state=off]:cursor-pointer data-[state=on]:cursor-default",
                      day.outside
                        ? "text-muted-foreground/35 data-[state=off]:hover:bg-muted/35"
                        : "text-foreground data-[state=off]:hover:bg-primary/8 data-[state=off]:hover:text-primary",
                      selected &&
                        "bg-primary text-primary-foreground shadow-sm hover:bg-primary",
                      isToday &&
                        !selected &&
                        "font-semibold text-primary ring-1 ring-primary/25",
                    )}
                    onClick={() => {
                      if (!selected) {
                        selectDay(day);
                      }
                    }}
                  >
                    {day.day}
                  </button>
                );
              })}
            </div>

            <div
              className={cn(
                "border-t border-border/60",
                compact ? "mt-2 pt-2" : "mt-3 pt-3",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock3
                    className={cn(
                      "h-4 w-4 shrink-0",
                      includeTime ? "text-primary" : "text-muted-foreground",
                    )}
                  />

                  <div>
                    <p className="text-xs font-medium">Time</p>

                    {allowDateOnly && !compact && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Optional — turn it on only when the exact time matters.
                      </p>
                    )}
                  </div>
                </div>

                {allowDateOnly && (
                  <Switch
                    checked={includeTime}
                    onCheckedChange={setIncludeTime}
                    aria-label="Include time"
                  />
                )}
              </div>

              {includeTime && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Select
                    value={pad2(draft.hour)}
                    onValueChange={(value) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        hour: Number(value),
                      }))
                    }
                  >
                    <SelectTrigger className={cn("w-full", compact && "h-8")}>
                      <SelectValue placeholder="Hour" />
                    </SelectTrigger>

                    <SelectContent className="max-h-64">
                      {HOURS.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={pad2(draft.minute)}
                    onValueChange={(value) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        minute: Number(value),
                      }))
                    }
                  >
                    <SelectTrigger className={cn("w-full", compact && "h-8")}>
                      <SelectValue placeholder="Minute" />
                    </SelectTrigger>

                    <SelectContent>
                      {MINUTES.map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          {minute}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div
            className={cn(
              "shrink-0 flex items-center justify-between gap-2 border-t border-border/60 bg-popover/95 backdrop-blur-xl",
              compact ? "px-3 py-2" : "px-3.5 py-2.5",
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "cursor-pointer rounded-full text-muted-foreground",
                compact && "h-8 px-2.5",
              )}
              onClick={clear}
            >
              Clear
            </Button>

            <Button
              type="button"
              size="sm"
              className={cn(
                "cursor-pointer rounded-full",
                compact ? "h-8 px-3.5" : "px-4",
              )}
              onClick={apply}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Apply
            </Button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </Popover>
  );
}
