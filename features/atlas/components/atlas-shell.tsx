"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AtlasHeader } from "./atlas-header";
import { AtlasSidebar } from "./atlas-sidebar";

export function AtlasShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div className="relative flex h-dvh min-w-0 overflow-hidden bg-background">
      <div className="hidden lg:block">
        <AtlasSidebar />
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close Atlas navigation"
          tabIndex={mobileOpen ? 0 : -1}
          className={cn(
            "absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 ease-out",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />

        <div
          className={cn(
            "relative h-full w-[min(19rem,88vw)] overflow-hidden border-r border-border/70 bg-background shadow-2xl transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <AtlasSidebar
            className="w-full border-r-0 bg-background"
            onNavigate={() => setMobileOpen(false)}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 z-10 h-9 w-9 cursor-pointer rounded-full border border-border/60 bg-background/85 shadow-sm backdrop-blur"
            onClick={() => setMobileOpen(false)}
            aria-label="Close Atlas navigation"
            tabIndex={mobileOpen ? 0 : -1}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <AtlasHeader onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
