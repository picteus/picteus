import { useTranslation } from "react-i18next";
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Divider, ScrollArea, Stack } from "@mantine/core";

import { UserInterfaceAnchor } from "@picteus/ws-client";

import { computeExtensionSidebarRoute, ToastService } from "utils";
import { useAdditionalUiContext, useCommandSocket } from "app/context";
import { APP_SCREENS, Common, ExtensionIcon, PRIMARY_SIDEBAR_SCREENS } from "app/components";
import { useOpenWindow } from "app/hooks";
import { computeResourceTypeUrl } from "types";
import { SidebarLink } from "./components";

import style from "./Sidebar.module.scss";


export default function Sidebar()
{
  const navigate = useNavigate();
  const [ additionalUiContextValue ] = useAdditionalUiContext();
  const openWindow = useOpenWindow();
  const [ t ] = useTranslation();

  const { isAvailable } = useCommandSocket();

  const commonIconStyle = useMemo(() => ({ stroke: Common.IconStrokeSize }), []);

  const mainElements = useMemo(() => (PRIMARY_SIDEBAR_SCREENS.map(screen =>
  {
    const ScreenIcon = screen.icon;
    return (
      <SidebarLink
        key={screen.route}
        icon={<ScreenIcon {...commonIconStyle} />}
        label={t(screen.titleKey)}
        route={screen.route}
      />
    );
  })), [ commonIconStyle, t ]);

  const additionalElements = useMemo(() =>
  {
    return additionalUiContextValue.sidebar.map((element) =>
    {
      const routePathFragment = computeExtensionSidebarRoute(element.uuid);
      return (
        // TODO: handle the case of the closeable items
        <SidebarLink
          key={element.uuid}
          icon={<ExtensionIcon idOrExtension={element.extensionId} url={computeResourceTypeUrl(element.icon)}
                               size="md"/>}
          externalLink={element.integration.anchor === UserInterfaceAnchor.Sidebar && element.integration.isExternal === true}
          label={element.title}
          route={routePathFragment}
          onClick={() =>
          {
            if (element.integration.anchor === UserInterfaceAnchor.Sidebar && element.integration.isExternal === false)
            {
              navigate(routePathFragment);
            }
            else
            {
              const content = element.content;
              if (isAvailable() === false)
              {
                if ("url" in content)
                {
                  const url = content.url;
                  window.open(url, "_blank");
                }
                else
                {
                  ToastService.failure("Cannot handle a content with no 'url' property when no host is available");
                }
              }
              else
              {
                let parameters;
                if ("url" in content)
                {
                  parameters = { url: content.url };
                }
                else if ("inline" in content)
                {
                  parameters = { inline: content.inline };
                }
                else
                {
                  return ToastService.failure("Cannot handle a content with no 'documentContent.url' nor 'documentContent.inline' property");
                }
                openWindow(element.uuid, parameters, false).catch(error => ToastService.failureAndMessage(error, "Cannot open the window"));
              }
            }
          }
          }
        />
      );
    });
  }, [ additionalUiContextValue, isAvailable, navigate, openWindow ]);

  const settingsScreen = APP_SCREENS.settings;
  const SettingsIcon = settingsScreen.icon;

  return (
    <nav className={style.container}>
      <Stack gap={15} align="stretch" className={style.wrapper}>
        <Stack gap={15}>{mainElements}</Stack>
        <Divider/>
        <ScrollArea
          flex={1}
          scrollbarSize={5}
          scrollbars="y"
          className={style.additional}
        >
          <Stack gap={15} justify="start">
            {additionalElements}
          </Stack>
        </ScrollArea>
        <SidebarLink
          icon={<SettingsIcon {...commonIconStyle} />}
          label={t(settingsScreen.titleKey)}
          route={settingsScreen.route}
        />
      </Stack>
    </nav>
  );
}
