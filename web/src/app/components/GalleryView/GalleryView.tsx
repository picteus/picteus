import React, { RefObject, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ActionIcon, Flex, Tooltip } from "@mantine/core";
import { IconLayoutDashboard, IconListDetails, IconPhoto, IconPhotoSearch, IconPin } from "@tabler/icons-react";

import { SearchRange } from "@picteus/ws-client";

import {
  ChannelEnum,
  FilterOrCollectionId,
  ImageExplorerDataType,
  ImageOrSummary,
  ViewMode,
  ViewTabDataType
} from "types";
import { notifyApiCallError, ROUTES } from "utils";
import { useEventSocket, useGalleryTabsContext } from "app/context";
import { ImageService, RepositoriesService, StorageService } from "app/services";
import { Container, EmptyResults, ImageGallery, ImageMasonry, ImageTable, RefreshButton, TopBar } from "app/components";
import { FiltersBar } from "./components";

import style from "./GalleryView.module.scss";


const BATCH_SIZE = 100;

type GalleryTopBarProps = {
  filterOrCollectionId: FilterOrCollectionId;
  setFilterOrCollectionId: (filterOrCollectionId: FilterOrCollectionId) => void;
  handleOnRefresh: () => void;
  handleOnPin: () => void;
  viewMode: ViewMode;
  setZIndex: boolean;
  setViewMode: (mode: ViewMode) => void;
};

function GalleryTopBar({
  filterOrCollectionId,
  setFilterOrCollectionId,
  handleOnRefresh,
  handleOnPin,
  viewMode,
  setZIndex,
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
    <TopBar setZIndex={setZIndex}>
      <Flex align="start" justify="space-between">
        <FiltersBar initialFilterOrCollectionId={filterOrCollectionId} onChange={setFilterOrCollectionId} />
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
  onSelectedImage: (image: ImageOrSummary) => void;
  containerWidth: number;
  containerHeight: number;
  containerRef: RefObject<HTMLElement>;
  scrollRootRef: RefObject<HTMLElement>;
  filterOrCollectionId?: FilterOrCollectionId;
  refreshTrigger: number;
  onFetchData: (pagination: PaginationType) => void;
  viewMode: ViewMode;
};


function GalleryContent({
  loading,
  data,
  onSelectedImage,
  containerWidth,
  containerHeight,
  containerRef,
  scrollRootRef,
  filterOrCollectionId,
  refreshTrigger,
  onFetchData,
  viewMode,
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
  }, [filterOrCollectionId, refreshTrigger, viewMode]);

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
        <GalleryTopBar
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
            <GalleryContent
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
