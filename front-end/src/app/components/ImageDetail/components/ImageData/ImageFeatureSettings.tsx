import React, { ReactNode, useRef, useState } from "react";
import { ActionIcon, Badge, Button, Divider, Drawer, Group, Paper, Stack, Switch, Text, Tooltip } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconGripVertical, IconRestore, IconRotate } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useEscapeKey } from "app/hooks";


export type ImageDataDrawerSectionItemType =
  {
    readonly id: string;
    readonly label: string;
    readonly isVisible: boolean;
    readonly badge?: string | number;
  };

type ImageFeatureSettingsType =
  {
    readonly opened: boolean;
    readonly onClose: () => void;
    readonly sections: ImageDataDrawerSectionItemType[];
    readonly onToggleVisibility: (sectionId: string) => void;
    readonly onReorder: (reorderedSections: ImageDataDrawerSectionItemType[]) => void;
    readonly onRestoreAll: () => void;
    readonly onResetDefaults: () => void;
  };

export default function ImageFeatureSettings({
  opened,
  onClose,
  sections,
  onToggleVisibility,
  onReorder,
  onRestoreAll,
  onResetDefaults
}: ImageFeatureSettingsType): ReactNode
{
  const [ t ] = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  useEscapeKey(contentRef, onClose, opened);
  const [ draggedIndex, setDraggedIndex ] = useState<number | null>(null);
  const [ dragOverIndex, setDragOverIndex ] = useState<number | null>(null);

  function handleDragStart(event: React.DragEvent<HTMLDivElement>, index: number): void
  {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${index}`);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>, index: number): void
  {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index)
    {
      setDragOverIndex(index);
    }
  }

  function handleDragLeave(): void
  {
    setDragOverIndex(null);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>, targetIndex: number): void
  {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex)
    {
      const updated = [ ...sections ];
      const [ movedItem ] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, movedItem);
      onReorder(updated);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd(): void
  {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleMoveUp(index: number): void
  {
    if (index > 0)
    {
      const updated = [ ...sections ];
      const [ item ] = updated.splice(index, 1);
      updated.splice(index - 1, 0, item);
      onReorder(updated);
    }
  }

  function handleMoveDown(index: number): void
  {
    if (index < sections.length - 1)
    {
      const updated = [ ...sections ];
      const [ item ] = updated.splice(index, 1);
      updated.splice(index + 1, 0, item);
      onReorder(updated);
    }
  }

  const hiddenSectionsCount = sections.filter((section) => !section.isVisible).length;
  const hasHiddenSections = hiddenSectionsCount > 0;

  return (<Drawer
    opened={opened}
    onClose={onClose}
    closeOnEscape={false}
    position="right"
    title={
      <Text fw={600} size="md">
        {t("imageDetail.settings.title")}
      </Text>
    }
    size="sm"
    padding="md"
  >
    {opened && (<Stack ref={contentRef} gap="md">
        <Text size="xs" c="dimmed">
          {t("imageDetail.settings.description")}
        </Text>
        <Group justify="space-between" gap="xs">
          {hasHiddenSections ? (
            <Button
              variant="light"
              color="orange"
              size="xs"
              leftSection={<IconRestore size={14}/>}
              onClick={onRestoreAll}
            >
              {t("imageDetail.settings.restoreAll", { count: hiddenSectionsCount })}
            </Button>
          ) : (
            <Text size="xs" c="dimmed">
              {t("imageDetail.settings.allVisible")}
            </Text>
          )}
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconRotate size={14}/>}
            onClick={onResetDefaults}
          >
            {t("imageDetail.settings.reset")}
          </Button>
        </Group>
        <Divider/>
        <Stack gap="xs">
          {sections.map((section, index) =>
          {
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;
            const canMoveUp = index > 0;
            const canMoveDown = index < sections.length - 1;

            return (<Paper
              key={section.id}
              withBorder
              p="xs"
              radius="md"
              draggable
              onDragStart={(event) =>
              {
                handleDragStart(event, index);
              }}
              onDragOver={(event) =>
              {
                handleDragOver(event, index);
              }}
              onDragLeave={handleDragLeave}
              onDrop={(event) =>
              {
                handleDrop(event, index);
              }}
              onDragEnd={handleDragEnd}
              style={{
                cursor: "grab",
                userSelect: "none",
                transition: "background-color 150ms ease, opacity 150ms ease",
                opacity: isDragging ? 0.35 : section.isVisible ? 1 : 0.65,
                borderStyle: isDragOver ? "dashed" : "solid",
                borderColor: isDragOver ? "var(--mantine-color-blue-filled)" : undefined,
                backgroundColor: isDragOver
                  ? "var(--mantine-color-blue-light)"
                  : "var(--mantine-color-body)"
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    style={{ cursor: "grab" }}
                    aria-label="Drag to reorder"
                  >
                    <IconGripVertical size={16}/>
                  </ActionIcon>
                  <Text size="sm" fw={500} truncate="end">
                    {section.label}
                  </Text>
                  {section.badge !== undefined && (
                    <Badge size="xs" variant="light" color="blue" radius="sm">
                      {section.badge}
                    </Badge>
                  )}
                </Group>
                <Group gap="xs" wrap="nowrap">
                  <Tooltip label={t("imageDetail.settings.moveUp")} position="top" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      disabled={!canMoveUp}
                      onClick={(event) =>
                      {
                        event.stopPropagation();
                        handleMoveUp(index);
                      }}
                    >
                      <IconArrowUp size={14}/>
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={t("imageDetail.settings.moveDown")} position="top" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      disabled={!canMoveDown}
                      onClick={(event) =>
                      {
                        event.stopPropagation();
                        handleMoveDown(index);
                      }}
                    >
                      <IconArrowDown size={14}/>
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip
                    label={t(`imageDetail.settings.${section.isVisible ? "hide" : "show"}`)}
                    position="top"
                    withArrow
                  >
                    <Switch
                      checked={section.isVisible}
                      onChange={() =>
                      {
                        onToggleVisibility(section.id);
                      }}
                      size="xs"
                      color="blue"
                    />
                  </Tooltip>
                </Group>
              </Group>
            </Paper>);
          })}
        </Stack>
      </Stack>
    )}
  </Drawer>);
}
