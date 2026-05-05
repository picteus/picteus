import React, { useState } from "react";
import { Box, Button, Group, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslation } from "react-i18next";

import { Collection as PicteusCollection, SearchFilter } from "@picteus/ws-client";

import { notifyError, notifySuccess } from "utils";
import { CollectionService, FiltersService } from "app/services";


type AddOrUpdateCollectionType = {
    collection?: PicteusCollection;
    searchFilter?: SearchFilter;
    onSuccess: (collection: PicteusCollection) => void;
    onClose?: () => void;
};

export default function AddOrUpdateCollection({
                                                  collection,
                                                  searchFilter = FiltersService.defaultFilter,
                                                  onSuccess,
                                                  onClose
                                              }: AddOrUpdateCollectionType) {
    const [t] = useTranslation();
    const [loading, setLoading] = useState<boolean>(false);

    const form = useForm({
        initialValues: {
            name: collection?.name || "",
            comment: collection?.comment || "",
        },
        validate: {
            name: (value) => (value.trim().length === 0 ? t("fieldError.empty") : null),
        },
    });

    async function handleOnSubmit(values: typeof form.values) {
        setLoading(true);
        try {
            let newCollection: PicteusCollection;
            if (collection) {
                newCollection = await CollectionService.update(
                  collection.id,
                  values.name,
                  searchFilter,
                  values.comment
                );
                notifySuccess(t("addOrUpdateCollectionModal.successUpdate"));
            } else {
                newCollection = await CollectionService.create(
                  values.name,
                  searchFilter,
                  values.comment
                );
                notifySuccess(t("addOrUpdateCollectionModal.successAdd"));
            }
            onSuccess(newCollection);
            onClose?.();
        } catch (error) {
            notifyError((error as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
      <Box p="sm">
          <form onSubmit={form.onSubmit(handleOnSubmit)}>
              <TextInput
                label={t("field.name")}
                required
                placeholder={t("addOrUpdateCollectionModal.namePlaceholder")}
                {...form.getInputProps("name")}
                mb="sm"
              />
              <Textarea
                label={t("field.comment")}
                placeholder={t("addOrUpdateCollectionModal.commentPlaceholder")}
                {...form.getInputProps("comment")}
                mb="sm"
              />
              <Group justify="flex-end" mt="md">
                  <Button variant="subtle" onClick={onClose} disabled={loading}>
                      {t("button.cancel")}
                  </Button>
                  <Button type="submit" loading={loading}>
                      {t("button.save")}
                  </Button>
              </Group>
          </form>
      </Box>
    );
}
