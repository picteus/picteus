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
  Tooltip,
} from "@mantine/core";
import React, { useEffect, useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import { Repository, RepositoryStatus } from "@picteus/ws-client";
import {
  IconFolderSearch,
  IconPlus,
  IconReload,
  IconTrash,
} from "@tabler/icons-react";

import { formatDate, notifyError, notifySuccess } from "utils";
import { RepositoriesService } from "app/services";
import { AddRepositoryModal } from "./components";
import {
  Container,
  EmptyResults,
  ExternalLink,
  Loader,
  RefreshButton,
} from "app/components";
import { useConfirmAction, useEventSocket } from "app/context";

export default function RepositoriesScreen() {
  const [repositories, setRepositories] = useState<Repository[]>(
    RepositoriesService.list(),
  );
  const [loading, setLoading] = useState<boolean>(false);
  const socketNotification = useEventSocket();
  const confirmAction = useConfirmAction();

  const [t] = useTranslation();

  const [
    isAddRepositoryModalOpen,
    { open: openAddRepositoryModal, close: closeAddRepositoryModal },
  ] = useDisclosure(false);

  async function fetchAllRepositories() {
    setLoading(true);
    setRepositories(await RepositoriesService.fetchAll());
    setLoading(false);
  }

  function renderStatus(status: RepositoryStatus) {
    if (status === RepositoryStatus.Indexing) {
      return (
        <Badge color="yellow" leftSection={<Loader />}>
          {status}
        </Badge>
      );
    }
    return <Badge color="green">{status}</Badge>;
  }

  useEffect(() => {
    if (
      socketNotification?.rawData.channel.startsWith("repository.synchronize")
    ) {
      void fetchAllRepositories();
    }
  }, [socketNotification]);

  async function handleOnSynchronizeRepository(id: string) {
    await RepositoriesService.synchronize({ id });
  }

  async function handleOnDeleteRepository(id: string) {
    try {
      await RepositoriesService.remove({ id });
      notifySuccess(t("repositoryScreen.successRemove"));
      void fetchAllRepositories();
    } catch (error) {
      const errorJson = await error.response.json();
      notifyError(
        t("repositoryScreen.errorRemove", { error: errorJson?.message }),
      );
      console.error(
        "An error occured while trying to remove a repository",
        error,
      );
    }
  }

  function renderMenu(repository: Repository) {
    return (
      <Flex gap={10}>
        <ActionIcon
          size="md"
          variant="default"
          onClick={() => handleOnSynchronizeRepository(repository.id)}
        >
          <Tooltip
            label={t("button.synchronize")}
            position="top-end"
            offset={10}
          >
            <IconReload size={20} stroke={1} />
          </Tooltip>
        </ActionIcon>
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
          <Tooltip label={t("button.delete")} position="top-end" offset={10}>
            <IconTrash color="red" size={20} stroke={1} />
          </Tooltip>
        </ActionIcon>
      </Flex>
    );
  }

  const rows = repositories.map((repository: Repository) => (
    <Table.Tr key={repository.name}>
      <Table.Td>
        <Text size="md">{repository.name}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="md">{renderStatus(repository.status)}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="md">
          <ExternalLink label={repository.url} url={repository.url} />
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="md">{formatDate(repository.creationDate)}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="md">{formatDate(repository.modificationDate)}</Text>
      </Table.Td>
      <Table.Td>{renderMenu(repository)}</Table.Td>
    </Table.Tr>
  ));

  function handleOnSuccessRepositoryAdded() {
    closeAddRepositoryModal();
    void fetchAllRepositories();
  }

  function renderEmpty() {
    return (
      <EmptyResults
        icon={<IconFolderSearch size={140} stroke={1} />}
        description={t("emptyRepositories.description")}
        title={t("emptyRepositories.title")}
        buttonText={t("emptyRepositories.buttonText")}
        buttonAction={openAddRepositoryModal}
      />
    );
  }

  function renderContent() {
    return (
      <Card>
        <Table.ScrollContainer minWidth={500}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("field.name")}</Table.Th>
                <Table.Th>{t("field.status")}</Table.Th>
                <Table.Th>{t("field.url")}</Table.Th>
                <Table.Th style={{ minWidth: "110px" }}>
                  {t("field.createdOn")}
                </Table.Th>
                <Table.Th style={{ minWidth: "110px" }}>
                  {t("field.modifiedOn")}
                </Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
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
      <AddRepositoryModal
        opened={isAddRepositoryModalOpen}
        onClose={closeAddRepositoryModal}
        onSuccess={handleOnSuccessRepositoryAdded}
      />
      <Stack gap="lg">
        <Flex justify="space-between" align="center">
          <Title>{t("repositoryScreen.title")}</Title>
          <Flex gap="sm" align="center">
            <Button
              leftSection={<IconPlus size={20} />}
              onClick={openAddRepositoryModal}
            >
              {t("button.add")}
            </Button>
            <RefreshButton onRefresh={() => fetchAllRepositories()} />
          </Flex>
        </Flex>
        {render()}
      </Stack>
    </Container>
  );
}
