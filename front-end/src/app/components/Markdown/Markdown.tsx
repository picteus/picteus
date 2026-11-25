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
import { detectManualTocHeadingLevel, slugifyMarkdownHeading, ToastService } from "utils";


type MarkdownPropsType = {
  readonly content: string;
  readonly size?: MantineSize;
  readonly withBoldTitles?: boolean;
  readonly headingIdPrefix?: string;
  readonly headingLevelOffset?: number;
};

const REMARK_PLUGINS = [ remarkGfm ];

function extractPlainText(node: ReactNode): string
{
  if (typeof node === "string" || typeof node === "number")
  {
    return String(node);
  }
  if (Array.isArray(node))
  {
    return node.map(extractPlainText).join("");
  }
  if (node !== null && typeof node === "object" && "props" in node)
  {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return extractPlainText(props?.children);
  }
  return "";
}

function createMarkdownComponents(
  openBrowser: (url: string) => Promise<void>,
  size?: MantineSize,
  withBoldTitles?: boolean,
  headingIdPrefix?: string,
  tocHeadingLevel?: 1 | 2,
  usedHeadingIds?: Map<string, number>,
  headingLevelOffset?: number
): Components
{
  function computeHeadingAnchorId(level: TitleOrder, children: ReactNode): string | undefined
  {
    if (level !== tocHeadingLevel || headingIdPrefix === undefined || usedHeadingIds === undefined)
    {
      return undefined;
    }
    const baseSlug = slugifyMarkdownHeading(extractPlainText(children));
    const count = usedHeadingIds.get(baseSlug) ?? 0;
    usedHeadingIds.set(baseSlug, count + 1);
    const suffix = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
    return `${headingIdPrefix}-${suffix}`;
  }

  function renderHeading(level: TitleOrder, children: ReactNode): ReactElement
  {
    const anchorId = computeHeadingAnchorId(level, children);
    if (withBoldTitles)
    {
      return (
        <Text id={anchorId} span fw={700} size={size}>
          {children}
        </Text>
      );
    }

    const effectiveOrder = headingLevelOffset !== undefined
      ? (Math.min(6, Math.max(1, level + headingLevelOffset)) as TitleOrder)
      : level;

    return (
      <Title
        id={anchorId}
        order={effectiveOrder}
        fw={headingLevelOffset !== undefined ? 500 : undefined}
        style={{
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          scrollMarginTop: anchorId !== undefined ? 16 : undefined
        }}
      >
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
        <Text
          component="p"
          size={size}
          style={{
            overflowWrap: "anywhere",
            wordBreak: "break-word"
          }}
        >
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
      return (
        <Anchor
          href={href}
          size={size}
          style={{
            overflowWrap: "anywhere",
            wordBreak: "break-word"
          }}
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
          <Code
            block
            style={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              wordBreak: "break-all",
              minWidth: 0,
              maxWidth: "100%"
            }}
          >
            {formattedCode}
          </Code>
        );
      }

      return (
        <Code
          style={{
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            wordBreak: "break-word"
          }}
        >
          {children}
        </Code>
      );
    },
    blockquote: ({ children }): ReactElement =>
    {
      return (
        <Blockquote
          my="sm"
          style={{
            overflowWrap: "anywhere",
            wordBreak: "break-word"
          }}
        >
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
        <List.Item
          style={{
            overflowWrap: "anywhere",
            wordBreak: "break-word",
            ...(isTaskListItem ? { listStyleType: "none" } : undefined)
          }}
        >
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
          <Table
            withTableBorder
            withColumnBorders
            striped
            highlightOnHover
            fz={size}
            style={{ maxWidth: "100%" }}
          >
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
  withBoldTitles = true,
  headingIdPrefix,
  headingLevelOffset
}: MarkdownPropsType): ReactElement
{
  const openBrowser = useOpenBrowser();
  // We need to handle the specific case of the linebreak "<br>", because the library does not handle it properly by default
  const sanitizedContent = content.replace(/<br\s*\/?>/gi, "\n \n");

  const components = useMemo<Components>(
    () =>
    {
      const tocHeadingLevel = headingIdPrefix !== undefined ? detectManualTocHeadingLevel(sanitizedContent) : undefined;
      const usedHeadingIds = headingIdPrefix !== undefined ? new Map<string, number>() : undefined;
      return createMarkdownComponents(
        openBrowser,
        size,
        withBoldTitles,
        headingIdPrefix,
        tocHeadingLevel,
        usedHeadingIds,
        headingLevelOffset
      );
    },
    [ openBrowser, size, withBoldTitles, headingIdPrefix, headingLevelOffset, sanitizedContent ]
  );

  return (
    <Typography
      style={{
        minWidth: 0,
        maxWidth: "100%",
        overflowWrap: "anywhere",
        wordBreak: "break-word"
      }}
    >
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={components}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </Typography>
  );
}
