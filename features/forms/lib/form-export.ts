// ============================================================================
// Forgeworks - Form Data Export Utilities
// CSV and JSON export for form submissions
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportFormFieldSchema {
  id: string;
  label: string;
}

export interface ExportFormSchema {
  formId: string;
  fields: ExportFormFieldSchema[];
}

export type ExportFormSchemaMap = Record<string, ExportFormSchema>;

export interface JsonResponseEntry {
  fieldId: string;
  label: string;
  value: unknown;
}

export interface JsonSubmissionExport {
  requestId?: string;
  formId?: string;
  formTitle?: string;
  submittedAt?: string;
  status?: string;
  submitterName?: string;
  responses: JsonResponseEntry[];
}

interface ExportRow {
  [key: string]: string | number | boolean | string[];
}

const METADATA_COLUMN_ORDER = [
  "Request ID",
  "Form Title",
  "Submission Date",
  "Status",
  "Submitter Name",
] as const;

function formatExportValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value))
    return value.map((item) => String(item)).join(" | ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function looksLikeFieldId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

const STATUS_EXPORT_LABELS: Record<string, string> = {
  new: "New",
  accepted: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
};

function protectSpreadsheetFormula(value: string): string {
  const trimmedStart = value.trimStart();

  if (/^[=+\-@]/.test(trimmedStart)) {
    return `'${value}`;
  }

  return value;
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  const raw = String(value);
  const safe = protectSpreadsheetFormula(raw);

  if (
    safe.includes(",") ||
    safe.includes("\n") ||
    safe.includes("\r") ||
    safe.includes('"')
  ) {
    return `"${safe.replace(/"/g, '""')}"`;
  }

  return safe;
}

export function serializeExportRowsToCsv(
  data: ExportRow[],
  options?: { includeBom?: boolean },
): string {
  if (data.length === 0) return "";

  const columnNames = getExportColumnOrder(data);

  // Build CSV content
  const header = columnNames.map((col) => escapeCsvValue(col)).join(",");
  const rows = data.map((row) =>
    columnNames.map((col) => escapeCsvValue(row[col])).join(","),
  );
  const csv = [header, ...rows].join("\n");

  if (options?.includeBom === false) {
    return csv;
  }

  return `\uFEFF${csv}`;
}

export function serializeExportDataToJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function getExportColumnOrder(data: ExportRow[]): string[] {
  if (data.length === 0) return [];

  const allColumns = new Set<string>();

  // Set preserves insertion order.
  for (const row of data) {
    for (const key of Object.keys(row)) {
      allColumns.add(key);
    }
  }

  const orderedMetadata = METADATA_COLUMN_ORDER.filter((column) =>
    allColumns.has(column),
  );

  const responseColumns = Array.from(allColumns).filter(
    (column) =>
      !METADATA_COLUMN_ORDER.includes(
        column as (typeof METADATA_COLUMN_ORDER)[number],
      ),
  );

  return [...orderedMetadata, ...responseColumns];
}

export function exportToCsv(data: ExportRow[], filename: string): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const csvWithBom = serializeExportRowsToCsv(data, { includeBom: true });

  // Download
  downloadFile(csvWithBom, filename, "text/csv;charset=utf-8;");
}

// ---------------------------------------------------------------------------
// JSON Export
// ---------------------------------------------------------------------------

export function exportToJson(data: unknown, filename: string): void {
  const json = serializeExportDataToJson(data);
  downloadFile(json, filename, "application/json;charset=utf-8;");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Form submissions transformation
// ---------------------------------------------------------------------------

export function transformSubmissionsForExport(
  submissions: Array<{
    id?: string;
    form_id?: string;
    form_title?: string;
    created_at?: string;
    status?: string;
    submitter_name?: string;
    responses?: Record<string, unknown>;
    response_labels?: Record<string, string>;
  }>,
  options?: {
    includeMetadata?: boolean;
    formSchemas?: ExportFormSchemaMap;
  },
): ExportRow[] {
  type FieldMeta = {
    formId: string;
    fieldId: string;
  };

  const createFieldKey = (formId: string | undefined, fieldId: string) =>
    `${formId || "__unknown_form__"}::${fieldId}`;

  const currentLabelByFieldKey = new Map<string, string>();

  const preferredLabels = new Map<string, string>();

  const fieldMetaByKey = new Map<string, FieldMeta>();

  const schemaFieldOrder: string[] = [];
  const fieldKeys = new Set<string>();

  const fallbackLabelByFieldKey = new Map<string, string>();

  // -------------------------------------------------------------------------
  // Current form schemas
  // -------------------------------------------------------------------------

  for (const schema of Object.values(options?.formSchemas || {})) {
    for (const field of schema.fields) {
      const fieldKey = createFieldKey(schema.formId, field.id);

      if (!schemaFieldOrder.includes(fieldKey)) {
        schemaFieldOrder.push(fieldKey);
      }

      fieldMetaByKey.set(fieldKey, {
        formId: schema.formId,
        fieldId: field.id,
      });

      const label = String(field.label || "").trim();

      if (label) {
        currentLabelByFieldKey.set(fieldKey, label);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Discover fields present in actual submissions
  // -------------------------------------------------------------------------

  for (const submission of submissions) {
    const responses = submission.responses || {};

    const labels = submission.response_labels || {};

    for (const fieldId of Object.keys(responses)) {
      const fieldKey = createFieldKey(submission.form_id, fieldId);

      fieldKeys.add(fieldKey);

      if (!fieldMetaByKey.has(fieldKey)) {
        fieldMetaByKey.set(fieldKey, {
          formId: submission.form_id || "__unknown_form__",

          fieldId,
        });
      }

      // Current form label takes precedence.
      const currentLabel = currentLabelByFieldKey.get(fieldKey);

      if (currentLabel) {
        preferredLabels.set(fieldKey, currentLabel);

        continue;
      }

      // Historical label is fallback.
      if (!preferredLabels.has(fieldKey)) {
        const historicalLabel = String(labels[fieldId] || "").trim();

        if (historicalLabel && !looksLikeFieldId(historicalLabel)) {
          preferredLabels.set(fieldKey, historicalLabel);
        }
      }
    }
  }

  let untitledFieldCounter = 1;

  for (const fieldKey of fieldKeys) {
    if (
      !preferredLabels.get(fieldKey) &&
      !currentLabelByFieldKey.get(fieldKey)
    ) {
      fallbackLabelByFieldKey.set(
        fieldKey,
        `Untitled field ${untitledFieldCounter}`,
      );

      untitledFieldCounter += 1;
    }
  }

  // -------------------------------------------------------------------------
  // Detect duplicate human-readable labels
  // -------------------------------------------------------------------------

  const labelUsage = new Map<string, string[]>();

  for (const fieldKey of fieldKeys) {
    const meta = fieldMetaByKey.get(fieldKey);

    if (!meta) continue;

    const label =
      preferredLabels.get(fieldKey) ||
      fallbackLabelByFieldKey.get(fieldKey) ||
      "Untitled field";

    const existing = labelUsage.get(label) || [];

    existing.push(fieldKey);
    labelUsage.set(label, existing);
  }

  // -------------------------------------------------------------------------
  // Assign a stable, unique CSV column name
  // -------------------------------------------------------------------------

  const columnNameByFieldKey = new Map<string, string>();
  const usedColumnNames = new Set<string>();

  for (const fieldKey of fieldKeys) {
    const meta = fieldMetaByKey.get(fieldKey);

    if (!meta) continue;

    const label =
      preferredLabels.get(fieldKey) ||
      fallbackLabelByFieldKey.get(fieldKey) ||
      "Untitled field";

    const hasDuplicateLabel = (labelUsage.get(label)?.length || 0) > 1;

    const conflictsMetadata = METADATA_COLUMN_ORDER.includes(
      label as (typeof METADATA_COLUMN_ORDER)[number],
    );

    let columnName =
      hasDuplicateLabel || conflictsMetadata
        ? `${label} [${meta.fieldId.slice(0, 8)}]`
        : label;

    if (usedColumnNames.has(columnName)) {
      columnName = `${label} [${meta.formId.slice(0, 8)}:${meta.fieldId}]`;
    }

    usedColumnNames.add(columnName);
    columnNameByFieldKey.set(fieldKey, columnName);
  }

  // -------------------------------------------------------------------------
  // Current fields first, historical fields afterward
  // -------------------------------------------------------------------------

  const orderedFieldKeys = [
    ...schemaFieldOrder.filter((fieldKey) => fieldKeys.has(fieldKey)),

    ...Array.from(fieldKeys)
      .filter((fieldKey) => !schemaFieldOrder.includes(fieldKey))
      .sort((a, b) => {
        const colA = columnNameByFieldKey.get(a) || a;

        const colB = columnNameByFieldKey.get(b) || b;

        return colA.localeCompare(colB);
      }),
  ];

  // -------------------------------------------------------------------------
  // Build rows
  // -------------------------------------------------------------------------

  return submissions.map((submission) => {
    const responses = submission.responses || {};

    const flattened: ExportRow = {};

    if (options?.includeMetadata !== false) {
      flattened["Request ID"] = submission.id || "";

      flattened["Form Title"] = submission.form_title || "";

      flattened["Submission Date"] = submission.created_at
        ? new Date(submission.created_at).toISOString()
        : "";

      const rawStatus = submission.status || "new";

      flattened["Status"] = STATUS_EXPORT_LABELS[rawStatus] || rawStatus;

      flattened["Submitter Name"] = submission.submitter_name || "Anonymous";
    }

    for (const fieldKey of orderedFieldKeys) {
      const meta = fieldMetaByKey.get(fieldKey);

      if (!meta) continue;

      const colName = columnNameByFieldKey.get(fieldKey) || meta.fieldId;

      const belongsToSubmission =
        meta.formId === (submission.form_id || "__unknown_form__");

      const hasResponse =
        belongsToSubmission &&
        Object.prototype.hasOwnProperty.call(responses, meta.fieldId);

      flattened[colName] = hasResponse
        ? formatExportValue(responses[meta.fieldId])
        : "";
    }

    return flattened;
  });
}

export function transformSubmissionsForJson(
  submissions: Array<{
    id?: string;
    form_id?: string;
    form_title?: string;
    created_at?: string;
    status?: string;
    submitter_name?: string;
    responses?: Record<string, unknown>;
    response_labels?: Record<string, string>;
  }>,
  options?: {
    includeMetadata?: boolean;
    formSchemas?: ExportFormSchemaMap;
  },
): JsonSubmissionExport[] {
  return submissions.map((submission) => {
    const responses = submission.responses || {};
    const historicalLabels = submission.response_labels || {};

    const schema = submission.form_id
      ? options?.formSchemas?.[submission.form_id]
      : undefined;

    const schemaLabelByFieldId = new Map(
      (schema?.fields || []).map((field) => [field.id, field.label]),
    );

    const schemaOrder = schema?.fields.map((field) => field.id) || [];

    const historicalFieldIds = Object.keys(responses).filter(
      (fieldId) => !schemaOrder.includes(fieldId),
    );

    const orderedFieldIds = [
      ...schemaOrder.filter((fieldId) =>
        Object.prototype.hasOwnProperty.call(responses, fieldId),
      ),

      ...historicalFieldIds,
    ];

    const responseEntries = orderedFieldIds.map((fieldId, index) => {
      const currentLabel = schemaLabelByFieldId.get(fieldId)?.trim();

      const historicalLabel = String(historicalLabels[fieldId] || "").trim();

      const safeHistoricalLabel =
        historicalLabel && !looksLikeFieldId(historicalLabel)
          ? historicalLabel
          : "";

      return {
        fieldId,

        label:
          currentLabel || safeHistoricalLabel || `Untitled field ${index + 1}`,

        value: responses[fieldId],
      };
    });

    const base: JsonSubmissionExport = {
      responses: responseEntries,
    };

    if (options?.includeMetadata !== false) {
      base.requestId = submission.id || "";
      base.formId = submission.form_id || "";
      base.formTitle = submission.form_title || "";

      base.submittedAt = submission.created_at
        ? new Date(submission.created_at).toISOString()
        : "";

      base.status = submission.status || "new";

      base.submitterName = submission.submitter_name || "Anonymous";
    }

    return base;
  });
}
