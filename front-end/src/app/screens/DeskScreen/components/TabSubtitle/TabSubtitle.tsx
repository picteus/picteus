import React, { ReactElement } from "react";
import { Group, Text } from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";

import { DeskTabType } from "types";
import { Common, DotSeparated, ExtensionIcon, FormatedDate } from "app/components";
import { useImage, useRepository } from "app/hooks";

import { TabLocationType } from "..";


interface TabSubtitlePropsType
{

  readonly tab: DeskTabType;
  readonly location: TabLocationType;

}

export default function TabSubtitle({
  tab,
  location
}: TabSubtitlePropsType): ReactElement
{
  const isMenu = location === "menu";
  const subtitle = tab.header?.subtitle;
  const hasSubtitle = Boolean(subtitle && subtitle.trim().length > 0);

  const imageId = tab.content.kind === "image" ? tab.content.imageId : undefined;
  const shouldFetchRepository = location === "menu" && hasSubtitle === false && tab.content.kind === "image";

  const { data: image } = useImage(imageId, { enabled: shouldFetchRepository });
  const { data: repository } = useRepository(image?.repositoryId, { enabled: Boolean(shouldFetchRepository && image?.repositoryId) });
  const repositoryName = repository?.name;

  const subtitleAndDate = (
    <DotSeparated inline>
      {subtitle}
      <FormatedDate timestamp={tab.timestampInMilliseconds}/>
    </DotSeparated>
  );

  const color = "dimmed";
  if (isMenu)
  {
    return (
      <DotSeparated size="xs" wrap="nowrap">
        {tab.extensionId && (
          <ExtensionIcon idOrExtension={tab.extensionId} size="xs" withText/>
        )}
        {repositoryName && (
          <Group gap={4} wrap="nowrap" align="center" component="span" display="inline-flex">
            <IconFolder size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>
            <span>{repositoryName}</span>
          </Group>
        )}
        <Text size="xs" truncate miw={0}>{subtitleAndDate}</Text>
      </DotSeparated>
    );
  }

  return (
    <Text size="sm" c={color} lh={1.4} pt="xs">{subtitleAndDate}</Text>
  );
}
