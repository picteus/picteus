import { default as WrappedMarkdown } from "react-markdown";


export default function Markdown({ content }: { content: string })
{
  return (
    <WrappedMarkdown>{content.replace(/<br>/ig, "\n \n")}</WrappedMarkdown>
  );
}
