import React, { ReactElement, ReactNode, RefObject, useCallback, useEffect, useState } from "react";

import { SearchRange } from "@picteus/ws-client";

import {
  FilterOrCollectionId,
  ImageExplorerDataType,
  ImageOrSummary,
  ImageWithCaption,
  ViewMode,
  ViewTabDataType
} from "types";
import { notifyApiCallError } from "utils";
import { useGalleryTabsContext } from "app/context";
import { useInterceptedState } from "app/hooks";
import { ImageService, StorageService } from "app/services";
import { Container, EmptyResults } from "app/components";
import { ControllerBar, ImagesContent } from "./components";

import style from "./ImagesView.module.scss";


type ImagesViewType = {
  viewData: ViewTabDataType | {viewMode: ViewMode, images: ImageWithCaption[]};
  isDefault: boolean;
  containerRef: RefObject<HTMLElement>;
  controlBarChildren?: ReactNode;
  stickyControlBar: boolean;
  onEmptyResults: () => ReactElement<typeof EmptyResults>;
  displayDetailInContainer: boolean;
  scrollRootRef: RefObject<HTMLElement>;
};

export default function ImagesView({ viewData, isDefault, containerRef, controlBarChildren, stickyControlBar, onEmptyResults, displayDetailInContainer, scrollRootRef }: ImagesViewType){
  const { addTab } = useGalleryTabsContext();
  const hasFilterOrCollectionId = "filterOrCollectionId" in viewData;
  const pinnable = "pinnable" in viewData ? viewData.pinnable : false;
  const [filterOrCollectionId, setFilterOrCollectionId] = useInterceptedState<FilterOrCollectionId>(hasFilterOrCollectionId === true ? viewData.filterOrCollectionId : {
    filter: {
      origin: {
        kind: "images",
        ids: viewData.images.map(image => image.id)
      }
    }
  });
  const [images, setImages] = useState<ImageWithCaption[] | undefined>("images" in viewData ? viewData.images : undefined);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [viewMode, setViewMode] = useInterceptedState<ViewMode>("mode" in viewData ? viewData.mode : viewData.viewMode);
  const [selectedImage, setSelectedImage] = useState<ImageOrSummary>();

  useEffect(() => {
    if ("images" in viewData) {
      setImages(viewData.images);
      handleOnRefresh();
    }
  }, [viewData]);

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
      notifyApiCallError(error, "Can't fetch images");
      return Promise.resolve<ImageExplorerDataType>({
        total: 0,
        images: []
      });
    });
  }, [filterOrCollectionId, images]);

  const handleOnSelectedImage = useCallback((image: ImageOrSummary) => {
    setSelectedImage(image);
  }, []);

  function handleOnFilterOrCollectionId(updatedFilterOrCollectionId: FilterOrCollectionId) {
    setFilterOrCollectionId(updatedFilterOrCollectionId);
    if (JSON.stringify(updatedFilterOrCollectionId) !== JSON.stringify(filterOrCollectionId)) {
      if (isDefault === true) {
        StorageService.setMainViewTabData({ mode: viewMode, pinnable: pinnable, filterOrCollectionId: updatedFilterOrCollectionId });
      }
      handleOnRefresh();
    }
  }

  function handleOnViewMode(updatedViewMode: ViewMode) {
    setViewMode(updatedViewMode);
    if (isDefault === true) {
      StorageService.setMainViewTabData({ mode: updatedViewMode, pinnable: pinnable, filterOrCollectionId });
    }
    handleOnRefresh();
  }

  function handleOnRefresh() {
    setRefreshTrigger(previousRefreshTrigger => previousRefreshTrigger + 1);
  }

  function handleOnPin() {
    addTab({
      content: { title: "New tab", description: "" },
      data: { mode: "masonry", pinnable: true, filterOrCollectionId },
    });
  }

  return (<div className={style.container}>
    <ControllerBar
      children={controlBarChildren}
      initialFilterOrCollectionId={filterOrCollectionId}
      onFilterOrCollectionId={handleOnFilterOrCollectionId}
      onRefresh={hasFilterOrCollectionId === true ? handleOnRefresh : undefined}
      viewMode={viewMode}
      onViewMode={handleOnViewMode}
      handleOnPin={pinnable === true ? handleOnPin : undefined}
      setZIndex={stickyControlBar === false ? undefined : (selectedImage === undefined)}
    />
    <div className={style.contentContainer}>
      <Container>
        <ImagesContent
          viewMode={viewMode}
          containerRef={containerRef}
          scrollRootRef={scrollRootRef}
          onEmptyResults={onEmptyResults}
          displayDetailInContainer={displayDetailInContainer}
          onFetchData={onFetchData}
          onSelectedImage={handleOnSelectedImage}
          refreshTrigger={refreshTrigger}
        />
      </Container>
    </div>
  </div>);
}
