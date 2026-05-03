import React, { useMemo } from "react";

import {
  ExtensionImageFeature,
  GenerationRecipeFromJSON,
  ImageFeatureType as PicteusImageFeatureType
} from "@picteus/ws-client";

import { ViewMode } from "types";
import { capitalizeText } from "utils";
import { CodeViewer, Markdown } from "app/components";
import { ImageRecipe } from "../index";


type ImageFeatureType = {
  feature: ExtensionImageFeature;
  viewMode: ViewMode;
};

export default function ImageFeature({ feature, viewMode }: ImageFeatureType) {

  return useMemo(()=> {
    const value = feature.value;
    switch (feature.format) {
      default:
        return "Unexpected";
      case "json":
        if (feature.type === PicteusImageFeatureType.Recipe) {
          return <ImageRecipe recipe={GenerationRecipeFromJSON(JSON.parse(feature.value as string))} viewMode={viewMode}/>;
        }
        return  <CodeViewer code={feature.value as string} />;
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
