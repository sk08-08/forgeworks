// ============================================================================
// Forgeworks - Bot Manager View
// Full CRUD interface for managing bots
// ============================================================================

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  Grid3X3,
  List,
  Bot as BotIcon,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Clock,
  GitFork,
  Zap,
  AlertTriangle,
  UsersRound,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BotForm } from "./bot-form";
import { useStore } from "@/features/app-shell/store/app-store";
import { createClient } from "@/lib/supabase/client";
import {
  createBotAction,
  updateBotAction,
  deleteBotAction,
} from "@/features/bots/actions/bots";
import { cn, formatDateTime } from "@/lib/utils";
import { normalizeResourceVisibility } from "@/lib/resource-visibility";
import {
  countBotTokens,
  exportCharacterCardPNG,
} from "@/features/bots/lib/bot-utils";
import { toast } from "sonner";
import type { Bot, BotFormData } from "@/features/bots/types/bot-types";
import { FilteredSearchInput } from "@/components/ui/filtered-search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { searchBots } from "@/features/bots/actions/search";
import { PendingInvites } from "./collaboration/pending-invites";
import { forkBot } from "@/features/bots/actions/bot-forks";
import { BotTagBadge, BotTagCountBadge } from "./bot-tag-badge";
import type { CollaborativeBot } from "@/features/bots/types/bot-types";
import { roleConfig } from "@/features/bots/types/bot-types";

// ----------------------------------------------------------------------------
// View Modes
// ----------------------------------------------------------------------------

type ViewMode = "grid" | "list";
type FilterRating = "all" | "SFW" | "NSFW";

type DateRangePreset = "any" | "today" | "last7" | "last30" | "month" | "year";

interface AdvancedBotFilters {
  createdRange: DateRangePreset;
  updatedRange: DateRangePreset;
  selectedTag: string;
}

function getDateRangeBounds(preset: DateRangePreset) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  switch (preset) {
    case "today":
      return { from: startOfToday, to: endOfToday };
    case "last7": {
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { from, to: endOfToday };
    }
    case "last30": {
      const from = new Date(now);
      from.setDate(now.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      return { from, to: endOfToday };
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      return { from, to };
    }
    case "year": {
      const from = new Date(now.getFullYear(), 0, 1);
      const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { from, to };
    }
    default:
      return null;
  }
}

function matchesAdvancedFilters(
  bot: Pick<Bot, "tags"> & {
    createdAt?: Date | string;
    updatedAt?: Date | string;
    created_at?: string;
    updated_at?: string;
  },
  filters: AdvancedBotFilters,
) {
  const createdAt = bot.createdAt
    ? new Date(bot.createdAt)
    : bot.created_at
      ? new Date(bot.created_at)
      : null;
  const updatedAt = bot.updatedAt
    ? new Date(bot.updatedAt)
    : bot.updated_at
      ? new Date(bot.updated_at)
      : null;

  const createdBounds = getDateRangeBounds(filters.createdRange);
  const updatedBounds = getDateRangeBounds(filters.updatedRange);

  if (createdBounds && createdAt) {
    if (createdAt < createdBounds.from) return false;
    if (createdAt > createdBounds.to) return false;
  }

  if (updatedBounds && updatedAt) {
    if (updatedAt < updatedBounds.from) return false;
    if (updatedAt > updatedBounds.to) return false;
  }

  if (filters.selectedTag !== "all") {
    const normalizedBotTags = (bot.tags || []).map((tag) => tag.toLowerCase());
    const requiredTag = filters.selectedTag.toLowerCase();
    if (!normalizedBotTags.includes(requiredTag)) return false;
  }

  return true;
}

// ----------------------------------------------------------------------------
// Bot Card Component
// ----------------------------------------------------------------------------

interface BotCardProps {
  bot: Bot;
  viewMode: ViewMode;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
  onWorkspace: () => void;
  onFork: () => void;
}

interface CollaborativeBotCardProps {
  bot: CollaborativeBot;
  viewMode: ViewMode;
  onWorkspace: () => void;
  onExport?: () => void;
}

function CollaborativeBotCard({
  bot,
  viewMode,
  onWorkspace,
  onExport,
}: CollaborativeBotCardProps) {
  const roleConf = roleConfig[bot.collaborator_role];
  const canEdit =
    bot.collaborator_role === "editor" || bot.collaborator_role === "co_owner";
  const canManage = bot.collaborator_role === "co_owner";

  if (viewMode === "list") {
    return (
      <Card className="min-w-0 border-l-2 border-l-primary/40 transition-all hover:border-primary/30">
        <CardContent className="flex min-w-0 flex-col items-stretch gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
            {bot.image_url ? (
              <img
                src={bot.image_url}
                alt={bot.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <BotIcon className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="min-w-0 flex-1 break-words font-semibold sm:truncate">
                {bot.name}
              </h3>
              <Badge
                variant="outline"
                className={cn("text-[10px] shrink-0", roleConf.className)}
              >
                {roleConf.label}
              </Badge>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                Shared
              </Badge>
            </div>
            <p className="mt-0.5 line-clamp-2 break-words text-sm text-muted-foreground sm:line-clamp-1">
              {bot.short_description || "No description"}
            </p>
            {bot.owner_display_name && (
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                by {bot.owner_display_name || bot.owner_username}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto shrink-0 cursor-pointer"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onExport && (
                <DropdownMenuItem onClick={onExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Card V2
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onWorkspace}>
                <Zap className="mr-2 h-4 w-4" />
                Open Workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>
    );
  }

  // Grid view for collaborative bot
  return (
    <Card className="group h-full min-w-0 border-l-2 border-l-primary/40 transition-all duration-200 hover:-translate-y-px hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="relative aspect-4/5 w-full overflow-hidden bg-muted">
        {bot.image_url ? (
          <img
            src={bot.image_url}
            alt={bot.name}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/10 via-primary/5 to-transparent">
            <BotIcon className="h-14 w-14 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-background/90 via-background/40 to-transparent" />
        <Badge
          variant="outline"
          className={cn(
            "absolute top-2.5 right-2.5 backdrop-blur-sm",
            roleConf.className,
          )}
        >
          {roleConf.label}
        </Badge>
        <Badge
          variant="secondary"
          className="absolute top-2.5 left-2.5 backdrop-blur-sm text-[10px]"
        >
          <UsersRound className="h-2.5 w-2.5 mr-0.5" />
          Shared
        </Badge>
      </div>
      <CardHeader className="min-w-0 pb-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 line-clamp-2 break-words text-lg font-bold leading-tight">
            {bot.name}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 cursor-pointer opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onExport && (
                <DropdownMenuItem onClick={onExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Card V2
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onWorkspace}>
                <Zap className="mr-2 h-4 w-4" />
                Open Workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="mt-1 line-clamp-2 break-words text-sm">
          {bot.short_description || "No description provided"}
        </CardDescription>
        {bot.owner_display_name && (
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            by {bot.owner_display_name || bot.owner_username}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {bot.tags.slice(0, 2).map((tag) => (
            <BotTagBadge key={tag} tag={tag} />
          ))}
          {bot.tags.length > 2 && (
            <BotTagCountBadge count={bot.tags.length - 2} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BotCard({
  bot,
  viewMode,
  onEdit,
  onDelete,
  onExport,
  onWorkspace,
  onFork,
}: BotCardProps) {
  const tokenCount = useMemo(() => countBotTokens(bot), [bot]);

  if (viewMode === "list") {
    return (
      <Card className="min-w-0 transition-all hover:border-primary/30">
        <CardContent className="flex min-w-0 flex-col items-stretch gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
          {/* Icon / Image */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
            {bot.imageUrl ? (
              <img
                src={bot.imageUrl}
                alt={bot.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <BotIcon className="h-6 w-6 text-primary" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="min-w-0 flex-1 break-words font-semibold sm:truncate">
                {bot.name}
              </h3>
              <Badge
                variant={bot.rating === "SFW" ? "secondary" : "destructive"}
                className="shrink-0"
              >
                {bot.rating}
              </Badge>
            </div>
            <p className="mt-0.5 line-clamp-2 break-words text-sm text-muted-foreground sm:line-clamp-1">
              {bot.shortDescription || "No description"}
            </p>
          </div>

          {/* Stats */}
          <div className="hidden min-w-0 items-center gap-4 text-sm text-muted-foreground md:flex xl:gap-6">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">
                {tokenCount.toLocaleString()}
              </span>
              <span>tokens</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <span>{formatDateTime(bot.updatedAt)}</span>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto shrink-0 cursor-pointer"
              >
                <MoreVertical className="h-4 w-4 text-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4 text-primary" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 h-4 w-4 text-primary" />
                Export Card V2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onWorkspace}>
                <Zap className="mr-2 h-4 w-4 text-primary" />
                Open Workspace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onFork}>
                <GitFork className="mr-2 h-4 w-4 text-primary" />
                Fork Bot
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card className="group h-full min-w-0 transition-all duration-200 hover:-translate-y-px hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      {/* Large cover image */}
      <div className="relative aspect-4/5 w-full overflow-hidden bg-muted">
        {bot.imageUrl ? (
          <img
            src={bot.imageUrl}
            alt={bot.name}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/10 via-primary/5 to-transparent">
            <BotIcon className="h-14 w-14 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-background/90 via-background/40 to-transparent" />
        <Badge
          variant={bot.rating === "SFW" ? "secondary" : "destructive"}
          className="absolute top-2.5 right-2.5 backdrop-blur-sm shadow-sm"
        >
          {bot.rating}
        </Badge>
      </div>
      <CardHeader className="min-w-0 pb-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 line-clamp-2 break-words text-lg font-bold leading-tight">
            {bot.name}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 cursor-pointer opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4 text-primary" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 h-4 w-4 text-primary" />
                Export Card V2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onWorkspace}>
                <Zap className="mr-2 h-4 w-4 text-primary" />
                Open Workspace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onFork}>
                <GitFork className="mr-2 h-4 w-4 text-primary" />
                Fork Bot
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive hover:text-white"
              >
                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="mt-1 line-clamp-2 break-words text-sm">
          {bot.shortDescription || "No description provided"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {bot.tags.slice(0, 2).map((tag) => (
            <BotTagBadge key={tag} tag={tag} />
          ))}
          {bot.tags.length > 2 && (
            <BotTagCountBadge count={bot.tags.length - 2} />
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="shrink-0">{tokenCount.toLocaleString()} tokens</span>
          <span className="flex min-w-0 items-center gap-1 sm:justify-end">
            <Clock className="h-3 w-3 text-primary" />
            {formatDateTime(bot.updatedAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Empty State
// ----------------------------------------------------------------------------

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-muted/60 sm:h-20 sm:w-20">
        <BotIcon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mt-6 text-xl font-semibold">No bots yet</h3>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Get started by creating your first bot or importing an existing
        character card.
      </p>
      <Button
        className="mt-6 w-full cursor-pointer rounded-xl sm:w-auto"
        onClick={onCreateNew}
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Your First Bot
      </Button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Bot Manager Component
// ----------------------------------------------------------------------------

export function BotManager() {
  const {
    bots,
    deleteBot,
    selectedBotId,
    setSelectedBotId,
    upsertBot,
    collaborativeBots,
  } = useStore();

  // UI State
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState<FilterRating>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterCreatedRange, setFilterCreatedRange] =
    useState<DateRangePreset>("any");
  const [filterUpdatedRange, setFilterUpdatedRange] =
    useState<DateRangePreset>("any");
  const [filterTag, setFilterTag] = useState("all");
  const [isCreating, setIsCreating] = useState(false);

  // Server-side search state
  const [searchResults, setSearchResults] = useState<Bot[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(0);
  const [managerPage, setManagerPage] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const PAGE_SIZE = 20;

  const hasAdvancedFilters = Boolean(
    filterCreatedRange !== "any" ||
    filterUpdatedRange !== "any" ||
    filterTag !== "all",
  );
  const hasServerSearch =
    searchQuery.trim().length > 0 || filterRating !== "all";
  const advancedFilters = useMemo<AdvancedBotFilters>(
    () => ({
      createdRange: filterCreatedRange,
      updatedRange: filterUpdatedRange,
      selectedTag: filterTag,
    }),
    [filterCreatedRange, filterUpdatedRange, filterTag],
  );

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    bots.forEach((bot) => bot.tags.forEach((tag) => tags.add(tag)));
    collaborativeBots.forEach((bot) =>
      bot.tags.forEach((tag) => tags.add(tag)),
    );
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [bots, collaborativeBots]);

  const filteredOwnedBots = useMemo(
    () => bots.filter((bot) => matchesAdvancedFilters(bot, advancedFilters)),
    [bots, advancedFilters],
  );

  const filteredCollaborativeBots = useMemo(
    () =>
      collaborativeBots.filter((bot) =>
        matchesAdvancedFilters(bot, advancedFilters),
      ),
    [collaborativeBots, advancedFilters],
  );

  const filteredSearchResults = useMemo(
    () =>
      searchResults.filter((bot) =>
        matchesAdvancedFilters(bot, advancedFilters),
      ),
    [searchResults, advancedFilters],
  );

  // Trigger server-side search when query or filter changes
  useEffect(() => {
    const isDefault = !hasServerSearch;
    if (isDefault) {
      setSearchResults([]);
      setSearchTotal(0);
      setSearchPage(0);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    searchBots(searchQuery, filterRating, PAGE_SIZE, 0).then((result) => {
      if (cancelled) return;
      if (result.success && result.bots) {
        const mapped: Bot[] = result.bots.map((r) => ({
          id: r.id,
          name: r.name,
          shortDescription: r.short_description,
          personality: r.personality,
          tags: r.tags,
          rating: r.rating as "SFW" | "NSFW",
          imageUrl: r.image_url || undefined,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at),
          firstMessage: "",
          scenario: "",
          exampleDialogues: "",
        }));
        setSearchResults(mapped);
        setSearchTotal(result.total || 0);
        setSearchPage(0);
      }
      setIsSearching(false);
    });

    return () => {
      cancelled = true;
    };
  }, [hasServerSearch, searchQuery, filterRating]);

  useEffect(() => {
    if (hasServerSearch || hasAdvancedFilters) {
      setManagerPage(0);
      return;
    }

    const maxPage = Math.max(
      0,
      Math.ceil(filteredOwnedBots.length / PAGE_SIZE) - 1,
    );
    if (managerPage > maxPage) {
      setManagerPage(maxPage);
    }
  }, [
    hasServerSearch,
    hasAdvancedFilters,
    filteredOwnedBots.length,
    managerPage,
  ]);

  const handlePageChange = useCallback(
    async (newPage: number) => {
      const offset = newPage * PAGE_SIZE;
      setIsSearching(true);
      const result = await searchBots(
        searchQuery,
        filterRating,
        PAGE_SIZE,
        offset,
      );
      if (result.success && result.bots) {
        const mapped: Bot[] = result.bots.map((r) => ({
          id: r.id,
          name: r.name,
          shortDescription: r.short_description,
          personality: r.personality,
          tags: r.tags,
          rating: r.rating as "SFW" | "NSFW",
          imageUrl: r.image_url || undefined,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at),
          firstMessage: "",
          scenario: "",
          exampleDialogues: "",
        }));
        setSearchResults(mapped);
        setSearchPage(newPage);
      }
      setIsSearching(false);
    },
    [searchQuery, filterRating],
  );

  // Determine which bots to display
  const isSearchActive = hasServerSearch || hasAdvancedFilters;
  const visibleOwnedBots = hasServerSearch
    ? filteredSearchResults
    : filteredOwnedBots;
  const paginatedOwnedBots = hasServerSearch
    ? visibleOwnedBots
    : visibleOwnedBots.slice(
        managerPage * PAGE_SIZE,
        (managerPage + 1) * PAGE_SIZE,
      );
  const ownedTotal = hasServerSearch
    ? hasAdvancedFilters
      ? visibleOwnedBots.length
      : searchTotal
    : filteredOwnedBots.length;
  const currentPage = hasServerSearch ? searchPage : managerPage;
  const totalPages = Math.max(1, Math.ceil(ownedTotal / PAGE_SIZE));
  const rangeStart = ownedTotal === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const rangeEnd = Math.min((currentPage + 1) * PAGE_SIZE, ownedTotal);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [deleteConfirmBot, setDeleteConfirmBot] = useState<Bot | null>(null);
  const [forking, setForking] = useState(false);

  const openBotEditor = useCallback(async (bot: Bot) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("bots")
        .select("visibility")
        .eq("id", bot.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;

      setEditingBot({
        ...bot,
        visibility: normalizeResourceVisibility(data?.visibility ?? bot.visibility),
      });
    } catch (error) {
      console.error("Failed to resolve bot visibility before editing:", error);
      toast.error("Could not open this bot for editing");
    }
  }, []);

  // Check if we should open editing from external navigation
  const externalEditBot = selectedBotId
    ? bots.find((b) => b.id === selectedBotId)
    : null;

  useEffect(() => {
    if (externalEditBot && !editingBot && !isCreating) {
      void openBotEditor(externalEditBot);
      setSelectedBotId(null);
    }
  }, [
    externalEditBot,
    editingBot,
    isCreating,
    openBotEditor,
    setSelectedBotId,
  ]);

  // Handlers
  const handleCreateBot = async (data: BotFormData) => {
    const res = await createBotAction(data);
    if (!res.success) {
      toast.error(res.error || "Failed to create bot");
      return;
    }
    const r = res.bot;
    upsertBot({
      id: r.id,
      ownerId: r.user_id || undefined,
      chatName: r.chat_name || undefined,
      name: r.name,
      shortDescription: r.short_description || "",
      personality: r.personality || "",
      firstMessage: r.first_message || "",
      alternateGreetings: Array.isArray(r.alternate_greetings)
        ? r.alternate_greetings
        : [],
      scenario: r.scenario || "",
      exampleDialogues: r.example_dialogues || "",
      tags: Array.isArray(r.tags) ? r.tags : [],
      rating: r.rating === "NSFW" ? "NSFW" : "SFW",
      imageUrl: r.image_url || undefined,
      visibility: normalizeResourceVisibility(r.visibility),
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
      updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
    });
    setIsCreating(false);
    toast.success("Bot created successfully!");
  };

  const handleUpdateBot = async (data: BotFormData) => {
    if (!editingBot) return;
    const res = await updateBotAction(editingBot.id, data);
    if (!res.success) {
      toast.error(res.error || "Failed to update bot");
      return;
    }
    const r = res.bot;
    upsertBot({
      id: r.id,
      ownerId: r.user_id || undefined,
      chatName: r.chat_name || undefined,
      name: r.name,
      shortDescription: r.short_description || "",
      personality: r.personality || "",
      firstMessage: r.first_message || "",
      alternateGreetings: Array.isArray(r.alternate_greetings)
        ? r.alternate_greetings
        : [],
      scenario: r.scenario || "",
      exampleDialogues: r.example_dialogues || "",
      tags: Array.isArray(r.tags) ? r.tags : [],
      rating: r.rating === "NSFW" ? "NSFW" : "SFW",
      imageUrl: r.image_url || undefined,
      visibility: normalizeResourceVisibility(r.visibility),
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
      updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
    });
    setEditingBot(null);
    toast.success("Bot updated successfully!");
  };

  const handleDeleteBot = async () => {
    if (!deleteConfirmBot) return;
    const res = await deleteBotAction(deleteConfirmBot.id);
    if (!res.success) {
      toast.error(res.error || "Failed to delete bot");
      return;
    }
    deleteBot(deleteConfirmBot.id);
    setDeleteConfirmBot(null);
    setEditingBot(null);
    toast.success("Bot deleted successfully");
  };

  const handleExportBot = async (bot: Bot) => {
    try {
      const blob = await exportCharacterCardPNG(bot);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bot.name.replace(/\s+/g, "_")}_card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Character card exported!");
    } catch {
      toast.error("Failed to export character card");
    }
  };

  return (
    <div
      id="bot-manager-top"
      className="min-w-0 overflow-x-clip p-3 sm:p-6 md:p-8 lg:p-10"
    >
      <div className="mx-auto w-full max-w-[92rem]">
        {/* Pending Collaboration Invites */}
        <PendingInvites />

        {/* Header */}
        <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Bot Manager
            </h1>
            <p className="mt-1 text-sm sm:text-base text-muted-foreground">
              Create, edit, and manage your bot characters
            </p>
          </div>
          <Button
            onClick={() => setIsCreating(true)}
            className="w-full cursor-pointer sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Bot
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <FilteredSearchInput
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search bots..."
              shortcutKey="/"
              filterOptions={[
                { value: "all", label: "All" },
                { value: "SFW", label: "SFW" },
                { value: "NSFW", label: "NSFW" },
              ]}
              filterValue={filterRating}
              onFilterChange={(v) => setFilterRating(v as FilterRating)}
              className="min-w-0 flex-1"
            />
            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters((value) => !value)}
                className="h-10 w-full cursor-pointer sm:w-auto"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                {showAdvancedFilters ? "Hide filters" : "More filters"}
              </Button>
              <div className="flex items-center gap-1 rounded-lg border p-1 sm:w-auto">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="cursor-pointer flex-1 sm:flex-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="cursor-pointer flex-1 sm:flex-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "overflow-hidden rounded-xl border bg-muted/20 px-4 py-0 transition-all duration-300 ease-out",
              showAdvancedFilters
                ? "mt-2 max-h-80 border-border/70 opacity-100"
                : "mt-0 max-h-0 border-transparent opacity-0",
            )}
          >
            <div className="py-4">
              <div className="mb-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Advanced filters</p>
                  <p className="text-xs text-muted-foreground">
                    Pick a quick time range and a tag without extra typing
                  </p>
                </div>
                {(hasAdvancedFilters ||
                  searchQuery.trim() ||
                  filterRating !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterRating("all");
                      setFilterCreatedRange("any");
                      setFilterUpdatedRange("any");
                      setFilterTag("all");
                    }}
                    className="w-full cursor-pointer sm:w-auto"
                  >
                    Clear filters
                  </Button>
                )}
              </div>

              <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Created</label>
                  <Select
                    value={filterCreatedRange}
                    onValueChange={(value) =>
                      setFilterCreatedRange(value as DateRangePreset)
                    }
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="last7">Last 7 days</SelectItem>
                      <SelectItem value="last30">Last 30 days</SelectItem>
                      <SelectItem value="month">This month</SelectItem>
                      <SelectItem value="year">This year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Updated</label>
                  <Select
                    value={filterUpdatedRange}
                    onValueChange={(value) =>
                      setFilterUpdatedRange(value as DateRangePreset)
                    }
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="last7">Last 7 days</SelectItem>
                      <SelectItem value="last30">Last 30 days</SelectItem>
                      <SelectItem value="month">This month</SelectItem>
                      <SelectItem value="year">This year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tag</label>
                  <Select value={filterTag} onValueChange={setFilterTag}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="All tags" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tags</SelectItem>
                      {availableTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bot List */}
        {isSearching ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
            Searching...
          </div>
        ) : paginatedOwnedBots.length > 0 || collaborativeBots.length > 0 ? (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                : "space-y-3",
            )}
          >
            {/* Owned bots */}
            {paginatedOwnedBots.map((bot) => (
              <BotCard
                key={bot.id}
                bot={bot}
                viewMode={viewMode}
                onEdit={() => void openBotEditor(bot)}
                onDelete={() => setDeleteConfirmBot(bot)}
                onExport={() => handleExportBot(bot)}
                onWorkspace={() => {
                  router.push(`/workspace/bots/${bot.id}`);
                }}
                onFork={async () => {
                  setForking(true);
                  const result = await forkBot(bot.id);
                  setForking(false);
                  if (result.success) {
                    try {
                      const supabase = createClient();
                      const { data: forkedBotData } = await supabase
                        .from("bots")
                        .select("*")
                        .eq("id", result.forkedBotId)
                        .single();
                      if (forkedBotData) {
                        upsertBot({
                          id: forkedBotData.id,
                          ownerId: forkedBotData.user_id || undefined,
                          chatName: forkedBotData.chat_name || undefined,
                          name: forkedBotData.name,
                          shortDescription:
                            forkedBotData.short_description || "",
                          personality: forkedBotData.personality || "",
                          firstMessage: forkedBotData.first_message || "",
                          alternateGreetings: Array.isArray(
                            forkedBotData.alternate_greetings,
                          )
                            ? forkedBotData.alternate_greetings
                            : [],
                          scenario: forkedBotData.scenario || "",
                          exampleDialogues:
                            forkedBotData.example_dialogues || "",
                          tags: Array.isArray(forkedBotData.tags)
                            ? forkedBotData.tags
                            : [],
                          rating:
                            forkedBotData.rating === "NSFW" ? "NSFW" : "SFW",
                          imageUrl: forkedBotData.image_url || undefined,
                          visibility: normalizeResourceVisibility(forkedBotData.visibility),
                          createdAt: forkedBotData.created_at
                            ? new Date(forkedBotData.created_at)
                            : new Date(),
                          updatedAt: forkedBotData.updated_at
                            ? new Date(forkedBotData.updated_at)
                            : new Date(),
                        });
                      }
                    } catch {
                      // Bot will appear on next page load anyway
                    }
                    toast.success(`Bot "${bot.name}" forked successfully!`);
                  } else {
                    toast.error(result.error || "Failed to fork bot");
                  }
                }}
              />
            ))}

            {/* Collaborative bots (shared with me) */}
            {filteredCollaborativeBots.map((collabBot) => (
              <CollaborativeBotCard
                key={`collab-${collabBot.id}`}
                bot={collabBot}
                viewMode={viewMode}
                onWorkspace={() => {
                  router.push(`/workspace/bots/${collabBot.id}`);
                }}
                onExport={() => {
                  // Export using the bot data from collaborative bot
                  const botForExport: Bot = {
                    id: collabBot.id,
                    ownerId: collabBot.user_id,
                    name: collabBot.name,
                    chatName: collabBot.chat_name || undefined,
                    shortDescription: collabBot.short_description,
                    personality: collabBot.personality,
                    firstMessage: collabBot.first_message,
                    alternateGreetings: collabBot.alternate_greetings,
                    scenario: collabBot.scenario,
                    exampleDialogues: collabBot.example_dialogues,
                    tags: collabBot.tags,
                    rating: collabBot.rating as "SFW" | "NSFW",
                    createdAt: new Date(collabBot.created_at),
                    updatedAt: new Date(collabBot.updated_at),
                    imageUrl: collabBot.image_url || undefined,
                  };
                  handleExportBot(botForExport);
                }}
              />
            ))}
          </div>
        ) : !isSearchActive &&
          filteredOwnedBots.length === 0 &&
          filteredCollaborativeBots.length === 0 ? (
          <Card>
            <EmptyState onCreateNew={() => setIsCreating(true)} />
          </Card>
        ) : (
          <Card>
            <CardContent className="px-4 py-10 text-center sm:py-12">
              <p className="text-muted-foreground">
                {isSearchActive
                  ? `No bots found for your current filters`
                  : "No bots match your search criteria"}
              </p>
              {isSearchActive && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterRating("all");
                    setFilterCreatedRange("any");
                    setFilterUpdatedRange("any");
                    setFilterTag("all");
                  }}
                  className="cursor-pointer"
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Sheet */}
        <Sheet
          open={isCreating || !!editingBot}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreating(false);
              setEditingBot(null);
            }
          }}
        >
          <SheetContent className="max-h-dvh w-full min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain pb-[env(safe-area-inset-bottom)] sm:max-w-2xl">
            <SheetHeader className="p-4 sm:p-5 lg:p-6">
              <SheetTitle>
                {editingBot ? "Edit Bot" : "Create New Bot"}
              </SheetTitle>
              <SheetDescription>
                {editingBot
                  ? "Update your bot's details and personality"
                  : "Fill in the details to create a new bot character"}
              </SheetDescription>
            </SheetHeader>
            <div className="min-w-0">
              <BotForm
                initialData={editingBot || undefined}
                onSubmit={editingBot ? handleUpdateBot : handleCreateBot}
                onCancel={() => {
                  setIsCreating(false);
                  setEditingBot(null);
                }}
                onDelete={
                  editingBot ? () => setDeleteConfirmBot(editingBot) : undefined
                }
                isEditing={!!editingBot}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteConfirmBot}
          onOpenChange={(open) => !open && setDeleteConfirmBot(null)}
        >
          <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Bot
              </DialogTitle>
              <DialogDescription>
                You are about to delete{" "}
                <span className="font-semibold text-foreground">
                  &quot;{deleteConfirmBot?.name}&quot;
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm sm:p-4">
              <p className="font-medium text-destructive">What happens:</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>
                  The bot will be deleted from your dashboard and public pages
                </li>
                <li>
                  Collaborators will lose access to this bot&apos;s workspace
                </li>
                <li>
                  If this bot is linked on your creator page, it will no longer
                  be visible to visitors
                </li>
                <li>Character card data is preserved for potential recovery</li>
              </ul>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmBot(null)}
                className="w-full cursor-pointer sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteBot}
                className="w-full cursor-pointer sm:w-auto"
              >
                Delete Bot
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {rangeStart}-{rangeEnd} of {ownedTotal} bots
            </p>
            <Pagination className="w-full sm:w-auto">
              <PaginationContent className="w-full justify-between sm:w-auto sm:justify-center">
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage <= 0) return;
                      if (isSearchActive) {
                        handlePageChange(currentPage - 1);
                      } else {
                        setManagerPage((prev) => Math.max(0, prev - 1));
                      }
                      document
                        .getElementById("bot-manager-top")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={cn(
                      "cursor-pointer",
                      currentPage === 0 && "pointer-events-none opacity-50",
                    )}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const page =
                    totalPages <= 5
                      ? i
                      : Math.max(0, Math.min(currentPage - 2, totalPages - 5)) +
                        i;
                  return (
                    <PaginationItem key={page} className="hidden sm:block">
                      <PaginationLink
                        href="#"
                        isActive={page === currentPage}
                        onClick={(e) => {
                          e.preventDefault();
                          if (page === currentPage) return;
                          if (isSearchActive) {
                            handlePageChange(page);
                          } else {
                            setManagerPage(page);
                          }
                          document
                            .getElementById("bot-manager-top")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="cursor-pointer"
                      >
                        {page + 1}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage >= totalPages - 1) return;
                      if (isSearchActive) {
                        handlePageChange(currentPage + 1);
                      } else {
                        setManagerPage((prev) =>
                          Math.min(totalPages - 1, prev + 1),
                        );
                      }
                      document
                        .getElementById("bot-manager-top")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={cn(
                      "cursor-pointer",
                      currentPage >= totalPages - 1 &&
                        "pointer-events-none opacity-50",
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
