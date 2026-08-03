import React, { ReactNode } from "react";
import { Group, Menu, PopoverWidth, Text, UnstyledButton } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";


import style from "./StandardMenu.module.scss";


type StandardMenuType = {
  targetChildren: ReactNode;
  dropdownChildren: ReactNode;
  width: PopoverWidth;
};

export default function StandardMenu({ targetChildren, dropdownChildren, width }: StandardMenuType)
{
  const [ t ] = useTranslation();
  const isEmpty = React.Children.toArray(dropdownChildren).length === 0;

  return (<Menu
      withinPortal={false}
      position="bottom-end"
      trigger="hover"
      shadow="md"
      width={width}
      disabled={isEmpty}
    >
      <Menu.Target>
        <UnstyledButton className={style.content} disabled={isEmpty} opacity={isEmpty ? 0.5 : 1}>
          <Group gap="sm">
            {isEmpty ? <Text size="sm" c="dimmed">{t("field.noValue")}</Text> : targetChildren}
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
