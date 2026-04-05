import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ActionIcon, Flex, Tooltip } from "@mantine/core";
import { IconPhotoSearch, IconPin } from "@tabler/icons-react";

import { SearchRange } from "@picteus/ws-client";

import { ChannelEnum, FilterOrCollectionId, ImageMasonryDataType } from "types";
import { EmptyResults, ImageMasonry, RefreshButton, TopBar } from "app/components";
import { FiltersBar } from "./components";
import { ImageService, RepositoriesService } from "app/services";
import { useContainerDimensions } from "app/hooks";
import { useEventSocket, useGalleryTabsContext } from "app/context";
import { notifyApiCallError, ROUTES } from "utils";
import style from "./GalleryView.module.scss";


const BATCH_SIZE = 40;

type PaginationType = SearchRange & {
  currentPage: number;
};

type GalleryTopBarProps = {
  initialFilterOrCollectionId?: FilterOrCollectionId;
  setFilterOrCollectionId: (filterOrCollectionId: FilterOrCollectionId) => void;
  handleOnRefresh: () => void;
  handleOnPin: () => void;
};

function GalleryTopBar({
  initialFilterOrCollectionId,
  setFilterOrCollectionId,
  handleOnRefresh,
  handleOnPin,
}: GalleryTopBarProps) {
  const [t] = useTranslation();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const [showAlertNewImages, setShowAlertNewImages] = useState<boolean>(false);

  useEffect(() => {
    if (event === undefined) {
      return;
    }
    if (event.rawData.channel === ChannelEnum.IMAGE_CREATED || event.rawData.channel === ChannelEnum.IMAGE_DELETED) {
      setShowAlertNewImages(true);
    }
  }, [event]);

  function onInternalRefresh() {
    setShowAlertNewImages(false);
    handleOnRefresh();
  }

  return (
    <TopBar>
      <Flex align="start" justify="space-between">
        <FiltersBar initialFilterOrCollectionId={initialFilterOrCollectionId} onChange={setFilterOrCollectionId} />
        <Flex gap="xs">
          <RefreshButton
            alert={showAlertNewImages}
            onRefresh={onInternalRefresh}
          />
          <Tooltip label={t("button.pin")}>
            <ActionIcon size="lg" variant={"default"} onClick={handleOnPin}>
              <IconPin stroke={1.2} />
            </ActionIcon>
          </Tooltip>
        </Flex>
      </Flex>
    </TopBar>
  );
}

type GalleryContentProps = {
  loading: boolean;
  data: ImageMasonryDataType;
  width: number;
  filterOrCollectionId?: FilterOrCollectionId;
  refreshTrigger: number;
  onFetchData: (pagination: PaginationType) => void;
};

function GalleryContent({
  loading,
  data,
  width,
  filterOrCollectionId,
  refreshTrigger,
  onFetchData,
}: GalleryContentProps) {
  const [t] = useTranslation();
  const navigate = useNavigate();
  const [pagination, setPagination] = useState<PaginationType>({ currentPage: 1, take: BATCH_SIZE, skip: 0 });

  useEffect(() => {
    window.scrollTo(0, 0);
    setPagination({
      ...pagination,
      currentPage: 1,
      take: BATCH_SIZE,
      skip: 0,
    });
  }, [filterOrCollectionId, refreshTrigger]);

  useEffect(() => {
    onFetchData(pagination);
  }, [pagination]);

  function handleOnPaginationChange(pageNumber: number) {
    setPagination({
      ...pagination,
      currentPage: pageNumber,
      take: BATCH_SIZE,
      skip: (pageNumber - 1) * BATCH_SIZE,
    });
  }

  function handleOnInfiniteScroll() {
    const maxPage = Math.ceil(data.total / pagination.take);
    if (pagination.currentPage === maxPage) {
      return;
    }
    handleOnPaginationChange(pagination.currentPage + 1);
  }

  if (loading === false && data.total === 0) {
    const repositoriesExists = RepositoriesService.list().length > 0;
    return (
      <EmptyResults
        icon={<IconPhotoSearch size={140} stroke={1} className={style.icon} />}
        description={t(repositoriesExists ? "emptyImages.description" : "emptyImages.descriptionNoRepository")}
        title={t("emptyImages.title")}
        buttonText={t("emptyImages.buttonTextNoRepository")}
        buttonAction={repositoriesExists ? undefined : () => navigate(ROUTES.repositories)}
      />
    );
  }

  return <ImageMasonry containerWidth={width} data={data} loadMore={handleOnInfiniteScroll} />;
}

type GalleryViewProps = {
  initialFilterOrCollectionId?: FilterOrCollectionId;
};

export default function GalleryView({ initialFilterOrCollectionId }: GalleryViewProps) {
  const [, addTab] = useGalleryTabsContext();
  const [data, setData] = useState<ImageMasonryDataType>({ currentPage: 1, total: 0, images: [] });
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useContainerDimensions(containerRef);
  const [filterOrCollectionId, setFilterOrCollectionId] = useState<FilterOrCollectionId>(initialFilterOrCollectionId);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);

  async function load(currentPagination: PaginationType) {
    if (!filterOrCollectionId) {
      return;
    }
    setLoading(true);
    try {
      const apiResponse = await ImageService.searchImages({
        filter: filterOrCollectionId.filter,
        collectionId: filterOrCollectionId.filter !== undefined ? undefined : filterOrCollectionId.collectionId,
        range: {
          take: currentPagination.take,
          skip: currentPagination.skip,
        },
      });

      setData({
        total: apiResponse.totalCount,
        currentPage: currentPagination.currentPage,
        images: apiResponse.items,
      });
    } catch (error) {
      notifyApiCallError(error, "Can't fetch images");
    } finally {
      setLoading(false);
    }
  }

  function handleOnRefresh() {
    setRefreshTrigger(value => value + 1);
  }

  function handleOnPin() {
    addTab({
      type: "View",
      label: "New tab",
      data: { filterOrCollectionId: filterOrCollectionId },
    });
  }

  return (
    <>
      <div ref={containerRef} className={style.container}>
        <GalleryTopBar
          initialFilterOrCollectionId={initialFilterOrCollectionId}
          setFilterOrCollectionId={setFilterOrCollectionId}
          handleOnRefresh={handleOnRefresh}
          handleOnPin={handleOnPin}
        />
        <div className={style.contentContainer}>
          <div className={style.galleryContainer}>
            {containerRef?.current && <GalleryContent
              loading={loading}
              data={data}
              width={width}
              filterOrCollectionId={filterOrCollectionId}
              refreshTrigger={refreshTrigger}
              onFetchData={load}
            />}
          </div>
        </div>
      </div>
    </>
  );
}
