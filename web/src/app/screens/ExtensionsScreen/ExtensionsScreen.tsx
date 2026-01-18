import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Flex,
  LoadingOverlay,
  Stack,
  Table,
  Text,
  Title,
  Tooltip
} from "@mantine/core";
import {
  IconAdjustmentsHorizontal,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconPuzzle,
  IconReload,
  IconTrash,
  IconUpload
} from "@tabler/icons-react";
import { Extension, ExtensionStatus } from "@picteus/ws-client";
import { useDisclosure } from "@mantine/hooks";

import { notifyError, notifySuccess } from "utils";
import { Container, EmptyResults, RefreshButton } from "app/components";
import { ExtensionsService } from "app/services";
import { AddOrUpdateExtensionModal, ExtensionSettingsModal } from "./components";
import { useConfirmAction } from "app/context";
import { useSearchParams } from "react-router-dom";

export default function ExtensionsScreen() {
  const [t] = useTranslation();
  const [searchParams] = useSearchParams();
  const showSettingsExtensionId = searchParams.get("settings");
  const [extensions, setExtensions] = useState<Extension[]>(
    ExtensionsService.list(),
  );

  const confirmAction = useConfirmAction();
  const [extensionToUpdate, setExtensionToUpdate] = useState<Extension>();
  const [extensionToSetSettings, setExtensionToSetSettings] =
    useState<Extension>();
  const [loading, setLoading] = useState<boolean>(false);
  const [
    isAddOrUpdateExtensionModalOpen,
    {
      open: openAddOrUpdateExtensionModal,
      close: closeAddOrUpdateExtensionModal,
    },
  ] = useDisclosure(false);
  const [
    isExtensionSettingsModalOpen,
    { open: openExtensionSettingsModal, close: closeExtensionSettingsModal },
  ] = useDisclosure(false);

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
      const errorJson = await error.response.json();
      notifyError(
        t("extensionsScreen.errorUninstall", { error: errorJson?.message }),
      );
      console.error(
        "An error occured while trying to uninstall an extension",
        error,
      );
    }
  }

  useEffect(() => {
    if (extensions?.length && showSettingsExtensionId) {
      const extensionToSettings = extensions.find(
        (extension) => extension.manifest.id === showSettingsExtensionId,
      );
      setExtensionToSetSettings(extensionToSettings);
    }
  }, [extensions, showSettingsExtensionId]);

  useEffect(() => {
    if (extensionToUpdate) {
      openAddOrUpdateExtensionModal();
    }
  }, [extensionToUpdate]);

  useEffect(() => {
    if (extensionToSetSettings) {
      openExtensionSettingsModal();
    }
  }, [extensionToSetSettings]);

  async function handleOnToggleExtensionStatus(extension: Extension) {
    try {
      await ExtensionsService.startOrStop({
        id: extension.manifest.id,
        isPause: extension.status === ExtensionStatus.Enabled,
      });
      void fetchAllExtensions();
    } catch (error) {
      const errorJson = await error.response.json();
      notifyError(
        t("extensionsScreen.errorToggleStatus", { error: errorJson?.message }),
      );
      console.error(
        "An error occured while trying to toggle extension status",
        error,
      );
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
      const errorJson = await error.response.json();
      notifyError(
        t("extensionsScreen.errorToggleStatus", { error: errorJson?.message }),
      );
      console.error(
        "An error occured while trying to synchronize an extension",
        error,
      );
    }
  }

  function renderMenu(extension: Extension) {
    const iconSizeAndStroke = {
      size: 20,
      stroke: 1,
    };
    return (
      <Flex gap={10} justify="flex-end">
        <ActionIcon
          size="md"
          variant="default"
          onClick={() => setExtensionToUpdate(extension)}
        >
          <Tooltip label={t("button.update")} position="top-end" offset={10}>
            <IconUpload {...iconSizeAndStroke} />
          </Tooltip>
        </ActionIcon>

        <ActionIcon
          size="md"
          variant="default"
          onClick={() => handleOnSynchronize(extension)}
          disabled={extension.status === ExtensionStatus.Paused}
        >
          <Tooltip
            label={t("button.synchronize")}
            position="top-end"
            offset={10}
          >
            <IconReload {...iconSizeAndStroke} />
          </Tooltip>
        </ActionIcon>

        <ActionIcon
          size="md"
          variant="default"
          onClick={() => setExtensionToSetSettings(extension)}
        >
          <Tooltip label={t("button.settings")} position="top-end" offset={10}>
            <IconAdjustmentsHorizontal {...iconSizeAndStroke} />
          </Tooltip>
        </ActionIcon>

        <ActionIcon
          size="md"
          variant="default"
          onClick={() => handleOnToggleExtensionStatus(extension)}
        >
          <Tooltip
            label={t(
              extension.status === ExtensionStatus.Paused
                ? "button.resume"
                : "button.pause",
            )}
            position="top-end"
            offset={10}
          >
            {extension.status === ExtensionStatus.Paused ? (
              <IconPlayerPlay {...iconSizeAndStroke} />
            ) : (
              <IconPlayerPause {...iconSizeAndStroke} />
            )}
          </Tooltip>
        </ActionIcon>

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
          <Tooltip label={t("button.uninstall")} position="top-end" offset={10}>
            <IconTrash color="red" {...iconSizeAndStroke} />
          </Tooltip>
        </ActionIcon>
      </Flex>
    );
  }

  function renderStatus(status: ExtensionStatus) {
    if (status === ExtensionStatus.Paused) {
      return <Badge color="yellow">{status}</Badge>;
    }
    return <Badge color="green">{status}</Badge>;
  }

  const rows = extensions.map((extension: Extension) => (
    <Table.Tr key={"extensionTr-" + extension.manifest.id}>
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
        <Text size="md">{renderStatus(extension.status)}</Text>
      </Table.Td>
      <Table.Td>{renderMenu(extension)}</Table.Td>
    </Table.Tr>
  ));

  function handleOnCloseAddOrUpdateExtensionModal() {
    closeAddOrUpdateExtensionModal();
    setExtensionToUpdate(undefined);
  }

  async function handleOnSuccessExtensionAddedOrUpdated(extension: Extension) {
    handleOnCloseAddOrUpdateExtensionModal();
    setExtensionToSetSettings(extension);
    void fetchAllExtensions();
  }

  function handleOnCloseExtensionSettingsModal() {
    closeExtensionSettingsModal();
    setExtensionToSetSettings(undefined);
  }

  function handleOnSuccessExtensionSettingsModal() {
    handleOnCloseExtensionSettingsModal();
    void fetchAllExtensions();
  }

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
      <Card>
        <Table.ScrollContainer minWidth={500}>
          <Table>
            <Table.Thead>
              <Table.Tr>
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
      </Card>
    );
  }

  return (
    <Container>
      <AddOrUpdateExtensionModal
        extension={extensionToUpdate}
        opened={isAddOrUpdateExtensionModalOpen}
        onClose={handleOnCloseAddOrUpdateExtensionModal}
        onSuccess={handleOnSuccessExtensionAddedOrUpdated}
      />
      <ExtensionSettingsModal
        extension={extensionToSetSettings}
        opened={isExtensionSettingsModalOpen}
        onClose={handleOnCloseExtensionSettingsModal}
        onSuccess={handleOnSuccessExtensionSettingsModal}
      />
      <Stack gap="lg">
        <Flex justify="space-between" align="center">
          <Title>{t("extensionsScreen.title")}</Title>
          <Flex gap="sm" align="center">
            <Button
              leftSection={<IconPlus size={20} />}
              onClick={openAddOrUpdateExtensionModal}
            >
              {t("button.add")}
            </Button>
            <RefreshButton onRefresh={() => fetchAllExtensions()} />
          </Flex>
        </Flex>
        {render()}
      </Stack>
    </Container>
  );
}
