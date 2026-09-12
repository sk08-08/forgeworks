"use client";

import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AtlasSearch } from "@/features/atlas/components/atlas-search";
import { CreateEntryDialog } from "@/features/atlas/components/entries/create-entry-dialog";

export function AtlasHeader({
  onOpenMobileNav,
}: {
  onOpenMobileNav: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/88 backdrop-blur-xl">
      <div className="flex min-h-16 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 cursor-pointer rounded-xl lg:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open Atlas navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <AtlasSearch />
        </div>

        <div className="shrink-0">
          <CreateEntryDialog
            trigger={
              <Button
                className="h-10 cursor-pointer rounded-xl px-3 sm:px-4"
                aria-label="Create new Atlas entry"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New entry</span>
              </Button>
            }
          />
        </div>
      </div>
    </header>
  );
}
