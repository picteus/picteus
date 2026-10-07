import React, { ReactElement } from "react";
import { Box, Stack } from "@mantine/core";

import { DeskTabType } from "types";
import { StackableScreen } from "app/components";
import DeskTabContent from "../DeskTabContent/DeskTabContent.tsx";
import TabHeader from "../TabHeader/TabHeader.tsx";


export interface DeskTabPanelPropsType
{

  readonly tab: DeskTabType;
  readonly isActive: boolean;

}

function DeskTabPanel({ tab, isActive }: DeskTabPanelPropsType): ReactElement
{
  return (
    <Box
      pos="absolute"
      inset={0}
      display={isActive === true ? "block" : "none"}
      style={{ overflow: "hidden" }}
    >
      <StackableScreen>
        <Stack h="100%" w="100%" gap={0} style={{ overflow: "hidden" }}>
          <TabHeader tab={tab}/>
          <Box flex={1} pos="relative" style={{ overflow: "hidden" }}>
            <DeskTabContent tab={tab}/>
          </Box>
        </Stack>
      </StackableScreen>
    </Box>
  );
}

export default React.memo(DeskTabPanel);
