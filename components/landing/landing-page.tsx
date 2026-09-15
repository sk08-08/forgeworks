"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Check,
  FileText,
  Globe,
  Menu,
  Moon,
  Palette,
  Shield,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

// Keep these names when adding your own transparent PNGs. No asset is required.
const backgroundStickers = Array.from(
  { length: 8 },
  (_, i) => `/landing/stickers/sticker-${i + 1}.png`,
);

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** One observer and one scheduled frame for the whole page. Only visible scenes
 * are measured; there is no render loop or React state update on scroll. */
function useLandingMotion() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const media = window.matchMedia(
      "(min-width: 1024px) and (min-height: 740px) and (prefers-reduced-motion: no-preference)",
    );
    const scenes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-fw-scene]"),
    );
    const active = new Set<HTMLElement>();
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!media.matches) return;
      for (const scene of active) {
        const box = scene.getBoundingClientRect();
        const progress = clamp(
          (window.innerHeight * 0.85 - box.top) /
            (box.height + window.innerHeight * 0.1),
        );
        scene.style.setProperty("--fw-progress", progress.toFixed(4));
        scene.dataset.phase =
          progress < 0.34 ? "0" : progress < 0.68 ? "1" : "2";
        if (scene.dataset.fwScene === "workflow") {
          const steps = Array.from(
            scene.querySelectorAll<HTMLElement>("[data-workflow-step]"),
          );
          let closest = 0;
          let distance = Infinity;
          steps.forEach((step, index) => {
            const rect = step.getBoundingClientRect();
            const next = Math.abs(
              rect.top + rect.height / 2 - window.innerHeight / 2,
            );
            if (next < distance) {
              closest = index;
              distance = next;
            }
          });
          scene.dataset.step = String(closest);
        }
      }
    };
    const schedule = () => {
      if (!frame && media.matches) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            if (target.hasAttribute("data-fw-reveal")) {
              target.dataset.visible = "true";
              observer.unobserve(target);
            } else active.add(target);
          } else active.delete(target);
        }
        schedule();
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0 },
    );
    root
      .querySelectorAll<HTMLElement>("[data-fw-reveal]")
      .forEach((element) => {
        // Content starts visible for SSR, no-JS, keyboard navigation and reduced motion.
        if (element.getBoundingClientRect().top > window.innerHeight)
          element.dataset.visible = "false";
        observer.observe(element);
      });
    scenes.forEach((scene) => observer.observe(scene));
    const sync = () => {
      root.dataset.motion = media.matches ? "on" : "off";
      if (!media.matches)
        scenes.forEach((scene) => scene.style.removeProperty("--fw-progress"));
      schedule();
    };
    sync();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    media.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", sync);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
}

function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-fw-reveal className={className}>
      {children}
    </div>
  );
}

function Star({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      fill="none"
      className={`fw-star ${className}`}
    >
      <path
        d="M50 3 59 34 83 17 67 42 97 50 67 58 83 83 59 66 50 97 41 66 17 83 33 58 3 50 33 42 17 17 41 34Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <button
      className="fw-icon-button fw-theme-toggle"
      data-theme={dark ? "dark" : "light"}
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
    >
      <span className="fw-theme-toggle-orbit" aria-hidden="true">
        <Sun className="fw-theme-sun" size={17} />
        <Moon className="fw-theme-moon" size={17} />
      </span>
    </button>
  );
}

const navLinks = [
  { href: "#workflow", label: "How it started" },
  { href: "#tools", label: "The tools" },
  { href: "#why", label: "A little backstory" },
];
function Navbar() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const menuButton = useRef<HTMLButtonElement>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  useEffect(() => {
    const updateHeader = () => {
      ticking.current = false;

      const currentY = window.scrollY;
      const previousY = lastScrollY.current;
      const delta = currentY - previousY;

      // Always visible near the top.
      if (currentY < 80) {
        setHidden(false);
      }

      // Scroll up = show immediately.
      else if (delta < -3) {
        setHidden(false);
      }

      // Scroll down = hide after a small intentional movement.
      else if (delta > 6 && !open) {
        setHidden(true);
      }

      lastScrollY.current = currentY;
    };

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(updateHeader);
      }
    };

    lastScrollY.current = window.scrollY;

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const media = window.matchMedia("(min-width: 900px)");
    const onResize = () => {
      if (media.matches) setOpen(false);
    };
    document.addEventListener("keydown", close);
    media.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", close);
      media.removeEventListener("change", onResize);
    };
  }, [open]);
  return (
    <header
      className="fw-header"
      data-hidden={hidden && !open ? "true" : "false"}
    >
      <a className="fw-skip" href="#main">
        Skip to content
      </a>
      <nav className="fw-nav fw-wrap" aria-label="Main navigation">
        <Link className="fw-brand" href="/" aria-label="Forgeworks home">
          <Image src="/logo.svg" alt="" width={30} height={30} />
          <span>
            Forgeworks<small>BETA</small>
          </span>
        </Link>
        <div className="fw-desktop-nav">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
        <div className="fw-nav-actions">
          <ThemeToggle />
          <Link href="/login" className="fw-nav-login">
            Sign in <ArrowUpRight size={15} />
          </Link>
          <button
            ref={menuButton}
            type="button"
            className="fw-icon-button fw-menu-toggle"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="fw-mobile-nav"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>
      <div id="fw-mobile-nav" className="fw-mobile-nav" hidden={!open}>
        <nav aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
              <ArrowUpRight size={18} />
            </a>
          ))}
          <Link href="/login">
            Try Forgeworks
            <ArrowUpRight size={18} />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function LandingStickers() {
  return (
    <div aria-hidden="true" className="fw-sticker-layer">
      {backgroundStickers.map((src, index) => (
        <div
          key={src}
          className={`fw-sticker-slot fw-sticker-slot-${index + 1}`}
        >
          {/* Optional local decoration: native img avoids optimizing nonexistent assets. */}
          <img
            src={src}
            alt=""
            width={180}
            height={180}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        </div>
      ))}
    </div>
  );
}

function Hero() {
  return (
    <section className="fw-hero fw-wrap" id="top" data-fw-scene="hero">
      <div className="fw-hero-topline">
        <p className="fw-eyebrow">
          <span className="fw-status-dot" /> A creative workspace for bot makers
        </p>
        <span className="fw-margin-note">
          characters, submissions, worlds & the messy middle ↙
        </span>
      </div>

      <div className="fw-hero-grid">
        <div className="fw-hero-copy-block">
          <h1 className="fw-hero-title">
            <span>Forge ideas.</span>
            <span className="fw-hero-last">
              Ships <em>bots.</em>
              <Star />
            </span>
          </h1>
          <p className="fw-hero-lede">
            Forgeworks is the workspace around making chatbots: the character,
            the submissions, the worldbuilding, the writing, and the people you
            make it with.
          </p>
          <div className="fw-hero-actions">
            <Link href="/login" className="fw-button w-full sm:w-auto">
              Try Forgeworks
              <ArrowUpRight size={20} />
            </Link>
            <a href="#workflow" className="fw-text-link">
              See how it fits together
              <ArrowDown size={16} />
            </a>
            <small>Free to use · No email required · Still in Beta</small>
          </div>
        </div>

        <div
          className="fw-bot-board"
          aria-label="A visual map of a chatbot project"
        >
          <div className="fw-bot-board-meta" aria-hidden="true">
            <span>CHARACTER BUILD / LIVE</span>
            <span>
              <i /> draft autosaved
            </span>
          </div>
          <div className="fw-bot-core">
            <div className="fw-bot-core-icon">
              <Image src="/logo.svg" alt="" width={34} height={34} />
            </div>
            <span>BOT / 001</span>
            <strong>
              One character.
              <br />
              Lots of moving pieces.
            </strong>
            <small>Keep them close enough to keep creating.</small>
          </div>
          <div className="fw-bot-card fw-bot-card-a">
            <span>PERSONALITY</span>
            <strong>sharp, curious, loyal</strong>
          </div>
          <div className="fw-bot-card fw-bot-card-b">
            <span>FIRST MESSAGE</span>
            <strong>“You came back.”</strong>
          </div>
          <div className="fw-bot-card fw-bot-card-c">
            <span>WORLD NOTE</span>
            <strong>Nightglass Station</strong>
          </div>
          <div className="fw-bot-card fw-bot-card-d">
            <span>SUBMISSIONS</span>
            <strong>12 waiting</strong>
          </div>
          <div className="fw-bot-tag fw-bot-tag-a">slow burn</div>
          <div className="fw-bot-tag fw-bot-tag-b">sci-fi</div>
          <div className="fw-bot-wire fw-bot-wire-a" />
          <div className="fw-bot-wire fw-bot-wire-b" />
          <div className="fw-bot-board-foot" aria-hidden="true">
            <span>personality</span>
            <i />
            <span>scenario</span>
            <i />
            <span>greetings</span>
            <i />
            <span>world notes</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const workflowSteps = [
  {
    title: "Ask what you need to know.",
    label: "Make a form",
    text: "A character name, a scenario, an oddly specific idea. Pick your questions, make the form look like you, and share the link.",
  },
  {
    title: "Have a say in what gets through.",
    label: "Set your boundaries",
    text: "Not every submission belongs in your inbox. Adjust the filters and sensitivity, review flagged responses, and block people who keep crossing the line.",
  },
  {
    title: "Come back when you’re ready.",
    label: "Keep track",
    text: "Accept a submission, leave yourself a note, move it along. You can see what’s waiting and what you’ve already finished.",
  },
] as const;
function Workflow() {
  return (
    <section
      id="workflow"
      className="fw-workflow fw-wrap fw-section"
      data-fw-scene="workflow"
      data-step="0"
    >
      <Reveal className="fw-section-heading">
        <p className="fw-eyebrow">01 / The first problem</p>
        <h2>
          A submission comes in.
          <br />
          You decide what <em>happens next.</em>
        </h2>
        <p>
          Forgeworks started with Forms: a safer, more intentional way for bot
          creators to receive submissions and turn them into work they can
          actually manage.
        </p>
      </Reveal>

      <div className="fw-workflow-layout">
        <div className="fw-request-flow" aria-hidden="true">
          <article className="fw-flow-card fw-flow-card-request">
            <span className="fw-flow-kicker">01 / INCOMING</span>
            <FileText size={24} />
            <h3>“I had this character in mind…”</h3>
            <div className="fw-flow-lines">
              <i />
              <i />
              <i />
            </div>
            <small>name · premise · notes</small>
          </article>
          <div className="fw-flow-arrow">→</div>
          <article className="fw-flow-card fw-flow-card-guard">
            <span className="fw-flow-kicker">02 / CHECK</span>
            <Shield size={25} />
            <h3>Your boundaries come first.</h3>
            <div className="fw-flow-chip-row">
              <span>sensitivity</span>
              <span>flags</span>
              <span>blocking</span>
            </div>
          </article>
          <div className="fw-flow-arrow">→</div>
          <article className="fw-flow-card fw-flow-card-queue">
            <span className="fw-flow-kicker">03 / ORGANIZE</span>
            <Check size={25} />
            <h3>A submission becomes work.</h3>
            <div className="fw-mini-queue">
              <span>NEW</span>
              <span>IN PROGRESS</span>
              <span>DONE</span>
            </div>
          </article>
        </div>

        <div className="fw-workflow-steps">
          {workflowSteps.map((step, index) => (
            <article key={step.label} data-workflow-step>
              <span className="fw-step-number">0{index + 1}</span>
              <div>
                <p className="fw-eyebrow">{step.label}</p>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Growth() {
  const links = [
    {
      n: "01",
      title: "Build the character",
      note: "Personality, scenario, greetings, dialogue, tags and the rest.",
      href: "#forge",
      tool: "Bot Manager",
      icon: FileText,
    },
    {
      n: "02",
      title: "Build the world",
      note: "Entries, Worlds, Collections, Lorebooks and relations.",
      href: "#atlas",
      tool: "Atlas",
      icon: Globe,
    },
    {
      n: "03",
      title: "Build the public side",
      note: "Creator Pages, profiles, discovery and the things you want people to see.",
      href: "#creator-pages",
      tool: "Creator Pages",
      icon: Palette,
    },
  ] as const;

  return (
    <section id="tools" className="fw-growth fw-section" data-fw-scene="growth">
      <div className="fw-wrap">
        <Reveal className="fw-growth-heading">
          <p className="fw-eyebrow">02 / What grew around it</p>
          <h2>
            One tool became a<br />
            <em>creator workspace.</em>
          </h2>
          <p>
            Forms solved the first problem. Then the same project kept needing a
            place for the character, the world around them, and the way creators
            share their work.
          </p>
        </Reveal>

        <div className="fw-growth-scroll">
          <div className="fw-growth-bento">
            <article className="fw-growth-origin-card">
              <span>WHERE IT STARTED</span>
              <strong>Forms</strong>
              <p>
                Receive the idea. Check what comes through. Keep track of what
                happens next.
              </p>
              <div className="fw-growth-origin-track">
                <i />
                <i />
                <i />
              </div>
            </article>
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`fw-growth-card fw-growth-card-${link.n}`}
              >
                <div className="fw-growth-card-top">
                  <span>{link.n}</span>
                  <link.icon size={20} />
                </div>
                <div>
                  <small>{link.tool}</small>
                  <h3>{link.title}</h3>
                  <p>{link.note}</p>
                </div>
                <span className="fw-growth-card-action">open section</span>
                <ArrowUpRight size={19} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ForgeFeature() {
  const pieces = [
    ["01", "Personality", "A little stubborn. A very good listener."],
    ["02", "Scenario", "The train only stops after midnight."],
    ["03", "First message", "“You came back.”"],
    ["04", "Greetings", "Different ways to begin the same story."],
  ] as const;

  return (
    <section
      id="forge"
      className="fw-forge fw-wrap fw-section"
      data-fw-scene="assembly"
    >
      <Reveal className="fw-feature-heading">
        <div>
          <p className="fw-eyebrow">Bot Manager / Meet the character</p>
          <h2>
            Characters are made
            <br />
            from <em>little pieces.</em>
          </h2>
        </div>
        <p>
          Keep the details that define a bot together while you figure out who
          they are. Change one thing, rewrite another, come back later. It is
          still yours while it takes shape.
        </p>
      </Reveal>

      <div className="fw-character-board">
        <div className="fw-character-card-main">
          <span>CHARACTER FILE / 001</span>
          <div className="fw-character-avatar">
            <BotGlyph />
          </div>
          <h3>Still becoming.</h3>
          <p>
            Name, voice, scenario, messages, examples, tags, image — all close
            enough to keep iterating.
          </p>
          <div className="fw-character-tags">
            <span>OC</span>
            <span>longform</span>
            <span>draft</span>
          </div>
        </div>
        <div className="fw-character-pieces">
          {pieces.map(([n, title, text]) => (
            <article key={n}>
              <span>{n}</span>
              <small>{title}</small>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <span className="fw-character-note">
          all the pieces, one character ↗
        </span>
      </div>
    </section>
  );
}

function BotGlyph() {
  return (
    <div className="fw-bot-glyph" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

const atlasItems = [
  {
    title: "Entries",
    subtitle: "Start with one thing.",
    text: "A character. A place. An event nobody agrees about. Write it down now; it doesn’t need a whole world around it yet.",
    example: "The station at the end of the line",
    detail: "A place worth coming back to.",
    icon: FileText,
  },
  {
    title: "Worlds",
    subtitle: "Give it somewhere to belong.",
    text: "When a few ideas start to share a setting, bring them into a world. Keep the details close enough to find again.",
    example: "A city that never sees the sun",
    detail: "A setting for all those little stories.",
    icon: Globe,
  },
  {
    title: "Collections",
    subtitle: "Keep the useful bits close.",
    text: "The cast for one story, locations for an arc, a handful of references. Put together a set that makes sense to you.",
    example: "Everyone on the night train",
    detail: "A cast, a route, a story in the making.",
    icon: Palette,
  },
  {
    title: "Lorebooks",
    subtitle: "Bring the lore along.",
    text: "Gather the context you want to reuse from what you’ve already written. No need to keep rewriting the same details.",
    example: "Things a stranger should know",
    detail: "A little context goes a long way.",
    icon: BookOpen,
  },
] as const;

function moveTab(
  event: KeyboardEvent<HTMLButtonElement>,
  index: number,
  count: number,
  select: (index: number) => void,
) {
  let next: number;
  if (event.key === "ArrowRight" || event.key === "ArrowDown")
    next = (index + 1) % count;
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
    next = (index + count - 1) % count;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = count - 1;
  else return;
  event.preventDefault();
  select(next);
  event.currentTarget.parentElement
    ?.querySelectorAll<HTMLButtonElement>("[role=tab]")
    [next]?.focus();
}

function AtlasFeature() {
  const [active, setActive] = useState(0);
  const item = atlasItems[active];
  return (
    <section id="atlas" className="fw-atlas fw-section" data-fw-scene="atlas">
      <div className="fw-wrap">
        <Reveal className="fw-atlas-heading">
          <p className="fw-eyebrow">Atlas / Worldbuilding</p>
          <h2>
            Your bot has a world.
            <br />
            Give it <em>room to grow.</em>
          </h2>
          <p>
            Start with a character, a place, a rumor, or one tiny bit of lore.
            Organize it later. Reuse what matters. Connect the pieces when a
            connection actually helps.
          </p>
        </Reveal>

        <div className="fw-atlas-cards">
          <div
            className="fw-atlas-tabs"
            role="tablist"
            aria-label="Explore Atlas"
          >
            {atlasItems.map((tab, index) => (
              <button
                key={tab.title}
                type="button"
                role="tab"
                id={`fw-atlas-tab-${index}`}
                aria-selected={active === index}
                aria-controls="fw-atlas-panel"
                tabIndex={active === index ? 0 : -1}
                onClick={() => setActive(index)}
                onKeyDown={(event) =>
                  moveTab(event, index, atlasItems.length, setActive)
                }
              >
                <span>0{index + 1}</span>
                <tab.icon size={19} />
                <strong>{tab.title}</strong>
                <small>{tab.subtitle}</small>
              </button>
            ))}
          </div>

          <div
            className="fw-atlas-focus"
            id="fw-atlas-panel"
            role="tabpanel"
            aria-labelledby={`fw-atlas-tab-${active}`}
            tabIndex={0}
          >
            <div key={item.title} className="fw-atlas-focus-inner">
              <div className="fw-atlas-focus-top">
                <span>ATLAS / 0{active + 1}</span>
                <span className="fw-atlas-focus-status">
                  <i /> reusable piece
                </span>
                <Star />
              </div>
              <h3>{item.subtitle}</h3>
              <p>{item.text}</p>
              <blockquote>“{item.example}”</blockquote>
              <small>{item.detail}</small>
              <div className="fw-atlas-relation">
                <span>RELATION</span>
                <b>one idea</b>
                <ArrowUpRight size={14} />
                <b>another idea</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CreatorPagesFeature() {
  const blocks = [
    "Hero",
    "Bot showcase",
    "World",
    "Gallery",
    "Form",
    "Text",
    "Embed",
  ];
  return (
    <section
      id="creator-pages"
      className="fw-pages fw-wrap fw-section"
      data-fw-scene="pages"
    >
      <div className="fw-pages-layout">
        <Reveal className="fw-pages-builder">
          <div className="fw-pages-builder-head">
            <span>CREATOR PAGE / DRAFT</span>
            <span>+ ADD BLOCK</span>
          </div>
          <div className="fw-pages-canvas">
            <div className="fw-pages-hero-block">
              <small>HERO</small>
              <strong>Your little corner of the internet.</strong>
            </div>
            <div className="fw-pages-grid-block">
              <div>
                <small>BOT SHOWCASE</small>
                <strong>Featured characters</strong>
              </div>
              <div>
                <small>WORLD</small>
                <strong>Nightglass</strong>
              </div>
            </div>
            <div className="fw-pages-strip">
              <span>GALLERY</span>
              <span>FORM</span>
              <span>TEXT</span>
            </div>
          </div>
          <div className="fw-pages-blocks">
            {blocks.map((block) => (
              <span key={block}>{block}</span>
            ))}
          </div>
        </Reveal>

        <Reveal className="fw-pages-copy">
          <p className="fw-eyebrow">Creator Pages / Make yourself at home</p>
          <h2>
            Give your work
            <br />a place that feels <em>like you.</em>
          </h2>
          <p>
            Build a public page from blocks for your bots, worlds, forms,
            galleries, text and more. Then shape the spacing, colors, type and
            motion until it feels less like a template and more like yours.
          </p>
          <ul>
            <li>
              <span>01</span>Choose what you want to show.
            </li>
            <li>
              <span>02</span>Arrange it your way.
            </li>
            <li>
              <span>03</span>Polish the little details.
            </li>
          </ul>
          <a href="/login" className="fw-text-link">
            Make a little space <ArrowUpRight size={18} />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

const extras = [
  {
    icon: Users,
    title: "Make something together.",
    label: "Collaboration",
    text: "Invite someone into a bot workspace. Choose what they can edit, leave comments, review changes, and look back through its history.",
  },
  {
    icon: Shield,
    title: "Your inbox, your boundaries.",
    label: "Moderation",
    text: "Set the sensitivity, check flagged submissions, and block people from sending more submissions to a form.",
  },
  {
    icon: Palette,
    title: "Put a little of yourself in it.",
    label: "Profiles & Markdown",
    text: "Make a profile, choose what to feature, and write with formatting, colors, links, and lists.",
  },
  {
    icon: BookOpen,
    title: "See what other people are making.",
    label: "Community & Resources",
    text: "Find other creators, look around the community, and keep useful references close by.",
  },
] as const;
function Together() {
  return (
    <section
      id="together"
      className="fw-together fw-wrap fw-section"
      data-fw-scene="together"
    >
      <Reveal className="fw-together-heading">
        <p className="fw-eyebrow">A few other things you’ll find here</p>
        <h2>
          It’s better
          <br />
          <em>with company.</em>
        </h2>
      </Reveal>
      <div className="fw-extras">
        {extras.map((item) => (
          <Reveal key={item.title}>
            <article>
              <item.icon size={22} />
              <p className="fw-eyebrow">{item.label}</p>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Why() {
  return (
    <section id="why" className="fw-story fw-section" data-fw-scene="story">
      <div className="fw-wrap fw-story-layout">
        <Reveal>
          <p className="fw-eyebrow">A note from me</p>
          <h2>
            I wasn’t planning
            <br />
            to make
            <br />
            <em>all of this.</em>
          </h2>
          <span className="fw-story-scribble">but here we are.</span>
        </Reveal>
        <Reveal className="fw-letter">
          <p>
            A friend was getting bot requests through Google Forms. One of them
            was seriously abusive. I wanted to make something that gave creators
            more control over what reached them.
          </p>
          <p>
            That became Forms. Then I wanted a way to organize the submissions.
            Then somewhere to work on bots. I kept finding something else I
            wanted to make.
          </p>
          <p>That’s how this turned into Forgeworks.</p>
          <p>
            It’s still a personal project. I like working on it, I use parts of
            it myself, and I hope you’ll find something here that helps with
            your own work.
          </p>
          <div className="fw-letter-signoff">
            <Image src="/logo.svg" alt="" width={28} height={28} />
            <span>
              Still making things.<small>Thanks for stopping by.</small>
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FeatureConstellation() {
  const notes = [
    ["Forms", "submissions have somewhere to land."],
    ["Bot Manager", "Characters keep all their pieces."],
    ["Atlas", "Worlds can grow without becoming a mess."],
    ["Creator Pages", "Finished work gets a public side."],
    ["Collaboration", "Shared bots stay understandable."],
    ["Markdown", "Writing stays expressive and consistent."],
  ] as const;

  return (
    <section
      className="fw-constellation fw-wrap fw-section"
      data-fw-scene="constellation"
    >
      <Reveal className="fw-feature-heading">
        <div>
          <p className="fw-eyebrow">One workspace, lots of small jobs</p>
          <h2>
            Less tab-hopping.
            <br />
            More <em>making.</em>
          </h2>
        </div>
        <p>
          Forgeworks is not one giant feature. It is a collection of small tools
          that stay close to the work they belong to.
        </p>
      </Reveal>
      <div className="fw-constellation-grid">
        {notes.map(([title, text], index) => (
          <Reveal key={title}>
            <article
              className={`fw-constellation-card fw-constellation-card-${index + 1}`}
            >
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="fw-closing fw-section" data-fw-scene="closing">
      <div className="fw-wrap">
        <p className="fw-eyebrow">Free to use. Still growing.</p>
        <h2>
          Bring your
          <br />
          <em>unfinished ideas.</em>
          <Star />
        </h2>
        <div className="fw-closing-bottom">
          <p>
            Make an account, poke around, and see if it’s useful to you. If
            something feels off, I’d like to hear about it.
          </p>
          <Link href="/login" className="fw-button">
            Try Forgeworks
            <ArrowUpRight size={22} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="fw-footer fw-wrap">
      <Link href="/" className="fw-brand">
        <Image src="/logo.svg" alt="" width={25} height={25} />
        <span>Forgeworks</span>
      </Link>
      <p>An independent creator project.</p>
      <div>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <a href="#top">Back to top ↑</a>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}

export function LandingPage() {
  const ref = useLandingMotion();
  return (
    <div
      ref={ref}
      className="fw-landing"
      style={{ "--fw-progress": 1 } as CSSProperties}
    >
      <LandingStickers />
      <Navbar />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Workflow />
        <Growth />
        <ForgeFeature />
        <AtlasFeature />
        <CreatorPagesFeature />
        <Together />
        <Why />
        <FeatureConstellation />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}
