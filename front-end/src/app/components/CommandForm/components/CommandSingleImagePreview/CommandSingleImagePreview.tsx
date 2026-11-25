import { type ReactElement } from "react";
import { Flex, Stack, Text, Tooltip } from "@mantine/core";

import { ImageSummary } from "@picteus/ws-client";

import { ImageSubtitle, ImageThumbnail } from "app/components";


const PREVIEW_COLUMN_WIDTH = 200;

type CommandSingleImagePreviewPropsType = {
  readonly image: ImageSummary;
};

export default function CommandSingleImagePreview({
  image
}: CommandSingleImagePreviewPropsType): ReactElement
{
  return (
    <Stack
      gap="xs"
      w={PREVIEW_COLUMN_WIDTH}
      flex={`0 0 ${PREVIEW_COLUMN_WIDTH}px`}
      pos="sticky"
      top="var(--mantine-spacing-md)"
      miw={0}
    >
      <Flex
        w={PREVIEW_COLUMN_WIDTH}
        h={PREVIEW_COLUMN_WIDTH}
        align="center"
        justify="center"
        bdrs="md"
        bd="1px solid var(--mantine-color-default-border)"
        bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))"
        style={{ overflow: "hidden" }}
      >
        <ImageThumbnail
          imageOrUrl={image}
          edge={PREVIEW_COLUMN_WIDTH}
          fit="contain"
          radius={0}
        />
      </Flex>
      <Stack gap={2} miw={0}>
        <Tooltip label={image.name} position="bottom" openDelay={300} withArrow>
          <Text size="xs" fw={500} truncate="end">
            {image.name}
          </Text>
        </Tooltip>
        <Text size="xs" c="dimmed" truncate="end">
          <ImageSubtitle image={image} withFormat withWeight/>
        </Text>
      </Stack>
    </Stack>
  );
}
