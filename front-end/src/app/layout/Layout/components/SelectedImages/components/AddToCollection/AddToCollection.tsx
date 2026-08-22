import React, { useEffect, useState } from "react";
import { Box, Button, Flex } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Collection, SearchOriginNature, SearchSortingProperty } from "@picteus/ws-client";

import { ToastService } from "utils";
import { CollectionService } from "app/services";
import { CollectionSelect } from "app/components";


type AddToCollectionType = {
  imageIds: string[];
  onSuccess: () => void;
  onClose: () => void;
};

export default function AddToCollection({ imageIds, onSuccess, onClose }: AddToCollectionType)
{
  const [ t ] = useTranslation();
  const [ collections, setCollections ] = useState<Collection[]>([]);
  const [ selectedId, setSelectedId ] = useState<string | null>(null);
  const [ loading, setLoading ] = useState(false);

  useEffect(() =>
  {
    void CollectionService.fetchAll().then(allCollections => setCollections(allCollections.filter((collection) => collection.filter?.origin?.kind === SearchOriginNature.Images)));
  }, []);

  async function handleOnSubmit(event: React.FormEvent)
  {
    event.preventDefault();
    if (!selectedId)
    {
      return;
    }
    setLoading(true);
    try
    {
      const collection = collections.find((collection) => collection.id === parseInt(selectedId));
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
        await CollectionService.update(collection.id, collection.name, newSearchFilter, collection.comment);
      }
      catch (error)
      {
        return ToastService.failureAndMessage(error);
      }
      ToastService.success();
      onSuccess();
      onClose();
    }
    finally
    {
      setLoading(false);
    }
  }

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
      <Button variant="default" onClick={onClose} disabled={loading}>
        {t("button.cancel")}
      </Button>
      <Button onClick={handleOnSubmit} loading={loading} disabled={!selectedId}>
        {t("button.apply")}
      </Button>
    </Flex>
  );
}
