import React, { useRef, useState } from "react";
import { Input, ScrollArea, Scroller, Tabs } from "@mantine/core";
import { IconPhoto, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { TabsType } from "types";
import { useGalleryTabsContext } from "app/context";
import { useContainerDimensions } from "app/hooks";
import { Container, ExtensionIcon, GalleryView, MasonryVisualizer } from "app/components";

import style from "./GalleryScreen.module.scss";

``


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
      leftSection={tab.extensionId !== undefined ? <ExtensionIcon id={tab.extensionId} size="sm" /> :
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
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerDimensions(containerRef);
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
              <GalleryView containerWidth={width} containerHeight={height} containerRef={containerRef} scrollRootRef={viewportRef} />}
          </Tabs.Panel>
          {tabs.map((tab) => (
            <Tabs.Panel key={`panel-${tab.id}`} value={tab.id}>
              {tab.type === "Masonry" ? (
                <Container>
                  <MasonryVisualizer
                    content={tab.content}
                    imageIds={tab.data.imageIds}
                  />
                </Container>
              ) : (
                viewportRef.current && <GalleryView
                  initialFilterOrCollectionId={tab.data.filterOrCollectionId}
                  containerWidth={width}
                  containerHeight={height}
                  containerRef={containerRef}
                  scrollRootRef={viewportRef}
                />
              )}
            </Tabs.Panel>
          ))}
        </Tabs>
      </ScrollArea>}
    </div>
  );
}
