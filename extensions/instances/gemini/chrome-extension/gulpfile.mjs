import path from "node:path";
import fs from "node:fs";

import gulp from "gulp";


const rootDirectoryPath = path.resolve(import.meta.dirname);
const packageJsonFileName = "package.json";
const packageJsonFilePath = path.join(rootDirectoryPath, packageJsonFileName);

// noinspection JSUnusedGlobalSymbols
export const updateVersion = gulp.series(async () =>
  {
    const version = JSON.parse(fs.readFileSync(path.join(rootDirectoryPath, "..", "..", "..", "..", packageJsonFileName), { encoding: "utf8" }))["config"]["apiVersion"];
    {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonFilePath, { encoding: "utf8" }));
      packageJson.dependencies["@picteus/ws-client"] = `file:../generated/openapi/typescript-fetch/picteus-ws-client-${version}.tgz`;
      fs.writeFileSync(packageJsonFilePath, JSON.stringify(packageJson, undefined, 2) + "\n");
    }
    return Promise.resolve();
  }
);
