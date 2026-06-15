import path from "node:path";

import { defineConfig, type Plugin, TerserOptions } from "vite";
import react from "@vitejs/plugin-react";

import { version } from "./package.json";


/**
 * Patches @researchgate/react-intersection-list's Sentinel component.
 * In React 19, refs are set to null during unmount/update cycles, so
 * this.observer can be null when shouldComponentUpdate is called.
 * The original code lacked a null guard, causing a runtime crash.
 */
function sentinelObserverNullGuardPlugin(): Plugin
{
  return {
    name: "sentinel-observer-null-guard",
    enforce: "pre",
    transform(code, _id)
    {
      if (code.includes("this.observer.externalUnobserve()"))
      {
        return code.replace(
          /this\.observer\.externalUnobserve\(\);[\s\S]*?this\.observer\.observe\(\);/g,
          "if (this.observer) { this.observer.externalUnobserve(); this.observer.observe(); }"
        );
      }
      return null;
    }
  };
}

export default defineConfig(({ mode }) =>
{
  const isProfiling = mode === "profiling";
  return {
    plugins: [sentinelObserverNullGuardPlugin(), react()],
    resolve: {
      dedupe: ["react", "react-dom"],
      tsconfigPaths: true,
      alias: isProfiling === true ? [{ find: "react-dom/client", replacement: "react-dom/profiling" }] : undefined
    },
    base: "",
    define: {
      "import.meta.env.PACKAGE_VERSION": JSON.stringify(version)
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "${path.resolve(__dirname, "src/assets/style/variables.scss").replace(/\\/g, "/")}";`
        }
      }
    },
    build: {
      outDir: "../build/front-end",
      terserOptions: isProfiling === true ? { keep_fnames: true, keep_classnames: true } as TerserOptions : undefined,
      sourcemap: isProfiling === true
    }
  };
});
