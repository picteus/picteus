import React, { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { SearchRange } from "@picteus/ws-client";

import { ImageExplorerDataType, ImageOrSummary, ViewMode } from "types";
import { ROUTES } from "utils";
import { RepositoriesService } from "app/services";
import { EmptyResults, ImageGallery, ImageMasonry, ImageTable } from "app/components";


type PaginationType = SearchRange & {
  currentPage: number;
};

type ImagesContentType = {
  loading: boolean;
  data: ImageExplorerDataType;
  onSelectedImage: (image: ImageOrSummary) => void;
  containerWidth: number;
  containerHeight: number;
  containerRef: RefObject<HTMLElement>;
  scrollRootRef: RefObject<HTMLElement>;
  refreshTrigger: number;
  onFetchData: (searchRange: SearchRange) => void;
  viewMode: ViewMode;
};

export default function ImagesContent({
                         loading,
                         data,
                         onSelectedImage,
                         containerWidth,
                         containerHeight,
                         containerRef,
                         scrollRootRef,
                         refreshTrigger,
                         onFetchData,
                         viewMode,
                       }: ImagesContentType) {
  const imagesPerPage = 100;
  const defaultPagination = { currentPage: 1, take: imagesPerPage, skip: 0 };
  const [t] = useTranslation();
  const navigate = useNavigate();
  const [pagination, setPagination] = useState<PaginationType>(defaultPagination);
  const [accumulatedData, setAccumulatedData] = useState<ImageOrSummary[]>([]);
  const isLoadingMoreRef = useRef<boolean>(false);

  useEffect(() => {
    scrollRootRef.current.scrollTo(0, 0);
    setAccumulatedData([]);
    setPagination(defaultPagination);
  }, [refreshTrigger, viewMode]);

  useEffect(() => {
    onFetchData(pagination);
  }, [pagination]);

  useEffect(() => {
    isLoadingMoreRef.current = false;
    setAccumulatedData((previousData) => {
      return [...previousData, ...data.images];
    });
  }, [data]);

  const loadMore = useCallback(() => {
    if (isLoadingMoreRef.current === false) {
      isLoadingMoreRef.current = true;
      if (data.total !== -1) {
        const maximumPage = Math.ceil(data.total / pagination.take);
        if (pagination.currentPage >= maximumPage) {
          isLoadingMoreRef.current = false;
          return;
        }
      }
      setPagination(previousValue => ({
        currentPage: previousValue.currentPage + 1,
        take: imagesPerPage,
        skip: previousValue.currentPage * imagesPerPage
      }));
    }
  }, [pagination, data.total]);

  if (loading === false && data.total === 0) {
    const repositoriesExists = RepositoriesService.list().length > 0;
    return (
      <EmptyResults
        icon={<IconPhotoSearch size={140} stroke={1} />}
        description={t(repositoriesExists ? "emptyImages.description" : "emptyImages.descriptionNoRepository")}
        title={t("emptyImages.title")}
        buttonText={t("emptyImages.buttonTextNoRepository")}
        buttonAction={repositoriesExists ? undefined : () => navigate(ROUTES.repositories)}
      />
    );
  }

  if (viewMode === "gallery") {
    return <ImageGallery images={accumulatedData} onSelectedImage={onSelectedImage} loadMore={loadMore}
                         containerHeight={containerHeight} containerRef={containerRef} scrollRootRef={scrollRootRef}
    />;
  }

  if (viewMode === "table") {
    return <ImageTable images={accumulatedData} onSelectedImage={onSelectedImage} loadMore={loadMore} containerWidth={containerWidth} containerRef={containerRef}/>;
  }

  return containerRef && <ImageMasonry images={accumulatedData} onSelectedImage={onSelectedImage} loadMore={loadMore}
                                       containerHeight={containerHeight} containerRef={containerRef}
                                       scrollRootRef={scrollRootRef} />;
}
