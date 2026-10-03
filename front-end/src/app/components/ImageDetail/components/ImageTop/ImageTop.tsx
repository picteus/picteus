import React, { ReactElement, useMemo } from "react";
import { CloseButton, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconWand } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Image, ImageFeatureType } from "@picteus/ws-client";

import { ViewMode } from "types";
import { capitalizeText } from "utils";
import { useExtensions } from "app/hooks";
import { Common, CopyText, ExtensionBadge, TopPanel } from "app/components";
import { ImageCardsSettings, ImageCommandsBar, ImageDimensions, ImageRatio, ImageWeight } from "../index.ts";

import style from "./ImageTop.module.scss";


type ImageTopType =
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

export default function ImageTop({ image, viewMode, onClose }: ImageTopType): ReactElement
{
  const [ t ] = useTranslation();
  const { data: extensions = [] } = useExtensions();

  const recipeExtensions = useMemo<RecipeExtensionType[]>(() =>
  {
    if (!image.features || image.features.length === 0)
    {
      return [];
    }

    const recipeFeatures = image.features.filter((feature) => feature.type === ImageFeatureType.Recipe);
    const seenExtensionIds = new Set<string>();
    const result: RecipeExtensionType[] = [];

    for (const feature of recipeFeatures)
    {
      if (!seenExtensionIds.has(feature.id))
      {
        seenExtensionIds.add(feature.id);
        const extension = extensions.find((candidate) => candidate.manifest.id === feature.id);
        const name = extension?.manifest.name ?? (feature.id ? capitalizeText(feature.id) : t("imageDetail.recipe"));
        result.push(
          {
            id: feature.id,
            name
          }
        );
      }
    }

    return result;
  }, [ image.features, extensions, t ]);

  return (<TopPanel
      info={<>
        <div className={style.titleBox}>
          <Stack className={style.title} gap="xs">
            <CopyText value={image.name} inline={true}>
              <Text size="md" truncate="end">{image.name}</Text>
            </CopyText>
            <Group gap="xs" align="center" wrap="nowrap">
              <Text c="dimmed" size="sm" truncate="end">
                {image.format} — {<ImageWeight image={image}/>} — {<ImageDimensions
                dimensions={image.dimensions}/>} ({<ImageRatio
                dimensions={image.dimensions}/>})
              </Text>
              {recipeExtensions.length > 0 && (
                <Tooltip
                  label={t("imageDetail.aiGenerated")}
                  position="bottom"
                >
                  <Text c="violet">
                    <IconWand size={Common.IconSmallSize} stroke={Common.IconStrokeSize}/>
                  </Text>
                </Tooltip>
              )}
              {recipeExtensions.map((recipeExtension) => (
                <ExtensionBadge
                  key={recipeExtension.id}
                  idOrExtension={recipeExtension.id}
                  color="violet"
                  tooltip={t("imageDetail.recipeAvailable", { extension: recipeExtension.name })}
                />
              ))}
            </Group>
            <CopyText value={image.id} inline={true}>
              <Text c="dimmed" size="sm">{image.id}</Text>
            </CopyText>
          </Stack>
        </div>
        <Group gap="xs" align="center" wrap="nowrap">
          <ImageCardsSettings/>
          <CloseButton size="lg" variant="subtle" onClick={onClose}/>
        </Group>
      </>}
      actions={<ImageCommandsBar image={image} viewMode={viewMode}/>}
    />
  );
}
