import React from "react";
import { Button, Flex, Stack, Text } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Extension } from "@picteus/ws-client";

import { CopyText, EntityStatus, FieldValue, NoValue } from "app/components";

type ExtensionDetailProps = {
  extension: Extension;
  openAddOrUpdateExtensionModal: (extension: Extension) => void;
};

export default function ExtensionDetail({ extension, openAddOrUpdateExtensionModal }: ExtensionDetailProps) {
  const [t] = useTranslation();

  return (
    <Stack gap="md" pos="relative">
      <FieldValue name={t("field.id")} value={<CopyText size="xs" c="dimmed" text={extension.manifest.id} />}/>
      <FieldValue name={t("field.name")} value={<Text size="lg" fw={500}>{extension.manifest.name}</Text>}/>
      <FieldValue name={t("field.version")} value={<Text size="md">{extension.manifest.version}</Text>}/>
      <FieldValue name={t("field.description")}
                  value={extension.manifest.description ? <Text>{extension.manifest.description}</Text> : <NoValue />}/>
      <FieldValue name={t("field.status")} value={<EntityStatus type="extension" status={extension.status} size="sm" />}/>

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
      </Flex>
    </Stack>
  );
}
