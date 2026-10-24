import { ReactElement } from "react";
import { Box, Button, Group, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { DeskTabType } from "types";
import { Common, ExtensionBadge, ShortcutBadge } from "app/components";
import { TabSubtitle } from "../index";


export interface TabHeaderPropsType
{

  readonly tab: DeskTabType;
  readonly isDetailsOpen: boolean;
  readonly onToggleDetails: () => void;

}

export default function TabHeader({
  tab,
  isDetailsOpen,
  onToggleDetails
}: TabHeaderPropsType): ReactElement | null
{
  const [ t ] = useTranslation();
  if (tab.header === undefined)
  {
    return null;
  }

  return (
    <>
      <Box p="xs" px="md">
        <Group justify="space-between" align="center" gap="md" wrap="nowrap">
          <Stack gap="xs" style={{ minWidth: 0, flex: 1 }}>
            <Group gap="xs" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
              <Title order={1} size="h3" lineClamp={1}>
                {tab.header.title}
              </Title>
              {tab.extensionId && (
                <ExtensionBadge idOrExtension={tab.extensionId} size="lg" color="gray"/>
              )}
            </Group>
            <TabSubtitle tab={tab} location="header"/>
            {tab.header.description && (
              <Text size="sm" lineClamp={1}>
                {tab.header.description}
              </Text>
            )}
          </Stack>
          <Tooltip label={<ShortcutBadge combo="mod + i" size="xs"/>} position="bottom" withArrow>
            <Button
              variant={isDetailsOpen === true ? "filled" : "light"}
              size="sm"
              leftSection={<IconInfoCircle size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
              onClick={onToggleDetails}
            >
              {t("deskTabHeader.tabDetails")}
            </Button>
          </Tooltip>
        </Group>
      </Box>
    </>
  );
}
