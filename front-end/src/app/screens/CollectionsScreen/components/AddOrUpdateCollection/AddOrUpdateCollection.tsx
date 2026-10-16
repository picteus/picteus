import React, { type ReactElement, useState } from "react";
import { Box, Button, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslation } from "react-i18next";

import { Collection as PicteusCollection, SearchFilter } from "@picteus/ws-client";

import { ToastService } from "utils";
import { useModalContext } from "app/context";
import { useCreateCollectionMutation, useUpdateCollectionMutation } from "app/hooks";
import { FiltersService } from "app/services";
import { ModalActions } from "app/components";


export type AddOrUpdateCollectionPropsType =
  {
    readonly collection?: PicteusCollection;
    readonly searchFilter?: SearchFilter;
    readonly onSuccess?: (collection: PicteusCollection) => void;
    readonly onClose?: () => void;
  };

export default function AddOrUpdateCollection(
  {
    collection,
    searchFilter = FiltersService.defaultFilter,
    onSuccess,
    onClose
  }: AddOrUpdateCollectionPropsType
): ReactElement
{
  const [ t ] = useTranslation();
  const modalContext = useModalContext();
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
      onSuccess?.(newCollection);
      onClose?.();
      modalContext?.closeModal(true);
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

  function handleCancel(): void
  {
    onClose?.();
    modalContext?.closeModal(false);
  }

  const isPending = loading || createCollectionMutation.isPending || updateCollectionMutation.isPending;

  const formId = "add-or-update-collection-form";

  return (
    <Box p="sm">
      <form id={formId} onSubmit={form.onSubmit(handleOnSubmit)}>
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
        <ModalActions>
          <Button
            variant="subtle"
            disabled={isPending}
            onClick={handleCancel}
          >
            {t("button.cancel")}
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={isPending}
            disabled={isPending}
          >
            {t("button.save")}
          </Button>
        </ModalActions>
      </form>
    </Box>
  );
}
