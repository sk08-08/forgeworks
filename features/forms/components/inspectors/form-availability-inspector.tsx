"use client";

import {
  Check,
  CircleCheck,
  CirclePause,
  Copy,
  ExternalLink,
  Link2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { CustomColorPicker } from "@/components/ui/custom-color-picker";

import { MarkdownField } from "@/features/markdown/components/markdown-field";

import { normalizeHttpUrl } from "@/lib/safe-url";
import { cn } from "@/lib/utils";

import { FormUrlField } from "../shared/form-url-field";

import type { FormBuilderDraft } from "../builder/form-builder-types";

interface FormAvailabilityInspectorProps {
  draft: FormBuilderDraft;

  onDraftChange: (draft: FormBuilderDraft) => void;
}

export function FormAvailabilityInspector({
  draft,
  onDraftChange,
}: FormAvailabilityInspectorProps) {
  const [origin, setOrigin] = useState("");

  type CopyState = "idle" | "copied" | "settling";

  const [copyState, setCopyState] = useState<CopyState>("idle");

  const copied = copyState === "copied";

  const settling = copyState === "settling";

  const copyActive = copyState !== "idle";

  const [copyBurstKey, setCopyBurstKey] = useState(0);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateDraft = <K extends keyof FormBuilderDraft>(
    key: K,
    value: FormBuilderDraft[K],
  ) => {
    onDraftChange({
      ...draft,
      [key]: value,
    });
  };

  useEffect(() => {
    setOrigin(window.location.origin);

    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }

      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }
    };
  }, []);

  const normalizedRedirect = draft.deactivatedRedirectUrl?.trim()
    ? normalizeHttpUrl(draft.deactivatedRedirectUrl)
    : null;

  const shareableLink = draft.shareableLink?.trim() || "";

  const publicPath = shareableLink ? `/form/${shareableLink}` : "";

  const publicUrl =
    publicPath && origin ? `${origin}${publicPath}` : publicPath;

  const handleCopyPublicLink = async () => {
    if (!publicUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicUrl);

      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }

      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }

      // Remount the burst layer so repeated clicks always replay cleanly.
      setCopyBurstKey((current) => current + 1);
      setCopyState("copied");

      copyTimerRef.current = setTimeout(() => {
        setCopyState("settling");

        settleTimerRef.current = setTimeout(() => {
          setCopyState("idle");
        }, 560);
      }, 1320);
    } catch {
      toast.error("Failed to copy public link");
    }
  };

  const handleOpenPublicLink = () => {
    if (!publicUrl) {
      return;
    }

    window.open(publicUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* Availability */}
      <section className="space-y-3">
        <div
          className={cn(
            "flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors",
            draft.isActive
              ? "border-primary/20 bg-primary/[0.025]"
              : "border-border/70 bg-muted/[0.12]",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {draft.isActive ? (
                <CircleCheck className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <CirclePause className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}

              <p className="text-xs font-semibold">
                {draft.isActive ? "Form active" : "Form inactive"}
              </p>
            </div>

            <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
              {draft.isActive
                ? "Visitors can open this form and submit responses."
                : "Visitors will see the deactivation page instead of the form."}
            </p>
          </div>

          <Switch
            checked={draft.isActive}
            onCheckedChange={(checked) => updateDraft("isActive", checked)}
            aria-label="Toggle form availability"
          />
        </div>
      </section>

      {/* Public link */}
      <section className="space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 text-primary" />

            <p className="text-xs font-semibold">Public link</p>
          </div>

          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Share this link so people can open your form.
          </p>
        </div>

        {shareableLink ? (
          <div
            className={cn(
              "form-share-shell relative",
              copyActive && "form-share-shell-copied",
              settling && "form-share-shell-settling",
            )}
          >
            {/* Outside-the-card celebration */}
            {copied && (
              <div
                key={copyBurstKey}
                aria-hidden
                className="form-share-celebration"
              >
                <span className="form-share-ring form-share-ring-a" />
                <span className="form-share-ring form-share-ring-b" />

                <span className="form-share-ray form-share-ray-1" />
                <span className="form-share-ray form-share-ray-2" />
                <span className="form-share-ray form-share-ray-3" />
                <span className="form-share-ray form-share-ray-4" />

                <span className="form-share-star form-share-star-1" />
                <span className="form-share-star form-share-star-2" />
                <span className="form-share-star form-share-star-3" />
                <span className="form-share-star form-share-star-4" />
                <span className="form-share-star form-share-star-5" />
                <span className="form-share-star form-share-star-6" />

                <span className="form-share-dot form-share-dot-1" />
                <span className="form-share-dot form-share-dot-2" />
                <span className="form-share-dot form-share-dot-3" />
                <span className="form-share-dot form-share-dot-4" />
                <span className="form-share-dot form-share-dot-5" />
                <span className="form-share-dot form-share-dot-6" />
              </div>
            )}

            {/* Clipped visual surface */}
            <div
              className={cn(
                "form-share-surface relative overflow-hidden rounded-2xl border",
                copyActive && "form-share-surface-copied",
                settling && "form-share-surface-settling",
              )}
            >
              {/* Background atmosphere */}
              <div
                aria-hidden
                className="form-share-aurora form-share-aurora-purple"
              />

              <div
                aria-hidden
                className="form-share-aurora form-share-aurora-pink"
              />

              <div
                aria-hidden
                className="form-share-aurora form-share-aurora-blue"
              />

              <div aria-hidden className="form-share-grid" />

              {copied && (
                <>
                  <span aria-hidden className="form-share-card-flash" />

                  <span aria-hidden className="form-share-sweep" />
                </>
              )}

              <div className="relative z-10 p-4">
                {/* Header */}
                <div className="form-share-header flex items-start gap-3">
                  <div
                    className={cn(
                      "form-share-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                      copyActive && "form-share-icon-copied",
                      settling && "form-share-icon-settling",
                    )}
                  >
                    <Link2
                      className={cn(
                        "form-share-header-icon form-share-header-icon-link h-4 w-4",
                        copyActive && "form-share-header-icon-link-hidden",
                      )}
                    />

                    <Check
                      className={cn(
                        "form-share-header-icon form-share-header-icon-check h-4 w-4",
                        copyActive && "form-share-header-icon-check-visible",
                        settling && "form-share-header-icon-check-settling",
                      )}
                    />
                  </div>

                  <div className="relative min-w-0 flex-1 pr-14">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Public URL
                    </p>

                    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                      Anyone with this link can visit your form.
                    </p>

                    <span
                      aria-hidden={!copyActive}
                      className={cn(
                        "form-share-copied-badge pointer-events-none absolute right-0 top-0",
                        copyActive && "form-share-copied-badge-visible",
                        settling && "form-share-copied-badge-settling",
                      )}
                    >
                      Copied
                    </span>
                  </div>
                </div>

                {/* URL pill */}
                <div
                  className={cn(
                    "form-share-url mt-4 flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5",
                    copyActive && "form-share-url-copied",
                    settling && "form-share-url-settling",
                  )}
                >
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p
                      className="truncate font-mono text-[10px] text-foreground/90"
                      title={publicUrl}
                    >
                      {publicUrl}
                    </p>
                  </div>

                  <div
                    aria-hidden
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full transition-[background-color,box-shadow,opacity] duration-300",
                      draft.isActive
                        ? "form-share-live-dot bg-primary shadow-[0_0_8px_color-mix(in_oklch,var(--primary)_65%,transparent)]"
                        : "bg-muted-foreground/45 shadow-none",
                    )}
                  />

                  {copied && (
                    <span aria-hidden className="form-share-url-shine" />
                  )}
                </div>

                {/* Actions */}
                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyPublicLink}
                    className={cn(
                      "form-share-copy-button relative h-9 min-w-0 cursor-pointer overflow-hidden",
                      copyActive && "form-share-copy-button-copied",
                      settling && "form-share-copy-button-settling",
                    )}
                  >
                    {copied && (
                      <span aria-hidden className="form-share-button-sheen" />
                    )}

                    <span className="relative z-10 grid w-full place-items-center">
                      <span
                        className={cn(
                          "form-share-copy-state col-start-1 row-start-1 flex items-center justify-center",
                          !copyActive && "form-share-copy-state-visible",
                          settling && "form-share-copy-state-returning",
                        )}
                      >
                        <span className="mr-1.5 flex h-5 w-5 items-center justify-center rounded-full">
                          <Copy className="h-3.5 w-3.5" />
                        </span>

                        <span className="truncate">Copy link</span>
                      </span>

                      <span
                        className={cn(
                          "form-share-copy-state form-share-copy-state-success col-start-1 row-start-1 flex items-center justify-center",
                          copyActive && "form-share-copy-state-visible",
                          settling && "form-share-copy-state-success-settling",
                        )}
                      >
                        <span className="form-share-copy-success-icon mr-1.5 flex h-5 w-5 items-center justify-center rounded-full">
                          <Check className="h-3 w-3" />
                        </span>

                        <span className="truncate">Copied to clipboard</span>
                      </span>
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="form-share-open-button h-9 w-9 cursor-pointer"
                    onClick={handleOpenPublicLink}
                    title="Open public form"
                    aria-label="Open public form"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {!draft.isActive && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/50 bg-background/35 px-2.5 py-2">
                    <CirclePause className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />

                    <p className="text-[9px] leading-relaxed text-muted-foreground">
                      This link is still live. Visitors currently see your
                      deactivation page instead of the form.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="form-share-empty relative overflow-hidden rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center">
            <div
              aria-hidden
              className="absolute inset-x-8 top-0 h-20 bg-[radial-gradient(circle_at_center,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_70%)]"
            />

            <div className="relative">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.055] text-primary shadow-sm">
                <Link2 className="h-4 w-4" />
              </div>

              <p className="mt-3 text-[11px] font-semibold">
                Your public link will appear here
              </p>

              <p className="mx-auto mt-1 max-w-[15rem] text-[10px] leading-relaxed text-muted-foreground">
                Save this form for the first time and Forgeworks will generate a
                shareable URL automatically.
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="border-t border-border/70" />

      {/* Deactivation page */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold">Deactivation page</p>

          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Customize what visitors see while this form is unavailable.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Message</Label>

          <MarkdownField
            value={draft.deactivatedMessage || ""}
            onChange={(value) => updateDraft("deactivatedMessage", value)}
            placeholder="e.g. Commissions are currently closed. Check back soon!"
            minEditorHeightRem={7}
          />

          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Leave this empty to use the default unavailable message.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-border/70 bg-muted/[0.12] p-4">
          <div>
            <p className="text-[11px] font-semibold">Redirect</p>

            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Optionally give visitors somewhere else to go while the form is
              closed.
            </p>
          </div>

          <FormUrlField
            id="deactivation-redirect-url"
            label="Redirect URL"
            value={draft.deactivatedRedirectUrl || ""}
            onChange={(value) => updateDraft("deactivatedRedirectUrl", value)}
            placeholder="example.com"
            optional
          />

          {normalizedRedirect && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="deactivation-redirect-label"
                  className="text-xs"
                >
                  Button label
                </Label>

                <span className="text-[9px] text-muted-foreground">
                  Optional
                </span>
              </div>

              <Input
                id="deactivation-redirect-label"
                value={draft.deactivatedRedirectLabel || ""}
                placeholder="Visit Link"
                maxLength={100}
                className="h-9 text-xs"
                onChange={(event) =>
                  updateDraft("deactivatedRedirectLabel", event.target.value)
                }
              />

              <p className="text-[10px] text-muted-foreground">
                Defaults to “Visit Link” when left empty.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/[0.12] p-4">
          <div>
            <p className="text-[11px] font-semibold">Appearance</p>

            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Choose the accent used on the unavailable-form page.
            </p>
          </div>

          <CustomColorPicker
            label="Accent Color"
            value={draft.deactivatedAccentColor || "#7c3aed"}
            onChange={(value) => updateDraft("deactivatedAccentColor", value)}
          />
        </div>
      </section>
    </div>
  );
}
