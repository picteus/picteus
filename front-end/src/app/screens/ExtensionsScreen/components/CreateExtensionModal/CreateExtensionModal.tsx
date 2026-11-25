import { type ReactElement, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  Grid,
  Input,
  MultiSelect,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  TextInput
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconAlertTriangle } from "@tabler/icons-react";
import {
  Extension,
  ExtensionCategory,
  ExtensionGenerationOptions,
  ExtensionState,
  ManifestRuntimeEnvironment,
  MiscellaneousApi
} from "@picteus/ws-client";

import { computeFilePath, EXTENSIONS_MANUAL_URL, ToastService } from "utils";
import { useModalContext } from "app/context";
import {
  useExtensions,
  useFolderPicker,
  useInstallExtensionMutation,
  useModalSubmit,
  useOpenBrowser,
  useOpenExplorer
} from "app/hooks";
import { ExtensionsService } from "app/services";
import { ActionLink, Common, ModalActions, ModalError } from "app/components";
import { FolderTypes } from "types";


function slugifyExtensionId(name: string): string
{
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

type CreateExtensionModalPropsType =
  {
    readonly onSuccess: (extension: Extension) => void;
  };

export default function CreateExtensionModal(
  { onSuccess }: CreateExtensionModalPropsType
): ReactElement
{
  const [ t ] = useTranslation();
  const modalContext = useModalContext();
  const openBrowser = useOpenBrowser();
  const openFolderPicker = useFolderPicker();
  const openExplorer = useOpenExplorer();
  const { data: extensions = [] } = useExtensions();
  const installExtensionMutation = useInstallExtensionMutation();
  const [ unpackedExtensionsDirectoryPath, setUnpackedExtensionsDirectoryPath ] = useState<string | undefined>();
  const [ isUnpackedPathMissing, setIsUnpackedPathMissing ] = useState<boolean>(false);
  const hasEditedIdRef = useRef<boolean>(false);

  useEffect(() =>
  {
    new MiscellaneousApi().miscellaneousGetConfiguration()
      .then(config =>
      {
        if (config.unpackedExtensionsDirectoryPath)
        {
          setUnpackedExtensionsDirectoryPath(config.unpackedExtensionsDirectoryPath);
        }
        else
        {
          setIsUnpackedPathMissing(true);
        }
      })
      .catch(error =>
      {
        ToastService.apiCallError(error, t("createExtensionModal.errorLoadConfiguration"));
      });
  }, [ t ]);

  const form = useForm<ExtensionGenerationOptions>({
    mode: "controlled",
    initialValues: {
      id: "",
      version: "0.1.0",
      name: "",
      description: "",
      categories: [ ExtensionCategory.Other ],
      author: "",
      environment: ManifestRuntimeEnvironment.Node
    },
    validate: {
      id: value =>
        /^[a-z0-9A-Z-_.]{1,32}$/.test(value)
          ? null
          : t("createExtensionModal.fields.id.invalid"),
      version: value =>
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(value)
          ? null
          : t("createExtensionModal.fields.version.invalid"),
      name: value =>
        /^[a-z0-9A-Z-_. ]{1,128}$/.test(value)
          ? null
          : t("createExtensionModal.fields.name.invalid"),
      description: value =>
        value && value.length >= 1 && value.length <= 1024
          ? null
          : t("createExtensionModal.fields.description.invalid"),
      categories: value =>
        value && value.length > 0
          ? null
          : t("fieldError.empty"),
      author: value =>
        value && value.length >= 1 && value.length <= 128
          ? null
          : t("createExtensionModal.fields.author.invalid"),
      environment: value =>
        value ? null : t("fieldError.empty")
    }
  });

  const {
    isSubmitting,
    submitError,
    clearSubmitError,
    handleSubmit
  } = useModalSubmit<[ ExtensionGenerationOptions ]>(async (values: ExtensionGenerationOptions): Promise<void> =>
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

      const extensionId = values.id;
      if (extensions.some(extensionItem => extensionItem.manifest.id === extensionId) === true)
      {
        throw new Error(t("createExtensionModal.extensionAlreadyExistsError", { id: extensionId }));
      }

      const blob = await ExtensionsService.generate({ withPublicSdk: true, extensionGenerationOptions: values });
      const extension = await installExtensionMutation.mutateAsync({
        state: ExtensionState.Enabled,
        asUnpacked: true,
        body: blob
      });
      const extensionDirectoryPath = computeFilePath(directoryPath, extension.manifest.id);
      ToastService.success(t("createExtensionModal.success"));
      await openExplorer(extensionDirectoryPath);
      onSuccess(extension);
      modalContext?.closeModal(true);
    }
  );

  function handleNameChange(nextName: string): void
  {
    form.setFieldValue("name", nextName);
    if (hasEditedIdRef.current === false)
    {
      form.setFieldValue("id", slugifyExtensionId(nextName));
    }
  }

  function handleIdChange(nextId: string): void
  {
    hasEditedIdRef.current = nextId.trim().length > 0;
    form.setFieldValue("id", nextId);
  }

  const formId = "create-extension-form";

  return (
    <form id={formId} onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t("createExtensionModal.subtitle")}{" "}
          <ActionLink
            onClick={() => void openBrowser(EXTENSIONS_MANUAL_URL)}
          >
            {t("createExtensionModal.readExtensionGuide")}
          </ActionLink>
        </Text>

        {isUnpackedPathMissing === true && (
          <Alert
            color="orange"
            variant="light"
            title={t("titles.warning")}
            icon={<IconAlertTriangle size={Common.IconSmallSize} stroke={Common.IconStrokeSize}/>}
          >
            {t("createExtensionModal.unpackedExtensionsDirectoryPathNotDefinedAlert")}
          </Alert>
        )}

        <Stack gap="sm">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            {t("createExtensionModal.sections.about")}
          </Text>

          <TextInput
            withAsterisk
            label={t("field.name")}
            placeholder={t("createExtensionModal.fields.name.placeholder")}
            value={form.values.name}
            error={form.errors.name}
            onChange={event => handleNameChange(event.currentTarget.value)}
          />

          <Textarea
            withAsterisk
            label={t("field.description")}
            placeholder={t("createExtensionModal.fields.description.placeholder")}
            autosize
            minRows={3}
            maxRows={6}
            {...form.getInputProps("description")}
          />

          <MultiSelect
            withAsterisk
            label={t("field.categories")}
            placeholder={t("createExtensionModal.fields.categories.placeholder")}
            data={Object.values(ExtensionCategory).map(value => ({
              value,
              label: t(`extension.categories.${value}`)
            }))}
            {...form.getInputProps("categories")}
          />
        </Stack>

        <Stack gap="sm">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            {t("createExtensionModal.sections.technical")}
          </Text>

          <Grid gap="sm" align="flex-start">
            <Grid.Col span={{ base: 12, sm: 8 }}>
              <TextInput
                withAsterisk
                label={t("field.id")}
                description={t("createExtensionModal.fields.id.description")}
                placeholder={t("createExtensionModal.fields.id.placeholder")}
                value={form.values.id}
                error={form.errors.id}
                onChange={event => handleIdChange(event.currentTarget.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                withAsterisk
                label={t("field.version")}
                description={t("createExtensionModal.fields.version.description")}
                placeholder={t("createExtensionModal.fields.version.placeholder")}
                {...form.getInputProps("version")}
              />
            </Grid.Col>
          </Grid>

          <Grid gap="sm" align="flex-start">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Input.Wrapper
                withAsterisk
                label={t("field.runtime")}
                error={form.errors.environment}
              >
                <SegmentedControl
                  mt={4}
                  fullWidth
                  value={form.values.environment}
                  onChange={value =>
                  {
                    form.setFieldValue("environment", value as ManifestRuntimeEnvironment);
                  }}
                  data={[
                    {
                      value: ManifestRuntimeEnvironment.Node,
                      label: t(`extension.runtimes.${ManifestRuntimeEnvironment.Node}`)
                    },
                    {
                      value: ManifestRuntimeEnvironment.Python,
                      label: t(`extension.runtimes.${ManifestRuntimeEnvironment.Python}`)
                    }
                  ]}
                />
              </Input.Wrapper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                withAsterisk
                label={t("field.author")}
                placeholder={t("createExtensionModal.fields.author.placeholder")}
                {...form.getInputProps("author")}
              />
            </Grid.Col>
          </Grid>
        </Stack>

        <ModalError
          error={submitError}
          title={t("createExtensionModal.error")}
          onClose={clearSubmitError}
        />
      </Stack>

      <ModalActions isBusy={isSubmitting}>
        <Button
          type="submit"
          form={formId}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {t("button.create")}
        </Button>
      </ModalActions>
    </form>
  );
}
