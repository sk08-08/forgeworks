"use client";

import {
  ArrowDown,
  ArrowUp,
  Blocks,
  ChevronDown,
  ChevronRight,
  ChevronsUp,
  CopyPlus,
  GripVertical,
  LayoutGrid,
  Minus,
  Monitor,
  MousePointer2,
  Plus,
  Settings2,
  Smartphone,
  Square,
  Tablet,
  Trash2,
  Type,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
} from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type {
  BioBuilderCanvasInspection,
  BioBuilderInspectorState,
  BioBuilderNode,
  BioBuilderPane,
  BioBuilderSelection,
  BioBuilderStyleValue,
  BioViewport,
} from "../types/bio-types";
import { BioBuilderCanvas } from "./bio-builder-canvas";
import { BioNumberControl } from "./shared/bio-number-control";
import { BioColorControl } from "./shared/bio-color-control";
import { BioSpacingControl } from "./shared/bio-spacing-control";
import { BioBorderControl } from "./shared/bio-border-control";
import { BioRadiusControl } from "./shared/bio-radius-control";
import { BioFlexGridControl } from "./shared/bio-flex-grid-control";

type BioVisualBuilderProps = {
  html: string;
  onChange: (html: string) => void;
};

const PANEL_STORAGE_KEY = "forgeworks:bio-builder:panels";
const MOBILE_PANE_STORAGE_KEY = "forgeworks:bio-builder:mobile-pane";

const CSS_PROPERTIES = [
  "display",
  "position",
  "width",
  "max-width",
  "min-width",
  "height",
  "min-height",
  "max-height",
  "gap",
  "row-gap",
  "column-gap",
  "grid-template-columns",
  "grid-template-rows",
  "justify-content",
  "justify-items",
  "align-items",
  "align-content",
  "flex-direction",
  "flex-wrap",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "background",
  "background-color",
  "background-image",
  "background-size",
  "background-position",
  "background-repeat",
  "border",
  "border-width",
  "border-style",
  "border-color",
  "border-radius",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "box-shadow",
  "overflow",
  "overflow-x",
  "overflow-y",
  "opacity",
  "color",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-transform",
  "text-decoration",
  "white-space",
] as const;

const templates = [
  {
    id: "heading",
    label: "Heading",
    description: "A standalone title.",
    icon: Type,
    html: '<h2 style="margin:0;color:#fff;font-size:2rem;line-height:1.1;">New heading</h2>',
  },
  {
    id: "text",
    label: "Text",
    description: "A paragraph for copy or notes.",
    icon: Type,
    html: '<p style="margin:0;color:#c9c3d0;line-height:1.7;">Write something here.</p>',
  },
  {
    id: "card",
    label: "Card",
    description: "A bordered content surface.",
    icon: Square,
    html: '<div style="padding:1rem;border:1px solid rgba(255,255,255,.12);border-radius:1rem;background:rgba(255,255,255,.035);"><strong style="color:#fff;">Card title</strong><p style="margin:.5rem 0 0;color:#bdb6c6;line-height:1.6;">Card content.</p></div>',
  },
  {
    id: "grid",
    label: "2 columns",
    description: "Two responsive content columns.",
    icon: LayoutGrid,
    html: '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;"><div style="padding:1rem;border:1px solid rgba(255,255,255,.1);border-radius:.9rem;">Column one</div><div style="padding:1rem;border:1px solid rgba(255,255,255,.1);border-radius:.9rem;">Column two</div></div>',
  },
  {
    id: "cta",
    label: "CTA",
    description: "A prominent external link.",
    icon: MousePointer2,
    html: '<a href="https://janitorai.com/" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 1.1rem;border:1px solid rgba(199,139,255,.35);border-radius:1rem;background:rgba(124,58,237,.12);color:#fff;text-decoration:none;"><strong>Open link</strong><span>→</span></a>',
  },
  {
    id: "divider",
    label: "Divider",
    description: "A simple visual separator.",
    icon: Minus,
    html: '<hr style="margin:1.25rem 0;border:0;border-top:1px solid rgba(255,255,255,.12);" />',
  },
];

const viewportOptions = [
  ["desktop", Monitor],
  ["tablet", Tablet],
  ["mobile", Smartphone],
] as const;

const mobilePanes = [
  ["structure", Blocks, "Structure"],
  ["canvas", Monitor, "Canvas"],
  ["inspector", Settings2, "Inspector"],
] as const;

function parseHtml(html: string) {
  return new DOMParser().parseFromString(html || "", "text/html");
}

function getEditableContainer(doc: Document) {
  const elements = Array.from(doc.body.children);

  if (
    elements.length === 1 &&
    elements[0] instanceof HTMLElement &&
    elements[0].tagName.toLowerCase() === "div"
  ) {
    return elements[0];
  }

  return doc.body;
}

function exposedChildren(element: Element) {
  return Array.from(element.children).filter((child) => {
    const tag = child.tagName.toLowerCase();
    return !["script", "style", "meta", "link", "title", "head"].includes(tag);
  });
}

function blockLabel(element: Element, fallback: string) {
  const explicit =
    element.getAttribute("data-label") ||
    element.getAttribute("aria-label") ||
    element.id ||
    element.classList.item(0);

  if (explicit) return explicit;

  const text = element.textContent?.replace(/\s+/g, " ").trim() || "";
  if (text) return text.slice(0, 48);

  return fallback;
}

function pathParent(path: string): BioBuilderSelection {
  const segments = path.split(".");
  if (segments.length <= 1) return "root";
  return segments.slice(0, -1).join(".");
}

function elementAtPath(
  doc: Document,
  selection: BioBuilderSelection,
): HTMLElement | null {
  const container = getEditableContainer(doc);

  if (selection === "root") {
    return container instanceof HTMLElement && container !== doc.body
      ? container
      : null;
  }

  let current: Element = container;

  for (const segment of selection.split(".")) {
    const index = Number(segment);
    if (!Number.isFinite(index)) return null;

    const next = exposedChildren(current)[index];
    if (!(next instanceof HTMLElement)) return null;
    current = next;
  }

  return current instanceof HTMLElement ? current : null;
}

function parentContainerForPath(
  doc: Document,
  selection: BioBuilderSelection,
): HTMLElement {
  const root = getEditableContainer(doc) as HTMLElement;
  if (selection === "root") return root;

  const parent = pathParent(selection);
  if (parent === "root") return root;

  return elementAtPath(doc, parent) || root;
}

function serializeDocument(doc: Document) {
  return doc.body.innerHTML;
}

function buildTree(html: string): BioBuilderNode[] {
  if (typeof DOMParser === "undefined") return [];

  const doc = parseHtml(html);
  const container = getEditableContainer(doc);
  const nodes: BioBuilderNode[] = [];

  const visit = (
    parent: Element,
    parentPath: string | "root",
    depth: number,
    prefix: string,
  ) => {
    exposedChildren(parent).forEach((child, index) => {
      const path = prefix ? `${prefix}.${index}` : String(index);
      const children = exposedChildren(child);

      nodes.push({
        path,
        parentPath,
        index,
        depth,
        tagName: child.tagName.toLowerCase(),
        label: blockLabel(child, `${child.tagName.toLowerCase()} ${index + 1}`),
        summary:
          child.textContent?.replace(/\s+/g, " ").trim().slice(0, 92) ||
          "Visual element",
        hasChildren: children.length > 0,
      });

      visit(child, path, depth + 1, path);
    });
  };

  visit(container, "root", 0, "");
  return nodes;
}

function buildBreadcrumbs(
  nodes: BioBuilderNode[],
  selection: BioBuilderSelection,
) {
  if (selection === "root") {
    return [{ path: "root" as const, label: "Document" }];
  }

  const byPath = new Map(nodes.map((node) => [node.path, node]));
  const result: Array<{ path: BioBuilderSelection; label: string }> = [
    { path: "root", label: "Document" },
  ];

  const segments = selection.split(".");
  for (let index = 0; index < segments.length; index += 1) {
    const path = segments.slice(0, index + 1).join(".");
    const node = byPath.get(path);
    if (node) result.push({ path, label: node.label });
  }

  return result;
}

function updateSelection(
  html: string,
  selection: BioBuilderSelection,
  mutate: (element: HTMLElement, parent: HTMLElement) => void,
) {
  const doc = parseHtml(html);
  const element = elementAtPath(doc, selection);
  if (!element) return html;

  const parent = parentContainerForPath(doc, selection);
  const previousElement = element.outerHTML;
  const previousChildren = parent.innerHTML;
  mutate(element, parent);
  // Check both: remove() leaves the detached element's outerHTML unchanged,
  // while edits to the root's own attributes leave its innerHTML unchanged.
  if (
    element.outerHTML === previousElement &&
    parent.innerHTML === previousChildren
  ) {
    return html;
  }
  return serializeDocument(doc);
}

function readInspector(
  html: string,
  selection: BioBuilderSelection,
  computedStyles: Record<string, string>,
): BioBuilderInspectorState | null {
  if (typeof DOMParser === "undefined") return null;

  const doc = parseHtml(html);
  const element = elementAtPath(doc, selection);
  if (!element) return null;

  const tagName = element.tagName.toLowerCase();
  const simpleContent =
    [
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "a",
      "span",
      "strong",
      "em",
      "small",
      "label",
      "button",
    ].includes(tagName) && element.childElementCount === 0;

  const styles: Record<string, BioBuilderStyleValue> = {};

  for (const property of CSS_PROPERTIES) {
    const inline = element.style.getPropertyValue(property).trim();
    const computed = (computedStyles[property] || "").trim();

    styles[property] = {
      inline,
      computed,
      resolved: inline || computed,
      source: inline ? "inline" : computed ? "computed" : "unset",
    };
  }

  const attributes: Record<string, string> = {};
  for (const attribute of Array.from(element.attributes)) {
    if (attribute.name === "style") continue;
    attributes[attribute.name] = attribute.value;
  }

  return {
    path: selection,
    parentPath: selection === "root" ? null : pathParent(selection),
    tagName,
    label:
      selection === "root" ? "Document wrapper" : blockLabel(element, tagName),
    simpleContent,
    textContent: element.textContent || "",
    innerHtml: element.innerHTML,
    attributes,
    styles,
  };
}

function styleValue(
  inspector: BioBuilderInspectorState | null,
  property: string,
) {
  return inspector?.styles[property]?.resolved || "";
}

function styleSource(
  inspector: BioBuilderInspectorState | null,
  property: string,
) {
  return inspector?.styles[property]?.source || "unset";
}

function reorderSelection(html: string, selection: string, direction: -1 | 1) {
  const doc = parseHtml(html);
  const element = elementAtPath(doc, selection);
  if (!element) return { html, selection };

  const parent = parentContainerForPath(doc, selection);
  const siblings = exposedChildren(parent);
  const currentIndex = siblings.indexOf(element);
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= siblings.length) {
    return { html, selection };
  }

  const target = siblings[nextIndex];
  if (!target) return { html, selection };

  if (direction > 0) target.after(element);
  else target.before(element);

  const parentPath = pathParent(selection);
  const nextPath =
    parentPath === "root" ? String(nextIndex) : `${parentPath}.${nextIndex}`;

  return {
    html: serializeDocument(doc),
    selection: nextPath,
  };
}

function PropertyInput({
  label,
  value,
  placeholder,
  source,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  source?: BioBuilderStyleValue["source"];
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0 space-y-1.5">
      <span className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
        <span>{label}</span>
        {source === "computed" && (
          <span className="text-[9px] font-normal text-muted-foreground/60">
            computed
          </span>
        )}
      </span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 min-w-0 font-mono text-xs"
        placeholder={placeholder}
      />
    </label>
  );
}

function BackgroundImageProperty({
  value,
  preview,
  size,
  position,
  repeat,
  source,
  onApply,
}: {
  value: string;
  preview: string;
  size: string;
  position: string;
  repeat: string;
  source: BioBuilderStyleValue["source"];
  onApply: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  // External Code edits and a different selection should update the draft.
  // Typing only changes local state until Apply, so the iframe cannot reload
  // and disable this field on every intermediate (often invalid) CSS value.
  useEffect(() => setDraft(value), [value]);
  const hasImage = preview.trim() !== "" && preview.trim() !== "none";

  return (
    <div className="min-w-0 space-y-2 rounded-lg border bg-muted/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">Background image</p>
        {source === "computed" && (
          <span className="text-[10px] text-muted-foreground">computed</span>
        )}
      </div>
      {hasImage && (
        <div
          role="img"
          aria-label="Selected element background preview"
          className="h-32 w-full rounded-md border bg-muted/30"
          style={{
            backgroundImage: preview,
            backgroundSize: size || "cover",
            backgroundPosition: position || "center",
            backgroundRepeat: repeat || "no-repeat",
          }}
        />
      )}
      <label className="block space-y-1">
        <span className="text-[10px] text-muted-foreground">
          CSS image value
        </span>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          spellCheck={false}
          placeholder={'url("https://example.com/image.webp")'}
          className="w-full min-w-0 resize-y rounded-md border bg-background p-2 font-mono text-xs outline-none focus:border-primary/50"
        />
      </label>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">
          URL, gradients or multiple CSS layers.
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 cursor-pointer"
          disabled={draft.trim() === value.trim()}
          onClick={() => onApply(draft)}
        >
          Apply image
        </Button>
      </div>
    </div>
  );
}

function ChoiceProperty({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const normalized =
    options.includes(value) || value === ""
      ? value || "__default__"
      : "__custom__";

  return (
    <div className="min-w-0 space-y-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <Select
        value={normalized}
        onValueChange={(next) => {
          if (next === "__default__") onChange("");
          else if (next !== "__custom__") onChange(next);
        }}
      >
        <SelectTrigger className="h-9 w-full min-w-0 cursor-pointer text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__default__">Default</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          {normalized === "__custom__" && (
            <SelectItem value="__custom__">{value}</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export function BioVisualBuilder({ html, onChange }: BioVisualBuilderProps) {
  const nodes = useMemo(() => buildTree(html), [html]);
  const [selection, setSelection] = useState<BioBuilderSelection>("root");
  const [computedBySelection, setComputedBySelection] = useState<
    Record<string, { html: string; styles: Record<string, string> }>
  >({});
  const [viewport, setViewport] = useState<BioViewport>("desktop");
  const [mobilePane, setMobilePane] = useState<BioBuilderPane>("canvas");
  const [insertOpen, setInsertOpen] = useState(false);
  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [textEdit, setTextEdit] = useState<{
    previousHtml: string;
    html: string;
    selection: BioBuilderSelection;
    text: string;
  } | null>(null);

  const cachedInspection = computedBySelection[selection];
  // A CSS edit replaces the iframe document. Keep the last values for the SAME
  // selection visible until that document reports its own computed styles.
  // Dropping every computed property for a render made numeric controls briefly
  // switch to raw mode and back, even when those properties never changed.
  const selectedComputed = cachedInspection?.styles ?? {};
  const inspectionPending = cachedInspection?.html !== html;

  const inspector = useMemo(
    () => readInspector(html, selection, selectedComputed),
    [html, selectedComputed, selection],
  );

  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(nodes, selection),
    [nodes, selection],
  );

  const visibleNodes = useMemo(
    () =>
      nodes.filter((node) => {
        if (node.depth === 0) return true;

        let current: BioBuilderSelection = node.parentPath;
        while (current !== "root") {
          if (!expanded.has(current)) return false;
          current = pathParent(current);
        }

        return true;
      }),
    [expanded, nodes],
  );

  useEffect(() => {
    if (selection === "root") return;
    if (!nodes.some((node) => node.path === selection)) {
      setSelection("root");
    }
  }, [nodes, selection]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(MOBILE_PANE_STORAGE_KEY);
      if (
        stored === "structure" ||
        stored === "canvas" ||
        stored === "inspector"
      ) {
        setMobilePane(stored);
      }
    } catch {
      // Preference only.
    }
  }, []);

  const setPane = (pane: BioBuilderPane) => {
    setMobilePane(pane);
    try {
      window.localStorage.setItem(MOBILE_PANE_STORAGE_KEY, pane);
    } catch {
      // Ignore unavailable storage.
    }
  };

  const ensureAncestorsExpanded = useCallback((next: BioBuilderSelection) => {
    if (next === "root") return;

    setExpanded((current) => {
      const copy = new Set(current);
      let parent = pathParent(next);

      while (parent !== "root") {
        copy.add(parent);
        parent = pathParent(parent);
      }

      return copy;
    });
  }, []);

  const selectNode = useCallback(
    (next: BioBuilderSelection, openInspector = false) => {
      ensureAncestorsExpanded(next);
      setSelection(next);
      if (openInspector) setPane("inspector");
    },
    [ensureAncestorsExpanded],
  );

  const mutateSelected = useCallback(
    (mutate: (element: HTMLElement, parent: HTMLElement) => void) => {
      const nextHtml = updateSelection(html, selection, mutate);
      if (nextHtml !== html) onChange(nextHtml);
    },
    [html, onChange, selection],
  );

  const setStyle = (property: string, value: string) => {
    const next = value.trim();
    const current = inspector?.styles[property];
    // Showing a computed value is read-only until an actual change is made.
    // Clicking into a control must not create a duplicate inline override.
    if ((!next && !current?.inline) || (next && next === current?.resolved))
      return;

    mutateSelected((element) => {
      if (next) element.style.setProperty(property, next);
      else element.style.removeProperty(property);
    });
  };

  const setStyles = (updates: Record<string, string>) => {
    mutateSelected((element) => {
      // CSS shorthand expands into longhands. Removing longhands AFTER setting
      // a shorthand also erases the shorthand (the linked -> 0 bug).
      // Always clear first, then write nonempty declarations.
      for (const [property, value] of Object.entries(updates)) {
        if (!value.trim()) element.style.removeProperty(property);
      }
      for (const [property, value] of Object.entries(updates)) {
        if (value.trim()) element.style.setProperty(property, value.trim());
      }
    });
  };

  const setText = (value: string) => {
    if (value === inspector?.textContent) return;

    const nextHtml = updateSelection(html, selection, (element) => {
      element.textContent = value;
    });
    if (nextHtml === html) return;

    // Only the selected leaf's text changed. The Canvas can update that DOM
    // node in place instead of reloading its iframe on every keystroke.
    setTextEdit({ previousHtml: html, html: nextHtml, selection, text: value });
    onChange(nextHtml);
  };

  const setAttribute = (name: string, value: string) => {
    if (value === (inspector?.attributes[name] || "")) return;
    mutateSelected((element) => {
      if (value.trim()) element.setAttribute(name, value);
      else element.removeAttribute(name);
    });
  };

  const addTemplate = (templateHtml: string) => {
    const doc = parseHtml(html);
    const root = getEditableContainer(doc);
    const fragment = doc.createRange().createContextualFragment(templateHtml);
    const newNode = fragment.firstElementChild;
    if (!newNode) return;

    if (selection === "root") {
      root.appendChild(newNode);
      const index = exposedChildren(root).length - 1;
      onChange(serializeDocument(doc));
      selectNode(String(index));
    } else {
      const selected = elementAtPath(doc, selection);
      const parent = parentContainerForPath(doc, selection);
      selected?.after(newNode);

      const siblings = exposedChildren(parent);
      const index = siblings.indexOf(newNode);
      const parentPath = pathParent(selection);
      const nextPath =
        parentPath === "root" ? String(index) : `${parentPath}.${index}`;

      onChange(serializeDocument(doc));
      selectNode(nextPath);
    }

    setInsertOpen(false);
    setPane("canvas");
  };

  const duplicateSelected = () => {
    if (selection === "root") return;

    const doc = parseHtml(html);
    const element = elementAtPath(doc, selection);
    if (!element) return;

    const parent = parentContainerForPath(doc, selection);
    const clone = element.cloneNode(true);
    element.after(clone);

    const siblings = exposedChildren(parent);
    const index = siblings.indexOf(clone as Element);
    const parentPath = pathParent(selection);
    const nextPath =
      parentPath === "root" ? String(index) : `${parentPath}.${index}`;

    onChange(serializeDocument(doc));
    selectNode(nextPath);
  };

  const deleteSelected = () => {
    if (selection === "root") return;

    const parent = pathParent(selection);
    onChange(
      updateSelection(html, selection, (element) => {
        element.remove();
      }),
    );
    selectNode(parent);
  };

  const moveSelected = (direction: -1 | 1) => {
    if (selection === "root") return;

    const result = reorderSelection(html, selection, direction);
    onChange(result.html);
    selectNode(result.selection);
  };

  const toggleExpanded = (path: string) => {
    setExpanded((current) => {
      const copy = new Set(current);
      if (copy.has(path)) copy.delete(path);
      else copy.add(path);
      return copy;
    });
  };

  const handleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    path: string,
  ) => {
    setDraggingPath(path);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", path);
  };

  const handleDrop = (
    event: DragEvent<HTMLButtonElement>,
    targetPath: string,
  ) => {
    event.preventDefault();
    const from = draggingPath || event.dataTransfer.getData("text/plain");

    if (!from || from === targetPath) {
      setDraggingPath(null);
      return;
    }

    if (pathParent(from) !== pathParent(targetPath)) {
      setDraggingPath(null);
      return;
    }

    const fromIndex = Number(from.split(".").at(-1));
    const targetIndex = Number(targetPath.split(".").at(-1));
    if (!Number.isFinite(fromIndex) || !Number.isFinite(targetIndex)) return;

    const direction: -1 | 1 = targetIndex > fromIndex ? 1 : -1;
    let currentHtml = html;
    let currentPath = from;

    while (currentPath !== targetPath) {
      const result = reorderSelection(currentHtml, currentPath, direction);
      if (result.selection === currentPath) break;
      currentHtml = result.html;
      currentPath = result.selection;
    }

    onChange(currentHtml);
    selectNode(currentPath);
    setDraggingPath(null);
  };

  const structurePanel = (
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-muted/[0.06]">
      <div className="shrink-0 border-b p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Structure</p>
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
              Nested elements stay editable instead of being flattened.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0 cursor-pointer gap-1.5"
            onClick={() => setInsertOpen((current) => !current)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {insertOpen && (
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {templates.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  type="button"
                  className="rounded-lg border bg-background px-2.5 py-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
                  onClick={() => addTemplate(template.html)}
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <p className="mt-1.5 text-[11px] font-medium">
                    {template.label}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[9px] leading-3.5 text-muted-foreground">
                    {template.description}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <button
          type="button"
          className={cn(
            "mb-1 w-full rounded-lg border px-3 py-2 text-left transition",
            selection === "root"
              ? "border-primary/35 bg-primary/10"
              : "border-transparent hover:border-border hover:bg-muted/30",
          )}
          onClick={() => selectNode("root")}
        >
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Document wrapper</span>
          </div>
        </button>

        {visibleNodes.map((node) => (
          <button
            key={node.path}
            type="button"
            draggable
            className={cn(
              "group mb-1 flex w-full items-start gap-1 rounded-lg border py-2 pr-2 text-left transition",
              selection === node.path
                ? "border-primary/35 bg-primary/10"
                : "border-transparent hover:border-border hover:bg-muted/30",
              draggingPath === node.path && "opacity-50",
            )}
            style={{ paddingLeft: `${8 + node.depth * 14}px` }}
            onClick={() => selectNode(node.path)}
            onDragStart={(event) => handleDragStart(event, node.path)}
            onDragEnd={() => setDraggingPath(null)}
            onDragOver={(event) => {
              if (pathParent(draggingPath || "") === node.parentPath) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={(event) => handleDrop(event, node.path)}
          >
            <span
              role="button"
              tabIndex={-1}
              className={cn(
                "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded text-muted-foreground",
                !node.hasChildren && "opacity-0",
              )}
              onClick={(event) => {
                event.stopPropagation();
                if (node.hasChildren) toggleExpanded(node.path);
              }}
            >
              {expanded.has(node.path) ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </span>

            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
                  {node.tagName}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
                  {node.label}
                </span>
              </div>
              {node.depth < 2 && (
                <p className="mt-1 line-clamp-1 text-[9px] leading-3.5 text-muted-foreground">
                  {node.summary}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );

  const canvasPanel = (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-muted/15">
      <div className="flex h-[52px] shrink-0 items-center justify-between gap-2 border-b bg-background px-3">
        <div className="min-w-0">
          <p className="text-xs font-medium">Live canvas</p>
          <p className="hidden text-[10px] text-muted-foreground sm:block">
            Hover to inspect. Click any nested element to select it.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-full border bg-muted/20 p-1">
          {viewportOptions.map(([value, Icon]) => (
            <Button
              key={value}
              type="button"
              variant={viewport === value ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-8 cursor-pointer rounded-full"
              onClick={() => setViewport(value)}
              aria-label={`${value} builder preview`}
              title={value}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>
      </div>

      <BioBuilderCanvas
        html={html}
        textEdit={textEdit}
        selection={selection}
        viewport={viewport}
        onSelectionChange={(next) => {
          selectNode(next, true);
        }}
        onInspectionChange={(inspection: BioBuilderCanvasInspection) => {
          const key =
            inspection.selection === "root" ? "root" : inspection.selection;

          setComputedBySelection((current) => ({
            ...current,
            [key]: { html, styles: inspection.computedStyles },
          }));
        }}
      />
    </section>
  );

  const inspectorPanel = (
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b px-3 py-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {inspector?.label || "Inspector"}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {inspector?.tagName || "document"}
            </p>
          </div>

          {selection !== "root" && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={() => selectNode(pathParent(selection))}
                title="Select parent"
              >
                <ChevronsUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={() => moveSelected(-1)}
                title="Move up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={() => moveSelected(1)}
                title="Move down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={duplicateSelected}
                title="Duplicate"
              >
                <CopyPlus className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer text-muted-foreground"
                onClick={deleteSelected}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-2 flex min-w-0 items-center gap-1 overflow-x-auto pb-0.5">
          {breadcrumbs.map((item, index) => (
            <div
              key={`${item.path}-${index}`}
              className="flex shrink-0 items-center gap-1"
            >
              {index > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              )}
              <button
                type="button"
                className={cn(
                  "max-w-28 truncate rounded px-1.5 py-0.5 text-[9px] text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  item.path === selection && "bg-muted text-foreground",
                )}
                onClick={() => selectNode(item.path)}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div
        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4"
        aria-busy={inspectionPending}
      >
        {!inspector ? (
          <div className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
            Select an element in Structure or directly on the canvas.
          </div>
        ) : (
          <div className="min-w-0 space-y-5">
            {inspector.simpleContent && selection !== "root" && (
              <section className="space-y-2">
                <div>
                  <p className="text-xs font-semibold">Content</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Edit this element&apos;s text directly.
                  </p>
                </div>
                <textarea
                  value={inspector.textContent}
                  onChange={(event) => setText(event.target.value)}
                  className="min-h-20 w-full resize-y rounded-lg border bg-background px-3 py-2 text-xs leading-5 outline-none focus:border-primary/50"
                />
              </section>
            )}

            {inspector.tagName === "a" && (
              <section className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
                <p className="text-xs font-semibold">Link</p>
                <PropertyInput
                  label="URL"
                  value={inspector.attributes.href || ""}
                  placeholder="https://..."
                  onChange={(value) => setAttribute("href", value)}
                />
                <ChoiceProperty
                  label="Open in"
                  value={inspector.attributes.target || ""}
                  options={["_blank", "_self"]}
                  onChange={(value) => setAttribute("target", value)}
                />
              </section>
            )}

            {inspector.tagName === "img" && (
              <section className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
                <p className="text-xs font-semibold">Image</p>
                <PropertyInput
                  label="Source"
                  value={inspector.attributes.src || ""}
                  placeholder="https://..."
                  onChange={(value) => setAttribute("src", value)}
                />
                <PropertyInput
                  label="Alt text"
                  value={inspector.attributes.alt || ""}
                  placeholder="Describe this image"
                  onChange={(value) => setAttribute("alt", value)}
                />
              </section>
            )}

            <section className="space-y-3 border-t pt-4">
              <div>
                <p className="text-xs font-semibold">Background media</p>
                <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                  Select the actual image layer in Structure or Canvas. This
                  edits its CSS background, not an HTML image element.
                </p>
              </div>
              <BackgroundImageProperty
                key={selection}
                value={styleValue(inspector, "background-image")}
                preview={
                  inspector.styles["background-image"]?.computed ||
                  styleValue(inspector, "background-image")
                }
                size={styleValue(inspector, "background-size")}
                position={styleValue(inspector, "background-position")}
                repeat={styleValue(inspector, "background-repeat")}
                source={styleSource(inspector, "background-image")}
                onApply={(value) => setStyle("background-image", value)}
              />
            </section>

            {/* Only CSS controls need to wait for freshly inspected computed styles.
                Keep Content/Link/Image enabled so editing does not lose focus. */}
            <fieldset
              disabled={inspectionPending}
              className="min-w-0 space-y-5"
            >
              <section className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
                <div>
                  <p className="text-xs font-semibold">Layout</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                    Values marked computed come from the rendered bio. Editing
                    one creates an inline override.
                  </p>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-3">
                  <ChoiceProperty
                    label="Display"
                    value={styleValue(inspector, "display")}
                    options={[
                      "block",
                      "inline",
                      "inline-block",
                      "flex",
                      "inline-flex",
                      "grid",
                      "inline-grid",
                      "none",
                    ]}
                    onChange={(value) => setStyle("display", value)}
                  />

                  <BioNumberControl
                    label="Width"
                    value={styleValue(inspector, "width")}
                    defaultUnit="%"
                    units={["%", "rem", "px", "em", "vw", "vh"]}
                    step={1}
                    min={0}
                    allowNegative={false}
                    placeholder="auto"
                    onChange={(value) => setStyle("width", value)}
                  />

                  <BioNumberControl
                    label="Max width"
                    value={styleValue(inspector, "max-width")}
                    defaultUnit="rem"
                    units={["rem", "px", "em", "%", "vw", "vh"]}
                    step={0.5}
                    min={0}
                    allowNegative={false}
                    placeholder="none"
                    onChange={(value) => setStyle("max-width", value)}
                  />

                  <BioNumberControl
                    label="Min height"
                    value={styleValue(inspector, "min-height")}
                    defaultUnit="rem"
                    units={["rem", "px", "em", "vh", "vw", "%"]}
                    step={0.5}
                    min={0}
                    allowNegative={false}
                    placeholder="auto"
                    onChange={(value) => setStyle("min-height", value)}
                  />

                  <BioFlexGridControl
                    key={selection}
                    styles={inspector.styles}
                    onChange={setStyle}
                  />
                </div>
              </section>

              <section className="space-y-3 border-t pt-4">
                <div>
                  <p className="text-xs font-semibold">Spacing</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                    Edit all sides together or unlink them for precise spacing.
                  </p>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-3">
                  <BioSpacingControl
                    key={`${selection}:padding`}
                    label="Padding"
                    property="padding"
                    value={styleValue(inspector, "padding")}
                    top={styleValue(inspector, "padding-top")}
                    right={styleValue(inspector, "padding-right")}
                    bottom={styleValue(inspector, "padding-bottom")}
                    left={styleValue(inspector, "padding-left")}
                    defaultUnit="rem"
                    units={["rem", "px", "em", "%", "vw", "vh"]}
                    step={0.05}
                    onChange={setStyles}
                  />

                  <BioSpacingControl
                    key={`${selection}:margin`}
                    label="Margin"
                    property="margin"
                    value={styleValue(inspector, "margin")}
                    top={styleValue(inspector, "margin-top")}
                    right={styleValue(inspector, "margin-right")}
                    bottom={styleValue(inspector, "margin-bottom")}
                    left={styleValue(inspector, "margin-left")}
                    defaultUnit="rem"
                    units={["rem", "px", "em", "%", "vw", "vh"]}
                    step={0.05}
                    allowNegative
                    allowAuto
                    onChange={setStyles}
                  />
                </div>
              </section>

              <section className="space-y-3 border-t pt-4">
                <div>
                  <p className="text-xs font-semibold">Surface</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                    Common visual properties use friendly controls. Complex CSS
                    stays available when the imported bio needs it.
                  </p>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-3">
                  <BioColorControl
                    label="Background color"
                    value={styleValue(inspector, "background-color")}
                    emptyLabel="Transparent"
                    onChange={(value) => setStyle("background-color", value)}
                  />

                  {styleValue(inspector, "background") &&
                    styleValue(inspector, "background") !==
                      styleValue(inspector, "background-color") && (
                      <PropertyInput
                        label="Advanced background"
                        value={styleValue(inspector, "background")}
                        placeholder="linear-gradient(...)"
                        source={styleSource(inspector, "background")}
                        onChange={(value) => setStyle("background", value)}
                      />
                    )}

                  <ChoiceProperty
                    label="Background sizing"
                    value={styleValue(inspector, "background-size")}
                    options={["cover", "contain", "auto", "100% 100%"]}
                    onChange={(value) => setStyle("background-size", value)}
                  />
                  <ChoiceProperty
                    label="Background position"
                    value={styleValue(inspector, "background-position")}
                    options={[
                      "center",
                      "center center",
                      "right center",
                      "left center",
                      "center top",
                      "center bottom",
                    ]}
                    onChange={(value) => setStyle("background-position", value)}
                  />
                  <ChoiceProperty
                    label="Background repeat"
                    value={styleValue(inspector, "background-repeat")}
                    options={["no-repeat", "repeat", "repeat-x", "repeat-y"]}
                    onChange={(value) => setStyle("background-repeat", value)}
                  />

                  <BioBorderControl
                    value={styleValue(inspector, "border")}
                    width={styleValue(inspector, "border-width")}
                    style={styleValue(inspector, "border-style")}
                    color={styleValue(inspector, "border-color")}
                    onChange={setStyles}
                  />

                  <BioRadiusControl
                    key={`${selection}:radius`}
                    value={styleValue(inspector, "border-radius")}
                    topLeft={styleValue(inspector, "border-top-left-radius")}
                    topRight={styleValue(inspector, "border-top-right-radius")}
                    bottomRight={styleValue(
                      inspector,
                      "border-bottom-right-radius",
                    )}
                    bottomLeft={styleValue(
                      inspector,
                      "border-bottom-left-radius",
                    )}
                    onChange={setStyles}
                  />

                  <BioNumberControl
                    label="Opacity"
                    value={styleValue(inspector, "opacity")}
                    defaultUnit=""
                    units={[""]}
                    step={0.05}
                    min={0}
                    max={1}
                    allowNegative={false}
                    placeholder="1"
                    onChange={(value) => setStyle("opacity", value)}
                  />
                </div>
              </section>

              <section className="space-y-3 border-t pt-4">
                <p className="text-xs font-semibold">Typography</p>
                <div className="grid min-w-0 grid-cols-1 gap-3">
                  <BioColorControl
                    label="Text color"
                    value={styleValue(inspector, "color")}
                    emptyLabel="Inherited"
                    onChange={(value) => setStyle("color", value)}
                  />
                  <BioNumberControl
                    label="Font size"
                    value={styleValue(inspector, "font-size")}
                    defaultUnit="rem"
                    units={["rem", "px", "em", "%", "vw"]}
                    step={0.05}
                    min={0}
                    allowNegative={false}
                    placeholder="inherit"
                    onChange={(value) => setStyle("font-size", value)}
                  />
                  <ChoiceProperty
                    label="Weight"
                    value={styleValue(inspector, "font-weight")}
                    options={["300", "400", "500", "600", "700", "800", "900"]}
                    onChange={(value) => setStyle("font-weight", value)}
                  />
                  <BioNumberControl
                    label="Line height"
                    value={styleValue(inspector, "line-height")}
                    defaultUnit=""
                    units={["", "rem", "em", "px", "%"]}
                    step={0.05}
                    min={0}
                    allowNegative={false}
                    placeholder="normal"
                    onChange={(value) => setStyle("line-height", value)}
                  />
                  <BioNumberControl
                    label="Letter spacing"
                    value={styleValue(inspector, "letter-spacing")}
                    defaultUnit="em"
                    units={["em", "rem", "px"]}
                    step={0.01}
                    min={-10}
                    allowNegative
                    placeholder="normal"
                    onChange={(value) => setStyle("letter-spacing", value)}
                  />
                  <ChoiceProperty
                    label="Text align"
                    value={styleValue(inspector, "text-align")}
                    options={["left", "center", "right", "justify"]}
                    onChange={(value) => setStyle("text-align", value)}
                  />
                  <ChoiceProperty
                    label="Transform"
                    value={styleValue(inspector, "text-transform")}
                    options={["none", "uppercase", "lowercase", "capitalize"]}
                    onChange={(value) => setStyle("text-transform", value)}
                  />
                </div>
              </section>

              {!inspector.simpleContent &&
                selection !== "root" &&
                nodes.some((node) => node.parentPath === selection) && (
                  <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-[10px] leading-4 text-muted-foreground">
                    This element contains nested children. Select them from the
                    canvas, Structure tree, or breadcrumb to edit their own
                    styles.
                  </div>
                )}
            </fieldset>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex h-[48px] shrink-0 items-center justify-between gap-2 border-b px-3 xl:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border bg-muted/20 p-1">
          {mobilePanes.map(([pane, Icon, label]) => (
            <Button
              key={pane}
              type="button"
              variant={mobilePane === pane ? "secondary" : "ghost"}
              size="sm"
              className="h-7 min-w-0 flex-1 cursor-pointer gap-1.5 px-2"
              onClick={() => setPane(pane)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="hidden min-h-0 flex-1 xl:block">
        <PanelGroup
          direction="horizontal"
          autoSaveId={PANEL_STORAGE_KEY}
          className="h-full min-h-0"
        >
          <Panel defaultSize={23} minSize={17} maxSize={34}>
            {structurePanel}
          </Panel>

          <PanelResizeHandle className="group relative w-px bg-border/70 transition hover:bg-primary/50">
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </PanelResizeHandle>

          <Panel defaultSize={51} minSize={34}>
            {canvasPanel}
          </Panel>

          <PanelResizeHandle className="group relative w-px bg-border/70 transition hover:bg-primary/50">
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </PanelResizeHandle>

          <Panel defaultSize={26} minSize={20} maxSize={38}>
            {inspectorPanel}
          </Panel>
        </PanelGroup>
      </div>

      <div className="min-h-0 flex-1 xl:hidden">
        <div
          className={cn(
            "h-full",
            mobilePane === "structure" ? "block" : "hidden",
          )}
        >
          {structurePanel}
        </div>
        <div
          className={cn("h-full", mobilePane === "canvas" ? "block" : "hidden")}
        >
          {canvasPanel}
        </div>
        <div
          className={cn(
            "h-full",
            mobilePane === "inspector" ? "block" : "hidden",
          )}
        >
          {inspectorPanel}
        </div>
      </div>
    </section>
  );
}
