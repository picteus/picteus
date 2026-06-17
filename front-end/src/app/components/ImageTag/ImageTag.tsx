import React from "react";
import { Badge, Group } from "@mantine/core";

import { ExtensionImageTag } from "@picteus/ws-client";

import { ExtensionIcon } from "../index.ts";


type ImageTagType = {
  tag: ExtensionImageTag;
  kind: "badge" | "plain"
};

export default function ImageTag({ tag, kind }: ImageTagType)
{
  if (kind === "badge")
  {
    return (<Badge tt="none" variant="outline"
                   leftSection={<ExtensionIcon idOrExtension={tag.id} size="sm"/>}>{tag.value}</Badge>);
  }
  else
  {
    return (<Group gap={4} wrap="nowrap">
        <ExtensionIcon idOrExtension={tag.id} size="sm"/>
        <span>{tag.value}</span>
      </Group>
    );
  }
}
