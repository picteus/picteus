import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Box, Center, Divider, Flex, Loader, Menu, Text } from "@mantine/core";
import { IconBookmark, IconEdit, IconTrash } from "@tabler/icons-react";
import { Collection } from "@picteus/ws-client";

import { CollectionService, FiltersService } from "app/services";
import { LocalFiltersType } from "types";
import { useActionModalContext } from "app/context";
import { CollectionModal } from "app/components/ActionModal";
import { notifyError, notifySuccess } from "utils";

type CollectionsDropdownProps = {
    currentFilters: LocalFiltersType;
    selectedCollection?: Collection;
    onApplyCollection: (collection: Collection) => void;
};

export default function CollectionsDropdown({
    currentFilters,
    selectedCollection,
    onApplyCollection,
}: CollectionsDropdownProps) {
    const [t] = useTranslation();
    const [, addModal] = useActionModalContext();
    const [loading, setLoading] = useState(false);
    const [collections, setCollections] = useState<Collection[]>([]);

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
        const searchFilter = FiltersService.localFiltersToSearchFilter(currentFilters);
        addModal({
            title: t("collections.create"),
            component: (
                <CollectionModal
                    searchFilter={searchFilter}
                    onSuccess={() => {
                        void loadCollections();
                    }}
                />
            ),
        });
    }

    async function handleOnUpdateCurrent() {
        const searchFilter = FiltersService.localFiltersToSearchFilter(currentFilters);
        try {
            await CollectionService.update(selectedCollection.id, selectedCollection.name, searchFilter, selectedCollection.comment);
            notifySuccess(t("collections.updateSuccess"));
            void loadCollections();
        } catch (error) {
            notifyError((error as Error).message);
        }
    }

    function handleOnEdit(collection: Collection) {
        addModal({
            title: t("collections.edit"),
            component: (
                <CollectionModal
                    collection={collection}
                    searchFilter={collection.filter}
                    onSuccess={() => {
                        void loadCollections();
                    }}
                />
            ),
        });
    }

    async function handleOnDelete(collection: Collection) {
        // Ideally we should ask for a user confirmation here. Let's just catch errors.
        if (!window.confirm(t("collections.deleteConfirmation", { defaultValue: "Are you sure you want to delete this collection?" }))) {
            return;
        }

        try {
            await CollectionService.delete(collection.id);
            void loadCollections();
        } catch (error) {
            notifyError((error as Error).message);
        }
    }

    return (
        <Menu shadow="md" width={250} position="bottom-end">
            <Menu.Target>
                <ActionIcon size="lg" variant="default" title={t("collections.title")}>
                    <IconBookmark stroke={1.3} />
                </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Item onClick={handleOnSaveCurrent} leftSection={<IconBookmark size={14} />}>
                    {t("collections.saveCurrent")}
                </Menu.Item>
                {selectedCollection && (
                    <Menu.Item onClick={() => void handleOnUpdateCurrent()} leftSection={<IconEdit size={14} />}>
                        {t("collections.updateCurrent", { name: selectedCollection.name })}
                    </Menu.Item>
                )}
                <Divider my="sm" />
                <Menu.Label>{t("collections.savedCollections")}</Menu.Label>
                {loading && <Box p="sm"><Center><Loader size="sm" /></Center></Box>}
                {!loading && collections.map((col) => (
                    <Menu.Item key={col.id} onClick={() => onApplyCollection(col)}>
                        <Flex justify="space-between" align="center">
                            <Text size="sm">{col.name}</Text>
                            <Flex gap="xs">
                                <ActionIcon variant="subtle" size="xs" onClick={(event) => { event.stopPropagation(); handleOnEdit(col); }}>
                                    <IconEdit size={12} />
                                </ActionIcon>
                                <ActionIcon variant="subtle" size="xs" color="red" onClick={(event) => { event.stopPropagation(); void handleOnDelete(col); }}>
                                    <IconTrash size={12} />
                                </ActionIcon>
                            </Flex>
                        </Flex>
                    </Menu.Item>
                ))}
            </Menu.Dropdown>
        </Menu>
    );
}
