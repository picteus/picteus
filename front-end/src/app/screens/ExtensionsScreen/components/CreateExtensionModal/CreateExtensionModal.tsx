import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Flex, MultiSelect, Select, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconAlertTriangle, IconX } from "@tabler/icons-react";
import {
  ExtensionCategory,
  ExtensionGenerationOptions,
  ManifestRuntimeEnvironment,
  MiscellaneousApi
} from "@picteus/ws-client";

import { computeFilePath, NotificationsService } from "utils";
import { useFolderPicker, useOpenExplorer } from "app/hooks";
import { ExtensionsService } from "app/services";
import { ChannelEnum, FolderTypes } from "types";
import { useCommandSocket, useEventSocket } from "app/context";


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
  const { eventStore } = useEventSocket();
  const [ loading, setLoading ] = useState(false);
  const [ submitError, setSubmitError ] = useState<string | undefined>();
  const [ unpackedExtensionsDirectoryPath, setUnpackedExtensionsDirectoryPath ] = useState<string | undefined>();
  const [ unpackedPathNotDefined, setUnpackedPathNotDefined ] = useState(false);

  useEffect(() =>
  {
    new MiscellaneousApi().miscellaneousGetConfiguration()
      .then((config) =>
      {
        if (config.unpackedExtensionsDirectoryPath)
        {
          setUnpackedExtensionsDirectoryPath(config.unpackedExtensionsDirectoryPath);
        }
        else
        {
          setUnpackedPathNotDefined(true);
        }
      })
      .catch((error) =>
      {
        NotificationsService.apiCallError(error, "Failed to load the application configuration");
      });
  }, []);

  const form = useForm<ExtensionGenerationOptions>({
    mode: "uncontrolled",
    initialValues: {
      id: "",
      version: "",
      name: "",
      description: "",
      categories: [],
      author: "",
      environment: ManifestRuntimeEnvironment.Python
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
      categories: (value) =>
        value && value.length > 0
          ? null
          : t("fieldError.empty"),
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
    setSubmitError(undefined);
    try
    {
      let directoryPath = unpackedExtensionsDirectoryPath;
      if (directoryPath === undefined)
      {
        directoryPath = await openFolderPicker(FolderTypes.EXTENSION);
      }
      if (directoryPath === undefined)
      {
        return;
      }
      setLoading(true);

      const extensionId = values.id;
      if (ExtensionsService.list().some((extension) => extension.manifest.id === extensionId) === true)
      {
        throw new Error(t("createExtensionModal.extensionAlreadyExistsError", { id: extensionId }));
      }

      const blob = await ExtensionsService.generate({ withPublicSdk: true, extensionGenerationOptions: values });
      const builtBlob = await ExtensionsService.build({ body: blob });

      const base64String = await blobToBase64(builtBlob);
      const extensionDirectoryPath = computeFilePath(directoryPath, extensionId);
      await sendCommand(
        values.environment === ManifestRuntimeEnvironment.Node ? "inflateTarball" : "inflateZip",
        { directoryPath: extensionDirectoryPath, content: base64String }
      );

      await new Promise<void>((resolve) =>
      {
        const unsubscribe = eventStore.subscribeToSocketEvents((event) =>
        {
          if (event.channel === ChannelEnum.EXTENSION_INSTALLED && (event.value)?.id === extensionId)
          {
            unsubscribe();
            resolve();
          }
        });
      });

      NotificationsService.success(t("createExtensionModal.success"));
      await openExplorer(extensionDirectoryPath);
      onSuccess();
    }
    catch (error)
    {
      const errorAsError = error as Error;
      setSubmitError(errorAsError.message);
    }
    finally
    {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      {unpackedPathNotDefined && (
        <Alert mb="md" color="orange"
               title={t("titles.warning")}
               icon={<IconAlertTriangle/>}>
          {t("createExtensionModal.unpackedExtensionsDirectoryPathNotDefinedAlert")}
        </Alert>
      )}
      <TextInput
        mb="md"
        withAsterisk
        label={t("field.id")}
        description={t("createExtensionModal.fields.id.description")}
        placeholder={t("createExtensionModal.fields.id.placeholder")}
        {...form.getInputProps("id")}
      />
      <TextInput
        mb="md"
        withAsterisk
        label={t("field.version")}
        description={t("createExtensionModal.fields.version.description")}
        placeholder={t("createExtensionModal.fields.version.placeholder")}
        {...form.getInputProps("version")}
      />
      <TextInput
        mb="md"
        withAsterisk
        label={t("field.name")}
        description={t("createExtensionModal.fields.name.description")}
        placeholder={t("createExtensionModal.fields.name.placeholder")}
        {...form.getInputProps("name")}
      />
      <Textarea
        mb="md"
        withAsterisk
        label={t("field.description")}
        description={t("createExtensionModal.fields.description.description")}
        placeholder={t("createExtensionModal.fields.description.placeholder")}
        autosize
        minRows={3}
        maxRows={6}
        {...form.getInputProps("description")}
      />
      <MultiSelect
        mb="md"
        withAsterisk
        label={t("field.categories")}
        description={t("createExtensionModal.fields.categories.description")}
        placeholder={t("createExtensionModal.fields.categories.placeholder")}
        data={Object.values(ExtensionCategory).map((value) => ({ value, label: value }))}
        {...form.getInputProps("categories")}
      />
      <TextInput
        mb="md"
        withAsterisk
        label={t("field.author")}
        description={t("createExtensionModal.fields.author.description")}
        placeholder={t("createExtensionModal.fields.author.placeholder")}
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
      {submitError && (
        <Alert mb="md" color="red" title={t("titles.error")} icon={<IconX />}>
          {t("createExtensionModal.error", { error: submitError })}
        </Alert>
      )}

      <Flex justify="flex-end">
        <Button loading={loading} disabled={loading} type="submit">
          {t("button.create")}
        </Button>
      </Flex>
    </form>
  );
}
