"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  BookOpenText,
  Boxes,
  FolderKanban,
  Globe2,
  House,
  LibraryBig,
  Network,
  NotebookTabs,
  UsersRound,
  MapPin,
  Flag,
  CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";

const primary = [
  { href: "/atlas", label: "Overview", icon: House },
  { href: "/atlas/entries", label: "All Entries", icon: LibraryBig },
];

const library = [
  {
    href: "/atlas/entries?type=character",
    label: "Characters",
    icon: UsersRound,
  },
  { href: "/atlas/entries?type=location", label: "Locations", icon: MapPin },
  { href: "/atlas/entries?type=faction", label: "Factions", icon: Flag },
  {
    href: "/atlas/entries?type=organization",
    label: "Organizations",
    icon: Boxes,
  },
  { href: "/atlas/entries?type=event", label: "Events", icon: CalendarRange },
];

const organize = [
  { href: "/atlas/worlds", label: "Worlds", icon: Globe2 },
  { href: "/atlas/collections", label: "Collections", icon: FolderKanban },
  { href: "/atlas/lorebooks", label: "Lorebooks", icon: NotebookTabs },
];

type NavItem = (typeof primary)[number];

function NavLinkContent({ href, label, icon: Icon }: NavItem) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [cleanHref, rawQuery = ""] = href.split("?");
  const hrefParams = new URLSearchParams(rawQuery);

  const hrefType = hrefParams.get("type");
  const currentType = searchParams.get("type");

  const active =
    cleanHref === "/atlas"
      ? pathname === "/atlas"
      : cleanHref === "/atlas/entries"
        ? hrefType
          ? pathname === cleanHref && currentType === hrefType
          : pathname === cleanHref && !currentType
        : pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function NavLink(props: NavItem) {
  return (
    <Suspense
      fallback={
        <Link
          href={props.href}
          className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <props.icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{props.label}</span>
        </Link>
      }
    >
      <NavLinkContent {...props} />
    </Suspense>
  );
}

function Section({ label, items }: { label: string; items: typeof primary }) {
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
        {label}
      </p>
      {items.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </div>
  );
}

export function AtlasSidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border/60 bg-card/40">
      <div className="border-b border-border/60 p-4">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Janitor Forge
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">Atlas</p>
            <p className="text-xs text-muted-foreground">
              Worldbuilding workspace
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-3">
        <Section label="Workspace" items={primary} />
        <Section label="Library" items={library} />
        <Section label="Organize" items={organize} />

        <div className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
            Coming later
          </p>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground/50">
            <Boxes className="h-4 w-4" /> Graph
          </div>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground/50">
            <BookOpenText className="h-4 w-4" /> Timeline
          </div>
        </div>
      </nav>
    </aside>
  );
}
