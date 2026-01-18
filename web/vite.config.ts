import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import eslintPlugin from "vite-plugin-eslint";

export default defineConfig({
  plugins: [react(), tsconfigPaths(), eslintPlugin()],
  base: "",
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
