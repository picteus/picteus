import React, { useEffect, useState } from "react";
import { Button, Flex, Stack, Table, Text, Title } from "@mantine/core";
import { IconFolderOpen, IconFolderSearch, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Repository } from "@picteus/ws-client";

import { useActionModalContext } from "app/context";
import { useRepositories } from "app/hooks";
import {
  Common,
  Container,
  Drawer,
  EmptyResults,
  EntityState,
  FormatedDate,
  NoValue,
  RefreshButton,
  StandardTable
} from "app/components";
import { AddOrUpdateRepository, RepositoryActions, RepositoryDetail, RepositoryTop } from "./components";


export default function RepositoriesScreen()
{
  const [ t ] = useTranslation();
  const { data: repositories = [], isLoading, isFetching, refetch } = useRepositories();
  const [ selectedRepository, setSelectedRepository ] = useState<Repository>();
  const [ , addModal ] = useActionModalContext();

  function nothing(): void
  {
  }

  function openAddOrUpdateRepositoryModal(repository?: Repository)
  {
    addModal({
      title: t(`addOrUpdateRepositoryModal.${repository ? "updateTitle" : "addTitle"}`),
      icon: { icon: <IconFolderOpen stroke={Common.IconStrokeSize}/> },
      size: "s",
      component: <AddOrUpdateRepository repository={repository} onSuccess={nothing}/>
    });
  }

  useEffect(() =>
  {
    if (selectedRepository)
    {
      const updated = repositories.find((repositoryItem) => repositoryItem.id === selectedRepository.id);
      if (updated && updated !== selectedRepository)
      {
        setSelectedRepository(updated);
      }
      else if (!updated)
      {
        setSelectedRepository(undefined);
      }
    }
  }, [ repositories, selectedRepository ]);

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
          <NoValue/>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="md"><FormatedDate timestamp={repository.creationDate}/></Text>
      </Table.Td>
      <Table.Td>
        <Text size="md"><FormatedDate timestamp={repository.modificationDate}/></Text>
      </Table.Td>
      <Table.Td>
        <EntityState type="repository" state={repository.state} size="md"/>
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

  function renderTable()
  {
    return (
      <StandardTable
        head={[ "field.name", "field.comment", "field.createdOn", "field.modifiedOn", "field.state", "" ]}
        loading={isLoading || isFetching}
        emptyResults={
          <EmptyResults
            icon={IconFolderSearch}
            description={t("emptyRepositories.description")}
            title={t("emptyRepositories.title")}
            buttonText={t("emptyRepositories.buttonText")}
            buttonAction={() => openAddOrUpdateRepositoryModal()}
          />
        }
      >
        {rows}
      </StandardTable>
    );
  }

  return (
    <Container>
      <Stack gap="lg" h="100%">
        <Flex justify="space-between" align="center">
          <Title>{t("repositoryScreen.title")}</Title>
          <Flex gap="sm" align="center">
            <Button
              leftSection={<IconPlus size={20}/>}
              onClick={() => openAddOrUpdateRepositoryModal()}
            >
              {t("button.add")}
            </Button>
            <RefreshButton onRefresh={() => void refetch()}/>
          </Flex>
        </Flex>
        {renderTable()}
      </Stack>
      <Drawer
        opened={selectedRepository !== undefined}
        onClose={() => setSelectedRepository(undefined)}
        title={
          selectedRepository && (
            <RepositoryTop
              repository={selectedRepository}
              onEdit={openAddOrUpdateRepositoryModal}
              onDeleted={nothing}
            />
          )
        }
      >
        {selectedRepository && (
          <RepositoryDetail repository={selectedRepository}/>
        )}
      </Drawer>
    </Container>
  );
}
