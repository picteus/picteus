import { type ReactElement, type ReactNode, useMemo } from "react";
import {
  Anchor,
  Blockquote,
  Checkbox,
  Code,
  Divider,
  Image,
  List,
  type MantineSize,
  Mark,
  Table,
  Text,
  Title,
  type TitleOrder,
  Typography
} from "@mantine/core";
import { type Components, default as ReactMarkdown } from "react-markdown";
import remarkGfm from "remark-gfm";

import { useOpenBrowser } from "app/hooks";
import { ToastService } from "../../../utils";


export type MarkdownPropsType = {
  readonly content: string;
  readonly size?: MantineSize;
  readonly titleOrderOffset?: number;
};

const REMARK_PLUGINS = [ remarkGfm ];

function computeTitleOrder(rawLevel: number, titleOrderOffset: number): TitleOrder
{
  const targetLevel = Math.min(6, Math.max(1, rawLevel + titleOrderOffset));
  return targetLevel as TitleOrder;
}

function createMarkdownComponents(size?: MantineSize, titleOrderOffset = 0): Components
{
  function renderHeading(level: TitleOrder, children: ReactNode): ReactElement
  {
    const order = computeTitleOrder(level, titleOrderOffset);
    return (
      <Title order={order}>
        {children}
      </Title>
    );
  }

  return {
    h1: ({ children }): ReactElement =>
    {
      return renderHeading(1, children);
    },
    h2: ({ children }): ReactElement =>
    {
      return renderHeading(2, children);
    },
    h3: ({ children }): ReactElement =>
    {
      return renderHeading(3, children);
    },
    h4: ({ children }): ReactElement =>
    {
      return renderHeading(4, children);
    },
    h5: ({ children }): ReactElement =>
    {
      return renderHeading(5, children);
    },
    h6: ({ children }): ReactElement =>
    {
      return renderHeading(6, children);
    },
    p: ({ children }): ReactElement =>
    {
      return (
        <Text component="p" size={size}>
          {children}
        </Text>
      );
    },
    strong: ({ children }): ReactElement =>
    {
      return (
        <Text span fw={700} size={size}>
          {children}
        </Text>
      );
    },
    em: ({ children }): ReactElement =>
    {
      return (
        <Text span fs="italic" size={size}>
          {children}
        </Text>
      );
    },
    del: ({ children }): ReactElement =>
    {
      return (
        <Text span td="line-through" size={size}>
          {children}
        </Text>
      );
    },
    mark: ({ children }): ReactElement =>
    {
      return (
        <Mark>
          {children}
        </Mark>
      );
    },
    a: ({ href, children }): ReactElement =>
    {
      const openBrowser = useOpenBrowser();
      return (
        <Anchor
          href={href}
          size={size}
          onClick={(event) =>
          {
            if (href !== undefined)
            {
              event.preventDefault();
              openBrowser(href).catch(ToastService.failureAndMessage);
            }
          }}
        >
          {children}
        </Anchor>
      );
    },
    pre: ({ children }): ReactElement =>
    {
      return (
        <>{children}</>
      );
    },
    code: ({ className, children }): ReactElement =>
    {
      const hasLanguageClass = Boolean(className && className.includes("language-"));
      const isMultiLine = typeof children === "string" && children.includes("\n");
      const isBlock = hasLanguageClass || isMultiLine;

      if (isBlock)
      {
        const formattedCode = typeof children === "string"
          ? children.replace(/\n$/, "")
          : children;

        return (
          <Code block>
            {formattedCode}
          </Code>
        );
      }

      return (
        <Code>
          {children}
        </Code>
      );
    },
    blockquote: ({ children }): ReactElement =>
    {
      return (
        <Blockquote my="sm">
          {children}
        </Blockquote>
      );
    },
    hr: (): ReactElement =>
    {
      return (
        <Divider my="md"/>
      );
    },
    ul: ({ children }): ReactElement =>
    {
      return (
        <List withPadding size={size}>
          {children}
        </List>
      );
    },
    ol: ({ children }): ReactElement =>
    {
      return (
        <List type="ordered" withPadding size={size}>
          {children}
        </List>
      );
    },
    li: ({ className, children }): ReactElement =>
    {
      const isTaskListItem = Boolean(className && className.includes("task-list-item"));
      return (
        <List.Item style={isTaskListItem ? { listStyleType: "none" } : undefined}>
          {children}
        </List.Item>
      );
    },
    input: ({ type, checked }): ReactElement =>
    {
      if (type === "checkbox")
      {
        return (
          <Checkbox
            size={size}
            checked={Boolean(checked)}
            readOnly
          />
        );
      }

      return (
        <input
          type={type}
          checked={checked}
          readOnly
        />
      );
    },
    table: ({ children }): ReactElement =>
    {
      return (
        <Table.ScrollContainer minWidth={300} my="sm">
          <Table withTableBorder withColumnBorders striped highlightOnHover fz={size}>
            {children}
          </Table>
        </Table.ScrollContainer>
      );
    },
    thead: ({ children }): ReactElement =>
    {
      return (
        <Table.Thead>
          {children}
        </Table.Thead>
      );
    },
    tbody: ({ children }): ReactElement =>
    {
      return (
        <Table.Tbody>
          {children}
        </Table.Tbody>
      );
    },
    tr: ({ children }): ReactElement =>
    {
      return (
        <Table.Tr>
          {children}
        </Table.Tr>
      );
    },
    th: ({ children }): ReactElement =>
    {
      return (
        <Table.Th>
          {children}
        </Table.Th>
      );
    },
    td: ({ children }): ReactElement =>
    {
      return (
        <Table.Td>
          {children}
        </Table.Td>
      );
    },
    img: ({ src, alt }): ReactElement =>
    {
      return (
        <Image
          src={src}
          alt={alt}
          fit="contain"
          maw="100%"
          radius="sm"
          my="xs"
        />
      );
    }
  };
}

export default function Markdown({
  content,
  size = "sm",
  titleOrderOffset = 0
}: MarkdownPropsType): ReactElement
{
  // We need to handle the specific case of the linebreak "<br>", because the library does not handle it properly by default
  const sanitizedContent = content.replace(/<br\s*\/?>/gi, "\n \n");

  const components = useMemo<Components>(
    () =>
    {
      return createMarkdownComponents(size, titleOrderOffset);
    },
    [ size, titleOrderOffset ]
  );

  return (
    <Typography>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={components}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </Typography>
  );
}
