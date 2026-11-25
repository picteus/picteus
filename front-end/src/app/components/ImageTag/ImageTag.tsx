import React, { ReactNode } from "react";
import { Badge, Group, MantineColor } from "@mantine/core";

import { ExtensionImageTag } from "@picteus/ws-client";

import { ExtensionIcon } from "..";


type ImageTagPropsType =
  {
    readonly tag: ExtensionImageTag;
    readonly kind?: "badge" | "plain";
    readonly withExtensionPrefix?: boolean;
    readonly variant?: "light" | "outline" | "filled" | "subtle" | "default";
    readonly color?: MantineColor;
  };

export default function ImageTag({
  tag,
  kind = "badge",
  withExtensionPrefix = true,
  variant = "outline",
  color
}: ImageTagPropsType): ReactNode
{
  const tagValue = tag.value.startsWith(`${tag.id}:`) ? tag.value.slice(tag.id.length + 1) : tag.value;
  const extensionIcon = withExtensionPrefix ? <ExtensionIcon idOrExtension={tag.id} size="xs"/> : undefined;

  if (kind === "badge")
  {
    return (
      <Badge
        fw={400}
        size="md"
        variant={variant}
        color={color}
        tt="none"
        leftSection={extensionIcon}
      >
        {tagValue}
      </Badge>
    );
  }
  else
  {
    return (
      <Group gap={4} wrap="nowrap">
        {extensionIcon}
        <span>{tagValue}</span>
      </Group>
    );
  }
}
