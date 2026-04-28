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
  const [data, setData] = useState<ImageExplorerDataType>({ total: -1, images: [] });
  const [filterOrCollectionId, setFilterOrCollectionId] = useInterceptedState<FilterOrCollectionId>(viewData.filterOrCollectionId, (previousFilterOrCollectionId: FilterOrCollectionId, updatedFilterOrCollectionId: FilterOrCollectionId)=> {
    if (JSON.stringify(updatedFilterOrCollectionId) !== JSON.stringify(previousFilterOrCollectionId)) {
      if (isDefault === true) {
        StorageService.setMainViewTabData({ mode: viewData.mode, filterOrCollectionId: updatedFilterOrCollectionId });
      }
      // There should be now issue with the "handleOnRefresh()" call, because it only performs a state update through an updater callbacck
      handleOnRefresh();
      return updatedFilterOrCollectionId;
    }
    else {
      return previousFilterOrCollectionId;
    }
  });
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useInterceptedState<ViewMode>(viewData.mode, (previousViewMode: ViewMode, updatedViewMode: ViewMode) => {
    if (updatedViewMode !== previousViewMode) {
      if (isDefault === true) {
        StorageService.setMainViewTabData({ mode: updatedViewMode, filterOrCollectionId: viewData.filterOrCollectionId });
      }
      setViewMode(updatedViewMode);
      return updatedViewMode;
    }
    else {
      return previousViewMode;
    }
  });
  const [selectedImage, setSelectedImage] = useState<ImageOrSummary>();

  const onFetchData = useCallback((searchRange: SearchRange) => {
    setLoading(true);
    ImageService.searchImages({
      filter: "filter" in filterOrCollectionId ? filterOrCollectionId.filter : undefined,
      collectionId: "collectionId" in filterOrCollectionId ? filterOrCollectionId.collectionId : undefined,
      range: {
        take: searchRange.take,
        skip: searchRange.skip
      }
    }).then((result) => {
      setData({
        total: result.totalCount,
        images: result.items
      });
    }).catch((error) => {
      notifyApiCallError(error, "Can't fetch images");
    }).finally(() => {
      setLoading(false);
    });
  }, [filterOrCollectionId]);

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
          filterOrCollectionId={filterOrCollectionId}
          setFilterOrCollectionId={setFilterOrCollectionId}
          handleOnRefresh={handleOnRefresh}
          handleOnPin={handleOnPin}
          viewMode={viewMode}
          setViewMode={setViewMode}
          setZIndex={selectedImage === undefined}
        />
        <div className={style.contentContainer}>
          <Container>
            <ImagesContent
              loading={loading}
              data={data}
              onSelectedImage={handleOnSelectedImage}
              containerWidth={containerWidth}
              containerHeight={containerHeight}
              containerRef={containerRef}
              scrollRootRef={scrollRootRef}
              refreshTrigger={refreshTrigger}
              onFetchData={onFetchData}
              viewMode={viewMode}
            />
          </Container>
        </div>
      </div>
    </>
  );
}
