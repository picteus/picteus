import React, { ReactNode } from "react";
import { Badge, Group } from "@mantine/core";

import { ExtensionImageTag } from "@picteus/ws-client";

import { ExtensionIcon } from "../index.ts";


export type ImageTagPropsType =
  {
    readonly tag: ExtensionImageTag;
    readonly kind: "badge" | "plain";
    readonly withExtensionPrefix?: boolean;
  };

export default function ImageTag({
  tag,
  kind,
  withExtensionPrefix = true
}: ImageTagPropsType): ReactNode
{
  const tagValue = tag.value.startsWith(`${tag.id}:`) ? tag.value.slice(tag.id.length + 1) : tag.value;
  const extensionIcon = withExtensionPrefix ? <ExtensionIcon idOrExtension={tag.id} size="sm"/> : undefined;

  if (kind === "badge")
  {
    return (
      <Badge
        tt="none"
        variant="outline"
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
