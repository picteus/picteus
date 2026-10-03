import React, { ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import { Accordion, Box, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { ExtensionImageFeature, Image, ImageFeatureType } from "@picteus/ws-client";

import { ViewMode } from "types";
import { useOpenBrowser } from "app/hooks";
import { StorageService } from "app/services";
import { CodeViewer, CopyText, Markdown, UiElementViewProvider } from "app/components";

import { useImageDataSectionsContext } from "../../context/ImageDataSectionsContext.tsx";
import {
  builtInSectionIds,
  computeRecipeFeatureContainers,
  defaultOrderSectionIds,
  getAvailableFeatureTypes,
  isDisplayedInFeatureTypeCards,
  isDisplayedInRecipeCard
} from "./ImageDataComputer.ts";
import ImageInformationCard from "./components/ImageInformationCard/ImageInformationCard.tsx";
import ImageTagsCard from "./components/ImageTagsCard/ImageTagsCard.tsx";
import ImageRecipeCard from "./components/ImageRecipeCard/ImageRecipeCard.tsx";
import ImageFeatureTypeCard from "./components/ImageFeatureTypeCard/ImageFeatureTypeCard.tsx";
import ImageRawFeaturesCard from "./components/ImageRawFeaturesCard/ImageRawFeaturesCard.tsx";
import ImageMetadataCard, { getMetadataEntriesCount } from "./components/ImageMetadataCard/ImageMetadataCard.tsx";

import style from "./ImageData.module.scss";


type ImageDataType =
  {
    readonly image: Image;
    readonly viewMode: ViewMode;
  };

export default function ImageData({ image, viewMode }: ImageDataType): ReactElement
{
  const [ t ] = useTranslation();
  const openBrowser = useOpenBrowser();
  const { sections, hideSection } = useImageDataSectionsContext();
  const [ accordionValue, setAccordionValue ] = useState<string[]>(StorageService.getImageDetailTraits(Object.values(defaultOrderSectionIds)));

  useEffect(() =>
  {
    StorageService.setImageDetailTraits(accordionValue);
  }, [ accordionValue ]);

  function toggleSection(sectionId: string): void
  {
    setAccordionValue(
      (previous) =>
        previous.includes(sectionId)
          ? previous.filter((id) => id !== sectionId)
          : [ ...previous, sectionId ]
    );
  }

  const recipeFeatures = useMemo<ExtensionImageFeature[]>(
    () => image.features.filter((imageFeature) => imageFeature.type === ImageFeatureType.Recipe),
    [ image.features ]
  );

  const recipeFeatureContainers = useMemo(
    () => computeRecipeFeatureContainers(recipeFeatures, t),
    [ recipeFeatures, t ]
  );

  const rawFeatures = useMemo<ExtensionImageFeature[]>(
    () => image.features.filter(
      (imageFeature) => !isDisplayedInRecipeCard(imageFeature) && !isDisplayedInFeatureTypeCards(imageFeature)
    ),
    [ image.features ]
  );

  const availableFeatureTypes = useMemo<ImageFeatureType[]>(
    () => getAvailableFeatureTypes(image.features),
    [ image.features ]
  );

  const metadataEntriesCount = useMemo<number>(
    () => getMetadataEntriesCount(image.metadata),
    [ image.metadata ]
  );

  const sectionNodeMap = useMemo<Record<string, ReactElement>>(() =>
    {
      const map: Record<string, ReactElement> = {
        [builtInSectionIds.information]: (
          <ImageInformationCard
            image={image}
            viewMode={viewMode}
            isOpened={accordionValue.includes(builtInSectionIds.information)}
            onToggle={() =>
            {
              toggleSection(builtInSectionIds.information);
            }}
            onHide={() =>
            {
              hideSection(builtInSectionIds.information);
            }}
          />
        )
      };

      if (image.tags && image.tags.length > 0)
      {
        map[builtInSectionIds.tags] = (
          <ImageTagsCard
            tags={image.tags}
            isOpened={accordionValue.includes(builtInSectionIds.tags)}
            onToggle={() =>
            {
              toggleSection(builtInSectionIds.tags);
            }}
            onHide={() =>
            {
              hideSection(builtInSectionIds.tags);
            }}
          />
        );
      }

      if (recipeFeatureContainers.length > 0)
      {
        map[builtInSectionIds.recipe] = (
          <ImageRecipeCard
            recipeFeatures={recipeFeatures}
            isOpened={accordionValue.includes(builtInSectionIds.recipe)}
            onToggle={() =>
            {
              toggleSection(builtInSectionIds.recipe);
            }}
            onHide={() =>
            {
              hideSection(builtInSectionIds.recipe);
            }}
          />
        );
      }

      for (const featureType of availableFeatureTypes)
      {
        const sectionId = `feature:${featureType}`;
        map[sectionId] = (
          <ImageFeatureTypeCard
            key={`feature-type-${featureType}`}
            type={featureType}
            features={image.features}
            isOpened={accordionValue.includes(sectionId)}
            onToggle={() =>
            {
              toggleSection(sectionId);
            }}
            onHide={() =>
            {
              hideSection(sectionId);
            }}
          />
        );
      }

      if (rawFeatures.length > 0)
      {
        map[builtInSectionIds.rawFeatures] = (
          <ImageRawFeaturesCard
            rawFeatures={rawFeatures}
            isOpened={accordionValue.includes(builtInSectionIds.rawFeatures)}
            onToggle={() =>
            {
              toggleSection(builtInSectionIds.rawFeatures);
            }}
            onHide={() =>
            {
              hideSection(builtInSectionIds.rawFeatures);
            }}
          />
        );
      }

      if (metadataEntriesCount > 0)
      {
        map[builtInSectionIds.metadata] = (
          <ImageMetadataCard
            metadata={image.metadata}
            isOpened={accordionValue.includes(builtInSectionIds.metadata)}
            onToggle={() =>
            {
              toggleSection(builtInSectionIds.metadata);
            }}
            onHide={() =>
            {
              hideSection(builtInSectionIds.metadata);
            }}
          />
        );
      }

      return map;
    },
    [
      image,
      viewMode,
      accordionValue,
      recipeFeatureContainers.length,
      recipeFeatures,
      availableFeatureTypes,
      rawFeatures,
      metadataEntriesCount,
      hideSection
    ]
  );

  function wrapWithCopy(node: ReactNode, value: string, enabled?: boolean): ReactNode
  {
    return enabled === true ? <CopyText value={value}>{node}</CopyText> : node;
  }

  return useMemo<ReactElement>(() => (
    <UiElementViewProvider onAnchorClick={(event: React.MouseEvent<HTMLAnchorElement>, url: string) =>
    {
      event.preventDefault();
      void openBrowser(url);
    }} renderers={{
      markdown: (element, _context) => (
        wrapWithCopy(<Markdown size="sm" content={element.content}/>, element.content, element.modifiers?.copyable)
      ),
      xml: (element, _context) => (
        wrapWithCopy(<CodeViewer code={element.value} size="sm"
                                 language="xml"/>, element.value, element.modifiers?.copyable)
      ),
      json: (element, _context) => (
        wrapWithCopy(<CodeViewer code={element.value} size="sm"
                                 language="json"/>, element.value, element.modifiers?.copyable)
      )
    }}>
      <div className={style.container}>
        <div className={style.cardsContainer}>
          <Accordion
            multiple
            value={accordionValue}
            onChange={setAccordionValue}
          >
            <Stack gap="md" ml="sm" mr="sm" my="sm">
              {sections.filter((section) => section.isVisible && sectionNodeMap[section.id] !== undefined).map((section) => (
                <Box key={section.id}>{sectionNodeMap[section.id]}</Box>))}
            </Stack>
          </Accordion>
        </div>
      </div>
    </UiElementViewProvider>
  ), [ sections, sectionNodeMap, accordionValue, openBrowser ]);
}
