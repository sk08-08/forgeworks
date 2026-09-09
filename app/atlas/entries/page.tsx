import { Suspense } from "react";
import { EntriesView } from "@/features/atlas/views/entries/entries-view";

function EntriesLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-16 sm:p-6 md:p-8 lg:p-10">
      <div className="h-40 animate-pulse rounded-3xl border border-border/60 bg-muted/20" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl border border-border/60 bg-muted/20" />
        ))}
      </div>
      <div className="h-11 animate-pulse rounded-xl border border-border/60 bg-muted/20" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-2xl border border-border/60 bg-muted/20" />
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<EntriesLoading />}>
      <EntriesView />
    </Suspense>
  );
}
