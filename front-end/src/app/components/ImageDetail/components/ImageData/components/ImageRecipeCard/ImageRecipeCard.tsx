import React, { ReactElement, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ExtensionImageFeature } from "@picteus/ws-client";

import { computeRecipeFeatureContainers } from "../../ImageDataComputer.ts";
import ImageFeatureCard from "../ImageFeatureCard/ImageFeatureCard.tsx";


export type ImageRecipeCardPropsType =
  {
    readonly recipeFeatures: readonly ExtensionImageFeature[];
    readonly isOpened: boolean;
    readonly onToggle: () => void;
    readonly onHide: () => void;
  };

export default function ImageRecipeCard({
  recipeFeatures,
  isOpened,
  onToggle,
  onHide
}: ImageRecipeCardPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const featureContainers = useMemo(() => computeRecipeFeatureContainers(recipeFeatures, t),
    [ recipeFeatures, t ]
  );

  if (featureContainers.length === 0)
  {
    return null;
  }

  return (
    <ImageFeatureCard
      title={t("imageDetail.recipe")}
      featureContainers={featureContainers}
      isOpened={isOpened}
      onToggle={onToggle}
      onHide={onHide}
    />
  );
}
