import { FormBuilderWorkspace } from "@/features/forms/components/builder/form-builder-workspace";

interface NewFormPageProps {
  searchParams: Promise<{
    template?: string;
  }>;
}

export default async function NewFormPage({ searchParams }: NewFormPageProps) {
  const { template } = await searchParams;

  return <FormBuilderWorkspace templateId={template || null} mode="create" />;
}
