import React, { useState } from "react";
import { Input, Tabs } from "@mantine/core";
import { IconPhoto, IconX } from "@tabler/icons-react";

import { Container, GalleryView, MasonryVisualizer } from "app/components";
import { useGalleryTabsContext } from "app/context";
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
      key={"tab-" + tab.id}
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
  const [tabs, , removeFromStack, { activeTab, setActiveTab }] =
    useGalleryTabsContext();

  function handleOnRemoveTab(tabId, nextTabValue) {
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
    return "gallery";
  }

  return (
    <div>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="gallery" leftSection={<IconPhoto size={13} />}>
            Explore
          </Tabs.Tab>
          {tabs?.map((tab, index) => {
            return (
              <GalleryTab
                tab={tab}
                onRemove={() =>
                  handleOnRemoveTab(tab.id, computeNextTabValue(index))
                }
              />
            );
          })}
        </Tabs.List>

        <Tabs.Panel value="gallery">
          <GalleryView />
        </Tabs.Panel>

        {tabs?.map((tab) => (
          <Tabs.Panel key={tab.id} value={tab.id}>
            {tab.type === "Masonry" ? (
              <Container>
                <MasonryVisualizer
                  description={tab.description}
                  imageIds={tab.data.imageIds}
                />
              </Container>
            ) : (
              <GalleryView
                initialFilters={{
                  ...tab.data.criteria,
                }}
              />
            )}
          </Tabs.Panel>
        ))}
      </Tabs>
    </div>
  );
}
