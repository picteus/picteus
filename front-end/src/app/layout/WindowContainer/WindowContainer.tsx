import { type ReactElement, type ReactNode } from "react";
import { Box, Flex } from "@mantine/core";

import { TitleBarProvider } from "app/context";
import TitleBar from "../TitleBar/TitleBar.tsx";


export interface WindowContainerPropsType
{
  readonly children: ReactNode;
  readonly titleBarContent?: ReactNode;
}

export default function WindowContainer({ children, titleBarContent }: WindowContainerPropsType): ReactElement
{
  return (
    <TitleBarProvider>
      <Flex direction="column" w="100vw" h="100vh" style={{ overflow: "hidden" }}>
        <TitleBar>
          {titleBarContent}
        </TitleBar>
        <Box
          flex={1}
          w="100%"
          h="100%"
          pos="relative"
          style={{ overflow: "hidden", transform: "translate(0, 0)" }}
        >
          {children}
        </Box>
      </Flex>
    </TitleBarProvider>
  );
}
