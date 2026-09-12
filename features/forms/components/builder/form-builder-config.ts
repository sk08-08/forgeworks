import type {
  ConditionOperator,
  FormFieldType,
} from "@/features/forms/types/form-types";

export const formFieldTypes: Array<{
  value: FormFieldType;
  label: string;
  description: string;
}> = [
  {
    value: "text",
    label: "Short Text",
    description: "Single-line text response.",
  },
  {
    value: "textarea",
    label: "Long Text",
    description: "Multi-line written response.",
  },
  {
    value: "select",
    label: "Dropdown",
    description: "Choose one option from a menu.",
  },
  {
    value: "radio",
    label: "Single Choice",
    description: "Choose one visible option.",
  },
  {
    value: "checkbox",
    label: "Multiple Choice",
    description: "Choose one or more options.",
  },
  {
    value: "rating-type",
    label: "SFW / NSFW Rating",
    description: "Content rating selector.",
  },
  {
    value: "tags",
    label: "Tag Input",
    description: "Enter multiple tags or short values.",
  },
];

export const conditionOperators: Array<{
  value: ConditionOperator;
  label: string;
}> = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "is_not_empty", label: "is not empty" },
  { value: "is_empty", label: "is empty" },
];
