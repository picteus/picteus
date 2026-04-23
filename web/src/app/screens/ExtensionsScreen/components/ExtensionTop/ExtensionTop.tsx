import React from "react";
import { Button, Flex, Stack, Text } from "@mantine/core";
import { IconAdjustmentsHorizontal, IconUpload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Extension, ExtensionStatus } from "@picteus/ws-client";

import { ExtensionsService } from "app/services";
import { ContentTitle, CopyText, EntityStatus, FieldValue, NoValue } from "app/components";


type ExtensionTopType = {
  extension: Extension;
  openAddOrUpdateExtensionModal: (extension: Extension) => void;
  openExtensionSettingsModal: (extension: Extension) => void;
};

export default function ExtensionTop({ extension, openAddOrUpdateExtensionModal, openExtensionSettingsModal }: ExtensionTopType) {
  const { t } = useTranslation();

  return (<>
      <ContentTitle text={t("extensionDetail.title")}
                    icon={{ url: ExtensionsService.getIconURL(extension) }} />
      <Stack gap="md" pos="relative">
        <FieldValue name={t("field.id")} value={<CopyText size="xs" c="dimmed" text={extension.manifest.id} />} />
        <FieldValue name={t("field.name")} value={<Text size="lg" fw={500}>{extension.manifest.name}</Text>} />
        <FieldValue name={t("field.version")} value={<Text size="md">{extension.manifest.version}</Text>} />
        <FieldValue name={t("field.description")}
                    value={extension.manifest.description ? <Text>{extension.manifest.description}</Text> :
                      <NoValue />} />
        <FieldValue name={t("field.status")}
                    value={<EntityStatus type="extension" status={extension.status} size="sm" />} />
        <Flex gap="sm" mt="lg">
          <Button
            leftSection={<IconUpload size={16} />}
            onClick={() => {
              openAddOrUpdateExtensionModal(extension);
            }}
            variant="default"
          >
            {t("button.update")}
          </Button>
          <Button
            leftSection={<IconAdjustmentsHorizontal size={16} />}
            onClick={() => {
              openExtensionSettingsModal(extension);
            }}
            variant="default"
            disabled={extension.status === ExtensionStatus.Paused || extension.manifest.settings === undefined || extension.manifest.settings["properties"] === undefined}
          >
            {t("button.settings")}
          </Button>
        </Flex>
      </Stack>
    </>
  );
}
