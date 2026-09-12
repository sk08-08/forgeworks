"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import {
  updateCommunityRecordDirect,
  type CommunityEvidenceStatus,
  type CommunityImpact,
  type CommunityStatus,
} from "@/features/hub/community/actions/community";

type RecordShape = {
  id: string;
  status: CommunityStatus;
  evidence_status: CommunityEvidenceStatus;
  impact: CommunityImpact | null;
  status_note: string | null;
  evidence_note: string | null;
  is_published: boolean;
  is_featured: boolean;
  featured_order: number;
};

export function CommunityStaffControlsDialog({
  open,
  onOpenChange,
  record,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: RecordShape;
  onSaved?: () => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<CommunityStatus>(record.status);
  const [evidence, setEvidence] = useState<CommunityEvidenceStatus>(
    record.evidence_status,
  );
  const [impact, setImpact] = useState<CommunityImpact | "none">(
    record.impact || "none",
  );
  const [statusNote, setStatusNote] = useState(record.status_note || "");
  const [evidenceNote, setEvidenceNote] = useState(record.evidence_note || "");
  const [published, setPublished] = useState(record.is_published);
  const [featured, setFeatured] = useState(record.is_featured);
  const [featuredOrder, setFeaturedOrder] = useState(
    String(record.featured_order || 0),
  );

  useEffect(() => {
    if (!open) return;

    setStatus(record.status);
    setEvidence(record.evidence_status);
    setImpact(record.impact || "none");
    setStatusNote(record.status_note || "");
    setEvidenceNote(record.evidence_note || "");
    setPublished(record.is_published);
    setFeatured(record.is_featured);
    setFeaturedOrder(String(record.featured_order || 0));
  }, [open, record]);

  const save = async () => {
    setSaving(true);

    try {
      const result = await updateCommunityRecordDirect({
        recordId: record.id,
        status,
        evidenceStatus: evidence,
        impact: impact === "none" ? null : impact,
        statusNote,
        evidenceNote,
        isPublished: status === "archived" ? false : published,
        isFeatured: status === "archived" ? false : featured,
        featuredOrder:
          status === "archived" || !featured ? 0 : Number(featuredOrder || 0),
      });

      if (!result.success) {
        toast.error(result.error || "Could not update staff controls.");
        return;
      }

      toast.success("Staff controls updated.");
      onOpenChange(false);
      await onSaved?.();
    } catch (error) {
      console.error(error);
      toast.error("Could not update staff controls.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] min-h-0 w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0 text-left">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Staff controls
          </DialogTitle>
          <DialogDescription>
            Manage the authoritative state, evidence and visibility of this
            Community record.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden pr-1">
          <section className="rounded-2xl border border-border/60 bg-muted/[0.12] p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    const nextStatus = value as CommunityStatus;
                    setStatus(nextStatus);

                    if (nextStatus === "archived") {
                      setPublished(false);
                      setFeatured(false);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="developing">Developing</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="partially_resolved">
                      Partially resolved
                    </SelectItem>
                    <SelectItem value="unresolved">Unresolved</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Evidence</Label>
                <Select
                  value={evidence}
                  onValueChange={(value) =>
                    setEvidence(value as CommunityEvidenceStatus)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reported">Reported</SelectItem>
                    <SelectItem value="corroborated">Corroborated</SelectItem>
                    <SelectItem value="official_response">
                      Official response
                    </SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Impact</Label>
                <Select
                  value={impact}
                  onValueChange={(value) =>
                    setImpact(value as CommunityImpact | "none")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assessed</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <div className="space-y-2">
                <Label>Status note</Label>
                <Textarea
                  value={statusNote}
                  onChange={(event) => setStatusNote(event.target.value)}
                  rows={3}
                  maxLength={1500}
                  placeholder="Explain the current outcome or state."
                />
              </div>

              <div className="space-y-2">
                <Label>Evidence note</Label>
                <Textarea
                  value={evidenceNote}
                  onChange={(event) => setEvidenceNote(event.target.value)}
                  rows={3}
                  maxLength={1500}
                  placeholder="Explain what supports the current evidence level."
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-sm font-semibold">Visibility</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Publishing controls whether the record is visible publicly.
              Featured records receive priority placement in Community.
            </p>

            <div className="mt-4 space-y-4">
              <div className="flex min-w-0 items-start justify-between gap-4 rounded-xl border border-border/55 bg-background/40 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Published</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {status === "archived"
                      ? "Archived records stay hidden until they are restored."
                      : "Show this record in Community."}
                  </p>
                </div>
                <Switch
                  checked={published}
                  disabled={status === "archived"}
                  onCheckedChange={(checked) => {
                    setPublished(checked);

                    if (!checked) {
                      setFeatured(false);
                    }
                  }}
                />
              </div>

              <div className="flex min-w-0 items-start justify-between gap-4 rounded-xl border border-border/55 bg-background/40 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Featured</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {published
                      ? "Prioritize this record in featured content."
                      : "Publish the record before featuring it."}
                  </p>
                </div>
                <Switch
                  checked={featured}
                  disabled={!published || status === "archived"}
                  onCheckedChange={setFeatured}
                />
              </div>

              {featured && (
                <div className="space-y-2">
                  <Label htmlFor="community-featured-order">
                    Featured order
                  </Label>
                  <Input
                    id="community-featured-order"
                    type="number"
                    min={0}
                    max={999}
                    value={featuredOrder}
                    onChange={(event) => setFeaturedOrder(event.target.value)}
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 pt-4 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
            className="w-full cursor-pointer sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={save}
            className="w-full cursor-pointer sm:w-auto"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save controls
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
