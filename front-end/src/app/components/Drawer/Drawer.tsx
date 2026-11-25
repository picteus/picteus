import { ReactElement, ReactNode, useRef } from "react";
import { Drawer as MantineDrawer, MantineSpacing } from "@mantine/core";
import { useEscapeKey } from "app/hooks";

import style from "./Drawer.module.scss";


type DrawerPropsType =
  {
    readonly opened: boolean;
    readonly onClose: () => void;
    readonly title?: ReactNode;
    readonly size?: number | string;
    readonly padding?: MantineSpacing | number;
    readonly zIndex?: number;
    readonly isFlush?: boolean;
    readonly children: ReactNode;
  };

export default function Drawer({
  opened,
  onClose,
  title,
  size = "lg",
  padding,
  zIndex,
  isFlush = false,
  children
}: DrawerPropsType): ReactElement
{
  const childrenRef = useRef<HTMLDivElement>(null);
  useEscapeKey(childrenRef, onClose, opened);

  const effectivePadding = padding ?? (isFlush === true ? 0 : undefined);
  const effectiveZIndex = zIndex ?? (isFlush === true ? 12 : 9);

  return (
    <MantineDrawer
      opened={opened}
      onClose={onClose}
      title={title}
      closeOnEscape={false}
      withCloseButton={isFlush === false}
      padding={effectivePadding}
      position="right"
      size={size}
      radius={isFlush === true ? 0 : "lg"}
      offset={isFlush === true ? 0 : 8}
      classNames={isFlush === true ? undefined : { header: style.header }}
      styles={isFlush === true ? {
        content: {
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderLeft: "1px solid var(--mantine-color-default-border)"
        },
        body: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          padding: 0
        }
      } : undefined}
      zIndex={effectiveZIndex}
    >
      {opened === true && (
        <div
          ref={childrenRef}
          className={style.children}
          style={isFlush === true
            ? { display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }
            : { width: "100%" }}
        >
          {children}
        </div>
      )}
    </MantineDrawer>
  );
}
