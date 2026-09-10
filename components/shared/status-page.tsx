import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  Bot,
  FileText,
  Globe,
  Home,
  LockKeyhole,
  SearchX,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StatusPageAction {
  label: string;
  href: string;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

interface StatusPageProps {
  code?: string;
  eyebrow?: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  primaryAction?: StatusPageAction;
  secondaryAction?: StatusPageAction;
  footer?: string;
  className?: string;
}

export function StatusPage({
  code = "404",
  eyebrow = "Lost signal",
  title,
  description,
  icon: Icon = SearchX,
  primaryAction = {
    label: "Return to the Forge",
    href: "/",
    icon: Home,
  },
  secondaryAction,
  footer = "Forgeworks — Bot Creator Toolkit",
  className,
}: StatusPageProps) {
  const PrimaryIcon = primaryAction.icon;
  const SecondaryIcon = secondaryAction?.icon;

  return (
    <main
      className={cn(
        "jf-status-scene relative isolate min-h-screen overflow-hidden bg-background text-foreground",
        className,
      )}
    >
      {/* ========================================================== */}
      {/* Background world                                           */}
      {/* ========================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-30"
      >
        <div className="jf-status-aurora jf-status-aurora-a" />
        <div className="jf-status-aurora jf-status-aurora-b" />
        <div className="jf-status-aurora jf-status-aurora-c" />

        <div className="jf-status-grid absolute inset-0" />

        <div className="jf-status-vignette absolute inset-0" />

        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />
      </div>

      {/* ========================================================== */}
      {/* Floating dust / particles                                  */}
      {/* ========================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <span className="jf-status-particle jf-status-particle-1" />
        <span className="jf-status-particle jf-status-particle-2" />
        <span className="jf-status-particle jf-status-particle-3" />
        <span className="jf-status-particle jf-status-particle-4" />
        <span className="jf-status-particle jf-status-particle-5" />

        <Sparkles className="jf-status-spark jf-status-spark-1 absolute h-5 w-5 text-purple-400/45" />
        <WandSparkles className="jf-status-spark jf-status-spark-2 absolute h-6 w-6 text-primary/35" />
        <Sparkles className="jf-status-spark jf-status-spark-3 absolute h-4 w-4 text-pink-400/40" />
      </div>

      {/* ========================================================== */}
      {/* Page shell                                                 */}
      {/* ========================================================== */}

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-10">
        {/* ======================================================== */}
        {/* Top bar                                                  */}
        {/* ======================================================== */}

        <header className="jf-status-enter flex items-center justify-between gap-4">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-3 rounded-xl"
          >
            <div className="neon-glow-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/15 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105">
              <Image
                src="/logo.svg"
                alt="Forgeworks"
                width={25}
                height={25}
                priority
              />
            </div>

            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold leading-tight">
                Forgeworks
              </p>
              <p className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Bot Creator Toolkit
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-background/55 px-3 py-1.5 shadow-sm backdrop-blur-xl">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-purple-400/55" />
              <span className="relative h-2 w-2 rounded-full bg-purple-500" />
            </span>

            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {eyebrow}
            </span>
          </div>
        </header>

        {/* ======================================================== */}
        {/* Main hero                                                */}
        {/* ======================================================== */}

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 lg:py-8">
          {/* ====================================================== */}
          {/* Text                                                   */}
          {/* ====================================================== */}

          <section className="jf-status-enter jf-status-enter-delay-1 relative z-20 mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left">
            <div className="mb-5 flex justify-center lg:justify-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 shadow-sm backdrop-blur">
                <Icon className="h-3.5 w-3.5 text-primary" />

                <span className="text-[11px] font-semibold uppercase tracking-[0.19em] text-primary">
                  Signal lost · {code}
                </span>
              </div>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-4 -top-10 hidden select-none font-black text-[9rem] leading-none tracking-[-0.08em] text-primary/[0.035] lg:block"
              >
                {code}
              </div>

              <h1 className="relative text-balance text-4xl font-extrabold leading-[1.03] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                {title}
              </h1>
            </div>

            <p className="mx-auto mt-5 max-w-lg text-pretty text-sm leading-7 text-muted-foreground sm:text-base lg:mx-0">
              {description}
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button
                asChild
                size="lg"
                variant={primaryAction.variant || "default"}
                className="group h-11 cursor-pointer rounded-full px-6 shadow-md shadow-primary/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_28px] hover:shadow-primary/30"
              >
                <Link href={primaryAction.href}>
                  {PrimaryIcon && (
                    <PrimaryIcon className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                  )}

                  {primaryAction.label}
                </Link>
              </Button>

              {secondaryAction && (
                <Button
                  asChild
                  size="lg"
                  variant={secondaryAction.variant || "outline"}
                  className="group h-11 cursor-pointer rounded-full border-border/70 bg-background/55 px-6 backdrop-blur transition-all duration-300 hover:bg-primary/5"
                >
                  <Link href={secondaryAction.href}>
                    {SecondaryIcon && (
                      <SecondaryIcon className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                    )}

                    {secondaryAction.label}
                  </Link>
                </Button>
              )}
            </div>

            <div className="mt-8 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.17em] text-muted-foreground/50 lg:justify-start">
              <span className="h-px w-8 bg-border" />
              {footer}
            </div>
          </section>

          {/* ====================================================== */}
          {/* Animated Forge visual                                  */}
          {/* ====================================================== */}

          <section
            aria-hidden="true"
            className="jf-status-enter jf-status-enter-delay-2 relative mx-auto h-[390px] w-full max-w-[620px] sm:h-[470px] lg:h-[540px]"
          >
            {/* Back glow */}
            <div className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[85px]" />

            {/* ==================================================== */}
            {/* Main broken portal                                  */}
            {/* ==================================================== */}

            <div className="jf-status-portal absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 sm:h-72 sm:w-72 lg:h-80 lg:w-80">
              <div className="jf-status-ring jf-status-ring-outer absolute inset-0 rounded-full border border-primary/15" />

              <div className="jf-status-ring jf-status-ring-middle absolute inset-[11%] rounded-full border border-purple-400/25" />

              <div className="jf-status-ring jf-status-ring-inner absolute inset-[23%] rounded-full border border-pink-400/20" />

              {/* orbit markers */}
              <span className="jf-status-orbit-dot jf-status-orbit-dot-a absolute" />
              <span className="jf-status-orbit-dot jf-status-orbit-dot-b absolute" />

              {/* center */}
              <div className="absolute inset-[31%] flex items-center justify-center rounded-full border border-primary/25 bg-background/75 shadow-2xl shadow-primary/20 backdrop-blur-xl">
                <div className="absolute inset-0 rounded-full bg-linear-to-br from-primary/15 via-purple-500/5 to-pink-500/10" />

                <div className="relative text-center">
                  <p className="jf-status-code-glitch select-none text-5xl font-black tracking-[-0.08em] sm:text-6xl">
                    {code}
                  </p>

                  <div className="mt-1 flex items-center justify-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-purple-400" />
                    <span className="h-1 w-5 rounded-full bg-primary/50" />
                    <span className="h-1 w-1 rounded-full bg-pink-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* ==================================================== */}
            {/* Floating Forge cards                                 */}
            {/* ==================================================== */}

            <div className="jf-status-float-card jf-status-card-bot absolute left-[2%] top-[7%] w-40 rotate-[-7deg] sm:left-[4%] sm:top-[5%] sm:w-44">
              <div className="rounded-2xl border border-green-500/20 bg-card/70 p-2.5 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                    <Bot className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">
                      Character Forge
                    </p>

                    <p className="truncate text-[9px] text-muted-foreground">
                      connection lost
                    </p>
                  </div>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="jf-status-loading-bar h-full rounded-full bg-green-500/60" />
                </div>
              </div>
            </div>

            <div className="jf-status-float-card jf-status-card-form absolute right-[0%] top-[13%] w-39 rotate-[8deg] sm:right-[2%] sm:w-43">
              <div className="rounded-2xl border border-blue-500/20 bg-card/70 p-2.5 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                    <FileText className="h-4.5 w-4.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">Forms</p>

                    <p className="text-[9px] text-muted-foreground">
                      route unavailable
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="jf-status-float-card jf-status-card-atlas absolute bottom-[5%] right-[8%] w-42 rotate-[-5deg] sm:right-[10%] sm:w-48">
              <div className="rounded-2xl border border-pink-500/20 bg-card/70 p-3 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500">
                    <Globe className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold">Atlas Node</p>
                    <p className="text-[9px] text-muted-foreground">
                      drifting off-map
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="jf-status-float-card jf-status-card-spark absolute bottom-[7%] left-[7%] rotate-[6deg]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-400/20 bg-card/60 shadow-xl backdrop-blur-xl">
                <WandSparkles className="h-6 w-6 text-purple-400" />
              </div>
            </div>

            {/* connector traces */}
            <svg
              viewBox="0 0 620 540"
              className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block"
              fill="none"
            >
              <path
                d="M140 115 C215 120 215 205 275 220"
                className="jf-status-trace"
              />

              <path
                d="M495 145 C420 145 410 205 360 230"
                className="jf-status-trace jf-status-trace-delay"
              />

              <path
                d="M475 430 C410 410 410 345 365 320"
                className="jf-status-trace jf-status-trace-delay-2"
              />
            </svg>
          </section>
        </div>
      </div>
    </main>
  );
}

export function UnavailableProfileStatusPage() {
  return (
    <StatusPage
      code="404"
      eyebrow="Profile unavailable"
      title="This creator slipped out of view."
      description="Their profile may be private, limited to followers, or simply no longer available from this path."
      icon={LockKeyhole}
      primaryAction={{
        label: "Return to the Forge",
        href: "/",
        icon: Home,
      }}
    />
  );
}

export function UnavailableResourceStatusPage({
  resourceName = "resource",
}: {
  resourceName?: string;
}) {
  return (
    <StatusPage
      code="404"
      eyebrow="Content unavailable"
      title={`This ${resourceName} drifted off the map.`}
      description="It may have been unpublished, removed, or exist somewhere your account can't currently reach."
      icon={SearchX}
      primaryAction={{
        label: "Return to the Forge",
        href: "/",
        icon: Home,
      }}
    />
  );
}

export function UnavailableCreatorPageEditorStatusPage() {
  return (
    <StatusPage
      code="404"
      eyebrow="Editor unavailable"
      title="This Creator Page is out of reach."
      description="It may no longer exist, may have been removed, or your account may not have permission to edit it."
      icon={LockKeyhole}
      primaryAction={{
        label: "Return to the Forge",
        href: "/",
        icon: Home,
      }}
    />
  );
}

export function UnavailableBotWorkspaceStatusPage() {
  return (
    <StatusPage
      code="404"
      eyebrow="Workspace unavailable"
      title="This workspace is out of reach."
      description="The bot may no longer exist, collaboration access may have been removed, or this account may not have permission to open its workspace."
      icon={LockKeyhole}
      primaryAction={{
        label: "Return to the Forge",
        href: "/",
        icon: Home,
      }}
    />
  );
}
