import type { ReactNode } from "react";

function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted/30 ${className}`} />;
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-16 sm:p-6 md:p-8 lg:p-10">
      {children}
    </div>
  );
}

function DetailHeaderSkeleton({
  withBadge = false,
}: {
  withBadge?: boolean;
}) {
  return (
    <div className="space-y-4">
      <Pulse className="h-4 w-28" />
      <div className="flex flex-wrap items-center gap-3">
        <Pulse className="h-11 w-11 rounded-xl" />
        <Pulse className="h-9 w-64 max-w-[70vw]" />
        {withBadge ? <Pulse className="h-6 w-20 rounded-full" /> : null}
      </div>
      <Pulse className="h-4 w-72 max-w-full" />
    </div>
  );
}

export function AtlasOverviewSkeleton() {
  return (
    <Frame>
      <div className="space-y-3">
        <Pulse className="h-9 w-64" />
        <Pulse className="h-4 w-[28rem] max-w-full" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border/60 bg-card/60 p-5"
          >
            <Pulse className="h-4 w-24" />
            <Pulse className="mt-4 h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/60 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <Pulse className="h-5 w-32" />
          <Pulse className="h-8 w-24" />
        </div>

        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/35 p-4"
            >
              <Pulse className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Pulse className="h-4 w-48 max-w-full" />
                <Pulse className="h-3 w-72 max-w-full" />
              </div>
              <Pulse className="hidden h-5 w-20 rounded-full sm:block" />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function AtlasLorebooksListSkeleton() {
  return (
    <Frame>
      <div className="rounded-3xl border border-border/60 bg-card/60 p-5 sm:p-7">
        <Pulse className="h-6 w-40 rounded-full" />
        <Pulse className="mt-4 h-10 w-56" />
        <Pulse className="mt-3 h-4 w-[38rem] max-w-full" />
        <Pulse className="mt-2 h-4 w-[30rem] max-w-full" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border/60 bg-card/60 p-4"
          >
            <Pulse className="h-3 w-28" />
            <Pulse className="mt-3 h-8 w-14" />
          </div>
        ))}
      </div>

      <Pulse className="h-10 w-full" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border/60 bg-card/60 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <Pulse className="h-10 w-10 rounded-xl" />
              <Pulse className="h-6 w-20 rounded-full" />
            </div>
            <Pulse className="mt-4 h-5 w-44" />
            <Pulse className="mt-3 h-4 w-full" />
            <Pulse className="mt-2 h-4 w-4/5" />
            <Pulse className="mt-5 h-px w-full rounded-none" />
            <div className="mt-3 flex justify-between gap-4">
              <Pulse className="h-3 w-20" />
              <Pulse className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function AtlasEntryDetailSkeleton() {
  return (
    <Frame>
      <DetailHeaderSkeleton withBadge />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <Pulse className="h-5 w-24" />
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_14rem]">
              <Pulse className="h-10 w-full" />
              <Pulse className="h-10 w-full" />
              <Pulse className="h-10 w-full sm:col-span-2" />
              <Pulse className="h-10 w-full sm:col-span-2" />
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <Pulse className="h-5 w-28" />
            <Pulse className="mt-5 h-[24rem] w-full" />
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-border/60 bg-card/60 p-4"
            >
              <Pulse className="h-4 w-28" />
              <Pulse className="mt-4 h-10 w-full" />
              <Pulse className="mt-2 h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function AtlasWorldDetailSkeleton() {
  return (
    <Frame>
      <DetailHeaderSkeleton />

      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border/60 bg-card/60 p-4"
          >
            <Pulse className="h-8 w-16" />
            <Pulse className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>

      <Pulse className="h-10 w-96 max-w-full" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <Pulse className="h-5 w-28" />
          <Pulse className="mt-5 h-10 w-full" />
          <Pulse className="mt-4 h-28 w-full" />
          <Pulse className="mt-4 h-40 w-full" />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <Pulse className="h-5 w-32" />
            <Pulse className="mt-4 h-52 w-full" />
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <Pulse className="h-5 w-28" />
            <Pulse className="mt-4 h-40 w-full" />
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function AtlasCollectionDetailSkeleton() {
  return (
    <Frame>
      <DetailHeaderSkeleton />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(20rem,0.78fr)_minmax(0,1.62fr)]">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <Pulse className="h-5 w-36" />
          <Pulse className="mt-5 h-10 w-full" />
          <Pulse className="mt-4 h-32 w-full" />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <Pulse className="h-5 w-24" />
          <Pulse className="mt-5 h-10 w-full" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <Pulse key={index} className="h-11 w-full" />
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function AtlasLorebookDetailSkeleton() {
  return (
    <Frame>
      <DetailHeaderSkeleton withBadge />
      <Pulse className="h-10 w-80 max-w-full" />

      <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
        <Pulse className="h-5 w-32" />
        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Pulse className="h-10 w-full" />
          <Pulse className="h-24 w-full" />
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <Pulse className="h-5 w-32" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <Pulse key={index} className="h-16 w-full" />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <Pulse className="h-5 w-32" />
          <Pulse className="mt-4 h-20 w-full" />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Pulse key={index} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}
