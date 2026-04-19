import React, { RefObject } from "react";

import { useContainerDimensions } from "app/hooks";
import { EventInformation } from "./components";

import style from "./BottomBar.module.scss";


type BottomBarType = { containerRef: RefObject<HTMLElement> };

export default function BottomBar({ containerRef }: BottomBarType) {
  const { height } = useContainerDimensions(containerRef);

  return (
    <div className={style.bottomBar}>
      <EventInformation containerHeight={height} />
    </div>
  );
}
