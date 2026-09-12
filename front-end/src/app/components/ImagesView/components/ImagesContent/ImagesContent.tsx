import React, {
  ForwardedRef,
  forwardRef,
  ReactElement,
  RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import { Box, LoadingOverlay, Portal } from "@mantine/core";

import { SearchRange } from "@picteus/ws-client";

import { ImageExplorerDataType, ImageOrSummary, ViewMode } from "types";
import { EmptyResults, ImageGallery, ImageMasonry, ImageTable, OverlayIndicator } from "app/components";

import style from "./ImagesContent.module.scss";


const imagesPerPage = 100;
const refreshIntervalInMilliseconds = 1_000;

type PaginationType = SearchRange & {
  currentPage: number;
};

export type ImagesContentRef = {
  onImageDeleted(imageId: string): void;
  onImageUpdated(image: ImageOrSummary): void;
}

type ImagesContentType = {
  viewMode: ViewMode;
  containerRef: RefObject<HTMLElement>;
  contentRef: RefObject<HTMLElement>;
  scrollRootRef: RefObject<HTMLElement>;
  onEmptyResults: () => ReactElement<typeof EmptyResults>;
  onFetchData: (searchRange: SearchRange) => Promise<ImageExplorerDataType>;
  refreshTrigger: number;
};

export const ImagesContent = forwardRef<ImagesContentRef, ImagesContentType>(({
  viewMode,
  containerRef,
  contentRef,
  scrollRootRef,
  onEmptyResults,
  onFetchData,
  refreshTrigger
}: ImagesContentType, ref: ForwardedRef<ImagesContentRef>) =>
{
  const [ pagination, setPagination ] = useState<PaginationType>({ currentPage: 1, take: imagesPerPage, skip: 0 });
  const [ totalImagesCount, setTotalImagesCount ] = useState<number>(-1);
  const [ accumulatedImages, setAccumulatedImages ] = useState<ImageOrSummary[]>([]);
  const [ isRefreshing, setIsRefreshing ] = useState<boolean>(false);
  const allImagesLoadedRef = useRef<boolean>(false);
  const isFetchingDataRef = useRef<boolean>(false);
  const fetchSessionIdRef = useRef<number>(0);
  const onFetchDataRef = useRef<(searchRange: SearchRange) => Promise<ImageExplorerDataType>>(onFetchData);
  const isFirstRenderRef = useRef<boolean>(true);
  const lastRefreshTimestampRef = useRef<number>(0);
  const hasPendingRefreshRef = useRef<boolean>(false);
  const refreshTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerThrottledRefreshRef = useRef<() => void>(() => {});
  const totalImagesCountRef = useRef<number>(-1);
  const accumulatedImagesRef = useRef<ImageOrSummary[]>([]);

  useImperativeHandle(ref, (): ImagesContentRef =>
  {
    return {
      onImageDeleted(imageId: string): void
      {
        setAccumulatedImages((previousValue: ImageOrSummary[]): ImageOrSummary[] =>
        {
          const index = previousValue.findIndex((image: ImageOrSummary): boolean => image.id === imageId);
          if (index !== -1)
          {
            const updatedAccumulatedImages = [ ...previousValue ];
            updatedAccumulatedImages.splice(index, 1);
            accumulatedImagesRef.current = updatedAccumulatedImages;
            return updatedAccumulatedImages;
          }
          return previousValue;
        });
      },
      onImageUpdated(image: ImageOrSummary): void
      {
        setAccumulatedImages((previousValue: ImageOrSummary[]): ImageOrSummary[] =>
        {
          const index = previousValue.findIndex((existingImage: ImageOrSummary): boolean => existingImage.id === image.id);
          if (index !== -1)
          {
            const updatedAccumulatedImages = [ ...previousValue ];
            updatedAccumulatedImages.splice(index, 1, image);
            accumulatedImagesRef.current = updatedAccumulatedImages;
            return updatedAccumulatedImages;
          }
          return previousValue;
        });
      }
    };
  }, []);

  const executeFetch = useCallback((targetPagination: PaginationType, isRefresh: boolean): void =>
  {
    if (isFetchingDataRef.current && !isRefresh)
    {
      return;
    }

    fetchSessionIdRef.current += 1;
    const currentSessionId = fetchSessionIdRef.current;
    isFetchingDataRef.current = true;

    if (isRefresh)
    {
      setIsRefreshing(true);
    }

    onFetchDataRef.current(targetPagination).then((data: ImageExplorerDataType): void =>
    {
      if (currentSessionId !== fetchSessionIdRef.current)
      {
        return;
      }

      isFetchingDataRef.current = false;
      if (isRefresh)
      {
        setIsRefreshing(false);
      }

      const previousTotal = totalImagesCountRef.current;
      const previousImages = accumulatedImagesRef.current;
      const hasNewImages = isRefresh && previousTotal !== -1 && (
        data.total > previousTotal ||
        data.images.some((image: ImageOrSummary): boolean =>
        {
          return !previousImages.some((previousImage: ImageOrSummary): boolean => previousImage.id === image.id);
        })
      );

      totalImagesCountRef.current = data.total;
      setTotalImagesCount(data.total);

      if (isRefresh || targetPagination.currentPage === 1)
      {
        accumulatedImagesRef.current = data.images;
        setAccumulatedImages(data.images);
        allImagesLoadedRef.current = data.images.length >= data.total;
        setPagination(targetPagination);

        // We scroll to the top when new images are detected
        if (hasNewImages)
        {
          scrollRootRef.current?.scrollTo(0, 0);
          requestAnimationFrame((): void =>
          {
            if (scrollRootRef.current)
            {
              scrollRootRef.current.scrollTop = 0;
            }
          });
        }
      }
      else
      {
        if (data.images.length > 0)
        {
          setAccumulatedImages((previousAccumulatedImages: ImageOrSummary[]): ImageOrSummary[] =>
          {
            const newAccumulatedData = [ ...previousAccumulatedImages, ...data.images ];
            accumulatedImagesRef.current = newAccumulatedData;
            if (newAccumulatedData.length >= data.total)
            {
              allImagesLoadedRef.current = true;
            }
            return newAccumulatedData;
          });
        }
        setPagination(targetPagination);
      }

      // We check if another refresh was requested while fetching
      if (hasPendingRefreshRef.current)
      {
        triggerThrottledRefreshRef.current();
      }
    }).catch((): void =>
    {
      if (currentSessionId !== fetchSessionIdRef.current)
      {
        return;
      }
      isFetchingDataRef.current = false;
      if (isRefresh)
      {
        setIsRefreshing(false);
      }

      if (hasPendingRefreshRef.current)
      {
        triggerThrottledRefreshRef.current();
      }
    });
  }, [ scrollRootRef ]);

  const triggerThrottledRefresh = useCallback((): void =>
  {
    const currentTimestamp = Date.now();
    const elapsedMilliseconds = currentTimestamp - lastRefreshTimestampRef.current;

    // We verify if a data fetch is already in progress
    if (isFetchingDataRef.current)
    {
      hasPendingRefreshRef.current = true;
      return;
    }

    // We execute immediately if at least "refreshIntervalInMilliseconds" milliseconds has elapsed since the previous refresh
    if (elapsedMilliseconds >= refreshIntervalInMilliseconds)
    {
      if (refreshTimeoutIdRef.current !== null)
      {
        clearTimeout(refreshTimeoutIdRef.current);
        refreshTimeoutIdRef.current = null;
      }
      hasPendingRefreshRef.current = false;
      lastRefreshTimestampRef.current = currentTimestamp;
      executeFetch({ currentPage: 1, take: imagesPerPage, skip: 0 }, true);
    }
    else
    {
      // We mark a pending refresh and schedule a trailing execution
      hasPendingRefreshRef.current = true;
      if (refreshTimeoutIdRef.current === null)
      {
        const remainingDelayInMilliseconds = refreshIntervalInMilliseconds - elapsedMilliseconds;
        refreshTimeoutIdRef.current = setTimeout((): void =>
        {
          refreshTimeoutIdRef.current = null;
          if (hasPendingRefreshRef.current)
          {
            triggerThrottledRefreshRef.current();
          }
        }, remainingDelayInMilliseconds);
      }
    }
  }, [ executeFetch ]);

  useEffect(() =>
  {
    triggerThrottledRefreshRef.current = triggerThrottledRefresh;
  }, [ triggerThrottledRefresh ]);

  useEffect(() =>
  {
    return (): void =>
    {
      if (refreshTimeoutIdRef.current !== null)
      {
        clearTimeout(refreshTimeoutIdRef.current);
      }
    };
  }, []);

  useEffect(() =>
  {
    onFetchDataRef.current = onFetchData;
  }, [ onFetchData ]);

  useEffect(() =>
  {
    if (isFirstRenderRef.current)
    {
      isFirstRenderRef.current = false;
      lastRefreshTimestampRef.current = Date.now();
      executeFetch({ currentPage: 1, take: imagesPerPage, skip: 0 }, false);
      return;
    }

    if (refreshTrigger >= 1)
    {
      triggerThrottledRefresh();
    }
  }, [ refreshTrigger, executeFetch, triggerThrottledRefresh ]);

  const loadMore = useCallback((): void =>
  {
    if (isFetchingDataRef.current || allImagesLoadedRef.current || totalImagesCount === -1)
    {
      return;
    }

    const maximumPage = Math.ceil(totalImagesCount / pagination.take);
    if (pagination.currentPage >= maximumPage)
    {
      allImagesLoadedRef.current = true;
      return;
    }

    const nextPagination: PaginationType = {
      currentPage: pagination.currentPage + 1,
      take: imagesPerPage,
      skip: pagination.currentPage * imagesPerPage
    };

    executeFetch(nextPagination, false);
  }, [ totalImagesCount, pagination, executeFetch ]);

  const imagesCountIndicator = (totalImagesCount > 0 || isRefreshing) ? (
    <Portal target={contentRef.current}>
      <Box className={style.imagesCountIndicator}>
        <LoadingOverlay
          visible={isRefreshing}
          zIndex={10}
          overlayProps={{ radius: "md", blur: 1 }}
          loaderProps={{ size: "xs", type: "dots" }}
        />
        {totalImagesCount > 0 ? (
          <OverlayIndicator text={`${accumulatedImages.length} / ${totalImagesCount}`}/>
        ) : (
          <OverlayIndicator text="..."/>
        )}
      </Box>
    </Portal>
  ) : null;

  if (totalImagesCount === 0)
  {
    return (
      <>
        {onEmptyResults()}
        {imagesCountIndicator}
      </>
    );
  }

  if (viewMode === "masonry")
  {
    return (
      <>
        <ImageMasonry images={accumulatedImages} loadMore={loadMore} containerRef={containerRef}
                      scrollRootRef={scrollRootRef}/>
        {imagesCountIndicator}
      </>
    );
  }

  if (viewMode === "gallery")
  {
    return (
      <>
        <ImageGallery images={accumulatedImages} loadMore={loadMore} containerRef={containerRef}
                      scrollRootRef={scrollRootRef}/>
        {imagesCountIndicator}
      </>
    );
  }

  if (viewMode === "table")
  {
    return (
      <>
        <ImageTable images={accumulatedImages} loadMore={loadMore} containerRef={containerRef}/>
        {imagesCountIndicator}
      </>
    );
  }

  return <>{imagesCountIndicator}</>;
});
ImagesContent.displayName = "ImagesContent";
