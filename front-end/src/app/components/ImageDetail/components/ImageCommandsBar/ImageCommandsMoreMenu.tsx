import React, { ReactElement, useMemo, useState } from "react";
import { ActionIcon, Button, Group, Popover, ScrollArea, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { IconDots, IconSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ImageSummary } from "@picteus/ws-client";

import { ImageCommandType, ViewMode } from "types";
import { Common, ExtensionBadge } from "app/components";


type ImageCommandsMoreMenuPropsType = {

  image: ImageSummary;
  viewMode?: ViewMode;
  commands: ImageCommandType[];
};

type ExtensionGroupType = {

  extensionId: string;
  extensionName: string;
  commands: ImageCommandType[];
};

export default function ImageCommandsMoreMenu({ commands }: ImageCommandsMoreMenuPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const [ isOpened, setIsOpened ] = useState<boolean>(false);
  const [ searchQuery, setSearchQuery ] = useState<string>("");

  function handleOpenChange(opened: boolean): void
  {
    setIsOpened(opened);
    if (!opened)
    {
      setSearchQuery("");
    }
  }

  function handleToggleOpened(): void
  {
    handleOpenChange(!isOpened);
  }

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>): void
  {
    setSearchQuery(event.currentTarget.value);
  }

  function handleExecuteCommand(command: ImageCommandType): void
  {
    setIsOpened(false);
    setSearchQuery("");
    void command.execute();
  }

  const filteredCommands = useMemo<ImageCommandType[]>(() =>
    {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      if (!normalizedQuery)
      {
        return commands;
      }
      return commands.filter(
        (command) =>
        {
          return (
            command.label.toLowerCase().includes(normalizedQuery) ||
            (command.subLabel?.toLowerCase().includes(normalizedQuery) ?? false)
          );
        }
      );
    },
    [ commands, searchQuery ]
  );

  const extensionGroups = useMemo<ExtensionGroupType[]>(() =>
    {
      const groupsMap = new Map<string, ExtensionGroupType>();

      for (const command of filteredCommands)
      {
        const extensionId = command.extensionId ?? "core";
        const extensionName = command.subLabel ?? extensionId;
        const existingGroup = groupsMap.get(extensionId);

        if (existingGroup)
        {
          existingGroup.commands.push(command);
        }
        else
        {
          groupsMap.set(extensionId, {
            extensionId,
            extensionName,
            commands: [ command ]
          });
        }
      }

      return Array.from(groupsMap.values());
    },
    [ filteredCommands ]
  );

  if (commands.length === 0)
  {
    return null;
  }

  return (
    <Popover
      opened={isOpened}
      onChange={handleOpenChange}
      position="bottom-end"
      shadow="md"
      radius="md"
      width={300}
      trapFocus={false}
      withinPortal
    >
      <Popover.Target>
        <Tooltip
          label={t("imageDetail.moreCommands")}
          disabled={isOpened}
          withArrow
          position="left"
        >
          <ActionIcon
            variant="default"
            size={32}
            radius="md"
            onClick={handleToggleOpened}
          >
            <IconDots size={Common.IconSmallSize} stroke={Common.IconStrokeSize}/>
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <TextInput
          size="xs"
          placeholder={t("imageDetail.searchCommands")}
          leftSection={<IconSearch size={14} stroke={Common.IconStrokeSize}/>}
          value={searchQuery}
          onChange={handleSearchChange}
          radius="sm"
          mb="xs"
        />
        <ScrollArea.Autosize mah={320} type="auto">
          {extensionGroups.length === 0 ? (
            <Text size="xs" c="dimmed" ta="center" py="md">
              {t("imageDetail.noCommandsFound")}
            </Text>
          ) : (
            <Stack gap="xs">
              {extensionGroups.map(
                (group) =>
                {
                  return (
                    <Stack key={group.extensionId} gap={2}>
                      <Group gap={6} px="xs" pt="xs" pb={2} align="center" wrap="nowrap">
                        <ExtensionBadge idOrExtension={group.extensionId} color="gray"/>
                      </Group>
                      {group.commands.map(
                        (command) =>
                        {
                          return (
                            <Button
                              key={command.id}
                              variant="subtle"
                              color="gray"
                              fullWidth
                              justify="flex-start"
                              size="xs"
                              radius="sm"
                              leftSection={command.icon("sm")}
                              onClick={() => handleExecuteCommand(command)}
                              disabled={command.disabled || !command.isAvailable}
                              loading={command.isLoading}
                            >
                              <Text size="xs" truncate="end">
                                {command.label}
                              </Text>
                            </Button>
                          );
                        }
                      )}
                    </Stack>
                  );
                }
              )}
            </Stack>
          )}
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
