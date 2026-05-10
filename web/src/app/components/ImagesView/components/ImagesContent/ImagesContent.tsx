import React, { ReactElement, RefObject, useCallback, useEffect, useRef, useState } from "react";
import { Box, Portal } from "@mantine/core";

import { SearchRange } from "@picteus/ws-client";

import { ImageExplorerDataType, ImageOrSummary, ViewMode } from "types";
import { EmptyResults, ImageGallery, ImageMasonry, ImageTable, OverlayIndicator } from "app/components";

import style from "./ImagesContent.module.scss";


const imagesPerPage = 100;

type PaginationType = SearchRange & {
  currentPage: number;
};

type ImagesContentType = {
  viewMode: ViewMode;
  containerRef: RefObject<HTMLElement>;
  contentRef: RefObject<HTMLElement>;
  scrollRootRef: RefObject<HTMLElement>;
  onEmptyResults: () => ReactElement<typeof EmptyResults>;
  onFetchData: (searchRange: SearchRange) => Promise<ImageExplorerDataType>;
  refreshTrigger: number;
};

export default function ImagesContent({
                         viewMode,
                         containerRef,
                         contentRef,
                         scrollRootRef,
                         onEmptyResults,
                         onFetchData,
                         refreshTrigger,
                       }: ImagesContentType) {
  const [pagination, setPagination] = useState<PaginationType>({ currentPage: 1, take: imagesPerPage, skip: 0 });
  const [totalImagesCount, setTotalImagesCount] = useState<number>(-1);
  const [accumulatedImages, setAccumulatedImages] = useState<ImageOrSummary[]>([]);
  const allImagesLoadedRef = useRef<boolean>(false);
  const isFetchingDataRef = useRef<boolean>(false);
  const fetchSessionIdRef = useRef<number>(0);
  const onFetchDataRef = useRef<(searchRange: SearchRange) => Promise<ImageExplorerDataType>>(onFetchData);

  useEffect(() => {
    if (refreshTrigger >= 1) {
      allImagesLoadedRef.current = false;
      fetchSessionIdRef.current += 1;
      isFetchingDataRef.current = false;
      scrollRootRef.current.scrollTo(0, 0);
      setTotalImagesCount(-1);
      setAccumulatedImages([]);
      setPagination({ currentPage: 1, take: imagesPerPage, skip: 0 });
    }
  }, [refreshTrigger]);

  useEffect(() => {
    onFetchDataRef.current = onFetchData;
  }, [onFetchData]);

  useEffect(() => {
    if (isFetchingDataRef.current === false && allImagesLoadedRef.current === false) {
      const currentSessionId = fetchSessionIdRef.current;
      isFetchingDataRef.current = true;
      onFetchDataRef.current(pagination).then((data: ImageExplorerDataType)=> {
        if (currentSessionId !== fetchSessionIdRef.current) {
          return;
        }
        isFetchingDataRef.current = false;
        setTotalImagesCount(data.total);
        if (data.images.length > 0) {
          setAccumulatedImages((previousAccumulatedImages) => {
            const newAccumulatedData = [...previousAccumulatedImages, ...data.images];
            if (newAccumulatedData.length >= data.total) {
              allImagesLoadedRef.current = true;
            }
            return newAccumulatedData;
          });
        }
      });
    }
  }, [pagination]);

  const loadMore = useCallback(() => {
    if (isFetchingDataRef.current || allImagesLoadedRef.current === true) {
      return;
    }
    setPagination(previousPagination => {
      if (totalImagesCount !== -1) {
        const maximumPage = Math.ceil(totalImagesCount / previousPagination.take);
        if (previousPagination.currentPage >= maximumPage) {
          allImagesLoadedRef.current = true;
          return previousPagination;
        }
      }
      return {
        currentPage: previousPagination.currentPage + 1,
        take: imagesPerPage,
        skip: previousPagination.currentPage * imagesPerPage
      };
    });
  }, [totalImagesCount]);

  if (totalImagesCount === 0) {
    return onEmptyResults();
  }

  const imagesCountIndicator = totalImagesCount > 0 ? (
    <Portal target={contentRef.current}>
      <Box className={style.imagesCountIndicator}>
        <OverlayIndicator text={`${accumulatedImages.length} / ${totalImagesCount}`} />
      </Box>
    </Portal>
  ) : null;

  if (viewMode === "masonry") {
    return (
      <>
        <ImageMasonry images={accumulatedImages} loadMore={loadMore} containerRef={containerRef}
                             scrollRootRef={scrollRootRef} />
        {imagesCountIndicator}
      </>
    );
  }

  if (viewMode === "gallery") {
    return (
      <>
        <ImageGallery images={accumulatedImages} loadMore={loadMore} containerRef={containerRef}
                             scrollRootRef={scrollRootRef} />
        {imagesCountIndicator}
      </>
    );
  }

  if (viewMode === "table") {
    return (
      <>
        <ImageTable images={accumulatedImages} loadMore={loadMore} containerRef={containerRef} />
        {imagesCountIndicator}
      </>
    );
  }

  return <></>;
}
