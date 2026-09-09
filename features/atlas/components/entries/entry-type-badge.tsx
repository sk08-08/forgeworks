import {
  BookOpenText,
  Box,
  Building2,
  CalendarRange,
  Flag,
  Globe2,
  Lightbulb,
  MapPin,
  Network,
  NotebookText,
  PawPrint,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AtlasEntryKind } from "@/features/atlas/types/atlas-types";

export const ATLAS_ENTRY_TYPE_LABELS: Record<AtlasEntryKind, string> = {
  character: "Character",
  location: "Location",
  faction: "Faction",
  organization: "Organization",
  event: "Event",
  object: "Object",
  species: "Species",
  concept: "Concept",
  lore: "Lore",
  note: "Note",
  custom: "Custom",
};

export const ATLAS_ENTRY_TYPE_ICONS = {
  character: UsersRound,
  location: MapPin,
  faction: Flag,
  organization: Building2,
  event: CalendarRange,
  object: Box,
  species: PawPrint,
  concept: Lightbulb,
  lore: BookOpenText,
  note: NotebookText,
  custom: Network,
} satisfies Record<AtlasEntryKind, typeof Globe2>;

export function EntryTypeBadge({ kind }: { kind: AtlasEntryKind }) {
  const Icon = ATLAS_ENTRY_TYPE_ICONS[kind];
  return (
    <Badge variant="secondary" className="gap-1.5 font-medium">
      <Icon className="h-3.5 w-3.5" />
      {ATLAS_ENTRY_TYPE_LABELS[kind]}
    </Badge>
  );
}
