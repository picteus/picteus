import * as fs from "node:fs";
import * as path from "node:path";
import os from "node:os";
import { ChildProcess } from "node:child_process";

import { paths } from "../../paths";
import { logger } from "../../logger";
import { fork, waitFor } from "./processWrapper";
import { downloadAndStoreFile, getTemporaryDirectoryPath, inflateGzippedTarball } from "./downloader";


export const npmVersion = "10.2.4";

export const packageJsonFileName = "package.json";

const nodeSdkScope = "picteus";

const extensionSdk = "extension-sdk";

export const publicNodeSdkIdentifier = `@${nodeSdkScope}/${extensionSdk}`;

const internalExtensionSdk = `internal-${extensionSdk}`;

export const internalNodeSdkIdentifier = `@${nodeSdkScope}/${internalExtensionSdk}`;

export async function ensureNpm(directoryPath: string, version: string): Promise<boolean>
{
  if (fs.existsSync(directoryPath) === true)
  {
    return false;
  }

  logger.info(`Downloading and installing npm v${version} into directory '${directoryPath}'`);
  const workingDirectoryPath = getTemporaryDirectoryPath();
  const npmTarballFilePath = path.join(workingDirectoryPath, `npm-${version}.tgz`);
  const extractionDirectoryPath = path.join(workingDirectoryPath, "package");


  if (fs.existsSync(workingDirectoryPath) === false)
  {
    fs.mkdirSync(workingDirectoryPath, { recursive: true });
  }
  await downloadAndStoreFile(`https://registry.npmjs.org/npm/-/npm-${version}.tgz`, npmTarballFilePath, "npm tarball");
  await inflateGzippedTarball(npmTarballFilePath, workingDirectoryPath, "npm tarball");

  logger.debug(`Installing npm into '${directoryPath}'`);
  fs.mkdirSync(directoryPath, { recursive: true });
  try
  {
    const npmCliFilePath = path.join(extractionDirectoryPath, "bin", "npm-cli.js");
    const childProcess = fork(npmCliFilePath, ["install", "-g", `npm@${version}`, "--prefix", directoryPath], extractionDirectoryPath, null);
    await waitFor(childProcess);
  }
  catch (error)
  {
    fs.rmSync(directoryPath, { recursive: true });
    throw error;
  }

  return true;
}

export async function runNpm(parameters: string[], directoryPath: string): Promise<ChildProcess>
{
  logger.info(`Running the npm command with parameters '${parameters.join(" ")}' in directory '${directoryPath}'`);
  const fromRootPaths = os.platform() === "win32" ? ["node_modules", "npm", "index.js"] : ["bin", "npm"];
  const npmFilePath = path.join(paths.npmDirectoryPath, ...fromRootPaths);
  return fork(npmFilePath, parameters, directoryPath, null);
}

export async function installPackages(packageJsonFilePath: string, isProduction: boolean, sdkArchiveVersion: string, sdkArchiveFilePath: string): Promise<void>
{
  logger.info(`Installing the ${isProduction === true ? "production" : ""} dependency packages relative to the file '${packageJsonFilePath}'`);
  let installedInternalSdk = false;
  const packageJsonDirectoryPath = path.resolve(packageJsonFilePath, "..");
  {
    // We first install the internal TypeScript SDK if it is required
    const packageJson: Record<string, any> = JSON.parse(fs.readFileSync(packageJsonFilePath, { encoding: "utf8" }));
    const dependencies = packageJson["dependencies"];
    const requiredSdkVersion = dependencies === undefined ? undefined : dependencies[internalNodeSdkIdentifier];
    if (requiredSdkVersion !== undefined)
    {
      if (requiredSdkVersion === sdkArchiveVersion)
      {
        const childProcess = await runNpm(["install", "--no-package-lock", "--force", sdkArchiveFilePath], packageJsonDirectoryPath);
        await waitFor(childProcess);
        installedInternalSdk = true;
      }
      else
      {
        throw new Error(`The internal TypeScript SDK version '${requiredSdkVersion}' is not available, only the version '${sdkArchiveVersion}' is supported`);
      }
    }
  }
  const parameters = ["install", "--no-package-lock", `--os=${os.platform()}`, `--cpu=${os.arch()}`];
  if (isProduction === true)
  {
    parameters.push("--omit=dev");
  }
  const childProcess = await runNpm(parameters, packageJsonDirectoryPath);
  await waitFor(childProcess);
  if (installedInternalSdk === true)
  {
    // We create a symbolic link from the internal to the public SDK, and we do that after the previous "npm install" otherwise the link is removed
    const nodeModules = "node_modules";
    const internalDirectoryPath = path.join(packageJsonDirectoryPath, nodeModules, `@${nodeSdkScope}`, internalExtensionSdk);
    const publicDirectoryPath = path.join(packageJsonDirectoryPath, nodeModules, `@${nodeSdkScope}`, extensionSdk);
    fs.symlinkSync(internalDirectoryPath, publicDirectoryPath, "dir");
    logger.debug(`Created a symbolic link from directory '${internalDirectoryPath}' to '${publicDirectoryPath}'`);
  }
}
