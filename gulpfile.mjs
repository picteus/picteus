import path from "node:path";
import fs from "node:fs";
import process from "node:process";


// noinspection JSUnusedGlobalSymbols
export const fixCaporalModule = async () =>
{
  const cliArguments = process.argv;
  const moduleDirectoryPath = path.resolve(cliArguments[cliArguments.indexOf("--directoryPath") + 1]);
  const filePath = path.join(moduleDirectoryPath, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }));
  delete packageJson["exports"];
  fs.writeFileSync(filePath, JSON.stringify(packageJson, undefined, 2), { encoding: "utf8" });
  return Promise.resolve();
};
