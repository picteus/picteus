import { ReactElement } from "react";
import { Box, Divider, Flex, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { DeskTabType } from "types";
import { Common, ExtensionIcon, FormatedDate, Markdown, OverlayPanel } from "app/components";


export interface TabDetailsOverlayPropsType
{

  readonly tab: DeskTabType;
  readonly isOpened: boolean;
  readonly onClose: () => void;

}

export default function TabDetailsOverlay({
  tab,
  isOpened,
  onClose
}: TabDetailsOverlayPropsType): ReactElement | null
{
  const [ t ] = useTranslation();

  if (tab.header === undefined)
  {
    return null;
  }

  const { description, details } = tab.header;

  return (
    <OverlayPanel
      isOpened={isOpened}
      onClose={onClose}
      title={t("deskTabDetails.title")}
      width={{ base: "100%", xs: 500 }}
    >
      <Stack gap="md">
        {description && (
          <Stack gap={4}>
            <Text
              size="xs"
              fw={700}
              c="dimmed"
              tt="uppercase"
            >
              {t("deskTabDetails.description")}
            </Text>
            <Text size="sm">
              {description}
            </Text>
          </Stack>
        )}
        {details && (
          <>
            {description && <Divider/>}
            <Stack gap={4}>
              <Text
                size="xs"
                fw={700}
                c="dimmed"
                tt="uppercase"
              >
                {t("deskTabDetails.details")}
              </Text>
              <Box fz="xs">
                <Markdown content={details} size="sm"/>
              </Box>
            </Stack>
          </>
        )}
        <Divider/>
        <Flex gap={4}>
          {tab.extensionId && (
            <>
              <Text size="xs" c="dimmed">
                {t("deskTabDetails.openedBy")}
              </Text>
              <Text size="xs" c="dimmed">
                <ExtensionIcon idOrExtension={tab.extensionId} size="xs" withText/>
              </Text>
            </>
          )}
          <Text size="xs" c="dimmed">
            {Common.DotSeparator}<FormatedDate timestamp={tab.timestampInMilliseconds}/>
          </Text>
        </Flex>
      </Stack>
    </OverlayPanel>
  );
}

