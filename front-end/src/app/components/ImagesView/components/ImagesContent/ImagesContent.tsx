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
import { useThrottledAsyncAction } from "app/hooks";
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
  refresh(): void;
};

type ImagesContentType = {

  viewMode: ViewMode;
  containerRef: RefObject<HTMLElement>;
  contentRef: RefObject<HTMLElement>;
  scrollRootRef: RefObject<HTMLElement>;
  onEmptyResults: () => ReactElement<typeof EmptyResults>;
  onFetchData: (searchRange: SearchRange) => Promise<ImageExplorerDataType>;
};

export const ImagesContent = forwardRef<ImagesContentRef, ImagesContentType>(({
  viewMode,
  containerRef,
  contentRef,
  scrollRootRef,
  onEmptyResults,
  onFetchData
}: ImagesContentType, ref: ForwardedRef<ImagesContentRef>) =>
{
  const [ pagination, setPagination ] = useState<PaginationType>({ currentPage: 1, take: imagesPerPage, skip: 0 });
  const [ totalImagesCount, setTotalImagesCount ] = useState<number>(-1);
  const [ accumulatedImages, setAccumulatedImages ] = useState<ImageOrSummary[]>([]);
  const allImagesLoadedRef = useRef<boolean>(false);
  const isFetchingDataRef = useRef<boolean>(false);
  const fetchSessionIdRef = useRef<number>(0);
  const onFetchDataRef = useRef<(searchRange: SearchRange) => Promise<ImageExplorerDataType>>(onFetchData);
  const isFirstRenderRef = useRef<boolean>(true);
  const previousTotalCountRef = useRef<number>(-1);
  const latestFirstImageIdRef = useRef<string | undefined>(undefined);

  const executeFetch = useCallback((targetPagination: PaginationType, isRefresh: boolean): Promise<void> =>
  {
    if (isFetchingDataRef.current && !isRefresh && targetPagination.currentPage > 1)
    {
      return Promise.resolve();
    }

    fetchSessionIdRef.current += 1;
    const currentSessionId = fetchSessionIdRef.current;
    isFetchingDataRef.current = true;

    return onFetchDataRef.current(targetPagination).then((data: ImageExplorerDataType): void =>
    {
      if (currentSessionId !== fetchSessionIdRef.current)
      {
        return;
      }

      isFetchingDataRef.current = false;

      const previousTotalCount = previousTotalCountRef.current;
      const previousFirstImageId = latestFirstImageIdRef.current;
      const isFirstImageDifferent = data.images.length > 0 && data.images[0].id !== previousFirstImageId;
      const hasNewImages = isRefresh && previousTotalCount !== -1 && (data.total > previousTotalCount || isFirstImageDifferent);

      previousTotalCountRef.current = data.total;
      if (data.images.length > 0)
      {
        latestFirstImageIdRef.current = data.images[0].id;
      }

      setTotalImagesCount(data.total);

      if (isRefresh || targetPagination.currentPage === 1)
      {
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
            if (newAccumulatedData.length >= data.total)
            {
              allImagesLoadedRef.current = true;
            }
            return newAccumulatedData;
          });
        }
        setPagination(targetPagination);
      }
    }).catch((): void =>
    {
      if (currentSessionId !== fetchSessionIdRef.current)
      {
        return;
      }
      isFetchingDataRef.current = false;
    });
  }, [ scrollRootRef ]);

  const {
    trigger: triggerThrottledRefresh,
    isRunning: isRefreshing
  } = useThrottledAsyncAction(async (): Promise<void> =>
    {
      await executeFetch({ currentPage: 1, take: imagesPerPage, skip: 0 }, true);
    },
    refreshIntervalInMilliseconds
  );

  useImperativeHandle(ref, (): ImagesContentRef =>
    ({
      onImageDeleted(imageId: string): void
      {
        setAccumulatedImages((previousValue: ImageOrSummary[]): ImageOrSummary[] =>
        {
          const index = previousValue.findIndex((image: ImageOrSummary): boolean => image.id === imageId);
          if (index !== -1)
          {
            const updatedAccumulatedImages = [ ...previousValue ];
            updatedAccumulatedImages.splice(index, 1);
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
            return updatedAccumulatedImages;
          }
          return previousValue;
        });
      },
      refresh(): void
      {
        triggerThrottledRefresh();
      }
    }), [ triggerThrottledRefresh ]);

  useEffect((): void =>
  {
    onFetchDataRef.current = onFetchData;
    if (isFirstRenderRef.current)
    {
      isFirstRenderRef.current = false;
      void executeFetch({ currentPage: 1, take: imagesPerPage, skip: 0 }, false);
    }
    else
    {
      // We fetch immediately when the query/filter changes
      void executeFetch({ currentPage: 1, take: imagesPerPage, skip: 0 }, false);
    }
  }, [ onFetchData, executeFetch ]);

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
    }
    else
    {
      const nextPagination: PaginationType = {
        currentPage: pagination.currentPage + 1,
        take: imagesPerPage,
        skip: pagination.currentPage * imagesPerPage
      };

      void executeFetch(nextPagination, false);
    }
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

  return imagesCountIndicator;
});
ImagesContent.displayName = "ImagesContent";
