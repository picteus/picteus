import React, { ReactElement, useEffect, useMemo, useState } from "react";
import { getHotkeyHandler, useFocusTrap } from "@mantine/hooks";
import { Group as ResizableGroup, Layout, Panel, Separator } from "react-resizable-panels";
import { useTranslation } from "react-i18next";

import { Image } from "@picteus/ws-client";

import { ChannelEnum, ImageOrSummary, ViewMode } from "types";
import { ToastService } from "utils";
import { useSocketEvents } from "app/context";
import { useImageNavigation } from "app/hooks";
import { EventService, ImageService, StorageService } from "app/services";
import { ImageData, ImageTop, ImageVisual } from "./components";
import { ImageDataSectionsProvider } from "./context/ImageDataSectionsContext.tsx";

import style from "./ImageDetail.module.scss";


type ImageDetailPropsType =
  {
    readonly image: ImageOrSummary;
    readonly images: ImageOrSummary[];
    readonly viewMode: ViewMode;
    readonly onClose?: () => void;
  };

export default function ImageDetail({
  image,
  images,
  viewMode,
  onClose
}: ImageDetailPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const ref = useFocusTrap();
  const navigation = useImageNavigation({
    selectedImage: "metadata" in image ? image as Image : undefined,
    images,
    viewMode
  });
  const [ panelSizes, setPanelSizes ] = useState<number[]>(StorageService.getVisualizerPanelSizes());

  const imageEventChannels = useMemo(() =>
  {
    return [
      ChannelEnum.IMAGE_UPDATED,
      ChannelEnum.IMAGE_TAGS_UPDATED,
      ChannelEnum.IMAGE_FEATURES_UPDATED,
      ChannelEnum.IMAGE_DELETED
    ] as const;
  }, []);

  useSocketEvents(imageEventChannels, (event) =>
  {
    const imageId = EventService.computeEventEntityId<string>(event);
    if (event.channel === ChannelEnum.IMAGE_DELETED)
    {
      if (navigation.removeImage(imageId) === 0)
      {
        onClose?.();
      }
    }
    else if (navigation.containsImage(imageId))
    {
      ImageService.get({ id: imageId }).then((anImage) => navigation.updateImage(anImage)).catch(ToastService.apiCallError);
    }
  });

  useEffect(() =>
  {
    if (image)
    {
      ("metadata" in image ? Promise.resolve(image as Image) : ImageService.get({ id: image.id })).then(navigation.setSelectedImage).catch(() =>
      {
        onClose?.();
        ToastService.warning(t("message.notFoundImage"));
      });
    }
  }, [ image, navigation.setSelectedImage, onClose, t ]);

  function handleOnLayoutChanged(layout: Layout)
  {
    const size = Object.values(layout);
    StorageService.setVisualizerPanelSizes(size);
    setPanelSizes(size);
  }

  const handleOnKeyDown = getHotkeyHandler([
    [ "ArrowLeft", navigation.onPrevious ],
    [ "ArrowRight", navigation.onNext ]
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
        {imageData && (
          <ImageDataSectionsProvider image={imageData}>
            <div className={style.rightTop}>
              <ImageTop image={imageData} viewMode={viewMode} onClose={onClose}/>
            </div>
            <div className={style.rightBottom}>
              <ImageData image={imageData} viewMode={viewMode}/>
            </div>
          </ImageDataSectionsProvider>
        )}
      </Panel>
    </ResizableGroup>
  );
}
