import { type ReactElement, type ReactNode, useCallback } from "react";
import { Box, Group } from "@mantine/core";

import { useTitleBarContext } from "app/context";
import { UniversalActionCenterAccessor } from "./components/index.ts";
import style from "./TitleBar.module.scss";


interface TitleBarPropsType
{
  readonly children?: ReactNode;
}

export default function TitleBar({ children }: TitleBarPropsType): ReactElement
{
  const { setTitleBarElement } = useTitleBarContext();

  const handleRef = useCallback((element: HTMLDivElement | null) =>
    {
      setTitleBarElement(element);
    },
    [ setTitleBarElement ]
  );

  return (
    <Box className={style.titleBar}>
      <Group
        className={style.content}
        justify="space-between"
        align="center"
        wrap="nowrap"
        w="100%"
        h="100%"
      >
        <Box
          ref={handleRef}
          flex={1}
          style={{ overflow: "hidden", display: "flex", alignItems: "center", height: "100%" }}
        >
          {children}
        </Box>
        <Group gap="xs" wrap="nowrap" data-no-drag>
          <UniversalActionCenterAccessor/>
        </Group>
      </Group>
    </Box>
  );
}
