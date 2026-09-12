import type {
  FieldCondition,
  FormField,
  FormSection,
} from "@/features/forms/types/form-types";

export type FormValue = string | string[];

export type FormValues = Record<string, FormValue>;

function normalizeComparable(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function isFormValueEmpty(value: unknown) {
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return String(value ?? "").trim().length === 0;
}

export function evaluateFieldCondition(
  condition: FieldCondition,
  actualValue: FormValue | undefined,
) {
  const expected = normalizeComparable(condition.value);

  if (condition.operator === "is_empty") {
    return isFormValueEmpty(actualValue);
  }

  if (condition.operator === "is_not_empty") {
    return !isFormValueEmpty(actualValue);
  }

  const actualValues = Array.isArray(actualValue)
    ? actualValue.map(normalizeComparable)
    : [normalizeComparable(actualValue)];

  switch (condition.operator) {
    case "equals":
      return actualValues.some((value) => value === expected);

    case "not_equals":
      return actualValues.every((value) => value !== expected);

    case "contains":
      return actualValues.some((value) => value.includes(expected));

    default:
      return false;
  }
}

export function getVisibleFieldIds(
  sections: FormSection[],
  values: FormValues,
) {
  const fields = sections.flatMap((section) => section.fields);

  const fieldMap = new Map(fields.map((field) => [field.id, field]));

  const memo = new Map<string, boolean>();

  const resolveVisibility = (
    fieldId: string,
    visiting: Set<string>,
  ): boolean => {
    const cached = memo.get(fieldId);

    if (cached !== undefined) {
      return cached;
    }

    const field = fieldMap.get(fieldId);

    if (!field) {
      return false;
    }

    const conditions = field.conditions || [];

    if (conditions.length === 0) {
      memo.set(fieldId, true);
      return true;
    }

    // Defensive protection if malformed legacy data
    // contains a circular dependency.
    if (visiting.has(fieldId)) {
      memo.set(fieldId, false);
      return false;
    }

    visiting.add(fieldId);

    const visible = conditions.every((condition) => {
      const sourceField = fieldMap.get(condition.fieldId);

      if (!sourceField) {
        return false;
      }

      // A hidden source field cannot make another
      // dependent field visible.
      if (!resolveVisibility(sourceField.id, visiting)) {
        return false;
      }

      return evaluateFieldCondition(condition, values[sourceField.id]);
    });

    visiting.delete(fieldId);

    memo.set(fieldId, visible);

    return visible;
  };

  const visibleIds = new Set<string>();

  for (const field of fields) {
    if (resolveVisibility(field.id, new Set())) {
      visibleIds.add(field.id);
    }
  }

  return visibleIds;
}

export function validateFieldValue(
  field: FormField,
  value: FormValue | undefined,
): string | null {
  if (field.required && isFormValueEmpty(value)) {
    return "This field is required";
  }

  // Optional empty fields do not need further validation.
  if (isFormValueEmpty(value)) {
    return null;
  }

  if (field.type === "text" || field.type === "textarea") {
    const text = String(value ?? "");

    if (field.minLength !== undefined && text.length < field.minLength) {
      return `Enter at least ${field.minLength} characters`;
    }

    if (field.maxLength !== undefined && text.length > field.maxLength) {
      return `Enter no more than ${field.maxLength} characters`;
    }

    if (field.pattern) {
      try {
        const expression = new RegExp(field.pattern);

        if (!expression.test(text)) {
          return "This value does not match the required format";
        }
      } catch {
        return "This field has an invalid validation pattern";
      }
    }
  }

  if (field.type === "checkbox" && Array.isArray(value)) {
    if (
      field.minSelections !== undefined &&
      value.length < field.minSelections
    ) {
      return `Select at least ${field.minSelections} option${
        field.minSelections === 1 ? "" : "s"
      }`;
    }

    if (
      field.maxSelections !== undefined &&
      value.length > field.maxSelections
    ) {
      return `Select no more than ${field.maxSelections} option${
        field.maxSelections === 1 ? "" : "s"
      }`;
    }
  }

  return null;
}

export function validateFormValues(
  sections: FormSection[],
  values: FormValues,
) {
  const errors: Record<string, string> = {};

  const visibleFieldIds = getVisibleFieldIds(sections, values);

  for (const section of sections) {
    for (const field of section.fields) {
      if (!visibleFieldIds.has(field.id)) {
        continue;
      }

      const error = validateFieldValue(field, values[field.id]);

      if (error) {
        errors[field.id] = error;
      }
    }
  }

  return errors;
}

export function sanitizeVisibleResponses(
  sections: FormSection[],
  values: FormValues,
) {
  const visibleFieldIds = getVisibleFieldIds(sections, values);

  const responses: FormValues = {};

  const labels: Record<string, string> = {};

  for (const section of sections) {
    for (const field of section.fields) {
      if (!visibleFieldIds.has(field.id)) {
        continue;
      }

      labels[field.id] =
        field.label || (section.fields.length === 1 ? section.title : field.id);

      const value = values[field.id];

      if (typeof value === "string" || Array.isArray(value)) {
        responses[field.id] = value;
      }
    }
  }

  return {
    responses,
    labels,
    visibleFieldIds,
  };
}
