import { useTranslation } from "react-i18next";
import { Button, Flex, Stack, Table, Text, Title } from "@mantine/core";
import React, { useEffect, useState, useSyncExternalStore } from "react";

import { Repository } from "@picteus/ws-client";
import { IconFolderOpen, IconFolderSearch, IconPlus } from "@tabler/icons-react";

import { ChannelEnum } from "types";
import { useActionModalContext, useEventSocket } from "app/context";
import { RepositoriesService } from "app/services";
import {
  Container,
  Drawer,
  EmptyResults,
  EntityStatus,
  FormatedDate,
  NoValue,
  RefreshButton,
  StandardTable
} from "app/components";
import { AddOrUpdateRepository, RepositoryActions, RepositoryDetail, RepositoryTop } from "./components";

export default function RepositoriesScreen() {
  const [t] = useTranslation();
  const [repositories, setRepositories] = useState<Repository[]>(RepositoriesService.list());
  const [loading, setLoading] = useState<boolean>(false);
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const [selectedRepository, setSelectedRepository] = useState<Repository>();
  const [, addModal] = useActionModalContext();

  async function fetchAllRepositories() {
    setLoading(true);
    try {
      setRepositories(await RepositoriesService.fetchAll());
    }
    finally {
      setLoading(false);
    }
  }

  function nothing(){}

  function openAddOrUpdateRepositoryModal(repository?: Repository) {
    addModal({
      title: t(`addOrUpdateRepositoryModal.${repository ? "updateTitle" : "addTitle"}`),
      icon: { icon: <IconFolderOpen /> },
      size: "s",
      component: <AddOrUpdateRepository repository={repository} onSuccess={nothing} />,
    });
  }

  useEffect(() => {
    if (selectedRepository) {
      const updated = repositories.find((r) => r.id === selectedRepository.id);
      if (updated && updated !== selectedRepository) {
        setSelectedRepository(updated);
      } else if (!updated) {
        setSelectedRepository(undefined);
      }
    }
  }, [repositories, selectedRepository]);

  useEffect(() => {
    if (event?.channel.startsWith(ChannelEnum.REPOSITORY_PREFIX)) {
      void fetchAllRepositories();
    }
  }, [event]);

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
      <Table.Td>
        <RepositoryActions
          repository={repository}
          onEdit={openAddOrUpdateRepositoryModal}
          onDeleted={nothing}
        />
      </Table.Td>
    </Table.Tr>
  ));

  function renderTable() {
    return <StandardTable head={["field.name", "field.comment", "field.createdOn", "field.modifiedOn", "field.status", ""]}
                          loading={loading}
                          emptyResults={<EmptyResults
                            icon={<IconFolderSearch size={140} stroke={1} />}
                            description={t("emptyRepositories.description")}
                            title={t("emptyRepositories.title")}
                            buttonText={t("emptyRepositories.buttonText")}
                            buttonAction={() => openAddOrUpdateRepositoryModal()}
                          />}>
      {rows}
    </StandardTable>;
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
        {renderTable()}
      </Stack>
      <Drawer
        opened={selectedRepository !== undefined}
        onClose={() => setSelectedRepository(undefined)}
        title={selectedRepository && <RepositoryTop repository={selectedRepository}
                                                    onEdit={openAddOrUpdateRepositoryModal}
                                                    onDeleted={nothing} />}
      >
        {selectedRepository && (
          <RepositoryDetail repository={selectedRepository} />
        )}
      </Drawer>
    </Container>
  );
}
