import type { ReactNode } from "react";

function Pulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-muted/30 ${className}`}
      aria-hidden="true"
    />
  );
}

function Frame({
  children,
  reserveSaveBar = false,
}: {
  children: ReactNode;
  reserveSaveBar?: boolean;
}) {
  return (
    <div
      className="mx-auto w-full max-w-[92rem] space-y-6 p-3 sm:p-6 md:p-8 lg:p-10"
      style={
        reserveSaveBar
          ? {
              paddingBottom: "calc(7rem + env(safe-area-inset-bottom))",
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

function DetailHeroSkeleton({
  withBadge = false,
  withIcon = false,
  description = false,
}: {
  withBadge?: boolean;
  withIcon?: boolean;
  description?: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/70 p-5 shadow-sm sm:p-6 lg:p-7">
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Pulse className="h-4 w-28" />

          <div className="mt-4 flex min-w-0 flex-wrap items-center gap-3">
            {withIcon ? (
              <Pulse className="h-11 w-11 shrink-0 rounded-xl" />
            ) : null}

            <Pulse className="h-10 w-64 max-w-[72vw] sm:h-12 sm:w-80" />

            {withBadge ? <Pulse className="h-6 w-20 rounded-full" /> : null}
          </div>

          <Pulse className="mt-3 h-3.5 w-56 max-w-full" />

          {description ? (
            <div className="mt-4 max-w-3xl space-y-2">
              <Pulse className="h-3.5 w-full" />
              <Pulse className="h-3.5 w-4/5" />
            </div>
          ) : null}
        </div>

        <Pulse className="h-10 w-24 shrink-0 rounded-xl" />
      </div>
    </section>
  );
}

function StatsSkeleton({ count }: { count: 3 | 4 }) {
  return (
    <section
      className={
        count === 4
          ? "grid grid-cols-2 gap-3 md:grid-cols-4"
          : "grid gap-3 sm:grid-cols-3"
      }
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <Pulse className="h-5 w-5 shrink-0 rounded-md" />
            <div className="min-w-0 space-y-2">
              <Pulse className="h-6 w-12" />
              <Pulse className="h-3 w-24 max-w-full" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

function TabsSkeleton({ width = "w-80" }: { width?: string }) {
  return (
    <div
      className={`flex h-11 max-w-full gap-1 rounded-2xl bg-muted/35 p-1 ${width}`}
    >
      <Pulse className="h-9 flex-1 rounded-xl" />
      <Pulse className="h-9 flex-1 rounded-xl" />
      <Pulse className="h-9 flex-1 rounded-xl" />
    </div>
  );
}

function CatalogGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <Pulse className="h-11 w-11 shrink-0 rounded-xl" />
            <Pulse className="h-6 w-20 rounded-full" />
          </div>

          <Pulse className="mt-5 h-5 w-44 max-w-[80%]" />

          <div className="mt-4 space-y-2">
            <Pulse className="h-3.5 w-full" />
            <Pulse className="h-3.5 w-10/12" />
            <Pulse className="h-3.5 w-7/12" />
          </div>

          <Pulse className="mt-5 h-px w-full rounded-none" />

          <div className="mt-3 flex items-center justify-between gap-4">
            <Pulse className="h-3 w-20" />
            <Pulse className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AtlasOverviewSkeleton() {
  return (
    <Frame>
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-0 -z-20 bg-linear-to-br from-primary/[0.09] via-background/10 to-fuchsia-500/[0.05]" />

        <div className="grid xl:min-h-[26rem] xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div className="flex min-w-0 flex-col justify-center p-5 sm:p-8 lg:p-10 xl:p-12">
            <div className="flex items-center gap-3">
              <Pulse className="h-11 w-11 shrink-0 rounded-2xl" />
              <div className="space-y-2">
                <Pulse className="h-4 w-20" />
                <Pulse className="h-3 w-52 max-w-[60vw]" />
              </div>
            </div>

            <Pulse className="mt-7 h-11 w-[34rem] max-w-full sm:h-12" />

            <div className="mt-5 max-w-2xl space-y-2">
              <Pulse className="h-4 w-full" />
              <Pulse className="h-4 w-11/12" />
              <Pulse className="h-4 w-7/12" />
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Pulse className="h-10 w-full rounded-xl sm:w-36" />
              <Pulse className="h-10 w-full rounded-xl sm:w-40" />
            </div>

            <div className="mt-7 flex flex-wrap gap-4">
              <Pulse className="h-3 w-24" />
              <Pulse className="h-3 w-28" />
              <Pulse className="h-3 w-28" />
            </div>
          </div>

          <div className="relative flex min-h-[18rem] items-center border-t border-border/60 bg-background/30 p-5 sm:min-h-[20rem] sm:p-7 xl:min-h-[22rem] xl:border-l xl:border-t-0 xl:p-8">
            <div className="mx-auto w-full max-w-md rounded-3xl border border-border/70 bg-card/75 p-4 shadow-xl sm:p-5">
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <Pulse className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="space-y-2">
                    <Pulse className="h-4 w-28" />
                    <Pulse className="h-3 w-36" />
                  </div>
                </div>

                <Pulse className="h-6 w-20 rounded-full" />
              </div>

              <div className="mt-4 space-y-3">
                <Pulse className="h-16 w-full rounded-2xl" />
                <div className="ml-5 border-l border-dashed border-border/60 pl-4">
                  <Pulse className="h-16 w-full rounded-2xl" />
                </div>
                <div className="ml-5 border-l border-dashed border-border/60 pl-4">
                  <Pulse className="h-16 w-full rounded-2xl" />
                </div>
              </div>

              <Pulse className="mt-4 h-14 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 space-y-2">
          <Pulse className="h-3 w-20" />
          <Pulse className="h-7 w-44" />
          <Pulse className="h-4 w-72 max-w-full" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <Pulse className="h-10 w-10 rounded-xl" />
                <Pulse className="h-8 w-12" />
              </div>

              <Pulse className="mt-4 h-5 w-28" />

              <div className="mt-3 space-y-2">
                <Pulse className="h-3.5 w-full" />
                <Pulse className="h-3.5 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/85 shadow-md">
          <div className="flex items-center justify-between gap-4 border-b border-border/50 p-5">
            <div className="flex items-center gap-3">
              <Pulse className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Pulse className="h-5 w-36" />
                <Pulse className="h-3 w-44" />
              </div>
            </div>

            <Pulse className="hidden h-8 w-28 rounded-xl sm:block" />
          </div>

          <div className="divide-y divide-border/60">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
              >
                <Pulse className="h-10 w-10 shrink-0 rounded-xl" />

                <div className="min-w-0 flex-1 space-y-2">
                  <Pulse className="h-4 w-48 max-w-full" />
                  <Pulse className="h-3 w-72 max-w-full" />
                </div>

                <Pulse className="hidden h-3 w-16 sm:block" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 space-y-2">
            <Pulse className="h-6 w-72 max-w-full" />
            <Pulse className="h-4 w-[32rem] max-w-full" />
          </div>

          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border/65 bg-card/65 p-4"
              >
                <Pulse className="h-9 w-9 rounded-xl" />
                <Pulse className="mt-3 h-4 w-32" />
                <Pulse className="mt-2 h-3 w-full" />
                <Pulse className="mt-2 h-3 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </Frame>
  );
}

/**
 * This skeleton is intentionally results-only.
 *
 * LorebooksView keeps its real hero, stats and controls mounted while the
 * collection is loading, then renders this component only inside the Results
 * area. Keeping this component scoped to the cards prevents duplicate page
 * chrome and large layout jumps.
 */
export function AtlasLorebooksListSkeleton() {
  return <CatalogGridSkeleton count={8} />;
}

export function AtlasEntryDetailSkeleton() {
  return (
    <Frame reserveSaveBar>
      <DetailHeroSkeleton withBadge />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <div className="rounded-2xl border border-border/70 bg-card/85 p-5 shadow-sm">
            <Pulse className="h-5 w-24" />

            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_14rem]">
              <Pulse className="h-10 w-full" />
              <Pulse className="h-10 w-full" />
              <Pulse className="h-10 w-full sm:col-span-2" />
              <Pulse className="h-10 w-full sm:col-span-2" />
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/85 p-5 shadow-sm">
            <Pulse className="h-5 w-28" />
            <Pulse className="mt-5 h-[24rem] w-full rounded-2xl" />
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/85 p-5 shadow-sm">
            <Pulse className="h-5 w-32" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Pulse className="h-16 w-full" />
              <Pulse className="h-16 w-full" />
            </div>
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <Pulse className="h-4 w-28" />
                <Pulse className="h-5 w-12 rounded-full" />
              </div>

              <div className="mt-4 space-y-2">
                <Pulse className="h-10 w-full" />
                <Pulse className="h-10 w-full" />
              </div>
            </div>
          ))}
        </aside>
      </div>
    </Frame>
  );
}

export function AtlasWorldDetailSkeleton() {
  return (
    <Frame reserveSaveBar>
      <DetailHeroSkeleton withIcon />

      <StatsSkeleton count={3} />

      <TabsSkeleton width="w-96" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-5 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
          <Pulse className="h-5 w-28" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Pulse className="h-10 w-full" />
            <Pulse className="h-10 w-full" />
          </div>

          <Pulse className="h-24 w-full" />
          <Pulse className="h-40 w-full" />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
            <Pulse className="h-5 w-32" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Pulse key={index} className="h-12 w-full" />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
            <Pulse className="h-5 w-28" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Pulse key={index} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function AtlasCollectionDetailSkeleton() {
  return (
    <Frame reserveSaveBar>
      <DetailHeroSkeleton withIcon description />

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="min-w-0 overflow-hidden rounded-[1.6rem] border border-border/70 bg-card/70 shadow-sm">
          <div className="border-b border-border/60 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-2">
                <Pulse className="h-5 w-28" />
                <Pulse className="h-3 w-72 max-w-full" />
              </div>

              <div className="flex gap-1 rounded-xl bg-muted/35 p-1">
                <Pulse className="h-9 w-20 rounded-lg" />
                <Pulse className="h-9 w-20 rounded-lg" />
                <Pulse className="h-9 w-24 rounded-lg" />
              </div>
            </div>

            <Pulse className="mt-4 h-11 w-full rounded-xl" />
          </div>

          <div className="grid gap-2 p-3 sm:p-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-xl border border-border/65 bg-background/45 p-3"
              >
                <Pulse className="h-4 w-4 shrink-0 rounded-sm" />

                <div className="min-w-0 flex-1 space-y-2">
                  <Pulse className="h-4 w-36 max-w-full" />
                  <Pulse className="h-5 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="min-w-0">
          <div className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm">
            <Pulse className="h-5 w-32" />

            <div className="mt-5 space-y-4">
              <Pulse className="h-10 w-full" />
              <Pulse className="h-24 w-full" />
              <Pulse className="h-px w-full rounded-none" />
              <div className="flex justify-between gap-3">
                <Pulse className="h-3 w-20" />
                <Pulse className="h-3 w-12" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Frame>
  );
}

export function AtlasLorebookDetailSkeleton() {
  return (
    <Frame reserveSaveBar>
      <DetailHeroSkeleton withBadge description />

      <TabsSkeleton width="w-80" />

      <section className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/70 shadow-sm">
        <div className="border-b border-border/60 bg-muted/[0.12] px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <Pulse className="h-8 w-8 rounded-lg" />
            <div className="space-y-2">
              <Pulse className="h-4 w-28" />
              <Pulse className="h-3 w-44 max-w-full" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1.5fr)]">
          <Pulse className="h-10 w-full" />
          <Pulse className="h-16 w-full" />
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/70 shadow-sm">
        <div className="border-b border-border/60 bg-muted/[0.12] px-4 py-4 sm:px-5">
          <div className="space-y-2">
            <Pulse className="h-4 w-28" />
            <Pulse className="h-3 w-72 max-w-full" />
          </div>
        </div>

        <div className="grid min-h-0 xl:grid-cols-[21rem_minmax(0,1fr)]">
          <aside className="min-w-0 border-b border-border/60 bg-muted/[0.06] p-2.5 xl:border-b-0 xl:border-r">
            <div className="mb-2 border-b border-border/50 px-2 py-2">
              <Pulse className="h-4 w-28" />
              <Pulse className="mt-2 h-3 w-16" />
            </div>

            <div className="space-y-1.5">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-xl border border-transparent px-3 py-3"
                >
                  <Pulse className="h-6 w-6 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Pulse className="h-4 w-36 max-w-full" />
                    <Pulse className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 bg-background/20">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
              <div className="space-y-2">
                <Pulse className="h-5 w-40" />
                <Pulse className="h-3 w-28" />
              </div>

              <div className="flex gap-2">
                <Pulse className="h-9 w-9 rounded-lg" />
                <Pulse className="h-9 w-9 rounded-lg" />
              </div>
            </div>

            <div className="space-y-5 p-4 sm:p-5">
              <Pulse className="h-16 w-full rounded-xl" />

              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Pulse key={index} className="h-10 w-full" />
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Pulse className="h-28 w-full" />
                <Pulse className="h-28 w-full" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Pulse className="h-11 w-full" />
                <Pulse className="h-11 w-full" />
              </div>
            </div>

            <div className="flex justify-end border-t border-border/60 px-4 py-3 sm:px-5">
              <Pulse className="h-10 w-full rounded-xl sm:w-44" />
            </div>
          </div>
        </div>
      </section>
    </Frame>
  );
}
