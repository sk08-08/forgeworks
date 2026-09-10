// ============================================================================
// Forgeworks - Sensitivity Level Settings
// Adjust detection strictness for form submissions
// ============================================================================

"use client";

import React, { useState, useEffect } from "react";
import { Info } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  getFormSecuritySensitivity,
  updateFormSecuritySensitivity,
} from "@/features/moderation/actions/safety";
import { stripMarkdownToText } from "@/features/markdown/lib/markdown";
import type { SensitivityLevel } from "@/features/moderation/lib/content-filter";

interface SensitivitySettings {
  formId: string;
  formTitle?: string;
  currentLevel?: SensitivityLevel;
  onLevelChange?: (level: SensitivityLevel) => void;
}

const SENSITIVITY_CONFIGS: Record<
  SensitivityLevel,
  {
    label: string;
    description: string;
    what_detects: string[];
    what_ignores: string[];
  }
> = {
  low: {
    label: "Low - Critical Only",
    description: "Only reacts to the highest-risk automatic safety signals.",
    what_detects: [
      "Direct self-harm or suicide-related danger",
      "Severe threats",
      "Severe hate-speech matches",
      "Known malicious URL signals",
    ],
    what_ignores: [
      "Harassment heuristics",
      "Spam keywords",
      "Repeated characters",
      "Suspicious domain extensions",
      "All-caps aggression",
      "Excessive punctuation",
    ],
  },

  medium: {
    label: "Medium - Balanced (Default)",
    description:
      "Adds harassment and stronger spam detection while avoiding noisier heuristics.",
    what_detects: [
      "All critical detections",
      "Direct harassment",
      "Spam keyword patterns",
    ],
    what_ignores: [
      "Repeated-character heuristics",
      "Suspicious domain extensions",
      "All-caps aggression",
      "Excessive punctuation",
    ],
  },

  high: {
    label: "High - Enhanced Detection",
    description: "Uses all currently available automatic content heuristics.",
    what_detects: [
      "All medium detections",
      "Repeated-character spam",
      "Suspicious URL domain signals",
      "All-caps aggression",
      "Excessive punctuation",
    ],
    what_ignores: [
      "Whitelisted common internet slang when only minor heuristics match",
    ],
  },

  strict: {
    label: "Strict - Maximum Current Detection",
    description:
      "Uses all currently available automatic content heuristics with the same core detector set as High.",
    what_detects: [
      "All high detections",
      "Custom blocklist rules remain fully enforced",
      "Global blocklist rules remain fully enforced",
    ],
    what_ignores: [
      "Only explicitly whitelisted harmless slang in minor-flag cases",
    ],
  },
};

export function SensitivityLevelSettings({
  formId,
  formTitle,
  currentLevel = "medium",
  onLevelChange,
}: SensitivitySettings) {
  const [level, setLevel] = useState<SensitivityLevel>(currentLevel);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLevel = async () => {
      setLoading(true);

      try {
        const result = await getFormSecuritySensitivity(formId);

        if (result.success && result.level) {
          setLevel(result.level);
        } else if (!result.success) {
          console.warn("Failed to load sensitivity:", result.error);
        }
      } catch (error) {
        console.error("Error loading sensitivity:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLevel();
  }, [formId]);

  const config = SENSITIVITY_CONFIGS[level];

  const handleLevelChange = async (newLevel: SensitivityLevel) => {
    const previousLevel = level;

    setLevel(newLevel);
    setSaving(true);

    try {
      const result = await updateFormSecuritySensitivity(formId, newLevel);

      if (!result.success) {
        setLevel(previousLevel);

        toast.error(result.error || "Failed to update sensitivity level");

        return;
      }

      toast.success("Sensitivity level updated");

      onLevelChange?.(newLevel);
    } catch (error) {
      console.error("Error updating sensitivity:", error);

      setLevel(previousLevel);

      toast.error("Failed to update sensitivity level");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-base">Security Sensitivity</CardTitle>
              <CardDescription>
                Adjust how strict content detection is for{" "}
                {stripMarkdownToText(formTitle) || "this form"}
              </CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-sm">
                  Lower sensitivity = fewer false positives but may miss some
                  issues. Higher sensitivity = more protection but more manual
                  reviews needed.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <Select
              value={level}
              onValueChange={(value) =>
                handleLevelChange(value as SensitivityLevel)
              }
              disabled={saving || loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SENSITIVITY_CONFIGS).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {loading ? "Loading sensitivity level..." : config.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs font-semibold text-green-900 dark:text-green-200 mb-1">
                ✓ Will Detect
              </p>
              <ul className="text-xs space-y-1 text-green-800 dark:text-green-300">
                {config.what_detects.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">
                ✗ Will Ignore
              </p>
              {config.what_ignores.length === 0 ? (
                <p className="text-xs text-blue-800 dark:text-blue-300 italic">
                  Nothing will be ignored at this level
                </p>
              ) : (
                <ul className="text-xs space-y-1 text-blue-800 dark:text-blue-300">
                  {config.what_ignores.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
