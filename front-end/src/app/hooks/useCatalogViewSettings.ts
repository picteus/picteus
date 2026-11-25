import { useCallback, useEffect, useRef, useState } from "react";

import { CatalogViewModeType } from "types";


export type CatalogViewSettingsBaseType<TCriterion extends string> = {
  viewMode: CatalogViewModeType;
  sortCriterion: TCriterion;
  isSortAscending: boolean;
};

export type UseCatalogViewSettingsOptionsType<
  TSettings extends CatalogViewSettingsBaseType<TCriterion>,
  TCriterion extends string
> = {
  readonly load: () => TSettings;
  readonly save: (settings: TSettings) => void;
  readonly getDefaultAscending?: (criterion: TCriterion) => boolean;
};

export type UseCatalogViewSettingsResultType<
  TSettings extends CatalogViewSettingsBaseType<TCriterion>,
  TCriterion extends string
> = {
  readonly viewSettings: TSettings;
  readonly updateSettings: (updater: (previous: TSettings) => TSettings) => void;
  readonly setViewMode: (viewMode: CatalogViewModeType) => void;
  readonly setSortCriterion: (sortCriterion: TCriterion) => void;
  readonly toggleSortDirection: () => void;
  readonly handleHeaderSort: (sortCriterion: TCriterion) => void;
};

export default function useCatalogViewSettings<
  TSettings extends CatalogViewSettingsBaseType<TCriterion>,
  TCriterion extends string
>({
  load,
  save,
  getDefaultAscending
}: UseCatalogViewSettingsOptionsType<TSettings, TCriterion>): UseCatalogViewSettingsResultType<TSettings, TCriterion>
{
  const [ viewSettings, setViewSettings ] = useState<TSettings>(load);
  const saveRef = useRef(save);
  const getDefaultAscendingRef = useRef(getDefaultAscending);

  saveRef.current = save;
  getDefaultAscendingRef.current = getDefaultAscending;

  useEffect(() =>
  {
    saveRef.current(viewSettings);
  }, [ viewSettings ]);

  const updateSettings = useCallback((updater: (previous: TSettings) => TSettings): void =>
  {
    setViewSettings(updater);
  }, []);

  const setViewMode = useCallback((viewMode: CatalogViewModeType): void =>
  {
    setViewSettings(previous => ({ ...previous, viewMode }));
  }, []);

  const setSortCriterion = useCallback((sortCriterion: TCriterion): void =>
  {
    const defaultAscending = getDefaultAscendingRef.current !== undefined
      ? getDefaultAscendingRef.current(sortCriterion)
      : true;
    setViewSettings(previous => ({ ...previous, sortCriterion, isSortAscending: defaultAscending }));
  }, []);

  const toggleSortDirection = useCallback((): void =>
  {
    setViewSettings(previous => ({ ...previous, isSortAscending: !previous.isSortAscending }));
  }, []);

  const handleHeaderSort = useCallback((sortCriterion: TCriterion): void =>
  {
    setViewSettings(previous =>
    {
      if (previous.sortCriterion === sortCriterion)
      {
        return { ...previous, isSortAscending: !previous.isSortAscending };
      }
      const defaultAscending = getDefaultAscendingRef.current !== undefined
        ? getDefaultAscendingRef.current(sortCriterion)
        : true;
      return { ...previous, sortCriterion, isSortAscending: defaultAscending };
    });
  }, []);

  return {
    viewSettings,
    updateSettings,
    setViewMode,
    setSortCriterion,
    toggleSortDirection,
    handleHeaderSort
  };
}
