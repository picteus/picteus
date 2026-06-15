import React, { ReactNode, useCallback, useRef } from "react";
import { Flex } from "@mantine/core";

import { Sidebar } from "app/layout";
import { BottomBar, GeneralCommands, IntentCenter, Modals, NotificationCenter, Notifications } from "./components";
import { SelectedImagesHover } from "./components/index.ts";

import style from "./Layout.module.scss";


export default function Layout({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contextualComponents = useCallback(() => {
    return (
      <>
        <Modals/>
        <IntentCenter />
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
          <BottomBar containerRef={containerRef} />
        </div>
        <div className={style.rightSidebar}>
          <Flex gap={20} direction="column">
            <Notifications />
            <SelectedImagesHover/>
            <GeneralCommands />
          </Flex>
        </div>
      </div>
    </>
  );
}
