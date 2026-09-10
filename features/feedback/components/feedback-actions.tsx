"use client";

import { createClient } from "@/lib/supabase/client";
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

    const supabase = createClient();
    const uploadedImagesUrls: { name: string; size: number; url: string }[] =
      [];

    if (images.length > 0) {
      for (const img of images) {
        const fileExt = img.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `feedback/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("feedback_images")
          .upload(filePath, img.file);

        if (uploadError) {
          toast.error(`Failed to upload image: ${img.name}`);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("feedback_images").getPublicUrl(filePath);

        uploadedImagesUrls.push({
          name: img.name,
          size: img.size,
          url: publicUrl,
        });
      }
    }

    const chosenSource =
      location === "other" ? otherLocation.trim() || "Other" : location;

    const result = await submitFeedbackAction({
      feedbackType,
      subject: trimmedSubject,
      message: trimmedMessage,
      contact: contact.trim(),
      sourcePage: chosenSource,
      sourceLabel: chosenSource,
      sourcePath: context.sourcePath ?? "",
      relatedId: context.relatedId ?? "",
      metadata: {
        ...(context.metadata ?? {}),
        images: uploadedImagesUrls,
      },
    });

    setIsSubmitting(false);

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
  };

  const ActionSheet = (
    <form onSubmit={submit} className="space-y-6 pt-2">
      <div className="flex w-full rounded-lg bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => setFeedbackType("suggestion")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium transition-all duration-200",
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
            "flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium transition-all duration-200",
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="feedback-location" className="text-foreground/90">
            {selectLabelText}
          </Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger id="feedback-location" className="bg-muted/20">
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
          {location === "other" && (
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
          className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/10 px-6 py-6 transition-colors hover:bg-muted/40 hover:border-primary/50"
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
          <div className="mt-3 grid grid-cols-3 gap-3">
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
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-destructive"
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

      <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-4">
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
      <div className={cn("flex flex-wrap gap-2", className)}>
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
          <DrawerContent className="max-h-[96vh]">
            <div className="overflow-y-auto px-4 pb-10 sm:px-6">
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
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
