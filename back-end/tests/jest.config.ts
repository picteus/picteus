import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";


import type { Config } from "@jest/types";
import { createDefaultEsmPreset, pathsToModuleNameMapper } from "ts-jest";


const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const rootDirectoryPath = path.resolve(currentDirectoryPath, "..");
const stConfigFileName = "tsconfig.json";
const tsConfigJsonFilePath = path.join(rootDirectoryPath, stConfigFileName);
const testTsConfigJsonFilePath = path.join(currentDirectoryPath, stConfigFileName);
const tsConfigJson = JSON.parse(fs.readFileSync(tsConfigJsonFilePath, { encoding: "utf8" }));

// This work-around comes from https://github.com/kulshekhar/ts-jest/issues/414 and at https://stackoverflow.com/questions/52860868/typescript-paths-not-resolving-when-running-jest
const moduleNameMapper = pathsToModuleNameMapper(tsConfigJson.compilerOptions.paths, { prefix: "<rootDir>/" });
export default {
  ...createDefaultEsmPreset({ tsconfig: testTsConfigJsonFilePath }),
  testEnvironment: "node",
  rootDir: rootDirectoryPath,
  // The mappings after the first one are there to solve an issue caused by the Prisma generated client "client.ts" class code, which resorts to '.js' extensions in its import statements, and the work-around is taken from https://github.com/kulshekhar/ts-jest/issues/1057. Unfortunately, we cannot apply the  "(.+)\\.js": "$1" mapping, because this breaks other things
  moduleNameMapper: {
    ...moduleNameMapper,
    "\./enums\.js": "./enums",
    "\.internal/class\.js": "./internal/class",
    "\.internal/prismaNamespace\.js": "./internal/prismaNamespace"
  },
  cacheDirectory: "<rootDir>/../tmp/jest-cache"
} satisfies Config.InitialOptions;
