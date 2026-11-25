import { ReactElement, ReactNode, useCallback, useId, useMemo, useRef, useState } from "react";
import { Box, Button, CloseButton, Divider, Flex, Paper, Stack, Tabs, Text, Title } from "@mantine/core";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Extension, Manifest, MarketplaceExtension } from "@picteus/ws-client";

import { ManualSection } from "types";
import { extractManualHeadings, splitMarkdownAfterSection, stripEmptyMarkdownSections } from "utils";
import { ExtensionsService } from "app/services";
import Common from "../../../Common/Common.ts";
import Drawer from "../../../Drawer/Drawer.tsx";
import ExtensionIcon from "../../../ExtensionIcon/ExtensionIcon.tsx";
import FlexScrollArea from "../../../FlexScrollArea/FlexScrollArea.tsx";
import IconTile from "../../../IconTile/IconTile.tsx";
import Markdown from "../../../Markdown/Markdown.tsx";


const SCROLL_SPY_OFFSET_PX = 32;

type ExtensionManualDrawerPropsType =
  {
    readonly opened: boolean;
    readonly onClose: () => void;
    readonly manifest: Manifest;
    readonly iconSource: string | Extension | MarketplaceExtension;
    readonly markdown: string | undefined;
    readonly customIcon?: ReactNode;
    readonly customTitle?: string;
    readonly customSubtitle?: string;
    readonly headingLevelOffset?: number;
    readonly onOpenSettings?: () => void;
  };

export default function ExtensionManualDrawer({
  opened,
  onClose,
  manifest,
  iconSource,
  markdown,
  customIcon,
  customTitle,
  customSubtitle,
  headingLevelOffset = 3,
  onOpenSettings
}: ExtensionManualDrawerPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const uniquePrefix = useId().replace(/:/g, "");
  const headingIdPrefix = `manual-${uniquePrefix}`;

  const normalizedMarkdown = useMemo(
    () => (markdown !== undefined ? stripEmptyMarkdownSections(markdown) : undefined),
    [ markdown ]
  );

  const headings = useMemo(
    () => (normalizedMarkdown !== undefined ? extractManualHeadings(normalizedMarkdown) : []),
    [ normalizedMarkdown ]
  );

  const settingsSectionSplit = useMemo(
    () => (normalizedMarkdown !== undefined && onOpenSettings !== undefined
      ? splitMarkdownAfterSection(normalizedMarkdown, ManualSection.Settings)
      : undefined),
    [ normalizedMarkdown, onOpenSettings ]
  );

  const [ activeHeadingId, setActiveHeadingId ] = useState<string | undefined>(undefined);
  const effectiveActiveHeadingId = activeHeadingId !== undefined && headings.some(heading => heading.id === activeHeadingId)
    ? activeHeadingId
    : (headings[0]?.id ?? null);

  const handleClose = useCallback((): void =>
  {
    setActiveHeadingId(undefined);
    onClose();
  }, [ onClose ]);

  function handleSelectHeading(headingId: string | null): void
  {
    if (headingId === null)
    {
      return;
    }
    setActiveHeadingId(headingId);
    const element = document.getElementById(`${headingIdPrefix}-${headingId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleScrollPositionChange(): void
  {
    const viewport = viewportRef.current;
    if (viewport === null || headings.length === 0)
    {
      return;
    }

    const isAtBottom = viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 4;
    if (isAtBottom === true && viewport.scrollTop > 0)
    {
      setActiveHeadingId(headings[headings.length - 1].id);
      return;
    }

    const viewportTop = viewport.getBoundingClientRect().top;
    let currentId = headings[0].id;
    for (const heading of headings)
    {
      const element = document.getElementById(`${headingIdPrefix}-${heading.id}`);
      if (element !== null && element.getBoundingClientRect().top <= viewportTop + SCROLL_SPY_OFFSET_PX)
      {
        currentId = heading.id;
      }
    }
    setActiveHeadingId(currentId);
  }

  function handleOpenSettings(): void
  {
    handleClose();
    onOpenSettings?.();
  }

  const settingsCallout = settingsSectionSplit !== undefined && onOpenSettings !== undefined ? (
    <Paper
      withBorder
      p="sm"
      radius="md"
      mt="md"
      mb={settingsSectionSplit.after !== undefined ? "lg" : undefined}
    >
      <Flex justify="space-between" align="center" gap="sm" wrap="wrap">
        <Stack gap={2} miw={0} flex={1}>
          <Text size="sm" fw={500}>
            {t("extensionManualDrawer.settingsCalloutTitle")}
          </Text>
          <Text size="xs" c="dimmed">
            {t("extensionManualDrawer.settingsCalloutDescription")}
          </Text>
        </Stack>
        <Button
          size="xs"
          variant="default"
          leftSection={<IconAdjustmentsHorizontal size={14} stroke={Common.IconStrokeSize}/>}
          onClick={handleOpenSettings}
        >
          {t("extensionManualDrawer.openSettings")}
        </Button>
      </Flex>
    </Paper>
  ) : null;

  const defaultSubtitle = ExtensionsService.formatExtensionSubtitle(manifest, t);
  const effectiveTitle = customTitle ?? t("extensionManualDrawer.title", { name: manifest.name });
  const effectiveSubtitle = customSubtitle ?? defaultSubtitle;

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      size={560}
      isFlush
    >
      <Box flex="0 0 auto" pt="lg" pb="md" pl="lg" pr="md">
        <Flex align="center" gap="sm">
          <IconTile size={36} radius="md">
            {customIcon ?? <ExtensionIcon idOrExtension={iconSource} size="md"/>}
          </IconTile>
          <Stack gap={2} miw={0} flex={1}>
            <Title order={4} fw={500} lineClamp={1}>
              {effectiveTitle}
            </Title>
            <Text size="xs" c="dimmed" lineClamp={1}>
              {effectiveSubtitle}
            </Text>
          </Stack>
          <CloseButton
            size="md"
            onClick={handleClose}
          />
        </Flex>
      </Box>

      {headings.length > 0 ? (
        <Box flex="0 0 auto">
          <Tabs
            value={effectiveActiveHeadingId}
            onChange={handleSelectHeading}
            styles={{
              list: {
                flexWrap: "nowrap",
                overflowX: "auto",
                scrollbarWidth: "none",
                gap: "var(--mantine-spacing-lg)"
              },
              tab: {
                paddingLeft: 0,
                paddingRight: 0,
                paddingTop: 4,
                paddingBottom: 8,
                fontWeight: 500
              }
            }}
          >
            <Tabs.List px="lg">
              {headings.map(heading => (
                <Tabs.Tab
                  key={heading.id}
                  value={heading.id}
                  c={effectiveActiveHeadingId === heading.id ? undefined : "dimmed"}
                >
                  {heading.title}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </Box>
      ) : (
        <Divider/>
      )}

      <FlexScrollArea
        scrollbars="xy"
        offsetScrollbars
        viewportRef={viewportRef}
        onScrollPositionChange={handleScrollPositionChange}
      >
        <Box p="lg">
          {normalizedMarkdown !== undefined && normalizedMarkdown.trim().length > 0 ? (
            settingsSectionSplit !== undefined ? (
              <>
                <Markdown
                  content={settingsSectionSplit.beforeAndSection}
                  size="sm"
                  withBoldTitles={false}
                  headingIdPrefix={headingIdPrefix}
                  headingLevelOffset={headingLevelOffset}
                />
                {settingsCallout}
                {settingsSectionSplit.after !== undefined && (
                  <Markdown
                    content={settingsSectionSplit.after}
                    size="sm"
                    withBoldTitles={false}
                    headingIdPrefix={headingIdPrefix}
                    headingLevelOffset={headingLevelOffset}
                  />
                )}
              </>
            ) : (
              <Markdown
                content={normalizedMarkdown}
                size="sm"
                withBoldTitles={false}
                headingIdPrefix={headingIdPrefix}
                headingLevelOffset={headingLevelOffset}
              />
            )
          ) : (
            <Text size="sm" c="dimmed">
              {t("extensionManualDrawer.noManual")}
            </Text>
          )}
        </Box>
      </FlexScrollArea>
    </Drawer>
  );
}
