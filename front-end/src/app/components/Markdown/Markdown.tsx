import { default as ReactMarkdown } from "react-markdown";


type MarkdownType = {
  content: string
};

export default function Markdown({ content }: MarkdownType)
{
  return (
    // We need to handle the specific case the linebreak "<br>", because the library does not handle it properly by default
    <ReactMarkdown>{content.replace(/<br>/ig, "\n \n")}</ReactMarkdown>
  );
}
