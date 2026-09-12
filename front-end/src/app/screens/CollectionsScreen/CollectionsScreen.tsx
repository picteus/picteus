import React, { useEffect, useState } from "react";
import { Button, Flex, Stack, Table, Text, Title } from "@mantine/core";
import { IconLibrary, IconListSearch, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Collection } from "@picteus/ws-client";

import { useActionModalContext } from "app/context";
import { useCollections } from "app/hooks";
import {
  CollectionIcon,
  Common,
  Container,
  Drawer,
  EmptyResults,
  FormatedDate,
  NoValue,
  RefreshButton,
  StandardTable
} from "app/components";
import { AddOrUpdateCollection, CollectionActions, CollectionDetail, CollectionTop } from "./components";


export default function CollectionsScreen()
{
  const { data: collections = [], isLoading, isFetching, refetch } = useCollections();
  const [ selectedCollection, setSelectedCollection ] = useState<Collection>();
  const [ t ] = useTranslation();
  const [ , addModal ] = useActionModalContext();

  useEffect(() =>
  {
    if (selectedCollection)
    {
      const updatedCollection = collections.find((collectionItem) => collectionItem.id === selectedCollection.id);
      if (updatedCollection && updatedCollection !== selectedCollection)
      {
        setSelectedCollection(updatedCollection);
      }
      else if (!updatedCollection)
      {
        setSelectedCollection(undefined);
      }
    }
  }, [ collections, selectedCollection ]);

  const showAddButton = false;

  function nothing(): void
  {
  }

  function openAddOrUpdateCollectionModal(collection?: Collection)
  {
    addModal({
      title: t(`addOrUpdateCollectionModal.${collection ? "updateTitle" : "addTitle"}`),
      icon: { icon: <IconLibrary stroke={Common.IconStrokeSize}/> },
      size: "s",
      component: <AddOrUpdateCollection collection={collection} onSuccess={nothing}/>
    });
  }

  const rows = collections.map((collection: Collection) => (
    <Table.Tr
      key={collection.id}
      onClick={() => setSelectedCollection(collection)}
      style={{ cursor: "pointer" }}
    >
      <Table.Td>
        <CollectionIcon collection={collection}/>
      </Table.Td>
      <Table.Td>
        <Text size="md">{collection.name}</Text>
      </Table.Td>
      <Table.Td>
        {collection.comment ? <Text size="md">{collection.comment}</Text> : <NoValue/>}
      </Table.Td>
      <Table.Td>
        <Text size="md"><FormatedDate timestamp={collection.creationDate}/></Text>
      </Table.Td>
      <Table.Td>
        <Text size="md"><FormatedDate timestamp={collection.modificationDate}/></Text>
      </Table.Td>
      <Table.Td>
        <CollectionActions
          collection={collection}
          onEdit={openAddOrUpdateCollectionModal}
          onDeleted={nothing}
        />
      </Table.Td>
    </Table.Tr>
  ));

  function renderTable()
  {
    return (
      <StandardTable
        head={[ "", "field.name", "field.comment", "field.createdOn", "field.modifiedOn", "" ]}
        loading={isLoading || isFetching}
        emptyResults={
          <EmptyResults
            icon={IconListSearch}
            description={t("emptyCollections.description")}
            title={t("emptyCollections.title")}
            buttonText={t("emptyCollections.buttonText")}
            buttonAction={() => openAddOrUpdateCollectionModal()}
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
          <Title>{t("collectionsScreen.title")}</Title>
          <Flex gap="sm" align="center">
            {showAddButton && (
              <Button
                leftSection={<IconPlus size={20}/>}
                onClick={() => openAddOrUpdateCollectionModal()}
              >
                {t("button.add")}
              </Button>
            )}
            <RefreshButton onRefresh={() => void refetch()}/>
          </Flex>
        </Flex>
        {renderTable()}
      </Stack>
      <Drawer
        opened={selectedCollection !== undefined}
        onClose={() => setSelectedCollection(undefined)}
        title={
          selectedCollection && (
            <CollectionTop
              collection={selectedCollection}
              onEdit={openAddOrUpdateCollectionModal}
              onDeleted={nothing}
            />
          )
        }
      >
        {selectedCollection && <CollectionDetail collection={selectedCollection}/>}
      </Drawer>
    </Container>
  );
}
