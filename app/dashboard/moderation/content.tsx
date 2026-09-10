// ============================================================================
// Forgeworks - Moderation Content Component
// Main moderation interface (used in dashboard)
// ============================================================================

"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { ModerationPanel } from "@/features/moderation/components/moderation-panel";
import type { RequestForm } from "@/features/forms/types/form-types";
import { getCurrentUserAccess } from "@/lib/access";
import { cachedBrowserRequest } from "@/lib/browser-request-cache";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";

interface ModerationPageContentProps {
  adminView?: boolean;
}

export default function ModerationPageContent({
  adminView = false,
}: ModerationPageContentProps) {
  const [forms, setForms] = useState<RequestForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async (force = false) => {
    setLoading(true);
    try {
      const result = await cachedBrowserRequest(
        adminView ? "moderation:forms:admin" : "moderation:forms:owned",
        10_000,
        async () => {
          const supabase = createClient();
          const { user, isAdmin } = await getCurrentUserAccess(supabase);
          const activeUserId = user?.id ?? null;
          const canSeeAllForms = adminView && isAdmin;

          if (!user) {
            return {
              forms: [] as RequestForm[],
              activeUserId: null as string | null,
            };
          }

          let query = supabase
            .from("active_request_forms")
            .select("*")
            .order("created_at", { ascending: false });

          if (!canSeeAllForms) {
            query = query.eq("user_id", user.id);
          }

          const { data, error } = await query;

          if (error) {
            throw error;
          }

          return {
            forms: (data || []).map((form: any) => ({
              id: form.id,
              ownerId: form.user_id || undefined,
              title: form.title,
              description: form.description || "",
              sections: form.sections || [],
              appearance: form.appearance || undefined,
              shareableLink: form.shareable_link || "",
              isActive: !!form.is_active,
              securitySensitivity: form.security_sensitivity || undefined,
              createdAt: form.created_at
                ? new Date(form.created_at)
                : new Date(),
              updatedAt: form.updated_at
                ? new Date(form.updated_at)
                : new Date(),
            })) as RequestForm[],
            activeUserId,
            canSeeAllForms,
          };
        },
        force,
      );

      if (!result.activeUserId) {
        setForms([]);
        setSelectedFormId(null);
        setCurrentUserId(null);
        return;
      }

      setCurrentUserId(result.activeUserId);
      setForms(result.forms);

      const ownForms = result.activeUserId
        ? result.forms.filter((form) => form.ownerId === result.activeUserId)
        : result.forms;

      const preferredForms = result.canSeeAllForms ? result.forms : ownForms;

      setSelectedFormId((currentSelected) => {
        if (
          currentSelected &&
          preferredForms.some((form) => form.id === currentSelected)
        ) {
          return currentSelected;
        }

        return preferredForms[0]?.id || null;
      });
    } catch (error) {
      console.error("Error loading forms:", error);
      setForms([]);
      setSelectedFormId(null);
    } finally {
      setLoading(false);
    }
  };

  const selectedForm = forms.find((f) => f.id === selectedFormId);

  return (
    <div className="p-8 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Form Moderation
            </h1>
            <p className="mt-1 text-sm sm:text-base text-muted-foreground">
              Review and manage flagged submissions
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="cursor-pointer"
          onClick={() => loadForms(true)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Form Selector */}
      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">
              {adminView ? "Loading forms…" : "Loading your forms…"}
            </p>
          </div>
        </div>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No forms found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Form</CardTitle>
              <CardDescription>
                Choose which form&apos;s submissions you want to moderate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedFormId || ""}
                onValueChange={setSelectedFormId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {stripMarkdownToText(form.title) || "Untitled form"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Moderation Panel */}
          {selectedForm && (
            <ModerationPanel
              formId={selectedForm.id}
              formTitle={selectedForm.title}
              formOwnerId={selectedForm.ownerId ?? null}
              currentUserId={currentUserId}
            />
          )}
        </>
      )}
    </div>
  );
}
