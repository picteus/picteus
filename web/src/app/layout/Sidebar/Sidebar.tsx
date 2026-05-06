import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { Stack } from "@mantine/core";
import {
  IconActivity,
  IconAdjustmentsHorizontal,
  IconBox,
  IconFolderOpen,
  IconLibraryPhoto,
  IconPhotoMinus
} from "@tabler/icons-react";

import { UserInterfaceAnchor } from "@picteus/ws-client";

import { computeExtensionSidebarRoute, notifyError, notifyErrorWithError, ROUTES } from "utils";
import { useAdditionalUiContext, useCommandSocket, useEventSocket } from "app/context";
import { ExtensionsService } from "app/services";
import { ExtensionIcon } from "app/components";
import { useOpenWindow } from "app/hooks";
import { ChannelEnum, computeResourceTypeUrl } from "types";
import { ImagesNavbarLink, NavbarLink } from "./components";

import style from "./Sidebar.module.scss";


export default function Sidebar() {
  const navigate = useNavigate();
  const [additionalUiContextValue, refreshAdditionalUi] = useAdditionalUiContext();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const openWindow = useOpenWindow();
  const [t] = useTranslation();

  useEffect(() => {
    if (event === undefined) {
      return;
    }
    if (event.channel === ChannelEnum.EXTENSION_UPDATED || event.channel === ChannelEnum.EXTENSION_INSTALLED || event.channel === ChannelEnum.EXTENSION_UNINSTALLED || event.channel === ChannelEnum.EXTENSION_PAUSED || event.channel === ChannelEnum.EXTENSION_RESUMED) {
      void ExtensionsService.fetchAll().then(() => {
        refreshAdditionalUi();
      });
    }
  }, [event]);
  const { isAvailable } = useCommandSocket();

  const commonIconStyle = useMemo(
    () => ({
      width: 20,
      height: 20,
      stroke: 1.5,
    }),
    [],
  );

  const mainElementData = [
    { route: ROUTES.home, label: "images", icon: <IconPhotoMinus {...commonIconStyle} /> },
    { route: ROUTES.repositories, label: "repositories", icon: <IconFolderOpen {...commonIconStyle} /> },
    { route: ROUTES.collections, label: "collections", icon: <IconLibraryPhoto {...commonIconStyle} /> },
    { route: ROUTES.extensions, label: "extensions", icon: <IconBox {...commonIconStyle} /> },
    { route: ROUTES.activity, label: "activity", icon: <IconActivity {...commonIconStyle} /> }
  ];

  const mainElements = useMemo(() => (mainElementData.map(element => {
    if (element.route === ROUTES.home) {
      return (
        <ImagesNavbarLink
          key={element.route}
          icon={element.icon}
          label={t("menu." + element.label)}
          route={element.route}
        />
      );
    }
    return (
      <NavbarLink
        key={element.route}
        icon={element.icon}
        label={t("menu." + element.label)}
        route={element.route}
        onClick={() => navigate(element.route)}
      />
    );
  })), [mainElementData]);

  const additionalElements = useMemo(() => {
    return additionalUiContextValue.sidebar.map((element) => {
      const routePathFragment = computeExtensionSidebarRoute(element.uuid);
      return (
        // TODO: handle the case of the closeable items
        <NavbarLink
          key={`navbarLink-${element.uuid}`}
          icon={<ExtensionIcon idOrExtension={element.extensionId} url={computeResourceTypeUrl(element.icon)} size="md" />}
          externalLink={element.integration.anchor === UserInterfaceAnchor.Sidebar && element.integration.isExternal === true}
          label={element.title}
          route={routePathFragment}
          onClick={() => {
            if (element.integration.anchor === UserInterfaceAnchor.Sidebar && element.integration.isExternal === false) {
              navigate(routePathFragment);
            }
            else {
              const content = element.content;
              if (isAvailable() === false){
                if ("url" in content) {
                  const url = content.url;
                  window.open(url, "_blank");
                }
                else {
                  notifyError("Cannot handle a content with no 'url' property when no host is available");
                }
              }
              else {
                let parameters;
                if ("url" in content) {
                  parameters = { url: content.url };
                }
                else if ("html" in content) {
                  parameters = { html: content.html };
                }
                else {
                  return notifyError("Cannot handle a content with no 'frameContent.url' nor 'frameContent.html' property");
                }
                openWindow(element.uuid, parameters, false).catch(error => notifyErrorWithError(error, "Cannot open the window"));
                }
              }
          }
        }
        />
      );
    });
  }, [additionalUiContextValue, isAvailable, navigate, openWindow]);

  return (
    <nav className={style.container}>
      <Stack justify="center" gap={15}>
        {mainElements}
        {additionalElements}
        <NavbarLink
          icon={<IconAdjustmentsHorizontal {...commonIconStyle} />}
          label={t("menu.settings")}
          route={ROUTES.settings}
          onClick={() => navigate(ROUTES.settings)}
        />
      </Stack>
    </nav>
  );
}
