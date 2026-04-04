import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import eslintPlugin from "vite-plugin-eslint";

import { version } from "./package.json";


export default defineConfig({
  plugins: [react(), tsconfigPaths(), eslintPlugin()],
  base: "",
  define: {
    "import.meta.env.PACKAGE_VERSION": JSON.stringify(version)
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "./src/assets/style/variables.scss";`,
      },
    },
  },
  build: {
    outDir: "../build/web",
  },
});
