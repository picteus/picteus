import { ReactElement } from "react";
import { Image } from "@mantine/core";

import { Extension, ManifestExtensionCommand, MarketplaceExtension } from "@picteus/ws-client";

import { IconSizeType, UiCommandType } from "types";
import { ExtensionsService } from "app/services";
import Common from "../Common/Common.ts";
import ExtensionIcon from "../ExtensionIcon/ExtensionIcon.tsx";


type CommandIconPropsType = {
  readonly extensionId: string;
  readonly command: UiCommandType | ManifestExtensionCommand;
  readonly size: IconSizeType;
  readonly isInstalled?: boolean;
  readonly fallbackIconSource?: string | Extension | MarketplaceExtension;
};

export default function CommandIcon({
  extensionId,
  command,
  size,
  isInstalled = true,
  fallbackIconSource
}: CommandIconPropsType): ReactElement
{
  const iconUri = "on" in command ? command.ui?.iconUri : command.iconUri;
  if (isInstalled === false || iconUri === undefined || iconUri.trim().length === 0)
  {
    return <ExtensionIcon idOrExtension={fallbackIconSource ?? extensionId} size={size}/>;
  }
  const imageSrc = ExtensionsService.getCommandIconURL(extensionId, iconUri);
  const edge = Common.IconFromStringToNumberSize(size);
  return <Image src={imageSrc} w={edge} h={edge} fit="contain" radius="sm"/>;
}
