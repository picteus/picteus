import React, { ReactElement, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ExtensionImageFeature, ImageFeatureType } from "@picteus/ws-client";

import { computeTypeFeatureContainers } from "../../ImageDataComputer.ts";
import ImageFeatureCard from "../ImageFeatureCard/ImageFeatureCard.tsx";


export type ImageFeatureTypeCardPropsType =
  {
    readonly type: ImageFeatureType;
    readonly features: readonly ExtensionImageFeature[];
    readonly isOpened: boolean;
    readonly onToggle: () => void;
    readonly onHide: () => void;
  };

export default function ImageFeatureTypeCard({
  type,
  features,
  isOpened,
  onToggle,
  onHide
}: ImageFeatureTypeCardPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const featureContainers = useMemo(() => computeTypeFeatureContainers(type, features, t),
    [ type, features, t ]
  );

  if (featureContainers.length === 0)
  {
    return null;
  }
  return (
    <ImageFeatureCard
      title={t(`imageDetail.type.${type}`)}
      featureContainers={featureContainers}
      isOpened={isOpened}
      onToggle={onToggle}
      onHide={onHide}
    />
  );
}
