import React, { useMemo } from "react";
import { Box, Flex } from "@mantine/core";

import { ImageSummary } from "@picteus/ws-client";

import { ImageService } from "app/services";


type ImagesStackType = { images: ImageSummary[] };

export default function ImagesStack({images}: ImagesStackType) {

  const renderedImages = useMemo(() => (images.map((img, index) => {
    const smallEdge = 80;
    const largeEdge = 160;
    return (
      <Box
        key={img.id}
        style={{
          width: smallEdge,
          height: smallEdge,
          borderRadius: 8,
          marginLeft: index > 0 ? -40 : 0,
          boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
          zIndex: images.length - index,
          transition: "transform 0.2s ease, z-index 0s",
          backgroundImage: `url(${ImageService.getImageSrc(img.url, largeEdge, largeEdge, "outbox")})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          cursor: "pointer",
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}
        onMouseEnter={(event: React.MouseEvent<HTMLDivElement>) =>
        {
          event.currentTarget.style.transform = "translateY(-10px) scale(1.1)";
          event.currentTarget.style.zIndex = "100";
        }}
        onMouseLeave={(event: React.MouseEvent<HTMLDivElement>) =>
        {
          event.currentTarget.style.transform = "none";
          event.currentTarget.style.zIndex = String(images.length - index);
        }}
      />
    );
  })), [images]);

  return (<Flex mt="xs" style={{ padding: "10px 0", minHeight: 100 }}>
    {renderedImages}
  </Flex>);
}
