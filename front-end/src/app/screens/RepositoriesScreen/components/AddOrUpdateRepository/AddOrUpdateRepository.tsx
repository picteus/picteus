import { type ReactElement, useState } from "react";
import { IconFolderSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Button, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";

import { Repository, RepositoryApiRepositoryCreateRequest } from "@picteus/ws-client";

import { FolderTypes } from "types";
import { computePathSeparator, ToastService, Validators } from "utils";
import { useModalContext } from "app/context";
import { useAddRepositoryMutation, useFolderPicker, useUpdateRepositoryMutation } from "app/hooks";
import { ModalActions } from "app/components";


const initialValues: RepositoryApiRepositoryCreateRequest = {
  type: "file",
  url: "",
  name: "",
  comment: undefined,
  watch: undefined
};

export type AddOrUpdateRepositoryPropsType =
  {
    readonly repository?: Repository;
  };

export default function AddOrUpdateRepository(
  { repository }: AddOrUpdateRepositoryPropsType
): ReactElement
{
  const [ t ] = useTranslation();
  const modalContext = useModalContext();
  const openFolderPicker = useFolderPicker();
  const updateRepositoryMutation = useUpdateRepositoryMutation();
  const addRepositoryMutation = useAddRepositoryMutation();

  const form = useForm({
    mode: "uncontrolled",
    initialValues: repository
      ? {
        type: "file" as const,
        url: repository.url,
        name: repository.name,
        comment: repository.comment ?? undefined,
        watch: undefined
      }
      : initialValues,
    validate: { name: Validators.isNotEmpty, url: Validators.isNotEmpty }
  });
  const [ loading, setLoading ] = useState<boolean>(false);

  async function handleSubmit(
    values: RepositoryApiRepositoryCreateRequest
  ): Promise<void>
  {
    setLoading(true);
    try
    {
      if (repository)
      {
        await updateRepositoryMutation.mutateAsync({
          id: repository.id,
          name: values.name,
          comment: values.comment
        });
      }
      else
      {
        await addRepositoryMutation.mutateAsync({
          ...values,
          url: `file://${values.url}`
        });
      }
      ToastService.success(
        t(
          `addOrUpdateRepositoryModal.${repository ? "successUpdate" : "successAdd"}`
        )
      );
      modalContext?.closeModal(true);
    }
    catch (error)
    {
      ToastService.apiCallI18nError(
        error,
        `addOrUpdateRepositoryModal.${repository ? "errorUpdate" : "errorAdd"}`
      );
    }
    finally
    {
      setLoading(false);
    }
  }

  async function handleOnClickBrowseFolder(): Promise<void>
  {
    const directoryPath = await openFolderPicker(FolderTypes.REPOSITORY);
    if (directoryPath === undefined)
    {
      return;
    }
    const currentRepositoryName = form.getValues().name;
    if (!currentRepositoryName || currentRepositoryName?.trim() === "")
    {
      const lastUrlSegment = directoryPath
        .split(computePathSeparator(directoryPath))
        .filter((segment) => segment !== "")
        .pop();
      form.setFieldValue("name", lastUrlSegment);
    }
    form.setFieldValue("url", directoryPath);
  }

  const isPending =
    loading ||
    updateRepositoryMutation.isPending ||
    addRepositoryMutation.isPending;

  const formId = "add-or-update-repository-form";

  return (
    <form id={formId} onSubmit={form.onSubmit(handleSubmit)}>
      <TextInput
        mb="lg"
        withAsterisk
        label={t("field.name")}
        placeholder={t("addOrUpdateRepositoryModal.namePlaceholder")}
        {...form.getInputProps("name")}
      />
      <TextInput
        disabled={!!repository}
        rightSection={
          !repository ? (
            <ActionIcon
              onClick={handleOnClickBrowseFolder}
              variant="default"
              size="lg"
            >
              <IconFolderSearch stroke={1.5}/>
            </ActionIcon>
          ) : undefined
        }
        mb="lg"
        withAsterisk
        label={t("field.location")}
        placeholder={t("addOrUpdateRepositoryModal.urlPlaceholder")}
        {...form.getInputProps("url")}
      />

      <Textarea
        mb="lg"
        label={t("field.comment")}
        autosize
        minRows={3}
        maxRows={6}
        placeholder={t("addOrUpdateRepositoryModal.commentPlaceholder")}
        {...form.getInputProps("comment")}
      />
      <ModalActions isBusy={isPending}>
        <Button
          type="submit"
          form={formId}
          loading={isPending}
          disabled={isPending}
        >
          {t(repository !== undefined ? "button.save" : "button.add")}
        </Button>
      </ModalActions>
    </form>
  );
}
