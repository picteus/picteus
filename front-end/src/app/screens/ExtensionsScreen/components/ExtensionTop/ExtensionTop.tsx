import React from "react";
import { Flex, Image, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IconBox } from "@tabler/icons-react";

import { Extension } from "@picteus/ws-client";

import { ExtensionsService } from "app/services";
import { Common, ContentTitle, CopyText, EntityStatus, FieldValue, NoValue } from "app/components";
import { ExtensionActions } from "../index.ts";


type ExtensionTopType = {
  extension: Extension;
  openAddOrUpdateExtensionModal: (extension: Extension) => void;
  openExtensionSettingsModal: (extension: Extension) => void;
  onUninstalled: () => void;
};

export default function ExtensionTop({ extension, openAddOrUpdateExtensionModal, openExtensionSettingsModal, onUninstalled }: ExtensionTopType) {
  const { t } = useTranslation();
  const iconEdge = 32;

  return (<>
      <ContentTitle text={extension.manifest.name} icon={{ icon: <IconBox stroke={Common.IconStrokeSize} /> }} />
      <Stack gap="md" pos="relative">
        <FieldValue name={t("field.id")} value={<CopyText value={extension.manifest.id} inline={true}>
          <Text size="xs" c="dimmed">{extension.manifest.id}</Text>
        </CopyText>} />
        <FieldValue name={t("field.icon")} value={<Image src={ExtensionsService.getIconURL(extension)} h={iconEdge} w={iconEdge} />} />
        <FieldValue name={t("field.version")} value={<Text size="md">{extension.manifest.version}</Text>} />
        <FieldValue name={t("field.description")}
                    value={extension.manifest.description ? <Text>{extension.manifest.description}</Text> :
                      <NoValue />} />
        <FieldValue name={t("field.status")}
                    value={<EntityStatus type="extension" status={extension.status} size="sm" />} />
        <Flex gap="sm" mt="lg">
          <ExtensionActions
            extension={extension}
            onUpdate={openAddOrUpdateExtensionModal}
            onSettings={openExtensionSettingsModal}
            onUninstalled={onUninstalled}
          />
        </Flex>
      </Stack>
    </>
  );
}
