export type ChangelogReleaseType =
  | "major"
  | "minor"
  | "patch"
  | "development"
  | "archive";

export type ChangelogStatus = "draft" | "published";

export interface ChangelogEntry {
  id: string;
  slug: string;
  version: string | null;
  releaseNumber: number | null;
  title: string;
  headline: string;
  summary: string;
  bodyMarkdown: string;
  technicalMarkdown: string;
  releaseType: ChangelogReleaseType;
  status: ChangelogStatus;
  areas: string[];
  changeTypes: string[];
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChangelogEntryInput {
  id?: string | null;
  slug: string;
  version?: string | null;
  releaseNumber?: number | null;
  title: string;
  headline?: string;
  summary?: string;
  bodyMarkdown?: string;
  technicalMarkdown?: string;
  releaseType: ChangelogReleaseType;
  status: ChangelogStatus;
  areas?: string[];
  changeTypes?: string[];
  isFeatured?: boolean;
}

export const CHANGELOG_AREAS = [
  "Platform",
  "Forms",
  "Bot Manager",
  "Atlas",
  "Creator Pages",
  "Profiles",
  "Community",
  "Resources",
  "Collaboration",
  "Moderation",
  "Admin",
  "Markdown",
] as const;

export const CHANGELOG_CHANGE_TYPES = [
  "Added",
  "Improved",
  "Changed",
  "Fixed",
  "Security",
  "Technical",
  "Deprecated",
  "Removed",
] as const;

export const CHANGELOG_RELEASE_TYPES: Array<{
  value: ChangelogReleaseType;
  label: string;
}> = [
  { value: "major", label: "Major update" },
  { value: "minor", label: "Minor update" },
  { value: "patch", label: "Patch" },
  { value: "development", label: "Development update" },
  { value: "archive", label: "Archive / historical" },
];

export function mapChangelogRow(row: any): ChangelogEntry {
  return {
    id: String(row.id),
    slug: String(row.slug || ""),
    version: row.version ? String(row.version) : null,
    releaseNumber:
      typeof row.release_number === "number" ? row.release_number : null,
    title: String(row.title || ""),
    headline: String(row.headline || ""),
    summary: String(row.summary || ""),
    bodyMarkdown: String(row.body_markdown || ""),
    technicalMarkdown: String(row.technical_markdown || ""),
    releaseType: (row.release_type || "development") as ChangelogReleaseType,
    status: (row.status || "draft") as ChangelogStatus,
    areas: Array.isArray(row.areas) ? row.areas.map(String) : [],
    changeTypes: Array.isArray(row.change_types)
      ? row.change_types.map(String)
      : [],
    isFeatured: Boolean(row.is_featured),
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}
