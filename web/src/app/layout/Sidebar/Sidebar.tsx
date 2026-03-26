import { useTranslation } from "react-i18next";
import React, { ReactNode, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Stack, Tooltip, UnstyledButton } from "@mantine/core";
import { IconActivity, IconAdjustmentsHorizontal, IconBox, IconFolderOpen, IconPhotoMinus } from "@tabler/icons-react";

import { UserInterfaceAnchor } from "@picteus/ws-client";

import { computeExtensionSidebarRoute, ROUTES } from "utils";
import style from "./Sidebar.module.scss";

import { useAdditionalUiContext, useCommandSocket, useEventSocket } from "app/context";
import { ExtensionsService } from "app/services";
import { useOpenWindow } from "app/hooks";
import { ChannelEnum, computeResourceTypeUrl } from "types";

interface NavbarLinkProps {
  icon: ReactNode;
  label: string;
  route: string;
  onClick?(): void;
}

function NavbarLink({ icon, label, route, onClick }: NavbarLinkProps) {
  const { pathname } = useLocation();
  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton
        onClick={onClick}
        className={style.iconLink}
        data-active={pathname === route || undefined}
      >
        {icon}
      </UnstyledButton>
    </Tooltip>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const [additionalUiContextValue, refreshAdditionalUi] = useAdditionalUiContext();
  const eventSocket = useEventSocket();
  const openWindow = useOpenWindow();
  const [t] = useTranslation();

  useEffect(() => {
    if (eventSocket?.channel === ChannelEnum.EXTENSION_UPDATED || eventSocket?.channel === ChannelEnum.EXTENSION_INSTALLED || eventSocket?.channel === ChannelEnum.EXTENSION_UNINSTALLED || eventSocket?.channel === ChannelEnum.EXTENSION_PAUSED || eventSocket?.channel === ChannelEnum.EXTENSION_RESUMED) {
      void ExtensionsService.fetchAll().then(() => {
        refreshAdditionalUi();
      });
    }
  }, [eventSocket]);
  const { sendCommand, isAvailable } = useCommandSocket();

  const additionalElements = useMemo(() => {
    return additionalUiContextValue.sidebar.map((element) => {
      const routePathFragment = computeExtensionSidebarRoute(element.uuid);
      return (
        // TODO: handle the case of the closeable items
        <NavbarLink
          key={"navbarLink-" + element.title}
          icon={<img className={style.icon} src={computeResourceTypeUrl(element.icon)} alt="Extension anchor" />}
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
                  console.error("Cannot handle a content with no 'url' property when no host is available");
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
                  console.error("Cannot handle a content with no 'frameContent.url' nor 'frameContent.html' property");
                  return;
                }
                openWindow(element.uuid, parameters, false).catch(error => console.error(`Cannot open the window. Reason: '${error.message}'`));
                }
              }
          }
        }
        />
      );
    });
  }, [additionalUiContextValue, sendCommand, isAvailable]);

  const commonIconStyle = useMemo(
    () => ({
      width: 20,
      height: 20,
      stroke: 1.5,
    }),
    [],
  );

  return (
    <nav className={style.container}>
      <Stack justify="center" gap={15}>
        <NavbarLink
          icon={<IconPhotoMinus {...commonIconStyle} />}
          label={t("menu.gallery")}
          route={ROUTES.home}
          onClick={() => navigate(ROUTES.home)}
        />
        <NavbarLink
          icon={<IconFolderOpen {...commonIconStyle} />}
          label={t("menu.repositories")}
          route={ROUTES.repositories}
          onClick={() => navigate(ROUTES.repositories)}
        />
        <NavbarLink
          icon={<IconBox {...commonIconStyle} />}
          label={t("menu.extensions")}
          route={ROUTES.extensions}
          onClick={() => navigate(ROUTES.extensions)}
        />
        <NavbarLink
          icon={<IconActivity {...commonIconStyle} />}
          label={t("menu.activity")}
          route={ROUTES.activity}
          onClick={() => navigate(ROUTES.activity)}
        />
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
