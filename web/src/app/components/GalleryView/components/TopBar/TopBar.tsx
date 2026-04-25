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
  filterOrCollectionId: FilterOrCollectionId;
  setFilterOrCollectionId: (filterOrCollectionId: FilterOrCollectionId) => void;
  handleOnRefresh: () => void;
  handleOnPin: () => void;
  viewMode: ViewMode;
  setZIndex: boolean;
  setViewMode: (mode: ViewMode) => void;
};

export default function GalleryTopBar({
                                        filterOrCollectionId,
                                        setFilterOrCollectionId,
                                        handleOnRefresh,
                                        handleOnPin,
                                        viewMode,
                                        setZIndex,
                                        setViewMode,
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

  function onInternalRefresh() {
    setShowAlertNewImages(false);
    handleOnRefresh();
  }

  return (
    <Flex align="start" justify="space-between" className={style.topBar}
          style={{ zIndex: setZIndex === true ? 1 : undefined }}>
      <FiltersBar filterOrCollectionId={filterOrCollectionId} onChange={setFilterOrCollectionId} />
      <Flex gap="xs">
        <ActionIcon.Group>
          <Tooltip label={t("galleryScreen.masonryView")}>
            <ActionIcon size="lg" variant={viewMode === "masonry" ? "filled" : "default"}
                        onClick={() => setViewMode("masonry")}>
              <IconLayoutDashboard stroke={1.2} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t("galleryScreen.galleryView")}>
            <ActionIcon size="lg" variant={viewMode === "gallery" ? "filled" : "default"}
                        onClick={() => setViewMode("gallery")}>
              <IconPhoto stroke={1.2} />
            </ActionIcon>
          </Tooltip>
          {Math.random() > 1 && <Tooltip label={t("galleryScreen.detailView")}>
            <ActionIcon size="lg" variant={viewMode === "table" ? "filled" : "default"}
                        onClick={() => setViewMode("table")}>
              <IconListDetails stroke={1.2} />
            </ActionIcon>
          </Tooltip>
          }
        </ActionIcon.Group>
        <RefreshButton
          alert={showAlertNewImages}
          onRefresh={onInternalRefresh}
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
