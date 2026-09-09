import type { ForgeKnowledgePackage } from "./fkf-types";

export const FORGE_KNOWLEDGE_FORMAT = "forge-knowledge" as const;
export const FORGE_KNOWLEDGE_VERSION = 1 as const;

export function createEmptyForgeKnowledgePackage(
  title?: string,
): ForgeKnowledgePackage {
  return {
    format: FORGE_KNOWLEDGE_FORMAT,
    version: FORGE_KNOWLEDGE_VERSION,
    metadata: title ? { title } : undefined,
    entries: [],
    worlds: [],
    collections: [],
    relations: [],
    lorebooks: [],
  };
}

export function isForgeKnowledgePackage(
  value: unknown,
): value is ForgeKnowledgePackage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const candidate = value as Partial<ForgeKnowledgePackage>;
  return (
    candidate.format === FORGE_KNOWLEDGE_FORMAT &&
    candidate.version === FORGE_KNOWLEDGE_VERSION &&
    Array.isArray(candidate.entries) &&
    Array.isArray(candidate.worlds) &&
    Array.isArray(candidate.collections) &&
    Array.isArray(candidate.relations) &&
    Array.isArray(candidate.lorebooks)
  );
}
