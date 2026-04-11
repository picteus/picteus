import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import eslintPlugin from "vite-plugin-eslint";

import { version } from "./package.json";


export default defineConfig(({ mode }) => {
  const isProfiling = mode === "profiling";
  const resolve = isProfiling === true ? {
    alias: [
      { find: "react-dom/client", replacement: "react-dom/profiling" },
      { find: "react-dom", replacement: "react-dom/profiling" },
      { find: "scheduler/tracing", replacement: "scheduler/tracing-profiling" }
    ]
  } : undefined;
  return {
    plugins: [react(), tsconfigPaths(), eslintPlugin()],
    resolve,
    base: "",
    define: {
      "import.meta.env.PACKAGE_VERSION": JSON.stringify(version)
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "./src/assets/style/variables.scss";`
        }
      }
    },
    build: {
      outDir: "../build/web",
      terserOptions: isProfiling === true ? { keep_fnames: true, keep_classnames: true } : undefined,
      sourcemap: isProfiling === true
    }
  };
});
