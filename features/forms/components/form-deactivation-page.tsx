import { ExternalLink, LockKeyhole } from "lucide-react";

import {
  MarkdownInlineRenderer,
  MarkdownRenderer,
} from "@/features/markdown/components/markdown-renderer";

import { cn } from "@/lib/utils";

interface FormDeactivationPageProps {
  title?: string;
  message?: string;
  redirectUrl?: string;
  redirectLabel?: string;
  accentColor?: string;

  /**
   * Preview mode keeps the component inside the editor
   * instead of taking over the whole viewport.
   */
  preview?: boolean;
}

export function FormDeactivationPage({
  title = "Form",
  message = "",
  redirectUrl = "",
  redirectLabel = "",
  accentColor = "#7c3aed",
  preview = false,
}: FormDeactivationPageProps) {
  const safeAccent = /^#[0-9a-fA-F]{6}$/.test(accentColor)
    ? accentColor
    : "#7c3aed";

  const safeRedirectUrl = /^https?:\/\//i.test(redirectUrl) ? redirectUrl : "";

  return (
    <div
      className={cn(
        "min-w-0 overflow-x-clip bg-background",
        preview ? "w-full" : "min-h-dvh",
      )}
    >
      <div
        className={cn(
          "mx-auto w-full",
          preview
            ? "max-w-none p-3 sm:p-5"
            : "max-w-xl px-3 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 sm:px-4 sm:pt-16",
        )}
      >
        {/* Top accent */}
        <div
          className={cn(
            "w-full rounded-full",
            preview ? "mb-5 h-1" : "mb-8 h-1",
          )}
          style={{
            background: `linear-gradient(
              90deg,
              transparent,
              ${safeAccent}88,
              transparent
            )`,
          }}
        />

        <div className={cn("text-center", preview ? "space-y-4" : "space-y-6")}>
          {/* Title */}
          <div
            className={cn(
              "rendered-markdown break-words font-extrabold tracking-tight",
              preview ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl",
            )}
          >
            <MarkdownInlineRenderer content={title || "Form"} />
          </div>

          {/* Status */}
          <div className="flex justify-center">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
              style={{
                background: `${safeAccent}15`,
                color: safeAccent,
                borderColor: `${safeAccent}30`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: safeAccent,
                }}
              />
              Currently Unavailable
            </span>
          </div>

          {/* Message card */}
          <div
            className={cn(
              "rounded-2xl border",
              preview ? "space-y-3 p-4 sm:p-5" : "space-y-4 p-5 sm:p-8",
            )}
            style={{
              borderColor: `${safeAccent}25`,
            }}
          >
            <div className="flex justify-center">
              <div
                className={cn(
                  "flex items-center justify-center rounded-xl shadow-lg",
                  preview ? "h-12 w-12" : "h-14 w-14",
                )}
                style={{
                  background: `linear-gradient(
                    135deg,
                    ${safeAccent},
                    ${safeAccent}cc
                  )`,
                }}
              >
                <LockKeyhole
                  className={cn("text-white", preview ? "h-6 w-6" : "h-7 w-7")}
                />
              </div>
            </div>

            {message ? (
              <div className="rendered-markdown min-w-0 break-words text-sm leading-relaxed text-muted-foreground sm:text-base [&_a]:break-all [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto">
                <MarkdownRenderer content={message} />
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                The creator has temporarily closed this form. Please check back
                later.
              </p>
            )}
          </div>

          {/* Redirect */}
          {safeRedirectUrl &&
            (preview ? (
              <div
                className="inline-flex max-w-full items-center justify-center gap-2 break-words rounded-xl px-5 py-2.5 text-center text-sm font-semibold text-white shadow-md"
                style={{
                  background: `linear-gradient(
                    135deg,
                    ${safeAccent},
                    ${safeAccent}dd
                  )`,
                }}
              >
                {redirectLabel || "Visit Link"}

                <ExternalLink className="h-4 w-4" />
              </div>
            ) : (
              <a
                href={safeRedirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full max-w-full items-center justify-center gap-2 break-words rounded-xl px-5 py-3 text-center text-sm font-semibold text-white no-underline shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl sm:w-auto sm:px-6"
                style={{
                  background: `linear-gradient(
                    135deg,
                    ${safeAccent},
                    ${safeAccent}dd
                  )`,
                }}
              >
                {redirectLabel || "Visit Link"}

                <ExternalLink className="h-4 w-4" />
              </a>
            ))}
        </div>

        {/* Bottom accent */}
        <div
          className={cn("h-px w-full", preview ? "mt-5" : "mt-8")}
          style={{
            background: `${safeAccent}20`,
          }}
        />
      </div>
    </div>
  );
}
