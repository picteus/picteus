import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Button, Flex, LoadingOverlay, Stack, Table, Text, Title, Tooltip } from "@mantine/core";
import {
  IconAdjustmentsHorizontal,
  IconBox,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconPuzzle,
  IconReload,
  IconTrash,
  IconUpload
} from "@tabler/icons-react";

import { Extension, ExtensionStatus } from "@picteus/ws-client";

import { notifyApiCallI18nError, notifySuccess } from "utils";
import { useActionModalContext, useConfirmAction } from "app/context";
import { ExtensionsService } from "app/services";
import { Container, Drawer, EmptyResults, EntityStatus, ExtensionIcon, RefreshButton } from "app/components";
import { AddOrUpdateExtensionModal, ExtensionDetail, ExtensionSettingsModal } from "./components";

import variables from "assets/style/variablesExport.module.scss";


export default function ExtensionsScreen() {
  const [t] = useTranslation();
  const [extensions, setExtensions] = useState<Extension[]>(ExtensionsService.list());
  const confirmAction = useConfirmAction();
  const [, addModal] = useActionModalContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null);

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
    const extensions = (await ExtensionsService.fetchAll()).extensions;
    setExtensions(extensions);
    setLoading(false);
  }

  async function handleOnUninstallExtension(extensionId) {
    try {
      await ExtensionsService.uninstall({ id: extensionId });
      notifySuccess(t("extensionsScreen.successUninstall"));
      void fetchAllExtensions();
    } catch (error) {
      notifyApiCallI18nError(error, "extensionsScreen.errorUninstall");
    }
  }

  async function handleOnToggleExtensionStatus(extension: Extension) {
    try {
      await ExtensionsService.startOrStop({
        id: extension.manifest.id,
        isPause: extension.status === ExtensionStatus.Enabled,
      });
      void fetchAllExtensions();
    } catch (error) {
      notifyApiCallI18nError(error, "extensionsScreen.errorToggleStatus");
    }
  }

  async function handleOnSynchronize(extension: Extension) {
    try {
      await ExtensionsService.synchronize({
        id: extension.manifest.id,
      });
      notifySuccess(
        t("extensionsScreen.successSynchronize", {
          name: extension.manifest.name,
        }),
      );
    } catch (error) {
      notifyApiCallI18nError(error, "extensionsScreen.errorToggleStatus");
    }
  }

  function renderMenu(extension: Extension) {
    const iconSizeAndStroke = {
      size: 20,
      stroke: 1,
    };
    return (
      <Flex gap={10} justify="flex-end" onClick={(event) => event.stopPropagation()}>
        <Tooltip label={t("button.update")}>
          <ActionIcon
            size="md"
            variant="default"
            onClick={() => openAddOrUpdateExtensionModal(extension)}
          >
            <IconUpload {...iconSizeAndStroke} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t("button.synchronize")}>
          <ActionIcon
            size="md"
            variant="default"
            onClick={() => handleOnSynchronize(extension)}
            disabled={extension.status === ExtensionStatus.Paused}
          >
            <IconReload {...iconSizeAndStroke} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t("button.settings")}>
          <ActionIcon
            size="md"
            variant="default"
            onClick={() => openExtensionSettingsModal(extension)}
            disabled={extension.status === ExtensionStatus.Paused || extension.manifest.settings === undefined || extension.manifest.settings["properties"] === undefined}
          >
            <IconAdjustmentsHorizontal {...iconSizeAndStroke} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t(extension.status === ExtensionStatus.Paused ? "button.resume" : "button.pause")}>
          <ActionIcon
            size="md"
            variant="default"
            onClick={() => handleOnToggleExtensionStatus(extension)}
          >
            {extension.status === ExtensionStatus.Paused ? (
              <IconPlayerPlay {...iconSizeAndStroke} />
            ) : (
              <IconPlayerPause {...iconSizeAndStroke} />
            )}
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t("button.uninstall")}>
          <ActionIcon
            size="md"
            variant="default"
            onClick={() =>
              confirmAction(
                () => handleOnUninstallExtension(extension.manifest.id),
                {
                  title: t("extensionsScreen.confirmDeleteTitle"),
                  message: t("extensionsScreen.confirmDeleteMessage", {
                    name: extension.manifest.name,
                  }),
                },
              )
            }
          >
            <IconTrash color="red" {...iconSizeAndStroke} />
          </ActionIcon>
        </Tooltip>
      </Flex>
    );
  }

  const rows = extensions.map((extension: Extension) => (
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
      <Table.Td>{renderMenu(extension)}</Table.Td>
    </Table.Tr>
  ));

  function renderEmpty() {
    return (
      <EmptyResults
        icon={<IconPuzzle size={140} stroke={1} />}
        description={t("emptyExtensions.description")}
        title={t("emptyExtensions.title")}
        buttonText={t("emptyExtensions.buttonText")}
        buttonAction={openAddOrUpdateExtensionModal}
      />
    );
  }

  function render() {
    if (loading) {
      return (
        <LoadingOverlay visible zIndex={1000} overlayProps={{ blur: 3 }} />
      );
    }
    if (extensions.length) {
      return renderContent();
    }
    return renderEmpty();
  }

  function renderContent() {
    return (
      <Table.ScrollContainer minWidth={variables.tableMinimalWidth} pr={variables.contentPaddingHorizontal}
        mr={`-${variables.contentPaddingHorizontal}`}
      >
        <Table stickyHeader highlightOnHover striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={40}></Table.Th>
              <Table.Th>{t("field.id")}</Table.Th>
              <Table.Th>{t("field.version")}</Table.Th>
              <Table.Th>{t("field.name")}</Table.Th>
              <Table.Th>{t("field.description")}</Table.Th>
              <Table.Th>{t("field.status")}</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    );
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
        {render()}
      </Stack>
      <Drawer
        opened={!!selectedExtension}
        onClose={() => setSelectedExtension(null)}
        title={t("extensionDetail.title")}
        icon={selectedExtension ? { url: ExtensionsService.getIconURL(selectedExtension) } : undefined}
      >
        {selectedExtension && (
          <ExtensionDetail
            extension={selectedExtension}
            openAddOrUpdateExtensionModal={openAddOrUpdateExtensionModal}
          />
        )}
      </Drawer>
    </Container>
  );
}
