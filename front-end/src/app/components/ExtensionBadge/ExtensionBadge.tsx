import React, { ReactElement, ReactNode } from "react";
import { Badge, Box, MantineColor, MantineSize, Tooltip } from "@mantine/core";

import { Extension } from "@picteus/ws-client";

import { useExtensions } from "app/hooks";
import ExtensionIcon from "../ExtensionIcon/ExtensionIcon.tsx";


type ExtensionBadgeType = {
  readonly idOrExtension: string | Extension;
  readonly size?: MantineSize;
  readonly variant?: "light" | "outline" | "filled" | "subtle" | "default";
  readonly color?: MantineColor;
  readonly tooltip?: ReactNode;
};

export default function ExtensionBadge({
  idOrExtension,
  size = "md",
  variant = "light",
  color,
  tooltip
}: ExtensionBadgeType): ReactElement
{
  const { data: extensions = [] } = useExtensions();
  const extensionId = typeof idOrExtension === "string" ? idOrExtension : idOrExtension.manifest.id;
  const extension = typeof idOrExtension === "string" ? extensions.find((candidate) => candidate.manifest.id === idOrExtension) : idOrExtension;
  const extensionName = extension?.manifest.name ?? extensionId;

  const badgeElement = (
    <Badge
      size={size}
      variant={variant}
      color={color}
      radius="sm"
      tt="none"
      leftSection={<ExtensionIcon idOrExtension={extensionId} size="sm"/>}
    >
      {extensionName}
    </Badge>
  );

  if (tooltip === undefined)
  {
    return badgeElement;
  }

  return (
    <Tooltip label={tooltip} position="bottom" withArrow>
      <Box style={{ display: "inline-flex" }}>
        {badgeElement}
      </Box>
    </Tooltip>
  );
}
