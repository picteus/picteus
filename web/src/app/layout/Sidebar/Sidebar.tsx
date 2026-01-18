import { useTranslation } from "react-i18next";
import React, { ReactNode, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Stack, Tooltip, UnstyledButton } from "@mantine/core";
import { IconActivity, IconAdjustmentsHorizontal, IconBox, IconFolderOpen, IconPhotoMinus } from "@tabler/icons-react";

import { UserInterfaceAnchor } from "@picteus/ws-client";

import { ROUTES } from "utils";
import style from "./Sidebar.module.scss";

import { useAdditionalUiContext, useCommandSocket, useEventSocket } from "app/context";
import { ExtensionsService } from "app/services";
import { ChannelEnum } from "types";

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
  const [additionalUi, , refreshAdditionalUi] = useAdditionalUiContext();
  const eventSocket = useEventSocket();
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
    return additionalUi.sidebar?.map((element) => {
      return (
        <NavbarLink
          key={"navbarLink-" + element.title}
          icon={<img src={element.iconURL} alt="Extension anchor" />}
          label={element.title}
          route={ROUTES.extension_sidebar_suffix + element.extensionId}
          onClick={() =>
            element.anchor === UserInterfaceAnchor.Sidebar ? navigate(ROUTES.extension_sidebar_suffix + element.extensionId) : (isAvailable() === false ? window.open(element.url, "_blank") : sendCommand("openWindow", {
              url: element.url
            }))
          }
        />
      );
    });
  }, [additionalUi, sendCommand, isAvailable]);

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
