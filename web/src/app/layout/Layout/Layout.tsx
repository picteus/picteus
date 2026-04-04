import React, { ReactNode, useCallback, useRef } from "react";
import { Flex } from "@mantine/core";

import { Sidebar } from "app/layout";
import { EventInformation, GeneralCommands, NotificationToolbar } from "app/components";
import { IntentCenter, NotificationCenter, SelectedImagesAffix } from "./components";
import { useContainerDimensions } from "app/hooks";

import style from "./Layout.module.scss";


export default function Layout({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { height } = useContainerDimensions(containerRef);
  const contextualComponents = useCallback(() => {
    return (
      <>
        <IntentCenter />
        <SelectedImagesAffix />
        <NotificationCenter />
      </>
    );
  }, []);

  return (
    <>
      {contextualComponents()}
      <div ref={containerRef} className={style.mainContainer}>
        <Sidebar />
        <div id="content-wrapper" className={style.contentWrapper}>
          <div className={style.mainContent}>{children}</div>
          <div className={style.bottomBar}>
            <EventInformation containerHeight={height} />
          </div>
        </div>
        <div className={style.rightSidebar}>
          <Flex gap={12} direction="column">
            <NotificationToolbar />
            <GeneralCommands />
          </Flex>
        </div>
      </div>
    </>
  );
}
