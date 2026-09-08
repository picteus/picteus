import { type ReactElement } from "react";
import {
  Anchor,
  Blockquote,
  Checkbox,
  Code,
  Divider,
  Image,
  List,
  Mark,
  Table,
  Text,
  Title,
  Typography
} from "@mantine/core";
import { type Components, default as ReactMarkdown } from "react-markdown";
import remarkGfm from "remark-gfm";


export type MarkdownPropsType = {
  content: string;
};

const REMARK_PLUGINS = [ remarkGfm ];

const MARKDOWN_COMPONENTS: Components =
  {
    h1: ({ children }): ReactElement =>
    {
      return (
        <Title order={1}>
          {children}
        </Title>
      );
    },
    h2: ({ children }): ReactElement =>
    {
      return (
        <Title order={2}>
          {children}
        </Title>
      );
    },
    h3: ({ children }): ReactElement =>
    {
      return (
        <Title order={3}>
          {children}
        </Title>
      );
    },
    h4: ({ children }): ReactElement =>
    {
      return (
        <Title order={4}>
          {children}
        </Title>
      );
    },
    h5: ({ children }): ReactElement =>
    {
      return (
        <Title order={5}>
          {children}
        </Title>
      );
    },
    h6: ({ children }): ReactElement =>
    {
      return (
        <Title order={6}>
          {children}
        </Title>
      );
    },
    p: ({ children }): ReactElement =>
    {
      return (
        <Text component="p">
          {children}
        </Text>
      );
    },
    strong: ({ children }): ReactElement =>
    {
      return (
        <Text span fw={700}>
          {children}
        </Text>
      );
    },
    em: ({ children }): ReactElement =>
    {
      return (
        <Text span fs="italic">
          {children}
        </Text>
      );
    },
    del: ({ children }): ReactElement =>
    {
      return (
        <Text span td="line-through">
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
      const isExternal = href?.startsWith("http://") === true || href?.startsWith("https://") === true;
      return (
        <Anchor
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
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
        <List withPadding>
          {children}
        </List>
      );
    },
    ol: ({ children }): ReactElement =>
    {
      return (
        <List type="ordered" withPadding>
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
          <Table withTableBorder withColumnBorders striped highlightOnHover>
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

export default function Markdown({ content }: MarkdownPropsType): ReactElement
{
  // We need to handle the specific case of the linebreak "<br>", because the library does not handle it properly by default
  const sanitizedContent = content.replace(/<br\s*\/?>/gi, "\n \n");

  return (
    <Typography>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={MARKDOWN_COMPONENTS}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </Typography>
  );
}
