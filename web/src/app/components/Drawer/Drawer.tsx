import React, { useRef } from "react";
import { Drawer as MantineDrawer } from "@mantine/core";

import { ContentIconType } from "types";
import { useEscapeKey } from "app/hooks";
import { ContentTitle } from "app/components";

import style from "./Drawer.module.scss";


type DrawerType = {
  opened: boolean;
  onClose: () => void;
  title: string;
  icon?: ContentIconType;
  children: React.ReactNode;
};

export default function Drawer({
  opened,
  onClose,
  title,
  icon,
  children
}: DrawerType) {
  const childrenRef = useRef<HTMLDivElement>(null);
  useEscapeKey(childrenRef, onClose);

  return (<MantineDrawer
      opened={opened}
      onClose={onClose}
      title={<ContentTitle text={title} icon={icon} />}
      closeOnEscape={false}
      position="right"
      size="l"
      radius="lg"
      offset={8}
      overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
    >
      {opened && <div ref={childrenRef} className={style.children}>{children}</div>}
    </MantineDrawer>
  )
}
