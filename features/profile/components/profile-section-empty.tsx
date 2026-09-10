// ============================================================================
// Forgeworks - Shared profile section empty state
// Consistent dashed empty card used by own and public profile sections
// ============================================================================

"use client";

import type { ReactNode } from "react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function ProfileSectionEmpty({
  icon,
  iconColor,
  title,
  description,
  className,
}: {
  icon: ReactNode;
  iconColor: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <Empty
      className={
        className || "rounded-lg border border-dashed bg-card/40 px-5 py-7"
      }
    >
      <EmptyContent>
        <EmptyMedia variant="icon">
          <span style={{ color: iconColor }}>{icon}</span>
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyContent>
    </Empty>
  );
}
