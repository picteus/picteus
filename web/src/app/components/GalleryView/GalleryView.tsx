import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageApiImageSearchRequest, SearchRange } from "@picteus/ws-client";
import { useTranslation } from "react-i18next";
import { ActionIcon, Flex } from "@mantine/core";
import { IconPhotoSearch, IconPin } from "@tabler/icons-react";

import { ChannelEnum, EventInformationType, ImageMasonryDataType, LocalFiltersType } from "types";
import { EmptyResults, ImageMasonry, RefreshButton, TopBar } from "app/components";
import { FiltersService, ImageService, RepositoriesService } from "app/services";
import { useContainerDimensions } from "app/hooks";
import { useEventSocket, useGalleryTabsContext } from "app/context";
import { notifyError, ROUTES } from "utils";

import { FiltersBar } from "./components";
import style from "./GalleryView.module.scss";

const BATCH_SIZE = 40;

type PaginationType = SearchRange & {
  currentPage: number;
};

type GalleryViewType = {
  initialFilters?: LocalFiltersType;
};

export default function GalleryView({ initialFilters }: GalleryViewType) {
  const [, addTab] = useGalleryTabsContext();
  const initialPagination: PaginationType = {
    currentPage: 1,
    take: BATCH_SIZE,
    skip: 0,
  };

  const [t] = useTranslation();
  const navigate = useNavigate();
  const lastEvent: EventInformationType = useEventSocket();
  const [data, setData] = useState<ImageMasonryDataType>({
    currentPage: initialPagination.currentPage,
    total: 0,
    imageSummaries: [],
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerDimensions(containerRef);
  const [filters, setFilters] = useState<LocalFiltersType>();
  const [showAlertNewImages, setShowAlertNewImages] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] =
    useState<PaginationType>(initialPagination);

  function handleOnPaginationChange(pageNumber: number) {
    setPagination({
      ...pagination,
      currentPage: pageNumber,
      take: BATCH_SIZE,
      skip: (pageNumber - 1) * BATCH_SIZE,
    });
  }

  function resetPaginationAndReload() {
    window.scrollTo(0, 0);
    setPagination({
      ...pagination,
      currentPage: 1,
      take: BATCH_SIZE,
      skip: 0,
    });
  }

  useEffect(() => {
    void load();
  }, [pagination]);

  useEffect(() => {
    resetPaginationAndReload();
  }, [filters]);

  useEffect(() => {
    if (
      lastEvent?.rawData?.channel === ChannelEnum.IMAGE_CREATED ||
      lastEvent?.rawData?.channel === ChannelEnum.IMAGE_DELETED
    ) {
      setShowAlertNewImages(true);
    }
  }, [lastEvent]);

  async function load() {
    if (!filters) {
      return;
    }
    setLoading(true);
    try {
      const searCriteria: ImageApiImageSearchRequest =
        FiltersService.filtersToCriteria(filters);
      const apiResponse = await ImageService.listAll({
        ...searCriteria,
        range: {
          take: pagination.take,
          skip: pagination.skip,
        },
      });

      setData({
        total: apiResponse.totalCount,
        currentPage: pagination.currentPage,
        imageSummaries: apiResponse?.entities,
      });
    } catch (error) {
      console.warn("Can't fetch images", error);
      const errorJson = await error.response.json();
      notifyError(errorJson.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOnRefresh() {
    setShowAlertNewImages(false);
    resetPaginationAndReload();
  }
  function handleOnPin() {
    addTab({
      type: "View",
      label: "New tab",
      data: {
        criteria: filters,
      },
    });
  }

  function renderTopBar() {
    return (
      <TopBar>
        <Flex align="start" justify="space-between">
          <FiltersBar initialFilters={initialFilters} onChange={setFilters} />
          <Flex gap="xs">
            <RefreshButton
              alert={showAlertNewImages}
              onRefresh={handleOnRefresh}
            />
            <ActionIcon size="lg" variant={"default"} onClick={handleOnPin}>
              <IconPin stroke={1.2} />
            </ActionIcon>
          </Flex>
        </Flex>
      </TopBar>
    );
  }

  function handleOnInfiniteScroll() {
    const maxPage = Math.ceil(data.total / pagination.take);
    if (pagination.currentPage === maxPage) {
      return;
    }
    handleOnPaginationChange(pagination.currentPage + 1);
  }

  function renderContent() {
    if (!loading && !data.total) {
      const repositoriesExists = RepositoriesService.list().length > 0;

      return (
        <EmptyResults
          icon={
            <IconPhotoSearch size={140} stroke={1} className={style.icon} />
          }
          description={
            repositoriesExists
              ? t("emptyImages.description")
              : t("emptyImages.descriptionNoRepository")
          }
          title={t("emptyImages.title")}
          buttonText={t("emptyImages.buttonTextNoRepository")}
          buttonAction={
            repositoriesExists ? undefined : () => navigate(ROUTES.repositories)
          }
        />
      );
    }
    if (containerRef?.current) {
      return (
        <ImageMasonry
          containerWidth={containerWidth}
          data={data}
          loadMore={handleOnInfiniteScroll}
        />
      );
    }
  }

  return (
    <>
      <div ref={containerRef} className={style.container}>
        {renderTopBar()}
        <div className={style.contentContainer}>
          <div className={style.galleryContainer}>{renderContent()}</div>
        </div>
      </div>
    </>
  );
}
