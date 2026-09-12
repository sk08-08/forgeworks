// ============================================================================
// Safety & Security Actions
// Rate limiting, content filtering, and flagging for form submissions
// ============================================================================

"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import {
  filterFormResponses,
  type ContentFilterResult,
  type SensitivityLevel,
} from "@/features/moderation/lib/content-filter";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { FormSection } from "@/features/forms/types/form-types";

import {
  sanitizeVisibleResponses,
  validateFormValues,
} from "@/features/forms/lib/form-runtime";

import { stripMarkdownToText } from "@/features/markdown/lib/markdown";

type SupabaseClientType = Awaited<ReturnType<typeof createClient>>;

function normalizeSensitivity(value: unknown): SensitivityLevel {
  switch (value) {
    case "low":
    case "medium":
    case "high":
    case "strict":
      return value;

    default:
      return "medium";
  }
}

type SafetyAccessContext = {
  supabase: SupabaseClientType;
  userId: string;
  staffRole: "owner" | "moderator" | null;
};

async function getSafetyAccess(): Promise<
  | {
      success: true;
      access: SafetyAccessContext;
    }
  | {
      success: false;
      error: string;
    }
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return {
      success: false,
      error: authError.message || "Unauthenticated",
    };
  }

  if (!user) {
    return {
      success: false,
      error: "Unauthenticated",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      staff_role,
      is_blocked
      `,
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      success: false,
      error: profileError.message || "Failed to load account access",
    };
  }

  if (!profile) {
    return {
      success: false,
      error: "Profile not found",
    };
  }

  if (profile.is_blocked) {
    return {
      success: false,
      error: "Account is blocked",
    };
  }

  const staffRole =
    profile.staff_role === "owner" || profile.staff_role === "moderator"
      ? profile.staff_role
      : null;

  return {
    success: true,
    access: {
      supabase,
      userId: user.id,
      staffRole,
    },
  };
}

async function assertOwner(): Promise<
  | {
      success: true;
      supabase: SupabaseClientType;
      userId: string;
    }
  | {
      success: false;
      error: string;
    }
> {
  const result = await getSafetyAccess();

  if (!result.success) {
    return result;
  }

  if (result.access.staffRole !== "owner") {
    return {
      success: false,
      error: "Owner access required",
    };
  }

  return {
    success: true,
    supabase: result.access.supabase,
    userId: result.access.userId,
  };
}

async function assertOwnedForm(formId: string): Promise<
  | {
      success: true;
      supabase: SupabaseClientType;
      userId: string;
      isOwnerOverride: boolean;
    }
  | {
      success: false;
      error: string;
    }
> {
  const result = await getSafetyAccess();

  if (!result.success) {
    return result;
  }

  const { supabase, userId, staffRole } = result.access;

  /*
   * The platform Owner may manage
   * any active form from Staff Panel.
   *
   * Moderators DO NOT get this bypass.
   * A Moderator can only use these
   * creator-facing actions for forms
   * they personally own.
   */
  if (staffRole === "owner") {
    const { data, error } = await supabase
      .from("request_forms")
      .select("id")
      .eq("id", formId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to verify form",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Form not found",
      };
    }

    return {
      success: true,
      supabase,
      userId,
      isOwnerOverride: true,
    };
  }

  /*
   * Normal creators — including a Moderator
   * acting as a normal creator — must own
   * the requested form.
   */
  const { data, error } = await supabase
    .from("request_forms")
    .select("id")
    .eq("id", formId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to verify form ownership",
    };
  }

  if (!data) {
    return {
      success: false,
      error: "Forbidden",
    };
  }

  return {
    success: true,
    supabase,
    userId,
    isOwnerOverride: false,
  };
}

export async function getFormSecuritySensitivity(formId: string): Promise<{
  success: boolean;
  level?: SensitivityLevel;
  error?: string;
}> {
  const ownedForm = await assertOwnedForm(formId);

  if (!ownedForm.success) {
    return {
      success: false,
      error: ownedForm.error,
    };
  }

  const { supabase } = ownedForm;

  const { data, error } = await supabase
    .from("request_forms")
    .select("security_sensitivity")
    .eq("id", formId)
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    level: normalizeSensitivity(data?.security_sensitivity),
  };
}

export async function updateFormSecuritySensitivity(
  formId: string,
  level: SensitivityLevel,
): Promise<{
  success: boolean;
  error?: string;
}> {
  const ownedForm = await assertOwnedForm(formId);

  if (!ownedForm.success) {
    return {
      success: false,
      error: ownedForm.error,
    };
  }

  const normalizedLevel = normalizeSensitivity(level);

  const { error } = await ownedForm.supabase
    .from("request_forms")
    .update({
      security_sensitivity: normalizedLevel,
    })
    .eq("id", formId);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

/**
 * Validate form submission for security issues
 * Returns: { isValid, isFlagged, reason, details }
 */

const MAX_BLOCKLIST_PATTERN_LENGTH = 300;

function validateBlocklistPattern(
  pattern: string,
  isRegex: boolean,
): string | null {
  const value = pattern.trim();

  if (!value) {
    return "Pattern cannot be empty";
  }

  if (value.length > MAX_BLOCKLIST_PATTERN_LENGTH) {
    return `Pattern must be ${MAX_BLOCKLIST_PATTERN_LENGTH} characters or fewer`;
  }

  if (isRegex) {
    try {
      new RegExp(value, "i");
    } catch {
      return "Invalid regular expression";
    }
  }

  return null;
}

export async function validateFormSubmission(
  formId: string,
  responses: Record<string, any>,
  clientIp?: string,
): Promise<{
  isValid: boolean;
  isFlagged: boolean;
  riskLevel: "safe" | "warning" | "dangerous";
  reason?: string;
  flaggedFields?: Record<string, ContentFilterResult>;
}> {
  // Check rate limiting
  const ip = clientIp || "unknown";
  const rateCheck = checkRateLimit(ip);

  if (!rateCheck.allowed) {
    return {
      isValid: false,
      isFlagged: true,
      riskLevel: "warning",
      reason:
        "Rate limit exceeded. Please wait a moment before submitting again.",
    };
  }

  let sensitivity: SensitivityLevel = "medium";

  try {
    const supabaseClient = await createClient();

    const { data, error } = await supabaseClient.rpc(
      "get_submission_security_settings",
      {
        p_form_id: formId,
      },
    );

    const row = Array.isArray(data) ? data[0] : data;

    if (error) {
      console.warn("Failed to load form sensitivity, using medium:", error);
    } else {
      sensitivity = normalizeSensitivity(row?.security_sensitivity);
    }
  } catch (error) {
    console.warn("Failed to load form sensitivity, using medium:", error);
  }

  // Load global and custom blocklists through a SECURITY DEFINER RPC so
  // public submissions can be validated without opening table access.
  try {
    const supabaseClient = await createClient();

    const { data: blocklistRows, error: blocklistError } =
      await supabaseClient.rpc("get_submission_blocklists", {
        p_form_id: formId,
      });

    const allPatterns: Array<any> = [];

    if (!blocklistError && Array.isArray(blocklistRows)) {
      allPatterns.push(...blocklistRows);
    }

    if (allPatterns.length > 0) {
      const flaggedFields: Record<string, ContentFilterResult> = {};

      // Helper to escape regex when pattern is plain text
      const escapeRegex = (s: string) =>
        s.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");

      for (const [fieldName, value] of Object.entries(responses)) {
        const valuesToCheck: string[] = [];

        if (typeof value === "string") {
          valuesToCheck.push(value);
        } else if (Array.isArray(value)) {
          valuesToCheck.push(...value.filter((v) => typeof v === "string"));
        }

        for (const strValue of valuesToCheck) {
          for (const p of allPatterns) {
            let matched = false;

            if (p.is_regex) {
              try {
                const re = new RegExp(p.pattern, "i");
                if (re.test(strValue)) matched = true;
              } catch (e) {
                // invalid regex in DB - skip
              }
            } else {
              const re = new RegExp(`\\b${escapeRegex(p.pattern)}\\b`, "i");
              if (re.test(strValue)) matched = true;
            }

            if (matched) {
              const severity = (p.severity || "warning") as
                | "warning"
                | "dangerous";

              // If any matched pattern is marked dangerous, escalate immediately
              if (severity === "dangerous") {
                const detail: Record<string, ContentFilterResult> = {};
                detail[fieldName] = {
                  isSafe: false,
                  riskLevel: "dangerous",
                  flags: [
                    p.is_regex ? "blocklist_regex_match" : "blocklist_match",
                  ],
                  reason: `Matched blocklist pattern (dangerous): ${p.pattern}`,
                } as ContentFilterResult;

                return {
                  isValid: false,
                  isFlagged: true,
                  riskLevel: "dangerous",
                  reason: "Submission matched a dangerous blocklist pattern",
                  flaggedFields: detail,
                };
              }

              // Otherwise record as warning
              flaggedFields[fieldName] = {
                isSafe: false,
                riskLevel: "warning",
                flags: [
                  p.is_regex ? "blocklist_regex_match" : "blocklist_match",
                ],
                reason: `Matched blocklist pattern: ${p.pattern}`,
              } as ContentFilterResult;

              break;
            }
          }
        }
      }

      if (Object.keys(flaggedFields).length > 0) {
        return {
          isValid: true,
          isFlagged: true,
          riskLevel: "warning",
          reason: "Submission matched blocklist patterns",
          flaggedFields: flaggedFields,
        };
      }
    }
  } catch (e) {
    // Non-fatal: if blocklist check fails, continue with standard filtering
    console.warn("Blocklist check failed:", e);
  }

  // Filter form responses
  const filterResult = filterFormResponses(responses, sensitivity);

  if (filterResult.overallRisk === "dangerous") {
    return {
      isValid: false,
      isFlagged: true,
      riskLevel: "dangerous",
      reason: "Submission contains content that violates our safety policy.",
      flaggedFields: filterResult.flaggedFields,
    };
  }

  // Warning level - still accept but flag for review
  if (filterResult.overallRisk === "warning") {
    return {
      isValid: true,
      isFlagged: true,
      riskLevel: "warning",
      reason: "Submission flagged for review due to suspicious content.",
      flaggedFields: filterResult.flaggedFields,
    };
  }

  return {
    isValid: true,
    isFlagged: false,
    riskLevel: "safe",
  };
}

/**
 * Submit a public form request from the server so we can capture the real IP.
 */
export async function submitPublicFormRequest(
  formId: string,
  formTitle: string,
  formOwnerId: string,
  responses: Record<string, string | string[]>,
  responseLabels: Record<string, string>,
  submitterName?: string | null,
): Promise<{
  success: boolean;
  requestId?: string;
  isFlagged?: boolean;
  riskLevel?: "safe" | "warning" | "dangerous";
  reason?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);

  /*
   * Never trust form structure, ownership,
   * labels or visibility sent by the browser.
   *
   * Load the canonical form first.
   */
  const { data: canonicalForm, error: formError } = await supabase
    .from("request_forms")
    .select(
      `
        id,
        user_id,
        title,
        sections,
        is_active
      `,
    )
    .eq("id", formId)
    .is("deleted_at", null)
    .maybeSingle();

  if (formError || !canonicalForm) {
    return {
      success: false,
      error: "Form not found",
    };
  }

  if (canonicalForm.is_active === false) {
    return {
      success: false,
      error: "This form is not accepting submissions.",
    };
  }

  const sections = Array.isArray(canonicalForm.sections)
    ? (canonicalForm.sections as FormSection[])
    : [];

  /*
   * Remove unknown fields and values belonging
   * to fields that are currently hidden by
   * conditional logic.
   */
  const { responses: sanitizedResponses, labels: sanitizedLabels } =
    sanitizeVisibleResponses(sections, responses);

  /*
   * Validate the canonical form rules server-side.
   * Client validation is only UX and cannot be trusted.
   */
  const validationErrors = validateFormValues(sections, sanitizedResponses);

  const firstValidationError = Object.values(validationErrors)[0];

  if (firstValidationError) {
    return {
      success: false,
      isFlagged: false,
      riskLevel: "safe",
      error: firstValidationError,
    };
  }

  // Check if IP is blocked BEFORE processing submission.
  if (clientIp) {
    try {
      const { data: blockedIp } = await supabase.rpc("is_ip_blocked_for_form", {
        p_form_id: formId,
        p_ip_address: clientIp,
      });

      if (blockedIp) {
        return {
          success: false,
          isFlagged: true,
          riskLevel: "dangerous",
          reason: "Your IP has been blocked from submitting to this form.",
          error: "Your IP has been blocked from submitting to this form.",
        };
      }
    } catch {
      // Non-fatal: continue with other validation.
    }
  }

  /*
   * Moderation should only inspect responses
   * that are actually allowed to be submitted.
   */
  const securityCheck = await validateFormSubmission(
    formId,
    sanitizedResponses,
    clientIp,
  );

  if (!securityCheck.isValid) {
    return {
      success: false,
      isFlagged: securityCheck.isFlagged,
      riskLevel: securityCheck.riskLevel,
      reason: securityCheck.reason,
      error: securityCheck.reason || "Your submission could not be accepted.",
    };
  }

  /*
   * Determine submitter name from the canonical
   * labels, not browser-provided label metadata.
   */
  const submitterNameFieldId = Object.keys(sanitizedLabels).find((fieldId) => {
    const label = stripMarkdownToText(sanitizedLabels[fieldId] || "")
      .toLowerCase()
      .trim();

    return label === "name" || label === "submitter name";
  });

  const canonicalSubmitterName =
    submitterNameFieldId &&
    typeof sanitizedResponses[submitterNameFieldId] === "string"
      ? (sanitizedResponses[submitterNameFieldId] as string)
      : null;

  const requestId = crypto.randomUUID();

  const payload = {
    id: requestId,
    form_id: formId,

    // Canonical DB values.
    user_id: canonicalForm.user_id,

    form_title: canonicalForm.title,

    responses: sanitizedResponses,

    response_labels: sanitizedLabels,

    submitter_name: canonicalSubmitterName,

    ip_address: clientIp,
  };

  const { error } = await supabase.from("requests").insert(payload);

  if (error) {
    console.error("Failed to save request:", error);

    return {
      success: false,
      error: error.message,
      isFlagged: securityCheck.isFlagged,
      riskLevel: securityCheck.riskLevel,
      reason: securityCheck.reason,
    };
  }

  if (securityCheck.isFlagged) {
    const flagResult = await recordFlaggedRequest(
      formId,
      requestId,
      securityCheck.riskLevel as "warning" | "dangerous",
      securityCheck.flaggedFields || {},
      securityCheck.reason,
    );

    if (!flagResult.success) {
      console.warn("Failed to record flagged request:", flagResult.error);
    }
  }

  return {
    success: true,
    requestId,
    isFlagged: securityCheck.isFlagged,
    riskLevel: securityCheck.riskLevel,
    reason: securityCheck.reason,
  };
}

/**
 * Record a flagged submission for later review
 */
export async function recordFlaggedRequest(
  formId: string,
  requestId: string,
  riskLevel: "warning" | "dangerous",
  flaggedFields: Record<string, ContentFilterResult>,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("record_flagged_submission", {
    p_form_id: formId,
    p_request_id: requestId,
    p_risk_level: riskLevel,
    p_flagged_fields: flaggedFields,
    p_reason: reason || null,
  });

  if (error) {
    console.error("Failed to record flagged request:", error);

    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

/**
 * Get flagged requests for a form (for the form creator)
 */
export async function getFlaggedRequestsForForm(
  formId: string,
  limit: number = 50,
): Promise<{
  success: boolean;
  flaggedRequests?: any[];
  error?: string;
}> {
  const ownedForm = await assertOwnedForm(formId);

  if (!ownedForm.success) {
    return { success: false, error: ownedForm.error };
  }

  const { supabase: supabaseClient } = ownedForm;

  /*
   * Requests are soft-deleted, so the flagged_requests row is intentionally
   * preserved for moderation history and possible restore.
   *
   * The live creator moderation queue must only include flags whose parent
   * request is still active.
   */
  const { data, error } = await supabaseClient
    .from("flagged_requests")
    .select(
      `
      *,
      request:requests!inner(
        response_labels,
        responses,
        submitter_name,
        ip_address,
        deleted_at
      )
      `,
    )
    .eq("form_id", formId)
    .eq("reviewed", false)
    .is("request.deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch flagged requests:", error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    flaggedRequests: data || [],
  };
}

/**
 * Mark a flagged request as reviewed
 */
export async function markFlaggedAsReviewed(
  flaggedRequestId: string,
  action: "approved" | "rejected",
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: flaggedRequest, error: lookupError } = await supabase
    .from("flagged_requests")
    .select("form_id")
    .eq("id", flaggedRequestId)
    .maybeSingle();

  if (lookupError) {
    console.error("Failed to load flagged request:", lookupError);
    return { success: false, error: lookupError.message };
  }

  if (!flaggedRequest?.form_id) {
    return { success: false, error: "Forbidden" };
  }

  const ownedForm = await assertOwnedForm(flaggedRequest.form_id);

  if (!ownedForm.success) {
    return { success: false, error: ownedForm.error };
  }

  const { supabase: supabaseClient } = ownedForm;

  const { error } = await supabaseClient
    .from("flagged_requests")
    .update({
      reviewed: true,
      review_action: action,
      review_notes: notes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", flaggedRequestId);

  if (error) {
    console.error("Failed to update flagged request:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Block an IP address (for severe violations)
 */
export async function blockIpAddress(
  formId: string,
  ipAddress: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const ownedForm = await assertOwnedForm(formId);

  if (!ownedForm.success) {
    return { success: false, error: ownedForm.error };
  }

  const { supabase: supabaseClient } = ownedForm;

  const payload = {
    form_id: formId,
    ip_address: ipAddress,
    reason,
    blocked_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient.from("blocked_ips").insert(payload);

  if (error) {
    console.error("Failed to block IP:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check if an IP is blocked for a specific form
 */
export async function isIpBlocked(
  formId: string,
  ipAddress: string,
): Promise<boolean> {
  const ownedForm = await assertOwnedForm(formId);

  if (!ownedForm.success) {
    return false;
  }
  const { supabase: supabaseClient } = ownedForm as any;

  const { data, error } = await supabaseClient
    .from("blocked_ips")
    .select("id")
    .eq("form_id", formId)
    .eq("ip_address", ipAddress)
    .single();

  return !!data && !error;
}

/**
 * Add a word to the form's custom blocklist
 */
export async function addToCustomBlocklist(
  formId: string,
  pattern: string,
  isRegex: boolean = false,
): Promise<{ success: boolean; error?: string }> {
  const ownedForm = await assertOwnedForm(formId);

  if (!ownedForm.success) {
    return { success: false, error: ownedForm.error };
  }

  const normalizedPattern = pattern.trim();

  const validationError = validateBlocklistPattern(normalizedPattern, isRegex);

  if (validationError) {
    return {
      success: false,
      error: validationError,
    };
  }

  const { supabase: supabaseClient } = ownedForm;

  const payload = {
    form_id: formId,
    pattern: normalizedPattern,
    is_regex: isRegex,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient.rpc("add_custom_blocklist", {
    p_form_id: payload.form_id,
    p_pattern: normalizedPattern,
    p_is_regex: payload.is_regex,
  });

  if (error) {
    console.error("Failed to add to blocklist:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get custom blocklist for a form
 */
export async function getCustomBlocklist(formId: string): Promise<{
  success: boolean;
  patterns?: any[];
  error?: string;
}> {
  const ownedForm = await assertOwnedForm(formId);

  if (!ownedForm.success) {
    return { success: false, error: ownedForm.error };
  }
  const { supabase: supabaseClient } = ownedForm;

  const { data, error } = await supabaseClient
    .from("custom_blocklists")
    .select("id, pattern, is_regex, created_at")
    .eq("form_id", formId);

  if (error) {
    console.error("Failed to fetch blocklist:", error);
    return { success: false, error: error.message };
  }

  return { success: true, patterns: data || [] };
}

/**
 * Remove a pattern from custom blocklist
 */
export async function removeFromCustomBlocklist(
  formId: string,
  pattern: string,
): Promise<{ success: boolean; error?: string }> {
  const ownedForm = await assertOwnedForm(formId);

  if (!ownedForm.success) {
    return { success: false, error: ownedForm.error };
  }
  const { supabase: supabaseClient } = ownedForm;

  const { error } = await supabaseClient
    .from("custom_blocklists")
    .delete()
    .eq("form_id", formId)
    .eq("pattern", pattern);

  if (error) {
    console.error("Failed to remove from blocklist:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Add a pattern to the global blocklist (site-wide)
 */
export async function addToGlobalBlocklist(
  pattern: string,
  isRegex: boolean = false,
  severity: "warning" | "dangerous" = "warning",
): Promise<{
  success: boolean;
  error?: string;
}> {
  const ownerAccess = await assertOwner();

  if (!ownerAccess.success) {
    return {
      success: false,
      error: ownerAccess.error,
    };
  }

  const { supabase } = ownerAccess;

  const normalizedPattern = pattern.trim();

  const validationError = validateBlocklistPattern(normalizedPattern, isRegex);

  if (validationError) {
    return {
      success: false,
      error: validationError,
    };
  }

  const payload = {
    pattern: normalizedPattern,
    is_regex: isRegex,
    severity,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("global_blocklists").insert(payload);

  if (error) {
    console.error("Failed to add to global blocklist:", error);

    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
  };
}

export async function getGlobalBlocklist(): Promise<{
  success: boolean;
  patterns?: any[];
  error?: string;
}> {
  const ownerAccess = await assertOwner();

  if (!ownerAccess.success) {
    return {
      success: false,
      error: ownerAccess.error,
    };
  }

  const { supabase } = ownerAccess;

  const { data, error } = await supabase
    .from("global_blocklists")
    .select(
      `
      id,
      pattern,
      is_regex,
      severity,
      created_at
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Failed to fetch global blocklist:", error);

    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    patterns: data || [],
  };
}

export async function removeFromGlobalBlocklist(pattern: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const ownerAccess = await assertOwner();

  if (!ownerAccess.success) {
    return {
      success: false,
      error: ownerAccess.error,
    };
  }

  const { supabase } = ownerAccess;

  const normalizedPattern = pattern.trim();

  if (!normalizedPattern) {
    return {
      success: false,
      error: "Pattern is required",
    };
  }

  const { error } = await supabase
    .from("global_blocklists")
    .delete()
    .eq("pattern", normalizedPattern);

  if (error) {
    console.error("Failed to remove from global blocklist:", error);

    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
  };
}
