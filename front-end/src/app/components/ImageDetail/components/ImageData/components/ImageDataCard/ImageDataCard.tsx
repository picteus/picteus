import React, { ReactElement, ReactNode } from "react";
import { ActionIcon, Badge, Card, Collapse, Flex, Text, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconEyeOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Common } from "app/components";


export type ImageDataCardPropsType =
  {
    readonly title?: string;
    readonly icon?: ReactNode;
    readonly count?: number;
    readonly subtitle?: string;
    readonly children: ReactNode;
    readonly defaultExpanded?: boolean;
    readonly isOpened: boolean;
    readonly onToggle: () => void;
    readonly onHide: () => void;
  };

export default function ImageDataCard({
  title,
  icon,
  count,
  subtitle,
  children,
  defaultExpanded = true,
  isOpened: controlledIsOpened,
  onToggle,
  onHide
}: ImageDataCardPropsType): ReactElement
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

  const renderedHeader = (
    <>
      {icon}
      <Text fw={600} size="sm">
        {title}
      </Text>
      {count !== undefined && count > 1 && (
        <Badge size="xs" variant="light" color="gray">
          {count}
        </Badge>
      )}
    </>
  );

  return (
    <Card shadow="xs" padding="sm" radius="md" withBorder style={{ width: "100%" }}>
      <Card.Section inheritPadding px="sm" py="xs">
        <Flex
          align="center"
          justify="space-between"
          style={{ cursor: "pointer", userSelect: "none" }}
          onClick={handleToggle}
        >
          <Flex align="center" gap="xs">
            {renderedHeader}
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
                  <IconEyeOff size={Common.IconXSmallSize}/>
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
                size={Common.IconXSmallSize}
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
          {subtitle !== undefined && (
            <Text size="xs" c="dimmed" mb="sm">
              {subtitle}
            </Text>
          )}
          {children}
        </Card.Section>
      </Collapse>
    </Card>
  );
}
