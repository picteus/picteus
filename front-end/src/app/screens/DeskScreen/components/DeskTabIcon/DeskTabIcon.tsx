import React, { ReactElement } from "react";
import { IconFileText, IconWorld } from "@tabler/icons-react";

import { DeskTabType } from "types";
import { Common, EntityIcons, ExtensionIcon, ResourceIcon } from "app/components";
import { TabLocationType } from "..";


interface DeskTabIconPropsType
{
  readonly tab: DeskTabType;
  location: TabLocationType;
}

export default function DeskTabIcon({ tab, location }: DeskTabIconPropsType): ReactElement
{
  const resourceSize = location === "header" ? "md" : "lg";
  const iconSize = location === "header" ? Common.IconMediumSize : Common.IconLargeSize;
  const ImageIcon = EntityIcons.image;
  const DeskIcon = EntityIcons.desk;
  if (tab.icon)
  {
    return <ResourceIcon icon={tab.icon} size={resourceSize}/>;
  }
  else if (tab.header?.icon)
  {
    return <ResourceIcon icon={tab.header.icon} size={resourceSize}/>;
  }
  else if (tab.content.kind === "image" || tab.content.kind === "images")
  {
    return <ImageIcon size={iconSize} stroke={Common.IconStrokeSize}/>;
  }
  else if (tab.content.kind === "html")
  {
    return <IconWorld size={iconSize} stroke={Common.IconStrokeSize}/>;
  }
  else if (tab.content.kind === "markdown")
  {
    return <IconFileText size={iconSize} stroke={Common.IconStrokeSize}/>;
  }
  else if (tab.extensionId)
  {
    return <ExtensionIcon idOrExtension={tab.extensionId} size="xs"/>;
  }
  return <DeskIcon size={iconSize} stroke={Common.IconStrokeSize}/>;
}
