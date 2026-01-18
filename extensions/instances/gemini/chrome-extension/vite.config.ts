import * as path from "node:path";
import * as fs from "node:fs";

import { defineConfig } from "vite";


function duplicateCommonPlugin()
{
  // noinspection JSUnusedGlobalSymbols
  return {
    name: "duplicate-common",
    enforce: "pre" as const,
    resolveId(source: string, importer: string): string
    {
      if (!importer) return null;

      // Handle both .ts extension and no extension
      const commonFile = /^\.?\.?[\/\\]?common(\.ts)?$/;
      if (commonFile.test(source))
      {
        // First resolve the actual path
        const resolvedPath = source.endsWith(".ts") ? source : source + ".ts";
        const resolved = path.resolve(path.dirname(importer), resolvedPath);
        const owner = path.basename(importer);
        return `${resolved}?owner=${owner}`;
      }
      return null;
    },
    load(id: string): string
    {
      if (!id.includes("?owner=")) return null;

      // Remove query params for file system operations
      const realPath = id.split("?")[0];
      if (!fs.existsSync(realPath)) return null;

      return fs.readFileSync(realPath, "utf-8");
    }
  };
}

export default defineConfig({
  plugins: [duplicateCommonPlugin()],
  build:
    {
      minify: false,
      rollupOptions:
        {
          input:
            {
              background: "src/background.ts",
              settings: "src/settings.ts"
            },
          output:
            {
              entryFileNames: "[name].js"
            }
        },
      outDir: "dist"
    }
});
