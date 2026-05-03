import { useEffect, useMemo, useRef } from "react";
import { useMantineColorScheme } from "@mantine/core";
// Import the default Highlight.js style
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import beautify from "js-beautify";

import { notifyErrorWithError } from "utils";


hljs.registerLanguage("json", json);

type CodeViewerType = {
  code: string;
};

export default function CodeViewer({ code }: CodeViewerType) {
  const codeRef = useRef<HTMLElement>(null);

  const { colorScheme } = useMantineColorScheme();
  useEffect(() => {
    if (colorScheme === "dark") {
      import("highlight.js/styles/dark.min.css");
    } else {
      import("highlight.js/styles/lightfair.min.css");
    }
  }, [colorScheme]);

  useEffect(() => {
    //TODO: reactivate this once the performance issue is solved
    // if (codeRef.current) {
    //   hljs.highlightElement(codeRef.current);
    // }
  }, [codeRef]);

  const formattedCode = useMemo(() => {
    try {
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
      return beautify.js(code, options);
    } catch (error) {
      notifyErrorWithError(error, "An error occurred while trying to beautify the code");
      return "Source code is broken";
    }
  }, [code]);

  return (
    <pre style={{ maxHeight: 400 }}>
      <code style={{fontFamily: "var(--mantine-font-family)"}} ref={codeRef}>{formattedCode}</code>
    </pre>
  );
}
