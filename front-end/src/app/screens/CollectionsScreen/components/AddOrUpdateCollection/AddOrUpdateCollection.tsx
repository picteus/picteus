import React, { useState } from "react";
import { Box, Button, Group, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslation } from "react-i18next";

import { Collection as PicteusCollection, SearchFilter } from "@picteus/ws-client";

import { ToastService } from "utils";
import { useCreateCollectionMutation, useUpdateCollectionMutation } from "app/hooks";
import { FiltersService } from "app/services";


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
}: AddOrUpdateCollectionType)
{
  const [ t ] = useTranslation();
  const [ loading, setLoading ] = useState<boolean>(false);
  const createCollectionMutation = useCreateCollectionMutation();
  const updateCollectionMutation = useUpdateCollectionMutation();

  const form = useForm({
    initialValues: {
      name: collection?.name || "",
      comment: collection?.comment || ""
    },
    validate: {
      name: (value) => (value.trim().length === 0 ? t("fieldError.empty") : null)
    }
  });

  async function handleOnSubmit(values: typeof form.values): Promise<void>
  {
    setLoading(true);
    try
    {
      let newCollection: PicteusCollection;
      if (collection)
      {
        newCollection = await updateCollectionMutation.mutateAsync({
          id: collection.id,
          name: values.name,
          searchFilter,
          comment: values.comment
        });
        ToastService.success(t("addOrUpdateCollectionModal.successUpdate"));
      }
      else
      {
        newCollection = await createCollectionMutation.mutateAsync({
          name: values.name,
          searchFilter,
          comment: values.comment
        });
        ToastService.success(t("addOrUpdateCollectionModal.successAdd"));
      }
      onSuccess(newCollection);
      onClose?.();
    }
    catch (error)
    {
      ToastService.apiCallError(error);
    }
    finally
    {
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
          <Button variant="subtle" onClick={onClose}
                  disabled={loading || createCollectionMutation.isPending || updateCollectionMutation.isPending}>
            {t("button.cancel")}
          </Button>
          <Button
            type="submit"
            loading={loading || createCollectionMutation.isPending || updateCollectionMutation.isPending}
            disabled={loading || createCollectionMutation.isPending || updateCollectionMutation.isPending}
          >
            {t("button.save")}
          </Button>
        </Group>
      </form>
    </Box>
  );
}
