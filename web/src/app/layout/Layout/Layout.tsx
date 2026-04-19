import React, { ReactNode, useCallback, useRef } from "react";
import { Flex } from "@mantine/core";

import { Sidebar } from "app/layout";
import { BottomBar, GeneralCommands, NotificationToolbar } from "app/components";
import { IntentCenter, Modals, NotificationCenter, SelectedImagesAffix } from "./components";

import style from "./Layout.module.scss";


export default function Layout({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contextualComponents = useCallback(() => {
    return (
      <>
        <Modals/>
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
          <BottomBar containerRef={containerRef} />
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
