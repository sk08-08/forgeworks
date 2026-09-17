import { BioStudioWorkspace } from "@/features/bio-studio/components/bio-studio-workspace";

export default async function BioStudioProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <BioStudioWorkspace projectId={projectId} />;
}
