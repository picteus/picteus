import React, { ReactElement } from "react";
import { Box, Group, Image, Tooltip } from "@mantine/core";

import { Extension } from "@picteus/ws-client";

import { IconSizeType } from "types";
import { Common } from "app/components";
import { useExtensions } from "app/hooks";
import { ExtensionsService } from "app/services";


export interface ExtensionIconPropsType
{

  readonly idOrExtension: string | Extension;
  readonly size: IconSizeType;
  readonly url?: string;
  readonly withTooltip?: boolean;
  readonly withText?: boolean;

}

function ExtensionIconVisual({ idOrExtension, size, url }: ExtensionIconPropsType): ReactElement
{
  const imageSrc = url ?? ExtensionsService.getIconURL(typeof idOrExtension === "string" ? idOrExtension : idOrExtension.manifest.id);
  const edge = Common.IconFromStringToNumberSize(size);
  return <Image src={imageSrc} w={edge} h={edge} fit="contain" radius="sm"/>;
}

function ExtensionIconWithContent({
  idOrExtension,
  size,
  url,
  withTooltip,
  withText
}: ExtensionIconPropsType): ReactElement
{
  const { data: extensions = [] } = useExtensions();
  const extensionId = typeof idOrExtension === "string" ? idOrExtension : idOrExtension.manifest.id;
  const extension = typeof idOrExtension === "string" ? extensions.find((candidate) => candidate.manifest.id === extensionId) : idOrExtension;
  const extensionName = extension?.manifest.name ?? extensionId;

  const visualElement = <ExtensionIconVisual idOrExtension={idOrExtension} size={size} url={url}/>;

  if (withText === true)
  {
    return (
      <Group gap={4} wrap="nowrap" display="inline-flex" align="center">
        {withTooltip === true ? (
          <Tooltip label={extensionName}>
            <Box style={{ display: "inline-flex" }}>
              {visualElement}
            </Box>
          </Tooltip>
        ) : (
          visualElement
        )}
        <span>{extensionName}</span>
      </Group>
    );
  }

  return (
    <Tooltip label={extensionName}>
      <Box style={{ display: "inline-flex" }}>
        {visualElement}
      </Box>
    </Tooltip>
  );
}

export default function ExtensionIcon(props: ExtensionIconPropsType): ReactElement
{
  const shouldLoadExtensionDetails = props.withTooltip === true || props.withText === true;
  if (shouldLoadExtensionDetails === true)
  {
    return <ExtensionIconWithContent {...props}/>;
  }
  return <ExtensionIconVisual {...props}/>;
}
