import React, { ReactElement } from "react";
import { IconCode, IconFileText, IconPhoto, IconStack2, IconWorld } from "@tabler/icons-react";

import { DeskTabType } from "types";
import { Common, ExtensionIcon, ResourceIcon } from "app/components";


export interface DeskTabIconPropsType
{
  readonly tab: DeskTabType;
  isCompact: boolean;
}

export default function DeskTabIcon({ tab, isCompact }: DeskTabIconPropsType): ReactElement
{
  const size = isCompact === true ? Common.IconSmallSize : Common.IconLargeSize;
  if (tab.icon)
  {
    return <ResourceIcon icon={tab.icon} isCompact={isCompact}/>;
  }
  else if (tab.header?.icon)
  {
    return <ResourceIcon icon={tab.header.icon} isCompact={isCompact}/>;
  }
  else if (tab.content.kind === "image" || tab.content.kind === "images")
  {
    return <IconPhoto size={size} stroke={Common.IconStrokeSize}/>;
  }
  else if (tab.content.kind === "url")
  {
    return <IconWorld size={size} stroke={Common.IconStrokeSize}/>;
  }
  else if (tab.content.kind === "html")
  {
    return <IconCode size={size} stroke={Common.IconStrokeSize}/>;
  }
  else if (tab.content.kind === "markdown")
  {
    return <IconFileText size={size} stroke={Common.IconStrokeSize}/>;
  }
  else if (tab.extensionId)
  {
    return <ExtensionIcon idOrExtension={tab.extensionId} size="sm"/>;
  }
  return <IconStack2 size={size} stroke={Common.IconStrokeSize}/>;
}
