import React, { useRef, useState } from "react";
import { Input, ScrollArea, Tabs } from "@mantine/core";
import { IconPhoto, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Container, GalleryView, MasonryVisualizer } from "app/components";
import { useGalleryTabsContext } from "app/context";
import { useContainerDimensions } from "app/hooks";
import style from "./GalleryScreen.module.scss";


function GalleryTab({ tab, onRemove }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tabLabel, setTabLabel] = useState(tab.label);
  const [, , , { renameTab }] = useGalleryTabsContext();
  const tabStyle = {
    tab: {
      padding: "10px 6px 10px 10px",
    },
  };

  function handleOnDoubleclickTabLabel() {
    setIsEditing(true);
  }

  function handleOnChangeTabLabel(event) {
    setTabLabel(event.target.value);
  }

  function onFinishEditing() {
    renameTab(tab.id, tabLabel);
    setIsEditing(false);
  }

  return (
    <Tabs.Tab
      styles={tabStyle}
      className={style.tabItem}
      value={tab.id}
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
        <div onDoubleClick={handleOnDoubleclickTabLabel}>{tabLabel}</div>
      )}
    </Tabs.Tab>
  );
}

export default function GalleryScreen() {
  const [t] = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerDimensions(containerRef);
  const [tabs, , removeFromStack, { activeTab, setActiveTab }, galleryTabValue] = useGalleryTabsContext();

  function handleOnRemoveTab(tabId: string, nextTabValue: string) {
    removeFromStack(tabId);
    if (tabId === activeTab) {
      setActiveTab(nextTabValue);
    }
  }

  function computeNextTabValue(index) {
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
      {containerRef.current && <ScrollArea h={height}>
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
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
          </Tabs.List>
          <Tabs.Panel value={galleryTabValue}>
            <GalleryView containerWidth={width}/>
          </Tabs.Panel>
          {tabs.map((tab) => (
            <Tabs.Panel key={`panel-${tab.id}`} value={tab.id}>
              {tab.type === "Masonry" ? (
                <Container>
                  <MasonryVisualizer
                    id={tab.id}
                    description={tab.description}
                    imageIds={tab.data.imageIds}
                    containerWidth={width}
                  />
                </Container>
              ) : (
                <GalleryView
                  initialFilterOrCollectionId={tab.data.filterOrCollectionId}
                  containerWidth={width}
                />
              )}
            </Tabs.Panel>
          ))}
        </Tabs>
      </ScrollArea>}
    </div>
  );
}
