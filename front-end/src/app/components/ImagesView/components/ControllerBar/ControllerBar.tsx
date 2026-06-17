import React, { ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { ActionIcon, Flex, Tooltip } from "@mantine/core";
import { IconLayoutDashboard, IconListDetails, IconPhoto, IconPin } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Collection, SearchFilterFromJSON } from "@picteus/ws-client";

import { FilterOrCollectionId, ViewMode } from "types";
import { RefreshButton } from "app/components";
import { CollectionsBar, CollectionsBarRef, FiltersBar, FiltersBarRef } from "../index.ts";

import style from "./ControllerBar.module.scss";


type ControllerBarType = {
  children?: ReactNode;
  withFilter: boolean;
  initialFilterOrCollectionId: FilterOrCollectionId;
  onFilterOrCollectionId: (filterOrCollectionId: FilterOrCollectionId) => void;
  withRefreshButton: boolean;
  displayRefreshAlert: boolean;
  onRefresh?: () => void;
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  onPin?: () => void;
};

export default function ControllerBar({
  children,
  withFilter,
  initialFilterOrCollectionId,
  onFilterOrCollectionId,
  withRefreshButton,
  displayRefreshAlert,
  onRefresh,
  viewMode,
  onViewMode,
  onPin
}: ControllerBarType)
{
  const [t] = useTranslation();
  const withTable = useMemo<boolean>(() => Math.random() > 1, []);
  const [currentCollection, setCurrentCollection] = useState<Collection | undefined>();
  const [initialCollectionId] = useState<number | undefined>("collectionId" in initialFilterOrCollectionId ? initialFilterOrCollectionId.collectionId : undefined);
  const collectionsBarRef = useRef<CollectionsBarRef>(null);
  const filtersBarRef = useRef<FiltersBarRef>(null);

  const handleOnCollection = useCallback((collection: Collection) =>
  {
    setCurrentCollection(collection);
    filtersBarRef.current?.setFilter(collection.filter);
    onFilterOrCollectionId({ collectionId: collection.id });
  }, [onFilterOrCollectionId]);

  const handleOnFilterOrCollectionId = useCallback((filterOrCollectionId: FilterOrCollectionId) =>
  {
    if ("filter" in filterOrCollectionId)
    {
      if (currentCollection !== undefined && JSON.stringify(SearchFilterFromJSON(filterOrCollectionId.filter)) === JSON.stringify(SearchFilterFromJSON(currentCollection.filter)))
      {
        onFilterOrCollectionId({ collectionId: currentCollection.id });
      }
      else
      {
        onFilterOrCollectionId(filterOrCollectionId);
      }
    }
    else
    {
      onFilterOrCollectionId(filterOrCollectionId);
    }
  }, [currentCollection, onFilterOrCollectionId]);

  const handleOnClearAll = useCallback(() =>
  {
    collectionsBarRef.current?.clearCollection();
  }, []);

  function handleOnRefresh()
  {
    if (onRefresh)
    {
      onRefresh();
    }
  }

  return (
    <Flex align="end" justify="space-between" className={style.content}>
      {children}
      {withFilter && <FiltersBar
        ref={filtersBarRef}
        initialFilterOrCollectionId={initialFilterOrCollectionId}
        onFilterOrCollectionId={handleOnFilterOrCollectionId}
        onClearAll={handleOnClearAll}
      >
        <CollectionsBar
          ref={collectionsBarRef}
          searchFilter={"filter" in initialFilterOrCollectionId ? initialFilterOrCollectionId.filter : currentCollection?.filter}
          initialCollectionId={initialCollectionId}
          onCollection={handleOnCollection}
        />
      </FiltersBar>}
      <Flex gap="xs">
        <ActionIcon.Group>
          <Tooltip label={t("imagesScreen.masonryView")}>
            <ActionIcon size="lg" variant={viewMode === "masonry" ? "filled" : "default"}
                        onClick={() => onViewMode("masonry")}>
              <IconLayoutDashboard stroke={1.2}/>
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t("imagesScreen.galleryView")}>
            <ActionIcon size="lg" variant={viewMode === "gallery" ? "filled" : "default"}
                        onClick={() => onViewMode("gallery")}>
              <IconPhoto stroke={1.2}/>
            </ActionIcon>
          </Tooltip>
          {withTable && <Tooltip label={t("imagesScreen.detailView")}>
            <ActionIcon size="lg" variant={viewMode === "table" ? "filled" : "default"}
                        onClick={() => onViewMode("table")}>
              <IconListDetails stroke={1.2}/>
            </ActionIcon>
          </Tooltip>
          }
        </ActionIcon.Group>
        {withRefreshButton && <RefreshButton
          alert={displayRefreshAlert}
          onRefresh={handleOnRefresh}
        />}
        {onPin && <Tooltip label={t("button.pin")}>
          <ActionIcon size="lg" variant={"default"} onClick={onPin}>
            <IconPin stroke={1.2}/>
          </ActionIcon>
        </Tooltip>}
      </Flex>
    </Flex>
  );
}
