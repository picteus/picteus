import { ReactElement, useEffect, useState } from "react";
import { ActionIcon, Box, Collapse, Group, Paper, ScrollArea, Text, Title } from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import { DeskTabType } from "types";
import { Common, ExtensionBadge, FormatedDate, Markdown } from "app/components";


export interface TabHeaderPropsType
{
  tab: DeskTabType;
}

export default function TabHeader({ tab }: TabHeaderPropsType): ReactElement | null
{
  const [ isHeaderExpanded, setIsHeaderExpanded ] = useState<boolean>(true);

  useEffect(() =>
  {
    setIsHeaderExpanded(true);
  }, [ tab.id ]);

  if (tab.header === undefined)
  {
    return null;
  }

  const isCollapsible = Boolean(tab.header.details && tab.header.details.length > 0);

  return (
    <Box
      p="xs"
      px="md"
      bg="var(--mantine-color-body)"
    >
      <Group justify="space-between" align="center" gap="md" wrap="nowrap">
        <Group gap="xs" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
          <Title order={1} lineClamp={1}>
            {tab.header.title}
          </Title>
          {tab.extensionId && (
            <ExtensionBadge idOrExtension={tab.extensionId} size="lg" color="gray"/>
          )}
        </Group>

        {isCollapsible === true && (
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() =>
            {
              setIsHeaderExpanded((previousState) => !previousState);
            }}
          >
            {isHeaderExpanded === true ? <IconChevronUp size={Common.IconSmallSize}/> :
              <IconChevronDown size={Common.IconSmallSize}/>}
          </ActionIcon>
        )}
      </Group>

      <Text size="sm" c="dimmed" lh={1.4} pt="xs">
        {tab.header.subtitle.length > 0 && (
          <span>{tab.header.subtitle} • </span>
        )}
        <FormatedDate timestamp={tab.timestampInMilliseconds}/>
      </Text>

      <Text size="sm" lh={1.4} pt="xs">
        {tab.header.description}
      </Text>

      {isCollapsible === true && tab.header.details && (
        <Collapse expanded={isHeaderExpanded === true}>
          <Box pt="xs">
            <Paper
              p="xs"
              px="sm"
              withBorder
              radius="sm"
              fz="xs"
            >
              <ScrollArea.Autosize mah={160}>
                <Markdown content={tab.header.details} size="xs"/>
              </ScrollArea.Autosize>
            </Paper>
          </Box>
        </Collapse>
      )}
    </Box>
  );
}
