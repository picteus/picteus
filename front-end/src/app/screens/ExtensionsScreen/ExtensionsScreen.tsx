import React, { useEffect, useMemo, useState } from "react";
import { ActionIcon, Badge, Button, Card, Flex, SimpleGrid, Stack, Table, Text, Title, Tooltip } from "@mantine/core";
import { IconBox, IconCirclePlus, IconLayoutGrid, IconList, IconPlus, IconPuzzle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Extension, ExtensionActivity as ApiExtensionActivity, ExtensionState, Manifest } from "@picteus/ws-client";

import { useActionModalContext } from "app/context";
import {
  useExtensionActivities,
  useExtensions,
  useInstallMarketplaceExtensionMutation,
  useMarketplaceExtensions
} from "app/hooks";
import { ExtensionsService } from "app/services";
import { ToastService } from "utils";
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
  ExtensionConfiguration,
  ExtensionDetail,
  ExtensionTop,
  InstallOrUpdateExtension
} from "./components";


export default function ExtensionsScreen()
{
  const [ t ] = useTranslation();
  const { data: extensions = [], isLoading, isFetching, refetch: refetchExtensions } = useExtensions();
  const {
    data: marketplaceExtensions = [],
    isLoading: isMarketplaceLoading,
    isFetching: isMarketplaceFetching,
    isError: isMarketplaceError,
    error: marketplaceError,
    refetch: refetchMarketplace
  } = useMarketplaceExtensions();
  const { data: activities = [], refetch: refetchActivities } = useExtensionActivities();
  const installMarketplaceExtensionMutation = useInstallMarketplaceExtensionMutation();
  const { addModal } = useActionModalContext();
  const [ selectedExtension, setSelectedExtension ] = useState<Extension>();
  const [ viewMode, setViewMode ] = useState<"table" | "card">("table");

  useEffect(() =>
  {
    if (marketplaceError)
    {
      ToastService.failureAndMessage(marketplaceError, t("extensionsScreen.errorLoading"));
    }
  }, [ marketplaceError, t ]);

  const perExtensionIdActivities = useMemo<Record<string, ApiExtensionActivity>>(() =>
  {
    return activities.reduce((accumulator, activity) =>
    {
      accumulator[activity.id] = activity;
      return accumulator;
    }, {});
  }, [ activities ]);

  function refetchAll(): void
  {
    void refetchExtensions();
    void refetchMarketplace();
    void refetchActivities();
  }

  async function installMarketplaceExtension(manifest: Manifest): Promise<void>
  {
    try
    {
      await installMarketplaceExtensionMutation.mutateAsync({ id: manifest.id, state: ExtensionState.Enabled });
      ToastService.success(t("extensionsScreen.successInstall"));
    }
    catch (error)
    {
      ToastService.apiCallI18nError(error, "extensionsScreen.errorInstall");
    }
  }

  function openExtensionConfiguration(extension: Extension)
  {
    const instructionCapabilities = ExtensionsService.computeInstructionCapabilities(extension);
    addModal({
      title: t("extensionConfiguration.title"),
      icon: { url: ExtensionsService.getIconURL(extension.manifest.id) },
      size: instructionCapabilities.hasAnyInstructionCapability ? "m" : "s",
      body: (
        <ExtensionConfiguration
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
      body: (
        <InstallOrUpdateExtension
          extension={extension}
          onSuccess={(extensionItem: Extension) =>
          {
            openExtensionConfiguration(extensionItem);
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
      body: (
        <CreateExtensionModal
          onSuccess={setSelectedExtension}
        />
      )
    });
  }

  const rows = useMemo(() =>
  {
    const installedExtensionsById = new Map(extensions.map(extension => [ extension.manifest.id, extension ]));
    const marketplaceExtensionsById = new Map((isMarketplaceError ? [] : marketplaceExtensions).map(marketplaceExtension => [ marketplaceExtension.manifest.id, marketplaceExtension ]));
    const allManifestsById = new Map<string, Manifest>();
    for (const extension of extensions)
    {
      allManifestsById.set(extension.manifest.id, extension.manifest);
    }
    for (const marketplaceExtension of isMarketplaceError ? [] : marketplaceExtensions)
    {
      if (!allManifestsById.has(marketplaceExtension.manifest.id))
      {
        allManifestsById.set(marketplaceExtension.manifest.id, marketplaceExtension.manifest);
      }
    }

    const manifests = [ ...allManifestsById.values() ].sort((firstManifest, secondManifest) => firstManifest.name.localeCompare(secondManifest.name));

    return manifests.map(manifest =>
    {
      const extension = installedExtensionsById.get(manifest.id);
      const marketplaceExtension = marketplaceExtensionsById.get(manifest.id);
      const isInstalled = extension !== undefined;

      return (
        <Table.Tr
          key={`${isInstalled ? "extension" : "marketplace-extension"}-${manifest.id}`}
          onClick={extension ? () => setSelectedExtension(extension) : undefined}
          style={isInstalled ? { cursor: "pointer" } : undefined}
        >
          <Table.Td w={40}>
            <ExtensionIcon idOrExtension={extension ?? marketplaceExtension ?? manifest.id} size="xs"/>
          </Table.Td>
          <Table.Td><Text size="md">{manifest.id}</Text></Table.Td>
          <Table.Td><Text size="md">{manifest.version}</Text></Table.Td>
          <Table.Td><Text size="md">{manifest.name}</Text></Table.Td>
          <Table.Td><Text size="md">{manifest.description}</Text></Table.Td>
          <Table.Td>
            {extension ? (
              <Flex align="center" gap="xs">
                <EntityState type="extension" state={extension.state} size="md"/>
                {perExtensionIdActivities[manifest.id] &&
                  <ExtensionActivity activity={perExtensionIdActivities[manifest.id]}/>}
              </Flex>
            ) : (
              <Badge variant="light" color="blue">
                {t("extensionsScreen.notInstalled")}
              </Badge>
            )}
          </Table.Td>
          <Table.Td>
            {extension ? (
              <ExtensionActions
                extension={extension}
                onUpdate={openInstallOrUpdateExtensionModal}
                onConfiguration={openExtensionConfiguration}
                onUninstalled={refetchAll}
              />
            ) : (
              <Flex justify="flex-end">
                <Flex w={180} justify="flex-start">
                  <Tooltip label={t("button.install")} position="top" withArrow>
                    <ActionIcon
                      size="md"
                      variant="default"
                      disabled={installMarketplaceExtensionMutation.isPending}
                      loading={installMarketplaceExtensionMutation.isPending && installMarketplaceExtensionMutation.variables?.id === manifest.id}
                      onClick={() => void installMarketplaceExtension(manifest)}
                    >
                      <IconCirclePlus size={20} stroke={1}/>
                    </ActionIcon>
                  </Tooltip>
                </Flex>
              </Flex>
            )}
          </Table.Td>
        </Table.Tr>
      );
    });
  }, [
    extensions,
    installMarketplaceExtensionMutation.isPending,
    installMarketplaceExtensionMutation.variables,
    isMarketplaceError,
    marketplaceExtensions,
    perExtensionIdActivities,
    t
  ]);

  function renderTable()
  {
    return (
      <StandardTable
        head={[ "", "field.id", "field.version", "field.name", "field.description", "field.state", "" ]}
        loading={isLoading || isFetching || isMarketplaceLoading || isMarketplaceFetching}
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
              activity={perExtensionIdActivities[extension.manifest.id]}
              openAddOrUpdateExtensionModal={openInstallOrUpdateExtensionModal}
              openExtensionConfiguration={openExtensionConfiguration}
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
              activity={perExtensionIdActivities[selectedExtension.manifest.id]}
              openAddOrUpdateExtensionModal={openInstallOrUpdateExtensionModal}
              openExtensionConfiguration={openExtensionConfiguration}
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
