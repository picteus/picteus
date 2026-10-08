import fs from "node:fs";
import path from "node:path";


interface RootPackageJson
{
  config: {
    frontEndVersion: string;
    apiVersion: string;
  };
}

interface FrontEndPackageJson
{
  version: string;
  dependencies: Record<string, string>;
}

const frontEndDirectoryPath = path.resolve(import.meta.dirname, "..");
const frontEndPackageJsonFilePath = path.join(frontEndDirectoryPath, "package.json");
const rootPackageJsonFilePath = path.join(frontEndDirectoryPath, "..", "package.json");

const rootConfig = (JSON.parse(fs.readFileSync(rootPackageJsonFilePath, { encoding: "utf8" })) as RootPackageJson)["config"];
const packageJson = JSON.parse(fs.readFileSync(frontEndPackageJsonFilePath, { encoding: "utf8" })) as FrontEndPackageJson;
packageJson["version"] = rootConfig["frontEndVersion"];
packageJson["dependencies"]["@picteus/ws-client"] = `file:../generated/openapi/typescript-fetch/picteus-ws-client-${rootConfig["apiVersion"]}.tgz`;
fs.writeFileSync(frontEndPackageJsonFilePath, JSON.stringify(packageJson, undefined, 2) + "\n", { encoding: "utf8" });
