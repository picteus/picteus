import React, { ReactElement, useMemo } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { useTranslation } from "react-i18next";

import { ImageSummary } from "@picteus/ws-client";

import { ImageCommandType, ViewMode } from "types";
import { useImageCommands } from "app/hooks";
import { Common, ImageCommand } from "app/components";
import ImageCommandsMoreMenu from "./ImageCommandsMoreMenu.tsx";


type ImageCommandsBarPropsType = {

  image: ImageSummary;
  viewMode?: ViewMode;
};

const COMMAND_BUTTON_SIZE = Common.IconXLargeSize;
const COMMAND_BUTTON_GAP = 6;
const MAX_VISIBLE_COMMANDS = 6;

export default function ImageCommandsBar({ image, viewMode }: ImageCommandsBarPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const { extensionCommands } = useImageCommands({ image, viewMode });
  const { ref, width } = useElementSize();

  const { visibleCommands, overflowCommands } = useMemo(() =>
    {
      if (extensionCommands.length === 0)
      {
        return { visibleCommands: [], overflowCommands: [] };
      }
      if (width === 0)
      {
        const initialCount = Math.min(MAX_VISIBLE_COMMANDS, extensionCommands.length);
        return {
          visibleCommands: extensionCommands.slice(0, initialCount),
          overflowCommands: extensionCommands.slice(initialCount)
        };
      }

      const totalWidthWithoutMore = extensionCommands.length * COMMAND_BUTTON_SIZE + (extensionCommands.length - 1) * COMMAND_BUTTON_GAP;
      if (extensionCommands.length <= MAX_VISIBLE_COMMANDS && totalWidthWithoutMore <= width)
      {
        return {
          visibleCommands: extensionCommands,
          overflowCommands: []
        };
      }

      const availableWidthForVisible = width - COMMAND_BUTTON_SIZE - COMMAND_BUTTON_GAP;
      const fitCount = Math.floor((availableWidthForVisible + COMMAND_BUTTON_GAP) / (COMMAND_BUTTON_SIZE + COMMAND_BUTTON_GAP));
      const visibleCount = Math.min(MAX_VISIBLE_COMMANDS, Math.max(0, fitCount));
      return {
        visibleCommands: extensionCommands.slice(0, visibleCount),
        overflowCommands: extensionCommands.slice(visibleCount)
      };
    },
    [ extensionCommands, width ]
  );

  if (extensionCommands.length === 0)
  {
    return null;
  }

  return (
    <Stack gap="sm" w="100%">
      <Text size="xs" c="dimmed" fw={500}>
        {t("imageDetail.commands", "Image commands")}
      </Text>
      <Box ref={ref} w="100%">
        <Group justify="space-between" align="center" wrap="nowrap" w="100%">
          <Group gap={COMMAND_BUTTON_GAP} align="center" wrap="nowrap">
            {visibleCommands.map(
              (command: ImageCommandType) =>
              {
                return (
                  <ImageCommand.ActionIcon
                    key={command.id}
                    image={image}
                    command={command}
                    viewMode={viewMode}
                    size={COMMAND_BUTTON_SIZE}
                    radius="md"
                    variant="default"
                  />
                );
              }
            )}
          </Group>
          {overflowCommands.length > 0 && (
            <ImageCommandsMoreMenu
              image={image}
              viewMode={viewMode}
              commands={overflowCommands}
            />
          )}
        </Group>
      </Box>
    </Stack>
  );
}
