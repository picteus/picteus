import { useState } from "react";
import { IconFolderSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Button, Flex, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";

import { Repository, RepositoryApiRepositoryCreateRequest } from "@picteus/ws-client";

import { FolderTypes } from "types";
import { detectPlatformFromPath, notifyApiCallI18nError, notifySuccess, Validators } from "utils";
import { useFolderPicker } from "app/hooks";
import { RepositoriesService, StorageService } from "app/services";


const initialValues: RepositoryApiRepositoryCreateRequest = {
  type: "file",
  url: "",
  name: "",
  comment: undefined,
  watch: undefined,
};

type AddOrUpdateRepositoryType = {
  repository?: Repository;
  onSuccess: () => void;
};

export default function AddOrUpdateRepository({ repository, onSuccess }: AddOrUpdateRepositoryType) {
  const [t] = useTranslation();
  const openFolderPicker = useFolderPicker();

  const form = useForm({
    mode: "uncontrolled",
    initialValues: repository ? {
      type: "file" as const,
      url: repository.url,
      name: repository.name,
      comment: repository.comment ?? undefined,
      watch: undefined,
    } : initialValues,
    validate: {
      name: Validators.isNotEmpty,
      url: (value) =>
        value.startsWith("file://") ? null : t("fieldError.badFileUrl"),
    },
  });
  const [loading, setLoading] = useState<boolean>(false);

  async function handleSubmit(values: RepositoryApiRepositoryCreateRequest) {
    setLoading(true);
    try {
      if (repository) {
        await RepositoriesService.update({
          id: repository.id,
          name: values.name,
          comment: values.comment,
        });
      } else {
        await RepositoriesService.add(values);
      }
      notifySuccess(t(`addOrUpdateRepositoryModal.${repository ? "successUpdate" : "successAdd"}`))
      onSuccess();
    } catch (error) {
      notifyApiCallI18nError(error, `addOrUpdateRepositoryModal.${repository ? 'errorUpdate' : 'errorAdd'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleOnClickBrowseFolder() {
    const folderUrl = await openFolderPicker();
    if (folderUrl) {
      StorageService.setLastFolderLocation(FolderTypes.REPOSITORY, folderUrl);
      const currentRepositoryName = form.getValues().name;
      if (!currentRepositoryName || currentRepositoryName?.trim() === "") {
        const lastUrlSegment = folderUrl
          .split(detectPlatformFromPath(folderUrl) === "windows" ? "\\" : "/")
          .filter((segment) => segment !== "")
          .pop();
        form.setFieldValue("name", lastUrlSegment);
      }
      form.setFieldValue("url", "file://" + folderUrl);
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
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
              <IconFolderSearch stroke={1.5} />
            </ActionIcon>
          ) : undefined
        }
        mb="lg"
        withAsterisk
        label={t("field.url")}
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
      <Flex justify="flex-end">
        <Button loading={loading} disabled={loading} type="submit">
          {t(repository ? "button.save" : "button.add")}
        </Button>
      </Flex>
    </form>
  );
}
