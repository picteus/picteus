import { ReactElement, useMemo } from "react";
import { Center, Loader, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { SearchImageSummaryResult } from "@picteus/ws-client";

import { ImagePickerSelectionModeType } from "types";
import { useImageSummariesByIds } from "app/hooks";
import { queryKeys } from "app/query";
import { ImageService, StorageService } from "app/services";
import { buildLibraryNewestFirstSearchFilter, normalizeTagsKey } from "../../ImagePickerUtils.ts";
import EmptyStateBox from "../../../EmptyStateBox/EmptyStateBox.tsx";
import ImagePickerGrid from "../ImagePickerGrid/ImagePickerGrid.tsx";


type RecentImagesPickerTabPropsType = {
  readonly selectionMode: ImagePickerSelectionModeType;
  readonly selectedIds: readonly string[];
  readonly withTags?: readonly string[];
  readonly onToggle: (imageId: string) => void;
};

const LIBRARY_FALLBACK_LIMIT = 60;

export default function RecentImagesPickerTab({
  selectionMode,
  selectedIds,
  withTags,
  onToggle
}: RecentImagesPickerTabPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const recentIds = useMemo<string[]>(() => StorageService.getRecentImageIds(), []);
  const tagsKey = normalizeTagsKey(withTags);

  const { summaries: orderedRecentImages, isLoading: isRecentLoading } = useImageSummariesByIds(recentIds, {
    scope: "recent",
    withTags
  });

  const shouldUseFallback = recentIds.length === 0 || (isRecentLoading === false && orderedRecentImages.length === 0);

  const { data: libraryResult, isLoading: isLibraryLoading } = useQuery<SearchImageSummaryResult, Error>({
    queryKey: queryKeys.images.pickerSummaries("libraryNewest", tagsKey),
    queryFn: (): Promise<SearchImageSummaryResult> =>
    {
      return ImageService.searchSummaries({
        filter: buildLibraryNewestFirstSearchFilter(withTags),
        range: { take: LIBRARY_FALLBACK_LIMIT }
      });
    },
    enabled: shouldUseFallback
  });

  if (isRecentLoading === true || (shouldUseFallback === true && isLibraryLoading === true))
  {
    return (
      <Center flex={1} mih={240}>
        <Loader size="sm"/>
      </Center>
    );
  }

  const displayedImages = shouldUseFallback === true
    ? (libraryResult?.items ?? [])
    : orderedRecentImages;

  if (displayedImages.length === 0)
  {
    const hasTagFilter = withTags !== undefined && withTags.length > 0;
    return (
      <EmptyStateBox
        minHeight={200}
        title={hasTagFilter === true ? t("imagePicker.emptyMatchingTagsTitle") : t("imagePicker.emptyLibraryTitle")}
        description={hasTagFilter === true
          ? t("imagePicker.emptyMatchingTagsDescription", { tags: withTags.join(", ") })
          : t("imagePicker.emptyLibraryDescription")}
      />
    );
  }

  const caption = shouldUseFallback === true
    ? t("imagePicker.recentFallbackCaption")
    : (selectionMode === "single"
      ? t("imagePicker.recentCaptionSingle")
      : t("imagePicker.recentCaptionMultiple"));

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        {caption}
      </Text>
      <ImagePickerGrid
        images={displayedImages}
        selectedIds={selectedIds}
        selectionMode={selectionMode}
        onToggle={onToggle}
      />
    </Stack>
  );
}
