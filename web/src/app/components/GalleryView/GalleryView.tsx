import React, { RefObject, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ActionIcon, Flex, Tooltip } from "@mantine/core";
import { IconLayoutDashboard, IconListDetails, IconPhoto, IconPhotoSearch, IconPin } from "@tabler/icons-react";

import { SearchRange } from "@picteus/ws-client";

import { ChannelEnum, FilterOrCollectionId, ImageExplorerDataType, ImageOrSummary } from "types";
import { notifyApiCallError, ROUTES } from "utils";
import { ImageService, RepositoriesService } from "app/services";
import { useEventSocket, useGalleryTabsContext } from "app/context";
import { Container, EmptyResults, ImageGallery, ImageMasonry, ImageTable, RefreshButton, TopBar } from "app/components";
import { FiltersBar } from "./components";

import style from "./GalleryView.module.scss";


const BATCH_SIZE = 100;

export type ViewMode = "masonry" | "gallery" | "table";

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
              <ActionIcon size="lg" variant={viewMode === "table" ? "filled" : "default"} onClick={() => setViewMode("table")}>
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

type PaginationType = SearchRange & {
  currentPage: number;
};

type GalleryContentProps = {
  loading: boolean;
  data: ImageExplorerDataType;
  containerWidth: number;
  containerHeight: number;
  filterOrCollectionId?: FilterOrCollectionId;
  refreshTrigger: number;
  onFetchData: (pagination: PaginationType) => void;
  viewMode: ViewMode;
  scrollRootRef: RefObject<HTMLDivElement>;
};


function GalleryContent({
  loading,
  data,
  containerWidth,
  containerHeight,
  filterOrCollectionId,
  refreshTrigger,
  onFetchData,
  viewMode,
  scrollRootRef,
}: GalleryContentProps) {
  const [t] = useTranslation();
  const navigate = useNavigate();
  const defaultPagination: PaginationType = { currentPage: 1, take: BATCH_SIZE, skip: 0 };
  const [pagination, setPagination] = useState<PaginationType>(defaultPagination);
  const [accumulatedData, setAccumulatedData] = useState<ImageOrSummary[]>([]);
  const isLoadingMoreRef = useRef<boolean>(false);

  useEffect(() => {
    scrollRootRef.current.scrollTo(0, 0);
    setAccumulatedData([]);
    setPagination({ currentPage: 1, take: BATCH_SIZE, skip: 0 });
  }, [filterOrCollectionId, refreshTrigger]);

  useEffect(() => {
    onFetchData(pagination);
  }, [pagination]);

  useEffect(() => {
    isLoadingMoreRef.current = false;
    setAccumulatedData((prevData) => {
      if (data.currentPage === 1) {
        return data.images;
      }
      return [...prevData, ...data.images];
    });
  }, [data]);

  const loadMore = useCallback(() => {
    if (isLoadingMoreRef.current === false) {
      isLoadingMoreRef.current = true;
      const maxPage = Math.ceil(data.total / pagination.take);
      if (pagination.currentPage === maxPage) {
        isLoadingMoreRef.current = false;
        return;
      }
      setPagination({
        currentPage: pagination.currentPage + 1,
        take: BATCH_SIZE,
        skip: pagination.currentPage * BATCH_SIZE
      });
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
    return <ImageGallery containerWidth={containerWidth} containerHeight={containerHeight} data={accumulatedData}
                         loadMore={loadMore} scrollRootRef={scrollRootRef} />;
  }

  if (viewMode === "table") {
    return <ImageTable containerWidth={containerWidth} data={accumulatedData} loadMore={loadMore} />;
  }

  return <ImageMasonry containerWidth={containerWidth} data={accumulatedData} loadMore={loadMore} />;
}

type GalleryViewProps = {
  initialFilterOrCollectionId?: FilterOrCollectionId;
  containerWidth: number;
  containerHeight: number;
  scrollRootRef: RefObject<HTMLDivElement>;
};

export default function GalleryView({ initialFilterOrCollectionId, containerWidth, containerHeight, scrollRootRef }: GalleryViewProps) {
  const { addTab } = useGalleryTabsContext();
  const [data, setData] = useState<ImageExplorerDataType>({ currentPage: 1, total: 0, images: [] });
  const [filterOrCollectionId, setFilterOrCollectionId] = useState<FilterOrCollectionId>(initialFilterOrCollectionId);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>("masonry");

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
      data: { filterOrCollectionId },
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
              containerWidth={containerWidth}
              containerHeight={containerHeight}
              filterOrCollectionId={filterOrCollectionId}
              refreshTrigger={refreshTrigger}
              onFetchData={loadData}
              viewMode={viewMode}
              scrollRootRef={scrollRootRef}
            />
          </Container>
        </div>
      </div>
    </>
  );
}
