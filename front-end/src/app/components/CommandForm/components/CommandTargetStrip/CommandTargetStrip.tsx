import { type ReactElement } from "react";
import { Badge, Flex, Paper, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { ImageSummary } from "@picteus/ws-client";

import { ImageThumbnailStrip } from "app/components";


const MAX_VISIBLE_THUMBNAILS = 3;
const THUMBNAIL_EDGE = 32;
const THUMBNAIL_OVERLAP_GAP = -10;

type CommandTargetStripPropsType = {
  readonly images: readonly ImageSummary[];
  readonly totalCount: number;
};

export default function CommandTargetStrip({
  images,
  totalCount
}: CommandTargetStripPropsType): ReactElement
{
  const { t } = useTranslation();
  const visibleImages = images.slice(0, MAX_VISIBLE_THUMBNAILS);
  const overflowCount = Math.max(0, totalCount - visibleImages.length);

  return (
    <Paper
      withBorder
      radius="md"
      px="sm"
      py="xs"
      bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))"
    >
      <Flex align="center" gap="sm" wrap="nowrap" miw={0}>
        {visibleImages.length > 0 && (
          <Flex align="center" gap={6} flex="0 0 auto">
            <ImageThumbnailStrip
              images={visibleImages}
              edge={THUMBNAIL_EDGE}
              gap={THUMBNAIL_OVERLAP_GAP}
              fit="cover"
              radius="sm"
            />
            {overflowCount > 0 && (
              <Badge variant="light" color="gray" size="sm" radius="sm">
                +{overflowCount}
              </Badge>
            )}
          </Flex>
        )}
        <Text size="sm" fw={500} c="dimmed" truncate="end" miw={0}>
          {t("commands.runsOnImages", { count: totalCount })}
        </Text>
      </Flex>
    </Paper>
  );
}
