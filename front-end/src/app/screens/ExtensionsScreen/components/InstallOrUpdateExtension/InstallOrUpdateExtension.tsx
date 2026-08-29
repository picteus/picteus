import { useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ActionIcon, Alert, Button, Flex, SegmentedControl, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { Dropzone } from "@mantine/dropzone";
import "@mantine/dropzone/styles.css";
import { IconAlertTriangle, IconFileZip, IconTrash, IconUpload, IconX } from "@tabler/icons-react";

import { Extension, ExtensionState } from "@picteus/ws-client";

import { fileToBlob, mimeTypes, ToastService, Validators } from "utils";
import { ExtensionsService } from "app/services";


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

type InstallOrUpdateExtensionType = {
  extension?: Extension;
  onSuccess: (extension: Extension) => void;
};

export default function InstallOrUpdateExtension({
  extension,
  onSuccess
}: InstallOrUpdateExtensionType)
{
  const [ t ] = useTranslation();
  const [ fileIsValid, setFileIsValid ] = useState(false);
  const dropzoneRef = useRef<() => void>(null);
  const [ loading, setLoading ] = useState<boolean>(false);

  const messagePrefix = useMemo(
    () => (extension ? "updateExtensionModal" : "installExtensionModal"),
    [ extension ]
  );

  const form = useForm<FormValueType>({
    mode: "uncontrolled",
    validateInputOnChange: true,
    initialValues,
    validate: {
      file: (file: File | undefined, values) =>
      {
        if (values.source !== "file")
        {
          return null;
        }
        if (!file)
        {
          return t("fieldError.empty");
        }
        if (
          !Validators.isMimeType(file, [
            mimeTypes.gzip,
            mimeTypes.zip,
            mimeTypes.tarGz
          ])
        )
        {
          return t("fieldError.wrongFileFormat", {
            extensions: "ZIP, GZIP, or TAR.GZ"
          });
        }
        setFileIsValid(true);
      },
      url: (url: string | undefined, values) =>
      {
        if (values.source !== "url")
        {
          return null;
        }
        if (!url || url.trim() === "")
        {
          return t("fieldError.empty");
        }
        try
        {
          new URL(url);
          return null;
        }
        catch (error)
        {
          return t("fieldError.badUrl");
        }
      }
    }
  });

  async function handleSubmit(values: FormValueType)
  {
    setLoading(true);
    try
    {
      let blob: Blob;
      if (values.source === "url")
      {
        const response = await fetch(values.url);
        blob = await response.blob();
      }
      else
      {
        blob = await fileToBlob(values.file);
      }

      const _extension = extension ? await ExtensionsService.update({
        id: extension.manifest.id,
        body: blob
      }) : await ExtensionsService.install({ state: ExtensionState.Enabled, asUnpacked: false, body: blob });

      onSuccess(_extension);
    }
    catch (error)
    {
      const errorAsError = error as Error;
      ToastService.failureAndMessage(errorAsError, t(`${messagePrefix}.errorAdd`, { error: errorAsError.message }));
    }
    finally
    {
      setLoading(false);
    }
  }

  function renderDropzone()
  {
    const getIconStyle = (color) =>
    {
      return { width: 52, height: 52, color: `var(--mantine-color-${color})` };
    };

    const file = form.getValues().file;
    if (file)
    {
      return (
        <Flex mb="lg" align={"center"} justify="space-between">
          <Flex gap="5">
            <IconFileZip style={{ width: 24, height: 24 }} stroke={1.3}/>
            <Text>{file.name?.substring(0, 60)}</Text>
          </Flex>
          <ActionIcon
            variant="light"
            disabled={loading}
            color="red"
            onClick={() =>
            {
              setFileIsValid(false);
              form.setFieldValue("file", undefined);
            }}
          >
            <IconTrash stroke={1.2}/>
          </ActionIcon>
        </Flex>
      );
    }

    return (
      <Dropzone
        mb="lg"
        openRef={dropzoneRef}
        accept={[ mimeTypes.zip, mimeTypes.gzip, mimeTypes.tarGz ]}
        onDrop={(file) => form.setFieldValue("file", file[0])}
        onReject={() =>
          form.setFieldError(
            "files",
            t("fieldError.wrongFileFormat", {
              extensions: "ZIP, GZIP, or TAR.GZ"
            })
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
            <IconUpload style={getIconStyle("blue-6")} stroke={1.3}/>
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX style={getIconStyle("red-6")} stroke={1.3}/>
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFileZip style={getIconStyle("dimmed")} stroke={1.3}/>
          </Dropzone.Idle>

          <div>
            <Button variant="light" style={{ pointerEvents: "all" }}>
              {t("installExtensionModal.dropzone.select")}
            </Button>
            <Text size="sm" c="dimmed" inline mt={7}>
              {t("installExtensionModal.dropzone.dragAndDrop")}
            </Text>
          </div>
        </Flex>
      </Dropzone>
    );
  }

  const canSubmit = form.getValues().source === "url" ? true : fileIsValid;

  return (
    <>
      {extension && (
        <Alert mb="sm" color="orange" icon={<IconAlertTriangle/>}>
          <Trans
            i18nKey="updateExtensionModal.warning"
            components={{ strong: <b/> }}
            values={{ name: extension.manifest.id }}
          />
        </Alert>
      )}
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <SegmentedControl
          mb="lg"
          fullWidth
          value={form.getValues().source}
          onChange={(value: "file" | "url") =>
          {
            form.setFieldValue("source", value);
          }}
          data={[
            { label: t("installExtensionModal.sourceFile"), value: "file" },
            { label: t("installExtensionModal.sourceUrl"), value: "url" }
          ]}
        />

        {form.getValues().source === "file" ? (
          renderDropzone()
        ) : (
          <TextInput
            mb="lg"
            withAsterisk
            label={t("installExtensionModal.urlLabel")}
            placeholder={t("installExtensionModal.urlPlaceholder")}
            {...form.getInputProps("url")}
          />
        )}

        <Flex justify="flex-end">
          <Button
            loading={loading}
            disabled={loading || !canSubmit}
            type="submit"
          >
            {t(extension ? "button.update" : "button.install")}
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
    </>
  );
}
