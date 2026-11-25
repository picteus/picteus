import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Box, Button, Center, Group, Loader, UnstyledButton } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { InfiniteData, useInfiniteQuery, useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Collection, ImageSummary, SearchImageSummaryResult } from "@picteus/ws-client";

import { ImagePickerSelectionModeType } from "types";
import { useModalContext } from "app/context";
import { useCollections } from "app/hooks";
import { queryKeys } from "app/query";
import { ImageService } from "app/services";
import CollectionLabel from "../../../CollectionLabel/CollectionLabel.tsx";
import Common from "../../../Common/Common.ts";
import FlexScrollArea from "../../../FlexScrollArea/FlexScrollArea.tsx";
import ImageThumbnail from "../../../ImageThumbnail/ImageThumbnail.tsx";
import { buildSearchFilterWithTags, normalizeTagsKey } from "../../ImagePickerUtils.ts";
import ImagePickerEmptyState from "../ImagePickerEmptyState/ImagePickerEmptyState.tsx";
import ImagePickerGrid from "../ImagePickerGrid/ImagePickerGrid.tsx";
import style from "../../ImagePicker.module.scss";


const COLLECTION_PREVIEW_COUNT = 4;
const COLLECTION_IMAGES_PAGE_SIZE = 40;
const MOSAIC_SINGLE_THUMB_EDGE = 384;
const MOSAIC_GRID_THUMB_EDGE = 200;

type CollectionPreviewCardPropsType = {
  readonly collection: Collection;
  readonly previewItems: readonly ImageSummary[];
  readonly onSelectCollection: (collection: Collection) => void;
};

function CollectionPreviewCard({
  collection,
  previewItems,
  onSelectCollection
}: CollectionPreviewCardPropsType): ReactElement
{
  const mosaicModifierClass = previewItems.length === 1
    ? ` ${style.collectionMosaicSingle}`
    : (previewItems.length === 2 ? ` ${style.collectionMosaicPair}` : "");
  const thumbRequestEdge = previewItems.length === 1 ? MOSAIC_SINGLE_THUMB_EDGE : MOSAIC_GRID_THUMB_EDGE;

  return (
    <UnstyledButton
      className={style.collectionCard}
      onClick={() => onSelectCollection(collection)}
    >
      <Box className={`${style.collectionMosaic}${mosaicModifierClass}`}>
        {previewItems.slice(0, COLLECTION_PREVIEW_COUNT).map((item) => (
          <ImageThumbnail
            key={item.id}
            imageOrUrl={item}
            edge="100%"
            requestEdge={thumbRequestEdge}
            fit="cover"
            radius={0}
            loading="lazy"
          />
        ))}
      </Box>
      <Box px={2} w="100%">
        <CollectionLabel collection={collection}/>
      </Box>
    </UnstyledButton>
  );
}

type CollectionsPickerTabPropsType = {
  readonly isActive: boolean;
  readonly selectionMode: ImagePickerSelectionModeType;
  readonly selectedIds: readonly string[];
  readonly withTags?: readonly string[];
  readonly onToggle: (imageId: string) => void;
  readonly onSelectMany: (imageIds: readonly string[]) => void;
};

export default function CollectionsPickerTab({
  isActive,
  selectionMode,
  selectedIds,
  withTags,
  onToggle,
  onSelectMany
}: CollectionsPickerTabPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const modalContext = useModalContext();
  const setCloseGuard = modalContext?.setCloseGuard;
  const { data: collections = [], isLoading: isCollectionsLoading } = useCollections();
  const [ activeCollection, setActiveCollection ] = useState<Collection | null>(null);
  const collectionViewportRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const tagsKey = normalizeTagsKey(withTags);
  const hasTagFilter = withTags !== undefined && withTags.length > 0;

  useEffect(() =>
  {
    if (setCloseGuard === undefined || isActive === false || activeCollection === null)
    {
      return;
    }

    setCloseGuard((): void =>
    {
      setActiveCollection(null);
    });

    return (): void =>
    {
      setCloseGuard(undefined);
    };
  }, [ setCloseGuard, isActive, activeCollection ]);

  const previewQueries = useQueries({
    queries: collections.map((collection) => ({
      queryKey: queryKeys.images.pickerSummaries("collectionPreview", `${collection.id}|${tagsKey}`),
      queryFn: (): Promise<SearchImageSummaryResult> =>
      {
        return ImageService.searchSummaries({
          filter: buildSearchFilterWithTags(collection.filter, withTags),
          range: { take: COLLECTION_PREVIEW_COUNT }
        });
      }
    }))
  });

  const isAnyPreviewPending = collections.length > 0 && previewQueries.some((query) => query.isPending === true);

  const nonEmptyCollections = collections
    .map((collection, index) => ({
      collection,
      previewItems: previewQueries[index]?.data?.items ?? []
    }))
    .filter(({ previewItems }) => previewItems.length > 0);

  const {
    data: collectionImagesPages,
    isLoading: isCollectionImagesLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useInfiniteQuery<
    SearchImageSummaryResult,
    Error,
    InfiniteData<SearchImageSummaryResult>,
    ReturnType<typeof queryKeys.images.pickerSummaries>,
    number
  >({
    queryKey: queryKeys.images.pickerSummaries(
      "collectionImages",
      `${activeCollection?.id ?? "none"}|${tagsKey}`
    ),
    initialPageParam: 0,
    queryFn: ({ pageParam }): Promise<SearchImageSummaryResult> =>
    {
      return ImageService.searchSummaries({
        filter: buildSearchFilterWithTags(activeCollection!.filter, withTags),
        range: { skip: pageParam, take: COLLECTION_IMAGES_PAGE_SIZE }
      });
    },
    getNextPageParam: (lastPage, allPages): number | undefined =>
    {
      const loadedCount = allPages.reduce((sum, page) => sum + page.items.length, 0);
      if (lastPage.items.length === 0 || loadedCount >= lastPage.totalCount)
      {
        return undefined;
      }
      return loadedCount;
    },
    enabled: activeCollection !== null
  });

  const collectionImages = useMemo<ImageSummary[]>(() =>
  {
    const seenIds = new Set<string>();
    const items: ImageSummary[] = [];
    for (const page of collectionImagesPages?.pages ?? [])
    {
      for (const item of page.items)
      {
        if (seenIds.has(item.id) === false)
        {
          seenIds.add(item.id);
          items.push(item);
        }
      }
    }
    return items;
  }, [ collectionImagesPages ]);

  const activeCollectionTotalCount = collectionImagesPages?.pages[0]?.totalCount ?? collectionImages.length;
  const canSelectAllInCollection =
    selectionMode === "multiple" &&
    activeCollectionTotalCount > 0 &&
    activeCollectionTotalCount <= COLLECTION_IMAGES_PAGE_SIZE;

  useEffect(() =>
  {
    if (activeCollection === null || hasNextPage !== true)
    {
      return;
    }
    const sentinel = loadMoreSentinelRef.current;
    const viewport = collectionViewportRef.current;
    if (sentinel === null || viewport === null)
    {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) =>
      {
        if (entries.some((entry) => entry.isIntersecting === true) && isFetchingNextPage === false)
        {
          void fetchNextPage();
        }
      },
      {
        root: viewport,
        rootMargin: "200px 0px"
      }
    );

    observer.observe(sentinel);
    return (): void => observer.disconnect();
  }, [ activeCollection, hasNextPage, isFetchingNextPage, fetchNextPage, collectionImages.length ]);

  const isShowingActiveCollection = activeCollection !== null;

  return (
    <Box className={style.pickerTabPanels}>
      <div
        className={`${style.pickerTabPanel}${isShowingActiveCollection === true ? ` ${style.pickerTabPanelHidden}` : ""}`}
        inert={isShowingActiveCollection}
        aria-hidden={isShowingActiveCollection || undefined}
      >
        <FlexScrollArea offsetScrollbars="present" isContentFlex>
          <Box className={style.pickerTabContent}>
            {isCollectionsLoading === true || isAnyPreviewPending === true ? (
              <Center flex={1} mih={240}>
                <Loader size="sm"/>
              </Center>
            ) : nonEmptyCollections.length === 0 ? (
              <ImagePickerEmptyState
                title={hasTagFilter === true && collections.length > 0
                  ? t("imagePicker.emptyMatchingTagsTitle")
                  : t("imagePicker.noCollectionsTitle")}
                description={hasTagFilter === true && collections.length > 0
                  ? t("imagePicker.emptyMatchingTagsDescription", { tags: withTags.join(", ") })
                  : t("imagePicker.noCollectionsDescription")}
              />
            ) : (
              <Box className={style.collectionsGrid}>
                {nonEmptyCollections.map(({ collection, previewItems }) => (
                  <CollectionPreviewCard
                    key={collection.id}
                    collection={collection}
                    previewItems={previewItems}
                    onSelectCollection={setActiveCollection}
                  />
                ))}
              </Box>
            )}
          </Box>
        </FlexScrollArea>
      </div>

      {activeCollection !== null && (
        <div className={style.pickerTabPanel}>
          <Group
            justify="space-between"
            align="center"
            wrap="wrap"
            pt="md"
            pb="sm"
            className={style.pickerHeader}
          >
            <Group gap="xs" align="center">
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconArrowLeft size={14} stroke={Common.IconStrokeSize}/>}
                onClick={() => setActiveCollection(null)}
              >
                {t("field.collections")}
              </Button>
              <CollectionLabel collection={activeCollection} variant="pill"/>
            </Group>

            {canSelectAllInCollection === true && (
              <Button
                variant="light"
                size="xs"
                rightSection={
                  <Badge size="xs" color="blue" variant="filled">
                    {activeCollectionTotalCount}
                  </Badge>
                }
                onClick={() => onSelectMany(collectionImages.map((image) => image.id))}
              >
                {t("filters.selectAll")}
              </Button>
            )}
          </Group>

          <FlexScrollArea
            key={activeCollection.id}
            viewportRef={collectionViewportRef}
            offsetScrollbars="present"
            isContentFlex
          >
            <Box className={style.pickerScrollBody}>
              {isCollectionImagesLoading === true ? (
                <Center flex={1} mih={240}>
                  <Loader size="sm"/>
                </Center>
              ) : collectionImages.length === 0 ? (
                <ImagePickerEmptyState
                  title={hasTagFilter === true ? t("imagePicker.emptyMatchingTagsTitle") : t("imagePicker.emptyCollectionTitle")}
                  description={hasTagFilter === true
                    ? t("imagePicker.emptyCollectionMatchingTagsDescription", { tags: withTags.join(", ") })
                    : t("imagePicker.emptyCollectionDescription")}
                />
              ) : (
                <>
                  <ImagePickerGrid
                    images={collectionImages}
                    selectedIds={selectedIds}
                    selectionMode={selectionMode}
                    onToggle={onToggle}
                  />
                  {hasNextPage === true && (
                    <Box ref={loadMoreSentinelRef} h={1}/>
                  )}
                  {isFetchingNextPage === true && (
                    <Center py="sm">
                      <Loader size="xs"/>
                    </Center>
                  )}
                </>
              )}
            </Box>
          </FlexScrollArea>
        </div>
      )}
    </Box>
  );
}
