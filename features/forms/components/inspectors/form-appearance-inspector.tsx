"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomColorPicker } from "@/components/ui/custom-color-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import {
  defaultFormAppearance,
  formAppearanceAccents,
  formAppearanceDensityOptions,
  formAppearanceHeaderIcons,
  formAppearancePresets,
  getFormAppearanceClasses,
  resolveFormAppearance,
} from "@/features/forms/lib/form-appearance";

import type {
  FormAccent,
  FormAppearance,
  FormDensity,
  FormHeaderIcon,
} from "@/features/forms/types/form-types";

import type { FormBuilderDraft } from "../../components/builder/form-builder-types";

interface FormAppearanceInspectorProps {
  draft: FormBuilderDraft;
  onDraftChange: (draft: FormBuilderDraft) => void;
}

export function FormAppearanceInspector({
  draft,
  onDraftChange,
}: FormAppearanceInspectorProps) {
  const appearance = resolveFormAppearance(
    draft.appearance || defaultFormAppearance,
  );

  const appearanceClasses = getFormAppearanceClasses(appearance);

  const updateAppearance = (patch: Partial<FormAppearance>) => {
    onDraftChange({
      ...draft,
      appearance: resolveFormAppearance({
        ...appearance,
        ...patch,
      }),
    });
  };

  const selectedPreset = formAppearancePresets.find(
    (item) => item.value === appearance.preset,
  );

  const selectedDensity = formAppearanceDensityOptions.find(
    (item) => item.value === appearance.density,
  );

  const handleReset = () => {
    onDraftChange({
      ...draft,
      appearance: resolveFormAppearance(defaultFormAppearance),
    });
  };

  return (
    <div className="space-y-6">
      {/* Preset */}
      <InspectorSection
        title="Style preset"
        description={
          selectedPreset?.description ||
          "Choose the overall visual style of the form."
        }
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2 pt-2">
          {formAppearancePresets.map((preset) => {
            const active = appearance.preset === preset.value;

            return (
              <button
                key={preset.value}
                type="button"
                onClick={() =>
                  updateAppearance({
                    preset: preset.value,
                  })
                }
                className={[
                  "cursor-pointer rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-primary/50 bg-primary/[0.08]"
                    : "border-border/60 bg-background hover:bg-muted/40",
                ].join(" ")}
              >
                <p className="text-xs font-medium">{preset.label}</p>

                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </InspectorSection>

      {/* Accent */}
      <InspectorSection
        title="Accent"
        description="Used for highlights, focus states, borders and the submit button."
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(3.75rem,1fr))] gap-2 pt-2">
          {formAppearanceAccents.map((accent) => {
            const resolved = getFormAppearanceClasses({
              ...appearance,
              accent: accent.value,
            });

            const active = appearance.accent === accent.value;

            return (
              <button
                key={accent.value}
                type="button"
                title={accent.label}
                aria-label={`Use ${accent.label} accent`}
                aria-pressed={active}
                onClick={() =>
                  updateAppearance({
                    accent: accent.value,
                  })
                }
                className={[
                  "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors",
                  active
                    ? "border-primary/50 bg-primary/[0.08]"
                    : "border-border/60 hover:bg-muted/40",
                ].join(" ")}
              >
                <span
                  className="h-6 w-6 rounded-full border border-black/10 shadow-sm"
                  style={{
                    backgroundColor: resolved.accent.hex,
                  }}
                />

                <span className="max-w-full truncate text-[9px] text-muted-foreground">
                  {accent.label}
                </span>
              </button>
            );
          })}
        </div>
      </InspectorSection>

      {/* Density */}
      <InspectorSection
        title="Density"
        description={
          selectedDensity?.description ||
          "Control spacing between fields and sections."
        }
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2">
          {formAppearanceDensityOptions.map((density) => {
            const active = appearance.density === density.value;

            return (
              <button
                key={density.value}
                type="button"
                onClick={() =>
                  updateAppearance({
                    density: density.value as FormDensity,
                  })
                }
                className={[
                  "cursor-pointer rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-primary/50 bg-primary/[0.08]"
                    : "border-border/60 bg-background hover:bg-muted/40",
                ].join(" ")}
              >
                <p className="text-xs font-medium">{density.label}</p>

                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  {density.description}
                </p>
              </button>
            );
          })}
        </div>
      </InspectorSection>

      {/* Text colors */}
      <InspectorSection
        title="Text colors"
        description="Optional color overrides. Markdown colors still take priority on individually styled text."
      >
        <div className="space-y-4">
          <CustomColorPicker
            label="Title color"
            value={appearance.titleColor || appearanceClasses.accent.hex}
            onChange={(value) =>
              updateAppearance({
                titleColor: value,
              })
            }
          />

          <CustomColorPicker
            label="Description color"
            value={
              appearance.descriptionColor || "hsl(var(--muted-foreground))"
            }
            onChange={(value) =>
              updateAppearance({
                descriptionColor: value,
              })
            }
          />
        </div>
      </InspectorSection>

      {/* Header icon */}
      <InspectorSection
        title="Header icon"
        description="Configure the icon displayed above the form title."
      >
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5">
          <div className="min-w-0">
            <Label
              htmlFor="builder-hide-header-icon"
              className="cursor-pointer text-xs font-medium"
            >
              Hide icon
            </Label>

            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Remove the header icon from the public form.
            </p>
          </div>

          <Switch
            id="builder-hide-header-icon"
            checked={appearance.hideHeaderIcon === true}
            onCheckedChange={(checked) =>
              updateAppearance({
                hideHeaderIcon: checked,
              })
            }
          />
        </div>

        {!appearance.hideHeaderIcon && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Icon</Label>

              <Select
                value={appearance.headerIcon || "sparkles"}
                onValueChange={(value) =>
                  updateAppearance({
                    headerIcon: value as FormHeaderIcon,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose icon" />
                </SelectTrigger>

                <SelectContent>
                  {formAppearanceHeaderIcons.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      {icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <CustomColorPicker
              label="Icon color"
              value={appearance.headerIconColor || appearanceClasses.accent.hex}
              onChange={(value) =>
                updateAppearance({
                  headerIconColor: value,
                })
              }
            />
          </div>
        )}
      </InspectorSection>

      {/* Reset */}
      <div className="border-t border-border/60 pt-4">
        <Button
          type="button"
          variant="outline"
          className="w-full cursor-pointer"
          onClick={handleReset}
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Reset appearance
        </Button>

        <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
          Restores the default Clean / Indigo / Comfortable style.
        </p>
      </div>
    </div>
  );
}

function InspectorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-semibold">{title}</p>

        {description && (
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}
