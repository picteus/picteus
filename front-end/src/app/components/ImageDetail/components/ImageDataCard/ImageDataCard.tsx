import React, { ReactNode } from "react";
import { ActionIcon, Card, Collapse, Flex, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconEyeOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import Common from "../../../Common/Common.ts";


export type ImageDataCardPropsType =
  {
    readonly header: ReactNode;
    readonly children: ReactNode;
    readonly defaultExpanded?: boolean;
    readonly isOpened?: boolean;
    readonly onToggle?: () => void;
    readonly onHide?: () => void;
    readonly className?: string;
    readonly style?: React.CSSProperties;
  };

export default function ImageDataCard({
  header,
  children,
  defaultExpanded = true,
  isOpened: controlledIsOpened,
  onToggle,
  onHide,
  className,
  style
}: ImageDataCardPropsType): ReactNode
{
  const [ t ] = useTranslation();
  const [ uncontrolledIsOpened, { toggle: toggleOpened } ] = useDisclosure(defaultExpanded);
  const isOpened = controlledIsOpened !== undefined ? controlledIsOpened : uncontrolledIsOpened;

  function handleToggle(): void
  {
    if (onToggle !== undefined)
    {
      onToggle();
    }
    else
    {
      toggleOpened();
    }
  }

  return (
    <Card shadow="xs" padding="sm" radius="md" withBorder className={className} style={{ width: "100%", ...style }}>
      <Card.Section inheritPadding px="sm" py="xs">
        <Flex
          align="center"
          justify="space-between"
          style={{ cursor: "pointer", userSelect: "none" }}
          onClick={handleToggle}
        >
          <Flex align="center" gap="xs">
            {header}
          </Flex>
          <Flex align="center" gap="xs">
            {onHide !== undefined && (
              <Tooltip label={t("imageDetail.settings.hide")} position="left" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={(event) =>
                  {
                    event.stopPropagation();
                    onHide();
                  }}
                >
                  <IconEyeOff size={Common.IconSmallSize} />
                </ActionIcon>
              </Tooltip>
            )}
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={(event) =>
              {
                event.stopPropagation();
                handleToggle();
              }}
            >
              <IconChevronDown
                size={Common.IconSmallSize}
                style={{
                  transform: isOpened ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 200ms ease"
                }}
              />
            </ActionIcon>
          </Flex>
        </Flex>
      </Card.Section>
      <Collapse expanded={isOpened}>
        <Card.Section
          inheritPadding
          px="sm"
          py="xs"
          style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
        >
          {children}
        </Card.Section>
      </Collapse>
    </Card>
  );
}
