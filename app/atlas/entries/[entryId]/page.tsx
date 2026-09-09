import { EntryView } from "@/features/atlas/views/entries/entry-view";

export default async function Page({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;
  return <EntryView entryId={entryId} />;
}
