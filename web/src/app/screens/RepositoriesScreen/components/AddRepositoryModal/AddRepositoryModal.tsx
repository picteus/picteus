import { useState } from "react";
import { IconFolderSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Button, Flex, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";

import { RepositoryApiRepositoryCreateRequest } from "@picteus/ws-client";

import { FolderTypes } from "types";
import { detectPlatformFromPath, notifyApiCallI18nError, Validators } from "utils";
import { useFolderPicker } from "app/hooks";
import { RepositoriesService, StorageService } from "app/services";


const initialValues: RepositoryApiRepositoryCreateRequest = {
  type: "file",
  url: "",
  name: "",
  comment: undefined,
  watch: undefined,
};

type AddRepositoryModalType = {
  onSuccess: () => void;
};

export default function AddRepositoryModal({ onSuccess }: AddRepositoryModalType) {
  const [t] = useTranslation();
  const openFolderPicker = useFolderPicker();

  const form = useForm({
    mode: "uncontrolled",
    initialValues,
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
      await RepositoriesService.add(values);
      onSuccess();
    } catch (error) {
      notifyApiCallI18nError(error, "addRepositoryModal.errorAdd");
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
        placeholder={t("addRepositoryModal.namePlaceholder")}
        {...form.getInputProps("name")}
      />
      <TextInput
        rightSection={
          <ActionIcon
            onClick={handleOnClickBrowseFolder}
            variant="default"
            size="lg"
          >
            <IconFolderSearch stroke={1.5} />
          </ActionIcon>
        }
        mb="lg"
        withAsterisk
        label={t("field.url")}
        placeholder={t("addRepositoryModal.urlPlaceholder")}
        {...form.getInputProps("url")}
      />

      <Textarea
        mb="lg"
        label={t("field.comment")}
        autosize
        minRows={3}
        maxRows={6}
        placeholder={t("addRepositoryModal.commentPlaceholder")}
        {...form.getInputProps("comment")}
      />
      <Flex justify="flex-end">
        <Button loading={loading} disabled={loading} type="submit">
          {t("button.add")}
        </Button>
      </Flex>
    </form>
  );
}
