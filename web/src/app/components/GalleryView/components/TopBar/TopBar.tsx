import React, { useEffect, useState, useSyncExternalStore } from "react";
import { ActionIcon, Flex, Tooltip } from "@mantine/core";
import { IconLayoutDashboard, IconListDetails, IconPhoto, IconPin } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ChannelEnum, FilterOrCollectionId, ViewMode } from "types";
import { useEventSocket } from "app/context";
import { RefreshButton } from "app/components";
import { FiltersBar } from "../index.ts";

import style from "./TopBar.module.scss";


type TopBarType = {
  initialFilterOrCollectionId: FilterOrCollectionId;
  onFilterOrCollectionId: (filterOrCollectionId: FilterOrCollectionId) => void;
  onRefresh: () => void;
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  handleOnPin: () => void;
  setZIndex: boolean;
};

export default function GalleryTopBar({
                                        initialFilterOrCollectionId,
                                        onFilterOrCollectionId,
                                        onRefresh,
                                        viewMode,
                                        onViewMode,
                                        handleOnPin,
                                        setZIndex,
                                      }: TopBarType) {
  const [t] = useTranslation();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const [showAlertNewImages, setShowAlertNewImages] = useState<boolean>(false);

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
    <Flex align="start" justify="space-between" className={style.topBar}
          style={{ zIndex: setZIndex === true ? 1 : undefined }}>
      <FiltersBar initialFilterOrCollectionId={initialFilterOrCollectionId} onFilterOrCollectionId={onFilterOrCollectionId} />
      <Flex gap="xs">
        <ActionIcon.Group>
          <Tooltip label={t("galleryScreen.masonryView")}>
            <ActionIcon size="lg" variant={viewMode === "masonry" ? "filled" : "default"}
                        onClick={() => onViewMode("masonry")}>
              <IconLayoutDashboard stroke={1.2} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t("galleryScreen.galleryView")}>
            <ActionIcon size="lg" variant={viewMode === "gallery" ? "filled" : "default"}
                        onClick={() => onViewMode("gallery")}>
              <IconPhoto stroke={1.2} />
            </ActionIcon>
          </Tooltip>
          {Math.random() > 1 && <Tooltip label={t("galleryScreen.detailView")}>
            <ActionIcon size="lg" variant={viewMode === "table" ? "filled" : "default"}
                        onClick={() => onViewMode("table")}>
              <IconListDetails stroke={1.2} />
            </ActionIcon>
          </Tooltip>
          }
        </ActionIcon.Group>
        <RefreshButton
          alert={showAlertNewImages}
          onRefresh={handleOnRefresh}
        />
        <Tooltip label={t("button.pin")}>
          <ActionIcon size="lg" variant={"default"} onClick={handleOnPin}>
            <IconPin stroke={1.2} />
          </ActionIcon>
        </Tooltip>
      </Flex>
    </Flex>
  );
}
