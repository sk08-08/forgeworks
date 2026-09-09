"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createAtlasWorldAction } from "@/features/atlas/actions/worlds";

export function CreateWorldDialog({
  triggerLabel = "New World",
  variant = "default",
}: {
  triggerLabel?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setTitle("");
    setDescription("");
  };

  const submit = () => {
    startTransition(async () => {
      const result = await createAtlasWorldAction({ title, description });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setOpen(false);
      reset();
      toast.success("World created");
      router.push(`/atlas/worlds/${result.data.id}`);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && !pending) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant} className="cursor-pointer rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Globe2 className="h-5 w-5" />
          </div>
          <DialogTitle>Create a World</DialogTitle>
          <DialogDescription>
            A World is an optional context for Entries and Bots. It does not own
            or duplicate your knowledge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="atlas-world-title">Title</Label>
            <Input
              id="atlas-world-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Nevermore Academy"
              maxLength={160}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="atlas-world-description">Description</Label>
            <Textarea
              id="atlas-world-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this setting, project, universe, or continuity?"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            className="bg-primary hover:bg-primary/90 cursor-pointer"
            disabled={pending || !title.trim()}
          >
            {pending ? "Creating..." : "Create World"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
