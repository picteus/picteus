import { useEffect, useState } from "react";
import { IconFolderSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Form, useForm } from "@mantine/form";
import { RepositoryApiRepositoryCreateRequest } from "@picteus/ws-client";
import {
  ActionIcon,
  Button,
  Flex,
  Modal,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";

import { FolderTypes } from "types";
import { detectPlatformFromPath, notifyError, Validators } from "utils";
import { RepositoriesService, StorageService } from "app/services";
import { useFolderPicker } from "app/hooks";

const initialValues: RepositoryApiRepositoryCreateRequest = {
  type: "file",
  url: "",
  name: "",
  comment: undefined,
  watch: undefined,
};

export default function AddRepositoryModal({
  opened,
  onClose,
  onSuccess,
}: {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
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
      const errorJson = await error.response.json();
      notifyError(
        t("addRepositoryModal.errorAdd", { error: errorJson?.message }),
      );
      console.error("An error occured while trying to create a repo", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleOnClickBrowseFolder() {
    const folderUrl = await openFolderPicker();
    if (folderUrl) {
      StorageService.setLastFolderLocation(FolderTypes.REPOSITORY, folderUrl);
      const currentRepositoryname = form.getValues().name;
      if (!currentRepositoryname || currentRepositoryname?.trim() === "") {
        const lastUrlSegment = folderUrl
          .split(detectPlatformFromPath(folderUrl) === "windows" ? "\\" : "/")
          .filter((segment) => segment !== "")
          .pop();
        form.setFieldValue("name", lastUrlSegment);
      }
      form.setFieldValue("url", "file://" + folderUrl);
    }
  }

  useEffect(() => {
    if (!opened) {
      form.reset();
    }
  }, [opened]);

  return (
    <>
      <Modal
        size="lg"
        opened={opened}
        onClose={onClose}
        title={<Title order={3}>{t("addRepositoryModal.title")}</Title>}
        padding="lg"
      >
        <Form form={form} onSubmit={handleSubmit}>
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
        </Form>
      </Modal>
    </>
  );
}
