import { type Icon, IconCompass, IconLayoutGrid, IconToggleLeft } from "@tabler/icons-react";

import type { ActionCenterUsageDataType, ActionCenterUsageEntryType } from "types";
import { EntityIcons } from "app/components";


export type ActionCenterSectionScopeType =
  | "jumpTo"
  | "commands"
  | "recentImages"
  | "extensions"
  | "quickToggles";

export type ActionCenterScopeType = "all" | ActionCenterSectionScopeType;

export const ACTION_CENTER_SCOPES: readonly ActionCenterScopeType[] = [
  "all",
  "jumpTo",
  "commands",
  "recentImages",
  "extensions",
  "quickToggles"
];

export const ACTION_CENTER_SCOPE_ICONS: Readonly<Record<ActionCenterScopeType, Icon>> =
  {
    all: IconLayoutGrid,
    jumpTo: IconCompass,
    commands: EntityIcons.commands,
    recentImages: EntityIcons.image,
    extensions: EntityIcons.extensions,
    quickToggles: IconToggleLeft
  };

export const ACTION_CENTER_SCOPE_LABEL_KEYS: Readonly<Record<ActionCenterScopeType, string>> =
  {
    all: "field.all",
    jumpTo: "actionsCenter.sections.jumpTo",
    commands: "field.commands",
    recentImages: "field.images",
    extensions: "field.extensions",
    quickToggles: "actionsCenter.scopes.quickToggles"
  };

export const ACTION_CENTER_SCOPE_PREFIXES: Readonly<Record<string, ActionCenterSectionScopeType>> =
  {
    ">": "commands",
    "@": "extensions",
    "/": "jumpTo"
  };

export const FREQUENT_ITEMS_LIMIT = 5;
export const ALL_EMPTY_SECTION_LIMIT = 5;
export const MIN_FREQUENT_SCORE = 0.25;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const HALF_LIFE_DAYS = 14;
const MAX_STORED_ENTRIES = 150;
const MAX_STORED_QUERY_BOOSTS = 80;
const MIN_QUERY_BOOST_LENGTH = 2;

const MATCH_TIER_SCALE = 1000;
const QUERY_BOOST_BONUS = 45000;
const MAX_FRECENCY_BONUS = 30000;
const FRECENCY_LOG_MULTIPLIER = 5000;

export function computeActionCenterEntryKey(
  section: ActionCenterSectionScopeType,
  itemId: string
): string
{
  return `${section}:${itemId}`;
}

export function computeDecayedFrecencyScore(
  entry: ActionCenterUsageEntryType | undefined,
  nowMs: number
): number
{
  if (entry === undefined)
  {
    return 0;
  }

  const elapsedDays = Math.max(0, (nowMs - entry.lastUsedAt) / MILLISECONDS_PER_DAY);
  return entry.score * Math.pow(0.5, elapsedDays / HALF_LIFE_DAYS);
}

export function recordActionCenterUsage(
  currentUsage: ActionCenterUsageDataType,
  entryKey: string,
  normalizedQuery: string,
  nowMs: number
): ActionCenterUsageDataType
{
  const previousEntry = currentUsage.entries[entryKey];
  const decayedPreviousScore = computeDecayedFrecencyScore(previousEntry, nowMs);
  const nextEntry: ActionCenterUsageEntryType =
    {
      score: decayedPreviousScore + 1,
      count: (previousEntry?.count ?? 0) + 1,
      lastUsedAt: nowMs
    };

  const mergedEntries: Record<string, ActionCenterUsageEntryType> =
    {
      ...currentUsage.entries,
      [entryKey]: nextEntry
    };

  const rankedKeys = Object.keys(mergedEntries).sort((firstKey, secondKey) =>
  {
    const secondScore = computeDecayedFrecencyScore(mergedEntries[secondKey], nowMs);
    const firstScore = computeDecayedFrecencyScore(mergedEntries[firstKey], nowMs);
    if (secondScore !== firstScore)
    {
      return secondScore - firstScore;
    }
    return mergedEntries[secondKey].lastUsedAt - mergedEntries[firstKey].lastUsedAt;
  });

  const prunedEntries: Record<string, ActionCenterUsageEntryType> = {};
  for (const key of rankedKeys.slice(0, MAX_STORED_ENTRIES))
  {
    prunedEntries[key] = mergedEntries[key];
  }

  const nextQueryBoosts: Record<string, string> = {};
  const retainedEntriesSet = new Set<string>(Object.keys(prunedEntries));
  const boostPairs = Object.entries(currentUsage.queryBoosts).filter(
    ([ existingQuery, boostedKey ]) => existingQuery !== normalizedQuery && retainedEntriesSet.has(boostedKey)
  );
  if (normalizedQuery.length >= MIN_QUERY_BOOST_LENGTH)
  {
    boostPairs.push([ normalizedQuery, entryKey ]);
  }
  const recentBoostPairs = boostPairs.slice(-MAX_STORED_QUERY_BOOSTS);
  for (const [ queryText, boostedKey ] of recentBoostPairs)
  {
    nextQueryBoosts[queryText] = boostedKey;
  }

  return {
    entries: prunedEntries,
    queryBoosts: nextQueryBoosts
  };
}

function matchesWordAcronym(normalizedText: string, normalizedQuery: string): boolean
{
  if (normalizedQuery.length < 2)
  {
    return false;
  }

  const words = normalizedText.split(/[\s\-_/.:]+/).filter(word => word.length > 0);
  if (words.length < normalizedQuery.length)
  {
    return false;
  }

  const initials = words.map(word => word[0]).join("");
  return initials.startsWith(normalizedQuery);
}

function matchesWordStart(normalizedText: string, normalizedQuery: string): boolean
{
  const words = normalizedText.split(/[\s\-_/.:]+/);
  return words.some(word => word.startsWith(normalizedQuery));
}

export function computeTextMatchTier(
  normalizedQuery: string,
  primaryText: string | undefined,
  secondaryTexts: readonly (string | undefined)[] = []
): number
{
  if (normalizedQuery.length === 0)
  {
    return 1;
  }

  const normalizedPrimary = primaryText?.toLowerCase() ?? "";
  if (normalizedPrimary.length > 0)
  {
    if (normalizedPrimary === normalizedQuery)
    {
      return 500;
    }
    if (normalizedPrimary.startsWith(normalizedQuery) === true)
    {
      return 400;
    }
    if (
      matchesWordStart(normalizedPrimary, normalizedQuery) === true ||
      matchesWordAcronym(normalizedPrimary, normalizedQuery) === true
    )
    {
      return 320;
    }
    if (normalizedPrimary.includes(normalizedQuery) === true)
    {
      return 240;
    }
  }

  let bestSecondaryTier = 0;
  for (const secondaryText of secondaryTexts)
  {
    const normalizedSecondary = secondaryText?.toLowerCase() ?? "";
    if (normalizedSecondary.length === 0)
    {
      continue;
    }
    if (
      normalizedSecondary.startsWith(normalizedQuery) === true ||
      matchesWordStart(normalizedSecondary, normalizedQuery) === true
    )
    {
      bestSecondaryTier = Math.max(bestSecondaryTier, 150);
    }
    else if (normalizedSecondary.includes(normalizedQuery) === true)
    {
      bestSecondaryTier = Math.max(bestSecondaryTier, 100);
    }
  }

  return bestSecondaryTier;
}

export function computeCombinedSearchScore(
  matchTier: number,
  decayedFrecencyScore: number,
  isQueryBoosted: boolean
): number
{
  if (matchTier <= 0)
  {
    return 0;
  }

  const frecencyBonus = decayedFrecencyScore > 0
    ? Math.min(MAX_FRECENCY_BONUS, Math.log2(decayedFrecencyScore + 1) * FRECENCY_LOG_MULTIPLIER)
    : 0;
  const queryBoost = isQueryBoosted === true ? QUERY_BOOST_BONUS : 0;

  return matchTier * MATCH_TIER_SCALE + queryBoost + frecencyBonus;
}

export type RankItemsOptionsType<ItemType> =
  {
    readonly section: ActionCenterSectionScopeType;
    readonly items: readonly ItemType[];
    readonly query: string;
    readonly usage: ActionCenterUsageDataType;
    readonly nowMs: number;
    readonly getId: (item: ItemType) => string;
    readonly getPrimaryText: (item: ItemType) => string | undefined;
    readonly getSecondaryTexts?: (item: ItemType) => readonly (string | undefined)[];
    readonly shouldKeepWithoutMatch?: (item: ItemType) => boolean;
  };

export function rankActionCenterItems<ItemType>({
  section,
  items,
  query,
  usage,
  nowMs,
  getId,
  getPrimaryText,
  getSecondaryTexts,
  shouldKeepWithoutMatch
}: RankItemsOptionsType<ItemType>): ItemType[]
{
  const hasQuery = query.length > 0;
  const boostedEntryKey = hasQuery === true ? usage.queryBoosts[query] : undefined;

  const scored = items
    .map((item, index) =>
    {
      const entryKey = computeActionCenterEntryKey(section, getId(item));
      const usageEntry = usage.entries[entryKey];
      const frecencyScore = computeDecayedFrecencyScore(usageEntry, nowMs);
      const primaryText = getPrimaryText(item);

      if (primaryText === undefined)
      {
        return {
          item,
          index,
          matchTier: shouldKeepWithoutMatch?.(item) === true ? 1 : 0,
          searchScore: 0,
          lastUsedAt: 0
        };
      }

      const secondaryTexts = getSecondaryTexts !== undefined ? getSecondaryTexts(item) : [];
      const matchTier = computeTextMatchTier(query, primaryText, secondaryTexts);
      const searchScore = hasQuery === true
        ? computeCombinedSearchScore(matchTier, frecencyScore, boostedEntryKey === entryKey)
        : frecencyScore;

      return {
        item,
        index,
        matchTier,
        searchScore,
        lastUsedAt: usageEntry?.lastUsedAt ?? 0
      };
    })
    .filter(candidate => candidate.matchTier > 0);

  return scored
    .sort((first, second) =>
    {
      if (second.searchScore !== first.searchScore)
      {
        return second.searchScore - first.searchScore;
      }
      if (second.lastUsedAt !== first.lastUsedAt)
      {
        return second.lastUsedAt - first.lastUsedAt;
      }
      return first.index - second.index;
    })
    .map(candidate => candidate.item);
}
