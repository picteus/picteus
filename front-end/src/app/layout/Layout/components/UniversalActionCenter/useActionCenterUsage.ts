import { useCallback, useState } from "react";

import type { ActionCenterUsageDataType } from "types";
import { StorageService } from "app/services";

import {
  type ActionCenterSectionScopeType,
  computeActionCenterEntryKey,
  computeDecayedFrecencyScore,
  recordActionCenterUsage
} from "./actionCenterRanking.ts";


export type UseActionCenterUsageResultType =
  {
    readonly usageSnapshot: ActionCenterUsageDataType;
    readonly snapshotNowMs: number;
    readonly hasUsageHistory: boolean;
    readonly refreshSnapshot: () => void;
    readonly recordUsage: (section: ActionCenterSectionScopeType, itemId: string, normalizedQuery: string) => void;
    readonly resetUsage: () => void;
    readonly getFrecencyScore: (entryKey: string) => number;
    readonly getLastUsedAt: (entryKey: string) => number;
  };

export default function useActionCenterUsage(): UseActionCenterUsageResultType
{
  const [ usageSnapshot, setUsageSnapshot ] = useState<ActionCenterUsageDataType>(StorageService.getActionsCenterUsage);
  const [ snapshotNowMs, setSnapshotNowMs ] = useState<number>(Date.now);

  const hasUsageHistory = Object.keys(usageSnapshot.entries).length > 0;

  const refreshSnapshot = useCallback((): void =>
  {
    setUsageSnapshot(StorageService.getActionsCenterUsage());
    setSnapshotNowMs(Date.now());
  }, []);

  const recordUsage = useCallback((section: ActionCenterSectionScopeType, itemId: string, normalizedQuery: string): void =>
  {
    const entryKey = computeActionCenterEntryKey(section, itemId);
    const currentUsage = StorageService.getActionsCenterUsage();
    const updatedUsage = recordActionCenterUsage(currentUsage, entryKey, normalizedQuery, Date.now());
    StorageService.setActionsCenterUsage(updatedUsage);
  }, []);

  const resetUsage = useCallback((): void =>
  {
    StorageService.clearActionsCenterUsage();
    setUsageSnapshot({ entries: {}, queryBoosts: {} });
    setSnapshotNowMs(Date.now());
  }, []);

  const getFrecencyScore = useCallback((entryKey: string): number => computeDecayedFrecencyScore(usageSnapshot.entries[entryKey], snapshotNowMs),
    [ usageSnapshot, snapshotNowMs ]
  );

  const getLastUsedAt = useCallback((entryKey: string): number => usageSnapshot.entries[entryKey]?.lastUsedAt ?? 0,
    [ usageSnapshot ]
  );

  return {
    usageSnapshot,
    snapshotNowMs,
    hasUsageHistory,
    refreshSnapshot,
    recordUsage,
    resetUsage,
    getFrecencyScore,
    getLastUsedAt
  };
}
