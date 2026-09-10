import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Database,
  Eye,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { PrivacyContent } from "./privacy-content";

export const metadata: Metadata = {
  title: "Privacy Policy | Forgeworks",
  description:
    "How Forgeworks handles account information, creator content, submissions, safety data, and privacy controls.",
  openGraph: {
    title: "Privacy Policy | Forgeworks",
    description:
      "A plain-language overview of how Forgeworks handles account information, creator content, and privacy.",
  },
};

const privacyHighlights = [
  {
    icon: Eye,
    title: "No email required",
    description: "A username and PIN are enough to create an account.",
  },
  {
    icon: Database,
    title: "Your work stays yours",
    description:
      "Forgeworks stores the content needed to provide the tools you use.",
  },
  {
    icon: ShieldCheck,
    title: "Safety data has a purpose",
    description:
      "Limited technical data may be processed for security, abuse prevention, and moderation.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-background text-foreground antialiased">
      {/* Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -left-52 -top-40 h-150 w-150 rounded-full bg-purple-500/10 blur-[120px]" />

        <div className="absolute -right-56 top-[28rem] h-140 w-140 rounded-full bg-blue-500/7 blur-[130px]" />

        <div className="absolute bottom-[-12rem] left-[38%] h-120 w-120 rounded-full bg-pink-500/6 blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,var(--background)_92%)]" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/78 backdrop-blur-2xl">
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
                Privacy
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Forgeworks
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-14 sm:px-7 sm:pt-20">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/65 px-6 py-10 shadow-xl shadow-black/5 backdrop-blur sm:px-10 sm:py-12 lg:px-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/12 blur-[90px]" />

            <div className="absolute bottom-[-8rem] left-[10%] h-60 w-60 rounded-full bg-blue-500/7 blur-[90px]" />

            <Sparkles className="absolute right-[12%] top-[20%] h-6 w-6 rotate-12 text-primary/20" />
          </div>

          <div className="relative max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/7 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              <LockKeyhole className="h-3.5 w-3.5" />
              Plain-language privacy
            </div>

            <h1 className="text-balance text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              Privacy without the{" "}
              <span className="bg-linear-to-r from-primary via-purple-400 to-blue-400 bg-clip-text text-transparent">
                mystery.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-pretty leading-7 text-muted-foreground sm:text-lg">
              This page explains what Forgeworks needs to store, why it is used,
              what may be public, and what controls you have over your
              information.
            </p>

            <p className="mt-5 text-xs text-muted-foreground">
              Last updated: August 26, 2026
            </p>
          </div>
        </section>

        {/* Highlights */}
        <section className="mt-6 grid gap-3 md:grid-cols-3">
          {privacyHighlights.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-4 w-4" />
              </div>

              <h2 className="mt-4 text-sm font-semibold">{item.title}</h2>

              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </section>

        {/* Main policy */}
        <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
          <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/70 shadow-lg shadow-black/5 backdrop-blur">
            <div className="border-b border-border/60 px-6 py-5 sm:px-9">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                  <FileText className="h-4.5 w-4.5" />
                </div>

                <div>
                  <p className="text-sm font-semibold">Privacy Policy</p>

                  <p className="text-xs text-muted-foreground">
                    The details, without unnecessary legal theater.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-8 sm:px-9 sm:py-10">
              <PrivacyContent />
            </div>
          </div>

          {/* Side note */}
          <aside className="h-fit space-y-4 self-start lg:sticky lg:top-20 lg:transition-transform lg:duration-300">
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
              <ShieldCheck className="h-5 w-5 text-primary" />

              <p className="mt-3 text-sm font-semibold">Something unclear?</p>

              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Forgeworks is still an independent Beta project. If something on
                this page does not make sense, feedback is welcome.
              </p>

              <Link
                href="/login"
                className="mt-4 inline-flex text-xs font-medium text-primary transition-opacity hover:opacity-75"
              >
                Open Forgeworks →
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60">
              <div className="border-b border-border/60 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Quick summary
                </p>
              </div>

              <div className="space-y-3 p-4">
                {[
                  "No email is required to create an account.",
                  "Public content follows the visibility choices you make.",
                  "Form safety tools may process limited network information.",
                  "Forgeworks does not sell your information to advertisers.",
                  "You can manage or remove much of your content directly.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />

                    <p className="text-xs leading-5 text-muted-foreground">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Related
              </p>

              <div className="mt-3 space-y-1">
                <Link
                  href="/terms"
                  className="group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors hover:bg-primary/5"
                >
                  <span>Terms of Service</span>
                  <span className="text-muted-foreground transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>

                <Link
                  href="/"
                  className="group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors hover:bg-primary/5"
                >
                  <span>Forgeworks Home</span>
                  <span className="text-muted-foreground transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>

                <Link
                  href="/login"
                  className="group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors hover:bg-primary/5"
                >
                  <span>Sign in</span>
                  <span className="text-muted-foreground transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-purple-500/15 bg-purple-500/5 p-4">
              <div
                aria-hidden="true"
                className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl"
              />

              <div className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-500">
                  Independent project
                </p>

                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Forgeworks is not a large company or ad platform. This policy
                  exists so people can understand what the project does with
                  their information.
                </p>
              </div>
            </div>
          </aside>
        </section>

        {/* Footer navigation */}
        <footer className="mt-12 flex flex-col gap-4 border-t border-border/60 pt-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Forgeworks · Independent creator project</p>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="transition-colors hover:text-foreground">
              Home
            </Link>

            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms
            </Link>

            <Link
              href="/login"
              className="transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
