export type BioStudioMode = "build" | "code" | "split" | "preview";
export type BioPreviewMode = "canvas" | "janitor";
export type BioViewport = "desktop" | "tablet" | "mobile";
export type BioImportSource = "blank" | "paste" | "jai_bridge";

export type BioDiagnosticLevel = "info" | "warning" | "error";

export type BioDiagnostic = {
  id: string;
  level: BioDiagnosticLevel;
  title: string;
  detail?: string;
};

export type BioStats = {
  sourceBytes: number;
  outputBytes: number;
  savedBytes: number;
  savedPercent: number;
};

export type BioProject = {
  id: string;
  userId: string;
  title: string;
  originalHtml: string;
  sourceHtml: string;
  sourceKind: BioImportSource;
  jaiCharacterId: string | null;
  jaiCharacterName: string | null;
  botId: string | null;
  sourceMetadata: Record<string, unknown>;

  /**
   * Optimistic-concurrency revision.
   *
   * Every successful save increments this value by one.
   * A client must save against the revision it originally loaded.
   */
  revision: number;

  createdAt: string;
  updatedAt: string;
};

export type JaiBioImportPackage = {
  forgeworks: "jai-bio";
  version: 1;
  capturedAt?: string;
  characterId?: string | null;
  characterName?: string | null;
  html: string;
};

export type BioImportResult = {
  html: string;
  package: JaiBioImportPackage | null;
};

export type BioVersionSnapshot = {
  id: string;
  title: string;
  html: string;
  sourceKind: BioImportSource;
  savedAt: string;
  reason: "save" | "restore";
};

export type BioBuilderNode = {
  path: string;
  parentPath: string | "root";
  index: number;
  depth: number;
  tagName: string;
  label: string;
  summary: string;
  hasChildren: boolean;
};

export type BioBuilderPane = "structure" | "canvas" | "inspector";
export type BioBuilderSelection = "root" | string;

export type BioBuilderStyleValue = {
  inline: string;
  computed: string;
  resolved: string;
  source: "inline" | "computed" | "unset";
};

export type BioBuilderInspectorState = {
  path: BioBuilderSelection;
  parentPath: BioBuilderSelection | null;
  tagName: string;
  label: string;
  simpleContent: boolean;
  textContent: string;
  innerHtml: string;
  attributes: Record<string, string>;
  styles: Record<string, BioBuilderStyleValue>;
};

export type BioBuilderCanvasInspection = {
  selection: BioBuilderSelection;
  tagName: string;
  computedStyles: Record<string, string>;
};
