"use client";

import { useState } from "react";
import { Expand, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import styles from "@/app/bots/[id]/bot-page.module.css";

/** A single original artwork URL, never upscaled, cropped, copied or saved. */
export function BotArtworkViewer({ imageUrl, botName }: { imageUrl: string; botName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        aria-label={`Enlarge artwork for ${botName}`}
        className={`${styles.artworkTrigger} group relative z-10 flex h-full w-full min-w-0 cursor-zoom-in items-center justify-center overflow-hidden p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:p-6`}>
        <img src={imageUrl} alt={botName} className={`${styles.heroImage} max-h-[35rem] h-auto w-full max-w-full object-contain drop-shadow-xl`} />
        <span className={`${styles.artworkHint} absolute bottom-3 right-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/20 bg-black/65 px-3 text-xs font-medium text-white backdrop-blur-md sm:bottom-5 sm:right-5`}>
          <Expand className="h-3.5 w-3.5" aria-hidden="true" /> View artwork
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[min(96vw,90rem)] flex-col gap-2 overflow-hidden border-border/60 bg-background/95 p-3 shadow-2xl sm:p-5">
          <DialogHeader className="min-w-0 pr-8 text-left">
            <DialogTitle className="flex min-w-0 items-center gap-2 truncate text-sm sm:text-base">
              <ImageIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{botName}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">Original artwork · Escape or close to return</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl bg-black/80 p-2 sm:p-4">
            <img src={imageUrl} alt={`${botName} artwork enlarged`} className="h-auto max-h-[calc(100dvh-10rem)] w-auto max-w-full object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
