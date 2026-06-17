import React, { useEffect, useState, useSyncExternalStore } from "react";
import { getHotkeyHandler, useFocusTrap } from "@mantine/hooks";
import { Group as ResizableGroup, Layout, Panel, Separator } from "react-resizable-panels";

import { Image } from "@picteus/ws-client";

import { ChannelEnum, ImageOrSummary, ViewMode } from "types";
import { NotificationsService } from "utils";
import { useEventSocket } from "app/context";
import { useImageNavigation } from "app/hooks";
import { EventService, ImageService, StorageService } from "app/services";
import { ImageData, ImageTop, ImageVisual } from "./components";

import style from "./ImageDetail.module.scss";


type ImageDetailType = {
  image: ImageOrSummary;
  images: ImageOrSummary [];
  viewMode: ViewMode;
  onClose: () => void;
};

export default function ImageDetail({ image, images, viewMode, onClose }: ImageDetailType)
{
  const ref = useFocusTrap();
  const navigation = useImageNavigation({
    selectedImage: "metadata" in image ? image as Image : undefined,
    images,
    viewMode
  });
  const [panelSizes, setPanelSizes] = useState<number[]>(StorageService.getVisualizerPanelSizes());
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribeToSocketEvents, eventStore.getSocketEvent);

  useEffect(() =>
  {
    if (event !== undefined)
    {
      if (event.channel === ChannelEnum.IMAGE_UPDATED || event.channel === ChannelEnum.IMAGE_TAGS_UPDATED || event.channel === ChannelEnum.IMAGE_FEATURES_UPDATED)
      {
        const imageId = EventService.computeEventEntityId<string>(event);
        if (navigation.containsImage(imageId))
        {
          ImageService.get({ id: imageId }).then(image => navigation.updateImage(image)).catch(NotificationsService.apiCallError);
        }
      }
    }
  }, [event, navigation.containsImage, navigation.updateImage]);

  useEffect(() =>
  {
    if (image)
    {
      ("metadata" in image ? Promise.resolve(image as Image) : ImageService.get({ id: image.id })).then(navigation.setSelectedImage).catch(NotificationsService.apiCallError);
    }
  }, [image, navigation.setSelectedImage]);

  function handleOnLayoutChanged(layout: Layout)
  {
    const size = Object.values(layout);
    StorageService.setVisualizerPanelSizes(size);
    setPanelSizes(size);
  }

  const handleOnKeyDown = getHotkeyHandler([
    ["ArrowLeft", navigation.onPrevious],
    ["ArrowRight", navigation.onNext]
  ]);

  const imageData = navigation.selectedImage as Image;

  return (
    <ResizableGroup elementRef={ref} orientation="horizontal" onLayoutChanged={handleOnLayoutChanged}
                    onKeyDown={handleOnKeyDown}>
      <Panel id="left" defaultSize={`${panelSizes[0]}%`} minSize="40%" className={style.left}>
        {imageData && <ImageVisual image={imageData} withNavigation={navigation}/>}
      </Panel>
      <Separator className={style.paneSeparator}>
        <div className={style.paneSeparatorHandle}/>
      </Separator>
      <Panel id="right" defaultSize={`${panelSizes[1]}%`} minSize="20%" className={style.right}>
        {imageData && <>
          <div className={style.rightTop}>
            <ImageTop image={imageData} viewMode={viewMode} onClose={onClose}/>
          </div>
          <div className={style.rightBottom}>
            <ImageData image={imageData} viewMode={viewMode}/>
          </div>
        </>}
      </Panel>
    </ResizableGroup>
  );
}
