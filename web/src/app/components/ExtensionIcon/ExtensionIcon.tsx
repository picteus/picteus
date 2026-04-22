import React from "react";
import { Image } from "@mantine/core";

import { Extension } from "@picteus/ws-client";

import { Common } from "app/components";
import { ExtensionsService } from "app/services";


type ExtensionIconType = {
  idOrExtension: string | Extension;
  size: "sm" | "md";
  url?: string;
};

export default function ExtensionIcon({ idOrExtension, size, url }: ExtensionIconType) {
  const imageSrc = url ?? ExtensionsService.getIconURL(typeof idOrExtension === "string" ? idOrExtension : idOrExtension.manifest.id);
  const edge = size == "sm" ? Common.IconSmallSize : 24;
  return (<Image src={imageSrc} w={edge} h={edge} fit="contain" radius="sm" />);
}
