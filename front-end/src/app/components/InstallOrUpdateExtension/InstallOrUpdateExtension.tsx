import { type ReactElement, useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ActionIcon, Alert, Button, Flex, Group, Paper, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { Dropzone } from "@mantine/dropzone";
import "@mantine/dropzone/styles.css";
import { IconAlertTriangle, IconFileZip, IconInfoCircle, IconTrash, IconUpload, IconX } from "@tabler/icons-react";

import { Extension, ExtensionState } from "@picteus/ws-client";

import { EXTENSIONS_MANUAL_URL, formatFileSize } from "utils";
import { useModalContext } from "app/context";
import {
  useConfirmAction,
  useInstallExtensionMutation,
  useModalSubmit,
  useOpenBrowser,
  useUpdateExtensionMutation
} from "app/hooks";
import ActionLink from "../ActionLink/ActionLink.tsx";
import Common from "../Common/Common.ts";
import ModalActions from "../ModalActions/ModalActions.tsx";
import ModalError from "../ModalError/ModalError.tsx";


const ACCEPTED_EXTENSION_ARCHIVE_MIME_TYPES: string[] = [
  "application/zip",
  "application/gzip"
];

function isAcceptedArchiveMimeType(file: File): boolean
{
  return ACCEPTED_EXTENSION_ARCHIVE_MIME_TYPES.includes(file.type);
}

async function fileToBlob(file: File): Promise<Blob>
{
  return new Promise((resolve, reject) =>
  {
    try
    {
      resolve(new Blob([ file ], { type: file.type }));
    }
    catch (error)
    {
      const message = error instanceof Error ? error.message : String(error);
      reject(new Error(`Failed to convert file to Blob. Reason: '${message}'`));
    }
  });
}

type FormValueType = {
  source: "file" | "url";
  file: File | undefined;
  url: string;
};

const initialValues: FormValueType = {
  source: "file",
  file: undefined,
  url: ""
};

type InstallOrUpdateExtensionPropsType =
  {
    readonly extension?: Extension;
    readonly onSuccess: (extension: Extension) => void;
  };

export default function InstallOrUpdateExtension(
  {
    extension,
    onSuccess
  }: InstallOrUpdateExtensionPropsType
): ReactElement
{
  const [ t ] = useTranslation();
  const confirmAction = useConfirmAction();
  const openBrowser = useOpenBrowser();
  const modalContext = useModalContext();
  const dropzoneRef = useRef<() => void>(null);
  const installExtensionMutation = useInstallExtensionMutation();
  const updateExtensionMutation = useUpdateExtensionMutation();

  const form = useForm<FormValueType>({
    mode: "controlled",
    validateInputOnChange: true,
    initialValues,
    validate: {
      file: (file: File | undefined, values) =>
      {
        if (values.source !== "file")
        {
          return null;
        }
        if (file === undefined)
        {
          return t("fieldError.empty");
        }
        if (isAcceptedArchiveMimeType(file) === false)
        {
          return t("fieldError.wrongFileFormat", { extensions: t("installExtensionModal.dropzone.acceptedFormatsList") });
        }
        return null;
      },
      url: (url: string | undefined, values) =>
      {
        if (values.source !== "url")
        {
          return null;
        }
        if (url === undefined || url.trim().length === 0)
        {
          return t("fieldError.empty");
        }
        try
        {
          new URL(url);
          return null;
        }
        catch
        {
          return t("fieldError.badUrl");
        }
      }
    }
  });

  const {
    isSubmitting,
    submitError,
    clearSubmitError,
    handleSubmit: executeSubmit
  } = useModalSubmit<[ FormValueType ]>(async (values: FormValueType): Promise<void> =>
  {
    let blob: Blob;
    if (values.source === "url")
    {
      const response = await fetch(values.url);
      if (response.ok === false)
      {
        throw Object.assign(new Error(`HTTP ${response.status}`), { response });
      }
      blob = await response.blob();
    }
    else if (values.file !== undefined)
    {
      blob = await fileToBlob(values.file);
    }
    else
    {
      return;
    }

    const installedOrUpdatedExtension = extension !== undefined
      ? await updateExtensionMutation.mutateAsync({
        id: extension.manifest.id,
        body: blob
      })
      : await installExtensionMutation.mutateAsync({
        state: ExtensionState.Enabled,
        asUnpacked: false,
        body: blob
      });
    onSuccess(installedOrUpdatedExtension);
    modalContext?.closeModal(true);
  });

  const isPending = isSubmitting || installExtensionMutation.isPending || updateExtensionMutation.isPending;

  function handleSubmit(values: FormValueType): void
  {
    const sourceLabel = values.source === "url" ? values.url : (values.file?.name ?? "");
    confirmAction({
      options: extension !== undefined
        ? {
          title: t("extension.confirmUpdateTitle"),
          message: t("updateExtensionModal.confirmMessage", { name: extension.manifest.name }),
          content: t("extension.confirmUpdateConsequences")
        }
        : {
          title: t("extension.confirmInstallTitle"),
          message: t("installExtensionModal.confirmMessage", { source: sourceLabel }),
          content: t("extension.confirmInstallConsequences")
        },
      onConfirm: () => void executeSubmit(values)
    });
  }

  function renderDropzone(): ReactElement
  {
    const selectedFile = form.values.file;
    if (selectedFile !== undefined)
    {
      return (
        <Paper withBorder radius="md" p="sm">
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="xs" wrap="nowrap" miw={0} flex={1}>
              <IconFileZip
                size={Common.IconSmallSize}
                stroke={Common.IconStrokeSize}
                color="var(--mantine-color-dimmed)"
                style={{ flexShrink: 0 }}
              />
              <Text size="sm" fw={500} truncate>
                {selectedFile.name}
              </Text>
            </Group>
            <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
              <Text size="xs" c="dimmed">
                {formatFileSize(selectedFile.size)}
              </Text>
              <ActionIcon
                variant="subtle"
                color="red"
                disabled={isPending}
                onClick={() =>
                {
                  clearSubmitError();
                  form.setFieldValue("file", undefined);
                  form.clearFieldError("file");
                }}
              >
                <IconTrash size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>
              </ActionIcon>
            </Group>
          </Group>
        </Paper>
      );
    }

    return (
      <Stack gap={6}>
        <Dropzone
          radius="md"
          p="lg"
          openRef={dropzoneRef}
          accept={ACCEPTED_EXTENSION_ARCHIVE_MIME_TYPES}
          onDrop={droppedFiles =>
          {
            clearSubmitError();
            form.clearFieldError("file");
            form.setFieldValue("file", droppedFiles[0]);
          }}
          onReject={() =>
            form.setFieldError(
              "file",
              t("fieldError.wrongFileFormat", {
                extensions: t("installExtensionModal.dropzone.acceptedFormatsList")
              })
            )
          }
        >
          <Stack align="center" justify="center" gap="xs" style={{ pointerEvents: "none" }}>
            <Dropzone.Accept>
              <IconUpload size={32} stroke={Common.IconStrokeSize} color="var(--mantine-color-blue-6)"/>
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size={32} stroke={Common.IconStrokeSize} color="var(--mantine-color-red-6)"/>
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconFileZip size={32} stroke={Common.IconStrokeSize} color="var(--mantine-color-dimmed)"/>
            </Dropzone.Idle>

            <Text size="sm" fw={500}>
              {t("installExtensionModal.dropzone.dragAndDrop")}
            </Text>
            <Button variant="default" size="sm" style={{ pointerEvents: "all" }}>
              {t("installExtensionModal.dropzone.select")}
            </Button>
            <Text size="xs" c="dimmed">
              {t("installExtensionModal.dropzone.acceptedExtensions")}
            </Text>
          </Stack>
        </Dropzone>
        {form.errors.file !== undefined && (
          <Text size="xs" c="red">
            {form.errors.file}
          </Text>
        )}
      </Stack>
    );
  }

  const isFileReady = form.values.file !== undefined && isAcceptedArchiveMimeType(form.values.file) === true;
  const canSubmit = form.values.source === "url" ? form.values.url.trim().length > 0 : isFileReady;
  const formId = "install-or-update-extension-form";
  const urlInputProps = form.getInputProps("url");

  return (
    <form id={formId} onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        {extension !== undefined && (
          <>
            <Group gap="xs" align="center">
              <Text size="sm" c="dimmed">
                {t("updateExtensionModal.installedVersionLabel")}
              </Text>
              <Text size="sm" fw={600}>
                {extension.manifest.version}
              </Text>
            </Group>
            <Alert
              color="orange"
              variant="light"
              icon={<IconAlertTriangle size={Common.IconSmallSize} stroke={Common.IconStrokeSize}/>}
            >
              <Trans
                i18nKey="updateExtensionModal.warning"
                components={{ strong: <b/> }}
                values={{ name: extension.manifest.id }}
              />
            </Alert>
          </>
        )}

        <SegmentedControl
          fullWidth
          value={form.values.source}
          onChange={value =>
          {
            clearSubmitError();
            form.setFieldValue("source", value as "file" | "url");
          }}
          data={[
            { label: t("installExtensionModal.sourceFile"), value: "file" },
            { label: t("installExtensionModal.sourceUrl"), value: "url" }
          ]}
        />

        {form.values.source === "file" ? (
          renderDropzone()
        ) : (
          <TextInput
            withAsterisk
            label={t("installExtensionModal.urlLabel")}
            placeholder={t("installExtensionModal.urlPlaceholder")}
            {...urlInputProps}
            onChange={event =>
            {
              clearSubmitError();
              urlInputProps.onChange(event);
            }}
          />
        )}

        {extension === undefined && (
          <Flex>
            <ActionLink
              leftSection={<IconInfoCircle size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
              onClick={() => void openBrowser(EXTENSIONS_MANUAL_URL)}
            >
              {t("installExtensionModal.extensionGuideHint")}
            </ActionLink>
          </Flex>
        )}

        {isPending === true && (
          <Flex justify="flex-end">
            <Text size="xs" c="dimmed">
              {t("message.fileProcessing")}
            </Text>
          </Flex>
        )}
      </Stack>

      <ModalError
        error={submitError}
        title={t(extension !== undefined ? "updateExtensionModal.errorAdd" : "installExtensionModal.errorAdd")}
        onClose={clearSubmitError}
      />

      <ModalActions isBusy={isPending}>
        <Button
          type="submit"
          form={formId}
          loading={isPending}
          disabled={isPending === true || canSubmit === false}
        >
          {t(extension !== undefined ? "button.update" : "button.install")}
        </Button>
      </ModalActions>
    </form>
  );
}
