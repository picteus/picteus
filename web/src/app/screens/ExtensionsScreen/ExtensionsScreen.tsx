import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Flex, Stack, Table, Text, Title } from "@mantine/core";
import { IconBox, IconPlus, IconPuzzle } from "@tabler/icons-react";

import { Extension } from "@picteus/ws-client";

import { useActionModalContext } from "app/context";
import { ExtensionsService } from "app/services";
import {
  Container,
  Drawer,
  EmptyResults,
  EntityStatus,
  ExtensionIcon,
  RefreshButton,
  StandardTable
} from "app/components";
import {
  AddOrUpdateExtensionModal,
  ExtensionActions,
  ExtensionDetail,
  ExtensionSettingsModal,
  ExtensionTop
} from "./components";


export default function ExtensionsScreen() {
  const [t] = useTranslation();
  const [extensions, setExtensions] = useState<Extension[]>(ExtensionsService.list());
  const [, addModal] = useActionModalContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedExtension, setSelectedExtension] = useState<Extension>();

  useEffect(() => {
    if (selectedExtension) {
      setSelectedExtension(extensions.find((extension) => extension.manifest.id === selectedExtension.manifest.id));
    }
  }, [extensions]);

  function openExtensionSettingsModal(extension: Extension) {
    addModal({
      title: t("extensionSettingsModal.title"),
      icon: { url: ExtensionsService.getIconURL(extension.manifest.id) },
      size: "m",
      component: (
        <ExtensionSettingsModal
          extension={extension}
          onSuccess={fetchAllExtensions}
        />
      ),
    });
  }

  function openAddOrUpdateExtensionModal(extension?: Extension) {
    addModal({
      title: t(`${extension ? "updateExtensionModal" : "addExtensionModal"}.title`),
      icon: extension ? { url: ExtensionsService.getIconURL(extension) } : {
        icon: <IconBox />
      },
      size: "m",
      component: (
        <AddOrUpdateExtensionModal
          extension={extension}
          onSuccess={(extension: Extension) => {
            openExtensionSettingsModal(extension);
            void fetchAllExtensions();
          }}
        />
      ),
    });
  }

  async function fetchAllExtensions() {
    setLoading(true);
    setExtensions((await ExtensionsService.fetchAll()).extensions);
    setLoading(false);
  }

  const rows = useMemo(()=>
    extensions.map((extension: Extension) => (
      <Table.Tr
        key={`extension-${extension.manifest.id}`}
        onClick={() => setSelectedExtension(extension)}
        style={{ cursor: "pointer" }}
      >
        <Table.Td w={40}>
          <ExtensionIcon idOrExtension={extension} size="sm" />
        </Table.Td>
        <Table.Td>
          <Text size="md">{extension.manifest.id}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="md">{extension.manifest.version}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="md">{extension.manifest.name}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="md">{extension.manifest.description}</Text>
        </Table.Td>
        <Table.Td>
          <EntityStatus type="extension" status={extension.status} size="md" />
        </Table.Td>
        <Table.Td>
          <ExtensionActions
            extension={extension}
            onUpdate={openAddOrUpdateExtensionModal}
            onSettings={openExtensionSettingsModal}
            onUninstalled={fetchAllExtensions}
          />
        </Table.Td>
      </Table.Tr>
    )), [extensions]);

  function renderTable() {
    return <StandardTable head={["", "field.id", "field.version", "field.name", "field.description", "field.status", ""]}
                          loading={loading}
                          emptyResults={<EmptyResults
                            icon={<IconPuzzle size={140} stroke={1} />}
                            description={t("emptyExtensions.description")}
                            title={t("emptyExtensions.title")}
                            buttonText={t("emptyExtensions.buttonText")}
                            buttonAction={() => openAddOrUpdateExtensionModal()}
                          />}>
      {rows}
    </StandardTable>;
  }

  return (
    <Container>
      <Stack gap="lg" h="100%">
        <Flex justify="space-between" align="center">
          <Title>{t("extensionsScreen.title")}</Title>
          <Flex gap="sm" align="center">
            <Button
              leftSection={<IconPlus size={20} />}
              onClick={() => openAddOrUpdateExtensionModal()}
            >
              {t("button.add")}
            </Button>
            <RefreshButton onRefresh={() => fetchAllExtensions()} />
          </Flex>
        </Flex>
        {renderTable()}
      </Stack>
      <Drawer
        opened={selectedExtension !== undefined}
        onClose={() => setSelectedExtension(undefined)}
        title={selectedExtension &&
          <ExtensionTop extension={selectedExtension} openAddOrUpdateExtensionModal={openAddOrUpdateExtensionModal}
                        openExtensionSettingsModal={openExtensionSettingsModal} onUninstalled={fetchAllExtensions} />}
      >
        {selectedExtension && <ExtensionDetail extension={selectedExtension} />}
      </Drawer>
    </Container>
  );
}
