import type { Metadata } from "next";
import { ChangelogPage } from "@/features/changelog/components/changelog-page";
import { getPublishedChangelogEntries } from "@/features/changelog/actions/changelog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Changelog — Forgeworks",
  description:
    "The Forgeworks release archive: new features, fixes, platform changes and technical notes.",
};

export default async function ChangelogRoute() {
  const result = await getPublishedChangelogEntries();

  return <ChangelogPage entries={result.entries || []} />;
}
