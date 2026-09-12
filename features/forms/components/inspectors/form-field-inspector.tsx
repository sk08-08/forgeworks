"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { FormNumberControl } from "../shared/form-number-control";

import { MarkdownField } from "@/features/markdown/components/markdown-field";

import type {
  ConditionOperator,
  FieldCondition,
  FormField,
  FormFieldType,
} from "@/features/forms/types/form-types";

import type { FormBuilderDraft } from "../builder/form-builder-types";

import { stripMarkdownToText } from "@/features/markdown/lib/markdown";

import {
  conditionOperators,
  formFieldTypes,
} from "../builder/form-builder-config";

interface FormFieldInspectorProps {
  draft: FormBuilderDraft;
  sectionId: string;
  fieldId: string;
  onDraftChange: (draft: FormBuilderDraft) => void;
}

export function FormFieldInspector({
  draft,
  sectionId,
  fieldId,
  onDraftChange,
}: FormFieldInspectorProps) {
  const [optionInput, setOptionInput] = useState("");

  const section = draft.sections.find((item) => item.id === sectionId);

  const field = section?.fields.find((item) => item.id === fieldId);

  if (!section || !field) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 p-4">
        <p className="text-xs text-muted-foreground">
          This field no longer exists.
        </p>
      </div>
    );
  }

  const updateField = (nextField: FormField) => {
    onDraftChange({
      ...draft,
      sections: draft.sections.map((item) =>
        item.id !== section.id
          ? item
          : {
              ...item,
              fields: item.fields.map((candidate) =>
                candidate.id === field.id ? nextField : candidate,
              ),
            },
      ),
    });
  };

  const needsOptions = ["select", "radio", "checkbox"].includes(field.type);

  const supportsPlaceholder = ["text", "textarea", "tags"].includes(field.type);

  const supportsOther =
    field.type === "radio" ||
    field.type === "select" ||
    field.type === "checkbox";

  const supportsTextValidation =
    field.type === "text" || field.type === "textarea";

  const supportsSelectionValidation = field.type === "checkbox";

  const conditionSources = draft.sections.flatMap((sourceSection) =>
    sourceSection.fields
      .filter((sourceField) => sourceField.id !== field.id)
      .map((sourceField) => ({
        section: sourceSection,
        field: sourceField,
      })),
  );

  const updateConditions = (conditions: FieldCondition[]) => {
    updateField({
      ...field,
      conditions: conditions.length > 0 ? conditions : undefined,
    });
  };

  const addCondition = () => {
    const source = conditionSources[0]?.field;

    if (!source) return;

    updateConditions([
      ...(field.conditions || []),
      {
        fieldId: source.id,
        operator: "is_not_empty",
      },
    ]);
  };

  const updateCondition = (index: number, patch: Partial<FieldCondition>) => {
    const next = [...(field.conditions || [])];

    const current = next[index];

    if (!current) return;

    const updated = {
      ...current,
      ...patch,
    };

    if (
      updated.operator === "is_empty" ||
      updated.operator === "is_not_empty"
    ) {
      delete updated.value;
    }

    next[index] = updated;

    updateConditions(next);
  };

  const removeCondition = (index: number) => {
    updateConditions(
      (field.conditions || []).filter(
        (_, conditionIndex) => conditionIndex !== index,
      ),
    );
  };

  const handleTypeChange = (nextType: FormFieldType) => {
    const nextNeedsOptions = ["select", "radio", "checkbox"].includes(nextType);

    const nextSupportsOther =
      nextType === "select" || nextType === "radio" || nextType === "checkbox";

    const nextSupportsTextValidation =
      nextType === "text" || nextType === "textarea";

    const nextSupportsSelectionValidation = nextType === "checkbox";

    updateField({
      ...field,
      type: nextType,

      options: nextNeedsOptions ? field.options || [] : undefined,

      allowOther: nextSupportsOther ? field.allowOther : undefined,

      placeholder: ["text", "textarea", "tags"].includes(nextType)
        ? field.placeholder
        : undefined,

      minLength: nextSupportsTextValidation ? field.minLength : undefined,

      maxLength: nextSupportsTextValidation ? field.maxLength : undefined,

      pattern: nextSupportsTextValidation ? field.pattern : undefined,

      minSelections: nextSupportsSelectionValidation
        ? field.minSelections
        : undefined,

      maxSelections: nextSupportsSelectionValidation
        ? field.maxSelections
        : undefined,
    });
  };

  const addOption = () => {
    const value = optionInput.trim();

    if (!value) return;

    updateField({
      ...field,
      options: [...(field.options || []), value],
    });

    setOptionInput("");
  };

  const updateOption = (index: number, value: string) => {
    const options = [...(field.options || [])];

    options[index] = value;

    updateField({
      ...field,
      options,
    });
  };

  const removeOption = (index: number) => {
    updateField({
      ...field,
      options: (field.options || []).filter(
        (_, optionIndex) => optionIndex !== index,
      ),
    });
  };

  const moveOption = (index: number, direction: -1 | 1) => {
    const options = [...(field.options || [])];

    const target = index + direction;

    if (target < 0 || target >= options.length) {
      return;
    }

    [options[index], options[target]] = [options[target], options[index]];

    updateField({
      ...field,
      options,
    });
  };

  const selectableOptionCount =
    (field.options?.length || 0) +
    (field.type === "checkbox" && field.allowOther ? 1 : 0);

  const selectionValidationMax =
    selectableOptionCount > 0 ? Math.min(selectableOptionCount, 30) : 30;

  return (
    <div className="space-y-6">
      {/* Type */}
      <InspectorSection
        title="Field type"
        description="Choose how visitors will answer this field."
      >
        <Select
          value={field.type}
          onValueChange={(value) => handleTypeChange(value as FormFieldType)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {formFieldTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {
            formFieldTypes.find((item) => item.value === field.type)
              ?.description
          }
        </p>
      </InspectorSection>

      {/* Content */}
      <InspectorSection
        title="Content"
        description="Text visitors see for this field."
      >
        <div className="space-y-2">
          <Label className="text-xs">
            Field label <span className="text-destructive">*</span>
          </Label>

          <MarkdownField
            id={`builder-field-label-${field.id}`}
            value={field.label || ""}
            onChange={(label) =>
              updateField({
                ...field,
                label,
              })
            }
            placeholder="Enter field label..."
            minEditorHeightRem={4}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Description</Label>

          <MarkdownField
            id={`builder-field-description-${field.id}`}
            value={field.description || ""}
            onChange={(description) =>
              updateField({
                ...field,
                description,
              })
            }
            placeholder="Optional help text..."
            minEditorHeightRem={6}
          />
        </div>

        {supportsPlaceholder && (
          <div className="space-y-1.5">
            <Label className="text-xs">Placeholder</Label>

            <Input
              value={field.placeholder || ""}
              onChange={(event) =>
                updateField({
                  ...field,
                  placeholder: event.target.value,
                })
              }
              placeholder="Placeholder text..."
            />
          </div>
        )}
      </InspectorSection>

      {/* Presentation */}
      <InspectorSection
        title="Presentation"
        description="Control how the field text is displayed."
      >
        <div className="space-y-1.5">
          <Label className="text-xs">Text alignment</Label>

          <Select
            value={field.textAlignment || "left"}
            onValueChange={(value) =>
              updateField({
                ...field,
                textAlignment: value as "left" | "center" | "right",
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="left">Left</SelectItem>

              <SelectItem value="center">Center</SelectItem>

              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>

          <p className="text-[10px] text-muted-foreground">
            Applies to the field label and description.
          </p>
        </div>

        <SettingRow
          title="Required"
          description="Visitors must answer this field before submitting."
        >
          <Switch
            checked={field.required}
            onCheckedChange={(required) =>
              updateField({
                ...field,
                required,
              })
            }
          />
        </SettingRow>
      </InspectorSection>

      {/* Options */}
      {needsOptions && (
        <InspectorSection
          title="Options"
          description="Choices available to visitors."
        >
          <div className="flex gap-2">
            <Input
              value={optionInput}
              onChange={(event) => setOptionInput(event.target.value)}
              placeholder="Add an option..."
              className="min-w-0 flex-1"
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }

                event.preventDefault();
                addOption();
              }}
            />

            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="shrink-0 cursor-pointer"
              disabled={!optionInput.trim()}
              onClick={addOption}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {(field.options || []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 px-3 py-5 text-center">
              <p className="text-[10px] text-muted-foreground">
                Add at least one option.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {(field.options || []).map((option, index) => (
                <div
                  key={`${field.id}-${index}`}
                  className="rounded-xl border border-border/60 bg-muted/[0.08] p-2"
                >
                  <Input
                    value={option}
                    onChange={(event) =>
                      updateOption(index, event.target.value)
                    }
                  />

                  <div className="mt-2 flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      disabled={index === 0}
                      onClick={() => moveOption(index, -1)}
                      title="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      disabled={index === (field.options?.length || 0) - 1}
                      onClick={() => moveOption(index, 1)}
                      title="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive"
                      onClick={() => removeOption(index)}
                      title="Remove option"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {supportsOther && (
            <SettingRow
              title='Allow "Other"'
              description="Let visitors provide a custom answer."
            >
              <Switch
                checked={field.allowOther === true}
                onCheckedChange={(allowOther) =>
                  updateField({
                    ...field,
                    allowOther,
                  })
                }
              />
            </SettingRow>
          )}
        </InspectorSection>
      )}

      {/* Validation */}
      {(supportsTextValidation || supportsSelectionValidation) && (
        <InspectorSection
          title="Validation"
          description="Add additional requirements beyond the Required setting."
        >
          {supportsTextValidation && (
            <div className="space-y-4">
              <div className="space-y-4">
                <FormNumberControl
                  label="Minimum length"
                  value={field.minLength}
                  min={0}
                  max={100000}
                  step={1}
                  suffix="chars"
                  presets={[10, 25, 50]}
                  onChange={(minLength) =>
                    updateField({
                      ...field,
                      minLength,
                    })
                  }
                />

                <FormNumberControl
                  label="Maximum length"
                  value={field.maxLength}
                  min={1}
                  max={100000}
                  step={1}
                  suffix="chars"
                  presets={[100, 250, 500]}
                  onChange={(maxLength) =>
                    updateField({
                      ...field,
                      maxLength,
                    })
                  }
                />
              </div>

              {field.minLength !== undefined &&
                field.maxLength !== undefined &&
                field.minLength > field.maxLength && (
                  <p className="text-[10px] text-destructive">
                    Minimum length cannot be greater than maximum length.
                  </p>
                )}

              <div className="space-y-1.5">
                <Label className="text-xs">Pattern</Label>

                <Input
                  value={field.pattern || ""}
                  onChange={(event) =>
                    updateField({
                      ...field,
                      pattern: event.target.value || undefined,
                    })
                  }
                  placeholder="e.g. ^[A-Za-z ]+$"
                />

                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Optional regular expression. Enter the pattern without /
                  delimiters.
                </p>
              </div>
            </div>
          )}

          {supportsSelectionValidation && (
            <div className="space-y-3">
              <div className="space-y-4">
                <FormNumberControl
                  label="Minimum selections"
                  value={field.minSelections}
                  min={0}
                  max={selectionValidationMax}
                  step={1}
                  presets={[1, 2, 3]}
                  onChange={(minSelections) =>
                    updateField({
                      ...field,
                      minSelections,
                    })
                  }
                />

                <FormNumberControl
                  label="Maximum selections"
                  value={field.maxSelections}
                  min={1}
                  max={selectionValidationMax}
                  step={1}
                  presets={[1, 2, 3]}
                  onChange={(maxSelections) =>
                    updateField({
                      ...field,
                      maxSelections,
                    })
                  }
                />
              </div>

              {field.minSelections !== undefined &&
                field.maxSelections !== undefined &&
                field.minSelections > field.maxSelections && (
                  <p className="text-[10px] text-destructive">
                    Minimum selections cannot be greater than maximum
                    selections.
                  </p>
                )}
            </div>
          )}
        </InspectorSection>
      )}

      {/* Conditional Logic */}
      <InspectorSection
        title="Conditional logic"
        description="Show this field only when all configured rules are true."
      >
        {conditionSources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-3">
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Add another field to the form before creating conditional rules.
            </p>
          </div>
        ) : (
          <>
            {(field.conditions || []).length > 0 && (
              <div className="space-y-3">
                {(field.conditions || []).map((condition, index) => {
                  const needsValue =
                    condition.operator !== "is_empty" &&
                    condition.operator !== "is_not_empty";

                  return (
                    <div
                      key={`${field.id}-condition-${index}`}
                      className="space-y-2 rounded-xl border border-border/60 bg-muted/[0.08] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {index === 0 ? "Show when" : "And"}
                        </p>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive"
                          onClick={() => removeCondition(index)}
                          title="Remove rule"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <Select
                        value={condition.fieldId}
                        onValueChange={(value) =>
                          updateCondition(index, {
                            fieldId: value,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose field" />
                        </SelectTrigger>

                        <SelectContent>
                          {conditionSources.map(
                            ({
                              section: sourceSection,
                              field: sourceField,
                            }) => {
                              const sectionLabel =
                                stripMarkdownToText(
                                  sourceSection.title || "",
                                ).trim() || "Untitled section";

                              const fieldLabel =
                                stripMarkdownToText(
                                  sourceField.label || "",
                                ).trim() || "Untitled field";

                              return (
                                <SelectItem
                                  key={sourceField.id}
                                  value={sourceField.id}
                                >
                                  {sectionLabel} · {fieldLabel}
                                </SelectItem>
                              );
                            },
                          )}
                        </SelectContent>
                      </Select>

                      <Select
                        value={condition.operator}
                        onValueChange={(value) =>
                          updateCondition(index, {
                            operator: value as ConditionOperator,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          {conditionOperators.map((operator) => (
                            <SelectItem
                              key={operator.value}
                              value={operator.value}
                            >
                              {operator.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {needsValue && (
                        <Input
                          value={condition.value || ""}
                          onChange={(event) =>
                            updateCondition(index, {
                              value: event.target.value,
                            })
                          }
                          placeholder="Value"
                        />
                      )}

                      {needsValue && !String(condition.value || "").trim() && (
                        <p className="text-[10px] text-destructive">
                          This rule needs a comparison value.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full cursor-pointer"
              disabled={(field.conditions?.length || 0) >= 20}
              onClick={addCondition}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add rule
            </Button>

            {(field.conditions?.length || 0) > 1 && (
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                All rules must be true for this field to appear.
              </p>
            )}
          </>
        )}
      </InspectorSection>
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

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-medium">{title}</p>

        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="shrink-0">{children}</div>
    </div>
  );
}
