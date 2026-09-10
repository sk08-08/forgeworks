// ============================================================================
// Forgeworks - Token Counter Component
// Real-time token counting and variable validation display
// ============================================================================

"use client";

import { useMemo } from "react";
import {
  AlertCircle,
  CheckCircle,
  Hash,
  Bot as BotIcon,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { validateVariables, countTokens } from "@/features/bots/lib/bot-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ----------------------------------------------------------------------------
// Token Counter Props
// ----------------------------------------------------------------------------

interface TokenCounterProps {
  text: string | string[];
  fieldName?: string;
  showVariables?: boolean;
  className?: string;
}

// ----------------------------------------------------------------------------
// Token Counter Component
// ----------------------------------------------------------------------------

export function TokenCounter({
  text,
  fieldName,
  showVariables = true,
  className,
}: TokenCounterProps) {
  const combinedText = useMemo(
    () => (Array.isArray(text) ? text.filter(Boolean).join("\n\n") : text),
    [text],
  );
  const validation = useMemo(
    () => validateVariables(combinedText),
    [combinedText],
  );
  const tokenCount = useMemo(() => countTokens(combinedText), [combinedText]);

  // Determine token count color based on thresholds
  const getTokenColor = () => {
    if (tokenCount > 4000) return "text-destructive";
    if (tokenCount > 2000) return "text-warning";
    return "text-success";
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-xs", className)}>
      {/* Token count */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1.5", getTokenColor())}>
            <Hash className="h-3.5 w-3.5" />
            <span className="font-medium">
              {tokenCount.toLocaleString()} tokens
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Token count for {fieldName || "this field"}</p>
          <p className="text-xs text-muted-foreground">
            {tokenCount > 4000 && "High token count may affect performance"}
            {tokenCount <= 4000 && tokenCount > 2000 && "Moderate token count"}
            {tokenCount <= 2000 && "Good token count"}
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Variable counts */}
      {showVariables && (
        <>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BotIcon className="h-3.5 w-3.5" />
            <span>
              {"{{char}}"}: {validation.charVariableCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <UserRound className="h-3.5 w-3.5" />
            <span>
              {"{{user}}"}: {validation.userVariableCount}
            </span>
          </div>
        </>
      )}

      {/* Validation status */}
      {validation.isValid ? (
        <div className="flex items-center gap-1 text-success">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>Valid</span>
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Issues found</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              {validation.warnings.map((warning, i) => (
                <p key={i} className="text-xs">
                  {warning}
                </p>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Total Token Summary Component
// ----------------------------------------------------------------------------

interface TokenSummaryProps {
  personality: string;
  initialMessages: string[];
  scenario: string;
  exampleDialogues: string;
  initialMessageIndex?: number;
}

export function TokenSummary({
  personality,
  initialMessages,
  scenario,
  exampleDialogues,
  initialMessageIndex = 0,
}: TokenSummaryProps) {
  const totals = useMemo(() => {
    const activeInitialMessage =
      initialMessages.length > 0 && initialMessages[initialMessageIndex]
        ? initialMessages[initialMessageIndex]
        : "";
    const fields = [
      { name: "Personality", text: personality },
      {
        name:
          initialMessages.length > 1
            ? `Message ${initialMessageIndex + 1}`
            : "First Message",
        text: activeInitialMessage,
      },
      { name: "Scenario", text: scenario },
      { name: "Example Dialogues", text: exampleDialogues },
    ];

    const fieldCounts = fields.map((f) => ({
      name: f.name,
      tokens: countTokens(f.text),
    }));

    const total = fieldCounts.reduce((sum, f) => sum + f.tokens, 0);

    // Validate all text combined
    const allText = fields.map((f) => f.text).join("\n");
    const validation = validateVariables(allText);

    return { fieldCounts, total, validation };
  }, [
    personality,
    initialMessages,
    initialMessageIndex,
    scenario,
    exampleDialogues,
  ]);

  const getTotalColor = () => {
    if (totals.total > 8000) return "border-destructive bg-destructive/10";
    if (totals.total > 4000) return "border-warning bg-warning/10";
    return "border-success bg-success/10";
  };

  return (
    <Card className={cn("transition-colors", getTotalColor())}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Total Token Count</h3>
            <p className="mt-1 text-2xl font-bold">
              {totals.total.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            {totals.validation.isValid ? (
              <Badge variant="outline" className="border-success text-success">
                <CheckCircle className="mr-1 h-3 w-3" />
                All Variables Valid
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-destructive text-destructive"
              >
                <AlertCircle className="mr-1 h-3 w-3" />
                {totals.validation.invalidVariables.length} Invalid Variable(s)
              </Badge>
            )}
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {totals.fieldCounts.map((field) => (
            <div
              key={field.name}
              className="flex items-center justify-between rounded bg-background/50 px-2 py-1"
            >
              <span className="text-muted-foreground">{field.name}</span>
              <span className="font-medium">
                {field.tokens.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {totals.validation.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {totals.validation.warnings.map((warning, i) => (
              <p
                key={i}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <AlertCircle className="h-3 w-3 text-warning" />
                {warning}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
