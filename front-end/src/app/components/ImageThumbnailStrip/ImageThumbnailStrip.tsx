import { ReactElement } from "react";
import { Box, Flex, type MantineRadius } from "@mantine/core";

import { ImageSummary } from "@picteus/ws-client";

import ImageThumbnail from "../ImageThumbnail/ImageThumbnail.tsx";


type ImageThumbnailStripPropsType = {
  readonly images: readonly ImageSummary[];
  readonly edge: number;
  readonly gap: number;
  readonly fit?: "contain" | "cover";
  readonly radius?: MantineRadius;
  readonly wrap?: boolean;
};

export default function ImageThumbnailStrip({
  images,
  edge,
  gap,
  fit = "contain",
  radius,
  wrap = false
}: ImageThumbnailStripPropsType): ReactElement
{
  const isOverlapping = gap < 0;

  return (
    <Flex
      align="center"
      gap={isOverlapping === true ? 0 : gap}
      wrap={wrap === true ? "wrap" : "nowrap"}
    >
      {images.map((image, index) =>
      {
        if (isOverlapping === true)
        {
          return (
            <Box
              key={image.id}
              w={edge}
              h={edge}
              flex="0 0 auto"
              ml={index > 0 ? gap : undefined}
              bd="2px solid var(--mantine-color-body)"
              bdrs={radius}
              style={{ overflow: "hidden" }}
            >
              <ImageThumbnail
                imageOrUrl={image}
                edge="100%"
                requestEdge={edge * 2}
                fit={fit}
                radius={0}
              />
            </Box>
          );
        }

        return (
          <ImageThumbnail
            key={image.id}
            imageOrUrl={image}
            edge={edge}
            fit={fit}
            radius={radius}
          />
        );
      })}
    </Flex>
  );
}
