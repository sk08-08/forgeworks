"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { basicSetup } from "codemirror";
import { html as htmlLanguage } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import {
  SearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
  selectMatches,
  search,
  setSearchQuery,
} from "@codemirror/search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Braces,
  Copy,
  Search,
  Replace,
  WandSparkles,
  WrapText,
  ChevronUp,
  ChevronDown,
  X,
  CaseSensitive,
  Regex,
  WholeWord,
  ListChecks,
} from "lucide-react";

type BioCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onFormat: () => void;
  onCopy: () => void;
};

const PREFERENCE = "forgeworks:bio-studio:word-wrap";
const editorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      backgroundColor: "#0d0d13",
      color: "#e7e4f2",
      fontSize: "13px",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily:
        "var(--font-geist-mono), ui-monospace, SFMono-Regular, Consolas, monospace",
      lineHeight: "1.6",
    },
    ".cm-content": {
      padding: "12px 0",
      caretColor: "#d6b4ff",
      minHeight: "100%",
    },
    ".cm-line": { paddingLeft: "8px", paddingRight: "16px" },
    ".cm-gutters": {
      backgroundColor: "#101018",
      color: "#737185",
      borderRight: "1px solid #292634",
    },
    ".cm-activeLineGutter": { backgroundColor: "#292235", color: "#eddbff" },
    ".cm-activeLine": { backgroundColor: "#ab75ff0d" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "#8b5cf64d",
    },
    ".cm-searchMatch": { backgroundColor: "#d49bff55" },
    ".cm-searchMatch-selected": { backgroundColor: "#f9c96599" },
    ".cm-foldPlaceholder": {
      backgroundColor: "#30253d",
      color: "#d9b9ff",
      border: "0",
    },
    ".cm-tooltip": {
      backgroundColor: "#211c2c",
      color: "#f5eeff",
      border: "1px solid #56416c",
    },
  },
  { dark: true },
);

export function BioCodeEditor({
  value,
  onChange,
  onFormat,
  onCopy,
}: BioCodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const openSearchRef = useRef<(replace?: boolean) => void>(() => {});
  const queryOptionsRef = useRef({
    query: "",
    replacement: "",
    matchCase: false,
    regexp: false,
    wholeWord: false,
  });
  const [findOpen, setFindOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [regexp, setRegexp] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchInfo, setMatchInfo] = useState({
    total: 0,
    current: 0,
    valid: true,
    limited: false,
  });
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const wrapCompartment = useRef(new Compartment());
  const [wrap, setWrap] = useState(false);
  const [position, setPosition] = useState({
    line: 1,
    column: 1,
    selected: 0,
    lines: 1,
    bytes: 0,
  });
  const [ready, setReady] = useState(false);
  const syncQueryFromRef = (view: EditorView) => {
    const options = queryOptionsRef.current;
    view.dispatch({
      effects: setSearchQuery.of(
        new SearchQuery({
          search: options.query,
          replace: options.replacement,
          caseSensitive: options.matchCase,
          regexp: options.regexp,
          wholeWord: options.wholeWord,
        }),
      ),
    });
  };

  queryOptionsRef.current = {
    query,
    replacement,
    matchCase,
    regexp,
    wholeWord,
  };

  const makeQuery = (options = queryOptionsRef.current) =>
    new SearchQuery({
      search: options.query,
      replace: options.replacement,
      caseSensitive: options.matchCase,
      regexp: options.regexp,
      wholeWord: options.wholeWord,
    });

  const refreshMatches = (view: EditorView) => {
    const spec = makeQuery();
    if (!spec.valid || !spec.search) {
      setMatchInfo({ total: 0, current: 0, valid: spec.valid, limited: false });
      return;
    }
    const cursor = spec.getCursor(view.state);
    const selected = view.state.selection.main;
    let total = 0;
    let current = 0;
    // Avoid hanging the UI on a massive document with thousands of hits.
    while (total < 10000) {
      const result = cursor.next();
      if (result.done) break;
      total++;
      if (
        result.value.from === selected.from &&
        result.value.to === selected.to
      )
        current = total;
    }
    setMatchInfo({ total, current, valid: true, limited: total === 10000 });
  };

  const syncQuery = (view: EditorView) => {
    view.dispatch({ effects: setSearchQuery.of(makeQuery()) });
    refreshMatches(view);
  };

  const openSearch = (replace = false) => {
    const view = viewRef.current;
    if (!view) return;
    const selected = view.state.selection.main;
    if (
      !queryOptionsRef.current.query &&
      !selected.empty &&
      selected.to - selected.from <= 200
    ) {
      const text = view.state.sliceDoc(selected.from, selected.to);
      if (!text.includes("\n")) setQuery(text);
    }
    setFindOpen(true);
    if (replace) setReplaceOpen(true);
    requestAnimationFrame(() =>
      (replace ? replaceInputRef : findInputRef).current?.focus(),
    );
  };
  openSearchRef.current = openSearch;

  const closeSearch = () => {
    setFindOpen(false);
    setReplaceOpen(false);
    viewRef.current?.dispatch({
      effects: setSearchQuery.of(new SearchQuery({ search: "" })),
    });
    viewRef.current?.focus();
  };

  const runSearchCommand = (command: (view: EditorView) => boolean) => {
    const view = viewRef.current;
    if (!view) return;
    const keepReplaceFocus = document.activeElement === replaceInputRef.current;
    syncQuery(view);
    command(view);
    refreshMatches(view);
    // Return focus to whichever search field initiated the action.
    requestAnimationFrame(() =>
      (keepReplaceFocus ? replaceInputRef : findInputRef).current?.focus(),
    );
  };

  // Stable CM view: prop changes never remount the editor or discard its selection.
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let savedWrap = false;
    try {
      savedWrap = window.localStorage.getItem(PREFERENCE) === "true";
    } catch {
      /* optional preference */
    }
    setWrap(savedWrap);
    const updateStatus = (view: EditorView) => {
      const selection = view.state.selection.main;
      const line = view.state.doc.lineAt(selection.head);
      setPosition({
        line: line.number,
        column: selection.head - line.from + 1,
        selected: selection.to - selection.from,
        lines: view.state.doc.lines,
        bytes: new TextEncoder().encode(view.state.doc.toString()).length,
      });
    };
    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        htmlLanguage(),
        oneDark,
        editorTheme,
        search(),
        Prec.high(
          keymap.of([
            {
              key: "Mod-f",
              run: () => {
                openSearchRef.current(false);
                return true;
              },
            },
            {
              key: "Mod-h",
              run: () => {
                openSearchRef.current(true);
                return true;
              },
            },
            {
              key: "F3",
              run: (view) => {
                syncQueryFromRef(view);
                findNext(view);
                return true;
              },
            },
            {
              key: "Shift-F3",
              run: (view) => {
                syncQueryFromRef(view);
                findPrevious(view);
                return true;
              },
            },
            {
              key: "Mod-g",
              run: (view) => {
                syncQueryFromRef(view);
                findNext(view);
                return true;
              },
            },
            {
              key: "Shift-Mod-g",
              run: (view) => {
                syncQueryFromRef(view);
                findPrevious(view);
                return true;
              },
            },
          ]),
        ),
        wrapCompartment.current.of(savedWrap ? EditorView.lineWrapping : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged)
            onChangeRef.current(update.state.doc.toString());
          if (update.docChanged || update.selectionSet) {
            updateStatus(update.view);
            if (queryOptionsRef.current.query) {
              const spec = new SearchQuery({
                search: queryOptionsRef.current.query,
                replace: queryOptionsRef.current.replacement,
                caseSensitive: queryOptionsRef.current.matchCase,
                regexp: queryOptionsRef.current.regexp,
                wholeWord: queryOptionsRef.current.wholeWord,
              });
              if (spec.valid) {
                let total = 0;
                let current = 0;
                const selection = update.state.selection.main;
                const cursor = spec.getCursor(update.state);
                while (total < 10000) {
                  const result = cursor.next();
                  if (result.done) break;
                  total++;
                  if (
                    result.value.from === selection.from &&
                    result.value.to === selection.to
                  )
                    current = total;
                }
                setMatchInfo({
                  total,
                  current,
                  valid: true,
                  limited: total === 10000,
                });
              }
            }
          }
        }),
      ],
    });
    const view = new EditorView({ state, parent: host });
    viewRef.current = view;
    updateStatus(view);
    setReady(true);
    return () => {
      viewRef.current = null;
      view.destroy();
    };
    // The view is intentionally mounted once; value is synchronized below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    const oldLength = view.state.doc.length;
    const anchor = Math.min(view.state.selection.main.anchor, value.length);
    const head = Math.min(view.state.selection.main.head, value.length);
    view.dispatch({
      changes: { from: 0, to: oldLength, insert: value },
      selection: { anchor, head },
    });
  }, [value]);

  const toggleWrap = () => {
    const next = !wrap;
    setWrap(next);
    try {
      window.localStorage.setItem(PREFERENCE, String(next));
    } catch {
      /* optional preference */
    }
    viewRef.current?.dispatch({
      effects: wrapCompartment.current.reconfigure(
        next ? EditorView.lineWrapping : [],
      ),
    });
  };
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !findOpen) return;
    syncQuery(view);
    // Control changes should update matches, without resetting editor selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, replacement, matchCase, regexp, wholeWord, findOpen]);

  const size = useMemo(
    () => (position.bytes / 1024).toFixed(2),
    [position.bytes],
  );

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <div className="flex min-h-[52px] shrink-0 items-center justify-between gap-2 border-b px-2 sm:px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Braces className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">HTML source</p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              Syntax highlighting · line numbers · find & replace
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => openSearch()}
            title="Find (Ctrl/Cmd + F)"
            aria-label="Find in HTML"
            disabled={!ready}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => openSearch(true)}
            title="Find and replace (Ctrl/Cmd + H)"
            aria-label="Find and replace"
            disabled={!ready}
          >
            <Replace className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant={wrap ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={toggleWrap}
            title="Toggle word wrap; line numbers remain visible"
            aria-label="Toggle word wrap"
          >
            <WrapText className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 cursor-pointer gap-1.5 px-2 sm:px-3"
            onClick={onFormat}
            title="Conservative formatting; preserves text and CSS attributes"
          >
            <WandSparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Format</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 cursor-pointer gap-1.5 px-2 sm:px-3"
            onClick={onCopy}
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Copy</span>
          </Button>
        </div>
      </div>
      {findOpen && (
        <div className="shrink-0 border-b border-violet-400/20 bg-[#17131f] px-3 py-3 text-[#f4ecff] shadow-[inset_0_1px_0_rgba(255,255,255,.04)] sm:px-4 sm:py-4">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-400/10 text-violet-300">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-5">
                    Find {replaceOpen ? "& replace" : "in HTML"}
                  </p>
                  <p className="text-[11px] text-[#a99ab9]">
                    Enter: next · Shift+Enter: previous · Esc: close
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 cursor-pointer text-[#b8a9ca] hover:bg-white/10 hover:text-white"
                onClick={closeSearch}
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9683ab]" />
                <Input
                  ref={findInputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      closeSearch();
                    }
                    if (event.key === "Enter") {
                      event.preventDefault();
                      runSearchCommand(
                        event.shiftKey ? findPrevious : findNext,
                      );
                    }
                  }}
                  className="h-11 w-full rounded-xl border-[#554465] bg-[#0e0b15] pl-10 pr-24 font-mono text-sm text-white placeholder:text-[#82738e] focus-visible:border-violet-400 focus-visible:ring-violet-400/20"
                  placeholder="Search HTML, styles, text…"
                  aria-label="Search HTML"
                  aria-invalid={!!query && !matchInfo.valid}
                />
                <span
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] tabular-nums text-[#ad9cb9]"
                  aria-live="polite"
                >
                  {!matchInfo.valid
                    ? "Invalid regex"
                    : !query
                      ? "0 results"
                      : matchInfo.total === 0
                        ? "No matches"
                        : `${matchInfo.current || "–"} / ${matchInfo.total}${matchInfo.limited ? "+" : ""}`}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 cursor-pointer border-[#554465] bg-[#211a2a] text-[#efddff] hover:bg-[#362744]"
                  disabled={!matchInfo.valid || !matchInfo.total}
                  onClick={() => runSearchCommand(findPrevious)}
                  aria-label="Previous result"
                  title="Previous result (Shift+Enter)"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 cursor-pointer border-[#554465] bg-[#211a2a] text-[#efddff] hover:bg-[#362744]"
                  disabled={!matchInfo.valid || !matchInfo.total}
                  onClick={() => runSearchCommand(findNext)}
                  aria-label="Next result"
                  title="Next result (Enter)"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-11 cursor-pointer gap-1.5 border-[#554465] bg-[#211a2a] px-3 text-[#efddff] hover:bg-[#362744]"
                  disabled={
                    !matchInfo.valid ||
                    !matchInfo.total ||
                    matchInfo.total > 1000
                  }
                  onClick={() => runSearchCommand(selectMatches)}
                  title="Select all matches (up to 1000)"
                >
                  <ListChecks className="h-4 w-4" />
                  <span className="hidden sm:inline">Select all</span>
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={matchCase}
                onClick={() => setMatchCase((v) => !v)}
                className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${matchCase ? "border-violet-400/60 bg-violet-400/20 text-white" : "border-[#47384f] bg-[#211a2a] text-[#b8a9ca] hover:text-white"}`}
              >
                <CaseSensitive className="h-3.5 w-3.5" /> Match case
              </button>
              <button
                type="button"
                aria-pressed={wholeWord}
                onClick={() => setWholeWord((v) => !v)}
                className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${wholeWord ? "border-violet-400/60 bg-violet-400/20 text-white" : "border-[#47384f] bg-[#211a2a] text-[#b8a9ca] hover:text-white"}`}
              >
                <WholeWord className="h-3.5 w-3.5" /> Whole word
              </button>
              <button
                type="button"
                aria-pressed={regexp}
                onClick={() => setRegexp((v) => !v)}
                className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${regexp ? "border-violet-400/60 bg-violet-400/20 text-white" : "border-[#47384f] bg-[#211a2a] text-[#b8a9ca] hover:text-white"}`}
              >
                <Regex className="h-3.5 w-3.5" /> Regex
              </button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 cursor-pointer text-[#c9b6d9] hover:bg-white/10 hover:text-white"
                onClick={() => setReplaceOpen((v) => !v)}
              >
                <Replace className="mr-1.5 h-3.5 w-3.5" />
                {replaceOpen ? "Hide replace" : "Show replace"}
              </Button>
            </div>
            {replaceOpen && (
              <div className="flex flex-col gap-2 border-t border-[#403349] pt-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Replace className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9683ab]" />
                  <Input
                    ref={replaceInputRef}
                    value={replacement}
                    onChange={(event) => setReplacement(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        closeSearch();
                      }
                      if (event.key === "Enter") {
                        event.preventDefault();
                        runSearchCommand(replaceNext);
                      }
                    }}
                    className="h-11 w-full rounded-xl border-[#554465] bg-[#0e0b15] pl-10 font-mono text-sm text-white placeholder:text-[#82738e] focus-visible:border-violet-400 focus-visible:ring-violet-400/20"
                    placeholder="Replace with…"
                    aria-label="Replacement text"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 flex-1 cursor-pointer border-[#554465] bg-[#211a2a] px-4 text-[#efddff] hover:bg-[#362744] sm:flex-none"
                    disabled={!query || !matchInfo.valid || !matchInfo.total}
                    onClick={() => runSearchCommand(replaceNext)}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-11 flex-1 cursor-pointer bg-violet-600 px-4 text-white hover:bg-violet-500 sm:flex-none"
                    disabled={
                      !query ||
                      !matchInfo.valid ||
                      !matchInfo.total ||
                      matchInfo.limited
                    }
                    onClick={() => runSearchCommand(replaceAll)}
                  >
                    Replace all · {matchInfo.total}
                  </Button>
                </div>
              </div>
            )}
            {query && !matchInfo.valid && (
              <p className="text-xs text-rose-300" role="alert">
                Invalid regular expression. Check the search pattern.
              </p>
            )}
          </div>
        </div>
      )}
      <div
        ref={hostRef}
        className="min-h-0 min-w-0 flex-1 overflow-hidden [&_.cm-editor]:h-full"
        aria-label="HTML code editor"
      />
      <div className="flex h-7 shrink-0 items-center justify-between gap-3 border-t bg-muted/10 px-3 font-mono text-[10px] text-muted-foreground">
        <span>
          Ln {position.line}, Col {position.column}
          {position.selected > 0 ? ` · ${position.selected} selected` : ""}
        </span>
        <span className="hidden sm:inline">
          {position.lines} lines · {size} KiB{wrap ? " · wrap" : ""}
        </span>
      </div>
    </section>
  );
}
