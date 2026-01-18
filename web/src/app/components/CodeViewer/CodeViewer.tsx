import { useEffect, useMemo, useRef } from "react"; // Import the default Highlight.js style
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import beautify from "js-beautify";
import { useMantineColorScheme } from "@mantine/core";

hljs.registerLanguage("json", json);

export default function CodeViewer({ code }) {
  const codeRef = useRef();

  const { colorScheme } = useMantineColorScheme();
  import((`highlight.js/styles/${colorScheme === "dark" ? "dark.min.css" : "lightfair.min.css"}`));

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [codeRef, code]);

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
      console.error(
        "An error occurred while trying to beautify the code : ",
        code,
        error,
      );
    }
    return "Source code is broken";
  }, [code]);

  return (
    <pre style={{ maxHeight: 400 }}>
      <code style={{fontFamily: "var(--mantine-font-family)"}} ref={codeRef}>{formattedCode}</code>
    </pre>
  );
}
