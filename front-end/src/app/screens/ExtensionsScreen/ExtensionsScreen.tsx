import React, { useMemo, useState } from "react";
import { ActionIcon, Button, Card, Flex, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { IconBox, IconLayoutGrid, IconList, IconPlus, IconPuzzle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Extension, ExtensionActivityKind } from "@picteus/ws-client";

import { useActionModalContext } from "app/context";
import { useExtensionActivities, useExtensions } from "app/hooks";
import { ExtensionsService } from "app/services";
import {
  Common,
  Container,
  Drawer,
  EmptyResults,
  EntityState,
  ExtensionIcon,
  RefreshButton,
  StandardTable
} from "app/components";
import {
  CreateExtensionModal,
  ExtensionActions,
  ExtensionActivity,
  ExtensionDetail,
  ExtensionSettingsModal,
  ExtensionTop,
  InstallOrUpdateExtension
} from "./components";


export default function ExtensionsScreen()
{
  const [ t ] = useTranslation();
  const { data: extensions = [], isLoading, isFetching, refetch: refetchExtensions } = useExtensions();
  const { data: rawActivities = [], refetch: refetchActivities } = useExtensionActivities();
  const [ , addModal ] = useActionModalContext();
  const [ selectedExtension, setSelectedExtension ] = useState<Extension>();
  const [ viewMode, setViewMode ] = useState<"table" | "card">("table");

  const extensionActivities = useMemo<Record<string, ExtensionActivityKind>>(() =>
  {
    return rawActivities.reduce((accumulator, activity) =>
    {
      accumulator[activity.id] = activity.kind;
      return accumulator;
    }, {} as Record<string, ExtensionActivityKind>);
  }, [ rawActivities ]);

  function refetchAll(): void
  {
    void refetchExtensions();
    void refetchActivities();
  }

  function openExtensionSettingsModal(extension: Extension)
  {
    addModal({
      title: t("extensionSettingsModal.title"),
      icon: { url: ExtensionsService.getIconURL(extension.manifest.id) },
      size: "s",
      component: (
        <ExtensionSettingsModal
          extension={extension}
          onSuccess={refetchAll}
        />
      )
    });
  }

  function openInstallOrUpdateExtensionModal(extension?: Extension)
  {
    addModal({
      title: t(`${extension ? "updateExtensionModal" : "installExtensionModal"}.title`),
      icon: extension ? { url: ExtensionsService.getIconURL(extension) } : {
        icon: <IconBox stroke={Common.IconStrokeSize}/>
      },
      size: "m",
      component: (
        <InstallOrUpdateExtension
          extension={extension}
          onSuccess={(extensionItem: Extension) =>
          {
            openExtensionSettingsModal(extensionItem);
            refetchAll();
          }}
        />
      )
    });
  }

  function openCreateExtensionModal()
  {
    addModal({
      title: t("createExtensionModal.title"),
      icon: {
        icon: <IconBox stroke={Common.IconStrokeSize}/>
      },
      size: "m",
      component: (
        <CreateExtensionModal
          onSuccess={setSelectedExtension}
        />
      )
    });
  }

  const rows = useMemo(() =>
    (Array.isArray(extensions) ? extensions : []).map((extension: Extension) => (
      <Table.Tr
        key={`extension-${extension.manifest.id}`}
        onClick={() => setSelectedExtension(extension)}
        style={{ cursor: "pointer" }}
      >
        <Table.Td w={40}>
          <ExtensionIcon idOrExtension={extension} size="sm"/>
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
          <Flex align="center" gap="xs">
            <EntityState type="extension" state={extension.state} size="md"/>
            {extensionActivities[extension.manifest.id] &&
              <ExtensionActivity kind={extensionActivities[extension.manifest.id]}/>}
          </Flex>
        </Table.Td>
        <Table.Td>
          <ExtensionActions
            extension={extension}
            onUpdate={openInstallOrUpdateExtensionModal}
            onSettings={openExtensionSettingsModal}
            onUninstalled={refetchAll}
          />
        </Table.Td>
      </Table.Tr>
    )), [ extensions, extensionActivities ]);

  function renderTable()
  {
    return (
      <StandardTable
        head={[ "", "field.id", "field.version", "field.name", "field.description", "field.state", "" ]}
        loading={isLoading || isFetching}
        emptyResults={
          <EmptyResults
            icon={IconPuzzle}
            description={t("emptyExtensions.description")}
            title={t("emptyExtensions.title")}
            buttonText={t("emptyExtensions.buttonText")}
            buttonAction={() => openInstallOrUpdateExtensionModal()}
          />
        }
      >
        {rows}
      </StandardTable>
    );
  }

  function renderCard()
  {
    if (!isLoading && extensions.length === 0)
    {
      return (
        <EmptyResults
          icon={IconPuzzle}
          description={t("emptyExtensions.description")}
          title={t("emptyExtensions.title")}
          buttonText={t("emptyExtensions.buttonText")}
          buttonAction={() => openInstallOrUpdateExtensionModal()}
        />
      );
    }

    return (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
        {extensions.map((extension) => (
          <Card key={extension.manifest.id} shadow="sm" padding="lg" radius="md" withBorder>
            <ExtensionTop
              extension={extension}
              activityKind={extensionActivities[extension.manifest.id]}
              openAddOrUpdateExtensionModal={openInstallOrUpdateExtensionModal}
              openExtensionSettingsModal={openExtensionSettingsModal}
              onUninstalled={refetchAll}
            />
          </Card>
        ))}
      </SimpleGrid>
    );
  }

  const showModes = false;

  return (
    <Container>
      <Stack gap="lg" h="100%">
        <Flex justify="space-between" align="center">
          <Title>{t("extensionsScreen.title")}</Title>
          <Flex gap="sm" align="center">
            {showModes && (
              <ActionIcon.Group>
                <ActionIcon
                  variant={viewMode === "table" ? "filled" : "default"}
                  size="lg"
                  onClick={() => setViewMode("table")}
                >
                  <IconList size={20}/>
                </ActionIcon>
                <ActionIcon
                  variant={viewMode === "card" ? "filled" : "default"}
                  size="lg"
                  onClick={() => setViewMode("card")}
                >
                  <IconLayoutGrid size={20}/>
                </ActionIcon>
              </ActionIcon.Group>
            )}
            <Button
              leftSection={<IconPlus size={20}/>}
              onClick={() => openInstallOrUpdateExtensionModal()}
            >
              {t("button.install")}
            </Button>
            <Button
              leftSection={<IconPlus size={20}/>}
              onClick={() => openCreateExtensionModal()}
            >
              {t("button.create")}
            </Button>
            <RefreshButton onRefresh={() => refetchAll()}/>
          </Flex>
        </Flex>
        {viewMode === "table" ? renderTable() : renderCard()}
      </Stack>
      <Drawer
        opened={selectedExtension !== undefined}
        onClose={() => setSelectedExtension(undefined)}
        title={
          selectedExtension && (
            <ExtensionTop
              extension={selectedExtension}
              activityKind={extensionActivities[selectedExtension.manifest.id]}
              openAddOrUpdateExtensionModal={openInstallOrUpdateExtensionModal}
              openExtensionSettingsModal={openExtensionSettingsModal}
              onUninstalled={() =>
              {
                setSelectedExtension(undefined);
                refetchAll();
              }}
            />
          )
        }
        size="xl"
      >
        {selectedExtension && <ExtensionDetail extension={selectedExtension}/>}
      </Drawer>
    </Container>
  );
}
