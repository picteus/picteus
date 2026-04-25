import React, { useMemo } from "react";

import { ExtensionImageFeature } from "@picteus/ws-client";

import { capitalizeText } from "utils";
import { CodeViewer, Markdown } from "app/components";


type ImageFeatureType = {
  feature: ExtensionImageFeature;
};

export default function ImageFeature({ feature }: ImageFeatureType) {

  return useMemo(()=> {
    const value = feature.value;
    switch (feature.format) {
      default:
        return "Unexpected";
      case "json":
        return  <CodeViewer code={feature.value} />;
      case "markdown":
        // We need to handle the specific case the linebreak "<br>", because the library does not handle it properly by default
        return <Markdown content={value as string} />;
      case "xml":
        return value as string;
      case "html":
        return value as string;
      case "binary":
        return "";
      case "string":
        return capitalizeText(value as string);
      case "integer":
      case "float":
      case "boolean":
        return value.toString();
    }
  }, [feature]);
}
