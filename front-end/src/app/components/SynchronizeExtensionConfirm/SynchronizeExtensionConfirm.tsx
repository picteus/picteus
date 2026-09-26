import React, { type ReactElement, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Flex, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { Extension, ManifestCapability, SearchParameters } from "@picteus/ws-client";

import { ExtensionsService } from "app/services";
import { ExtensionCapability, ImagesCollection } from "app/components";


type SynchronizeExtensionConfirmPropsType = {
  extension: Extension;
  onConfirm: () => void;
};

const searchParameters: SearchParameters =
  {
    filter: {}
  };

export default function SynchronizeExtensionConfirm({
  extension,
  onConfirm
}: SynchronizeExtensionConfirmPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const capabilities = useMemo((): ManifestCapability[] =>
  {
    return ExtensionsService.computeCapabilities(extension);
  }, [ extension ]);

  return (
    <Stack gap="md">
      <Alert icon={<IconAlertTriangle/>} color="orange">
        {t("synchronizeExtensionModal.explanation", { name: extension.manifest.name })}
      </Alert>

      <ImagesCollection
        searchParameters={searchParameters}
        explanation={t("synchronizeExtensionModal.collectionExplanation")}
      />

      <Stack gap="xs">
        <Text size="sm" c="dimmed">{t("synchronizeExtensionModal.facets")}</Text>
        <Flex align="center" gap="xs" wrap="wrap">
          {capabilities.map((capability) => (
            <ExtensionCapability key={capability.id} capability={capability}/>
          ))}
        </Flex>
      </Stack>

      <Flex justify="flex-end" gap="md">
        <Button onClick={onConfirm}>
          {t("button.synchronize")}
        </Button>
      </Flex>
    </Stack>
  );
}
