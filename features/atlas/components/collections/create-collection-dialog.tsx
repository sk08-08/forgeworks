"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAtlasCollectionAction } from "@/features/atlas/actions/collections";

export function CreateCollectionDialog({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await createAtlasCollectionAction({ title, description });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      setTitle("");
      setDescription("");
      toast.success("Collection created");
      router.push(`/atlas/collections/${result.data.id}`);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="rounded-xl cursor-pointer"
          size={compact ? "sm" : "default"}
        >
          {compact ? (
            <Plus className="mr-2 h-4 w-4" />
          ) : (
            <FolderPlus className="mr-2 h-4 w-4" />
          )}
          New collection
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Collection</DialogTitle>
          <DialogDescription>
            Collections are flexible sets of Entries. They do not change the
            Entries themselves.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="collection-title">Title</Label>
            <Input
              id="collection-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Main cast"
              maxLength={160}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="collection-description">Description</Label>
            <Textarea
              id="collection-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What belongs in this collection?"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 cursor-pointer"
            onClick={submit}
            disabled={pending || !title.trim()}
          >
            {pending ? "Creating..." : "Create collection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
