import { default as WrappedMarkdown } from "react-markdown";


type MarkdownType = {
  content: string
};

export default function Markdown({ content }: MarkdownType) {
  return (
    // We need to handle the specific case the linebreak "<br>", because the library does not handle it properly by default
    <WrappedMarkdown>{content.replace(/<br>/ig, "\n \n")}</WrappedMarkdown>
  );
}
