import React, { RefObject, useCallback, useState } from "react";

import { SearchRange } from "@picteus/ws-client";

import { FilterOrCollectionId, ImageExplorerDataType, ImageOrSummary, ViewMode, ViewTabDataType } from "types";
import { notifyApiCallError } from "utils";
import { useGalleryTabsContext } from "app/context";
import { useInterceptedState } from "app/hooks";
import { ImageService, StorageService } from "app/services";
import { Container } from "app/components";
import { ImagesContent, TopBar } from "./components";

import style from "./GalleryView.module.scss";


type GalleryViewProps = {
  viewData: ViewTabDataType;
  isDefault: boolean;
  containerWidth: number;
  containerHeight: number;
  containerRef: RefObject<HTMLElement>;
  scrollRootRef: RefObject<HTMLElement>;
};

export default function GalleryView({ viewData, isDefault, containerWidth, containerHeight, containerRef, scrollRootRef }: GalleryViewProps){
  const { addTab } = useGalleryTabsContext();
  const [filterOrCollectionId, setFilterOrCollectionId] = useInterceptedState<FilterOrCollectionId>(viewData.filterOrCollectionId);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [viewMode, setViewMode] = useInterceptedState<ViewMode>(viewData.mode);
  const [selectedImage, setSelectedImage] = useState<ImageOrSummary>();

  const onFetchData = useCallback((searchRange: SearchRange): Promise<ImageExplorerDataType> => {
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
  }, [filterOrCollectionId]);

  function handleOnFilterOrCollectionId(updatedFilterOrCollectionId: FilterOrCollectionId) {
    setFilterOrCollectionId(updatedFilterOrCollectionId);
    if (JSON.stringify(updatedFilterOrCollectionId) !== JSON.stringify(filterOrCollectionId)) {
      if (isDefault === true) {
        StorageService.setMainViewTabData({ mode: viewData.mode, filterOrCollectionId: updatedFilterOrCollectionId });
      }
      handleOnRefresh();
    }
  }
  function handleOnViewMode(updatedViewMode: ViewMode) {
    setViewMode(updatedViewMode);
    if (isDefault === true) {
      StorageService.setMainViewTabData({ mode: updatedViewMode, filterOrCollectionId });
    }
    handleOnRefresh();
  }

  function handleOnRefresh() {
    setRefreshTrigger(value => value + 1);
  }

  function handleOnPin() {
    addTab({
      type: "View",
      content: { title: "New tab", description: "" },
      data: { mode: "masonry", filterOrCollectionId },
    });
  }

  const handleOnSelectedImage = useCallback((image: ImageOrSummary) => {
    setSelectedImage(image);
  }, []);

  return (
    <>
      <div className={style.container}>
        <TopBar
          initialFilterOrCollectionId={filterOrCollectionId}
          onFilterOrCollectionId={handleOnFilterOrCollectionId}
          onRefresh={handleOnRefresh}
          viewMode={viewMode}
          onViewMode={handleOnViewMode}
          handleOnPin={handleOnPin}
          setZIndex={selectedImage === undefined}
        />
        <div className={style.contentContainer}>
          <Container>
            <ImagesContent
              viewMode={viewMode}
              containerWidth={containerWidth}
              containerHeight={containerHeight}
              containerRef={containerRef}
              scrollRootRef={scrollRootRef}
              onFetchData={onFetchData}
              onSelectedImage={handleOnSelectedImage}
              refreshTrigger={refreshTrigger}
            />
          </Container>
        </div>
      </div>
    </>
  );
}
