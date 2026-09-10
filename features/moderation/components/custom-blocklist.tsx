// ============================================================================
// Forgeworks - Custom Blocklist Management
// Manage form-specific word/pattern blocklists
// ============================================================================

"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  addToCustomBlocklist,
  getCustomBlocklist,
  removeFromCustomBlocklist,
} from "@/features/moderation/actions/safety";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";

interface CustomBlocklistProps {
  formId: string;
  formTitle?: string;
}

interface BlocklistItem {
  id: string;
  pattern: string;
  isRegex: boolean;
  createdAt: string;
}

export function CustomBlocklist({ formId, formTitle }: CustomBlocklistProps) {
  const [patterns, setPatterns] = useState<BlocklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPattern, setNewPattern] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadBlocklist();
  }, [formId]);

  const loadBlocklist = async () => {
    setLoading(true);
    try {
      const result = await getCustomBlocklist(formId);
      if (result.success && result.patterns) {
        setPatterns(
          result.patterns.map((p: any) => ({
            id: p.id,
            pattern: p.pattern,
            isRegex: p.is_regex === true,
            createdAt: p.created_at || new Date().toISOString(),
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load blocklist:", error);
      toast.error("Failed to load blocklist");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newPattern.trim()) {
      toast.error("Please enter a pattern");
      return;
    }

    setIsAdding(true);
    try {
      const result = await addToCustomBlocklist(
        formId,
        newPattern.trim(),
        isRegex,
      );
      if (result.success) {
        toast.success("Pattern added to blocklist");
        setNewPattern("");
        setIsRegex(false);
        setDialogOpen(false);
        await loadBlocklist();
      } else {
        toast.error(result.error || "Failed to add pattern");
      }
    } catch (error) {
      console.error("Error adding pattern:", error);
      toast.error("Failed to add pattern");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    const pattern = patterns.find((p) => p.id === id);
    if (!pattern) return;

    try {
      const result = await removeFromCustomBlocklist(formId, pattern.pattern);
      if (result.success) {
        toast.success("Pattern removed");
        await loadBlocklist();
      } else {
        toast.error(result.error || "Failed to remove pattern");
      }
    } catch (error) {
      console.error("Error removing pattern:", error);
      toast.error("Failed to remove pattern");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Custom Blocklist</CardTitle>
            <CardDescription>
              Add words or patterns to block for{" "}
              {stripMarkdownToText(formTitle) || "this form"}
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 cursor-pointer">
                <Plus className="h-4 w-4" />
                Add Pattern
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to Blocklist</DialogTitle>
                <DialogDescription>
                  Add words or patterns to automatically flag submissions
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="pattern" className="text-sm font-medium">
                    Pattern
                  </Label>
                  <Input
                    id="pattern"
                    placeholder="e.g., badword, inappropriate"
                    value={newPattern}
                    onChange={(e) => setNewPattern(e.target.value)}
                    className="mt-1"
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isRegex
                      ? "Use regex pattern (e.g., bad\\w+)"
                      : "Simple word match (case-insensitive)"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is-regex"
                    checked={isRegex}
                    onCheckedChange={(checked) => setIsRegex(!!checked)}
                  />
                  <Label htmlFor="is-regex" className="text-sm cursor-pointer">
                    Use regex pattern
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={isAdding}
                  className="cursor-pointer"
                >
                  Add Pattern
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : patterns.length === 0 ? (
          <div className="text-center py-6">
            <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No patterns yet. Add your first one!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {patterns.map((pattern) => (
              <div
                key={pattern.id}
                className="flex items-center justify-between p-2 bg-muted rounded-lg"
              >
                <div className="flex-1">
                  <code className="text-sm font-mono">{pattern.pattern}</code>
                  {pattern.isRegex && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      regex
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemove(pattern.id)}
                  className="cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
