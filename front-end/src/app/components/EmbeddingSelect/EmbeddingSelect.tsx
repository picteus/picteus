import React, { ReactElement, useEffect, useMemo, useState } from "react";
import { Text } from "@mantine/core";

import { AiModelModality, ExtensionIdImageEmbeddingName } from "@picteus/ws-client";

import { useAiModels, useEmbeddingsNames, useExtensions } from "app/hooks";
import { StorageService } from "app/services";
import { ExtensionIcon, MenuItemEntry, StandardMenu } from "app/components";


type EmbeddingSelectPropsType =
  {
    readonly initialEmbeddingName?: ExtensionIdImageEmbeddingName;
    readonly extensionId?: string;
    readonly requireTextModality?: boolean;
    readonly onSelected: (selected?: ExtensionIdImageEmbeddingName) => void;
  };

export default function EmbeddingSelect(
  {
    initialEmbeddingName,
    extensionId,
    requireTextModality,
    onSelected
  }: EmbeddingSelectPropsType
): ReactElement
{
  const { data: embeddingsNames = [] } = useEmbeddingsNames();
  const { data: extensions = [] } = useExtensions();
  const { data: aiModels = [] } = useAiModels();
  const [ selectedEmbeddingKey, setSelectedEmbeddingKey ] = useState<string | undefined>();

  const separator = "/";

  function computeEmbeddingKey(item: ExtensionIdImageEmbeddingName): string
  {
    return `${item.extensionId}${separator}${item.name}`;
  }

  function getModelDisplayName(item: ExtensionIdImageEmbeddingName): string
  {
    const model = aiModels.find(
      (entry) => entry.extensionId === item.extensionId && entry.technicalId === item.name
    );
    return model?.name ?? item.name;
  }

  const filteredEmbeddingsNames = useMemo((): ExtensionIdImageEmbeddingName[] =>
  {
    return embeddingsNames.filter((item) =>
    {
      if (extensionId && item.extensionId !== extensionId)
      {
        return false;
      }
      if (requireTextModality)
      {
        const model = aiModels.find(
          (entry) => entry.extensionId === item.extensionId && entry.technicalId === item.name
        );
        if (!model?.modalities || model.modalities.includes(AiModelModality.TextEmbeddings) === false)
        {
          return false;
        }
      }
      return true;
    });
  }, [ embeddingsNames, extensionId, requireTextModality, aiModels ]);

  useEffect(() =>
  {
    let selected: string | undefined = initialEmbeddingName
      ? computeEmbeddingKey(initialEmbeddingName)
      : StorageService.getClosestImagesEmbeddingName();

    if (!selected || !filteredEmbeddingsNames.some((item) => computeEmbeddingKey(item) === selected))
    {
      if (filteredEmbeddingsNames.length > 0)
      {
        selected = computeEmbeddingKey(filteredEmbeddingsNames[0]);
      }
      else
      {
        selected = undefined;
      }
    }

    setSelectedEmbeddingKey(selected);
    const selectedItem = filteredEmbeddingsNames.find((item) => computeEmbeddingKey(item) === selected);
    onSelected(selectedItem);
  }, [ filteredEmbeddingsNames ]);

  function handleSelectEmbedding(item: ExtensionIdImageEmbeddingName): void
  {
    const key = computeEmbeddingKey(item);
    setSelectedEmbeddingKey(key);
    onSelected(item);
    StorageService.setClosestImagesEmbeddingName(key);
  }

  const selectedItem = filteredEmbeddingsNames.find((item) => computeEmbeddingKey(item) === selectedEmbeddingKey);
  const selectedLabel = selectedItem ? getModelDisplayName(selectedItem) : undefined;

  return (
    <StandardMenu
      targetChildren={
        <>
          {selectedItem && <ExtensionIcon idOrExtension={selectedItem.extensionId} size="xs"/>}
          <Text size="sm">{selectedLabel}</Text>
        </>
      }
      dropdownChildren={
        filteredEmbeddingsNames.map((embeddingName) =>
        {
          const extension = extensions.find((anExtension) => anExtension.manifest.id === embeddingName.extensionId);
          const label = getModelDisplayName(embeddingName);
          return (
            <MenuItemEntry
              key={computeEmbeddingKey(embeddingName)}
              extensionId={embeddingName.extensionId}
              label={label}
              subLabel={extension?.manifest.name || embeddingName.extensionId}
              onClick={() => handleSelectEmbedding(embeddingName)}
            />
          );
        })
      }
      width={200}
    />
  );
}
