import React, { ReactElement } from "react";
import { Box, Image, Tooltip } from "@mantine/core";

import { Extension } from "@picteus/ws-client";

import { Common } from "app/components";
import { useExtensions } from "app/hooks";
import { ExtensionsService } from "app/services";


type ExtensionIconType = {
  idOrExtension: string | Extension;
  size: "sm" | "md";
  url?: string;
  withTooltip?: boolean;
};

function ExtensionIconVisual({ idOrExtension, size, url }: ExtensionIconType): ReactElement
{
  const imageSrc = url ?? ExtensionsService.getIconURL(typeof idOrExtension === "string" ? idOrExtension : idOrExtension.manifest.id);
  const edge = size === "sm" ? Common.IconSmallSize : Common.IconLargeSize;
  return <Image src={imageSrc} w={edge} h={edge} fit="contain" radius="sm"/>;
}

function ExtensionIconWithTooltip({ idOrExtension, size, url }: ExtensionIconType): ReactElement
{
  const { data: extensions = [] } = useExtensions();
  const extensionId = typeof idOrExtension === "string" ? idOrExtension : idOrExtension.manifest.id;
  const extension = typeof idOrExtension === "string" ? extensions.find((candidate) => candidate.manifest.id === extensionId) :
    idOrExtension;
  const extensionName = extension?.manifest.name ?? extensionId;

  return (
    <Tooltip label={extensionName}>
      <Box style={{ display: "inline-flex" }}>
        <ExtensionIconVisual idOrExtension={idOrExtension} size={size} url={url}/>
      </Box>
    </Tooltip>
  );
}

export default function ExtensionIcon(props: ExtensionIconType): ReactElement
{
  if (props.withTooltip === true)
  {
    return <ExtensionIconWithTooltip {...props}/>;
  }
  return <ExtensionIconVisual {...props}/>;
}
