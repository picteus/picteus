import React, { ReactNode } from "react";
import { Group, Menu, PopoverWidth, UnstyledButton } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";


import style from "./StandardMenu.module.scss";


type StandardMenuType = {
  targetChildren: ReactNode;
  dropdownChildren: ReactNode;
  width: PopoverWidth;
};

export default function StandardMenu({ targetChildren, dropdownChildren, width }: StandardMenuType)
{
  return (<Menu
      withinPortal={false}
      position="bottom-end"
      trigger="hover"
      shadow="md"
      width={width}
    >
      <Menu.Target>
        <UnstyledButton className={style.content}>
          <Group gap="sm">
            {targetChildren}
          </Group>
          <IconChevronDown size={16}/>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        {dropdownChildren}
      </Menu.Dropdown>
    </Menu>
  );
}
