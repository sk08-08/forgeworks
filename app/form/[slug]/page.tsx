// ============================================================================
// Forgeworks - Public Form Page (server)
// Fetches form by shareable link and renders client form component
// ============================================================================

import { createClient as createServerClient } from "@/lib/supabase/server";
import PublicForm from "@/features/forms/components/public-form";
import type { FormSection } from "@/features/forms/types/form-types";
import { FormDeactivationPage } from "@/features/forms/components/form-deactivation-page";

export default async function PublicFormPage({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  const { slug } = (await Promise.resolve(params)) as { slug: string };
  try {
    const supabase = await createServerClient();
    const slugValue = String(slug || "").trim();

    if (!slugValue) {
      return (
        <div className="min-h-screen bg-background flex items-start justify-center pt-12">
          <div className="container max-w-2xl py-8">
            <p className="text-center">Form not found.</p>
          </div>
        </div>
      );
    }

    const { data: formData, error: rpcError } = await supabase.rpc(
      "get_public_request_form",
      {
        p_shareable_link: slugValue,
      },
    );

    if (rpcError) {
      console.error("Public form RPC lookup failed:", rpcError);
    }

    const row = Array.isArray(formData)
      ? (formData[0] ?? null)
      : (formData ?? null);

    if (!row) {
      return (
        <div className="min-h-screen bg-background flex items-start justify-center pt-12">
          <div className="container max-w-2xl py-8">
            <p className="text-center">Form not found.</p>
          </div>
        </div>
      );
    }

    // Check if form is deactivated
    if (!row.is_active) {
      const deactivatedMsg = row.deactivated_message || "";
      const redirectUrl = row.deactivated_redirect_url || "";
      const redirectLabel = row.deactivated_redirect_label || "";
      const accentColor = row.deactivated_accent_color || "#7c3aed";

      return (
        <FormDeactivationPage
          title={row.title || "Form"}
          message={deactivatedMsg}
          redirectUrl={redirectUrl}
          redirectLabel={redirectLabel}
          accentColor={accentColor}
        />
      );
    }

    const form = {
      id: row.id,
      title: row.title,
      description: row.description,
      bannerAssetPath: row.banner_asset_path || "",
      bannerUrl: row.banner_url || "",
      isActive: !!row.is_active,
      deactivatedMessage: row.deactivated_message || "",
      deactivatedRedirectUrl: row.deactivated_redirect_url || "",
      deactivatedRedirectLabel: row.deactivated_redirect_label || "",
      deactivatedAccentColor: row.deactivated_accent_color || "#7c3aed",
      sections: (row.sections || []) as FormSection[],
      appearance: row.appearance || undefined,
      userId: row.user_id,
    };

    return (
      <PublicForm
        form={form}
        feedbackContext={{
          sourcePage: form.title,
          sourceLabel: "Public form",
          sourcePath: `/form/${slugValue}`,
          relatedId: form.id,
          metadata: {
            shareableLink: slugValue,
          },
        }}
      />
    );
  } catch (e) {
    return (
      <div className="min-h-screen bg-background flex items-start justify-center pt-12">
        <div className="container max-w-2xl py-8">
          <p className="text-center">Failed to load form.</p>
        </div>
      </div>
    );
  }
}
