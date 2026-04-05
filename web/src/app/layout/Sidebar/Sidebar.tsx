import { useTranslation } from "react-i18next";
import React, { ReactNode, useEffect, useMemo, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Stack, Tooltip, UnstyledButton } from "@mantine/core";
import {
  IconActivity,
  IconAdjustmentsHorizontal,
  IconBox,
  IconExternalLink,
  IconFolderOpen,
  IconPhotoMinus
} from "@tabler/icons-react";

import { UserInterfaceAnchor } from "@picteus/ws-client";

import { computeExtensionSidebarRoute, notifyError, notifyErrorWithError, ROUTES } from "utils";
import style from "./Sidebar.module.scss";

import { useAdditionalUiContext, useCommandSocket, useEventSocket } from "app/context";
import { ExtensionsService } from "app/services";
import { ExtensionIcon } from "app/components";
import { useOpenWindow } from "app/hooks";
import { ChannelEnum, computeResourceTypeUrl } from "types";

interface NavbarLinkProps {
  icon: ReactNode;
  externalLink?: boolean;
  label: string;
  route: string;
  onClick?(): void;
}

function NavbarLink({ icon, externalLink, label, route, onClick }: NavbarLinkProps) {
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

  const additionalElements = useMemo(() => {
    return additionalUiContextValue.sidebar.map((element) => {
      const routePathFragment = computeExtensionSidebarRoute(element.uuid);
      return (
        // TODO: handle the case of the closeable items
        <NavbarLink
          key={"navbarLink-" + element.title}
          icon={<ExtensionIcon id={element.extensionId} url={computeResourceTypeUrl(element.icon)} size="md" />}
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
  }, [additionalUiContextValue, isAvailable]);

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
