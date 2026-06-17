import React, { RefObject } from "react";
import { Flex } from "@mantine/core";
import { IconActivity } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ROUTES } from "utils";
import { useContainerDimensions } from "app/hooks";
import { Common } from "app/components";
import { EventInformation } from "./components";
import { NavbarLink } from "../../../Sidebar/components";

import style from "./BottomBar.module.scss";


type BottomBarType = { containerRef: RefObject<HTMLElement> };

export default function BottomBar({ containerRef }: BottomBarType)
{
  const [t] = useTranslation();
  const { height } = useContainerDimensions(containerRef);

  return (
    <>
      <Flex align="center" className={style.bottomBar} gap={10}>
        <NavbarLink icon={<IconActivity stroke={Common.IconStrokeSize}/>} label={t("menu.activity")}
                    route={ROUTES.activity}/>
        <EventInformation containerHeight={height}/>
      </Flex>
    </>
  );
}
