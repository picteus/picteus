import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, ScrollArea, Scroller, Tabs } from "@mantine/core";
import { IconPhoto, IconPhotoSearch, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { TabsType } from "types";
import { ROUTES } from "utils";
import { useGalleryTabsContext } from "app/context";
import { useContainerDimensions } from "app/hooks";
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

  function handleOnChangeTabLabel(event) {
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
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { height } = useContainerDimensions(containerRef);
  const {tabs, removeTab, state, galleryTabValue} = useGalleryTabsContext();

  function handleOnRemoveTab(tabId: string, nextTabValue: string) {
    removeTab(tabId);
    if (tabId === state.activeTab) {
      state.setActiveTab(nextTabValue);
    }
  }

  function computeNextTabValue(index: number) {
    if (index + 1 < tabs.length) {
      return tabs[index + 1].id;
    }
    if (index - 1 >= 0) {
      return tabs[index - 1].id;
    }
    return galleryTabValue;
  }

  return (
    <div ref={containerRef} className={style.mainContainer}>
      {containerRef.current && <ScrollArea h={height} viewportRef={viewportRef}>
        <Tabs value={state.activeTab} onChange={state.setActiveTab}>
          <Tabs.List>
            <Scroller>
              <Tabs.Tab value={galleryTabValue} leftSection={<IconPhoto size={13} />}>
                {t("galleryScreen.explore")}
              </Tabs.Tab>
              {tabs.map((tab, index) => {
                return (
                  <GalleryTab
                    key={`gallery-${tab.id}`}
                    tab={tab}
                    onRemove={() =>
                      handleOnRemoveTab(tab.id, computeNextTabValue(index))
                    }
                  />
                );
              })}
            </Scroller>
          </Tabs.List>
          <Tabs.Panel value={galleryTabValue}>
            {viewportRef.current &&
              <ImagesView viewData={StorageService.getMainViewTabData(FiltersService.defaultFilter)} isDefault={true}
                          containerRef={containerRef} stickyControlBar={true} onEmptyResults={() => {
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
              }} scrollRootRef={viewportRef} displayDetailInContainer={true} />}
          </Tabs.Panel>
          {tabs.map((tab) => (
            <Tabs.Panel key={`panel-${tab.id}`} value={tab.id}>
              {viewportRef.current && <ImagesView
                viewData={{
                  mode: tab.data.mode,
                  pinnable: tab.data.pinnable,
                  filterOrCollectionId: tab.data.filterOrCollectionId
                }}
                isDefault={false}
                containerRef={containerRef}
                onEmptyResults={() => (<EmptyResults
                  icon={<IconPhotoSearch size={140} stroke={1} />}
                  description={t("emptyImages.description")}
                  title={t("emptyImages.title")}
                />)}
                stickyControlBar={true}
                scrollRootRef={viewportRef}
                displayDetailInContainer={true}
              />
              }
            </Tabs.Panel>
          ))}
        </Tabs>
      </ScrollArea>}
    </div>
  );
}
