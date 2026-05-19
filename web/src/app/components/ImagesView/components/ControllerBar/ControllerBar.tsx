import React, { ReactNode, useMemo } from "react";
import { ActionIcon, Flex, Tooltip } from "@mantine/core";
import { IconLayoutDashboard, IconListDetails, IconPhoto, IconPin } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { FilterOrCollectionId, ViewMode } from "types";
import { RefreshButton } from "app/components";
import { FiltersBar } from "../index.ts";

import style from "./ControllerBar.module.scss";


type ControllerBarType = {
  children?: ReactNode;
  initialFilterOrCollectionId: FilterOrCollectionId;
  onFilterOrCollectionId: (filterOrCollectionId: FilterOrCollectionId) => void;
  withRefreshButton: boolean;
  displayRefreshAlert: boolean;
  onRefresh?: () => void;
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  handleOnPin?: () => void;
};

export default function ControllerBar({
                                        children,
                                        initialFilterOrCollectionId,
                                        onFilterOrCollectionId,
                                        withRefreshButton,
                                        displayRefreshAlert,
                                        onRefresh,
                                        viewMode,
                                        onViewMode,
                                        handleOnPin,
                                      }: ControllerBarType) {
  const [t] = useTranslation();
  const withTable = useMemo<boolean>(() => Math.random() > 1, []);

  function handleOnRefresh() {
    if (onRefresh) {
      onRefresh();
    }
  }

  return (
    <Flex align="end" justify="space-between" className={style.content}>
      {children}
      {("collectionId" in initialFilterOrCollectionId || initialFilterOrCollectionId.filter.origin === undefined) ? <FiltersBar initialFilterOrCollectionId={initialFilterOrCollectionId}
                   onFilterOrCollectionId={onFilterOrCollectionId} /> : <div/>}
      <Flex gap="xs">
        <ActionIcon.Group>
          <Tooltip label={t("imagesScreen.masonryView")}>
            <ActionIcon size="lg" variant={viewMode === "masonry" ? "filled" : "default"}
                        onClick={() => onViewMode("masonry")}>
              <IconLayoutDashboard stroke={1.2} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t("imagesScreen.galleryView")}>
            <ActionIcon size="lg" variant={viewMode === "gallery" ? "filled" : "default"}
                        onClick={() => onViewMode("gallery")}>
              <IconPhoto stroke={1.2} />
            </ActionIcon>
          </Tooltip>
          {withTable && <Tooltip label={t("imagesScreen.detailView")}>
            <ActionIcon size="lg" variant={viewMode === "table" ? "filled" : "default"}
                        onClick={() => onViewMode("table")}>
              <IconListDetails stroke={1.2} />
            </ActionIcon>
          </Tooltip>
          }
        </ActionIcon.Group>
        {withRefreshButton && <RefreshButton
          alert={displayRefreshAlert}
          onRefresh={handleOnRefresh}
        />}
        {handleOnPin && <Tooltip label={t("button.pin")}>
          <ActionIcon size="lg" variant={"default"} onClick={handleOnPin}>
            <IconPin stroke={1.2} />
          </ActionIcon>
        </Tooltip>}
      </Flex>
    </Flex>
  );
}
