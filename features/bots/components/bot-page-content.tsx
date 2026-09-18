"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  BookOpenText,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Eye,
  EyeOff,
  MessageSquareText,
  ScrollText,
  SlidersHorizontal,
  Sparkles,
  TextQuote,
  Type,
  Columns2,
} from "lucide-react";
import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRONOUN_PRESETS,
  previewGreeting,
  type Pronouns,
  type PronounKey,
} from "@/features/bots/lib/greeting-preview";
import styles from "@/app/bots/[id]/bot-page.module.css";

type SectionId = "personality" | "scenario" | "greetings" | "examples";
type Section = {
  id: SectionId;
  title: string;
  content?: string;
  messages?: string[];
};
const ICONS = {
  personality: BookOpenText,
  scenario: Compass,
  greetings: MessageSquareText,
  examples: TextQuote,
} as const;

const markdownClass =
  "w-full min-w-0 max-w-none wrap-anywhere break-words text-sm leading-7 text-foreground/90 sm:text-[0.9375rem] sm:leading-8 [&>*:last-child]:mb-0 [&_a]:break-all [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_img]:h-auto [&_img]:max-w-full [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto";

function GreetingReader({
  messages,
  readingClass,
}: {
  messages: string[];
  readingClass: string;
}) {
  const [index, setIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<PronounKey>("they");
  const [custom, setCustom] = useState<Pronouns>({ ...PRONOUN_PRESETS.they });
  const [copied, setCopied] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareIndex, setCompareIndex] = useState(messages.length > 1 ? 1 : 0);
  const source = messages[index] || "";
  const pronouns = preset === "custom" ? custom : PRONOUN_PRESETS[preset];
  const preview = useMemo(
    () => previewGreeting(source, name, pronouns),
    [source, name, pronouns],
  );
  const displayed = previewEnabled ? preview.markdown : source;
  const compareSource = messages[compareIndex] || "";
  const comparePreview = useMemo(
    () => previewGreeting(compareSource, name, pronouns),
    [compareSource, name, pronouns],
  );
  const compared = previewEnabled ? comparePreview.markdown : compareSource;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        previewEnabled ? preview.text : source,
      );
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const selectMessage = (next: number) => {
    setIndex(next);
    setCopied(false);
    if (next === compareIndex && messages.length > 1) {
      setCompareIndex(next === 0 ? 1 : 0);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Sparkles
            className="h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span>Read one opening at a time</span>
        </div>
        <div
          className="flex w-full min-w-0 items-center gap-1 overflow-x-auto pb-1 sm:w-auto sm:pb-0"
          role="group"
          aria-label="Choose an initial message"
        >
          {messages.map((_, n) => (
            <button
              key={n}
              type="button"
              onClick={() => selectMessage(n)}
              aria-label={`Read message ${n + 1}`}
              aria-pressed={n === index}
              className={`${styles.messageTab} min-h-9 min-w-9 shrink-0 cursor-pointer rounded-lg border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
              data-active={n === index}
            >
              {String(n + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`${styles.reader} min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-muted/15`}
      >
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-foreground/85">
            <ScrollText
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>
              Message {index + 1}{" "}
              <span className="font-normal text-muted-foreground">
                / {messages.length}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-pressed={previewEnabled}
              onClick={() => {
                setPreviewEnabled((value) => !value);
                setCopied(false);
              }}
              className={`${styles.readerAction} inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
            >
              {previewEnabled ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
              {previewEnabled ? "Preview on" : "Original"}
            </button>
            <button
              type="button"
              aria-expanded={settingsOpen}
              aria-controls="greeting-preview-settings"
              onClick={() => setSettingsOpen((value) => !value)}
              className={`${styles.readerAction} inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Customize
              <ChevronDown
                className={`${styles.settingsChevron} h-3.5 w-3.5`}
                data-open={settingsOpen}
              />
            </button>
            {messages.length > 1 && (
              <button
                type="button"
                aria-pressed={compareOpen}
                onClick={() => {
                  setCompareOpen((value) => !value);
                  setCopied(false);
                }}
                className={`${styles.readerAction} inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                data-active={compareOpen}
              >
                <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                {compareOpen ? "Exit compare" : "Compare"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void copy()}
              className={`${styles.readerAction} inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
              aria-label="Copy the currently selected message"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div
          id="greeting-preview-settings"
          className={styles.settingsPanel}
          data-open={settingsOpen}
          inert={!settingsOpen}
          aria-hidden={!settingsOpen}
        >
          <div className={styles.accordionInner}>
            <div className="grid min-w-0 gap-4 border-b border-border/60 bg-primary/[0.035] px-3 py-4 sm:px-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div className="min-w-0 space-y-2">
                <label
                  htmlFor="greeting-reader-name"
                  className="block text-xs font-semibold"
                >
                  Preview name
                </label>
                <input
                  id="greeting-reader-name"
                  type="text"
                  autoComplete="off"
                  maxLength={64}
                  placeholder="Your character name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setCopied(false);
                  }}
                  className="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
                />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Used only for this preview. Nothing is saved.
                </p>
              </div>
              <div className="min-w-0 space-y-2">
                <label
                  htmlFor="greeting-pronoun-preset"
                  className="block text-xs font-semibold"
                >
                  Pronouns
                </label>
                <Select
                  value={preset}
                  onValueChange={(value) => {
                    setPreset(value as PronounKey);
                    setCopied(false);
                  }}
                >
                  <SelectTrigger
                    id="greeting-pronoun-preset"
                    aria-label="Pronouns"
                    className="h-10 w-full min-w-0 cursor-pointer bg-background text-sm"
                  >
                    <SelectValue placeholder="Choose pronouns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="they" className="cursor-pointer">
                      They / them
                    </SelectItem>
                    <SelectItem value="she" className="cursor-pointer">
                      She / her
                    </SelectItem>
                    <SelectItem value="he" className="cursor-pointer">
                      He / him
                    </SelectItem>
                    <SelectItem value="custom" className="cursor-pointer">
                      Custom pronouns
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Independent of gender; customize every form if needed.
                </p>
              </div>
              {preset === "custom" && (
                <fieldset className="min-w-0 md:col-span-2">
                  <legend className="mb-2 text-xs font-semibold">
                    Custom macro values
                  </legend>
                  <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {(["subj", "obj", "poss", "poss_pr", "refl"] as const).map(
                      (key) => (
                        <label
                          key={key}
                          className="min-w-0 space-y-1 text-[11px] text-muted-foreground"
                        >
                          <span className="font-mono">{`{{${key}}}`}</span>
                          <input
                            type="text"
                            maxLength={64}
                            autoComplete="off"
                            value={custom[key]}
                            onChange={(event) => {
                              setCustom((previous) => ({
                                ...previous,
                                [key]: event.target.value,
                              }));
                              setCopied(false);
                            }}
                            className="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
                          />
                        </label>
                      ),
                    )}
                  </div>
                </fieldset>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-2">
                <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                  Replaces <code>{"{{user}}"}</code> and JAI pronoun macros in
                  the preview.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewEnabled(true);
                    setSettingsOpen(false);
                    setCopied(false);
                  }}
                  className="min-h-9 cursor-pointer rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Apply preview
                </button>
              </div>
            </div>
          </div>
        </div>

        {compareOpen && messages.length > 1 && (
          <div className="flex min-w-0 flex-col gap-3 border-b border-border/60 bg-primary/[0.035] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold">Compare opening messages</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                View two variants together. The original bot remains unchanged.
              </p>
            </div>
            <div className="flex min-w-0 items-center gap-2 sm:shrink-0">
              <label
                htmlFor="greeting-compare-target"
                className="shrink-0 text-xs text-muted-foreground"
              >
                Against
              </label>
              <Select
                value={String(compareIndex)}
                onValueChange={(value) => setCompareIndex(Number(value))}
              >
                <SelectTrigger
                  id="greeting-compare-target"
                  aria-label="Choose the message to compare"
                  className="h-10 min-w-0 flex-1 cursor-pointer bg-background text-xs sm:w-36 sm:flex-none"
                >
                  <SelectValue placeholder="Choose a message" />
                </SelectTrigger>
                <SelectContent>
                  {messages.map((_, other) =>
                    other !== index ? (
                      <SelectItem
                        key={other}
                        value={String(other)}
                        className="cursor-pointer"
                      >
                        Message {other + 1}
                      </SelectItem>
                    ) : null,
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <div
          key={`${index}:${compareOpen}:${compareIndex}:${previewEnabled}`}
          className={`${styles.readerBody} min-w-0 ${compareOpen && messages.length > 1 ? "grid gap-3 p-3 sm:p-5 lg:grid-cols-2" : "px-3 py-5 sm:px-6 sm:py-7"}`}
        >
          <div
            className={
              compareOpen && messages.length > 1
                ? "min-w-0 rounded-xl border border-primary/25 bg-background/60 p-3 sm:p-5"
                : "min-w-0"
            }
          >
            {compareOpen && messages.length > 1 && (
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">
                Message {index + 1} · Selected
              </p>
            )}
            <MarkdownRenderer
              content={displayed}
              className={`${markdownClass} ${readingClass}`}
            />
            {previewEnabled && preview.unresolved.length > 0 && (
              <p
                role="status"
                className="mt-5 break-words rounded-lg border border-warning/35 bg-warning/5 p-3 text-xs leading-relaxed text-muted-foreground"
              >
                Unresolved macros: {preview.unresolved.join(", ")}. They remain
                unchanged.
              </p>
            )}
          </div>
          {compareOpen && messages.length > 1 && (
            <div className="min-w-0 rounded-xl border border-border/70 bg-background/60 p-3 sm:p-5">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Message {compareIndex + 1} · Comparison
              </p>
              <MarkdownRenderer
                content={compared}
                className={`${markdownClass} ${readingClass}`}
              />
              {previewEnabled && comparePreview.unresolved.length > 0 && (
                <p
                  role="status"
                  className="mt-5 break-words rounded-lg border border-warning/35 bg-warning/5 p-3 text-xs leading-relaxed text-muted-foreground"
                >
                  Unresolved macros: {comparePreview.unresolved.join(", ")}.
                  They remain unchanged.
                </p>
              )}
            </div>
          )}
        </div>
        {messages.length > 1 && (
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 border-t border-border/60 px-2 py-3 min-[380px]:gap-3 min-[380px]:px-3 sm:px-5">
            <button
              type="button"
              onClick={() => selectMessage(Math.max(0, index - 1))}
              disabled={index === 0}
              className="inline-flex min-h-10 min-w-0 w-full cursor-pointer items-center justify-center gap-0.5 rounded-lg border border-border/60 bg-background/50 px-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto sm:gap-1 sm:border-transparent sm:bg-transparent sm:px-2"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="whitespace-nowrap px-1 text-center text-[11px] tabular-nums text-muted-foreground">
              {index + 1} of {messages.length}
            </span>
            <button
              type="button"
              onClick={() =>
                selectMessage(Math.min(messages.length - 1, index + 1))
              }
              disabled={index === messages.length - 1}
              className="inline-flex min-h-10 min-w-0 w-full cursor-pointer items-center justify-center gap-0.5 rounded-lg border border-border/60 bg-background/50 px-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto sm:justify-self-end sm:gap-1 sm:border-transparent sm:bg-transparent sm:px-2"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function BotPageContent({
  personality,
  scenario,
  messages,
  examples,
}: {
  personality?: string | null;
  scenario?: string | null;
  messages: string[];
  examples?: string | null;
}) {
  const sections = useMemo<Section[]>(() => {
    // Type the array before filtering so literal IDs remain SectionId.
    const candidates: Section[] = [
      { id: "personality", title: "Personality", content: personality || "" },
      { id: "scenario", title: "Scenario", content: scenario || "" },
      { id: "greetings", title: "Initial messages", messages },
      { id: "examples", title: "Example dialogues", content: examples || "" },
    ];
    return candidates.filter((section) =>
      section.id === "greetings"
        ? messages.length > 0
        : Boolean(section.content?.trim()),
    );
  }, [personality, scenario, messages, examples]);
  const [expanded, setExpanded] = useState<SectionId[]>(() =>
    sections.length ? [sections[0].id] : [],
  );
  const [activeSection, setActiveSection] = useState<SectionId | null>(
    sections[0]?.id || null,
  );
  const [readingProgress, setReadingProgress] = useState(0);
  const [copiedSection, setCopiedSection] = useState<SectionId | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  // Temporary reading preferences: never persisted or sent to a server.
  const [readerSettingsOpen, setReaderSettingsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [readingSize, setReadingSize] = useState<"normal" | "large">("normal");
  const [readingWidth, setReadingWidth] = useState<"full" | "focused">("full");
  const readingClass = `${styles.readingText} ${readingSize === "large" ? styles.readingLarge : ""}`;
  const readingWidthClass =
    readingWidth === "focused" ? styles.readingFocused : "";

  useEffect(() => {
    const update = () => {
      let candidate: SectionId | null = null;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= 200)
          candidate = section.id;
      }
      setActiveSection(candidate || sections[0]?.id || null);
      const available = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      setReadingProgress(
        Math.max(0, Math.min(100, (window.scrollY / available) * 100)),
      );
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sections]);

  const copySection = async (id: SectionId, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSection(id);
      setCopyError(null);
    } catch {
      setCopiedSection(null);
      setCopyError(
        "Could not copy this section. Check your browser permissions.",
      );
    }
  };

  const jumpTo = useCallback((id: SectionId) => {
    setExpanded((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setActiveSection(id);
    // Reduce the sticky bar before scrolling so the section heading stays visible on phones.
    setMobileNavOpen(false);
    setReaderSettingsOpen(false);
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "start",
        }),
      ),
    );
  }, []);

  if (!sections.length) return null;
  const allExpanded = sections.every((section) =>
    expanded.includes(section.id),
  );

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <nav
        aria-label="Character sections"
        data-mobile-open={mobileNavOpen}
        className={`${styles.sectionNav} relative sticky top-2 z-20 flex min-w-0 flex-col items-stretch gap-2 rounded-2xl border border-border/70 bg-background/90 p-2 pb-5 shadow-lg shadow-primary/5 backdrop-blur-xl sm:flex-row sm:flex-wrap sm:items-center sm:p-3 sm:pb-5`}
      >
        <div className="flex min-w-0 shrink-0 items-center justify-between gap-2 border-b border-border/70 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary sm:mr-2 sm:border-b-0 sm:border-r sm:px-3 sm:pr-5">
          <span className="inline-flex items-center gap-2">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" /> Navigate
          </span>
          <button
            type="button"
            aria-label={
              mobileNavOpen
                ? "Collapse section navigation"
                : "Expand section navigation"
            }
            aria-expanded={mobileNavOpen}
            aria-controls="bot-mobile-navigation"
            onClick={() => {
              setMobileNavOpen((value) => !value);
              setReaderSettingsOpen(false);
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border/70 bg-card/75 px-2.5 text-[11px] font-semibold normal-case tracking-normal text-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:hidden"
          >
            {mobileNavOpen ? "Hide" : "Sections"}
            <ChevronDown
              className={`${styles.settingsChevron} h-3.5 w-3.5`}
              data-open={mobileNavOpen}
              aria-hidden="true"
            />
          </button>
        </div>
        <div
          id="bot-mobile-navigation"
          className={styles.navControls}
          data-open={mobileNavOpen}
        >
          <div
            className={`${styles.navControlsInner} flex min-w-0 flex-col gap-2 sm:contents`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  aria-current={
                    activeSection === section.id ? "location" : undefined
                  }
                  onClick={() => jumpTo(section.id)}
                  data-active={activeSection === section.id}
                  className={`${styles.navLink} inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm`}
                >
                  {section.title}
                  {section.id === "greetings" && messages.length > 1 && (
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                      {messages.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-expanded={readerSettingsOpen}
              aria-controls="bot-reading-settings"
              onClick={() => setReaderSettingsOpen((value) => !value)}
              className={`${styles.readingButton} inline-flex min-h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border/70 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:ml-auto`}
            >
              <Type className="h-3.5 w-3.5" aria-hidden="true" /> Reading{" "}
              <ChevronDown
                className={`${styles.settingsChevron} h-3.5 w-3.5`}
                data-open={readerSettingsOpen}
                aria-hidden="true"
              />
            </button>
            {sections.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setExpanded(
                    allExpanded ? [] : sections.map((section) => section.id),
                  )
                }
                className="inline-flex min-h-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border/70 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {allExpanded ? "Collapse all" : "Expand all"}
              </button>
            )}
          </div>
        </div>
        {/* The preferences panel lives INSIDE the sticky bar: it opens below the controls even after scrolling. */}
        <div
          id="bot-reading-settings"
          className={styles.readingSettings}
          data-open={readerSettingsOpen}
          inert={!readerSettingsOpen}
          aria-hidden={!readerSettingsOpen}
        >
          <div className={styles.accordionInner}>
            <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-primary/20 bg-card/95 px-3 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold">Reading preferences</p>
                <p className="text-[11px] text-muted-foreground">
                  Only changes how this page looks. Full width is the default.
                </p>
              </div>
              <div
                className="grid w-full min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:w-auto sm:grid-cols-2"
                role="group"
                aria-label="Reading preferences"
              >
                <div
                  className="flex w-full min-w-0 items-center gap-1 rounded-lg border border-border/70 bg-background p-1"
                  role="group"
                  aria-label="Text size"
                >
                  <button
                    type="button"
                    aria-pressed={readingSize === "normal"}
                    onClick={() => setReadingSize("normal")}
                    className={`${styles.preferenceButton} min-h-9 min-w-0 flex-1 cursor-pointer rounded-md px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                    data-active={readingSize === "normal"}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    aria-pressed={readingSize === "large"}
                    onClick={() => setReadingSize("large")}
                    className={`${styles.preferenceButton} min-h-9 min-w-0 flex-1 cursor-pointer rounded-md px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                    data-active={readingSize === "large"}
                  >
                    Larger A+
                  </button>
                </div>
                <div
                  className="flex w-full min-w-0 items-center gap-1 rounded-lg border border-border/70 bg-background p-1"
                  role="group"
                  aria-label="Text width"
                >
                  <button
                    type="button"
                    aria-pressed={readingWidth === "full"}
                    onClick={() => setReadingWidth("full")}
                    className={`${styles.preferenceButton} min-h-9 min-w-0 flex-1 cursor-pointer rounded-md px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                    data-active={readingWidth === "full"}
                  >
                    Full width
                  </button>
                  <button
                    type="button"
                    aria-pressed={readingWidth === "focused"}
                    onClick={() => setReadingWidth("focused")}
                    className={`${styles.preferenceButton} min-h-9 min-w-0 flex-1 cursor-pointer rounded-md px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                    data-active={readingWidth === "focused"}
                  >
                    Focused
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <span aria-hidden="true" className={styles.readingProgressTrack}>
          <span
            className={styles.readingProgress}
            style={{ width: `${readingProgress}%` }}
          />
        </span>
      </nav>
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5">
        {sections.map((section, position) => {
          const Icon = ICONS[section.id];
          const opened = expanded.includes(section.id);
          const panelId = `${section.id}-panel`;
          return (
            <section
              key={section.id}
              id={section.id}
              className={`${styles.contentSection} ${styles.reveal} min-w-0 scroll-mt-44 overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm sm:scroll-mt-28`}
              style={{ animationDelay: `${Math.min(position, 4) * 85}ms` }}
              data-open={opened}
            >
              <div
                className={`${styles.sectionHeader} group/section-header flex w-full min-w-0 items-center gap-1 pr-3 sm:pr-5`}
              >
                <h2 className="m-0 min-w-0 flex-1">
                  <button
                    type="button"
                    aria-expanded={opened}
                    aria-controls={panelId}
                    onClick={() =>
                      setExpanded((current) =>
                        current.includes(section.id)
                          ? current.filter((item) => item !== section.id)
                          : [...current, section.id],
                      )
                    }
                    className="group flex w-full min-w-0 cursor-pointer items-center gap-3 px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:gap-4 sm:px-7 sm:py-5"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-all duration-300 group-hover:-rotate-6 group-hover:scale-105 group-hover:bg-primary/15"
                      aria-hidden="true"
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-primary/80">
                        Character file / {String(position + 1).padStart(2, "0")}
                      </span>
                      <span className="mt-0.5 block text-lg font-semibold tracking-tight sm:text-xl">
                        {section.title}
                      </span>
                    </span>
                    {section.id === "greetings" && (
                      <span className="hidden rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground sm:inline">
                        {messages.length}{" "}
                        {messages.length === 1 ? "message" : "messages"}
                      </span>
                    )}
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-all duration-300 group-hover:border-primary/30 group-hover:text-primary"
                      aria-hidden="true"
                    >
                      <ChevronDown className={`${styles.chevron} h-4 w-4`} />
                    </span>
                  </button>
                </h2>
                {section.id !== "greetings" && section.content?.trim() && (
                  <button
                    type="button"
                    onClick={() =>
                      void copySection(section.id, section.content || "")
                    }
                    aria-label={`Copy ${section.title} Markdown`}
                    title={`Copy ${section.title} Markdown`}
                    className={`${styles.sectionCopy} inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                  >
                    {copiedSection === section.id ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
              <div
                id={panelId}
                aria-hidden={!opened}
                inert={!opened}
                className={styles.accordion}
                data-open={opened}
              >
                <div className={styles.accordionInner}>
                  <div
                    className={`min-w-0 w-full border-t border-border/60 px-4 pb-5 pt-5 sm:px-7 sm:pb-7 sm:pt-6 lg:px-9 ${readingWidthClass}`}
                  >
                    {section.id === "greetings" ? (
                      <GreetingReader
                        messages={messages}
                        readingClass={readingClass}
                      />
                    ) : (
                      <MarkdownRenderer
                        content={section.content || ""}
                        className={`${markdownClass} ${readingClass}`}
                      />
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <span aria-live="polite" className="sr-only">
        {copyError ||
          (copiedSection
            ? `${sections.find((section) => section.id === copiedSection)?.title || "Section"} copied`
            : "")}
      </span>
      {readingProgress > 18 && (
        <button
          type="button"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
            })
          }
          aria-label="Back to top"
          className={`${styles.backToTop} fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-30 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-primary/25 bg-card/95 text-primary shadow-lg backdrop-blur-md transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:bottom-6 sm:right-6`}
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
