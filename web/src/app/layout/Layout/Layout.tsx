import React, { ReactNode, useCallback } from "react";
import { Flex } from "@mantine/core";

import { Sidebar } from "app/layout";
import { EventInformation, GeneralCommands, NotificationToolbar } from "app/components";

import { IntentCenter, NotificationCenter, SelectedImagesAffix } from "./components";
import style from "./Layout.module.scss";

export default function Layout({ children }: { children: ReactNode }) {
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
      <div className={style.mainContainer}>
        <Sidebar />
        <div id="content-wrapper" className={style.contentWrapper}>
          <div className={style.mainContent}>{children}</div>
          <div className={style.bottomBar}>
            <EventInformation />
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
