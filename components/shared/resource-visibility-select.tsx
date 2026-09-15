"use client";

import { Globe2, LockKeyhole, UsersRound } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  RESOURCE_VISIBILITIES,
  RESOURCE_VISIBILITY_COPY,
  type ResourceVisibility,
} from "@/lib/resource-visibility";

interface ResourceVisibilitySelectProps {
  value: ResourceVisibility;
  onChange: (value: ResourceVisibility) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

const VISIBILITY_ICONS = {
  public: Globe2,
  followers: UsersRound,
  private: LockKeyhole,
} satisfies Record<ResourceVisibility, typeof Globe2>;

export function ResourceVisibilitySelect({
  value,
  onChange,
  disabled = false,
  label = "Visibility",
  description = "Controls who can access this resource. This is independent from your profile visibility.",
}: ResourceVisibilitySelectProps) {
  const CurrentIcon = VISIBILITY_ICONS[value];

  return (
    <div className="min-w-0 space-y-2.5">
      <div className="min-w-0 space-y-1">
        <Label className="text-sm font-medium">{label}</Label>

        {description ? (
          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      <Select
        value={value}
        onValueChange={(next) => onChange(next as ResourceVisibility)}
        disabled={disabled}
      >
        <SelectTrigger
          className="h-10 w-full min-w-0 px-3"
          aria-label={label}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CurrentIcon className="h-4 w-4 shrink-0 text-muted-foreground" />

            <span className="truncate text-sm font-medium">
              {RESOURCE_VISIBILITY_COPY[value].label}
            </span>
          </span>
        </SelectTrigger>

        <SelectContent
          position="popper"
          sideOffset={6}
          className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]"
        >
          {RESOURCE_VISIBILITIES.map((option) => {
            const OptionIcon = VISIBILITY_ICONS[option];

            return (
              <SelectItem
                key={option}
                value={option}
                className="py-2.5 pr-8"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <OptionIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-5">
                      {RESOURCE_VISIBILITY_COPY[option].label}
                    </p>

                    <p className="whitespace-normal break-words text-[11px] leading-4 text-muted-foreground">
                      {RESOURCE_VISIBILITY_COPY[option].description}
                    </p>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
