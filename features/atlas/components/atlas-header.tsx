"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AtlasSearch } from "@/features/atlas/components/atlas-search";
import { CreateEntryDialog } from "@/features/atlas/components/entries/create-entry-dialog";

export function AtlasHeader({
  onOpenMobileNav,
}: {
  onOpenMobileNav: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open Atlas navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <AtlasSearch />
        <CreateEntryDialog />
      </div>
    </header>
  );
}
