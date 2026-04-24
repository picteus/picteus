import React, { ReactNode, useRef } from "react";
import { Drawer as MantineDrawer } from "@mantine/core";
import { useEscapeKey } from "app/hooks";

import style from "./Drawer.module.scss";


type DrawerType = {
  opened: boolean;
  onClose: () => void;
  title: ReactNode;
  size?: number | string;
  children: React.ReactNode;
};

export default function Drawer({
  opened,
  onClose,
  title,
  children
}: DrawerType) {
  const childrenRef = useRef<HTMLDivElement>(null);
  useEscapeKey(childrenRef, onClose);

  return (<MantineDrawer
    opened={opened}
    onClose={onClose}
    title={title}
    closeOnEscape={false}
    position="right"
    size="lg"
    radius="lg"
    offset={8}
    classNames={{ header: style.header }}
    zIndex={9}
  >
    {opened && <div ref={childrenRef} className={style.children} style={{ width: "100%" }}>{children}</div>}
  </MantineDrawer>
  )
}
