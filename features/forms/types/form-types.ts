// ----------------------------------------------------------------------------
// Request Form Types
// ----------------------------------------------------------------------------

import type { ResourceVisibility } from "@/lib/resource-visibility";

export type FormFieldType =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "rating-type"
  | "tags";

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  textAlignment?: "left" | "center" | "right";
  placeholder?: string;
  required: boolean;
  options?: string[];
  allowOther?: boolean;
  description?: string;
  conditions?: FieldCondition[];
  minLength?: number;
  maxLength?: number;
  minSelections?: number;
  maxSelections?: number;
  pattern?: string;
}

export type FormPreset = "clean" | "bold" | "editorial" | "minimal";
export type FormAccent =
  | "indigo"
  | "emerald"
  | "amber"
  | "rose"
  | "slate"
  | "teal"
  | "sky"
  | "violet";
export type FormDensity = "comfortable" | "compact";
export type FormHeaderIcon =
  | "sparkles"
  | "star"
  | "wand"
  | "heart"
  | "flame"
  | "gem";

export interface FormAppearance {
  preset: FormPreset;
  accent: FormAccent;
  density: FormDensity;
  titleColor?: string;
  descriptionColor?: string;
  headerIcon?: FormHeaderIcon;
  hideHeaderIcon?: boolean;
  headerIconColor?: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];

  custom?: {
    headerAlignment?: "left" | "center" | "right";

    collapsible?: boolean;
    defaultExpanded?: boolean;

    imageAssetPath?: string;
    imageUrl?: string;
    gifUrl?: string;
  };
}

export interface RequestForm {
  id: string;
  ownerId?: string;
  title: string;
  description: string;
  bannerAssetPath?: string;
  bannerUrl?: string;
  sections: FormSection[];
  appearance?: FormAppearance;
  shareableLink: string;
  isActive: boolean;
  visibility: ResourceVisibility;
  deactivatedMessage?: string;
  deactivatedRedirectUrl?: string;
  deactivatedRedirectLabel?: string;
  deactivatedAccentColor?: string;
  securitySensitivity?: "low" | "medium" | "high" | "strict";
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------------
// Request (Kanban) Types
// ----------------------------------------------------------------------------

export type RequestStatus = "new" | "accepted" | "completed" | "rejected";

// Conditional field support
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "is_not_empty"
  | "is_empty";

export interface FieldCondition {
  fieldId: string;
  operator: ConditionOperator;
  value?: string;
}

// Form template types
export interface FormTemplate {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  icon?: string;
  is_builtin: boolean;
  owner_id?: string | null;
  sections: FormSection[];
  appearance?: FormAppearance | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface Request {
  id: string;
  formId: string;
  ownerId?: string;
  formTitle: string;
  status: RequestStatus;
  submitterName?: string;
  responses: Record<string, string | string[]>;
  responseLabels?: Record<string, string>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
