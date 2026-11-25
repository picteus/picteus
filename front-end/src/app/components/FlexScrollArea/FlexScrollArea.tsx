import { ReactElement, ReactNode, RefObject } from "react";
import { MantineSpacing, ScrollArea, StyleProp } from "@mantine/core";


type FlexScrollAreaPropsType =
  {
    readonly children: ReactNode;
    readonly scrollbars?: "y" | "xy";
    readonly offsetScrollbars?: boolean | "x" | "y" | "present";
    readonly isContentFlex?: boolean;
    readonly mt?: StyleProp<MantineSpacing>;
    readonly ml?: StyleProp<MantineSpacing>;
    readonly mb?: StyleProp<MantineSpacing>;
    readonly mr?: StyleProp<MantineSpacing>;
    readonly viewportRef?: RefObject<HTMLDivElement | null>;
    readonly onScrollPositionChange?: (position: { x: number; y: number }) => void;
  };

export default function FlexScrollArea({
  children,
  scrollbars = "y",
  offsetScrollbars,
  isContentFlex = false,
  mt,
  ml,
  mb,
  mr,
  viewportRef,
  onScrollPositionChange
}: FlexScrollAreaPropsType): ReactElement
{
  return (
    <ScrollArea
      flex={1}
      mih={0}
      mt={mt}
      ml={ml}
      mb={mb}
      mr={mr}
      type="auto"
      scrollbars={scrollbars}
      offsetScrollbars={offsetScrollbars}
      viewportRef={viewportRef}
      onScrollPositionChange={onScrollPositionChange}
      styles={{
        root: {
          display: "flex",
          flexDirection: "column"
        },
        viewport: isContentFlex === true
          ? {
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column"
          }
          : {
            flex: 1,
            minHeight: 0
          },
        content: isContentFlex === true
          ? {
            minHeight: "100%",
            display: "flex",
            flexDirection: "column",
            flex: "1 0 auto",
            width: "100%"
          }
          : undefined
      }}
    >
      {children}
    </ScrollArea>
  );
}
