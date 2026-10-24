import React, { ReactElement, useEffect, useState } from "react";
import { Box, Stack } from "@mantine/core";

import { DeskTabType } from "types";
import { StackableScreen } from "app/components";
import DeskTabContent from "../DeskTabContent/DeskTabContent.tsx";
import { TabDetailsOverlay, TabHeader } from "../index.ts";


export interface DeskTabPanelPropsType
{

  readonly tab: DeskTabType;
  readonly isActive: boolean;

}

function DeskTabPanel({ tab, isActive }: DeskTabPanelPropsType): ReactElement
{
  const [ hasBeenActive, setHasBeenActive ] = useState<boolean>(isActive);
  const [ isDetailsOpen, setIsDetailsOpen ] = useState<boolean>(false);

  useEffect(() =>
  {
    setIsDetailsOpen(false);
  }, [ tab.id ]);

  useEffect(() =>
  {
    if (isActive === true && hasBeenActive === false)
    {
      setHasBeenActive(true);
    }
  }, [ isActive, hasBeenActive ]);

  const shouldRenderContent = isActive === true || hasBeenActive === true;

  return (
    <Box
      pos="absolute"
      inset={0}
      display={isActive === true ? "block" : "none"}
      style={{ overflow: "hidden" }}
    >
      <StackableScreen>
        <Stack h="100%" w="100%" gap={0} style={{ overflow: "hidden" }}>
          <TabHeader
            tab={tab}
            isDetailsOpen={isDetailsOpen}
            onToggleDetails={() =>
            {
              setIsDetailsOpen((previousState) => !previousState);
            }}
          />
          <Box flex={1} pos="relative" style={{ overflow: "hidden" }}>
            {shouldRenderContent === true && <DeskTabContent tab={tab}/>}
            <TabDetailsOverlay
              tab={tab}
              isOpened={isDetailsOpen}
              onClose={() =>
              {
                setIsDetailsOpen(false);
              }}
            />
          </Box>
        </Stack>
      </StackableScreen>
    </Box>
  );
}

export default React.memo(DeskTabPanel);
