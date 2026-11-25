import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Box, Button, Center, Loader, Menu, Tooltip } from "@mantine/core";
import {
  IconChevronDown,
  IconDeviceFloppy,
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
import { useActionModalContext, useSocketEvent } from "app/context";
import {
  useCollection,
  useCollections,
  useExtensionCommandRunner,
  useExtensionCommands,
  useRunCapabilities,
  useUpdateCollectionMutation
} from "app/hooks";
import { EventService } from "app/services";
import { CollectionLabel, CommandIcon, Common, computeIcon, EntityIcons, MenuItemEntry } from "app/components";
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
  const { addModal } = useActionModalContext();
  const { data: collections = [], isLoading: loading } = useCollections();
  const { data: initialCollection } = useCollection(initialCollectionId);
  const updateCollectionMutation = useUpdateCollectionMutation();
  const commandRunner = useExtensionCommandRunner();
  const extensionsImageCommands = useExtensionCommands(commandEntities);
  const { searchRunCapabilities } = useRunCapabilities();
  const [ menuOpened, setMenuOpened ] = useState<boolean>(false);
  const [ selectedCollection, setSelectedCollection ] = useState<PicteusCollection | undefined>();
  const [ saveDisabled, setSaveDisabled ] = useState<boolean>(true);
  const onCollectionRef = useRef<(collection: PicteusCollection) => void>(onCollection);
  const previousInitialIdRef = useRef<number | undefined>(undefined);

  useEffect(() =>
  {
    onCollectionRef.current = onCollection;
  }, [ onCollection ]);

  useSocketEvent(ChannelEnum.COLLECTION_DELETED, (event) =>
  {
    if (EventService.computeEventEntityId<number>(event) === selectedCollection?.id)
    {
      setSelectedCollection(undefined);
      onCollection(undefined);
    }
  });

  useEffect(() =>
  {
    if (initialCollection && initialCollection.id !== previousInitialIdRef.current)
    {
      previousInitialIdRef.current = initialCollection.id;
      setSelectedCollection(initialCollection);
      onCollectionRef.current(initialCollection);
    }
  }, [ initialCollection ]);

  useEffect(() =>
  {
    setSaveDisabled(
      selectedCollection === undefined ||
      searchFilter === undefined ||
      searchFilter.origin?.kind === SearchOriginNature.Images ||
      JSON.stringify(SearchFilterFromJSON(selectedCollection.filter)) === JSON.stringify(SearchFilterFromJSON(searchFilter))
    );
  }, [ searchFilter, selectedCollection ]);

  useImperativeHandle(ref, () => ({
    clearCollection: () =>
    {
      setSelectedCollection(undefined);
    }
  }));

  function handleOnSelectedCollection(collection: PicteusCollection)
  {
    setSelectedCollection(collection);
    setSaveDisabled(true);
    onCollection(collection);
  }

  function handleOnSaveCurrent()
  {
    const CollectionModalIcon = EntityIcons.collection;
    addModal({
      title: t("addOrUpdateCollectionModal.addTitle"),
      icon: { icon: <CollectionModalIcon stroke={Common.IconStrokeSize}/> },
      size: "s",
      body: (
        <AddOrUpdateCollection
          searchFilter={searchFilter!}
          onSuccess={(collection) =>
          {
            setSelectedCollection(collection);
            onCollection(collection);
          }}
        />
      )
    });
  }

  async function handleOnUpdateCurrent(): Promise<void>
  {
    if (!selectedCollection)
    {
      return;
    }

    let collection: PicteusCollection;
    try
    {
      collection = await updateCollectionMutation.mutateAsync({
        id: selectedCollection.id,
        name: selectedCollection.name,
        searchFilter,
        comment: selectedCollection.comment
      });
    }
    catch (error)
    {
      ToastService.apiCallError(error);
      return;
    }

    ToastService.success(t("addOrUpdateCollectionModal.successUpdate"));
    setSelectedCollection(collection);
    setSaveDisabled(true);
    onCollection(collection);
  }

  function handleOnSynchronize(): void
  {
    if (searchFilter)
    {
      searchRunCapabilities({ filter: searchFilter });
    }
  }

  const width = 240;
  const hasCollections = collections.length > 0;
  return (
    <Button.Group>
      <Menu
        shadow="md"
        width={width}
        position="bottom"
        trigger="click-hover"
        opened={menuOpened}
        onChange={setMenuOpened}
        disabled={!hasCollections}
        styles={{ itemLabel: { minWidth: 0 } }}
      >
        <Menu.Target>
          <Button
            variant="default"
            w={width}
            leftSection={selectedCollection === undefined ? <IconLibraryPhoto size={Common.IconXSmallSize}/> : undefined}
            rightSection={<IconChevronDown size={Common.IconXSmallSize}/>}
            disabled={!hasCollections}
          >
            {selectedCollection !== undefined
              ? <CollectionLabel collection={selectedCollection}/>
              : t("field.collections")}
          </Button>
        </Menu.Target>
        <Menu.Dropdown style={{ maxHeight: "75%", overflowY: "auto" }}>
          {loading && <Box p="sm"><Center><Loader size="sm"/></Center></Box>}
          {!loading && collections.map((collection) => (
            <Menu.Item
              key={collection.id}
              onClick={() => handleOnSelectedCollection(collection)}
            >
              <CollectionLabel collection={collection}/>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
      <Menu shadow="md" width={160} position="bottom" trigger="click-hover" withinPortal={true}>
        <Menu.Target>
          <Button
            variant="default"
            px="xs"
            disabled={!searchFilter || !extensionsImageCommands}
          >
            <IconPlayerPlayFilled size={Common.IconXSmallSize}/>
          </Button>
        </Menu.Target>
        <Menu.Dropdown style={{ maxHeight: "75%", overflowY: "auto" }}>
          <Menu.Label>{t("commands.coreFeatures")}</Menu.Label>
          <MenuItemEntry
            icon={computeIcon("synchronize")}
            label={t("commands.synchronize")}
            subLabel={t("commands.allExtensionsDetails")}
            onClick={handleOnSynchronize}
          />
          {extensionsImageCommands?.length > 0 && <>
            <Menu.Label>{t("commands.extensionsCommands")}</Menu.Label>
            {extensionsImageCommands.map((extensionCommand) =>
            {
              const extension = extensionCommand.extension;
              const command = extensionCommand.command;
              const manifest = extension.manifest;
              return (
                <MenuItemEntry
                  key={`${manifest.id}-${command.id}`}
                  extensionId={manifest.id}
                  icon={<CommandIcon extensionId={manifest.id} command={command} size="xs"/>}
                  label={command.label}
                  subLabel={manifest.name}
                  onClick={() => commandRunner(manifest.id, command, searchFilter)}
                />
              );
            })}
          </>}
        </Menu.Dropdown>
      </Menu>
      {selectedCollection && (
        <Tooltip label={t("button.save", { name: selectedCollection.name })}>
          <Button
            variant="default"
            px="xs"
            disabled={saveDisabled || updateCollectionMutation.isPending}
            loading={updateCollectionMutation.isPending}
            onClick={handleOnUpdateCurrent}
          >
            <IconDeviceFloppy size={Common.IconXSmallSize}/>
          </Button>
        </Tooltip>
      )}
      <Tooltip label={t("button.add")}>
        <Button variant="default" px="xs" disabled={!searchFilter} onClick={handleOnSaveCurrent}>
          <IconPlus size={Common.IconXSmallSize}/>
        </Button>
      </Tooltip>
    </Button.Group>
  );
});
CollectionsBar.displayName = "CollectionsBar";
