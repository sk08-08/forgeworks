// ============================================================================
// Forgeworks - Form Manager View
// Interface for managing forms
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
  Clock,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MarkdownInlineRenderer } from "@/features/markdown/components/markdown-renderer";
import { Input } from "@/components/ui/input";
import { MarkdownField } from "@/features/markdown/components/markdown-field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormDeactivationPage } from "./form-deactivation-page";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore as useAppStore } from "@/features/app-shell/store/app-store";
import {
  updateFormAction,
  deleteFormAction,
} from "@/features/forms/actions/forms";
import { CustomColorPicker } from "@/components/ui/custom-color-picker";
import { cn, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import type {
  RequestForm,
  FormTemplate,
  FormSection,
} from "@/features/forms/types/form-types";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserAccess } from "@/lib/access";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";
import { normalizeHttpUrl } from "@/lib/safe-url";

// ----------------------------------------------------------------------------

interface FormCardProps {
  form: RequestForm;
  requestCount: number;
  ownerLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onEditDeactivation: () => void;
  onCopyLink: () => void;
}

function FormCard({
  form,
  requestCount,
  ownerLabel,
  onEdit,
  onDelete,
  onToggleActive,
  onEditDeactivation,
  onCopyLink,
}: FormCardProps) {
  const fieldCount = form.sections.reduce((sum, s) => sum + s.fields.length, 0);

  return (
    <Card
      className={cn(
        "group h-full min-w-0 overflow-hidden transition-all duration-200 hover:-translate-y-px hover:border-primary/30 hover:shadow-md",
        !form.isActive && "border-dashed bg-muted/15",
      )}
    >
      <CardHeader className="min-w-0 pb-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4 text-primary" />
                Edit Form
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopyLink}>
                <Copy className="mr-2 h-4 w-4 text-primary" />
                Copy Link
              </DropdownMenuItem>
              {!form.isActive && (
                <DropdownMenuItem onClick={onEditDeactivation}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Deactivation Page
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onToggleActive}>
                {form.isActive ? (
                  <>
                    <ToggleLeft className="mr-2 h-4 w-4 text-warning" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleRight className="mr-2 h-4 w-4 text-success" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive hover:text-white"
              >
                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardTitle className="mt-3 min-w-0 text-lg">
          <MarkdownInlineRenderer
            content={form.title || "Untitled Form"}
            className="line-clamp-2 break-words text-lg font-semibold"
          />
        </CardTitle>
        <CardDescription className="mt-1 min-h-18 line-clamp-4 text-sm leading-relaxed">
          {stripMarkdownToText(form.description) || "No description"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col">
        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={form.isActive ? "default" : "outline"}>
            {form.isActive ? "Active" : "Inactive"}
          </Badge>
          {ownerLabel && <Badge variant="outline">{ownerLabel}</Badge>}
          <Badge variant="outline">
            {form.sections.length} section
            {form.sections.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline">
            {fieldCount} field{fieldCount !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline">
            {requestCount} response{requestCount !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Footer */}
        <div className="mt-5 border-t border-border/55 pt-4">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Updated {formatDateTime(form.updatedAt)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full cursor-pointer rounded-xl"
              onClick={onEdit}
            >
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </Button>

            {form.isActive ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-full cursor-pointer rounded-xl"
                onClick={() =>
                  window.open(`/form/${form.shareableLink}`, "_blank")
                }
              >
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Open form
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="w-full cursor-pointer rounded-xl"
                onClick={onEditDeactivation}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Closed page
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Empty State
// ----------------------------------------------------------------------------

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-muted/60 sm:h-20 sm:w-20">
        <FileText className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mt-6 text-xl font-semibold">No forms yet</h3>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Create your first form to start collecting submissions from your
        community.
      </p>
      <Button
        className="mt-6 w-full cursor-pointer rounded-xl sm:w-auto"
        onClick={onCreateNew}
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Your First Form
      </Button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Form Manager Component
// ----------------------------------------------------------------------------

function mapDbFormToRequestForm(r: any): RequestForm {
  return {
    id: r.id,
    ownerId: r.user_id || undefined,
    title: r.title || "",
    description: r.description || "",
    bannerAssetPath: r.banner_asset_path || "",
    bannerUrl: r.banner_url || "",
    sections: r.sections || [],
    shareableLink: r.shareable_link || "",
    isActive: !!r.is_active,

    deactivatedMessage: r.deactivated_message || "",
    deactivatedRedirectUrl: r.deactivated_redirect_url || "",
    deactivatedRedirectLabel: r.deactivated_redirect_label || "",
    deactivatedAccentColor: r.deactivated_accent_color || "#7c3aed",

    appearance: r.appearance || undefined,

    createdAt: r.created_at ? new Date(r.created_at) : new Date(),

    updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
  };
}

export function FormManager() {
  const { forms, deleteForm, getRequestsByFormId, upsertForm } = useAppStore();

  const router = useRouter();

  // UI State
  const [deleteConfirmForm, setDeleteConfirmForm] =
    useState<RequestForm | null>(null);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accessLoaded, setAccessLoaded] = useState(false);

  // Deactivation dialog state
  const [deactivateForm, setDeactivateForm] = useState<RequestForm | null>(
    null,
  );
  const [deactivateMessage, setDeactivateMessage] = useState("");
  const [deactivateRedirectUrl, setDeactivateRedirectUrl] = useState("");
  const [deactivateRedirectLabel, setDeactivateRedirectLabel] = useState("");
  const [deactivateAccentColor, setDeactivateAccentColor] = useState("#7c3aed");
  const [savingDeactivation, setSavingDeactivation] = useState(false);

  const resetDeactivationState = () => {
    setDeactivateForm(null);
    setDeactivateMessage("");
    setDeactivateRedirectUrl("");
    setDeactivateRedirectLabel("");
    setDeactivateAccentColor("#7c3aed");
  };

  const isValidDeactivationAccent = /^#[0-9a-fA-F]{6}$/.test(
    deactivateAccentColor.trim(),
  );

  const normalizedDeactivationRedirect = deactivateRedirectUrl.trim()
    ? (normalizeHttpUrl(deactivateRedirectUrl) ?? "")
    : "";

  // Fetch templates when template picker opens
  useEffect(() => {
    if (!showTemplatePicker) return;
    const supabase = createClient();
    supabase
      .from("form_templates")
      .select("*")
      .order("is_builtin", { ascending: false })
      .order("usage_count", { ascending: false })
      .then(({ data }) => {
        if (data) setTemplates(data as FormTemplate[]);
      });
  }, [showTemplatePicker]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const supabase = createClient();
        const { user } = await getCurrentUserAccess(supabase);
        if (!mounted) return;
        setCurrentUserId(user?.id ?? null);
      } catch {
        if (!mounted) return;
        setCurrentUserId(null);
      } finally {
        if (mounted) setAccessLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleNewFormClick = () => {
    setShowTemplatePicker(true);
  };

  const handleSelectTemplate = (template: FormTemplate | null) => {
    setShowTemplatePicker(false);

    if (template) {
      router.push(`/forms/new?template=${encodeURIComponent(template.id)}`);
      return;
    }

    router.push("/forms/new");
  };

  const ownedForms = currentUserId
    ? forms.filter((form) => !form.ownerId || form.ownerId === currentUserId)
    : forms;

  // Handlers
  const handleDeleteForm = () => {
    if (deleteConfirmForm) {
      (async () => {
        const res = await deleteFormAction(deleteConfirmForm.id);
        if (!res.success) {
          console.error("deleteFormAction error:", res.error);
          toast.error(res.error || "Failed to delete form");
          return;
        }
        deleteForm(deleteConfirmForm.id);
        setDeleteConfirmForm(null);
        toast.success("Form deleted successfully");
      })();
    }
  };

  const handleToggleActive = (form: RequestForm) => {
    if (form.isActive) {
      // Deactivating — show dialog to set custom message
      setDeactivateForm(form);
      setDeactivateMessage(form.deactivatedMessage || "");
      setDeactivateRedirectUrl(form.deactivatedRedirectUrl || "");
      setDeactivateRedirectLabel(form.deactivatedRedirectLabel || "");
      setDeactivateAccentColor(form.deactivatedAccentColor || "#7c3aed");
    } else {
      // Activating — do it directly
      doToggleActive(form, true, "");
    }
  };

  const doToggleActive = async (
    form: RequestForm,
    isActive: boolean,
    deactivatedMessage?: string,
  ) => {
    if (savingDeactivation) {
      return;
    }

    let payload: Partial<RequestForm> = {
      isActive,
    };

    if (!isActive) {
      if (!isValidDeactivationAccent) {
        toast.error("Enter a valid 6-digit hex color.");
        return;
      }

      if (deactivateRedirectUrl.trim() && !normalizedDeactivationRedirect) {
        toast.error("Enter a valid HTTP or HTTPS URL.");
        return;
      }

      payload = {
        ...payload,

        deactivatedMessage: deactivatedMessage || "",

        deactivatedRedirectUrl: normalizedDeactivationRedirect || "",

        deactivatedRedirectLabel: deactivateRedirectLabel.trim(),

        deactivatedAccentColor: deactivateAccentColor,
      };
    }

    setSavingDeactivation(true);

    try {
      const res = await updateFormAction(form.id, payload);

      if (!res.success) {
        console.error("updateFormAction (toggle) error:", res.error);

        toast.error(res.error || "Failed to update form");

        return;
      }

      upsertForm(mapDbFormToRequestForm(res.form));

      if (!isActive) {
        resetDeactivationState();
      }

      toast.success(isActive ? "Form activated" : "Form deactivated");
    } finally {
      setSavingDeactivation(false);
    }
  };

  const handleCopyLink = async (form: RequestForm) => {
    const fullUrl = `${window.location.origin}/form/${form.shareableLink}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleEditDeactivation = (form: RequestForm) => {
    setDeactivateForm(form);
    setDeactivateMessage(form.deactivatedMessage || "");
    setDeactivateRedirectUrl(form.deactivatedRedirectUrl || "");
    setDeactivateRedirectLabel(form.deactivatedRedirectLabel || "");
    setDeactivateAccentColor(form.deactivatedAccentColor || "#7c3aed");
  };

  const handleSaveDeactivation = async () => {
    if (!deactivateForm || savingDeactivation) {
      return;
    }

    if (!isValidDeactivationAccent) {
      toast.error("Enter a valid 6-digit hex color.");
      return;
    }

    if (deactivateRedirectUrl.trim() && !normalizedDeactivationRedirect) {
      toast.error("Enter a valid HTTP or HTTPS URL.");
      return;
    }

    setSavingDeactivation(true);

    try {
      const res = await updateFormAction(deactivateForm.id, {
        deactivatedMessage: deactivateMessage || "",

        deactivatedRedirectUrl: normalizedDeactivationRedirect || "",

        deactivatedRedirectLabel: deactivateRedirectLabel.trim(),

        deactivatedAccentColor: deactivateAccentColor,
      } as Partial<RequestForm>);

      if (!res.success) {
        toast.error(res.error || "Failed to update deactivation settings");
        return;
      }

      upsertForm(mapDbFormToRequestForm(res.form));

      resetDeactivationState();

      toast.success("Deactivation page updated");
    } finally {
      setSavingDeactivation(false);
    }
  };

  return (
    <div className="min-w-0 overflow-x-clip p-3 sm:p-6 md:p-8 lg:p-10">
      <div className="mx-auto w-full max-w-[92rem]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Forms
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Design custom forms to collect submissions from your community
            </p>
          </div>

          <Button
            onClick={handleNewFormClick}
            className="w-full cursor-pointer sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Form
          </Button>
        </div>

        {/* Form List */}
        {!accessLoaded ? (
          <div className="flex min-h-[60vh] items-center justify-center p-6">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm">Loading Forms…</p>
            </div>
          </div>
        ) : ownedForms.length > 0 ? (
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex min-w-0 items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">My forms</h2>
                  <p className="text-sm text-muted-foreground">
                    Forms owned by your account.
                  </p>
                </div>
                <Badge variant="outline">{ownedForms.length}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {ownedForms.map((form) => (
                  <FormCard
                    key={form.id}
                    form={form}
                    requestCount={getRequestsByFormId(form.id).length}
                    ownerLabel="Mine"
                    onEdit={() => router.push(`/forms/${form.id}/builder`)}
                    onDelete={() => setDeleteConfirmForm(form)}
                    onToggleActive={() => handleToggleActive(form)}
                    onEditDeactivation={() => handleEditDeactivation(form)}
                    onCopyLink={() => handleCopyLink(form)}
                  />
                ))}
              </div>
            </section>
          </div>
        ) : (
          <Card>
            <EmptyState onCreateNew={handleNewFormClick} />
          </Card>
        )}

        {/* Template Picker Dialog */}
        <Dialog open={showTemplatePicker} onOpenChange={setShowTemplatePicker}>
          <DialogContent className="flex max-h-[calc(100dvh-1rem)] min-h-0 w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden sm:max-w-2xl">
            <DialogHeader className="shrink-0 text-left">
              <DialogTitle>Choose a Template</DialogTitle>
              <DialogDescription>
                Start with a pre-built template or create a blank form.
              </DialogDescription>
            </DialogHeader>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto py-3 pr-1 sm:grid-cols-2">
              {/* Blank form option */}
              <button
                className="flex min-h-36 cursor-pointer flex-col items-start gap-2 rounded-xl border border-dashed p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                onClick={() => handleSelectTemplate(null)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Blank Form</p>
                  <p className="text-xs text-muted-foreground">
                    Start from scratch with an empty form.
                  </p>
                </div>
              </button>
              {/* Template options */}
              {templates.map((template) => {
                const iconMap: Record<string, typeof FileText> = {
                  Bot: FileText,
                  Bug: FileText,
                  Lightbulb: FileText,
                  Paintbrush: FileText,
                  FileText,
                };
                const Icon = iconMap[template.icon || "FileText"] || FileText;
                const fieldCount = Array.isArray(template.sections)
                  ? (template.sections as FormSection[]).reduce(
                      (sum: number, s: FormSection) => sum + s.fields.length,
                      0,
                    )
                  : 0;
                return (
                  <button
                    key={template.id}
                    className="flex min-h-36 cursor-pointer flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {fieldCount} fields · {template.category}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Deactivation Dialog */}
        <Dialog
          open={!!deactivateForm}
          onOpenChange={(open) => {
            if (!open) {
              resetDeactivationState();
            }
          }}
        >
          <DialogContent
            className="
    flex
    max-h-[calc(100dvh-1rem)]
    w-[calc(100vw-1rem)]
    max-w-5xl
    flex-col
    overflow-hidden
    p-0
    sm:max-w-5xl
  "
          >
            {/* Header */}
            <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 sm:px-6">
              <DialogTitle>
                {deactivateForm?.isActive
                  ? "Deactivate Form"
                  : "Edit Deactivation Page"}
              </DialogTitle>

              <DialogDescription>
                Customize what visitors see while this form is unavailable.
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable content */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
                {/* LEFT: Settings */}
                <div className="min-w-0 space-y-5">
                  {/* Message */}
                  <section className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold">Message</p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Tell visitors why the form is unavailable or when it may
                        return.
                      </p>
                    </div>

                    <MarkdownField
                      value={deactivateMessage}
                      onChange={setDeactivateMessage}
                      placeholder="e.g. Commissions are currently closed. Check back soon!"
                      minEditorHeightRem={9}
                    />
                  </section>

                  {/* Redirect */}
                  <section className="space-y-4 rounded-xl border bg-muted/20 p-4">
                    <div>
                      <p className="text-sm font-semibold">Redirect</p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Optionally send visitors somewhere useful while the form
                        is closed.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deactivation-url" className="text-sm">
                        Redirect Link
                      </Label>

                      <Input
                        id="deactivation-url"
                        value={deactivateRedirectUrl}
                        onChange={(e) =>
                          setDeactivateRedirectUrl(e.target.value)
                        }
                        placeholder="https://example.com"
                        className={cn(
                          "h-9",
                          deactivateRedirectUrl.trim() &&
                            !normalizedDeactivationRedirect &&
                            "border-destructive focus-visible:ring-destructive",
                        )}
                      />

                      {deactivateRedirectUrl.trim() &&
                        !normalizedDeactivationRedirect && (
                          <p className="text-xs text-destructive">
                            Enter a valid HTTP or HTTPS URL.
                          </p>
                        )}
                    </div>

                    {normalizedDeactivationRedirect && (
                      <div className="space-y-2">
                        <Label htmlFor="deactivation-label" className="text-sm">
                          Button Label
                        </Label>

                        <Input
                          id="deactivation-label"
                          value={deactivateRedirectLabel}
                          onChange={(e) =>
                            setDeactivateRedirectLabel(e.target.value)
                          }
                          placeholder="Visit Link"
                          maxLength={100}
                          className="h-9"
                        />
                      </div>
                    )}
                  </section>

                  {/* Appearance */}
                  <section className="space-y-4 rounded-xl border bg-muted/20 p-4">
                    <div>
                      <p className="text-sm font-semibold">Appearance</p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Choose the accent color used on the closed-form page.
                      </p>
                    </div>

                    <CustomColorPicker
                      label="Accent Color"
                      value={deactivateAccentColor}
                      onChange={setDeactivateAccentColor}
                    />

                    {!isValidDeactivationAccent && (
                      <p className="text-xs text-destructive">
                        Enter a valid 6-digit hex color.
                      </p>
                    )}
                  </section>
                </div>

                {/* RIGHT: Preview */}
                <div className="min-w-0 xl:border-l xl:pl-6">
                  <div className="xl:sticky xl:top-0">
                    <div>
                      <p className="text-sm font-semibold">Live Preview</p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        This uses the same layout visitors will see on the
                        public page.
                      </p>
                    </div>

                    <div className="mt-4 max-w-full overflow-hidden rounded-2xl border bg-background shadow-sm">
                      <FormDeactivationPage
                        preview
                        title={deactivateForm?.title || "Form"}
                        message={deactivateMessage}
                        redirectUrl={normalizedDeactivationRedirect}
                        redirectLabel={deactivateRedirectLabel}
                        accentColor={
                          isValidDeactivationAccent
                            ? deactivateAccentColor
                            : "#7c3aed"
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="shrink-0 border-t bg-background/95 px-5 py-4 backdrop-blur sm:px-6">
              <Button
                variant="outline"
                onClick={resetDeactivationState}
                disabled={savingDeactivation}
                className="w-full cursor-pointer sm:w-auto"
              >
                Cancel
              </Button>

              <Button
                variant={deactivateForm?.isActive ? "destructive" : "default"}
                disabled={
                  savingDeactivation ||
                  !isValidDeactivationAccent ||
                  (!!deactivateRedirectUrl.trim() &&
                    !normalizedDeactivationRedirect)
                }
                onClick={() => {
                  if (!deactivateForm) return;

                  if (deactivateForm.isActive) {
                    void doToggleActive(
                      deactivateForm,
                      false,
                      deactivateMessage,
                    );
                  } else {
                    void handleSaveDeactivation();
                  }
                }}
                className="w-full cursor-pointer sm:w-auto"
              >
                {savingDeactivation
                  ? "Saving..."
                  : deactivateForm?.isActive
                    ? "Deactivate Form"
                    : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteConfirmForm}
          onOpenChange={(open) => !open && setDeleteConfirmForm(null)}
        >
          <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Form
              </DialogTitle>
              <DialogDescription>
                You are about to delete{" "}
                <span className="font-semibold text-foreground">
                  &quot;{stripMarkdownToText(deleteConfirmForm?.title)}&quot;
                </span>
                . This is a soft delete — the form and its submissions will be
                hidden but preserved in the database.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm sm:p-4">
              <p className="font-medium text-destructive">What happens:</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>
                  The form will be deactivated and hidden from your dashboard
                </li>
                <li>
                  The public form link will no longer accept new submissions
                </li>
                <li>
                  Existing submissions are preserved but will be hidden from
                  your submissions view
                </li>
                <li>
                  If this form is linked on your creator page, it will no longer
                  be visible to visitors
                </li>
              </ul>
            </div>
            <DialogFooter className="shrink-0 border-t bg-background/95 px-5 py-4 backdrop-blur sm:px-6">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmForm(null)}
                className="w-full sm:w-auto cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteForm}
                className="w-full sm:w-auto cursor-pointer"
              >
                Delete Form
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
