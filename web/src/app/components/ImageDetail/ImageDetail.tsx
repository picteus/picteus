import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getHotkeyHandler, useFocusTrap } from "@mantine/hooks";
import { Group as ResizableGroup, Layout, Panel, Separator } from "react-resizable-panels";

import { Image } from "@picteus/ws-client";

import { ChannelEnum, ImageOrSummary, ViewMode, WithNavigationType } from "types";
import { useEventSocket } from "app/context";
import { ImageService, StorageService } from "app/services";
import { ImageData, ImageTop, ImageVisual } from "./components";

import style from "./ImageDetail.module.scss";


type ImageDetailType = {
  image: ImageOrSummary;
  withNavigation: WithNavigationType;
  viewMode: ViewMode;
  onClose: () => void;
};

export default function ImageDetail({ image, withNavigation, viewMode, onClose }: ImageDetailType) {
  const ref = useFocusTrap();
  const [imageData, setImageData] = useState<Image>("metadata" in image ? image as Image : undefined);
  const [panelSizes, setPanelSizes] = useState<number[]>(StorageService.getVisualizerPanelSizes());
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);

  const loadImageData = useCallback((image: ImageOrSummary, force: boolean): void => {
    async function load() {
      setImageData((force === false && "metadata" in image) ? image as Image : await ImageService.get({ id: image.id }));
    }

    void load();
  }, [image]);

  useEffect(() => {
    if (event !== undefined) {
      const channel = event.rawData.channel;
      if (channel === ChannelEnum.IMAGE_UPDATED || channel === ChannelEnum.IMAGE_TAGS_UPDATED || channel === ChannelEnum.IMAGE_FEATURES_UPDATED) {
        if (imageData !== undefined && event.rawData.value.id === imageData.id) {
          void loadImageData(image,true);
        }
      }
    }
  }, [event, image]);

  useEffect(() => {
    void loadImageData(image,false);
  }, [image]);

  function handleOnLayoutChanged(layout: Layout) {
    const size = Object.values(layout);
    StorageService.setVisualizerPanelSizes(size);
    setPanelSizes(size);
  }

  const handleOnKeyDown = getHotkeyHandler([
    ["ArrowLeft", withNavigation.onPrevious],
    ["ArrowRight", withNavigation.onNext],
  ]);

  return (
    <ResizableGroup elementRef={ref} orientation="horizontal" onLayoutChanged={handleOnLayoutChanged}
           onKeyDown={handleOnKeyDown}>
      <Panel id="left" defaultSize={`${panelSizes[0]}%`} minSize="40%" className={style.left}>
        {imageData && <ImageVisual image={imageData} withNavigation={withNavigation} />}
      </Panel>
      <Separator className={style.paneSeparator}>
        <div className={style.paneSeparatorHandle} />
      </Separator>
      <Panel id="right" defaultSize={`${panelSizes[1]}%`} minSize="20%" className={style.right}>
        {imageData && <>
          <ImageTop image={imageData} viewMode={viewMode} onClose={onClose} />
          <ImageData image={imageData} viewMode={viewMode}/>
        </>}
      </Panel>
    </ResizableGroup>
  );
}
