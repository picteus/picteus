import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Flex, Select, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { ExtensionGenerationOptions } from "@picteus/ws-client";

import { computeFilePath, NotificationsService } from "utils";
import { useFolderPicker, useOpenExplorer } from "app/hooks";
import { ExtensionsService } from "app/services";
import { FolderTypes } from "types";
import { useCommandSocket } from "app/context";


type CreateExtensionModalProps = {
  onSuccess: () => void;
};

function blobToBase64(blob: Blob): Promise<string>
{
  return new Promise((resolve, reject) =>
  {
    const reader = new FileReader();
    reader.onloadend = () =>
    {
      const base64data = reader.result as string;
      const base64String = base64data.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function CreateExtensionModal({ onSuccess }: CreateExtensionModalProps)
{
  const [ t ] = useTranslation();
  const openFolderPicker = useFolderPicker();
  const { sendCommand } = useCommandSocket();
  const openExplorer = useOpenExplorer();
  const [ loading, setLoading ] = useState(false);

  const form = useForm<ExtensionGenerationOptions>({
    mode: "uncontrolled",
    initialValues: {
      id: "",
      version: "1.0.0",
      name: "",
      description: "",
      author: "",
      environment: "python"
    },
    validate: {
      id: (value) =>
        /^[a-z0-9A-Z-_.]{1,32}$/.test(value)
          ? null
          : t("createExtensionModal.fields.id.invalid"),
      version: (value) =>
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(value)
          ? null
          : t("createExtensionModal.fields.version.invalid"),
      name: (value) =>
        /^[a-z0-9A-Z-_. ]{1,128}$/.test(value)
          ? null
          : t("createExtensionModal.fields.name.invalid"),
      description: (value) =>
        value && value.length >= 1 && value.length <= 1024
          ? null
          : t("createExtensionModal.fields.description.invalid"),
      author: (value) =>
        value && value.length >= 1 && value.length <= 128
          ? null
          : t("createExtensionModal.fields.author.invalid"),
      environment: (value) =>
        value ? null : t("fieldError.empty")
    }
  });

  async function handleSubmit(values: ExtensionGenerationOptions)
  {
    try
    {
      const directoryPath = await openFolderPicker(FolderTypes.EXTENSION);
      if (directoryPath === undefined)
      {
        return;
      }
      setLoading(true);

      let blob: Blob;
      try
      {
        blob = await ExtensionsService.generate({ withPublicSdk: true, extensionGenerationOptions: values });
      }
      catch (error)
      {
        const errorAsError = error as Error;
        NotificationsService.errorWithMessage(errorAsError, t("createExtensionModal.error", { error: errorAsError.message }));
      }

      const base64String = await blobToBase64(blob);
      const fileName = `${values.id}-${values.version}.zip`;
      const filePath = computeFilePath(directoryPath, fileName);
      await sendCommand("saveFile", { filePath, content: base64String });
      NotificationsService.success(t("createExtensionModal.success"));
      await openExplorer(filePath);
      onSuccess();
    }
    finally
    {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <TextInput
        mb="md"
        withAsterisk
        label={t("field.id")}
        description={t("createExtensionModal.fields.id.description")}
        placeholder="my-extension"
        {...form.getInputProps("id")}
      />
      <TextInput
        mb="md"
        withAsterisk
        label={t("field.version")}
        description={t("createExtensionModal.fields.version.description")}
        placeholder="1.0.0"
        {...form.getInputProps("version")}
      />
      <TextInput
        mb="md"
        withAsterisk
        label={t("field.name")}
        description={t("createExtensionModal.fields.name.description")}
        placeholder="My Extension"
        {...form.getInputProps("name")}
      />
      <Textarea
        mb="md"
        withAsterisk
        label={t("field.description")}
        description={t("createExtensionModal.fields.description.description")}
        placeholder="Computes embeddings..."
        autosize
        minRows={3}
        maxRows={6}
        {...form.getInputProps("description")}
      />
      <TextInput
        mb="md"
        withAsterisk
        label={t("field.author")}
        description={t("createExtensionModal.fields.author.description")}
        placeholder="John Doe"
        {...form.getInputProps("author")}
      />
      <Select
        mb="lg"
        withAsterisk
        label={t("field.runtime")}
        description={t("createExtensionModal.fields.environment.description")}
        data={[
          { value: "python", label: "Python" },
          { value: "node", label: "Node" }
        ]}
        {...form.getInputProps("environment")}
      />

      <Flex justify="flex-end">
        <Button loading={loading} disabled={loading} type="submit">
          {t("button.create")}
        </Button>
      </Flex>
    </form>
  );
}
