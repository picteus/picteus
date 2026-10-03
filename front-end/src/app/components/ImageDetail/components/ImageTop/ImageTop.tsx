import React, { ReactElement, useMemo } from "react";
import { Badge, Box, CloseButton, Divider, Group, Stack, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Image, ImageFeatureType } from "@picteus/ws-client";

import { ViewMode } from "types";
import { capitalizeText } from "utils";
import { useExtensions } from "app/hooks";
import { Common, CopyText, ExtensionBadge } from "app/components";
import { ImageCardsSettings, ImageCommandsBar, ImageDimensions, ImageRatio, ImageWeight } from "../index.ts";

import style from "./ImageTop.module.scss";


type ImageTopPropsType =
  {
    readonly image: Image;
    readonly viewMode: ViewMode;
    readonly onClose: () => void;
  };

type RecipeExtensionType =
  {
    readonly id: string;
    readonly name: string;
  };

export default function ImageTop({ image, viewMode, onClose }: ImageTopPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const { data: extensions = [] } = useExtensions();

  const recipeExtensions = useMemo<RecipeExtensionType[]>(() =>
  {
    const recipeFeatures = image.features.filter((feature) => feature.type === ImageFeatureType.Recipe);
    const seenExtensionIds = new Set<string>();
    const result: RecipeExtensionType[] = [];
    for (const feature of recipeFeatures)
    {
      if (seenExtensionIds.has(feature.id) === false)
      {
        seenExtensionIds.add(feature.id);
        const extension = extensions.find((candidate) => candidate.manifest.id === feature.id);
        const name = extension?.manifest.name ?? capitalizeText(feature.id);
        result.push({ id: feature.id, name });
      }
    }
    return result;
  }, [ image.features, extensions ]);

  return (
    <>
      <Stack gap={6} px="md" pt="md" pb="sm">
        {recipeExtensions.length > 0 && (
          <Group gap="xs" align="center" wrap="nowrap">
            <Badge
              variant="light"
              fw={400}
              color="gray"
              size="md"
              radius="sm"
              tt="none"
              leftSection={<IconSparkles size={Common.IconSmallSize}/>}
            >
              {t("imageDetail.aiGenerated")}
            </Badge>
            {recipeExtensions.map((recipeExtension) =>
            {
              return (
                <ExtensionBadge
                  key={recipeExtension.id}
                  idOrExtension={recipeExtension.id}
                  variant="light"
                  color="gray"
                  size="md"
                  tooltip={t("imageDetail.recipeAvailable", { extension: recipeExtension.name })}
                />
              );
            })}
          </Group>
        )}

        <Group justify="space-between" align="center" wrap="nowrap" w="100%">
          <Box flex={1} miw={0} className={style.titleWrapper}>
            <CopyText value={image.name} inline={true}>
              <Text size="sm" fw={500} truncate="end" flex={1} miw={0}>
                {image.name}
              </Text>
            </CopyText>
          </Box>
          <Group gap="xs" align="center" wrap="nowrap">
            <ImageCardsSettings/>
            <CloseButton size="lg" variant="subtle" onClick={onClose}/>
          </Group>
        </Group>

        <Text c="dimmed" size="xs" truncate="end">
          {image.format} · <ImageWeight image={image}/> · <ImageDimensions dimensions={image.dimensions}/> (<ImageRatio
          dimensions={image.dimensions}/>)
        </Text>

        <Box pt={4}>
          <ImageCommandsBar image={image} viewMode={viewMode}/>
        </Box>
      </Stack>
      <Divider/>
    </>
  );
}
