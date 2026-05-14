import React, { ReactNode, useCallback, useRef } from "react";
import { ActionIcon, Flex, HoverCard, Indicator } from "@mantine/core";
import { IconPhoto } from "@tabler/icons-react";

import { Sidebar } from "app/layout";
import { BottomBar, Common, GeneralCommands, NotificationToolbar } from "app/components";
import { IntentCenter, Modals, NotificationCenter, SelectedImages } from "./components";

import style from "./Layout.module.scss";
import { useImagesSelectedContext } from "../../context";


export default function Layout({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectedImages} = useImagesSelectedContext();
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
          <Flex gap={12} direction="column">
            <NotificationToolbar />
            <HoverCard
              withinPortal={false}
              position="left"
              shadow="lg"
              withArrow
              arrowSize={15}
              offset={15}
              closeDelay={300}
            >
              <HoverCard.Target>
                <Indicator inline color="orange" label={selectedImages.length} size={16}>
                  <ActionIcon variant="outline" size="md">
                    <IconPhoto stroke={Common.IconStrokeSize} />
                  </ActionIcon>
                </Indicator>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <SelectedImages onProcessing={()=>{}}/>
              </HoverCard.Dropdown>
            </HoverCard>
            <GeneralCommands />
          </Flex>
        </div>
      </div>
    </>
  );
}
