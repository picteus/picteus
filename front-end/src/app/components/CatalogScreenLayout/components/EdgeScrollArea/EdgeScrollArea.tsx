import { ReactElement, ReactNode } from "react";
import { Flex } from "@mantine/core";

import variables from "assets/style/variablesExport.module.scss";
import FlexScrollArea from "../../../FlexScrollArea/FlexScrollArea.tsx";


type EdgeScrollAreaPropsType = {
  readonly children: ReactNode;
};

export default function EdgeScrollArea({
  children
}: EdgeScrollAreaPropsType): ReactElement
{
  const margin = 6;

  return (
    <FlexScrollArea
      mt={-margin}
      ml={-margin}
      mb={-margin}
      mr={`-${variables.contentPaddingHorizontal}`}
      isContentFlex
    >
      <Flex
        direction="column"
        flex={1}
        pt={margin}
        pl={margin}
        pb={margin}
        pr={variables.contentPaddingHorizontal}
      >
        {children}
      </Flex>
    </FlexScrollArea>
  );
}
