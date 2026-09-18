"use client";

import { ExternalLink, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getDisplayBotExternalLinks, type BotExternalLink } from "@/features/bots/lib/bot-external-url";
import { cn } from "@/lib/utils";

export function BotVisitLinks({ links, className, onVisit }: { links: BotExternalLink[]; className?: string; onVisit?: () => void }) {
  const safe = getDisplayBotExternalLinks(links);
  if (safe.length === 0) return null;
  if (safe.length === 1) {
    const entry = safe[0];
    return <Button asChild variant="outline" className={cn("min-w-0 cursor-pointer", className)}>
      <a href={entry.url} target="_blank" rel="noopener noreferrer" onClick={onVisit} title={`Visit on ${entry.label || entry.platform}`}>
        <ExternalLink className="mr-1.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Visit Bot</span><span className="sr-only"> on {entry.label || entry.platform} (opens a new tab)</span>
      </a>
    </Button>;
  }
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className={cn("min-w-0 cursor-pointer", className)} aria-label={`Visit Bot: choose from ${safe.length} platforms`}>
        <ExternalLink className="mr-1.5 h-4 w-4 shrink-0" aria-hidden="true" />Visit Bot
        <span className="ml-1 rounded-md bg-primary/10 px-1.5 text-[10px] text-primary">{safe.length}</span>
        <ChevronDown className="ml-1 h-4 w-4 shrink-0" aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-2rem))] max-h-[min(60dvh,24rem)] overflow-y-auto">
      {safe.map((entry) => <DropdownMenuItem key={entry.url} asChild>
        <a href={entry.url} target="_blank" rel="noopener noreferrer" onClick={onVisit} className="flex min-w-0 cursor-pointer items-center justify-between gap-2">
          <span className="min-w-0 truncate">{entry.label || entry.platform}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="sr-only">(opens a new tab)</span>
        </a>
      </DropdownMenuItem>)}
    </DropdownMenuContent>
  </DropdownMenu>;
}
