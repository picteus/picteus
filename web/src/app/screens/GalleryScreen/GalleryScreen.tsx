import React, { ChangeEvent, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, ScrollArea, Scroller, Tabs } from "@mantine/core";
import { IconPhoto, IconPhotoSearch, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { TabsType } from "types";
import { ROUTES } from "utils";
import { useGalleryTabsContext } from "app/context";
import { useContainerDimensions, useReadyRef } from "app/hooks";
import { FiltersService, RepositoriesService, StorageService } from "app/services";
import { EmptyResults, ExtensionIcon, ImagesView } from "app/components";

import style from "./GalleryScreen.module.scss";


type GalleryTabType = {
  tab: TabsType;
  onRemove: () => void;
};

function GalleryTab({ tab, onRemove }: GalleryTabType) {
  const [isEditing, setIsEditing] = useState(false);
  const [tabLabel, setTabLabel] = useState(tab.content.title);
  const { state } = useGalleryTabsContext();

  function handleOnDoubleClickTabLabel() {
    setIsEditing(true);
  }

  function handleOnChangeTabLabel(event: ChangeEvent<HTMLInputElement>) {
    setTabLabel(event.target.value);
  }

  function onFinishEditing() {
    state.renameTab(tab.id, tabLabel);
    setIsEditing(false);
  }

  return (
    <Tabs.Tab
      value={tab.id}
      leftSection={tab.extensionId !== undefined ? <ExtensionIcon idOrExtension={tab.extensionId} size="sm" /> :
        <IconPhoto size={13} />}
      rightSection={
        <IconX
          size={14}
          className={style.closeIcon}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        />
      }
    >
      {isEditing ? (
        <Input
          size="s"
          onKeyDown={(event) => {
            event.key === "Enter" && onFinishEditing();
          }}
          onBlur={onFinishEditing}
          onChange={handleOnChangeTabLabel}
          value={tabLabel}
        />
      ) : (
        <div onDoubleClick={handleOnDoubleClickTabLabel}>{tabLabel}</div>
      )}
    </Tabs.Tab>
  );
}

export default function GalleryScreen() {
  const [t] = useTranslation();
  const navigate = useNavigate();
  const [containerRef,  containerReadyRef, containerIsReady ] = useReadyRef<HTMLDivElement>();
  const [viewportRef,  viewportReadyRef, viewportIsReady ] = useReadyRef<HTMLDivElement>();
  const { height } = useContainerDimensions(containerReadyRef);
  const {tabs, removeTab, state, galleryTabValue} = useGalleryTabsContext();

  const otherTabs = useMemo(() => (tabs.map((tab, index) => (<GalleryTab
      key={`gallery-${tab.id}`}
      tab={tab}
      onRemove={() => handleOnRemoveTab(tab.id, index)}
    />)
  )), [tabs]);

  const otherTabPanels = useMemo(() => (tabs.map((tab) => (
      <Tabs.Panel key={`panel-${tab.id}`} value={tab.id}>
        {viewportReadyRef && <ImagesView
          viewData={{
            mode: tab.data.mode,
            pinnable: tab.data.pinnable,
            filterOrCollectionId: tab.data.filterOrCollectionId
          }}
          isDefault={false}
          containerRef={containerReadyRef}
          onEmptyResults={() => (<EmptyResults
            icon={<IconPhotoSearch size={140} stroke={1} />}
            description={t(`emptyImages.${("filter" in tab.data.filterOrCollectionId && tab.data.filterOrCollectionId.filter.origin) ? "descriptionNoData" : "description"}`)}
            title={t("emptyImages.title")}
          />)}
          stickyControlBar={true}
          scrollRootRef={viewportReadyRef}
          displayDetailInContainer={true}
        />
        }
      </Tabs.Panel>
    ))
  ), [tabs]);

  const computeEmptyResults = useCallback(() => {
    const repositoriesExists = RepositoriesService.list().length > 0;
    return (
      <EmptyResults
        icon={<IconPhotoSearch size={140} stroke={1} />}
        description={t(repositoriesExists ? "emptyImages.description" : "emptyImages.descriptionNoRepository")}
        title={t("emptyImages.title")}
        buttonText={t("emptyImages.buttonTextNoRepository")}
        buttonAction={repositoriesExists ? undefined : () => navigate(ROUTES.repositories)}
      />
    );
  }, []);

  function handleOnRemoveTab(tabId: string, index: number) {
    let nextTabId: string;
    if (index + 1 < tabs.length) {
      nextTabId = tabs[index + 1].id;
    }
    else if (index - 1 >= 0) {
      nextTabId = tabs[index - 1].id;
    }
    else {
      nextTabId = galleryTabValue;
    }

    removeTab(tabId);
    if (tabId === state.activeTab) {
      state.setActiveTab(nextTabId);
    }
  }

  return (
    <div ref={containerRef} className={style.mainContainer}>
      {containerIsReady && <ScrollArea h={height} viewportRef={viewportRef}>
        <Tabs value={state.activeTab} onChange={state.setActiveTab} keepMounted={true}>
          <Tabs.List>
            <Scroller>
              <Tabs.Tab value={galleryTabValue} leftSection={<IconPhoto size={13} />}>
                {t("galleryScreen.explore")}
              </Tabs.Tab>
              {otherTabs}
            </Scroller>
          </Tabs.List>
          <Tabs.Panel value={galleryTabValue}>
            {viewportIsReady &&
              <ImagesView viewData={StorageService.getMainViewTabData(FiltersService.defaultFilter)} isDefault={true}
                          containerRef={containerReadyRef} stickyControlBar={true} onEmptyResults={computeEmptyResults} scrollRootRef={viewportReadyRef} displayDetailInContainer={true} />}
          </Tabs.Panel>
          {otherTabPanels}
        </Tabs>
      </ScrollArea>}
    </div>
  );
}
