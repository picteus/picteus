import { ReactElement, ReactNode } from "react";
import { ActionIcon, Box, Menu } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";

import Common from "../Common/Common.ts";


type OverflowMenuPropsType = {
  readonly children: ReactNode;
  readonly width: number;
};

export default function OverflowMenu({
  children,
  width
}: OverflowMenuPropsType): ReactElement
{
  return (
    // The wrapper stops clicks from bubbling to a clickable ancestor (card, table row);
    // the dropdown handler does the same for menu item clicks, which bubble through the React tree despite the portal
    <Box onClick={event => event.stopPropagation()}>
      <Menu shadow="md" width={width} withinPortal>
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray">
            <IconDots size={Common.IconSmallSize} stroke={Common.IconStrokeSize}/>
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown onClick={event => event.stopPropagation()}>
          {children}
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
}
