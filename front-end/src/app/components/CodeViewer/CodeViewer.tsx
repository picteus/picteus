import { type ReactElement, useEffect, useMemo, useRef } from "react";
import { type MantineSize, useMantineColorScheme } from "@mantine/core";
// Import the default Highlight.js style
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import beautify from "js-beautify";

import { ToastService } from "utils";


hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);

const LINE_HEIGHT_EM = 1.5;

export type CodeViewerType = {
  readonly code: string;
  readonly language?: "json" | "xml" | "html";
  readonly size?: MantineSize;
  readonly maxLines?: number;
};

export default function CodeViewer({ code, language, size, maxLines = 10 }: CodeViewerType): ReactElement
{
  const codeRef = useRef<HTMLElement>(null);

  const { colorScheme } = useMantineColorScheme();
  useEffect(() =>
  {
    if (colorScheme === "dark")
    {
      import("highlight.js/styles/dark.min.css");
    }
    else
    {
      import("highlight.js/styles/lightfair.min.css");
    }
  }, [ colorScheme ]);

  useEffect(() =>
  {
    //TODO: reactivate this once the performance issue is solved
    // if (codeRef.current) {
    //   hljs.highlightElement(codeRef.current);
    // }
  }, [ codeRef ]);

  const formattedCode = useMemo(() =>
  {
    try
    {
      const options =
        {
          indent_size: 2,
          indent_char: " ",
          max_preserve_newlines: "1",
          preserve_newlines: true,
          keep_array_indentation: false,
          break_chained_methods: false,
          brace_style: "expand",
          end_with_newline: false
        };
      if (language === "xml" || language === "html")
      {
        return beautify.html(code, options);
      }
      return beautify.js(code, options);
    }
    catch (error)
    {
      ToastService.failureAndMessage(error, "An error occurred while trying to beautify the code");
      return "Source code is broken";
    }
  }, [ code, language ]);

  function computeFontSize(size?: MantineSize): string | undefined
  {
    if (!size)
    {
      return undefined;
    }
    const standardSizes = [ "xs", "sm", "md", "lg", "xl" ];
    if (standardSizes.includes(size))
    {
      return `var(--mantine-font-size-${size})`;
    }
    return String(size);
  }

  const fontSize = computeFontSize(size);

  return (
    <pre
      style={{
        maxHeight: maxLines !== undefined && maxLines > 0 ? `${maxLines * LINE_HEIGHT_EM}em` : undefined,
        overflowY: maxLines !== undefined && maxLines > 0 ? "auto" : undefined,
        lineHeight: LINE_HEIGHT_EM,
        fontSize: fontSize,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        overflowWrap: "anywhere",
        minWidth: 0,
        maxWidth: "100%"
      }}
    >
      <code
        style={{
          fontFamily: "var(--mantine-font-family)",
          fontSize: fontSize,
          lineHeight: LINE_HEIGHT_EM,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          overflowWrap: "anywhere"
        }}
        ref={codeRef}
      >
        {formattedCode}
      </code>
    </pre>
  );
}
