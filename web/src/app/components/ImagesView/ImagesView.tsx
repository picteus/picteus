import React, {
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import { Flex } from "@mantine/core";

import { SearchRange } from "@picteus/ws-client";

import {
  ChannelEnum,
  FilterOrCollectionId,
  ImageExplorerDataType,
  ImageWithCaption,
  ViewMode,
  ViewTabDataType
} from "types";
import { NotificationsService } from "utils";
import { useEventSocket, useImagesTabsContext } from "app/context";
import { useInterceptedState } from "app/hooks";
import { EventService, ImageService, StorageService } from "app/services";
import { Container, EmptyResults } from "app/components";
import { ControllerBar, ImagesContent, ImagesContentRefType } from "./components";

import style from "./ImagesView.module.scss";


type ImagesViewType = {
  viewData: ViewTabDataType | {viewMode: ViewMode, images: ImageWithCaption[]};
  isDefault: boolean;
  controlBarChildren?: ReactNode;
  onEmptyResults: () => ReactElement<typeof EmptyResults>;
};

export default function ImagesView({ viewData, isDefault, controlBarChildren, onEmptyResults }: ImagesViewType){
  const imagesContentRef = useRef<ImagesContentRefType>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const { addTab } = useImagesTabsContext();
  const [filterOrCollectionId, setFilterOrCollectionId] = useInterceptedState<FilterOrCollectionId>("filterOrCollectionId" in viewData ? viewData.filterOrCollectionId : {
    filter: {
      origin: {
        kind: "images",
        ids: viewData.images.map(image => image.id)
      }
    }
  });
  const hasFilterOrCollectionId = useMemo<boolean>(() => "filterOrCollectionId" in viewData, [viewData]);
  const pinnable = useMemo<boolean>(() => "pinnable" in viewData ? viewData.pinnable : false, [viewData]);
  const [images, setImages] = useState<ImageWithCaption[] | undefined>("images" in viewData ? viewData.images : undefined);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [viewMode, setViewMode] = useInterceptedState<ViewMode>("mode" in viewData ? viewData.mode : viewData.viewMode);
  const [displayRefreshAlert, setDisplayRefreshAlert] = useState<boolean>(false);
  const autoReloadImagesViews = useMemo<boolean>(() => StorageService.getAutoReloadImagesViews(), []);
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribeToSocketEvents, eventStore.getSocketEvent);

  useEffect(() => {
    if ("images" in viewData) {
      setImages(viewData.images);
      setFilterOrCollectionId({
        filter: {
          origin: {
            kind: "images",
            ids: viewData.images.map(image => image.id)
          }
        }
      });
    } else {
      setImages(undefined);
    }

    if ("filterOrCollectionId" in viewData) {
      setFilterOrCollectionId(viewData.filterOrCollectionId);
    }

    if ("mode" in viewData) {
      setViewMode(viewData.mode);
    } else if ("viewMode" in viewData) {
      setViewMode(viewData.viewMode);
    }

    handleOnRefresh();
  }, [viewData, setFilterOrCollectionId, setViewMode]);

  const handleOnRefresh = useCallback(() => {
    if (hasFilterOrCollectionId) {
      setRefreshTrigger(previousRefreshTrigger => previousRefreshTrigger + 1);
      setDisplayRefreshAlert(false);
    }
  }, [hasFilterOrCollectionId]);

  const onFetchData = useCallback((searchRange: SearchRange): Promise<ImageExplorerDataType> => {
    if (images !== undefined) {
      return Promise.resolve({ total: images.length, images });
    }
    return ImageService.searchImages({
      filter: "filter" in filterOrCollectionId ? filterOrCollectionId.filter : undefined,
      collectionId: "collectionId" in filterOrCollectionId ? filterOrCollectionId.collectionId : undefined,
      range: {
        take: searchRange.take,
        skip: searchRange.skip
      }
    }).then((result) => {
      return Promise.resolve<ImageExplorerDataType>({
        total: result.totalCount,
        images: result.items
      });
    }).catch((error) => {
      NotificationsService.apiCallError(error, "Can't fetch images");
      return Promise.resolve<ImageExplorerDataType>({
        total: 0,
        images: []
      });
    });
  }, [filterOrCollectionId, images]);

  useEffect(() => {
    if (event === undefined) {
      return;
    }
    if (event.channel === ChannelEnum.IMAGE_CREATED || event.channel === ChannelEnum.IMAGE_UPDATED || event.channel === ChannelEnum.IMAGE_DELETED) {
      if (autoReloadImagesViews) {
        if (imagesContentRef.current) {
          const imageId = EventService.computeEventEntityId<string>(event);
          if (event.channel === ChannelEnum.IMAGE_DELETED) {
            imagesContentRef.current.onImageDeleted(imageId);
          }
          else if (event.channel === ChannelEnum.IMAGE_UPDATED) {
            ImageService.get({id: imageId}).then(image=>imagesContentRef.current.onImageUpdated(image)).catch(NotificationsService.apiCallError);
          }
          else {
            handleOnRefresh();
          }
        }
      }
      else {
        setDisplayRefreshAlert(true);
      }
    }
  }, [event, autoReloadImagesViews, handleOnRefresh]);

  const handleOnFilterOrCollectionId = useCallback((updatedFilterOrCollectionId: FilterOrCollectionId) => {
    setFilterOrCollectionId(updatedFilterOrCollectionId);
    if (JSON.stringify(updatedFilterOrCollectionId) !== JSON.stringify(filterOrCollectionId)) {
      if (isDefault === true) {
        StorageService.setMainViewTabData({ mode: viewMode, pinnable, filterOrCollectionId: updatedFilterOrCollectionId });
      }
      handleOnRefresh();
    }
  }, [filterOrCollectionId, viewMode, pinnable, handleOnRefresh]);

  const handleOnViewMode = useCallback((updatedViewMode: ViewMode) => {
    setViewMode(updatedViewMode);
    if (isDefault === true) {
      StorageService.setMainViewTabData({ mode: updatedViewMode, pinnable, filterOrCollectionId });
    }
    handleOnRefresh();
  }, [pinnable, filterOrCollectionId, handleOnRefresh]);

  const handleOnPin = useMemo(() => {
    if (pinnable) {
      return () => {
        addTab({
          content: { title: "New tab", description: "" },
          data: { mode: "masonry", pinnable: true, filterOrCollectionId },
        });
      };
    }
    return undefined;
  }, [pinnable]);

  return (<Flex ref={containerRef} direction="column" className={style.container}>
    <ControllerBar
      children={controlBarChildren}
      initialFilterOrCollectionId={filterOrCollectionId}
      onFilterOrCollectionId={handleOnFilterOrCollectionId}
      withRefreshButton={hasFilterOrCollectionId}
      displayRefreshAlert={displayRefreshAlert}
      onRefresh={handleOnRefresh}
      viewMode={viewMode}
      onViewMode={handleOnViewMode}
      handleOnPin={handleOnPin}
    />
    <div ref={contentRef} className={style.content}>
      <div ref={scrollRootRef} className={style.scrolling}>
        <Container>
          <ImagesContent
            ref={imagesContentRef}
            viewMode={viewMode}
            containerRef={containerRef}
            contentRef={contentRef}
            scrollRootRef={scrollRootRef}
            onEmptyResults={onEmptyResults}
            onFetchData={onFetchData}
            refreshTrigger={refreshTrigger}
          />
        </Container>
      </div>
    </div>
  </Flex>);
}
