import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";


export default defineConfig({
  root: "./src/front-end",
  base: "",
  plugins: [
    tsconfigPaths({ projects: ["../../front-end-tsconfig.json"] })
  ],
  build: {
    outDir: "../../dist/front-end"
  }
});
