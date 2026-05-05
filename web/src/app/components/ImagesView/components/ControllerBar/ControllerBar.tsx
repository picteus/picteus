import React, { ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ActionIcon, Flex, Tooltip } from "@mantine/core";
import { IconLayoutDashboard, IconListDetails, IconPhoto, IconPin } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ChannelEnum, FilterOrCollectionId, ViewMode } from "types";
import { useEventSocket } from "app/context";
import { RefreshButton } from "app/components";
import { FiltersBar } from "../index.ts";

import style from "./ControllerBar.module.scss";


type ControllerBarType = {
  children?: ReactNode;
  initialFilterOrCollectionId: FilterOrCollectionId;
  onFilterOrCollectionId: (filterOrCollectionId: FilterOrCollectionId) => void;
  onRefresh?: () => void;
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  handleOnPin?: () => void;
  setZIndex?: boolean;
};

export default function ControllerBar({
                                        children,
                                        initialFilterOrCollectionId,
                                        onFilterOrCollectionId,
                                        onRefresh,
                                        viewMode,
                                        onViewMode,
                                        handleOnPin,
                                        setZIndex,
                                      }: ControllerBarType) {
  const [t] = useTranslation();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const [showAlertNewImages, setShowAlertNewImages] = useState<boolean>(false);
  const withTable = useMemo<boolean>(() => Math.random() > 1, []);

  useEffect(() => {
    if (event === undefined) {
      return;
    }
    if (event.rawData.channel === ChannelEnum.IMAGE_CREATED || event.rawData.channel === ChannelEnum.IMAGE_DELETED) {
      setShowAlertNewImages(true);
    }
  }, [event]);

  function handleOnRefresh() {
    setShowAlertNewImages(false);
    onRefresh();
  }

  return (
    <Flex align="end" justify="space-between" className={`${style.content} ${setZIndex === undefined ? style.notSticky : style.sticky}`}
          style={{ zIndex: setZIndex === true ? 1 : undefined }}>
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
        {onRefresh && <RefreshButton
          alert={showAlertNewImages}
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
