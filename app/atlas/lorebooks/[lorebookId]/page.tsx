import { LorebookView } from "@/features/atlas/views/lorebooks/lorebook-view";

export default async function Page({
  params,
}: {
  params: Promise<{ lorebookId: string }>;
}) {
  const { lorebookId } = await params;
  return <LorebookView lorebookId={lorebookId} />;
}
