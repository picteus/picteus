import React from "react";
import { Badge } from "@mantine/core";

import { ExtensionImageTag } from "@picteus/ws-client";

import { ExtensionIcon } from "../index.ts";


type EntityStatusType = {
  imageTag: ExtensionImageTag;
};

export default function EntityStatus({ imageTag }: EntityStatusType)
{
  return <Badge tt="none" variant="outline" leftSection={<ExtensionIcon id={imageTag.id} size="sm" />}>{imageTag.value}</Badge>;
}
