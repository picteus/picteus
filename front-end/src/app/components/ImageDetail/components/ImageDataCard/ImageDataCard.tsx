import React, { ReactNode } from "react";
import { ActionIcon, Card, Collapse, Flex } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown } from "@tabler/icons-react";


export type ImageDataCardPropsType =
{
  readonly header: ReactNode;
  readonly children: ReactNode;
  readonly defaultExpanded?: boolean;
  readonly className?: string;
  readonly style?: React.CSSProperties;
};

export default function ImageDataCard({
  header,
  children,
  defaultExpanded = true,
  className,
  style
}: ImageDataCardPropsType): ReactNode
{
  const [ isOpened, { toggle: toggleOpened } ] = useDisclosure(defaultExpanded);

  return (
    <Card shadow="xs" padding="sm" radius="md" withBorder className={className} style={{ width: "100%", ...style }}>
      <Card.Section inheritPadding px="sm" py="xs">
        <Flex
          align="center"
          justify="space-between"
          style={{ cursor: "pointer", userSelect: "none" }}
          onClick={toggleOpened}
        >
          <Flex align="center" gap="xs">
            {header}
          </Flex>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={(event) =>
            {
              event.stopPropagation();
              toggleOpened();
            }}
            aria-label={isOpened ? "Collapse" : "Expand"}
          >
            <IconChevronDown
              size={16}
              style={{
                transform: isOpened ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 200ms ease"
              }}
            />
          </ActionIcon>
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
