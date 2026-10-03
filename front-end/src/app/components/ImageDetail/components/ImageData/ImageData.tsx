import React, { ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import { Accordion, ActionIcon, Box, Button, Flex, Group, Stack, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAdjustmentsHorizontal, IconEyeOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ExtensionImageFeature, Image, ImageFeatureType } from "@picteus/ws-client";

import { ViewMode } from "types";
import { useOpenBrowser } from "app/hooks";
import { StorageService } from "app/services";
import { CodeViewer, Common, CopyText, Markdown, UiElementViewProvider } from "app/components";

import {
  computeRecipeFeatureContainers,
  getAvailableFeatureTypes,
  isDisplayedInFeatureTypeCards,
  isDisplayedInRecipeCard,
  SORTED_FEATURE_TYPES
} from "./ImageDataComputer.ts";
import ImageFeatureSettings, {
  ImageDataDrawerSectionItemType
} from "./components/ImageFeatureSettings/ImageFeatureSettings.tsx";
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

type SectionDefinitionType =
  {
    readonly id: string;
    readonly label: string;
    readonly node: ReactElement;
    readonly badge?: string | number;
  };

export default function ImageData({ image, viewMode }: ImageDataType): ReactElement
{
  const [ t ] = useTranslation();
  const openBrowser = useOpenBrowser();

  const builtInSectionIds =
    {
      information: "information",
      tags: "tags",
      recipe: "recipe",
      rawFeatures: "rawFeatures",
      metadata: "metadata"
    } as const;

  const [ accordionValue, setAccordionValue ] = useState<string[]>(
    StorageService.getImageDetailTraits([
      builtInSectionIds.information,
      builtInSectionIds.tags,
      builtInSectionIds.recipe
    ])
  );

  const defaultOrder = useMemo<string[]>(() =>
      [
        builtInSectionIds.information,
        builtInSectionIds.tags,
        builtInSectionIds.recipe,
        ...SORTED_FEATURE_TYPES.map((type) => `feature:${type}`),
        builtInSectionIds.rawFeatures,
        builtInSectionIds.metadata
      ],
    [ SORTED_FEATURE_TYPES ]
  );

  const [ hiddenSectionIds, setHiddenSectionIds ] = useState<string[]>(
    () => StorageService.getImageDetailHiddenSections([])
  );
  const [ sectionsOrder, setSectionsOrder ] = useState<string[]>(
    () => StorageService.getImageDetailSectionsOrder(defaultOrder)
  );
  const [ isDrawerOpened, { open: openDrawer, close: closeDrawer } ] = useDisclosure(false);

  useEffect(() =>
  {
    StorageService.setImageDetailTraits(accordionValue);
  }, [ accordionValue ]);

  useEffect(() =>
  {
    StorageService.setImageDetailHiddenSections(hiddenSectionIds);
  }, [ hiddenSectionIds ]);

  useEffect(() =>
  {
    StorageService.setImageDetailSectionsOrder(sectionsOrder);
  }, [ sectionsOrder ]);

  function toggleSection(sectionId: string): void
  {
    setAccordionValue(
      (previous) =>
        previous.includes(sectionId)
          ? previous.filter((id) => id !== sectionId)
          : [ ...previous, sectionId ]
    );
  }

  function hideSection(sectionId: string): void
  {
    setHiddenSectionIds((previous) =>
      previous.includes(sectionId) ? previous : [ ...previous, sectionId ]
    );
  }

  function toggleSectionVisibility(sectionId: string): void
  {
    setHiddenSectionIds((previous) =>
      previous.includes(sectionId)
        ? previous.filter((id) => id !== sectionId)
        : [ ...previous, sectionId ]
    );
  }

  function restoreAllSections(): void
  {
    setHiddenSectionIds([]);
  }

  function resetDefaults(): void
  {
    setHiddenSectionIds([]);
    setSectionsOrder(defaultOrder);
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

  const allAvailableSections = useMemo((): SectionDefinitionType[] =>
    {
      const sections: SectionDefinitionType[] = [
        {
          id: builtInSectionIds.information,
          label: t("imageDetail.information"),
          node: (
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
        }
      ];

      if (image.tags && image.tags.length > 0)
      {
        sections.push({
          id: builtInSectionIds.tags,
          label: t("imageDetail.tags"),
          node: (
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
          ),
          badge: image.tags.length
        });
      }

      if (recipeFeatureContainers.length > 0)
      {
        sections.push({
          id: builtInSectionIds.recipe,
          label: t("imageDetail.recipe"),
          node: (
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
          )
        });
      }

      for (const featureType of availableFeatureTypes)
      {
        const sectionId = `feature:${featureType}`;
        const featuresForTypeCount = image.features.filter(
          (feature) => feature.type === featureType && isDisplayedInFeatureTypeCards(feature)
        ).length;

        sections.push({
          id: sectionId,
          label: t(`imageDetail.type.${featureType}`),
          node: (
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
          ),
          badge: featuresForTypeCount
        });
      }

      if (rawFeatures.length > 0)
      {
        sections.push({
          id: builtInSectionIds.rawFeatures,
          label: t("imageDetail.rawFeatures"),
          node: (
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
          )
        });
      }

      if (metadataEntriesCount > 0)
      {
        sections.push({
          id: builtInSectionIds.metadata,
          label: t("imageDetail.metadata"),
          node: (
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
          ),
          badge: metadataEntriesCount > 1 ? metadataEntriesCount : undefined
        });
      }

      return sections;
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
      t
    ]
  );

  const effectiveSectionsOrder = useMemo<string[]>(() =>
    {
      const missingIds = allAvailableSections.map((section) => section.id).filter((id) => !sectionsOrder.includes(id));
      if (missingIds.length === 0)
      {
        return sectionsOrder;
      }
      return [ ...sectionsOrder, ...missingIds ];
    },
    [ allAvailableSections, sectionsOrder ]
  );

  const sortedAvailableSections = useMemo((): SectionDefinitionType[] =>
    {
      const orderMap = new Map<string, number>();
      effectiveSectionsOrder.forEach((id, index) => orderMap.set(id, index));
      return [ ...allAvailableSections ].sort((firstSection, secondSection) =>
      {
        const firstIndex = orderMap.get(firstSection.id) ?? Number.MAX_SAFE_INTEGER;
        const secondIndex = orderMap.get(secondSection.id) ?? Number.MAX_SAFE_INTEGER;
        return firstIndex - secondIndex;
      });
    },
    [ allAvailableSections, effectiveSectionsOrder ]
  );

  const visibleSections = useMemo((): SectionDefinitionType[] => sortedAvailableSections.filter((section) => !hiddenSectionIds.includes(section.id)),
    [ sortedAvailableSections, hiddenSectionIds ]
  );

  const drawerSections = useMemo((): ImageDataDrawerSectionItemType[] =>
    {
      return sortedAvailableSections.map((section) => ({
        id: section.id,
        label: section.label,
        isVisible: !hiddenSectionIds.includes(section.id),
        badge: section.badge
      }));
    },
    [ sortedAvailableSections, hiddenSectionIds ]
  );

  function handleReorder(reorderedSections: ImageDataDrawerSectionItemType[]): void
  {
    const reorderedIds = reorderedSections.map((section) => section.id);
    const remainingIds = effectiveSectionsOrder.filter((id) => !reorderedIds.includes(id));
    const newOrder = [ ...reorderedIds, ...remainingIds ];
    setSectionsOrder(newOrder);
  }

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
        <Flex align="center" justify="flex-end" ml="sm" mr="sm" mb="xs" className={style.selectorContainer}>
          <Group gap="xs" mt="xs">
            {hiddenSectionIds.length > 0 && (<Button
              variant="light"
              color="orange"
              size="compact-xs"
              leftSection={<IconEyeOff size={Common.IconSmallSize}/>}
              onClick={openDrawer}
            >
              {t("imageDetail.settings.reset", { count: hiddenSectionIds.length })}
            </Button>)}
            <Tooltip
              label={t("imageDetail.settings.title")}
              position="left"
              withArrow
            >
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={openDrawer}
              >
                <IconAdjustmentsHorizontal size={18}/>
              </ActionIcon>
            </Tooltip>
          </Group>
        </Flex>
        <div className={style.cardsContainer}>
          <Accordion
            multiple
            value={accordionValue}
            onChange={setAccordionValue}
          >
            <Stack gap="md" ml="sm" mr="sm" mb="sm">
              {visibleSections.map((section) => (<Box key={section.id}>{section.node}</Box>))}
            </Stack>
          </Accordion>
        </div>
      </div>
      <ImageFeatureSettings
        opened={isDrawerOpened}
        onClose={closeDrawer}
        sections={drawerSections}
        onToggleVisibility={toggleSectionVisibility}
        onReorder={handleReorder}
        onRestoreAll={restoreAllSections}
        onResetDefaults={resetDefaults}
      />
    </UiElementViewProvider>
  ), [ visibleSections, accordionValue, isDrawerOpened, drawerSections, hiddenSectionIds, openDrawer, closeDrawer, t, openBrowser ]);
}
