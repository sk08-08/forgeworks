"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Braces,
  Check,
  ChevronDown,
  Code2,
  Terminal,
  Copy,
  FileText,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  MarkdownRenderer,
  extractMarkdownHeadings,
  type MarkdownHeading,
} from "@/features/markdown/components/markdown-renderer";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";
import {
  CHANGELOG_AREAS,
  type ChangelogEntry,
} from "@/features/changelog/types";
import { TechnicalTerminal } from "./technical-terminal";

function formatDate(value: string | null) {
  if (!value) return "UNPUBLISHED";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  })
    .format(new Date(value))
    .toUpperCase();
}

function releaseLabel(entry: ChangelogEntry) {
  if (entry.releaseType === "archive") return "ARCHIVE";
  if (entry.version) return `V${entry.version.replace(/^v/i, "")}`;
  if (entry.releaseNumber != null) {
    return `RELEASE ${String(entry.releaseNumber).padStart(3, "0")}`;
  }
  return "BETA UPDATE";
}

function ReleaseNumber({ entry }: { entry: ChangelogEntry }) {
  const value =
    entry.releaseNumber != null
      ? String(entry.releaseNumber).padStart(3, "0")
      : entry.releaseType === "archive"
        ? "000"
        : entry.version?.replace(/^v/i, "") || "β";

  return (
    <span className="fw-changelog-release-number" aria-hidden="true">
      {value}
    </span>
  );
}

function HeroStar() {
  return (
    <svg
      className="fw-changelog-hero-star"
      aria-hidden="true"
      viewBox="0 0 100 100"
      fill="none"
    >
      <path
        d="M50 3 59 34 83 17 67 42 97 50 67 58 83 83 59 66 50 97 41 66 17 83 33 58 3 50 33 42 17 17 41 34Z"
        fill="currentColor"
      />
    </svg>
  );
}

type ChangelogNavSection = MarkdownHeading & {
  kind: "heading" | "technical";
};

const heroSymbols = [
  { id: "bot", label: "BOT", icon: Bot, className: "fw-cl-symbol-a" },
  { id: "forms", label: "FORMS", icon: FileText, className: "fw-cl-symbol-b" },
  { id: "atlas", label: "ATLAS", icon: BookOpen, className: "fw-cl-symbol-c" },
  {
    id: "community",
    label: "COMMUNITY",
    icon: Users,
    className: "fw-cl-symbol-d",
  },
  { id: "code", label: "BUILD", icon: Code2, className: "fw-cl-symbol-e" },
  { id: "system", label: "SYSTEM", icon: Braces, className: "fw-cl-symbol-f" },
] as const;

export function ChangelogPage({ entries }: { entries: ChangelogEntry[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("All");
  const [releaseType, setReleaseType] = useState("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileSectionsOpen, setMobileSectionsOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState(entries[0]?.slug || "");
  const [activeSectionId, setActiveSectionId] = useState("");
  const [headerHidden, setHeaderHidden] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const navigationTargetRef = useRef<string | null>(null);
  const lastScrollYRef = useRef(0);
  const headerHiddenRef = useRef(false);
  const navigationSettleTimerRef = useRef<number | null>(null);

  const areas = useMemo(() => {
    const used = new Set(entries.flatMap((entry) => entry.areas));
    return [
      "All",
      ...CHANGELOG_AREAS.filter((item) => used.has(item)),
      ...Array.from(used).filter(
        (item) => !CHANGELOG_AREAS.includes(item as any),
      ),
    ];
  }, [entries]);

  const releaseTypes = useMemo(() => {
    const used = new Set(entries.map((entry) => entry.releaseType));
    return [
      ["all", "All releases"],
      ["major", "Major"],
      ["minor", "Minor"],
      ["patch", "Patches"],
      ["development", "Development"],
      ["archive", "Archive"],
    ].filter(([value]) => value === "all" || used.has(value as any));
  }, [entries]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return entries.filter((entry) => {
      if (area !== "All" && !entry.areas.includes(area)) return false;
      if (releaseType !== "all" && entry.releaseType !== releaseType) {
        return false;
      }

      if (!normalized) return true;

      const haystack = [
        entry.title,
        entry.headline,
        entry.summary,
        stripMarkdownToText(entry.bodyMarkdown),
        stripMarkdownToText(entry.technicalMarkdown),
        entry.version || "",
        ...entry.areas,
        ...entry.changeTypes,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [entries, query, area, releaseType]);

  const filtersActive =
    Boolean(query.trim()) || area !== "All" || releaseType !== "all";

  const activeFilterCount =
    Number(area !== "All") + Number(releaseType !== "all");

  const hasAreaFilters = areas.length > 1;
  const hasReleaseFilters = releaseTypes.length > 1;
  const hasOptionalFilters = hasAreaFilters || hasReleaseFilters;

  const sectionsBySlug = useMemo(() => {
    const map = new Map<string, ChangelogNavSection[]>();

    for (const entry of filtered) {
      const sections: ChangelogNavSection[] = extractMarkdownHeadings(
        entry.bodyMarkdown,
        entry.slug,
      ).map((heading) => ({
        ...heading,
        kind: "heading" as const,
      }));

      if (entry.technicalMarkdown?.trim()) {
        sections.push({
          level: 1,
          title: "Technical notes",
          id: `${entry.slug}--technical-notes`,
          line: Number.MAX_SAFE_INTEGER,
          kind: "technical",
        });
      }

      map.set(entry.slug, sections);
    }

    return map;
  }, [filtered]);

  const activeEntry =
    filtered.find((entry) => entry.slug === activeSlug) || filtered[0] || null;
  const activeSections = activeEntry
    ? sectionsBySlug.get(activeEntry.slug) || []
    : [];
  const activeSection =
    activeSections.find((section) => section.id === activeSectionId) || null;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const revealNodes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-changelog-reveal]"),
    );
    const releaseNodes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-changelog-release]"),
    );

    const revealObserver = new IntersectionObserver(
      (items) => {
        for (const item of items) {
          if (item.isIntersecting) {
            (item.target as HTMLElement).dataset.visible = "true";
            revealObserver.unobserve(item.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    revealNodes.forEach((node) => revealObserver.observe(node));

    let frame = 0;

    const updateActiveRelease = () => {
      if (releaseNodes.length === 0) {
        setActiveSlug("");
        return;
      }

      /*
       * During a click-triggered smooth scroll, keep the destination highlighted.
       * Otherwise the scroll spy would briefly reactivate every release crossed
       * on the way there, producing the "there and back" dot animation.
       */
      if (navigationTargetRef.current) {
        return;
      }

      /*
       * Use a stable reading line instead of intersection ratios. Long entries
       * can remain intersecting for several viewports, which made the first
       * release stay active even after the reader had moved to another one.
       */
      const readingLine = Math.min(
        window.innerHeight * 0.32,
        Math.max(180, window.innerHeight * 0.24),
      );

      let activeNode = releaseNodes[0];

      for (const node of releaseNodes) {
        const rect = node.getBoundingClientRect();

        if (rect.top <= readingLine) {
          activeNode = node;
          continue;
        }

        break;
      }

      const nextSlug = activeNode.dataset.changelogRelease || "";
      setActiveSlug((current) => (current === nextSlug ? current : nextSlug));

      const sectionNodes = Array.from(
        activeNode.querySelectorAll<HTMLElement>("[data-changelog-section]"),
      );

      let nextSectionId = "";

      for (const node of sectionNodes) {
        const rect = node.getBoundingClientRect();

        if (rect.top <= readingLine) {
          nextSectionId = node.id;
          continue;
        }

        break;
      }

      setActiveSectionId((current) =>
        current === nextSectionId ? current : nextSectionId,
      );
    };

    const settleProgrammaticNavigation = () => {
      if (!navigationTargetRef.current) return;

      if (navigationSettleTimerRef.current) {
        window.clearTimeout(navigationSettleTimerRef.current);
      }

      navigationSettleTimerRef.current = window.setTimeout(() => {
        navigationTargetRef.current = null;
        navigationSettleTimerRef.current = null;
        updateActiveRelease();
      }, 140);
    };

    const onScroll = () => {
      if (frame) return;

      frame = requestAnimationFrame(() => {
        frame = 0;

        const currentScrollY = window.scrollY;
        const y = Math.min(currentScrollY, window.innerHeight * 1.4);
        root.style.setProperty("--changelog-scroll", `${y}px`);

        const previousScrollY = lastScrollYRef.current;
        const delta = currentScrollY - previousScrollY;
        const nearTop = currentScrollY < 96;

        if (nearTop) {
          if (headerHiddenRef.current) {
            headerHiddenRef.current = false;
            setHeaderHidden(false);
          }
        } else if (Math.abs(delta) >= 10) {
          const nextHidden = delta > 0;

          if (headerHiddenRef.current !== nextHidden) {
            headerHiddenRef.current = nextHidden;
            setHeaderHidden(nextHidden);
          }
        }

        lastScrollYRef.current = currentScrollY;

        if (navigationTargetRef.current) {
          settleProgrammaticNavigation();
        } else {
          updateActiveRelease();
        }
      });
    };

    const onResize = () => {
      onScroll();
    };

    lastScrollYRef.current = window.scrollY;

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    updateActiveRelease();

    return () => {
      revealObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
      if (navigationSettleTimerRef.current) {
        window.clearTimeout(navigationSettleTimerRef.current);
        navigationSettleTimerRef.current = null;
      }
    };
  }, [filtered]);

  const navigateToRelease = (
    event: React.MouseEvent<HTMLAnchorElement>,
    slug: string,
  ) => {
    event.preventDefault();

    const target = document.getElementById(slug);
    if (!target) return;

    navigationTargetRef.current = slug;

    if (navigationSettleTimerRef.current) {
      window.clearTimeout(navigationSettleTimerRef.current);
      navigationSettleTimerRef.current = null;
    }

    setActiveSlug(slug);
    setActiveSectionId("");
    window.history.replaceState(null, "", `#${slug}`);
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  const navigateToSection = (
    sectionId: string,
    entrySlug: string,
  ) => {
    const target = document.getElementById(sectionId);
    if (!target) return;

    navigationTargetRef.current = sectionId;

    if (navigationSettleTimerRef.current) {
      window.clearTimeout(navigationSettleTimerRef.current);
      navigationSettleTimerRef.current = null;
    }

    setActiveSlug(entrySlug);
    setActiveSectionId(sectionId);
    setMobileSectionsOpen(false);
    window.history.replaceState(null, "", `#${sectionId}`);

    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  const copyAnchor = async (slug: string) => {
    const url = `${window.location.origin}/changelog#${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      window.setTimeout(() => setCopiedSlug(null), 1400);
    } catch {
      setCopiedSlug(null);
    }
  };

  const resetFilters = () => {
    setQuery("");
    setArea("All");
    setReleaseType("all");
  };

  useEffect(() => {
    if (!activeSectionId) return;

    const rail = rootRef.current?.querySelector<HTMLElement>(
      ".fw-changelog-rail",
    );
    const activeItem = rail?.querySelector<HTMLElement>(
      `[data-section-nav-id="${CSS.escape(activeSectionId)}"]`,
    );

    if (!rail || !activeItem) return;

    const railRect = rail.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const topGuard = railRect.top + 72;
    const bottomGuard = railRect.bottom - 40;

    if (itemRect.top < topGuard || itemRect.bottom > bottomGuard) {
      activeItem.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "nearest",
      });
    }
  }, [activeSectionId]);

  return (
    <div
      ref={rootRef}
      className="fw-changelog fw-changelog-v3"
      data-header-hidden={headerHidden ? "true" : "false"}
    >
      <header className="fw-changelog-topbar">
        <Link
          href="/"
          className="fw-changelog-brand"
          aria-label="Forgeworks home"
        >
          <Image src="/logo.svg" width={30} height={30} alt="" />
          <span>
            Forgeworks <small>BETA</small>
          </span>
        </Link>

        <div className="fw-changelog-topbar-actions">
          <span className="fw-changelog-topbar-label">RELEASE ARCHIVE</span>
          <Link href="/" className="fw-changelog-open-app">
            Open Forgeworks <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>

      <main>
        <section className="fw-changelog-hero">
          <div className="fw-cl-hero-dots" aria-hidden="true" />
          <div className="fw-cl-hero-grain" aria-hidden="true" />
          <div
            className="fw-cl-hero-glow fw-cl-hero-glow-a"
            aria-hidden="true"
          />
          <div
            className="fw-cl-hero-glow fw-cl-hero-glow-b"
            aria-hidden="true"
          />
          <div
            className="fw-cl-hero-glow fw-cl-hero-glow-c"
            aria-hidden="true"
          />

          <div className="fw-cl-hero-symbols" aria-hidden="true">
            {heroSymbols.map(({ id, label, icon: Icon, className }) => (
              <div key={id} className={`fw-cl-symbol ${className}`}>
                <span className="fw-cl-symbol-icon">
                  <Icon size={16} />
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="fw-changelog-hero-copy" data-changelog-reveal>
            <p className="fw-changelog-kicker">
              <span /> CHANGE / LOG
            </p>

            <h1>
              <span>We started</span>
              <br />
              <em>
                writing it down.
                <HeroStar />
              </em>
            </h1>

            <p className="fw-changelog-hero-lede">
              Every useful fix, rebuilt system, strange idea and technical
              detail — kept in one place this time.
            </p>

            <div className="fw-changelog-hero-meta">
              <span>{entries.length} published entries</span>
              <span>Built during Beta</span>
              <span>Technical notes included</span>
            </div>
          </div>

          <a href="#releases" className="fw-changelog-scroll-cue">
            <span>SCROLL THE BUILD LOG</span>
            <i />
          </a>
        </section>

        <section className="fw-changelog-controls" id="releases">
          <div
            className="fw-cl-filterbar"
            data-has-filters={hasOptionalFilters ? "true" : "false"}
          >
            <div className="fw-changelog-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search releases, fixes, areas..."
                aria-label="Search changelog"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {hasOptionalFilters && (
              <div className="fw-cl-filterbar-desktop">
                {hasAreaFilters && (
                  <div className="fw-cl-filter-cluster">
                    <span className="fw-cl-filter-label">AREA</span>
                    <div
                      className="fw-changelog-filter-row"
                      aria-label="Filter by area"
                    >
                      {areas.map((item) => (
                        <button
                          type="button"
                          key={item}
                          data-active={area === item ? "true" : "false"}
                          onClick={() => setArea(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {hasAreaFilters && hasReleaseFilters && (
                  <span className="fw-cl-filter-divider" aria-hidden="true" />
                )}

                {hasReleaseFilters && (
                  <div className="fw-cl-filter-cluster">
                    <span className="fw-cl-filter-label">RELEASE</span>
                    <div className="fw-changelog-release-filter">
                      {releaseTypes.map(([value, label]) => (
                        <button
                          type="button"
                          key={value}
                          data-active={releaseType === value ? "true" : "false"}
                          onClick={() => setReleaseType(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {filtersActive && (
                  <button
                    type="button"
                    className="fw-changelog-reset-filter"
                    onClick={resetFilters}
                  >
                    Reset
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {hasOptionalFilters && (
              <>
                <div className="fw-cl-filterbar-mobile">
                  <button
                    type="button"
                    className="fw-cl-more-filters"
                    data-open={mobileFiltersOpen ? "true" : "false"}
                    onClick={() => setMobileFiltersOpen((value) => !value)}
                    aria-expanded={mobileFiltersOpen}
                  >
                    <SlidersHorizontal size={15} />
                    More filters
                    {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
                    <ChevronDown size={15} />
                  </button>

                  {filtersActive && (
                    <button
                      type="button"
                      className="fw-cl-mobile-reset"
                      onClick={resetFilters}
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div
                  className="fw-cl-mobile-filter-panel"
                  data-open={mobileFiltersOpen ? "true" : "false"}
                >
                  <div className="fw-cl-mobile-filter-panel-inner">
                    {hasAreaFilters && (
                      <div className="fw-cl-mobile-filter-section">
                        <span>AREA</span>
                        <div className="fw-changelog-filter-row">
                          {areas.map((item) => (
                            <button
                              type="button"
                              key={item}
                              data-active={area === item ? "true" : "false"}
                              onClick={() => setArea(item)}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {hasReleaseFilters && (
                      <div className="fw-cl-mobile-filter-section">
                        <span>RELEASE TYPE</span>
                        <div className="fw-changelog-release-filter">
                          {releaseTypes.map(([value, label]) => (
                            <button
                              type="button"
                              key={value}
                              data-active={
                                releaseType === value ? "true" : "false"
                              }
                              onClick={() => setReleaseType(value)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {activeEntry && activeSections.length > 0 && (
            <div
              className="fw-changelog-mobile-jump"
              data-open={mobileSectionsOpen ? "true" : "false"}
            >
              <button
                type="button"
                className="fw-changelog-mobile-jump-trigger"
                onClick={() => setMobileSectionsOpen((value) => !value)}
                aria-expanded={mobileSectionsOpen}
              >
                <BookOpen size={15} />
                <span>
                  <small>{releaseLabel(activeEntry)}</small>
                  <strong>
                    {activeSection?.title || "Jump to section"}
                  </strong>
                </span>
                <ChevronDown size={15} />
              </button>

              <div className="fw-changelog-mobile-jump-panel">
                <div>
                  <p>{activeEntry.title}</p>
                  {activeSections.map((section) => (
                    <button
                      type="button"
                      key={section.id}
                      data-level={section.level}
                      data-active={
                        activeSectionId === section.id ? "true" : "false"
                      }
                      onClick={() =>
                        navigateToSection(section.id, activeEntry.slug)
                      }
                    >
                      <span />
                      {section.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {filtered.length === 0 ? (
          <section className="fw-changelog-empty">
            <span>
              {entries.length === 0 ? "ARCHIVE READY" : "NO MATCHING OUTPUT"}
            </span>
            <h2>
              {entries.length === 0
                ? "Nothing published yet."
                : "Nothing in this part of the archive."}
            </h2>
            <p>
              {entries.length === 0
                ? "The system is ready. The first release just has to be written."
                : "Try another area, release type, or search."}
            </p>
            {filtersActive && (
              <button type="button" onClick={resetFilters}>
                Reset filters
              </button>
            )}
          </section>
        ) : (
          <section className="fw-changelog-timeline">
            <aside
              className="fw-changelog-rail"
              aria-label="Release navigation"
            >
              <span className="fw-changelog-rail-label">BUILD HISTORY</span>
              <div className="fw-changelog-rail-line">
                {filtered.map((entry) => {
                  const isActive = activeSlug === entry.slug;
                  const sections = sectionsBySlug.get(entry.slug) || [];

                  return (
                    <div
                      key={entry.id}
                      className="fw-changelog-rail-entry"
                      data-active={isActive ? "true" : "false"}
                    >
                      <a
                        href={`#${entry.slug}`}
                        data-active={isActive ? "true" : "false"}
                        aria-current={isActive ? "location" : undefined}
                        aria-label={`Jump to ${entry.title}`}
                        onClick={(event) =>
                          navigateToRelease(event, entry.slug)
                        }
                      >
                        <i />
                        <span>{releaseLabel(entry)}</span>
                      </a>

                      {isActive && sections.length > 0 && (
                        <div
                          className="fw-changelog-rail-sections"
                          aria-label={`${entry.title} sections`}
                        >
                          {sections.map((section) => (
                            <button
                              type="button"
                              key={section.id}
                              data-level={section.level}
                              data-section-nav-id={section.id}
                              data-active={
                                activeSectionId === section.id
                                  ? "true"
                                  : "false"
                              }
                              onClick={() =>
                                navigateToSection(section.id, entry.slug)
                              }
                            >
                              <span />
                              <em>{section.title}</em>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            <div className="fw-changelog-releases">
              {filtered.map((entry, index) => (
                <article
                  key={entry.id}
                  id={entry.slug}
                  data-changelog-release={entry.slug}
                  className="fw-changelog-release"
                  data-archive={
                    entry.releaseType === "archive" ? "true" : undefined
                  }
                >
                  <ReleaseNumber entry={entry} />

                  <div
                    className="fw-changelog-release-marker"
                    aria-hidden="true"
                  >
                    <i />
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </div>

                  <div className="fw-changelog-release-content">
                    <div
                      className="fw-changelog-release-head"
                      data-changelog-reveal
                    >
                      <div className="fw-changelog-release-meta">
                        <span>{formatDate(entry.publishedAt)}</span>
                        <span>{releaseLabel(entry)}</span>
                        {entry.isFeatured && <b>FEATURED</b>}
                      </div>

                      <div className="fw-changelog-title-row">
                        <div>
                          {entry.releaseType === "archive" && (
                            <p className="fw-changelog-archive-label">
                              ARCHIVE RECOVERED / PARTIAL RECORD
                            </p>
                          )}
                          <h2>{entry.title}</h2>
                          {entry.headline && <h3>{entry.headline}</h3>}
                        </div>

                        <button
                          type="button"
                          className="fw-changelog-anchor"
                          onClick={() => copyAnchor(entry.slug)}
                          aria-label="Copy release link"
                        >
                          {copiedSlug === entry.slug ? (
                            <Check size={16} />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>

                      {entry.summary && (
                        <p className="fw-changelog-summary">{entry.summary}</p>
                      )}

                      <div className="fw-changelog-tag-groups">
                        {entry.areas.length > 0 && (
                          <div
                            className="fw-changelog-tag-group"
                            data-group="areas"
                            aria-label="Release areas"
                          >
                            <span className="fw-changelog-tag-label">AREAS</span>
                            <div className="fw-changelog-tags">
                              {entry.areas.map((item) => (
                                <span key={`area-${item}`}>{item}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {entry.changeTypes.length > 0 && (
                          <div
                            className="fw-changelog-tag-group"
                            data-group="changes"
                            aria-label="Change types"
                          >
                            <span className="fw-changelog-tag-label">CHANGES</span>
                            <div className="fw-changelog-tags">
                              {entry.changeTypes.map((item) => (
                                <span
                                  key={`change-${item}`}
                                  data-change={item.toLowerCase()}
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {entry.bodyMarkdown && (
                      <div className="fw-changelog-body" data-changelog-reveal>
                        <MarkdownRenderer
                          content={entry.bodyMarkdown}
                          headingIdPrefix={entry.slug}
                        />
                      </div>
                    )}

                    {entry.technicalMarkdown && (
                      <div
                        id={`${entry.slug}--technical-notes`}
                        className="fw-changelog-technical"
                        data-changelog-reveal
                        data-changelog-section="true"
                        data-changelog-section-level="1"
                      >
                        <div className="fw-changelog-section-label">
                          <Terminal size={15} />
                          TECHNICAL NOTES
                          <span />
                        </div>
                        <TechnicalTerminal
                          content={entry.technicalMarkdown}
                          label={`${releaseLabel(entry)} output`}
                        />
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="fw-changelog-end" data-changelog-reveal>
          <p>END OF CURRENT RECORD</p>
          <h2>
            More things will break.
            <br />
            <em>We’ll write those down too.</em>
          </h2>
          <Link href="/">
            Back to building <ArrowUpRight size={17} />
          </Link>
        </section>
      </main>
    </div>
  );
}
