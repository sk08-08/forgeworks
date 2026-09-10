// ============================================================================
// Forgeworks - Creator Page View
// Public and builder-preview rendering for Creator Pages.
// ============================================================================

"use client";

import { Bot } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BotDetailModal } from "@/features/bots/components/bot-detail-modal";
import { SectionRenderer } from "./shared/section-renderer";
import { CreatorPageCanvas } from "./shared/creator-page-canvas";
import { getCreatorSectionAnchor } from "@/features/creator-pages/lib/creator-page-links";
import { createClient } from "@/lib/supabase/client";
import motionStyles from "./shared/creator-page-motion.module.css";
import type {
  BotPreview,
  CreatorPageFormState,
  CreatorPageLorebookPreview,
  CreatorPageSection,
  CreatorPageViewProps,
  WorldPreview,
} from "@/features/creator-pages/types/creator-page-types";

function sectionBots(
  section: CreatorPageSection,
  allBots: BotPreview[],
): BotPreview[] {
  const botIds = (section.config?.selectedBotIds as string[]) || [];

  if (
    botIds.length === 0 &&
    (section.kind === "bot_showcase" || section.kind === "bot_group")
  ) {
    return allBots;
  }

  return allBots.filter((bot) => botIds.includes(bot.id));
}

function sectionWorlds(
  section: CreatorPageSection,
  allWorlds: WorldPreview[],
): WorldPreview[] {
  const worldIds = (section.config?.selectedWorldIds as string[]) || [];

  if (worldIds.length === 0 && section.kind === "world_showcase") {
    return allWorlds;
  }

  return allWorlds.filter((world) => worldIds.includes(world.id));
}

type CreatorRevealPreset = "none" | "fade" | "fade-up" | "scale" | "blur";

function sectionRevealSettings(section: CreatorPageSection): {
  preset: CreatorRevealPreset;
  duration: number;
  delay: number;
} {
  const cfg = section.config || {};

  let preset: CreatorRevealPreset = "none";
  let duration = 600;
  let delay = 0;

  switch (section.kind) {
    case "hero":
      preset = String(cfg.entranceAnimation || "none") as CreatorRevealPreset;
      duration = Number(cfg.motionDuration ?? 600);
      delay = Number(cfg.motionDelay ?? 0);
      break;

    case "text_block":
      preset = String(
        cfg.textEntranceAnimation || "none",
      ) as CreatorRevealPreset;
      duration = Number(cfg.textMotionDuration ?? 500);
      delay = Number(cfg.textMotionDelay ?? 0);
      break;

    case "banner":
      preset = String(
        cfg.bannerEntranceAnimation || "none",
      ) as CreatorRevealPreset;
      duration = Number(cfg.bannerMotionDuration ?? 500);
      delay = Number(cfg.bannerMotionDelay ?? 0);
      break;

    case "world_showcase":
      preset = String(
        cfg.worldEntranceAnimation || "none",
      ) as CreatorRevealPreset;
      duration = Number(cfg.worldMotionDuration ?? 500);
      delay = Number(cfg.worldMotionDelay ?? 0);
      break;

    case "divider":
      preset = String(
        cfg.dividerEntranceAnimation || "none",
      ) as CreatorRevealPreset;
      duration = Number(cfg.dividerMotionDuration ?? 500);
      delay = Number(cfg.dividerMotionDelay ?? 0);
      break;

    case "lorebook_gallery":
      preset = String(
        cfg.lorebookEntranceAnimation || "none",
      ) as CreatorRevealPreset;
      duration = Number(cfg.lorebookMotionDuration ?? 500);
      delay = Number(cfg.lorebookMotionDelay ?? 0);
      break;

    case "embed":
      preset = String(
        cfg.embedEntranceAnimation || "none",
      ) as CreatorRevealPreset;
      duration = Number(cfg.embedMotionDuration ?? 550);
      delay = Number(cfg.embedMotionDelay ?? 0);
      break;

    case "form":
      preset = String(
        cfg.formEntranceAnimation || "none",
      ) as CreatorRevealPreset;
      duration = Number(cfg.formMotionDuration ?? 500);
      delay = Number(cfg.formMotionDelay ?? 0);
      break;

    case "social_links":
      preset = String(
        cfg.socialEntranceAnimation || "none",
      ) as CreatorRevealPreset;
      duration = Number(cfg.socialMotionDuration ?? 450);
      delay = Number(cfg.socialMotionDelay ?? 0);
      break;

    case "sticker": {
      const saved = String(cfg.stickerEntranceAnimation || "none");
      preset =
        saved === "pop"
          ? "scale"
          : saved === "slide-up"
            ? "fade-up"
            : (saved as CreatorRevealPreset);
      duration = Number(cfg.stickerMotionDuration ?? 500);
      delay = Number(cfg.stickerMotionDelay ?? 0);
      break;
    }
  }

  return {
    preset:
      preset === "fade" ||
      preset === "fade-up" ||
      preset === "scale" ||
      preset === "blur"
        ? preset
        : "none",
    duration: Math.max(
      150,
      Math.min(3000, Number.isFinite(duration) ? duration : 600),
    ),
    delay: Math.max(0, Math.min(3000, Number.isFinite(delay) ? delay : 0)),
  };
}

function CreatorSectionReveal({
  section,
  disabled,
  children,
}: {
  section: CreatorPageSection;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const reveal = sectionRevealSettings(section);
  const shouldReveal = !disabled && reveal.preset !== "none";

  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(!shouldReveal);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!shouldReveal) {
      setArmed(false);
      setVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) {
      setVisible(true);
      return;
    }

    let cancelled = false;
    let fallbackTimer: number | null = null;
    let frame1 = 0;
    let frame2 = 0;

    setVisible(false);
    setArmed(false);

    const revealNow = () => {
      if (cancelled) return;
      setArmed(true);

      // Two frames guarantees the hidden state paints before the visible
      // state, so reloads / direct navigation still produce a transition.
      frame1 = window.requestAnimationFrame(() => {
        frame2 = window.requestAnimationFrame(() => {
          if (!cancelled) setVisible(true);
        });
      });
    };

    const rect = node.getBoundingClientRect();
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;

    const alreadyVisible =
      rect.bottom > Math.min(72, viewportHeight * 0.08) &&
      rect.top < viewportHeight * 0.88;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      revealNow();
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(frame1);
        window.cancelAnimationFrame(frame2);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting) {
          revealNow();
          observer.disconnect();
        }
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -10% 0px",
      },
    );

    if (alreadyVisible) {
      revealNow();
    } else {
      observer.observe(node);
    }

    // Safety net: no animated block should ever remain invisible because
    // IntersectionObserver missed a transition during reload / tab restore.
    fallbackTimer = window.setTimeout(
      () => {
        if (!cancelled) {
          setArmed(true);
          setVisible(true);
          observer.disconnect();
        }
      },
      Math.min(2200, Math.max(1200, reveal.delay + 900)),
    );

    return () => {
      cancelled = true;
      observer.disconnect();

      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }

      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
    };
  }, [shouldReveal, section.id, reveal.preset, reveal.duration, reveal.delay]);

  const presetClass =
    reveal.preset === "fade-up"
      ? motionStyles.revealFadeUp
      : reveal.preset === "scale"
        ? motionStyles.revealScale
        : reveal.preset === "blur"
          ? motionStyles.revealBlur
          : motionStyles.revealFade;

  const style = shouldReveal
    ? ({
        "--creator-motion-duration": `${Math.max(
          reveal.duration,
          reveal.preset === "fade" ? 520 : 620,
        )}ms`,
        "--creator-motion-delay": `${reveal.delay}ms`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      ref={ref}
      className={
        shouldReveal && armed
          ? `${motionStyles.revealBase} ${presetClass} ${
              visible ? motionStyles.revealVisible : ""
            }`
          : undefined
      }
      style={style}
    >
      {children}
    </div>
  );
}

export function CreatorPageView({
  sections,
  bots,
  worlds,
  pageConfig = {},
  selectedSectionId,
  onSectionSelect,
  isBuilderPreview = false,
  formStates,
  lorebooks,
}: CreatorPageViewProps) {
  const [botDetailBot, setBotDetailBot] = useState<any>(null);
  const [liveFormStates, setLiveFormStates] = useState<
    Record<string, CreatorPageFormState>
  >(formStates || {});
  const [liveLorebooks, setLiveLorebooks] = useState<
    CreatorPageLorebookPreview[]
  >(lorebooks || []);

  useEffect(() => {
    if (formStates) {
      setLiveFormStates(formStates);
    }
  }, [formStates]);
  useEffect(() => {
    if (lorebooks) setLiveLorebooks(lorebooks);
  }, [lorebooks]);

  useEffect(() => {
    if (isBuilderPreview || lorebooks) return;

    const lorebookSections = sections.filter(
      (section) => section.kind === "lorebook_gallery",
    );

    if (lorebookSections.length === 0) {
      setLiveLorebooks([]);
      return;
    }

    const hasAllLorebooksSection = lorebookSections.some((section) => {
      const value = section.config?.lorebookIds;
      return !Array.isArray(value) || value.length === 0;
    });

    const selectedIds = Array.from(
      new Set(
        lorebookSections.flatMap((section) => {
          const value = section.config?.lorebookIds;
          return Array.isArray(value)
            ? value.filter((item): item is string => typeof item === "string")
            : [];
        }),
      ),
    );

    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        let query = supabase
          .from("atlas_lorebooks")
          .select("id, title, summary")
          .is("deleted_at", null)
          .order("title");

        if (!hasAllLorebooksSection && selectedIds.length > 0) {
          query = query.in("id", selectedIds);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (cancelled) return;

        setLiveLorebooks(
          (data || []).map((item: any) => ({
            id: item.id,
            title: item.title || "Untitled lorebook",
            summary: item.summary || "",
          })),
        );
      } catch (error) {
        console.error("Failed to load Creator Page lorebooks:", error);
        if (!cancelled) setLiveLorebooks([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isBuilderPreview, lorebooks, sections, worlds]);

  useEffect(() => {
    if (isBuilderPreview || formStates) return;

    const formIds = Array.from(
      new Set(
        sections
          .filter((section) => section.kind === "form")
          .map((section) => String(section.config?.formId || ""))
          .filter(Boolean),
      ),
    );

    if (formIds.length === 0) {
      setLiveFormStates({});
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("creator_page_public_form_states")
          .select(
            "id, shareable_link, is_active, deactivated_message, deactivated_redirect_url, deactivated_redirect_label, deactivated_accent_color",
          )
          .in("id", formIds);

        if (error) throw error;
        if (cancelled) return;

        setLiveFormStates(
          Object.fromEntries(
            (data || []).map((form: any) => [
              form.id,
              {
                id: form.id,
                shareable_link: form.shareable_link || "",
                is_active: form.is_active !== false,
                deactivated_message: form.deactivated_message || "",
                deactivated_redirect_url: form.deactivated_redirect_url || "",
                deactivated_redirect_label:
                  form.deactivated_redirect_label || "",
                deactivated_accent_color: form.deactivated_accent_color || "",
              },
            ]),
          ),
        );
      } catch (error) {
        console.error("Failed to load creator page form states:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isBuilderPreview, formStates, sections]);

  const themeColor =
    typeof pageConfig.accentColor === "string"
      ? pageConfig.accentColor
      : "#7c3aed";

  const filteredSections = [...sections].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <>
      <CreatorPageCanvas config={pageConfig}>
        {filteredSections.map((section) => {
          const isBuilderSelectable = typeof onSectionSelect === "function";
          const isSelected = selectedSectionId === section.id;

          return (
            <div
              key={section.id}
              id={getCreatorSectionAnchor(section)}
              data-creator-section-id={section.id}
              className={
                isBuilderSelectable
                  ? "group/creator-block relative isolate cursor-pointer outline-none"
                  : undefined
              }
              onClickCapture={
                isBuilderSelectable
                  ? (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onSectionSelect(section.id);
                    }
                  : undefined
              }
            >
              {isBuilderSelectable && (
                <>
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute -inset-1 z-10 rounded-xl border-2 transition-[border-color,box-shadow,opacity] duration-150 ${
                      isSelected
                        ? "border-primary/90 opacity-100 shadow-[0_0_0_2px_hsl(var(--primary)/0.10)]"
                        : "border-primary/0 opacity-0 group-hover/creator-block:border-primary/35 group-hover/creator-block:opacity-100"
                    }`}
                  />

                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute -top-5 left-2 z-20 rounded-full border px-2.5 py-1 text-[10px] font-medium shadow-sm transition-opacity ${
                      isSelected
                        ? "border-primary/30 bg-primary text-primary-foreground opacity-100"
                        : "border-border/70 bg-background/90 text-muted-foreground opacity-0 group-hover/creator-block:opacity-100"
                    }`}
                  >
                    {section.title || "Untitled block"}
                  </div>
                </>
              )}

              <CreatorSectionReveal
                section={section}
                disabled={isBuilderPreview}
              >
                <SectionRenderer
                  section={section}
                  bots={sectionBots(section, bots)}
                  worlds={sectionWorlds(section, worlds)}
                  lorebooks={liveLorebooks}
                  themeColor={themeColor}
                  isBuilderPreview={isBuilderPreview}
                  formState={
                    section.kind === "form"
                      ? liveFormStates[String(section.config?.formId || "")] ||
                        null
                      : undefined
                  }
                  onBotClick={(bot) => {
                    if (isBuilderSelectable) return;

                    setBotDetailBot({
                      ...bot,
                      shortDescription: bot.short_description,
                      imageUrl: bot.image_url,
                    });
                  }}
                />
              </CreatorSectionReveal>
            </div>
          );
        })}

        {filteredSections.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border/70 bg-card/40 px-6 py-16 text-center">
            <Bot className="mx-auto mb-4 h-10 w-10 text-muted-foreground/35" />

            <p className="font-medium">This page is still a blank canvas.</p>

            <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              The creator has not added any public blocks yet.
            </p>
          </div>
        )}
      </CreatorPageCanvas>

      <BotDetailModal
        open={!!botDetailBot}
        onOpenChange={(open) => {
          if (!open) setBotDetailBot(null);
        }}
        bot={botDetailBot}
      />
    </>
  );
}
