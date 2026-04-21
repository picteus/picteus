import { useTranslation } from "react-i18next";
import { ActionIcon, Button, Flex, LoadingOverlay, Stack, Table, Text, Title, Tooltip } from "@mantine/core";
import React, { useEffect, useState, useSyncExternalStore } from "react";

import { Repository } from "@picteus/ws-client";
import { IconEdit, IconFolderSearch, IconPlus, IconReload, IconTrash } from "@tabler/icons-react";

import { ChannelEnum } from "types";
import { notifyApiCallI18nError, notifySuccess } from "utils";
import { useActionModalContext, useConfirmAction, useEventSocket } from "app/context";
import { RepositoriesService } from "app/services";
import {
  Container,
  Drawer,
  EmptyResults,
  EntityStatus,
  ExternalLink,
  FormatedDate,
  NoValue,
  RefreshButton
} from "app/components";
import { AddOrUpdateRepositoryModal, RepositoryDetail } from "./components";


export default function RepositoriesScreen() {
  const [repositories, setRepositories] = useState<Repository[]>(RepositoriesService.list());
  const [loading, setLoading] = useState<boolean>(false);
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const confirmAction = useConfirmAction();
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);

  const [t] = useTranslation();

  const [, addModal] = useActionModalContext();

  function openAddOrUpdateRepositoryModal(repository?: Repository) {
    addModal({
      component: <AddOrUpdateRepositoryModal repository={repository} onSuccess={fetchAllRepositories} />,
      title: t(`addOrUpdateRepositoryModal.${repository ? "updateTitle" : "addTitle"}`),
      size: "l",
    });
  }

  async function fetchAllRepositories() {
    setLoading(true);
    setRepositories(await RepositoriesService.fetchAll());
    setLoading(false);
  }

  useEffect(() => {
    if (selectedRepository) {
      const updated = repositories.find((r) => r.id === selectedRepository.id);
      if (updated && updated !== selectedRepository) {
        setSelectedRepository(updated);
      } else if (!updated) {
        setSelectedRepository(null);
      }
    }
  }, [repositories, selectedRepository]);

  useEffect(() => {
    if (event?.rawData.channel.startsWith(ChannelEnum.REPOSITORY_SYNCHRONIZE_PREFIX)) {
      void fetchAllRepositories();
    }
  }, [event]);

  async function handleOnSynchronizeRepository(id: string) {
    await RepositoriesService.synchronize({ id });
  }

  async function handleOnDeleteRepository(id: string) {
    try {
      await RepositoriesService.remove({ id });
      notifySuccess(t("repositoryScreen.successRemove"));
      void fetchAllRepositories();
    } catch (error) {
      notifyApiCallI18nError(error, "repositoryScreen.errorRemove");
    }
  }

  function renderMenu(repository: Repository) {
    return (
      <Flex gap={10} onClick={(event) => event.stopPropagation()}>
        <ExternalLink url={repository.url} type="action" />
        <Tooltip label={t("button.edit")}>
          <ActionIcon
            size="md"
            variant="default"
            onClick={() => openAddOrUpdateRepositoryModal(repository)}
          >
              <IconEdit size={20} stroke={1} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t("button.synchronize")}>
          <ActionIcon
            size="md"
            variant="default"
            onClick={() => handleOnSynchronizeRepository(repository.id)}
          >
              <IconReload size={20} stroke={1} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t("button.delete")}>
          <ActionIcon
            size="md"
            variant="default"
            onClick={() =>
              confirmAction(() => handleOnDeleteRepository(repository.id), {
                title: t("repositoryScreen.confirmDeleteTitle"),
                message: t("repositoryScreen.confirmDeleteMessage", {
                  name: repository.name,
                }),
              })
            }
          >
              <IconTrash color="red" size={20} stroke={1} />
          </ActionIcon>
        </Tooltip>
      </Flex>
    );
  }

  const rows = repositories.map((repository: Repository) => (
    <Table.Tr
      key={repository.name}
      onClick={() => setSelectedRepository(repository)}
      style={{ cursor: "pointer" }}
    >
      <Table.Td>
        <Text size="md">{repository.name}</Text>
      </Table.Td>
      <Table.Td>
        {repository.comment ? (
           <Text size="md">{repository.comment}</Text>
        ) : (
          <NoValue />
        )}
      </Table.Td>
      <Table.Td>
        <Text size="md"><FormatedDate timestamp={repository.creationDate}/></Text>
      </Table.Td>
      <Table.Td>
        <Text size="md"><FormatedDate timestamp={repository.modificationDate}/></Text>
      </Table.Td>
      <Table.Td>
        <EntityStatus type="repository" status={repository.status} size="md" />
      </Table.Td>
      <Table.Td>{renderMenu(repository)}</Table.Td>
    </Table.Tr>
  ));

  function renderEmpty() {
    return (
      <EmptyResults
        icon={<IconFolderSearch size={140} stroke={1} />}
        description={t("emptyRepositories.description")}
        title={t("emptyRepositories.title")}
        buttonText={t("emptyRepositories.buttonText")}
        buttonAction={() => openAddOrUpdateRepositoryModal()}
      />
    );
  }

  function renderContent() {
    return (
      <Table.ScrollContainer minWidth={500}>
        <Table stickyHeader highlightOnHover striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("field.name")}</Table.Th>
              <Table.Th>{t("field.comment")}</Table.Th>
              <Table.Th style={{ minWidth: "110px" }}>
                {t("field.createdOn")}
              </Table.Th>
              <Table.Th style={{ minWidth: "110px" }}>
                {t("field.modifiedOn")}
              </Table.Th>
              <Table.Th>{t("field.status")}</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    );
  }

  function render() {
    if (loading) {
      return (
        <LoadingOverlay visible zIndex={1000} overlayProps={{ blur: 3 }} />
      );
    }
    if (repositories.length) {
      return renderContent();
    }
    return renderEmpty();
  }

  return (
    <Container>
      <Stack gap="lg" h="100%">
        <Flex justify="space-between" align="center">
          <Title>{t("repositoryScreen.title")}</Title>
          <Flex gap="sm" align="center">
            <Button
              leftSection={<IconPlus size={20} />}
              onClick={() => openAddOrUpdateRepositoryModal()}
            >
              {t("button.add")}
            </Button>
            <RefreshButton onRefresh={() => fetchAllRepositories()} />
          </Flex>
        </Flex>
        {render()}
      </Stack>
      <Drawer
        opened={!!selectedRepository}
        onClose={() => setSelectedRepository(null)}
        title={t("repositoryDetail.title")}
      >
        {selectedRepository && (
          <RepositoryDetail
            repository={selectedRepository}
            openAddOrUpdateRepositoryModal={openAddOrUpdateRepositoryModal}
          />
        )}
      </Drawer>
    </Container>
  );
}
