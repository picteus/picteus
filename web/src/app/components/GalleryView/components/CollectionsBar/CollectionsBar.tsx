import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Box, Button, Center, Flex, Loader, Menu, Text, Tooltip } from "@mantine/core";
import { IconBookmark, IconChevronDown, IconDeviceFloppy, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";

import { Collection as PicteusCollection, SearchFilter, SearchFilterFromJSON } from "@picteus/ws-client";

import { notifyError, notifySuccess } from "utils";
import { useActionModalContext } from "app/context";
import { useConfirmAction } from "app/hooks";
import { CollectionService } from "app/services";
import { Collection } from "app/components";


type CollectionsBarType = {
    currentFilter: SearchFilter;
    selectedCollection?: PicteusCollection;
    onApplyCollection: (collection: PicteusCollection | undefined) => void;
};

export default function CollectionsBar({
    currentFilter,
    selectedCollection,
    onApplyCollection,
}: CollectionsBarType) {
    const [t] = useTranslation();
    const [, addModal] = useActionModalContext();
    const confirmAction = useConfirmAction();
    const [loading, setLoading] = useState(false);
    const [collections, setCollections] = useState<PicteusCollection[]>([]);
    const [menuOpened, setMenuOpened] = useState(false);

    useEffect(() => {
        void loadCollections();
    }, []);

    async function loadCollections() {
        setLoading(true);
        try {
            const data = await CollectionService.listAll();
            setCollections(data);
        } catch (error) {
            notifyError((error as Error).message);
        } finally {
            setLoading(false);
        }
    }

    function handleOnSaveCurrent() {
        addModal({
            title: t("collections.create"),
            component: (
                <Collection
                    searchFilter={currentFilter}
                    onSuccess={(collection) => {
                        void loadCollections();
                        onApplyCollection(collection);
                    }}
                />
            ),
        });
    }

    async function handleOnUpdateCurrent() {
        try {
            const collection = await CollectionService.update(selectedCollection.id, selectedCollection.name, currentFilter, selectedCollection.comment);
            notifySuccess(t("collections.updateSuccess"));
            void loadCollections();
            onApplyCollection(collection);
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
                        void loadCollections();
                        onApplyCollection(updatedCollection);
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
                    void loadCollections();
                    onApplyCollection(undefined);
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

    return (
        <Button.Group>
            <Menu shadow="md" width={340} position="bottom-end" opened={menuOpened} onChange={setMenuOpened}>
                <Menu.Target>
                    <Button variant="default" leftSection={<IconBookmark size={14} />} rightSection={<IconChevronDown size={14} />}>
                        {selectedCollection ? truncateName(selectedCollection.name) : t("collections.title")}
                    </Button>
                </Menu.Target>

                <Menu.Dropdown>
                    <Menu.Label>{t("collections.savedCollections")}</Menu.Label>
                    {loading && <Box p="sm"><Center><Loader size="sm" /></Center></Box>}
                    {!loading && collections.map((collection) => (
                        <Menu.Item key={collection.id} onClick={() => onApplyCollection(collection)}>
                            <Flex justify="space-between" align="center">
                                <Text size="sm">{truncateName(collection.name)}</Text>
                                <Flex gap="xs">
                                    <ActionIcon variant="subtle" size="xs" onClick={(event) => { event.stopPropagation(); handleOnEdit(collection); }}>
                                        <IconEdit size={12} />
                                    </ActionIcon>
                                    <ActionIcon variant="subtle" size="xs" color="red" onClick={(event) => { event.stopPropagation(); handleOnDelete(collection); }}>
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
                    <Button variant="default" disabled={currentFilter !== undefined && JSON.stringify(SearchFilterFromJSON(selectedCollection.filter)) === JSON.stringify(SearchFilterFromJSON(currentFilter))} onClick={() => void handleOnUpdateCurrent()} px="xs">
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
    );
}
