import { WorldView } from "@/features/atlas/views/worlds/world-view";

export default async function Page({ params }: { params: Promise<{ worldId: string }> }) {
  const { worldId } = await params;
  return <WorldView worldId={worldId} />;
}
