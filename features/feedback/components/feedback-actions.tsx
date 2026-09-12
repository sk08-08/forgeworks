"use client";

import { useState, type FormEvent } from "react";
import { Bug, Lightbulb, MessageSquarePlus, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { submitFeedbackAction } from "@/features/feedback/actions/feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { X as XIcon } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

type FeedbackType = "suggestion" | "bug";

interface FeedbackContext {
  sourcePage?: string;
  sourceLabel?: string;
  sourcePath?: string;
  relatedId?: string;
  metadata?: Record<string, unknown>;
}

interface FeedbackActionsProps {
  context: FeedbackContext;
  className?: string;
  compact?: boolean;
  mode?: "both" | "suggestion" | "bug";
}

const feedbackLocationOptions = [
  "Login / Register",
  "Public form",
  "Dashboard",
  "Bot Manager",
  "Forms",
  "Submissions",
  "Moderation",
  "Atlas",
  "Creator Pages",
  "Profile",
  "Notifications",
  "Settings",
  "Other (specify)",
] as const;

function resolveInitialLocation(context: FeedbackContext) {
  const sourceLabel = context.sourceLabel?.trim();
  if (sourceLabel && feedbackLocationOptions.includes(sourceLabel as any)) {
    return sourceLabel;
  }

  const sourcePath = context.sourcePath?.toLowerCase() ?? "";
  if (sourcePath.startsWith("/login")) return "Login / Register";
  if (sourcePath.startsWith("/form")) return "Public form";
  if (sourcePath.startsWith("/dashboard")) return "Dashboard";
  if (sourcePath.startsWith("/bot-manager")) return "Bot Manager";
  if (sourcePath.startsWith("/forms")) return "Forms";
  if (sourcePath.startsWith("/submissions")) return "Submissions";
  if (sourcePath.startsWith("/moderation")) return "Moderation";
  if (sourcePath.startsWith("/atlas")) return "Atlas";
  if (sourcePath.startsWith("/creator-pages")) return "Creator Pages";
  if (sourcePath.startsWith("/profile")) return "Profile";
  if (sourcePath.startsWith("/notifications")) return "Notifications";
  if (sourcePath.startsWith("/settings")) return "Settings";
  if (sourcePath.startsWith("/other")) return "Other (specify)";

  return "Dashboard";
}

const copyByType: Record<
  FeedbackType,
  {
    title: string;
    description: string;
    subjectLabel: string;
    subjectPlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    helper: string;
  }
> = {
  suggestion: {
    title: "Send a suggestion",
    description:
      "Share an idea, comment, or improvement you would like to see in Forgeworks.",
    subjectLabel: "Suggestion title",
    subjectPlaceholder: "Example: Add a faster form preview",
    messageLabel: "What would you like to change?",
    messagePlaceholder:
      "Tell us what you would like to see, why it matters, and any details that help us understand the idea.",
    helper: "We read every suggestion and use them to prioritize improvements.",
  },
  bug: {
    title: "Report a bug",
    description:
      "Tell us what broke, what you expected to happen, and how we can reproduce it.",
    subjectLabel: "Bug summary",
    subjectPlaceholder: "Example: Login modal does not open on mobile",
    messageLabel: "Bug details",
    messagePlaceholder:
      "Explain what happened, the steps to reproduce it, what you expected, and anything else that would help us debug it.",
    helper:
      "If you can include reproduction steps, that makes fixes much faster.",
  },
};

export function FeedbackActions({
  context,
  className,
  compact = false,
  mode = "both",
}: FeedbackActionsProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("suggestion");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState<string>(
    resolveInitialLocation(context),
  );
  const [otherLocation, setOtherLocation] = useState("");
  const [images, setImages] = useState<
    { name: string; dataUrl: string; size: number; file: File }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = copyByType[feedbackType];
  const selectLabelText =
    feedbackType === "bug"
      ? "Where did this bug happen?"
      : "Where would you like to suggest this?";
  const attachIntroText =
    feedbackType === "bug"
      ? "Attach screenshots (up to 3, PNG/JPG), max 2MB each."
      : "Attach images or mockups (up to 3), max 2MB each.";

  const openDialog = (type: FeedbackType) => {
    setFeedbackType(type);
    setOpen(true);
  };

  const closeDialog = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setSubject("");
      setMessage("");
      setContact("");
      setImages([]);
      setOtherLocation("");
      setLocation(resolveInitialLocation(context));
      setFeedbackType("suggestion");
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (trimmedSubject.length < 3 || trimmedMessage.length < 10) {
      toast.error("Please add a short title and a more complete description.");
      return;
    }

    setIsSubmitting(true);

    try {
      const chosenSource =
        location === "Other (specify)"
          ? otherLocation.trim() || "Other"
          : location;

      const formData = new FormData();

      formData.set("feedbackType", feedbackType);
      formData.set("subject", trimmedSubject);
      formData.set("message", trimmedMessage);
      formData.set("contact", contact.trim());
      formData.set("sourcePage", chosenSource);
      formData.set("sourceLabel", chosenSource);
      formData.set("sourcePath", context.sourcePath ?? "");
      formData.set("relatedId", context.relatedId ?? "");

      formData.set("metadata", JSON.stringify(context.metadata ?? {}));

      for (const image of images) {
        formData.append("images", image.file, image.name);
      }

      const result = await submitFeedbackAction(formData);

      if (!result.success) {
        toast.error(result.error || "Failed to send feedback.");
        return;
      }

      toast.success(
        feedbackType === "bug"
          ? "Bug report sent. We'll review it soon."
          : "Suggestion sent. Thanks for the input.",
      );

      closeDialog(false);
    } catch (error) {
      console.error("Feedback submission failed:", error);

      toast.error("Failed to send feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const ActionSheet = (
    <form onSubmit={submit} className="min-w-0 space-y-5 pt-2 sm:space-y-6">
      <div className="grid w-full grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => setFeedbackType("suggestion")}
          className={cn(
            "flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all duration-200 sm:gap-2 sm:text-sm",
            feedbackType === "suggestion"
              ? "cursor-default bg-primary/10 text-primary shadow-sm"
              : "cursor-pointer text-muted-foreground hover:text-foreground",
          )}
        >
          <Lightbulb className="h-4 w-4" /> Suggestion
        </button>
        <button
          type="button"
          onClick={() => setFeedbackType("bug")}
          className={cn(
            "flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all duration-200 sm:gap-2 sm:text-sm",
            feedbackType === "bug"
              ? "cursor-default bg-red-500/10 text-destructive shadow-sm"
              : "cursor-pointer text-muted-foreground hover:text-foreground",
          )}
        >
          <Bug className="h-4 w-4" /> Bug Report
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="feedback-subject" className="text-foreground/90">
              {copy.subjectLabel}
            </Label>
            <span
              className={cn(
                "text-[10px]",
                subject.trim().length > 0 && subject.trim().length < 3
                  ? "text-destructive font-medium"
                  : "text-muted-foreground",
              )}
            >
              {subject.length}/120
            </span>
          </div>
          <Input
            id="feedback-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={copy.subjectPlaceholder}
            maxLength={120}
            required
            className={cn(
              "bg-muted/20 transition-colors",
              subject.trim().length > 0 &&
                subject.trim().length < 3 &&
                "border-destructive focus-visible:ring-destructive",
            )}
          />
          {subject.trim().length > 0 && subject.trim().length < 3 && (
            <p className="text-[11px] text-destructive">
              Title must be at least 3 characters long.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="feedback-message" className="text-foreground/90">
              {copy.messageLabel}
            </Label>
            <span
              className={cn(
                "text-[10px]",
                message.trim().length > 0 && message.trim().length < 10
                  ? "text-destructive font-medium"
                  : "text-muted-foreground",
              )}
            >
              {message.length} chars
            </span>
          </div>
          <Textarea
            id="feedback-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={copy.messagePlaceholder}
            rows={feedbackType === "bug" ? 5 : 4}
            required
            className={cn(
              "resize-none bg-muted/20 transition-colors",
              message.trim().length > 0 &&
                message.trim().length < 10 &&
                "border-destructive focus-visible:ring-destructive",
            )}
          />
          {message.trim().length > 0 && message.trim().length < 10 && (
            <p className="text-[11px] text-destructive">
              Please provide a little more detail (min. 10 chars).
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="feedback-location" className="text-foreground/90">
            {selectLabelText}
          </Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger
              id="feedback-location"
              className="bg-muted/20 w-full"
            >
              <SelectValue
                placeholder={
                  feedbackType === "bug"
                    ? "Select bug location"
                    : "Select suggestion target"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Login / Register">Login / Register</SelectItem>
              <SelectItem value="Public form">Public form</SelectItem>
              <SelectItem value="Dashboard">Dashboard</SelectItem>
              <SelectItem value="Bot Manager">Bot Manager</SelectItem>
              <SelectItem value="Forms">Forms</SelectItem>
              <SelectItem value="Submissions">Submissions</SelectItem>
              <SelectItem value="Moderation">Moderation</SelectItem>
              <SelectItem value="Atlas">Atlas</SelectItem>
              <SelectItem value="Creator Pages">Creator Pages</SelectItem>
              <SelectItem value="Profile">Profile</SelectItem>
              <SelectItem value="Notifications">Notifications</SelectItem>
              <SelectItem value="Settings">Settings</SelectItem>
              <SelectItem value="Other (specify)">Other (specify)</SelectItem>
            </SelectContent>
          </Select>
          {location === "Other (specify)" && (
            <Input
              value={otherLocation}
              onChange={(e) => setOtherLocation(e.target.value)}
              placeholder="Describe where this happened"
              maxLength={160}
              className="mt-2 bg-muted/20"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback-contact" className="text-foreground/90">
            Contact info (Optional)
          </Label>
          <Input
            id="feedback-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Email or username"
            maxLength={160}
            className="bg-muted/20"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-images" className="text-foreground/90">
          Attachments
        </Label>

        <label
          htmlFor="feedback-images"
          className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-5 text-center transition-colors hover:border-primary/50 hover:bg-muted/40 sm:px-6 sm:py-6"
        >
          <div className="rounded-full bg-muted p-2 text-muted-foreground group-hover:text-primary transition-colors">
            <Upload className="h-4 w-4" />
          </div>
          <div className="text-center text-sm">
            <span className="font-semibold text-primary">Click to upload</span>{" "}
            or drag and drop
            <p className="mt-1 text-xs text-muted-foreground">
              {attachIntroText}
            </p>
          </div>
          <input
            id="feedback-images"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              const maxFiles = 3;
              const maxSize = 2 * 1024 * 1024; // 2MB each
              const toAdd: {
                name: string;
                dataUrl: string;
                size: number;
                file: File;
              }[] = [];

              for (const f of files.slice(0, maxFiles)) {
                if (f.size > maxSize) {
                  toast.error(`${f.name} is too large (max 2MB).`);
                  continue;
                }
                const dataUrl = await new Promise<string | null>((res) => {
                  const reader = new FileReader();
                  reader.onload = () => res(String(reader.result ?? ""));
                  reader.onerror = () => res(null);
                  reader.readAsDataURL(f);
                });

                if (dataUrl)
                  toAdd.push({ name: f.name, dataUrl, size: f.size, file: f });
              }

              setImages((prev) => [...prev, ...toAdd].slice(0, 3));
              (e.target as HTMLInputElement).value = "";
            }}
          />
        </label>

        {images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="group relative aspect-video overflow-hidden rounded-lg border bg-muted shadow-sm"
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <button
                  type="button"
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white opacity-100 backdrop-blur-sm transition-opacity hover:bg-destructive sm:h-6 sm:w-6 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    setImages((prev) => prev.filter((_, i) => i !== idx));
                  }}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="hidden max-w-[60%] text-xs text-muted-foreground sm:block">
          {copy.helper}
        </p>
        <Button
          type="submit"
          className="w-full cursor-pointer sm:w-auto sm:px-8"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            "Sending..."
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send {feedbackType === "bug" ? "report" : "suggestion"}
            </>
          )}
        </Button>
      </div>
    </form>
  );

  return (
    <>
      <div className={cn("flex min-w-0 flex-wrap gap-2", className)}>
        {(mode === "both" || mode === "suggestion") && (
          <Button
            type="button"
            variant="outline"
            size={compact ? "sm" : "default"}
            className="cursor-pointer"
            onClick={() => openDialog("suggestion")}
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Suggestion
          </Button>
        )}
        {(mode === "both" || mode === "bug") && (
          <Button
            type="button"
            variant="destructive"
            size={compact ? "sm" : "default"}
            className="cursor-pointer"
            onClick={() => openDialog("bug")}
          >
            <Bug className="mr-2 h-4 w-4" />
            Report bug
          </Button>
        )}
      </div>

      {isMobile ? (
        <Drawer open={open} onOpenChange={closeDialog}>
          <DrawerContent className="max-h-[calc(100dvh-0.5rem)]">
            <div className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-10">
              <DrawerHeader className="px-0 pt-4 text-left">
                <DrawerTitle>{copy.title}</DrawerTitle>
                <DrawerDescription>{copy.description}</DrawerDescription>
              </DrawerHeader>
              {ActionSheet}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={closeDialog}>
          <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
            <DialogHeader className="text-left">
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>
            {ActionSheet}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
