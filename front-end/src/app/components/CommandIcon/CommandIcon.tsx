import React from "react";
import { Image } from "@mantine/core";

import { ManifestExtensionCommand } from "@picteus/ws-client";

import { UiCommandType } from "types";
import { Common, ExtensionIcon } from "app/components";
import { ExtensionsService } from "app/services";


type CommandIconType = {
  extensionId: string;
  command: UiCommandType | ManifestExtensionCommand;
  size: "sm" | "md";
};

export default function CommandIcon({ extensionId, command, size }: CommandIconType)
{
  const iconUri: string = "on" in command ? command.ui?.iconUri : (command as UiCommandType).iconUri;
  if (iconUri === undefined)
  {
    return <ExtensionIcon idOrExtension={extensionId} size={size}/>;
  }
  const imageSrc = ExtensionsService.getCommandIconURL(extensionId, iconUri);
  const edge = size == "sm" ? Common.IconSmallSize : Common.IconLargeSize;
  return (<Image src={imageSrc} w={edge} h={edge} fit="contain" radius="sm"/>);
}
