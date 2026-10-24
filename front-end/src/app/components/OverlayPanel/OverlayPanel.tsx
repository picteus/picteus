import { ReactElement, ReactNode, useRef } from "react";
import { ActionIcon, Box, BoxProps, Divider, Flex, Group, Kbd, ScrollArea, Text, Transition } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Common } from "app/components";
import { useEscapeKey } from "app/hooks";

import style from "./OverlayPanel.module.scss";


export interface OverlayPanelPropsType
{

  readonly isOpened: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly width: BoxProps["w"];
  readonly children?: ReactNode;

}

export default function OverlayPanel({
  isOpened,
  onClose,
  title,
  width,
  children
}: OverlayPanelPropsType): ReactElement | null
{
  const [ t ] = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  useEscapeKey(containerRef, onClose, isOpened);

  return (
    <Transition mounted={isOpened} transition="slide-left" duration={200} timingFunction="ease">
      {transitionStyles => (
        <Flex
          ref={containerRef}
          direction="column"
          className={style.container}
          pos="absolute"
          top={0}
          right={0}
          bottom={0}
          w={width}
          maw="100%"
          bg="var(--mantine-color-body)"
          style={transitionStyles}
        >
          <Box px="md" py="xs">
            <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
              <Text
                size="xs"
                fw={700}
                c="dimmed"
                tt="uppercase"
                truncate
              >
                {title}
              </Text>
              <Group gap="xs" align="center" wrap="nowrap">
                <Kbd size="xs">
                  {t("keyShortcuts.escape")}
                </Kbd>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={onClose}
                >
                  <IconX size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>
                </ActionIcon>
              </Group>
            </Group>
          </Box>
          <Divider/>

          <ScrollArea flex={1} p="md">
            {children}
          </ScrollArea>
        </Flex>
      )}
    </Transition>
  );
}

