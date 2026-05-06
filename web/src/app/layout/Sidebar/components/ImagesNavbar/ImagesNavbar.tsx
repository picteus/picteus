import React, { ChangeEvent, ReactNode, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ActionIcon, Input, Menu, Tooltip, UnstyledButton } from "@mantine/core";
import { IconExternalLink, IconPhoto, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { TabsType } from "types";
import { useImagesTabsContext } from "app/context";
import { ExtensionIcon } from "app/components";

import style from "./ImagesNavbar.module.scss";


interface NavbarLinkType {
  icon: ReactNode;
  externalLink?: boolean;
  label: string;
  route: string;
  onClick?(): void;
}

export function NavbarLink({ icon, externalLink, label, route, onClick }: NavbarLinkType) {
  const { pathname } = useLocation();
  return (
    <Tooltip label={label} position="right">
      <UnstyledButton
        onClick={onClick}
        className={style.iconLink}
        data-active={pathname === route || undefined}
      >
        {icon}
        {externalLink === true && <IconExternalLink
          className={style.externalLinkIcon}
          stroke={1.5}
          size={14}
        />}
      </UnstyledButton>
    </Tooltip>
  );
}

function ImagesNavbarMenuItem({ tab, onRemove, isActive, onClick }: { tab: TabsType, onRemove: () => void, isActive: boolean, onClick: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tabLabel, setTabLabel] = useState(tab.content.title);
  const { state } = useImagesTabsContext();

  function handleOnDoubleClickTabLabel(event: React.MouseEvent) {
    event.stopPropagation();
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
    <Menu.Item
      leftSection={tab.extensionId !== undefined ? <ExtensionIcon idOrExtension={tab.extensionId} size="sm" /> : <IconPhoto size={13} />}
      onClick={() => { if (!isEditing) onClick(); }}
      style={{ backgroundColor: isActive ? 'var(--mantine-color-blue-light)' : undefined, color: isActive ? 'var(--mantine-color-blue-light-color)' : undefined }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        {isEditing ? (
          <Input
            size="xs"
            onClick={(event: React.MouseEvent) => event.stopPropagation()}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Enter") onFinishEditing();
            }}
            onBlur={onFinishEditing}
            onChange={handleOnChangeTabLabel}
            value={tabLabel}
            autoFocus
          />
        ) : (
          <div onDoubleClick={handleOnDoubleClickTabLabel} style={{ flexGrow: 1, minWidth: '100px' }}>{tabLabel}</div>
        )}
        <ActionIcon
          size="xs"
          variant="subtle"
          color={isActive ? "blue" : "gray"}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <IconX size={14} />
        </ActionIcon>
      </div>
    </Menu.Item>
  );
}

export function ImagesNavbarLink({ icon, label, route }: NavbarLinkType) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { tabs, removeTab, state, mainTabValue } = useImagesTabsContext();
  const [t] = useTranslation();
  const [opened, setOpened] = useState(false);

  function handleOnRemoveTab(tabId: string, index: number) {
    let nextTabId: string;
    if (index + 1 < tabs.length) {
      nextTabId = tabs[index + 1].id;
    }
    else if (index - 1 >= 0) {
      nextTabId = tabs[index - 1].id;
    }
    else {
      nextTabId = mainTabValue;
    }

    removeTab(tabId);
    if (tabId === state.activeTab) {
      state.setActiveTab(nextTabId);
    }
  }

  const navigateAndSetExplore = () => {
    navigate(route);
    state.setActiveTab(mainTabValue);
    setOpened(false);
  };

  return (
    <Menu trigger="hover" position="right-start" withArrow opened={opened} onChange={setOpened} offset={12} closeDelay={400}>
      <Menu.Target>
        <div style={{ display: 'flex' }}>
          <Tooltip label={label} position="right" disabled={opened}>
            <UnstyledButton
              onClick={navigateAndSetExplore}
              className={style.iconLink}
              data-active={pathname === route || undefined}
            >
              {icon}
            </UnstyledButton>
          </Tooltip>
        </div>
      </Menu.Target>

      <Menu.Dropdown onMouseEnter={() => setOpened(true)} onMouseLeave={() => setOpened(false)}>
        <Menu.Item
          leftSection={<IconPhoto size={13} />}
          onClick={navigateAndSetExplore}
          style={{ backgroundColor: state.activeTab === mainTabValue ? 'var(--mantine-color-blue-light)' : undefined, color: state.activeTab === mainTabValue ? 'var(--mantine-color-blue-light-color)' : undefined }}
        >
          {t("imagesScreen.explore", "Explore")}
        </Menu.Item>
        {tabs.length > 0 && <Menu.Divider />}
        {tabs.map((tab, index) => (
          <ImagesNavbarMenuItem
            key={tab.id}
            tab={tab}
            isActive={state.activeTab === tab.id}
            onClick={() => {
              navigate(route);
              state.setActiveTab(tab.id);
              setOpened(false);
            }}
            onRemove={() => handleOnRemoveTab(tab.id, index)}
          />
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
