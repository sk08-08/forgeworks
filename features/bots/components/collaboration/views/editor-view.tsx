"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MarkdownField } from "@/features/markdown/components/markdown-field";
import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";
import { BotTagSelector } from "../../bot-tag-selector";
import { TokenSummary } from "../../token-counter";
import { cn } from "@/lib/utils";
import { CollaborativeField } from "../collaborative-field";
import { EDITOR_SECTIONS } from "../collaboration-config";
import { useCollaborationWorkspace } from "../collaboration-workspace-context";
import type { BotCollaborationField } from "@/features/bots/lib/collaboration-permissions";

export function EditorView() {
  const {
    values,
    dirtyFields,
    remoteConflicts,
    saving,
    approvalRequired,
    userRole,
    realtime,
    updateField,
    discardAll,
    saveChanges,
    canEditField,
  } = useCollaborationWorkspace();
  const [tagInput, setTagInput] = useState("");
  const [rightPanel, setRightPanel] = useState<"preview" | "live">("preview");

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const saveLabel =
    approvalRequired && userRole === "editor"
      ? "Submit for review"
      : "Save changes";
  const onlineOthers = useMemo(
    () =>
      realtime.presenceUsers.filter(
        (user) => user.userId !== realtime.currentUserId,
      ),
    [realtime.currentUserId, realtime.presenceUsers],
  );

  const disabled = (field: BotCollaborationField) => !canEditField(field);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`collab-${sectionId}`);

    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(null, "", `#collab-${sectionId}`);
  };

  return (
    <div className="pb-24">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
            Collaborative editor
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Bot content
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Edit field-by-field. Locks are temporary; your local draft remains
            separate from another collaborator&apos;s live draft.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EDITOR_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#collab-${section.id}`}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(section.id);
              }}
              className="cursor-pointer rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs text-muted-foreground outline-none transition-colors duration-200 hover:border-primary/30 hover:bg-primary/[0.03] hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {section.label}
            </a>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <EditorSection
            id="identity"
            title="Identity"
            description="How the bot is presented and addressed."
          >
            <CollaborativeField field="name">
              <Input
                value={values.name}
                onChange={(e) => updateField("name", e.target.value)}
                disabled={disabled("name")}
              />
            </CollaborativeField>
            <CollaborativeField field="chat_name">
              <Input
                value={values.chat_name}
                onChange={(e) => updateField("chat_name", e.target.value)}
                disabled={disabled("chat_name")}
                placeholder="Optional chat display name"
              />
            </CollaborativeField>
            <CollaborativeField field="short_description">
              <Textarea
                value={values.short_description}
                onChange={(e) =>
                  updateField("short_description", e.target.value)
                }
                disabled={disabled("short_description")}
                className="min-h-20 resize-y"
                maxLength={500}
              />
            </CollaborativeField>
          </EditorSection>

          <EditorSection
            id="character"
            title="Character"
            description="Core personality, behavior and scenario context."
          >
            <CollaborativeField field="personality">
              <MarkdownField
                value={values.personality}
                onChange={(value) => updateField("personality", value)}
                disabled={disabled("personality")}
                className="min-h-40"
                placeholder="Personality, behavior, quirks…"
              />
            </CollaborativeField>
            <CollaborativeField field="scenario">
              <MarkdownField
                value={values.scenario}
                onChange={(value) => updateField("scenario", value)}
                disabled={disabled("scenario")}
                className="min-h-32"
                placeholder="Setting, context and situation…"
              />
            </CollaborativeField>
          </EditorSection>

          <EditorSection
            id="conversation"
            title="Conversation"
            description="Opening messages and examples that shape how the bot speaks."
          >
            <CollaborativeField field="first_message">
              <MarkdownField
                value={values.first_message}
                onChange={(value) => updateField("first_message", value)}
                disabled={disabled("first_message")}
                className="min-h-44"
                placeholder="The first message the bot sends…"
              />
            </CollaborativeField>
            <CollaborativeField field="alternate_greetings">
              <div className="space-y-3">
                {values.alternate_greetings.map((greeting, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-border/60 bg-background/70 p-3 transition-all duration-200 hover:border-border/80 hover:shadow-sm"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        Greeting {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-pointer text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive active:scale-[0.95] disabled:cursor-not-allowed"
                        disabled={disabled("alternate_greetings")}
                        onClick={() =>
                          updateField(
                            "alternate_greetings",
                            values.alternate_greetings.filter(
                              (_, i) => i !== index,
                            ),
                          )
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <MarkdownField
                      value={greeting}
                      onChange={(next) => {
                        const list = [...values.alternate_greetings];
                        list[index] = next;
                        updateField("alternate_greetings", list);
                      }}
                      disabled={disabled("alternate_greetings")}
                      className="min-h-28"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed"
                  disabled={disabled("alternate_greetings")}
                  onClick={() =>
                    updateField("alternate_greetings", [
                      ...values.alternate_greetings,
                      "",
                    ])
                  }
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add greeting
                </Button>
              </div>
            </CollaborativeField>
            <CollaborativeField field="example_dialogues">
              <MarkdownField
                value={values.example_dialogues}
                onChange={(value) => updateField("example_dialogues", value)}
                disabled={disabled("example_dialogues")}
                className="min-h-40"
                placeholder="Example conversations…"
              />
            </CollaborativeField>
          </EditorSection>

          <EditorSection
            id="classification"
            title="Classification"
            description="Rating and tags used across Forgeworks."
          >
            <CollaborativeField field="rating">
              <RadioGroup
                value={values.rating}
                onValueChange={(value) => updateField("rating", value)}
                disabled={disabled("rating")}
                className="flex gap-5"
              >
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="SFW" />{" "}
                  <span className="text-sm">SFW</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="NSFW" />{" "}
                  <span className="text-sm">NSFW</span>
                </label>
              </RadioGroup>
            </CollaborativeField>
            <CollaborativeField field="tags">
              <BotTagSelector
                tags={values.tags}
                onTagsChange={(tags) => updateField("tags", tags)}
                inputValue={tagInput}
                onInputValueChange={setTagInput}
                disabled={disabled("tags")}
              />
            </CollaborativeField>
          </EditorSection>

          <EditorSection
            id="appearance"
            title="Appearance & privacy"
            description="Image and sensitive-field behavior."
          >
            <CollaborativeField field="image_url">
              <Input
                value={values.image_url}
                onChange={(e) => updateField("image_url", e.target.value)}
                disabled={disabled("image_url")}
                placeholder="https://…"
              />
            </CollaborativeField>
            <CollaborativeField field="hide_sensitive_fields">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    Hide sensitive definition fields
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Controls whether sensitive character-definition content is
                    hidden in detail views.
                  </p>
                </div>
                <Switch
                  checked={values.hide_sensitive_fields}
                  onCheckedChange={(checked) =>
                    updateField("hide_sensitive_fields", checked)
                  }
                  disabled={disabled("hide_sensitive_fields")}
                  className={
                    disabled("hide_sensitive_fields")
                      ? "cursor-not-allowed"
                      : "cursor-pointer"
                  }
                />
              </div>
            </CollaborativeField>
          </EditorSection>
        </div>

        <aside className="h-fit xl:sticky xl:top-20">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="flex border-b border-border/60 p-1.5">
              <button
                type="button"
                onClick={() => setRightPanel("preview")}
                className={cn(
                  "flex-1 cursor-pointer rounded-lg px-3 py-2 text-xs outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.98]",
                  rightPanel === "preview"
                    ? "bg-primary/10 font-medium text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setRightPanel("live")}
                className={cn(
                  "flex-1 cursor-pointer rounded-lg px-3 py-2 text-xs outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.98]",
                  rightPanel === "live"
                    ? "bg-primary/10 font-medium text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                Live team
              </button>
            </div>
            {rightPanel === "preview" ? (
              <div className="p-4">
                {values.image_url && (
                  <img
                    src={values.image_url}
                    alt=""
                    className="mb-4 aspect-4/5 w-full rounded-xl border border-border/50 object-cover"
                  />
                )}
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold">
                    {values.name || "Untitled bot"}
                  </h3>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-medium",
                      values.rating === "NSFW"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-emerald-500/10 text-emerald-500",
                    )}
                  >
                    {values.rating}
                  </span>
                </div>
                {values.short_description && (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {values.short_description}
                  </p>
                )}
                {/* <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-3">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    First message
                  </p>
                  <div className="max-h-52 overflow-y-auto text-sm">
                    <MarkdownRenderer
                      content={
                        values.first_message || "*No first message yet.*"
                      }
                    />
                  </div>
                </div> */}
                <div className="mt-4">
                  <TokenSummary
                    personality={values.personality}
                    initialMessages={[
                      values.first_message,
                      ...values.alternate_greetings,
                    ]}
                    scenario={values.scenario}
                    exampleDialogues={values.example_dialogues}
                  />
                </div>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-xs font-medium">Working now</p>
                <div className="mt-3 space-y-2">
                  {onlineOthers.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                      No other collaborators are online.
                    </p>
                  ) : (
                    onlineOthers.map((user) => (
                      <div
                        key={user.userId}
                        className="flex items-center gap-3 rounded-xl bg-muted/25 p-2.5 transition-colors duration-200 hover:bg-muted/40"
                      >
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserRound className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {user.displayName || user.username || "Forge user"}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {user.activeField
                              ? `Editing ${user.activeField.replaceAll("_", " ")}`
                              : `Viewing ${user.activeTab}`}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {mounted &&
        (dirtyFields.size > 0 || remoteConflicts.size > 0) &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex justify-center px-3">
            <div className="pointer-events-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-border/70 bg-background/95 p-3 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {dirtyFields.size} unsaved field
                  {dirtyFields.size === 1 ? "" : "s"}
                </p>

                <p className="text-[11px] text-muted-foreground">
                  {remoteConflicts.size > 0
                    ? `${remoteConflicts.size} remote update${
                        remoteConflicts.size === 1 ? " needs" : "s need"
                      } review before saving.`
                    : approvalRequired && userRole === "editor"
                      ? "These changes will be submitted as a Change Request."
                      : "Your draft is local until you save it."}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  onClick={discardAll}
                  disabled={saving}
                  className="cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed"
                >
                  Discard
                </Button>

                <Button
                  onClick={() => void saveChanges()}
                  disabled={saving || remoteConflicts.size > 0}
                  className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : saveLabel}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function EditorSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`collab-${id}`}
      className="scroll-mt-6 overflow-hidden rounded-[1.4rem] border border-border/60 bg-card/70 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md"
    >
      <div className="border-b border-border/50 px-4 py-4 sm:px-5">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="divide-y divide-border/40 p-1 sm:p-2">{children}</div>
    </section>
  );
}
