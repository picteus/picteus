import React from "react";

import { ImageMetadata as PicteusImageMetadata } from "@picteus/ws-client";

import { CodeViewer } from "app/components";


type ImageMetadataType = {
  metadata: PicteusImageMetadata;
  entry: "all" | "exif" | "icc" | "iptc" | "xmp" | "tiffTagPhotoshop" | "others";
};

export default function ImageMetadata({ metadata, entry }: ImageMetadataType) {
  const value = metadata[entry];
  try {
    JSON.parse(value);
    return <CodeViewer code={value} />;
  }
  catch (error) {
    // We ignore the error because we just want to display the value if it is not parseable
    return value;
  }
}
