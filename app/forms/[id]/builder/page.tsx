import { FormBuilderWorkspace } from "@/features/forms/components/builder/form-builder-workspace";

interface FormBuilderPageProps {
  params: Promise<{ id: string }>;
}

export default async function FormBuilderPage({
  params,
}: FormBuilderPageProps) {
  const { id } = await params;

  return <FormBuilderWorkspace formId={id} />;
}
