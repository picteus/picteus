import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Box, Button, Center, Flex, Loader, Menu, Text, Tooltip } from "@mantine/core";
import { IconChevronDown, IconDeviceFloppy, IconLibraryPhoto, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Collection as PicteusCollection, SearchFilter, SearchFilterFromJSON } from "@picteus/ws-client";

import { notifyError, notifySuccess } from "utils";
import { useActionModalContext, useEventSocket } from "app/context";
import { useAsyncInitialize } from "app/hooks";
import { CollectionService } from "app/services";
import AddOrUpdateCollection
    from "../../../../screens/CollectionsScreen/components/AddOrUpdateCollection/AddOrUpdateCollection.tsx";
import { ChannelEnum } from "../../../../../types";


type CollectionsBarType = {
    searchFilter?: SearchFilter;
    initialCollectionId?: number;
    onCollection: (collection: PicteusCollection) => void;
    clearCollectionTrigger: number;
};

export default function CollectionsBar({
    searchFilter,
    initialCollectionId,
    onCollection,
    clearCollectionTrigger,
}: CollectionsBarType) {
    const [t] = useTranslation();
    const [, addModal] = useActionModalContext();
    const [loading, setLoading] = useState<boolean>(false);
    const { eventStore } = useEventSocket();
    const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
    const [collections, setCollections] = useState<PicteusCollection[]>([]);
    const [menuOpened, setMenuOpened] = useState<boolean>(false);
    const [selectedCollection, setSelectedCollection] = useState<PicteusCollection | undefined>();
    const [saveDisabled, setSaveDisabled] = useState<boolean>(true);
    const onCollectionRef = useRef<(collection: PicteusCollection) => void>(onCollection);

    useEffect(() => {
        onCollectionRef.current = onCollection;
    }, [onCollection]);

    useEffect(() => {
        if (event?.channel === ChannelEnum.COLLECTION_DELETED) {
            void loadCollections(true);
            if (event.rawData.value["id"] === selectedCollection?.id) {
                setSelectedCollection(undefined);
            }
        }
    }, [event]);

    useAsyncInitialize<number | undefined>(initialCollectionId, async (value: number)=> {
        if (value !== undefined) {
            const collection = await CollectionService.get(value);
            setSelectedCollection(collection);
            onCollectionRef.current(collection);
        }
    });

    useEffect(() => {
        setSaveDisabled(selectedCollection === undefined || searchFilter === undefined || JSON.stringify(SearchFilterFromJSON(selectedCollection.filter)) === JSON.stringify(SearchFilterFromJSON(searchFilter)))
    }, [searchFilter, selectedCollection]);

    useEffect(() => {
        if (clearCollectionTrigger > 0) {
            setSelectedCollection(undefined);
        }
    }, [clearCollectionTrigger]);

    useEffect(() => {
        loadCollections();
    }, []);

    function loadCollections(force = false) {
        setLoading(true);
        (force === false ? CollectionService.list() : CollectionService.fetchAll()).then(updatedCollections => setCollections(updatedCollections)).catch(error => {
            notifyError((error as Error).message);
        }).finally(() => {
            setLoading(false);
        });
    }

    function handleOnSelectedCollection(collection: PicteusCollection) {
        setSelectedCollection(collection);
        setSaveDisabled(true);
        onCollection(collection);
    }

    function handleOnSaveCurrent() {
        addModal({
            title: t("addOrUpdateCollectionModal.addTitle"),
            size: "s",
            component: (
                <AddOrUpdateCollection
                    searchFilter={searchFilter!}
                    onSuccess={(collection) => {
                        loadCollections();
                        setSelectedCollection(collection);
                        onCollection(collection);
                    }}
                />
            ),
        });
    }

    function handleOnUpdateCurrent() {
        CollectionService.update(selectedCollection.id, selectedCollection.name, searchFilter, selectedCollection.comment).then((collection: PicteusCollection) => {
            notifySuccess(t("addOrUpdateCollectionModal.successUpdate"));
            loadCollections();
            setSelectedCollection(collection);
            setSaveDisabled(true);
            onCollection(collection);
        }).catch(error => notifyError((error as Error).message));
    }

    function truncateName(name: string) {
        return name.length > 32 ? name.substring(0, 32) + "..." : name;
    }

    return (<Button.Group>
          <Menu shadow="md" width={340} position="bottom" withArrow trigger="click-hover" opened={menuOpened} onChange={setMenuOpened}>
              <Menu.Target>
                  <Button variant="default" leftSection={<IconLibraryPhoto size={14} />}
                          rightSection={<IconChevronDown size={14} />}>
                      {selectedCollection ? truncateName(selectedCollection.name) : t("field.collections")}
                  </Button>
              </Menu.Target>
              <Menu.Dropdown style={{ maxHeight: "75%", overflowY: "auto" }}>
                  {loading && <Box p="sm"><Center><Loader size="sm" /></Center></Box>}
                  {!loading && collections.map((collection) => (
                    <Menu.Item key={collection.id} onClick={() => handleOnSelectedCollection(collection)}>
                        <Text size="sm">{truncateName(collection.name)}</Text>
                        <Flex justify="space-between" align="center">
                        </Flex>
                    </Menu.Item>
                  ))}
              </Menu.Dropdown>
          </Menu>
          {selectedCollection && (
            <Tooltip label={t("button.save", { name: selectedCollection.name })}>
                <Button variant="default" px="xs" disabled={saveDisabled} onClick={handleOnUpdateCurrent}>
                    <IconDeviceFloppy size={16} />
                </Button>
            </Tooltip>
          )}
          <Tooltip label={t("button.add")}>
              <Button variant="default" px="xs" disabled={!searchFilter}  onClick={handleOnSaveCurrent}>
                  <IconPlus size={16} />
              </Button>
          </Tooltip>
      </Button.Group>
    );
}
