import React from "react";
import { Image } from "@mantine/core";

import { ExtensionsService } from "app/services";

type ExtensionIconType = {
  id: string;
  size: "sm" | "md";
  url?: string;
};

export default function ExtensionIcon({ id, size, url }: ExtensionIconType) {
  const imageSrc = url ?? ExtensionsService.getSidebarAnchorIconURL(id);
  const edge = size == "sm" ? 16 : 24;
  return (<Image src={imageSrc} w={edge} h={edge} fit="contain" radius="sm" />);
}
