import React, { ReactElement, useRef, useState } from "react";
import { ActionIcon, Badge, Button, Divider, Drawer, Group, Paper, Stack, Switch, Text, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAdjustmentsHorizontal,
  IconArrowDown,
  IconArrowUp,
  IconEyeOff,
  IconGripVertical,
  IconRestore,
  IconRotate
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useEscapeKey } from "app/hooks";
import { Common } from "app/components";

import { useImageDataSectionsContext } from "../../../../context/ImageDataSectionsContext.tsx";


export type ImageDataDrawerSectionItemType =
  {
    readonly id: string;
    readonly label: string;
    readonly isVisible: boolean;
    readonly badge?: string | number;
  };

export default function ImageCardsSettings(): ReactElement
{
  const [ t ] = useTranslation();
  const context = useImageDataSectionsContext();
  const [ drawerOpened, { open: openDrawer, close: closeDrawer } ] = useDisclosure(false);
  const sections = context.sections;
  const contentRef = useRef<HTMLDivElement>(null);
  useEscapeKey(contentRef, closeDrawer, drawerOpened);
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
      context.reorderSections(updated);
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
      context.reorderSections(updated);
    }
  }

  function handleMoveDown(index: number): void
  {
    if (index < sections.length - 1)
    {
      const updated = [ ...sections ];
      const [ item ] = updated.splice(index, 1);
      updated.splice(index + 1, 0, item);
      context.reorderSections(updated);
    }
  }

  const hiddenSectionsCount = sections.filter((section) => !section.isVisible).length;
  const hasHiddenSections = hiddenSectionsCount > 0;

  return (
    <>
      {drawerOpened === false && (
        <>
          {hasHiddenSections && (
            <Button
              variant="light"
              color="orange"
              size="compact-xs"
              leftSection={<IconEyeOff size={Common.IconSmallSize}/>}
              onClick={openDrawer}
            >
              {t("imageDetail.settings.reset", { count: hiddenSectionsCount })}
            </Button>
          )}
          <Tooltip
            label={t("imageDetail.settings.title")}
            position="bottom"
            withArrow
          >
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={openDrawer}
            >
              <IconAdjustmentsHorizontal size={18}/>
            </ActionIcon>
          </Tooltip>
        </>
      )}
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
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
        {drawerOpened && (
          <Stack ref={contentRef} gap="md">
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
                  onClick={context.restoreAllSections}
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
                onClick={context.resetDefaults}
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
                            context.toggleSectionVisibility(section.id);
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
      </Drawer>
    </>);
}

