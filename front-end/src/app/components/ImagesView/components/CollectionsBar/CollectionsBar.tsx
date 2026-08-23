import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, useSyncExternalStore } from "react";
import { Box, Button, Center, Loader, Menu, Text, Tooltip } from "@mantine/core";
import {
  IconChevronDown,
  IconDeviceFloppy,
  IconLibrary,
  IconLibraryPhoto,
  IconPlayerPlayFilled,
  IconPlus
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  Collection as PicteusCollection,
  CommandEntity,
  SearchFilter,
  SearchFilterFromJSON,
  SearchOriginNature
} from "@picteus/ws-client";

import { ChannelEnum } from "types";
import { ToastService } from "utils";
import { useActionModalContext, useEventSocket } from "app/context";
import { useAsyncInitialize, useExtensionCommandRunner, useExtensionCommandsWithEntities } from "app/hooks";
import { CollectionService, EventService } from "app/services";
import { CollectionIcon, CommandIcon, Common, MenuItemEntry } from "app/components";
import AddOrUpdateCollection
  from "../../../../screens/CollectionsScreen/components/AddOrUpdateCollection/AddOrUpdateCollection.tsx";


export interface CollectionsBarRef
{
  clearCollection: () => void;
}

const commandEntities = [ CommandEntity.Images ];

type CollectionsBarType = {
  searchFilter?: SearchFilter;
  initialCollectionId?: number;
  onCollection: (collection: PicteusCollection | undefined) => void;
};

export const CollectionsBar = forwardRef<CollectionsBarRef, CollectionsBarType>(({
  searchFilter,
  initialCollectionId,
  onCollection
}, ref) =>
{
  const [ t ] = useTranslation();
  const [ , addModal ] = useActionModalContext();
  const [ loading, setLoading ] = useState<boolean>(false);
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribeToSocketEvents, eventStore.getSocketEvent);
  const commandRunner = useExtensionCommandRunner();
  const extensionsImageCommands = useExtensionCommandsWithEntities(commandEntities);
  const [ collections, setCollections ] = useState<PicteusCollection[]>([]);
  const [ menuOpened, setMenuOpened ] = useState<boolean>(false);
  const [ selectedCollection, setSelectedCollection ] = useState<PicteusCollection | undefined>();
  const [ saveDisabled, setSaveDisabled ] = useState<boolean>(true);
  const onCollectionRef = useRef<(collection: PicteusCollection) => void>(onCollection);

  useEffect(() =>
  {
    onCollectionRef.current = onCollection;
  }, [ onCollection ]);

  useEffect(() =>
  {
    if (event?.channel === ChannelEnum.COLLECTION_CREATED || event?.channel === ChannelEnum.COLLECTION_UPDATED)
    {
      void loadCollections(true);
    }
    else if (event?.channel === ChannelEnum.COLLECTION_DELETED)
    {
      void loadCollections(true);
      if (EventService.computeEventEntityId<number>(event) === selectedCollection?.id)
      {
        setSelectedCollection(undefined);
        onCollection(undefined);
      }
    }
  }, [ event ]);

  useAsyncInitialize<number | undefined>(initialCollectionId, async (value: number) =>
  {
    if (value !== undefined)
    {
      const collection = await CollectionService.get(value);
      setSelectedCollection(collection);
      onCollectionRef.current(collection);
    }
  });

  useEffect(() =>
  {
    setSaveDisabled(selectedCollection === undefined || searchFilter === undefined || searchFilter.origin?.kind === SearchOriginNature.Images || JSON.stringify(SearchFilterFromJSON(selectedCollection.filter)) === JSON.stringify(SearchFilterFromJSON(searchFilter)));
  }, [ searchFilter, selectedCollection ]);

  useImperativeHandle(ref, () => ({
    clearCollection: () =>
    {
      setSelectedCollection(undefined);
    }
  }));

  useEffect(() =>
  {
    loadCollections();
  }, []);

  function loadCollections(force = false)
  {
    setLoading(true);
    (force === false ? CollectionService.list() : CollectionService.fetchAll()).then(updatedCollections => setCollections(updatedCollections)).catch(ToastService.failureAndMessage).finally(() =>
    {
      setLoading(false);
    });
  }

  function handleOnSelectedCollection(collection: PicteusCollection)
  {
    setSelectedCollection(collection);
    setSaveDisabled(true);
    onCollection(collection);
  }

  function handleOnSaveCurrent()
  {
    addModal({
      title: t("addOrUpdateCollectionModal.addTitle"),
      icon: { icon: <IconLibrary stroke={Common.IconStrokeSize}/> },
      size: "s",
      component: (
        <AddOrUpdateCollection
          searchFilter={searchFilter!}
          onSuccess={(collection) =>
          {
            loadCollections();
            setSelectedCollection(collection);
            onCollection(collection);
          }}
        />
      )
    });
  }

  function handleOnUpdateCurrent()
  {
    CollectionService.update(selectedCollection.id, selectedCollection.name, searchFilter, selectedCollection.comment).then((collection: PicteusCollection) =>
    {
      ToastService.success(t("addOrUpdateCollectionModal.successUpdate"));
      loadCollections();
      setSelectedCollection(collection);
      setSaveDisabled(true);
      onCollection(collection);
    }).catch(error => ToastService.failure((error as Error).message));
  }

  function truncateName(name: string)
  {
    return name.length > 32 ? name.substring(0, 32) + "..." : name;
  }

  const width = 240;
  return (<Button.Group>
      <Menu shadow="md" width={width} position="bottom" trigger="click-hover" opened={menuOpened}
            onChange={setMenuOpened}>
        <Menu.Target>
          <Button variant="default" w={width} leftSection={<IconLibraryPhoto size={Common.IconSmallSize}/>}
                  rightSection={<IconChevronDown size={Common.IconSmallSize}/>}>
            {selectedCollection ? truncateName(selectedCollection.name) : t("field.collections")}
          </Button>
        </Menu.Target>
        <Menu.Dropdown style={{ maxHeight: "75%", overflowY: "auto" }}>
          {loading && <Box p="sm"><Center><Loader size="sm"/></Center></Box>}
          {!loading && collections.map((collection) => (
            <Menu.Item key={collection.id} leftSection={<CollectionIcon collection={collection}/>}
                       onClick={() => handleOnSelectedCollection(collection)}>
              <Text size="sm">{truncateName(collection.name)}</Text>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
      {<Menu shadow="md" width={160} position="bottom" trigger="click-hover" withinPortal={true}>
        <Menu.Target>
          <Button variant="default" px="xs"
                  disabled={!searchFilter || !extensionsImageCommands || extensionsImageCommands.length === 0}>
            <IconPlayerPlayFilled size={Common.IconSmallSize}/>
          </Button>
        </Menu.Target>
        <Menu.Dropdown style={{ maxHeight: "75%", overflowY: "auto" }}>
          <Menu.Label>{t("commands.extensionsCommands")}</Menu.Label>
          {extensionsImageCommands?.map((extensionCommand) =>
          {
            const extension = extensionCommand.extension;
            const command = extensionCommand.command;
            const manifest = extension.manifest;
            return (
              <MenuItemEntry key={`${manifest.id}-${command.id}`} extensionId={manifest.id}
                             icon={<CommandIcon extensionId={manifest.id} command={command} size="sm"/>}
                             label={command.label}
                             subLabel={manifest.name}
                             onClick={() => commandRunner(manifest.id, command, searchFilter)}/>);
          })}
        </Menu.Dropdown>
      </Menu>
      }
      {selectedCollection && (
        <Tooltip label={t("button.save", { name: selectedCollection.name })}>
          <Button variant="default" px="xs" disabled={saveDisabled} onClick={handleOnUpdateCurrent}>
            <IconDeviceFloppy size={Common.IconSmallSize}/>
          </Button>
        </Tooltip>
      )}
      <Tooltip label={t("button.add")}>
        <Button variant="default" px="xs" disabled={!searchFilter} onClick={handleOnSaveCurrent}>
          <IconPlus size={Common.IconSmallSize}/>
        </Button>
      </Tooltip>
    </Button.Group>
  );
});
CollectionsBar.displayName = "CollectionsBar";
