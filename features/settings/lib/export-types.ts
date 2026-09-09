import type { ForgeKnowledgePackage } from "@/features/atlas/fkf/fkf-types";

export const ACCOUNT_EXPORT_FORMAT = "janitorforge-account-export" as const;
export const ACCOUNT_EXPORT_VERSION = 1 as const;

export const BOTS_EXPORT_FORMAT = "janitorforge-bots-export" as const;
export const BOTS_EXPORT_VERSION = 1 as const;

export const FORMS_EXPORT_FORMAT = "janitorforge-forms-export" as const;
export const FORMS_EXPORT_VERSION = 1 as const;

export const CREATOR_PAGES_EXPORT_FORMAT =
  "janitorforge-creator-pages-export" as const;
export const CREATOR_PAGES_EXPORT_VERSION = 1 as const;

export const ATLAS_EXPORT_FORMAT = "janitorforge-atlas-export" as const;
export const ATLAS_EXPORT_VERSION = 1 as const;

export type ExportRecord = Record<string, unknown>;

export interface BotsExportData {
  owned: ExportRecord[];
  collaborations: ExportRecord[];
  activity: ExportRecord[];
  comments: ExportRecord[];
  changeRequests: ExportRecord[];
  forks: ExportRecord[];
}

export interface FormsExportData {
  forms: ExportRecord[];
  submissions: ExportRecord[];
  moderation: ExportRecord[];
  customBlocklists: ExportRecord[];
  templates: ExportRecord[];
}

export interface CreatorPagesExportData {
  pages: ExportRecord[];
  sections: ExportRecord[];
}

export interface AtlasExportData {
  worlds: ExportRecord[];
  lorebooks: ExportRecord[];
  entries: ExportRecord[];
  worldBots: ExportRecord[];
  featuredEntries: ExportRecord[];
  featuredLorebooks: ExportRecord[];
}

export interface JanitorForgeAccountExportV1 {
  format: typeof ACCOUNT_EXPORT_FORMAT;
  version: typeof ACCOUNT_EXPORT_VERSION;
  exportedAt: string;

  account: {
    profile: ExportRecord | null;
    notificationPreferences: ExportRecord | null;
    badges: ExportRecord[];
  };

  profile: {
    sections: ExportRecord[];
    featuredBots: ExportRecord[];
    sectionBots: ExportRecord[];
    sectionForms: ExportRecord[];
    sectionCreatorPages: ExportRecord[];
    sectionWorlds: ExportRecord[];
  };

  bots: BotsExportData;

  forms: FormsExportData;

  creatorPages: CreatorPagesExportData;

  atlas: ForgeKnowledgePackage;

  social: {
    following: ExportRecord[];
    followers: ExportRecord[];
  };

  activity: {
    notifications: ExportRecord[];
    hubLogComments: ExportRecord[];
    hubLogReactions: ExportRecord[];
    hubResourceComments: ExportRecord[];
    hubResourceReactions: ExportRecord[];
    feedback: ExportRecord[];
  };
}

export interface JanitorForgeBotsExportV1 {
  format: typeof BOTS_EXPORT_FORMAT;
  version: typeof BOTS_EXPORT_VERSION;
  exportedAt: string;
  bots: BotsExportData;
}

export interface JanitorForgeFormsExportV1 {
  format: typeof FORMS_EXPORT_FORMAT;
  version: typeof FORMS_EXPORT_VERSION;
  exportedAt: string;
  forms: FormsExportData;
}

export interface JanitorForgeCreatorPagesExportV1 {
  format: typeof CREATOR_PAGES_EXPORT_FORMAT;
  version: typeof CREATOR_PAGES_EXPORT_VERSION;
  exportedAt: string;
  creatorPages: CreatorPagesExportData;
}

export interface JanitorForgeAtlasExportV1 {
  format: typeof ATLAS_EXPORT_FORMAT;
  version: typeof ATLAS_EXPORT_VERSION;
  exportedAt: string;
  atlas: AtlasExportData;
}
