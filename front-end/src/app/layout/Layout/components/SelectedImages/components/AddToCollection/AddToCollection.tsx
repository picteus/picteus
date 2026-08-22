import React, { useEffect, useState } from "react";
import { Button, Flex, Select } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Collection, SearchOriginNature, SearchSortingProperty } from "@picteus/ws-client";
import { ToastService } from "utils";
import { CollectionService } from "app/services";


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

  const data = collections.map((collection) => ({ value: collection.id.toString(), label: collection.name }));

  return (
    <Flex align="flex-end" gap={5}>
      <Select
        allowDeselect={false}
        style={{ flex: 1 }}
        label={t("filters.collection")}
        placeholder={t("widgets.collectionPlaceHolder")}
        data={data}
        value={selectedId}
        onChange={value => setSelectedId(value)}
        searchable
        required
        comboboxProps={{ withinPortal: false, position: "top" }}
      />
      <Button variant="default" onClick={onClose} disabled={loading}>
        {t("button.cancel")}
      </Button>
      <Button onClick={handleOnSubmit} loading={loading} disabled={!selectedId}>
        {t("button.apply")}
      </Button>
    </Flex>
  );
}
