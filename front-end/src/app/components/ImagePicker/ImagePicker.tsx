import { ReactElement, useCallback, useMemo, useState } from "react";
import { Box, Button, Group, Stack, Tabs, Text } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ImagePickerSelectionModeType } from "types";
import { useImageSummariesByIds } from "app/hooks";
import ActionLink from "../ActionLink/ActionLink.tsx";
import { EntityIcons } from "../AppIcons/AppIcons.ts";
import Common from "../Common/Common.ts";
import FlexScrollArea from "../FlexScrollArea/FlexScrollArea.tsx";
import ImageThumbnailStrip from "../ImageThumbnailStrip/ImageThumbnailStrip.tsx";
import ModalActions from "../ModalActions/ModalActions.tsx";
import { CollectionsPickerTab, RecentImagesPickerTab } from "./components";
import style from "./ImagePicker.module.scss";


type ImagePickerPropsType = {
  readonly selectionMode: ImagePickerSelectionModeType;
  readonly initialSelectedIds: readonly string[];
  readonly withTags?: readonly string[];
  readonly onCancel: () => void;
  readonly onConfirm: (imageIds: string[]) => void;
};

type ImagePickerTabType = "recent" | "collections";

const MAX_FOOTER_STACK_THUMBS = 3;

export default function ImagePicker({
  selectionMode,
  initialSelectedIds,
  withTags,
  onCancel,
  onConfirm
}: ImagePickerPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const [ activeTab, setActiveTab ] = useState<ImagePickerTabType>("recent");
  const [ hasVisitedCollections, setHasVisitedCollections ] = useState<boolean>(false);
  const [ draftIds, setDraftIds ] = useState<string[]>(() => [ ...initialSelectedIds ]);

  const footerPreviewIds = useMemo<string[]>(
    () => draftIds.slice(0, MAX_FOOTER_STACK_THUMBS),
    [ draftIds ]
  );

  const { summaries: footerPreviewSummaries } = useImageSummariesByIds(footerPreviewIds, {
    scope: "footerSelected",
    keepPreviousData: true
  });

  const handleToggle = useCallback((imageId: string): void =>
  {
    setDraftIds((previousIds) =>
    {
      if (selectionMode === "single")
      {
        return previousIds.length === 1 && previousIds[0] === imageId ? [] : [ imageId ];
      }
      if (previousIds.includes(imageId) === true)
      {
        return previousIds.filter((id) => id !== imageId);
      }
      return [ ...previousIds, imageId ];
    });
  }, [ selectionMode ]);

  const handleSelectMany = useCallback((imageIds: readonly string[]): void =>
  {
    if (selectionMode !== "multiple")
    {
      return;
    }
    setDraftIds((previousIds) =>
    {
      const nextSet = new Set(previousIds);
      for (const imageId of imageIds)
      {
        nextSet.add(imageId);
      }
      return Array.from(nextSet);
    });
  }, [ selectionMode ]);

  const handleClear = useCallback((): void =>
  {
    setDraftIds([]);
  }, []);

  const handleConfirm = useCallback((): void =>
  {
    if (draftIds.length === 0)
    {
      return;
    }
    onConfirm(draftIds);
  }, [ draftIds, onConfirm ]);

  function renderTabPanel(tab: ImagePickerTabType, content: ReactElement): ReactElement
  {
    const isHidden = activeTab !== tab;
    return (
      <div
        className={`${style.pickerTabPanel}${isHidden === true ? ` ${style.pickerTabPanelHidden}` : ""}`}
        inert={isHidden}
        aria-hidden={isHidden || undefined}
      >
        {content}
      </div>
    );
  }

  const CollectionsIcon = EntityIcons.collections;

  return (
    <Box className={style.pickerRoot}>
      <Stack gap="xs" className={style.pickerHeader}>
        <Tabs
          value={activeTab}
          onChange={(nextValue) =>
          {
            if (nextValue === "recent" || nextValue === "collections")
            {
              setActiveTab(nextValue);
              if (nextValue === "collections")
              {
                setHasVisitedCollections(true);
              }
            }
          }}
        >
          <Tabs.List>
            <Tabs.Tab
              value="recent"
              leftSection={<IconClock size={Common.IconSmallSize} stroke={Common.IconStrokeSize}/>}
            >
              {t("imagePicker.tabRecent")}
            </Tabs.Tab>
            <Tabs.Tab
              value="collections"
              leftSection={<CollectionsIcon size={Common.IconSmallSize} stroke={Common.IconStrokeSize}/>}
            >
              {t("field.collections")}
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </Stack>

      <Box className={style.pickerTabPanels}>
        {renderTabPanel(
          "recent",
          <FlexScrollArea offsetScrollbars="present" isContentFlex>
            <Box className={style.pickerTabContent}>
              <RecentImagesPickerTab
                selectionMode={selectionMode}
                selectedIds={draftIds}
                withTags={withTags}
                onToggle={handleToggle}
              />
            </Box>
          </FlexScrollArea>
        )}
        {hasVisitedCollections === true && renderTabPanel(
          "collections",
          <CollectionsPickerTab
            isActive={activeTab === "collections"}
            selectionMode={selectionMode}
            selectedIds={draftIds}
            withTags={withTags}
            onToggle={handleToggle}
            onSelectMany={handleSelectMany}
          />
        )}
      </Box>

      <ModalActions
        withCancelButton={false}
        leftSection={(
          <Group gap={10} align="center">
            {footerPreviewSummaries.length > 0 && (
              <ImageThumbnailStrip
                images={footerPreviewSummaries}
                edge={28}
                gap={-8}
                fit="cover"
                radius="sm"
              />
            )}
            <Text size="sm" fw={500} c={draftIds.length > 0 ? undefined : "dimmed"}>
              {t("imagePicker.selectedCount", { count: draftIds.length })}
            </Text>
            {draftIds.length > 0 && (
              <ActionLink onClick={handleClear}>
                {t("imagePicker.clear")}
              </ActionLink>
            )}
          </Group>
        )}
      >
        <Button variant="subtle" onClick={onCancel}>
          {t("button.cancel")}
        </Button>
        <Button disabled={draftIds.length === 0} onClick={handleConfirm}>
          {t("button.confirm")}
        </Button>
      </ModalActions>
    </Box>
  );
}
