import React, { ReactElement, RefObject, useCallback, useEffect, useRef, useState } from "react";

import { SearchRange } from "@picteus/ws-client";

import { ImageExplorerDataType, ImageOrSummary, ViewMode } from "types";
import { EmptyResults, ImageGallery, ImageMasonry, ImageTable } from "app/components";


const imagesPerPage = 100;

type PaginationType = SearchRange & {
  currentPage: number;
};

type ImagesContentType = {
  viewMode: ViewMode;
  containerRef: RefObject<HTMLElement>;
  scrollRootRef: RefObject<HTMLElement>;
  onEmptyResults: () => ReactElement<typeof EmptyResults>;
  displayDetailInContainer: boolean;
  onFetchData: (searchRange: SearchRange) => Promise<ImageExplorerDataType>;
  onSelectedImage: (image: ImageOrSummary) => void;
  refreshTrigger: number;
};

export default function ImagesContent({
                         viewMode,
                         containerRef,
                         scrollRootRef,
                         onEmptyResults,
                         displayDetailInContainer,
                         onFetchData,
                         onSelectedImage,
                         refreshTrigger,
                       }: ImagesContentType) {
  const [pagination, setPagination] = useState<PaginationType>({ currentPage: 1, take: imagesPerPage, skip: 0 });
  const [totalImagesCount, setTotalImagesCount] = useState<number>(-1);
  const [accumulatedImages, setAccumulatedImages] = useState<ImageOrSummary[]>([]);
  const isFetchingDataRef = useRef<boolean>(false);
  const fetchSessionIdRef = useRef<number>(0);
  const onFetchDataRef = useRef<(searchRange: SearchRange) => Promise<ImageExplorerDataType>>(onFetchData);

  useEffect(() => {
    fetchSessionIdRef.current += 1;
    isFetchingDataRef.current = false;
    scrollRootRef.current.scrollTo(0, 0);
    setTotalImagesCount(-1);
    setAccumulatedImages([]);
    setPagination({ currentPage: 1, take: imagesPerPage, skip: 0 });
  }, [refreshTrigger]);

  useEffect(() => {
    onFetchDataRef.current = onFetchData;
  }, [onFetchData]);

  useEffect(() => {
    if (isFetchingDataRef.current === false) {
      const currentSessionId = fetchSessionIdRef.current;
      isFetchingDataRef.current = true;
      onFetchDataRef.current(pagination).then((data: ImageExplorerDataType)=> {
        if (currentSessionId !== fetchSessionIdRef.current) {
          return;
        }
        isFetchingDataRef.current = false;
        setTotalImagesCount(data.total);
        if (data.images.length > 0) {
          setAccumulatedImages((previousData) => ([...previousData, ...data.images]));
        }
      });
    }
  }, [pagination]);

  const loadMore = useCallback(() => {
    if (isFetchingDataRef.current) {
      return;
    }
    if (totalImagesCount !== -1) {
      const maximumPage = Math.ceil(totalImagesCount / pagination.take);
      if (pagination.currentPage >= maximumPage) {
        return;
      }
    }
    setPagination(previousPagination => ({
      currentPage: previousPagination.currentPage + 1,
      take: imagesPerPage,
      skip: previousPagination.currentPage * imagesPerPage
    }));
  }, [pagination, totalImagesCount]);

  if (totalImagesCount === 0) {
    return onEmptyResults();
  }

  if (viewMode === "masonry") {
    return <ImageMasonry images={accumulatedImages} onSelectedImage={onSelectedImage} loadMore={loadMore}
                         containerRef={containerRef}
                         scrollRootRef={scrollRootRef} displayDetailInContainer={displayDetailInContainer} />;
  }

  if (viewMode === "gallery") {
    return <ImageGallery images={accumulatedImages} onSelectedImage={onSelectedImage} loadMore={loadMore}
                         containerRef={containerRef} scrollRootRef={scrollRootRef}
                         displayDetailInContainer={displayDetailInContainer} />;
  }

  if (viewMode === "table") {
    return <ImageTable images={accumulatedImages} onSelectedImage={onSelectedImage} loadMore={loadMore} containerRef={containerRef}/>;
  }

  return <></>
}
