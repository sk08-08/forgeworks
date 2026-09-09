"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAtlasEntryAction } from "@/features/atlas/actions/entries";
import type { AtlasEntryKind } from "@/features/atlas/types/atlas-types";
import { ATLAS_ENTRY_TYPE_LABELS } from "./entry-type-badge";

const kinds = Object.keys(ATLAS_ENTRY_TYPE_LABELS) as AtlasEntryKind[];

export function CreateEntryDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [entryType, setEntryType] = useState<AtlasEntryKind>("character");
  const [pending, startTransition] = useTransition();

  const createEntry = () => {
    startTransition(async () => {
      const result = await createAtlasEntryAction({ title, entryType });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      setTitle("");
      setEntryType("character");
      toast.success("Entry created");
      router.push(`/atlas/entries/${result.data.id}`);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="rounded-xl cursor-pointer">
            <Plus className="mr-2 h-4 w-4" /> New entry
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create an Atlas entry</DialogTitle>
          <DialogDescription>
            Start with the knowledge itself. Worlds, Collections and Lorebooks
            can be connected later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="atlas-entry-title">Title</Label>
            <Input
              id="atlas-entry-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Aurelia, Silverkeep, The Ashen Court"
              maxLength={160}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter" && title.trim() && !pending)
                  createEntry();
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={entryType}
              onValueChange={(value) => setEntryType(value as AtlasEntryKind)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kinds.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {ATLAS_ENTRY_TYPE_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            className="cursor-pointer"
            onClick={createEntry}
            disabled={pending || !title.trim()}
          >
            {pending ? "Creating..." : "Create entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
