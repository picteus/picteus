import React, { ReactElement, useEffect, useMemo, useState } from "react";
import { ActionIcon, Box, Button, Center, Flex, Loader, Menu, Text, Tooltip } from "@mantine/core";
import { IconBookmark, IconChevronDown, IconDeviceFloppy, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Collection as PicteusCollection, SearchFilter, SearchFilterFromJSON } from "@picteus/ws-client";

import { notifyError, notifySuccess } from "utils";
import { useActionModalContext } from "app/context";
import { useConfirmAction } from "app/hooks";
import { CollectionService } from "app/services";
import { Collection } from "app/components";


type CollectionsBarType = {
    searchFilter: SearchFilter;
    selectedCollection?: PicteusCollection;
    setSelectedCollection: (collection: PicteusCollection | undefined) => void;
};

export default function CollectionsBar({
    searchFilter,
    selectedCollection,
    setSelectedCollection,
}: CollectionsBarType) {
    const [t] = useTranslation();
    const [, addModal] = useActionModalContext();
    const confirmAction = useConfirmAction();
    const [loading, setLoading] = useState<boolean>(false);
    const [collections, setCollections] = useState<PicteusCollection[]>([]);
    const [menuOpened, setMenuOpened] = useState<boolean>(false);

    function loadCollections() {
        setLoading(true);
        CollectionService.listAll().then(updatedCollections => setCollections(updatedCollections)).catch(error => {
            notifyError((error as Error).message);
        }).finally(() => {
            setLoading(false);
        });
    }

    useEffect(() => {
        loadCollections();
    }, []);

    function handleOnSaveCurrent() {
        addModal({
            title: t("collections.create"),
            component: (
                <Collection
                    searchFilter={searchFilter}
                    onSuccess={(collection) => {
                        loadCollections();
                        setSelectedCollection(collection);
                    }}
                />
            ),
        });
    }

    async function handleOnUpdateCurrent() {
        try {
            const collection = await CollectionService.update(selectedCollection.id, selectedCollection.name, searchFilter, selectedCollection.comment);
            notifySuccess(t("collections.updateSuccess"));
            loadCollections();
            setSelectedCollection(collection);
        } catch (error) {
            notifyError((error as Error).message);
        }
    }

    function handleOnEdit(collection: PicteusCollection) {
        setMenuOpened(false);
        addModal({
            title: t("collections.edit"),
            component: (
                <Collection
                    collection={collection}
                    searchFilter={collection.filter}
                    onSuccess={(updatedCollection) => {
                        loadCollections();
                        setSelectedCollection(updatedCollection);
                    }}
                />
            ),
        });
    }

    function handleOnDelete(collection: PicteusCollection) {
        setMenuOpened(false);
        confirmAction(
            async () => {
                try {
                    await CollectionService.delete(collection.id);
                    loadCollections();
                    setSelectedCollection(undefined);
                } catch (error) {
                    notifyError((error as Error).message);
                }
            },
            {
                title: t("collections.confirmDeleteTitle", { defaultValue: "Delete Collection" }),
                message: t("collections.deleteConfirmation", { defaultValue: "Are you sure you want to delete this collection?" })
            }
        );
    }

    function truncateName(name: string) {
        return name.length > 32 ? name.substring(0, 32) + "..." : name;
    }

    return useMemo<ReactElement>(() => (<Button.Group>
          <Menu shadow="md" width={340} position="bottom-end" opened={menuOpened} onChange={setMenuOpened}>
              <Menu.Target>
                  <Button variant="default" leftSection={<IconBookmark size={14} />}
                          rightSection={<IconChevronDown size={14} />}>
                      {selectedCollection ? truncateName(selectedCollection.name) : t("collections.title")}
                  </Button>
              </Menu.Target>
              <Menu.Dropdown>
                  <Menu.Label>{t("collections.savedCollections")}</Menu.Label>
                  {loading && <Box p="sm"><Center><Loader size="sm" /></Center></Box>}
                  {!loading && collections.map((collection) => (
                    <Menu.Item key={collection.id} onClick={() => setSelectedCollection(collection)}>
                        <Flex justify="space-between" align="center">
                            <Text size="sm">{truncateName(collection.name)}</Text>
                            <Flex gap="xs">
                                <ActionIcon component="div" variant="subtle" size="xs" onClick={(event) => {
                                    event.stopPropagation();
                                    handleOnEdit(collection);
                                }}>
                                    <IconEdit size={12} />
                                </ActionIcon>
                                <ActionIcon component="div" variant="subtle" size="xs" color="red" onClick={(event) => {
                                    event.stopPropagation();
                                    handleOnDelete(collection);
                                }}>
                                    <IconTrash size={12} />
                                </ActionIcon>
                            </Flex>
                        </Flex>
                    </Menu.Item>
                  ))}
              </Menu.Dropdown>
          </Menu>
          {selectedCollection && (
            <Tooltip label={t("collections.updateCurrent", { name: selectedCollection.name })}>
                <Button variant="default"
                        disabled={searchFilter && JSON.stringify(SearchFilterFromJSON(selectedCollection.filter)) === JSON.stringify(SearchFilterFromJSON(searchFilter))}
                        onClick={() => void handleOnUpdateCurrent()} px="xs">
                    <IconDeviceFloppy size={16} />
                </Button>
            </Tooltip>
          )}
          <Tooltip label={t("collections.saveCurrent")}>
              <Button variant="default" onClick={handleOnSaveCurrent} px="xs">
                  <IconPlus size={16} />
              </Button>
          </Tooltip>
      </Button.Group>
    ), [loading, menuOpened, collections, selectedCollection, searchFilter]);
}
