import { ReactElement } from "react";
import { Image, type MantineRadius } from "@mantine/core";

import { ImageSummary } from "@picteus/ws-client";

import { ImageService } from "app/services";
import Common from "../Common/Common.ts";

import variables from "assets/style/variablesExport.module.scss";


type CommonImageThumbnailType = {
  readonly imageOrUrl: ImageSummary | string;
  readonly fit?: "contain" | "cover";
  readonly radius?: MantineRadius;
  readonly withBorder?: boolean;
  readonly loading?: "lazy" | "eager";
};

export type ImageThumbnailType = CommonImageThumbnailType & (
  | { readonly edge: number; readonly requestEdge?: never; }
  | { readonly edge: "100%"; readonly requestEdge: number; }
);

export default function ImageThumbnail({
  imageOrUrl,
  edge,
  requestEdge,
  fit = "contain",
  radius = variables.imageRadius,
  withBorder,
  loading
}: ImageThumbnailType): ReactElement
{
  const resolvedRequestEdge = edge === "100%" ? requestEdge : edge * 2;

  return (
    <Image
      w={edge}
      h={edge}
      flex={edge === "100%" ? undefined : "0 0 auto"}
      fit={fit}
      radius={radius}
      bg={fit === "cover" ? "var(--mantine-color-default)" : undefined}
      bd={withBorder === true ? Common.IconBorder : undefined}
      alt={typeof imageOrUrl === "string" ? "" : imageOrUrl.name}
      loading={loading}
      src={typeof imageOrUrl === "string"
        ? imageOrUrl
        : ImageService.getImageSrc(imageOrUrl.url, resolvedRequestEdge, resolvedRequestEdge)}
      fallbackSrc={Common.FallbackImageUrl}
    />
  );
}
