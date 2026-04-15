import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import eslintPlugin from "vite-plugin-eslint";

import { version } from "./package.json";

/**
 * Patches @researchgate/react-intersection-list's Sentinel component.
 * In React 19, refs are set to null during unmount/update cycles, so
 * this.observer can be null when shouldComponentUpdate is called.
 * The original code lacked a null guard, causing a runtime crash.
 */
function sentinelObserverNullGuardPlugin(): Plugin {
  return {
    name: "sentinel-observer-null-guard",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("react-intersection-list")) return null;
      if (!id.includes("Sentinel")) return null;
      return {
        code: code.replace(
          "      this.observer.externalUnobserve();\n      this.observer.observe();",
          "      if (this.observer) { this.observer.externalUnobserve(); this.observer.observe(); }"
        ),
        map: null,
      };
    },
  };
}

export default defineConfig(({ mode }) => {
  const isProfiling = mode === "profiling";
  return {
    plugins: [sentinelObserverNullGuardPlugin(), react(), tsconfigPaths(), eslintPlugin()],
    resolve: isProfiling === true ? { alias: [{ find: "react-dom/client", replacement: "react-dom/profiling" }] } : undefined,
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
