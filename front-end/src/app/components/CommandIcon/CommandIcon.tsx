import React from "react";
import { Image } from "@mantine/core";

import { UiCommandType } from "types";
import { Common, ExtensionIcon } from "app/components";
import { ExtensionsService } from "app/services";


type CommandIconType = {
  extensionId: string;
  command: UiCommandType;
  size: "sm" | "md";
};

export default function CommandIcon({ extensionId, command, size }: CommandIconType)
{
  if (command.iconUri === undefined)
  {
    return <ExtensionIcon idOrExtension={extensionId} size={size}/>;
  }
  const imageSrc = ExtensionsService.getCommandIconURL(extensionId, command.iconUri);
  const edge = size == "sm" ? Common.IconSmallSize : Common.IconLargeSize;
  return (<Image src={imageSrc} w={edge} h={edge} fit="contain" radius="sm"/>);
}
