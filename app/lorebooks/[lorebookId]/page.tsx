import { redirect } from "next/navigation";

type LegacyLorebookPageProps = {
  params: Promise<{ lorebookId: string }>;
};

/**
 * Compatibility route for bookmarks/links created by Atlas V1.
 *
 * Atlas V2 owns lorebook editing under /atlas/lorebooks/[lorebookId].
 * Keep this tiny redirect during the cutover so old URLs do not break while
 * the duplicated V1 editor can be removed from the bundle.
 */
export default async function LegacyLorebookPage({
  params,
}: LegacyLorebookPageProps) {
  const { lorebookId } = await params;
  redirect(`/atlas/lorebooks/${encodeURIComponent(lorebookId)}`);
}
