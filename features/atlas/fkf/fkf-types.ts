export type ForgeKnowledgeEntryType = string;

export interface ForgeKnowledgeMetadata {
  title?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  generator?: string;
}

export interface ForgeKnowledgeEntry {
  id: string;
  title: string;
  type: ForgeKnowledgeEntryType;
  content: string;
  aliases?: string[];
  tags?: string[];
  properties?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export interface ForgeKnowledgeWorld {
  id: string;
  title: string;
  description?: string;
  entryIds: string[];
  botIds?: string[];
  extensions?: Record<string, unknown>;
}

export interface ForgeKnowledgeCollection {
  id: string;
  title: string;
  description?: string;
  entryIds: string[];
  extensions?: Record<string, unknown>;
}

export type ForgeLorebookActivationMode = "keywords" | "always" | "conditional";

export interface ForgeLorebookEntryConfig {
  entryId: string;
  enabled: boolean;
  activation: {
    mode: ForgeLorebookActivationMode;
    primaryKeys: string[];
    secondaryKeys: string[];
    caseSensitive: boolean;
    matchWholeWords: boolean;
  };
  insertion: {
    priority: number;
    depth?: number;
  };
  probability?: number;
  adapterMetadata?: Record<string, unknown>;
}

export interface ForgeKnowledgeLorebook {
  id: string;
  title: string;
  description?: string;
  entries: ForgeLorebookEntryConfig[];
  extensions?: Record<string, unknown>;
}

export interface ForgeKnowledgeRelation {
  id: string;
  sourceEntryId: string;
  targetEntryId: string;
  type: string;
  label?: string;
  inverseLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface ForgeKnowledgePackage {
  format: "forge-knowledge";
  version: 1;
  metadata?: ForgeKnowledgeMetadata;
  entries: ForgeKnowledgeEntry[];
  worlds: ForgeKnowledgeWorld[];
  collections: ForgeKnowledgeCollection[];
  relations: ForgeKnowledgeRelation[];
  lorebooks: ForgeKnowledgeLorebook[];
  extensions?: Record<string, unknown>;
}
