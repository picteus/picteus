import React, { useMemo, useState } from "react";
import { Box, Button, Flex } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Collection, SearchOriginNature, SearchSortingProperty } from "@picteus/ws-client";

import { ToastService } from "utils";
import { useCollections, useUpdateCollectionMutation } from "app/hooks";
import { CollectionSelect } from "app/components";


type AddToCollectionType = {
  imageIds: string[];
  onSuccess: () => void;
  onClose: () => void;
};

export default function AddToCollection({ imageIds, onSuccess, onClose }: AddToCollectionType)
{
  const [ t ] = useTranslation();
  const { data: allCollections = [] } = useCollections();
  const updateCollectionMutation = useUpdateCollectionMutation();
  const [ selectedId, setSelectedId ] = useState<string | null>(null);

  const collections = useMemo<Collection[]>(() =>
  {
    return allCollections.filter((collection) => collection.filter?.origin?.kind === SearchOriginNature.Images);
  }, [ allCollections ]);

  async function handleOnSubmit(event: React.FormEvent): Promise<void>
  {
    event.preventDefault();
    if (!selectedId)
    {
      return;
    }

    const collection = collections.find((collectionItem) => collectionItem.id === parseInt(selectedId));
    if (!collection)
    {
      return;
    }

    const existingIds = collection.filter?.origin?.kind === SearchOriginNature.Images && collection.filter.origin.ids
      ? collection.filter.origin.ids
      : [];
    const newIds = Array.from(new Set([ ...existingIds, ...imageIds ]));
    const newSearchFilter = {
      ...(collection.filter || { sorting: { property: SearchSortingProperty.ModificationDate, isAscending: false } }),
      origin: {
        kind: SearchOriginNature.Images,
        ids: newIds
      }
    };

    try
    {
      await updateCollectionMutation.mutateAsync({
        id: collection.id,
        name: collection.name,
        searchFilter: newSearchFilter,
        comment: collection.comment
      });
      ToastService.success();
      onSuccess();
      onClose();
    }
    catch (error)
    {
      ToastService.failureAndMessage(error);
    }
  }

  const isPending = updateCollectionMutation.isPending;

  return (
    <Flex align="flex-end" gap={5}>
      <Box flex={1}>
        <CollectionSelect
          collections={collections}
          label={t("filters.collection")}
          disabled={false}
          comboboxProps={{ withinPortal: false, position: "top" }}
          onChange={value => setSelectedId(value)}
        />
      </Box>
      <Button variant="default" onClick={onClose} disabled={isPending}>
        {t("button.cancel")}
      </Button>
      <Button onClick={handleOnSubmit} loading={isPending} disabled={!selectedId}>
        {t("button.apply")}
      </Button>
    </Flex>
  );
}
