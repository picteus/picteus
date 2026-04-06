import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ActionIcon, Flex, Tooltip } from "@mantine/core";
import { IconLayoutDashboard, IconListDetails, IconPhoto, IconPhotoSearch, IconPin } from "@tabler/icons-react";

import { SearchRange } from "@picteus/ws-client";

import { ChannelEnum, FilterOrCollectionId, ImageExplorerDataType, ImageOrSummary } from "types";
import { notifyApiCallError, ROUTES } from "utils";
import { ImageService, RepositoriesService } from "app/services";
import { useEventSocket, useGalleryTabsContext } from "app/context";
import { Container, EmptyResults, ImageGallery, ImageMasonry, RefreshButton, TopBar } from "app/components";
import { FiltersBar } from "./components";

import style from "./GalleryView.module.scss";


const BATCH_SIZE = 40;

export type ViewMode = "masonry" | "gallery" | "detail";

type PaginationType = SearchRange & {
  currentPage: number;
};

type GalleryTopBarProps = {
  initialFilterOrCollectionId?: FilterOrCollectionId;
  setFilterOrCollectionId: (filterOrCollectionId: FilterOrCollectionId) => void;
  handleOnRefresh: () => void;
  handleOnPin: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
};

function GalleryTopBar({
  initialFilterOrCollectionId,
  setFilterOrCollectionId,
  handleOnRefresh,
  handleOnPin,
  viewMode,
  setViewMode,
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
          <ActionIcon.Group>
            <Tooltip label={t("galleryScreen.masonryView")}>
              <ActionIcon size="lg" variant={viewMode === "masonry" ? "filled" : "default"} onClick={() => setViewMode("masonry")}>
                <IconLayoutDashboard stroke={1.2} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("galleryScreen.galleryView")}>
              <ActionIcon size="lg" variant={viewMode === "gallery" ? "filled" : "default"} onClick={() => setViewMode("gallery")}>
                <IconPhoto stroke={1.2} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("galleryScreen.detailView")}>
              <ActionIcon disabled={true} size="lg" variant={viewMode === "detail" ? "filled" : "default"} onClick={() => setViewMode("detail")}>
                <IconListDetails stroke={1.2} />
              </ActionIcon>
            </Tooltip>
          </ActionIcon.Group>
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
  data: ImageExplorerDataType;
  width: number;
  filterOrCollectionId?: FilterOrCollectionId;
  refreshTrigger: number;
  onFetchData: (pagination: PaginationType) => void;
  viewMode: ViewMode;
};

function GalleryContent({
  loading,
  data,
  width,
  filterOrCollectionId,
  refreshTrigger,
  onFetchData,
  viewMode,
}: GalleryContentProps) {
  const [t] = useTranslation();
  const navigate = useNavigate();
  const [pagination, setPagination] = useState<PaginationType>({ currentPage: 1, take: BATCH_SIZE, skip: 0 });
  const [localData, setLocalData] = useState<ImageOrSummary[]>([]);
  const isFetchingRef = useRef<boolean>(false);

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

  useEffect(() => {
    isFetchingRef.current = false;
    setLocalData((prevData) => {
      if (data.currentPage === 1) {
        return data.images;
      }
      return [...prevData, ...data.images];
    });
  }, [data]);

  const handleOnInfiniteScroll = useCallback(() => {
    if (isFetchingRef.current === false) {
      isFetchingRef.current = true;
      const maxPage = Math.ceil(data.total / pagination.take);
      if (pagination.currentPage === maxPage) {
        return;
      }
      const handleOnPaginationChange = (pageNumber: number) => {
        setPagination({
          ...pagination,
          currentPage: pageNumber,
          take: BATCH_SIZE,
          skip: (pageNumber - 1) * BATCH_SIZE
        });
      };
      handleOnPaginationChange(pagination.currentPage + 1);
    }
  }, [pagination]);

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

  if (viewMode === "gallery") {
    return <ImageGallery containerWidth={width} data={localData} loadMore={handleOnInfiniteScroll} />;
  }

  if (viewMode === "detail") {
    return <div>Detail view not implemented yet</div>;
  }

  return <ImageMasonry containerWidth={width} data={localData} loadMore={handleOnInfiniteScroll} />;
}

type GalleryViewProps = {
  initialFilterOrCollectionId?: FilterOrCollectionId;
  containerWidth: number;
};

export default function GalleryView({ initialFilterOrCollectionId, containerWidth }: GalleryViewProps) {
  const { addTab } = useGalleryTabsContext();
  const [data, setData] = useState<ImageExplorerDataType>({ currentPage: 1, total: 0, images: [] });
  const [filterOrCollectionId, setFilterOrCollectionId] = useState<FilterOrCollectionId>(initialFilterOrCollectionId);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>("masonry");

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
      content: { title: "New tab", description: "" },
      data: { filterOrCollectionId: filterOrCollectionId },
    });
  }

  return (
    <>
      <div className={style.container}>
        <GalleryTopBar
          initialFilterOrCollectionId={initialFilterOrCollectionId}
          setFilterOrCollectionId={setFilterOrCollectionId}
          handleOnRefresh={handleOnRefresh}
          handleOnPin={handleOnPin}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
        <div className={style.contentContainer}>
          <Container>
            <GalleryContent
              loading={loading}
              data={data}
              width={containerWidth}
              filterOrCollectionId={filterOrCollectionId}
              refreshTrigger={refreshTrigger}
              onFetchData={load}
              viewMode={viewMode}
            />
          </Container>
        </div>
      </div>
    </>
  );
}
