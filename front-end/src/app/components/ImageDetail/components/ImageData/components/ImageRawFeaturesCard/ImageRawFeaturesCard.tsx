import React, { ReactElement, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ExtensionImageFeature } from "@picteus/ws-client";

import { computeRawFeatureContainers } from "../../ImageDataComputer.ts";
import ImageFeatureCard from "../ImageFeatureCard/ImageFeatureCard.tsx";


export type ImageRawFeaturesCardPropsType =
  {
    readonly rawFeatures: readonly ExtensionImageFeature[];
    readonly isOpened: boolean;
    readonly onToggle: () => void;
    readonly onHide: () => void;
  };

export default function ImageRawFeaturesCard({
  rawFeatures,
  isOpened,
  onToggle,
  onHide
}: ImageRawFeaturesCardPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const rawFeatureContainers = useMemo(() => computeRawFeatureContainers(rawFeatures),
    [ rawFeatures ]
  );

  if (rawFeatureContainers.length === 0)
  {
    return null;
  }

  return (
    <ImageFeatureCard
      title={t("imageDetail.rawFeatures")}
      featureContainers={rawFeatureContainers}
      isOpened={isOpened}
      onToggle={onToggle}
      onHide={onHide}
    />
  );
}
