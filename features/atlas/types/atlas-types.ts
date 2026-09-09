export type AtlasEntryKind =
  | "character"
  | "location"
  | "faction"
  | "organization"
  | "event"
  | "object"
  | "species"
  | "concept"
  | "lore"
  | "note"
  | "custom";

export interface AtlasEntrySummary {
  id: string;
  title: string;
  kind: AtlasEntryKind;
  excerpt?: string | null;
  updatedAt: string;
}

export interface AtlasWorldSummary {
  id: string;
  title: string;
  description?: string | null;
  entryCount: number;
  updatedAt: string;
}

export interface AtlasCollectionSummary {
  id: string;
  title: string;
  description?: string | null;
  entryCount: number;
  updatedAt: string;
}

export interface AtlasLorebookSummary {
  id: string;
  title: string;
  description?: string | null;
  entryCount: number;
  updatedAt: string;
}
