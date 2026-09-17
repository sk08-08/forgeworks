"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { sanitizeBioForPreview } from "../lib/bio-html";
import type {
  BioBuilderCanvasInspection,
  BioBuilderSelection,
  BioViewport,
} from "../types/bio-types";

const FRAME_WIDTH: Record<BioViewport, number> = {
  desktop: 980,
  tablet: 768,
  mobile: 390,
};

const INSPECTED_PROPERTIES = [
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

function shouldExposeElement(element: Element) {
  const tag = element.tagName.toLowerCase();
  return !["script", "style", "meta", "link", "title", "head"].includes(tag);
}

function markTree(container: Element) {
  const visit = (parent: Element, prefix: string) => {
    const children = Array.from(parent.children).filter(shouldExposeElement);

    children.forEach((child, index) => {
      if (!(child instanceof HTMLElement)) return;

      const path = prefix ? `${prefix}.${index}` : String(index);
      child.dataset.fwBuilderPath = path;
      visit(child, path);
    });
  };

  visit(container, "");
}

function buildBuilderDocument(html: string) {
  const safeHtml = sanitizeBioForPreview(html);

  if (typeof DOMParser === "undefined") {
    return `<!doctype html><html><body>${safeHtml}</body></html>`;
  }

  const doc = new DOMParser().parseFromString(safeHtml, "text/html");
  const container = getEditableContainer(doc);

  if (container !== doc.body && container instanceof HTMLElement) {
    container.dataset.fwBuilderRoot = "true";
  }

  markTree(container);

  return `<!doctype html>
<html>
<!-- The sandbox disables scripts; listeners are attached by the parent. -->
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; form-action 'none'" />
<style>
  :root {
    color-scheme: dark;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    background:#09080d;
    color:#f7f5fa;
  }

  * {
    box-sizing:border-box;
    scrollbar-width:thin;
    scrollbar-color:rgba(255,255,255,.15) transparent;
  }

  *::-webkit-scrollbar { width:6px; height:6px; }
  *::-webkit-scrollbar-track { background:transparent; }
  *::-webkit-scrollbar-thumb {
    background:rgba(255,255,255,.14);
    border-radius:999px;
  }

  html, body {
    margin:0;
    min-height:100%;
    background:#09080d;
  }

  body {
    padding:20px;
    overflow-wrap:anywhere;
  }

  img, video, iframe, svg { max-width:100%; }

  [data-fw-builder-path],
  [data-fw-builder-root] {
    min-width:0;
    cursor:pointer;
    outline:1px solid transparent;
    outline-offset:3px;
    transition:outline-color .1s ease, box-shadow .1s ease;
  }

  [data-fw-builder-path][data-fw-builder-hover="true"] {
    outline-color:rgba(103,232,249,.62);
  }

  [data-fw-builder-selected="true"] {
    outline:2px solid rgba(192,132,252,.95) !important;
    box-shadow:0 0 0 4px rgba(168,85,247,.10);
  }

  @media(max-width:520px) {
    body { padding:10px; }
  }
</style>
</head>
<body>
${doc.body.innerHTML || '<p style="padding:24px;color:#8d8794">Your bio preview will appear here.</p>'}
</body>
</html>`;
}

type BioBuilderCanvasProps = {
  html: string;
  textEdit?: {
    previousHtml: string;
    html: string;
    selection: BioBuilderSelection;
    text: string;
  } | null;
  selection: BioBuilderSelection;
  viewport: BioViewport;
  onSelectionChange: (selection: BioBuilderSelection) => void;
  onInspectionChange?: (inspection: BioBuilderCanvasInspection) => void;
};

export function BioBuilderCanvas({
  html,
  textEdit,
  selection,
  viewport,
  onSelectionChange,
  onInspectionChange,
}: BioBuilderCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const scrollRef = useRef({ x: 0, y: 0 });
  const selectionRef = useRef(selection);
  const selectionCallbackRef = useRef(onSelectionChange);
  const inspectionCallbackRef = useRef(onInspectionChange);
  const htmlRef = useRef(html);
  // frameHtml is the last full document loaded into srcDoc. Leaf text edits are
  // applied directly to the current document instead of replacing this value.
  const [frameHtml, setFrameHtml] = useState(html);
  const appliedHtmlRef = useRef(html);
  const frameReadyRef = useRef(false);
  const srcDoc = useMemo(() => buildBuilderDocument(frameHtml), [frameHtml]);

  selectionRef.current = selection;
  selectionCallbackRef.current = onSelectionChange;
  inspectionCallbackRef.current = onInspectionChange;
  htmlRef.current = html;

  const inspect = (doc: Document, next: BioBuilderSelection) => {
    const win = doc.defaultView;
    if (!win) return;
    const node =
      next === "root"
        ? doc.querySelector<HTMLElement>('[data-fw-builder-root="true"]') ||
          doc.body
        : Array.from(
            doc.querySelectorAll<HTMLElement>("[data-fw-builder-path]"),
          ).find((element) => element.dataset.fwBuilderPath === next);
    if (!node) return;

    const styles = win.getComputedStyle(node);
    const computedStyles: Record<string, string> = {};
    for (const property of INSPECTED_PROPERTIES) {
      computedStyles[property] = styles.getPropertyValue(property).trim();
    }
    inspectionCallbackRef.current?.({
      selection: next,
      tagName: node.tagName.toLowerCase(),
      computedStyles,
    });
  };

  const applySelection = (doc: Document, next: BioBuilderSelection) => {
    doc.querySelectorAll("[data-fw-builder-selected]").forEach((node) => {
      node.removeAttribute("data-fw-builder-selected");
    });
    const node =
      next === "root"
        ? doc.querySelector<HTMLElement>('[data-fw-builder-root="true"]') ||
          doc.body
        : Array.from(
            doc.querySelectorAll<HTMLElement>("[data-fw-builder-path]"),
          ).find((element) => element.dataset.fwBuilderPath === next);
    node?.setAttribute("data-fw-builder-selected", "true");
    inspect(doc, next);
  };

  useLayoutEffect(() => {
    if (html === appliedHtmlRef.current) return;

    const doc = iframeRef.current?.contentDocument;
    const canPatch =
      frameReadyRef.current &&
      doc?.readyState === "complete" &&
      textEdit?.html === html &&
      textEdit.previousHtml === appliedHtmlRef.current &&
      textEdit.selection === selection;

    if (canPatch && doc) {
      const node = Array.from(
        doc.querySelectorAll<HTMLElement>("[data-fw-builder-path]"),
      ).find((element) => element.dataset.fwBuilderPath === selection);

      // Never replace a subtree containing HTML children: this fast path is
      // exclusively for the simple leaf text shown by the Content textarea.
      if (node && node.childElementCount === 0) {
        node.textContent = textEdit.text;
        appliedHtmlRef.current = html;
        inspect(doc, selection);
        return;
      }
    }

    // Anything other than a verified leaf-text edit uses the original full
    // document path, so imported HTML/style/structure changes stay intact.
    appliedHtmlRef.current = html;
    frameReadyRef.current = false;
    setFrameHtml(html);
  }, [html, selection, textEdit]);

  // Changing the selected node does not reload the document or move its scroll.
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc?.readyState === "complete") applySelection(doc, selection);
  }, [selection]);

  const onFrameLoad = () => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const win = iframe?.contentWindow;
    if (!doc || !win) return;

    frameReadyRef.current = true;
    let hovered: Element | null = null;
    // iframe nodes belong to a different JavaScript realm. Comparing them
    // against the parent window's Element makes every canvas click fail.
    const getTarget = (event: Event): Element | null => {
      const target = event.target;
      return target && (target as Node).nodeType === 1
        ? (target as Element)
        : null;
    };

    const onHover = (event: Event) => {
      const target = getTarget(event);
      const next = target?.closest("[data-fw-builder-path]") || null;
      if (hovered === next) return;
      hovered?.removeAttribute("data-fw-builder-hover");
      hovered = next;
      hovered?.setAttribute("data-fw-builder-hover", "true");
    };

    const onLeave = (event: Event) => {
      const related = (event as PointerEvent).relatedTarget;
      if (related && hovered?.contains(related as Node)) return;
      hovered?.removeAttribute("data-fw-builder-hover");
      hovered = null;
    };

    const onClick = (event: MouseEvent) => {
      const target = getTarget(event);
      const node = target?.closest<HTMLElement>("[data-fw-builder-path]");
      const next =
        node?.dataset.fwBuilderPath ||
        (target?.closest("[data-fw-builder-root]") ? "root" : null);
      // Do not let preview links navigate away or submit forms.
      event.preventDefault();
      if (!next) return;
      event.stopPropagation();
      selectionRef.current = next;
      applySelection(doc, next);
      selectionCallbackRef.current(next);
    };

    const onScroll = () => {
      scrollRef.current = { x: win.scrollX, y: win.scrollY };
    };

    doc.addEventListener("pointerover", onHover, true);
    doc.addEventListener("pointerout", onLeave, true);
    doc.addEventListener("click", onClick, true);
    doc.addEventListener("submit", (event) => event.preventDefault(), true);
    win.addEventListener("scroll", onScroll, { passive: true });

    applySelection(doc, selectionRef.current);
    const position = { ...scrollRef.current };
    win.requestAnimationFrame(() => {
      win.scrollTo(position.x, position.y);
      win.requestAnimationFrame(() => win.scrollTo(position.x, position.y));
    });
    // The iframe replaces its entire document on srcDoc updates. Its old
    // listeners are collected with that document; no parent message listener exists.
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-muted/15">
      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
        <div
          className={cn(
            "mx-auto h-full min-h-[520px] overflow-hidden rounded-xl border bg-[#09080d] shadow-xl transition-[width,max-width] duration-200",
            viewport === "desktop" && "w-full",
          )}
          style={{
            width:
              viewport === "desktop"
                ? "100%"
                : `min(100%, ${FRAME_WIDTH[viewport]}px)`,
            maxWidth: `${FRAME_WIDTH[viewport]}px`,
          }}
        >
          <iframe
            ref={iframeRef}
            title="Bio builder live canvas"
            sandbox="allow-same-origin"
            srcDoc={srcDoc}
            onLoad={onFrameLoad}
            className="h-full min-h-[520px] w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
