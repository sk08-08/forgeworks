"use client";

import { stripMarkdownToText } from "@/features/markdown/lib/markdown";
import { FormGeneralInspector } from "../inspectors/form-general-inspector";

import type {
  FormBuilderDraft,
  FormBuilderSelection,
} from "./form-builder-types";

import { FormAppearanceInspector } from "../inspectors/form-appearance-inspector";

import { FormSectionInspector } from "../inspectors/form-section-inspector";

import { FormFieldInspector } from "../inspectors/form-field-inspector";

import { FormAvailabilityInspector } from "../inspectors/form-availability-inspector";

interface FormBuilderInspectorProps {
  draft: FormBuilderDraft;
  selection: FormBuilderSelection;
  onDraftChange: (draft: FormBuilderDraft) => void;
}

export function FormBuilderInspector({
  draft,
  selection,
  onDraftChange,
}: FormBuilderInspectorProps) {
  if (selection.type === "form") {
    return (
      <InspectorShell
        title="General"
        description="Basic information and media shown at the top of the public form."
      >
        <FormGeneralInspector draft={draft} onDraftChange={onDraftChange} />
      </InspectorShell>
    );
  }

  if (selection.type === "appearance") {
    return (
      <InspectorShell
        title="Appearance"
        description="Customize the look and feel of the public form."
      >
        <FormAppearanceInspector draft={draft} onDraftChange={onDraftChange} />
      </InspectorShell>
    );
  }

  if (selection.type === "availability") {
    return (
      <InspectorShell
        title="Availability"
        description="Control when the form accepts submissions and customize what visitors see while it is unavailable."
      >
        <FormAvailabilityInspector
          draft={draft}
          onDraftChange={onDraftChange}
        />
      </InspectorShell>
    );
  }

  if (selection.type === "section") {
    return (
      <InspectorShell
        title="Section"
        description="Edit the content, layout and media for this section."
      >
        <FormSectionInspector
          draft={draft}
          sectionId={selection.sectionId}
          onDraftChange={onDraftChange}
        />
      </InspectorShell>
    );
  }

  const section = draft.sections.find(
    (item) => item.id === selection.sectionId,
  );

  const field = section?.fields.find((item) => item.id === selection.fieldId);

  return (
    <InspectorShell
      title={
        field
          ? stripMarkdownToText(field.label || "").trim() || "Untitled field"
          : "Field"
      }
      description={field ? `Field · ${field.type}` : "Field settings"}
    >
      <FormFieldInspector
        draft={draft}
        sectionId={selection.sectionId}
        fieldId={selection.fieldId}
        onDraftChange={onDraftChange}
      />
    </InspectorShell>
  );
}

function InspectorShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="min-w-0 bg-background xl:border-l xl:border-border/70">
      <div className="p-4 sm:p-5 xl:sticky xl:top-[69px] xl:max-h-[calc(100dvh-69px)] xl:overflow-y-auto 2xl:p-5">
        <div className="mb-5">
          <p className="truncate text-sm font-semibold">{title}</p>

          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        {children}
      </div>
    </aside>
  );
}
