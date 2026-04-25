import React, { RefObject, useCallback, useState } from "react";

import { FilterOrCollectionId, ImageExplorerDataType, ImageOrSummary, ViewMode, ViewTabDataType } from "types";
import { notifyApiCallError } from "utils";
import { useGalleryTabsContext } from "app/context";
import { ImageService, StorageService } from "app/services";
import { Container } from "app/components";
import { ImagesContent, PaginationType, TopBar } from "./components";

import style from "./GalleryView.module.scss";


type GalleryViewProps = {
  viewData: ViewTabDataType;
  isDefault: boolean;
  containerWidth: number;
  containerHeight: number;
  containerRef: RefObject<HTMLElement>;
  scrollRootRef: RefObject<HTMLElement>;
};

export default function GalleryView({ viewData, isDefault, containerWidth, containerHeight, containerRef, scrollRootRef }: GalleryViewProps) {
  const { addTab } = useGalleryTabsContext();
  const [data, setData] = useState<ImageExplorerDataType>({ currentPage: 1, total: 0, images: [] });
  const [filterOrCollectionId, setFilterOrCollectionId] = useState<FilterOrCollectionId>(viewData.filterOrCollectionId);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>(viewData.mode);
  const [selectedImage, setSelectedImage] = useState<ImageOrSummary>();
  const setFilterOrCollectionIdWrapper = useCallback((filterOrCollectionId: FilterOrCollectionId) => {
    if (isDefault === true) {
      StorageService.setMainViewTabData({ mode: viewData.mode, filterOrCollectionId });
    }
    setFilterOrCollectionId(filterOrCollectionId);
  }, [viewData]);
  const setViewModeWrapper = useCallback((viewMode: ViewMode) => {
    if (isDefault === true) {
      StorageService.setMainViewTabData({ mode: viewMode, filterOrCollectionId: viewData.filterOrCollectionId });
    }
    setViewMode(viewMode);
  }, [viewData]);

  async function loadData(pagination: PaginationType) {
    if (filterOrCollectionId === undefined) {
      return;
    }
    setLoading(true);
    try {
      const apiResponse = await ImageService.searchImages({
        filter: filterOrCollectionId.filter,
        collectionId: filterOrCollectionId.filter !== undefined ? undefined : filterOrCollectionId.collectionId,
        range: {
          take: pagination.take,
          skip: pagination.skip,
        },
      });
      setData({
        total: apiResponse.totalCount,
        currentPage: pagination.currentPage,
        images: apiResponse.items,
      });
    }
    catch (error) {
      notifyApiCallError(error, "Can't fetch images");
    }
    finally {
      setLoading(false);
    }
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
          filterOrCollectionId={viewData.filterOrCollectionId}
          setFilterOrCollectionId={setFilterOrCollectionIdWrapper}
          handleOnRefresh={handleOnRefresh}
          handleOnPin={handleOnPin}
          viewMode={viewMode}
          setViewMode={setViewModeWrapper}
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
              filterOrCollectionId={filterOrCollectionId}
              refreshTrigger={refreshTrigger}
              onFetchData={loadData}
              viewMode={viewMode}
            />
          </Container>
        </div>
      </div>
    </>
  );
}
