import { CollectionView } from "@/features/atlas/views/collections/collection-view";

export default async function Page({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  return <CollectionView collectionId={collectionId} />;
}
