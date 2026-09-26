import React, { useMemo } from "react";
import { Button, CloseButton, Group, Menu, Stack, Text, Tooltip } from "@mantine/core";
import { IconChevronDown, IconPlayerPlayFilled, IconSquare, IconSquareCheck, IconWand } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Image, ImageFeatureType } from "@picteus/ws-client";

import { ViewMode } from "types";
import { capitalizeText } from "utils";
import { useExtensions } from "app/hooks";
import { useImagesSelectedContext } from "app/context";
import { Common, CopyText, ExtensionBadge, ExternalLink, ImageItemMenu, TopPanel } from "app/components";
import { ImageDimensions, ImageRatio, ImageWeight } from "../index.ts";

import style from "./ImageTop.module.scss";


type ImageTopType = {
  image: Image;
  viewMode: ViewMode;
  onClose: () => void;
};

type RecipeExtensionType = {
  id: string;
  name: string;
};

export default function ImageTop({ image, viewMode, onClose }: ImageTopType)
{
  const [ t ] = useTranslation();
  const { toggleSelectedImage, isSelectedImage } = useImagesSelectedContext();
  const isSelected = isSelectedImage(image);
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
          <Stack className={style.title} gap={3}>
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
        <CloseButton size="lg" variant="subtle" onClick={onClose}/>
      </>}
      actions={<Group>
        <Menu
          withinPortal={false}
          position="bottom-end"
          trigger="hover"
          trapFocus={false}
          openDelay={80}
          closeDelay={400}
          shadow="md"
          width={200}
        >
          <Menu.Target>
            <Button
              variant="default"
              leftSection={<IconPlayerPlayFilled stroke={Common.IconStrokeSize}/>}
              rightSection={<IconChevronDown stroke={1.2} size={16}/>}
            >
              {t("menu.imageCommands")}
            </Button>
          </Menu.Target>
          <ImageItemMenu image={image} viewMode={viewMode}/>
        </Menu>
        <ExternalLink url={image.url} type="button"/>
        <Tooltip
          label={t(`button.${isSelected ? "removeFromSelection" : "addToSelection"}`)}
          position="bottom"
        >
          <Button
            variant="default"
            leftSection={isSelected ? <IconSquareCheck size={16}/> : <IconSquare size={16}/>}
            onClick={() => toggleSelectedImage(image)}
          >
            {t(`button.${isSelected ? "remove" : "add"}`)}
          </Button>
        </Tooltip>
      </Group>}
    />
  );
}
