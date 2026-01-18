import { useEffect, useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useForm } from "@mantine/form";

import "@mantine/dropzone/styles.css";

import {
  ActionIcon,
  Alert,
  Button,
  Flex,
  Modal,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconFileZip,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { Extension } from "@picteus/ws-client";

import { ExtensionsService } from "app/services";
import { fileToBlob, mimeTypes, notifyError, Validators } from "utils";
import { Dropzone } from "@mantine/dropzone";

type FormValueType = {
  file: File | undefined;
};

type AddOrUpdateExtensionModalType = {
  opened: boolean;
  extension?: Extension;
  onClose: () => void;
  onSuccess: (extension: Extension) => void;
};

const initialValues: FormValueType = {
  file: undefined,
};

export default function AddOrUpdateExtensionModal({
  opened,
  extension,
  onClose,
  onSuccess,
}: AddOrUpdateExtensionModalType) {
  const [t] = useTranslation();
  const [fileIsValid, setFileIsValid] = useState(false);
  const dropzoneRef = useRef<() => void>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const messagePrefix = useMemo(
    () => (extension ? "updateExtensionModal" : "addExtensionModal"),
    [extension],
  );

  const form = useForm({
    mode: "uncontrolled",
    validateInputOnChange: true,
    initialValues,
    validate: {
      file: (file: File) => {
        if (!file) {
          return t("fieldError.empty");
        }
        if (
          !Validators.isMimeType(file, [
            mimeTypes.gzip,
            mimeTypes.zip,
            mimeTypes.tarGz,
          ])
        ) {
          return t("fieldError.wrongFileFormat", {
            extensions: "ZIP, GZIP, or TAR.GZ",
          });
        }
        setFileIsValid(true);
      },
    },
  });

  async function handleSubmit(values: FormValueType) {
    setLoading(true);
    const blob = await fileToBlob(values.file);

    try {
      const _extension = extension
        ? await ExtensionsService.update({
            id: extension.manifest.id,
            body: blob,
          })
        : await ExtensionsService.add({ body: blob });

      onSuccess(_extension);
    } catch (error) {
      const errorJson = await error.response.json();
      notifyError(
        t(messagePrefix + ".errorAdd", { error: errorJson?.message }),
      );
      console.error(
        "An error occurred while trying to add or update an extension",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!opened) {
      form.reset();
      setFileIsValid(false);
    }
  }, [opened]);

  function renderDropzone() {
    const getIconStyle = (color) => {
      return { width: 52, height: 52, color: `var(--mantine-color-${color})` };
    };

    const file = form.getValues().file;
    if (file) {
      return (
        <Flex mb="lg" align={"center"} justify="space-between">
          <Flex gap="5">
            <IconFileZip style={{ width: 24, height: 24 }} stroke={1.3} />
            <Text>{file.name?.substring(0, 60)}</Text>
          </Flex>
          <ActionIcon
            variant="light"
            disabled={loading}
            color="red"
            onClick={() => {
              setFileIsValid(false);
              form.setFieldValue("file", undefined);
            }}
          >
            <IconTrash stroke={1.2} />
          </ActionIcon>
        </Flex>
      );
    }

    return (
      <Dropzone
        mb="lg"
        openRef={dropzoneRef}
        accept={[mimeTypes.zip, mimeTypes.gzip, mimeTypes.tarGz]}
        onDrop={(file) => form.setFieldValue("file", file[0])}
        onReject={() =>
          form.setFieldError(
            "files",
            t("fieldError.wrongFileFormat", {
              extensions: "ZIP, GZIP, or TAR.GZ",
            }),
          )
        }
      >
        <Flex
          direction="column"
          justify="center"
          gap={20}
          align="center"
          style={{ pointerEvents: "none" }}
        >
          <Dropzone.Accept>
            <IconUpload style={getIconStyle("blue-6")} stroke={1.3} />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX style={getIconStyle("red-6")} stroke={1.3} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFileZip style={getIconStyle("dimmed")} stroke={1.3} />
          </Dropzone.Idle>

          <div>
            <Button variant="light" style={{ pointerEvents: "all" }}>
              {t("addExtensionModal.dropzone.select")}
            </Button>
            <Text size="sm" c="dimmed" inline mt={7}>
              {t("addExtensionModal.dropzone.dragAndDrop")}
            </Text>
          </div>
        </Flex>
      </Dropzone>
    );
  }
  return (
    <>
      <Modal
        size="lg"
        opened={opened}
        closeButtonProps={{ disabled: loading }}
        onClose={loading ? () => {} : onClose}
        title={<Title order={3}>{t(messagePrefix + ".title")}</Title>}
        padding="lg"
      >
        {extension && (
          <>
            <Alert mb="sm" color="orange" icon={<IconAlertTriangle />}>
              <Trans
                i18nKey="updateExtensionModal.warning"
                components={{ strong: <b /> }}
                values={{ name: extension.manifest.id }}
              />
            </Alert>
          </>
        )}
        <form onSubmit={form.onSubmit(handleSubmit)}>
          {renderDropzone()}

          <Flex justify="flex-end">
            <Button
              loading={loading}
              disabled={loading || !fileIsValid}
              type="submit"
            >
              {t(extension ? "button.update" : "button.add")}
            </Button>
          </Flex>
          {loading && (
            <Flex justify="flex-end">
              <Text mt="xs" size="xs">
                {t("message.fileProcessing")}
              </Text>
            </Flex>
          )}
        </form>
      </Modal>
    </>
  );
}
