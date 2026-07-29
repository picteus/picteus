import React, { useEffect, useState } from "react";
import { Text } from "@mantine/core";

import { ExtensionIdImageEmbeddingName } from "@picteus/ws-client";

import { NotificationsService } from "utils";
import { ExtensionsService, RepositoriesService, StorageService } from "app/services";
import { ExtensionIcon, MenuItemEntry, StandardMenu } from "app/components";


type EmbeddingSelectType = {
  onSelected: ({ extensionId, name }: ExtensionIdImageEmbeddingName) => void;
};

export default function EmbeddingSelect({ onSelected }: EmbeddingSelectType)
{
  const [ embeddingsNames, setEmbeddingsNames ] = useState<ExtensionIdImageEmbeddingName[]>([]);
  const [ selectedEmbedding, setSelectedEmbedding ] = useState<string | undefined>();

  const extensionIdAndEmbeddingNameSeparator = "|";

  function splitExtensionIdAndEmbeddingName(string: string): { extensionId: string; name: string }
  {
    const [ extensionId, name ] = string.split(extensionIdAndEmbeddingNameSeparator);
    return { extensionId, name };
  }

  function mergeExtensionIdEmbeddingName(embeddingName: ExtensionIdImageEmbeddingName): string
  {
    return `${embeddingName.extensionId}${extensionIdAndEmbeddingNameSeparator}${embeddingName.name}`;
  }

  useEffect(() =>
  {
    async function initialize()
    {
      let theEmbeddingNames: ExtensionIdImageEmbeddingName [];
      try
      {
        theEmbeddingNames = await RepositoriesService.getEmbeddingsNames();
      }
      catch (error)
      {
        return NotificationsService.apiCallError(error, "An error occurred while fetching embeddings names");
      }
      setEmbeddingsNames(theEmbeddingNames);
      let selected = StorageService.getClosestImagesEmbeddingName();
      if (!selected || !theEmbeddingNames.find(embeddingName => mergeExtensionIdEmbeddingName(embeddingName) === selected))
      {
        if (theEmbeddingNames.length > 0)
        {
          const firstEmbeddingName = theEmbeddingNames[0];
          selected = mergeExtensionIdEmbeddingName(firstEmbeddingName);
        }
        else
        {
          selected = undefined;
        }
      }
      setSelectedEmbedding(selected);
      onSelected(splitExtensionIdAndEmbeddingName(selected));
    }

    void initialize();
  }, []);

  if (!selectedEmbedding || embeddingsNames.length === 0)
  {
    return null;
  }
  const { extensionId, name } = splitExtensionIdAndEmbeddingName(selectedEmbedding);
  const selectedItem = embeddingsNames.find(embeddingName => embeddingName.extensionId === extensionId && embeddingName.name === name);

  function handleSelectEmbedding(extensionId: string, name: string)
  {
    const selected = mergeExtensionIdEmbeddingName({ extensionId, name });
    setSelectedEmbedding(selected);
    onSelected(splitExtensionIdAndEmbeddingName(selected));
    StorageService.setClosestImagesEmbeddingName(selected);
  }

  return (
    <StandardMenu
      targetChildren={<>{selectedItem && <ExtensionIcon idOrExtension={selectedItem.extensionId} size="sm"/>}
        <Text size="sm">{name}</Text></>}
      dropdownChildren={
        embeddingsNames.map((embeddingName) =>
        {
          const extension = ExtensionsService.list().find(extension => extension.manifest.id === embeddingName.extensionId);
          return (
            <MenuItemEntry
              key={mergeExtensionIdEmbeddingName(embeddingName)}
              extensionId={embeddingName.extensionId}
              label={embeddingName.name}
              subLabel={extension?.manifest.name || embeddingName.extensionId}
              onClick={() => handleSelectEmbedding(embeddingName.extensionId, embeddingName.name)}
            />
          );
        })
      }
      width={200}
    />
  );
}
