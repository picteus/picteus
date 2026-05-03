import React from "react";
import { Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { GenerationRecipe, GenerationRecipePrompt } from "@picteus/ws-client";

import { ViewMode } from "types";
import { CodeViewer, ExternalLink } from "app/components";
import { AiModelTag, ImageItemWrapper, ImageRatio } from "../index.ts";


type ImageRecipeType = {
  recipe: GenerationRecipe;
  viewMode: ViewMode;
};

export default function ImageRecipe({ recipe, viewMode }: ImageRecipeType) {
  const [t] = useTranslation();
  const prompt: GenerationRecipePrompt = recipe.prompt ;

  return (
    <Stack gap="xs" mt="sm">
      {recipe.schemaVersion !== undefined && (
        <Group>
          <Text fw={700} size="sm">{t("field.schemaVersion")}:</Text>
          <Text size="sm">{recipe.schemaVersion}</Text>
        </Group>
      )}
      {recipe.id && (
        <Group>
          <Text fw={700} size="sm">{t("field.id")}:</Text>
          <Text size="sm">{recipe.id}</Text>
        </Group>
      )}
      {recipe.url && (
        <Group>
          <Text fw={700} size="sm">{t("field.url")}:</Text>
          <ExternalLink url={recipe.url} type="link"/>
        </Group>
      )}
      {recipe.software && (
        <Group>
          <Text fw={700} size="sm">{t("field.software")}:</Text>
          <Text size="sm">{recipe.software}</Text>
        </Group>
      )}
      {recipe.aspectRatio !== undefined && (
        <Group>
          <Text fw={700} size="sm">{t("field.aspectRatio")}:</Text>
          <Text size="sm"><ImageRatio aspectRatio={recipe.aspectRatio}/></Text>
        </Group>
      )}
      {recipe.modelTags && recipe.modelTags.length > 0 && (
        <Group>
          <Text fw={700} size="sm">{t("field.modelTags")}:</Text>
          <Group gap={4}>
            {recipe.modelTags.map((tag) => (<AiModelTag key={tag} tag={tag} />))}
          </Group>
        </Group>
      )}
      {recipe.inputAssets && recipe.inputAssets.length > 0 && (
        <Group gap={4}>
          <Text fw={700} size="sm">{t("field.assetIds")}:</Text>
          {recipe.inputAssets.map((asset) => (
            <ImageItemWrapper key={asset} imageId={asset} edge={75} viewMode={viewMode} />
          ))}
        </Group>
      )}
      <Stack gap={4}>
        <Text fw={700} size="sm">{t(`field.${"text" in prompt ? "prompt" : "instructions"}`)}:</Text>
        {"text" in prompt ? <Text size="sm">{prompt.text}</Text> : <CodeViewer code={JSON.stringify(prompt.value, undefined, 2)} />}
      </Stack>
    </Stack>
  );
}
