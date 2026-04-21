import React, { useRef } from "react";
import { Drawer as MantineDrawer, Title } from "@mantine/core";
import { useEscapeKey } from "../../hooks";


type DrawerType = {
  opened: boolean;
  onClose: () => void;
  title: string;
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
      title={<Title order={3}>{title}</Title>}
      closeOnEscape={false}
      position="right"
      size="l"
      overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
    >
      {opened && <div ref={childrenRef}>{children}</div>}
    </MantineDrawer>
  )
}
