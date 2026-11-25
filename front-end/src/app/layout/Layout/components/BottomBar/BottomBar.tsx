import React, { ReactElement, RefObject } from "react";
import { Flex } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { useContainerDimensions } from "app/hooks";
import { APP_SCREENS, Common } from "app/components";
import { EventInformation } from "./components";
import { SidebarLink } from "../../../Sidebar/components";

import style from "./BottomBar.module.scss";


type BottomBarType = { containerRef: RefObject<HTMLElement> };

export default function BottomBar({ containerRef }: BottomBarType): ReactElement
{
  const [ t ] = useTranslation();
  const { height } = useContainerDimensions(containerRef);
  const activityScreen = APP_SCREENS.activity;
  const ActivityIcon = activityScreen.icon;

  return (
    <>
      <Flex align="center" className={style.bottomBar} gap={10}>
        <SidebarLink
          icon={<ActivityIcon stroke={Common.IconStrokeSize}/>}
          label={t(activityScreen.titleKey)}
          route={activityScreen.route}
        />
        <EventInformation containerHeight={height}/>
      </Flex>
    </>
  );
}
