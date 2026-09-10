"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  Hash,
  Inbox,
  Kanban,
  Maximize2,
  Menu,
  Moon,
  Palette,
  Shield,
  Sparkles,
  Sun,
  Users,
  WandSparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

// ============================================================================
// Landing assets
// ============================================================================

const landingScreenshots = {
  dashboard: {
    dark: "/landing/dashboard-dark.webp",
    light: "/landing/dashboard-light.webp",
    alt: "Forgeworks dashboard",
  },
  forms: {
    dark: "/landing/form-builder-dark.webp",
    light: "/landing/form-builder-light.webp",
    alt: "Forgeworks form builder",
  },
  submissions: {
    dark: "/landing/submissions-dark.webp",
    light: "/landing/submissions-light.webp",
    alt: "Forgeworks submissions board",
  },
  profile: {
    dark: "/landing/profile-dark.webp",
    light: "/landing/profile-light.webp",
    alt: "Customized Forgeworks creator profile",
  },
  bots: {
    dark: "/landing/bot-manager-dark.webp",
    light: "/landing/bot-manager-light.webp",
    alt: "Forgeworks Bot Manager",
  },
} as const;

type LandingScreenshot = {
  dark: string;
  light: string;
  alt: string;
};

function resolveLandingScreenshot(
  screenshot: LandingScreenshot,
  resolvedTheme: string | undefined,
) {
  return {
    src: resolvedTheme === "light" ? screenshot.light : screenshot.dark,
    alt: screenshot.alt,
  };
}

// ============================================================================
// Hooks
// ============================================================================

function useScrollDirection() {
  const [scrollDir, setScrollDir] = useState<"up" | "down">("up");
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;

      setScrolled(y > 40);

      setScrollDir(y > lastY.current && y > 280 ? "down" : "up");

      lastY.current = y;
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return {
    scrollDir,
    scrolled,
  };
}

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        setVisible(true);
        observer.disconnect();
      },
      {
        threshold,
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return {
    ref,
    visible,
  };
}

// ============================================================================
// Shared animation wrappers
// ============================================================================

function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}) {
  const { ref, visible } = useInView();

  const transform =
    direction === "left"
      ? "translateX(28px)"
      : direction === "right"
        ? "translateX(-28px)"
        : "translateY(28px)";

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : transform,
        transition: `
          opacity 700ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}s,
          transform 700ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}s
        `,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Theme toggle
// ============================================================================

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="cursor-pointer rounded-full"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

// ============================================================================
// Background
// ============================================================================

function LandingBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Purple */}
      <div className="absolute -left-56 -top-32 h-150 w-150 rounded-full bg-purple-500/10 blur-[120px]" />

      {/* Pink */}
      <div className="absolute -right-64 top-[24rem] h-140 w-140 rounded-full bg-pink-500/8 blur-[130px]" />

      {/* Blue */}
      <div className="absolute bottom-[20%] left-[45%] h-120 w-120 rounded-full bg-blue-500/6 blur-[130px]" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}

// ============================================================================
// Navbar
// ============================================================================

function Navbar() {
  const { scrollDir, scrolled } = useScrollDirection();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    {
      href: "#workflow",
      label: "Workflow",
    },
    {
      href: "#tools",
      label: "Tools",
    },
    {
      href: "#why",
      label: "Why",
    },
    {
      href: "#screenshots",
      label: "Screenshots",
    },
  ];

  return (
    <nav
      data-landing-nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-border/60 bg-background/80 shadow-sm backdrop-blur-2xl"
          : "bg-transparent",
        scrollDir === "down" && scrolled
          ? "-translate-y-full"
          : "translate-y-0",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-7">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105">
            <Image src="/logo.svg" alt="Forgeworks" width={24} height={24} />
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight sm:text-base">
              Forgeworks
            </span>

            <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Beta
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}

          <div className="ml-1 h-5 w-px bg-border" />

          <ThemeToggle />

          <Link href="/login">
            <Button variant="ghost" size="sm" className="cursor-pointer">
              Sign in
            </Button>
          </Link>

          <Link href="/login">
            <Button
              size="sm"
              className="group cursor-pointer rounded-full px-5 shadow-md shadow-primary/15"
            >
              Try Forgeworks
              <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-muted md:hidden"
          onClick={() => setMobileOpen((current) => !current)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/60 bg-background/95 px-5 py-4 backdrop-blur-2xl md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}

            <div className="my-2 h-px bg-border" />

            <div className="flex items-center gap-2">
              <ThemeToggle />

              <Link href="/login" className="flex-1">
                <Button variant="outline" className="w-full cursor-pointer">
                  Sign in
                </Button>
              </Link>

              <Link href="/login" className="flex-1">
                <Button className="w-full cursor-pointer">Try it</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// ============================================================================
// Screenshot frame
// ============================================================================

function ScreenshotFrame({
  src,
  alt,
  label,
  className,
  priority = false,
  onClick,
}: {
  src: string;
  alt: string;
  label?: string;
  className?: string;
  priority?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative block w-full overflow-hidden rounded-2xl border border-border/70 bg-card text-left shadow-xl shadow-black/5",
        onClick && "cursor-zoom-in",
        className,
      )}
    >
      <div className="flex h-9 items-center gap-1.5 border-b border-border/60 bg-muted/35 px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />

        {label && (
          <span className="ml-2 truncate font-mono text-[9px] text-muted-foreground">
            {label}
          </span>
        )}
      </div>

      <div className="relative aspect-[16/10] overflow-hidden bg-muted/30">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          unoptimized
          className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.012]"
        />

        {onClick && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/15">
            <div className="flex h-10 w-10 scale-90 items-center justify-center rounded-full bg-black/65 text-white opacity-0 shadow-lg backdrop-blur transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
              <Maximize2 className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Hero
// ============================================================================

function Hero() {
  const { resolvedTheme } = useTheme();
  const dashboardScreenshot = resolveLandingScreenshot(
    landingScreenshots.dashboard,
    resolvedTheme,
  );

  return (
    <section className="relative overflow-hidden pb-20 pt-28 sm:pb-28 sm:pt-36 lg:min-h-screen lg:pb-24">
      {/* Hero-specific atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-[52%] top-10 h-150 w-150 rounded-full bg-primary/10 blur-[110px]" />

        <WandSparkles className="absolute right-[9%] top-[21%] hidden h-7 w-7 rotate-12 text-primary/25 lg:block lg:animate-[bounce_5s_ease-in-out_infinite]" />

        <Sparkles className="absolute left-[7%] top-[38%] hidden h-5 w-5 -rotate-12 text-pink-400/25 lg:block lg:animate-[pulse_4s_ease-in-out_infinite]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 sm:px-7 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-12">
        {/* Copy */}
        <div className="relative z-10 mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
          <Reveal>
            <div className="mb-6 flex justify-center lg:justify-start">
              <Badge
                variant="outline"
                className="border-primary/25 bg-primary/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary"
              >
                Free · Beta · Made for bot creators
              </Badge>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.04] tracking-[-0.045em] sm:text-5xl lg:text-6xl xl:text-[4.35rem]">
              Tools I wanted as a{" "}
              <span className="relative inline-block">
                <span className="bg-linear-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  bot creator.
                </span>

                <span className="absolute -bottom-1 left-0 right-0 h-px bg-linear-to-r from-primary/0 via-primary/55 to-primary/0" />
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8 lg:mx-0">
              Forgeworks started as a better way to handle creator requests
              without relying on DMs and generic forms. I kept adding the tools
              I wanted for my own bots, and it slowly became a workspace for
              forms, submissions, profiles, collaboration, and more.
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
              <Link href="/login">
                <Button
                  size="lg"
                  className="group h-11 w-full cursor-pointer rounded-full px-6 shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] sm:w-auto"
                >
                  Try Forgeworks
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              <a href="#workflow">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 w-full cursor-pointer rounded-full border-border/70 bg-background/50 px-6 backdrop-blur sm:w-auto"
                >
                  See what it does
                </Button>
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground lg:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Free
              </span>

              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                No email required
              </span>

              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Still in Beta
              </span>
            </div>
          </Reveal>
        </div>

        {/* Real product screenshot */}
        <Reveal delay={0.18} direction="left" className="relative">
          <div className="relative mx-auto max-w-3xl lg:ml-0">
            <div className="absolute -inset-10 rounded-[3rem] bg-primary/10 blur-3xl" />

            <div className="relative lg:rotate-[1.5deg]">
              <ScreenshotFrame
                src={dashboardScreenshot.src}
                alt={dashboardScreenshot.alt}
                label="forgeworks / dashboard"
                priority
              />

              {/* Real-product labels */}
              <div className="absolute -bottom-5 -left-3 hidden rotate-[-3deg] rounded-xl border border-green-500/20 bg-background/90 px-3 py-2 shadow-xl backdrop-blur sm:block">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-green-500" />

                  <div>
                    <p className="text-[10px] font-semibold">Bot Manager</p>

                    <p className="text-[9px] text-muted-foreground">
                      actual workspace
                    </p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 -top-5 hidden rotate-[3deg] rounded-xl border border-blue-500/20 bg-background/90 px-3 py-2 shadow-xl backdrop-blur sm:block">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-blue-500" />

                  <div>
                    <p className="text-[10px] font-semibold">Submissions</p>

                    <p className="text-[9px] text-muted-foreground">
                      one workspace
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================================
// Workflow
// ============================================================================

const workflowSteps = [
  {
    number: "01",
    icon: FileText,
    title: "Build the form",
    description:
      "Create the questions you actually need, split them into sections, customize the appearance, and share one public link.",
    tone: "text-muted-foreground",
    bg: "bg-muted/60",
  },
  {
    number: "02",
    icon: Shield,
    title: "Let requests come in",
    description:
      "Incoming submissions can be checked by moderation tools before they become another thing you have to deal with manually.",
    tone: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    number: "03",
    icon: Kanban,
    title: "Keep track of them",
    description:
      "Move submissions through your workflow, open the full responses, add notes, and keep the queue somewhere other than your DMs.",
    tone: "text-blue-500",
    bg: "bg-blue-500/10",
  },
];

function Workflow() {
  const { resolvedTheme } = useTheme();
  const formsScreenshot = resolveLandingScreenshot(
    landingScreenshots.forms,
    resolvedTheme,
  );
  const submissionsScreenshot = resolveLandingScreenshot(
    landingScreenshots.submissions,
    resolvedTheme,
  );

  return (
    <section id="workflow" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-7">
        <Reveal>
          <div className="max-w-3xl">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-10 bg-primary/60" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                Where it started
              </span>
            </div>

            <h2 className="text-balance text-3xl font-bold tracking-[-0.035em] sm:text-4xl md:text-5xl">
              Requests shouldn&apos;t have to live in random DMs and generic
              forms.
            </h2>

            <p className="mt-5 max-w-2xl text-pretty leading-7 text-muted-foreground sm:text-lg">
              Forms were the first reason Forgeworks existed. The workflow grew
              from one simple idea: give creators somewhere safer and more
              organized to receive and manage requests.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {workflowSteps.map((step, index) => (
            <Reveal key={step.number} delay={index * 0.08} className="h-full">
              <div className="relative h-full overflow-hidden rounded-2xl border border-border/70 bg-card/75 p-6 shadow-sm">
                <span className="absolute right-5 top-3 select-none font-mono text-5xl font-black text-foreground/[0.035]">
                  {step.number}
                </span>

                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl",
                    step.bg,
                  )}
                >
                  <step.icon className={cn("h-5 w-5", step.tone)} />
                </div>

                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Real workflow screenshots */}
        <div className="mt-12 grid items-start gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <Reveal direction="right">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Form Builder
              </div>

              <ScreenshotFrame
                src={formsScreenshot.src}
                alt={formsScreenshot.alt}
                label="forms / builder"
              />
            </div>
          </Reveal>

          <Reveal direction="left" delay={0.08} className="lg:pt-20">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Inbox className="h-3.5 w-3.5 text-blue-500" />
                Submission workflow
              </div>

              <ScreenshotFrame
                src={submissionsScreenshot.src}
                alt={submissionsScreenshot.alt}
                label="submissions / board"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Tools
// ============================================================================

const tools = [
  {
    icon: Bot,
    title: "Bot Manager",
    eyebrow: "Forge",
    description:
      "Keep your character definitions, scenarios, initial messages, alternate greetings, tags, images, and other bot information together.",
    className: "lg:col-span-2",
    iconClass: "bg-green-500/10 text-green-500",
  },
  {
    icon: Palette,
    title: "Profiles",
    eyebrow: "Your space",
    description:
      "Customize how your creator profile looks and decide which bots, forms, worlds, and pages you actually want to show.",
    className: "lg:col-span-1",
    iconClass: "bg-purple-500/10 text-purple-500",
  },
  {
    icon: Users,
    title: "Collaboration",
    eyebrow: "Shared bots",
    description:
      "Invite another creator to work on a bot with roles, permissions, activity, comments, and review tools.",
    className: "lg:col-span-1",
    iconClass: "bg-emerald-500/10 text-emerald-500",
  },
  {
    icon: WandSparkles,
    title: "Markdown Editor",
    eyebrow: "Writing",
    description:
      "A visual editor for Markdown with formatting, colors, links, lists, slash commands, selection tools, and proper rendering across the platform.",
    className: "lg:col-span-2",
    iconClass: "bg-pink-500/10 text-pink-500",
  },
  {
    icon: Globe,
    title: "Atlas",
    eyebrow: "W.I.P.",
    description:
      "Worlds, lorebooks, characters, and connected creations. Atlas exists today, but it is still one of the systems I want to rethink more deeply.",
    className: "lg:col-span-1",
    iconClass: "bg-pink-500/10 text-pink-500",
  },
  {
    icon: Hash,
    title: "Community & Resources",
    eyebrow: "Hub",
    description:
      "Browse creator profiles, platform discussions, project updates, reports, and Janitor-related resources without leaving the workspace.",
    className: "lg:col-span-2",
    iconClass: "bg-violet-500/10 text-violet-500",
  },
];

function Tools() {
  return (
    <section id="tools" className="relative py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border to-transparent"
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-7">
        <Reveal>
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-10 bg-purple-500/60" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-purple-500">
                  What grew around it
                </span>
              </div>

              <h2 className="text-3xl font-bold tracking-[-0.035em] sm:text-4xl md:text-5xl">
                I kept building things I wanted to use.
              </h2>
            </div>

            <p className="max-w-2xl text-pretty leading-7 text-muted-foreground sm:text-lg lg:justify-self-end">
              Forgeworks stopped being only a request-form project once I
              started using it myself. Bot management, profiles, collaboration,
              Markdown, community tools, and Atlas grew from that.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {tools.map((tool, index) => (
            <Reveal
              key={tool.title}
              delay={(index % 3) * 0.06}
              className={tool.className}
            >
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-card">
                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/0 blur-2xl transition-colors group-hover:bg-primary/5" />

                <div className="relative flex items-start justify-between gap-4">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl",
                      tool.iconClass,
                    )}
                  >
                    <tool.icon className="h-5 w-5" />
                  </div>

                  <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {tool.eyebrow}
                  </span>
                </div>

                <h3 className="relative mt-6 text-xl font-semibold">
                  {tool.title}
                </h3>

                <p className="relative mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  {tool.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Why Forgeworks exists
// ============================================================================

function Why() {
  return (
    <section id="why" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-7">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/75">
            {/* atmosphere */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <div className="absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-purple-500/10 blur-[80px]" />

              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-pink-500/8 blur-[80px]" />

              <div
                className="absolute inset-0 opacity-[0.025]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at center, currentColor 1px, transparent 1px)",
                  backgroundSize: "26px 26px",
                }}
              />
            </div>

            <div className="relative grid gap-10 p-7 sm:p-10 lg:grid-cols-[0.72fr_1.28fr] lg:p-14">
              <div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>

                <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                  Why I made this
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                  It wasn&apos;t supposed to become a platform.
                </h2>
              </div>

              <div className="space-y-5 text-sm leading-7 text-muted-foreground sm:text-base">
                <p>
                  Forgeworks originally started because a friend was handling
                  bot requests through Google Forms and received a seriously
                  abusive submission. I wanted to make something that gave her
                  more control over what reached her and made the requests
                  easier to organize.
                </p>

                <p>
                  After Forms worked, I started adding things because I&apos;m a
                  creator too. I wanted somewhere to keep my own bots, so Bot
                  Manager happened. I liked the idea of customizable creator
                  profiles, so I built those. Then Markdown, collaboration,
                  Creator Pages, Atlas, and the rest slowly followed.
                </p>

                <p className="font-medium text-foreground">
                  It&apos;s still a personal project. I&apos;m building it
                  because I enjoy working on it, I use parts of it myself, and
                  maybe other users will find those tools useful too.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================================
// Lightbox
// ============================================================================

function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: {
    src: string;
    alt: string;
  }[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goNext = () => {
    setCurrentIndex((current) => (current + 1) % images.length);
  };

  const goPrevious = () => {
    setCurrentIndex((current) => (current - 1 + images.length) % images.length);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowRight") {
        goNext();
      }

      if (event.key === "ArrowLeft") {
        goPrevious();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <style>
        {`
          nav[data-landing-nav] {
            visibility: hidden !important;
          }
        `}
      </style>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label="Close image"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="absolute left-4 top-4 z-20 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white">
        {currentIndex + 1} / {images.length}
      </div>

      <div
        className="relative h-[82vh] w-full max-w-6xl"
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={images[currentIndex].src}
          alt={images[currentIndex].alt}
          fill
          unoptimized
          className="object-contain"
        />
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          goPrevious();
        }}
        className="absolute left-2 z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-5"
        aria-label="Previous image"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          goNext();
        }}
        className="absolute right-2 z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-5"
        aria-label="Next image"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

// ============================================================================
// Screenshots
// ============================================================================

const screenshotCardConfig = [
  {
    screenshot: landingScreenshots.dashboard,
    label: "Dashboard",
    description:
      "Your workspace at a glance: bots, forms, submissions, recent activity, and quick actions.",
  },
  {
    screenshot: landingScreenshots.bots,
    label: "Bot Manager",
    description:
      "Keep character content somewhere built around bot creation instead of a generic notes app.",
  },
  {
    screenshot: landingScreenshots.forms,
    label: "Form Builder",
    description:
      "Build request forms with sections, appearance controls, Markdown, media, and shareable links.",
  },
  {
    screenshot: landingScreenshots.profile,
    label: "Profiles",
    description:
      "Build a creator profile and choose exactly which parts of your work you want visitors to see.",
  },
] as const;

function Screenshots() {
  const { resolvedTheme } = useTheme();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const screenshotCards = screenshotCardConfig.map((item) => ({
    ...resolveLandingScreenshot(item.screenshot, resolvedTheme),
    label: item.label,
    description: item.description,
  }));

  return (
    <section id="screenshots" className="relative py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border to-transparent"
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-7">
        <Reveal>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-10 bg-blue-500/60" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-500">
                  The actual platform
                </span>
              </div>

              <h2 className="text-3xl font-bold tracking-[-0.035em] sm:text-4xl md:text-5xl">
                This is Forgeworks.
              </h2>
            </div>

            <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
              These are screenshots from the real application. Click one if you
              want a closer look before making an account.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {screenshotCards.map((screenshot, index) => (
            <Reveal key={screenshot.label} delay={(index % 2) * 0.07}>
              <div className="group">
                <ScreenshotFrame
                  src={screenshot.src}
                  alt={screenshot.alt}
                  label={screenshot.label.toLowerCase()}
                  onClick={() => setLightboxIndex(index)}
                />

                <div className="mt-4 flex items-start gap-3">
                  <span className="mt-1 font-mono text-[10px] text-primary">
                    0{index + 1}
                  </span>

                  <div>
                    <h3 className="font-semibold">{screenshot.label}</h3>

                    <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                      {screenshot.description}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={screenshotCards.map((item) => ({
            src: item.src,
            alt: item.alt,
          }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}

// ============================================================================
// Beta / feedback
// ============================================================================

function BetaSection() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-5 sm:px-7">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-linear-to-br from-primary/8 via-card to-pink-500/5 p-7 text-center shadow-xl shadow-primary/5 sm:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              <div className="absolute left-1/2 top-0 h-52 w-96 -translate-x-1/2 rounded-full bg-primary/12 blur-[70px]" />

              <Sparkles className="absolute left-[12%] top-[24%] h-5 w-5 text-purple-400/25" />

              <WandSparkles className="absolute bottom-[20%] right-[12%] h-6 w-6 text-pink-400/20" />
            </div>

            <div className="relative">
              <Badge
                variant="outline"
                className="border-primary/25 bg-background/40 text-[10px] uppercase tracking-[0.18em] text-primary"
              >
                Still Beta
              </Badge>

              <h2 className="mx-auto mt-5 max-w-2xl text-balance text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                Try it if it sounds useful.
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-pretty leading-7 text-muted-foreground">
                Forgeworks is free, still changing, and definitely not finished.
                Make an account, poke around, break things, and tell me what
                could be better.
              </p>

              <div className="mt-7">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="group cursor-pointer rounded-full px-7 shadow-lg shadow-primary/20"
                  >
                    Try Forgeworks
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>

              <p className="mt-5 text-xs text-muted-foreground">
                Free · No email required · Feedback genuinely welcome
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================================
// Footer
// ============================================================================

function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-7">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Image src="/logo.svg" alt="Forgeworks" width={23} height={23} />
            </div>

            <div>
              <p className="text-sm font-semibold">Forgeworks</p>

              <p className="text-[10px] text-muted-foreground">
                An independent creator project.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <a
              href="#workflow"
              className="transition-colors hover:text-foreground"
            >
              Workflow
            </a>

            <a
              href="#tools"
              className="transition-colors hover:text-foreground"
            >
              Tools
            </a>

            <a href="#why" className="transition-colors hover:text-foreground">
              Why
            </a>

            <Link
              href="/login"
              className="transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms
            </Link>

            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy
            </Link>

            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// Main
// ============================================================================

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground antialiased">
      <LandingBackground />

      <Navbar />

      <main className="relative z-10">
        <Hero />
        <Workflow />
        <Tools />
        <Why />
        <Screenshots />
        <BetaSection />
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
