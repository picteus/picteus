import path from "node:path";
import fs from "node:fs";
import process from "node:process";
import { exec } from "node:child_process";

import gulp from "gulp";
import gulpRun from "gulp-run";
import zip from "gulp-zip";


const rootDirectoryPath = path.join(import.meta.dirname, ".");

const extensionSdk = "extension-sdk";
const nodeSdkScope = "picteus";
const excludedPackagedExtensionIds = ["example-python", "example-typescript", "c2pa", "flux"];
const picteusClientPackageName = `@${nodeSdkScope}/ws-client`;
const packageJsonFileName = "package.json";
const manifestFileName = "manifest.json";

function parseJsonFile(filePath)
{
  try
  {
    return JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }));
  }
  catch (error)
  {
    // This is not a JSON content file
    return undefined;
  }
}

function writeJsonFile(filePath, json)
{
  fs.writeFileSync(filePath, JSON.stringify(json, undefined, 2) + "\n");
}

async function crawl(extensionId, callback)
{
  const fileNames = fs.readdirSync(rootDirectoryPath);
  for (const fileName of fileNames)
  {
    if (fs.statSync(fileName).isDirectory() === true)
    {
      if (extensionId !== undefined && fileName !== extensionId)
      {
        continue;
      }
      await callback(fileName, path.join(rootDirectoryPath, fileName));
    }
  }
}

async function inspectExtensionRuntimes(directoryName, callback)
{
  const directoryPath = path.join(rootDirectoryPath, directoryName);
  console.info(`Analyzing the extension in directory '${directoryPath}'`);
  const manifest = parseJsonFile(path.join(directoryPath, manifestFileName));
  for (const runtime of manifest["runtimes"])
  {
    const environment = runtime["environment"];
    if (environment === "node")
    {
      // It requires some Node.js runtime environment
      const filePath = path.join(directoryPath, packageJsonFileName);
      if (fs.existsSync(filePath) === true)
      {
        console.info(`Found a Node.js runtime environment depending on file '${filePath}'`);
        await callback("node", filePath);
      }
    }
    else if (environment === "python")
    {
      // It requires some Python runtime environment
      const requirementsFileName = "requirements.txt";
      const filePath = path.join(directoryPath, requirementsFileName);
      if (fs.existsSync(filePath) === true)
      {
        console.info(`Found a Python runtime environment depending on file '${filePath}'`);
        await callback("python", filePath);
      }
    }
  }
  return manifest;
}

async function build(directoryName, targetDirectoryPath, forceReinstall)
{
  const directoryPath = path.join(rootDirectoryPath, directoryName);
  console.info(`Packaging the extension in directory '${directoryPath}'`);
  let hasPackageJson = false;
  let hasPythonRequirements = false;
  const execOptions = { cwd: directoryPath, verbosity: 3 };
  const manifest = await inspectExtensionRuntimes(directoryName, async (environment, filePath) =>
  {
    if (environment === "node")
    {
      hasPackageJson = true;
      const sdkDirectoryPath = path.join(rootDirectoryPath, "..", "sdk", "typescript");
      await runGulpRun(`npm --no-save link ${sdkDirectoryPath}`, execOptions);
      await runGulpRun("npm install", execOptions);
      const publicSdkDirectoryPath = path.join(directoryPath, "node_modules", `@${nodeSdkScope}`, extensionSdk);
      fs.symlinkSync(sdkDirectoryPath, publicSdkDirectoryPath, "dir");
      // The "build" script is required!
      await runGulpRun("npm run build", execOptions);
    }
    else if (environment === "python")
    {
      hasPythonRequirements = true;
      const pythonExecutable = process.platform === "darwin" ? "python3" : "python";
      const virtualEnvironmentDirectoryName = ".venv";
      await runGulpRun(`${pythonExecutable} -m venv ${virtualEnvironmentDirectoryName}`, execOptions);
      const pythonSdkDirectoryPath = path.resolve(rootDirectoryPath, "..", "..", "build", "sdk", "python");
      await runGulpRun(`${path.join(virtualEnvironmentDirectoryName, process.platform === "win32" ? "Scripts" : "bin", "pip")} install -r ${filePath}${forceReinstall === false ? "" : ` --no-cache-dir --force`} --find-links ${pythonSdkDirectoryPath}`, execOptions);
    }
  });

  if (excludedPackagedExtensionIds.indexOf(manifest.id) !== -1)
  {
    console.info(`Skipping the packaging of the extension with id '${manifest.id}'`);
    return Promise.resolve();
  }
  if (hasPackageJson === true && hasPythonRequirements === false)
  {
    // There is only some Node.js runtime and no Python runtime
    console.debug(`Using npm to package the extension into the directory '${targetDirectoryPath}'`);
    return gulpRun(`npm pack --pack-destination ${targetDirectoryPath}`, execOptions).exec(undefined, undefined);
  }
  else
  {
    const filename = `${directoryName}-${manifest.version}.zip`;
    console.debug(`Using a plain zip process to package the extension into the file '${path.join(targetDirectoryPath, filename)}'`);
    const excludedPatterns = [".venv", "node_modules", "node_modules/**/*", "package-lock.json", "tsconfig.json", "*.ts"];
    const excludedFiles = excludedPatterns.map((pattern) =>
    {
      return `!${directoryName}/${pattern}`;
    });
    return gulp.src([`${directoryName}/**/*`, ...excludedFiles]).pipe(zip(filename)).pipe(gulp.dest(targetDirectoryPath));
  }
}

async function runGulpRun(command, execOptions)
{
  await new Promise((resolve, reject) =>
  {
    console.info(`Running the command '${command}' in the directory '${execOptions.cwd}'`);
    const useGulpForExec = process.platform !== "win32";
    if (useGulpForExec === true)
    {
      gulpRun(command, execOptions).exec(undefined, (error) =>
      {
        if (error !== null)
        {
          reject(error);
        }
        else
        {
          resolve();
        }
      });
    }
    else
    {
      exec(command, { cwd: execOptions.cwd, env: { ...process.env, ...execOptions.env } }, (error, stdout, stderr) =>
      {
        if (stdout != null)
        {
          console.info(stdout);
        }
        if (stderr != null)
        {
          console.error(stderr);
        }
        if (error !== null)
        {
          reject(error);
        }
        else
        {
          resolve();
        }
      });
    }
  });
}

function crawlNodePackages(directoryPath, callback)
{
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  for (const entry of entries)
  {
    if (entry.name === "node_modules")
    {
      continue;
    }

    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory() === true)
    {
      crawlNodePackages(fullPath, callback);
    }
    else if (entry.name === packageJsonFileName)
    {
      const json = parseJsonFile(fullPath);
      if (json === undefined)
      {
        continue;
      }
      const hasWsClient = (json.dependencies !== undefined && json.dependencies[picteusClientPackageName]) !== undefined;
      if (hasWsClient === true)
      {
        console.info(`Handling the ${packageJsonFileName} file '${fullPath}' client library dependency`);
        const save = (updatedJson) =>
        {
          writeJsonFile(fullPath, updatedJson);
        };
        callback(json, json.dependencies, save);
      }
    }
  }
}

// noinspection JSUnusedGlobalSymbols
export const clean = gulp.series(async () =>
  {
    const deleteNode = (nodePath, isDirectory) =>
    {
      if (isDirectory === false)
      {
        if (fs.existsSync(nodePath) === true)
        {
          fs.rmSync(nodePath, { force: true });
        }
      }
      else
      {
        if (fs.existsSync(nodePath) === true)
        {
          fs.rmSync(nodePath, { recursive: true, force: true });
        }
      }
    };
    await crawl(undefined, async (directoryName, directoryPath) =>
    {
      await inspectExtensionRuntimes(directoryName, (environment, _filePath) =>
      {
        if (environment === "node")
        {
          deleteNode(path.join(directoryPath, "node_modules"), true);
          deleteNode(path.join(directoryPath, "dist"), true);
          deleteNode(path.join(directoryPath, "package-lock.json"), false);
        }
        else if (environment === "python")
        {
          deleteNode(path.join(directoryPath, ".venv"), true);
        }
        deleteNode(path.join(directoryPath, "parameters.json"), false);
      });
    });
    return Promise.resolve();
  }
);

// noinspection JSUnusedGlobalSymbols
export const incrementVersion = gulp.series(async () =>
  {
    const cliArguments = process.argv;
    const versionComponentOption = "--component";
    const usage = `Usage: gulp incrementVersion ${versionComponentOption} M | m | p`;
    let versionComponent;
    {
      const index = cliArguments.indexOf(versionComponentOption);
      if (index === -1 || index > cliArguments.length)
      {
        throw new Error(`Wrong CLI arguments\n${usage}`);
      }
      versionComponent = cliArguments[index + 1];
      if (versionComponent !== "M" && versionComponent !== "m" && versionComponent !== "p")
      {
        throw new Error(`Wrong CLI arguments\n${usage}`);
      }
    }
    await crawl(undefined, async (directoryName, directoryPath) =>
    {
      await inspectExtensionRuntimes(directoryName, (environment, filePath) =>
      {
        const manifestFilePath = path.join(directoryPath, manifestFileName);
        const manifest = parseJsonFile(manifestFilePath);
        const manifestVersion = manifest["version"];
        const [, major, minor, patch] = manifestVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
        const newVersion = versionComponent === "M" ? (`${parseInt(major) + 1}.${minor}.${patch}`) : (versionComponent === "m" ? (`${major}.${parseInt(minor) + 1}.${patch}`) : (`${major}.${minor}.${parseInt(patch) + 1}`));
        console.info(`Updating the extension with id '${manifest.id}' with file '${manifestFilePath}' from version '${manifestVersion}' to version '${newVersion}'`);
        manifest.version = newVersion;
        writeJsonFile(manifestFilePath, manifest);
        if (environment === "node")
        {
          const json = parseJsonFile(filePath);
          json.version = newVersion;
          writeJsonFile(filePath, json);
        }
      });
    });
    return Promise.resolve();
  }
);

// noinspection JSUnusedGlobalSymbols
export const updateVersion = gulp.series(async () =>
  {
    const configJson = parseJsonFile(path.join(rootDirectoryPath, "..", "..", packageJsonFileName))["config"];
    const sdkVersion = configJson["sdkVersion"];
    const apiVersion = configJson["apiVersion"];
    await crawl(undefined, async (directoryName, directoryPath) =>
    {
      crawlNodePackages(directoryPath, (json, dependencies, save) =>
      {
        dependencies[picteusClientPackageName] = apiVersion;
        save(json);
      });
      await inspectExtensionRuntimes(directoryName, (environment, filePath) =>
      {
        if (environment === "node")
        {
          const json = parseJsonFile(filePath);
          const dependencies = json["dependencies"];
          const internalSdkIdentifier = `@${nodeSdkScope}/internal-${extensionSdk}`;
          if (dependencies[internalSdkIdentifier] !== undefined)
          {
            dependencies[internalSdkIdentifier] = sdkVersion;
          }
          const publicSdkIdentifier = `@${nodeSdkScope}/${extensionSdk}`;
          if (dependencies[publicSdkIdentifier] !== undefined)
          {
            dependencies[publicSdkIdentifier] = sdkVersion;
          }
          writeJsonFile(filePath, json);
        }
      });
    });
    return Promise.resolve();
  }
);

// noinspection JSUnusedGlobalSymbols
export const buildAll = gulp.series(async () =>
{
  const cliArguments = process.argv;
  const targetDirectoryPathOption = "--targetDirectoryPath";
  const extensionIdOption = "--extensionId";
  const forceReinstallOption = "--forceReinstall";
  const usage = `Usage: gulp buildAll ${targetDirectoryPathOption} <target-directory> [${extensionIdOption} <extension-id>] [${forceReinstallOption}]`;
  let targetDirectoryPath;
  {
    const index = cliArguments.indexOf(targetDirectoryPathOption);
    if (index === -1 || index > cliArguments.length)
    {
      throw new Error(`Wrong CLI arguments\n${usage}`);
    }
    targetDirectoryPath = cliArguments[index + 1];
  }
  let extensionId;
  {
    const index = cliArguments.indexOf(extensionIdOption);
    if (index !== -1)
    {
      if (index > cliArguments.length)
      {
        throw new Error(`Missing parameter '${extensionIdOption}'\n${usage}`);
      }
      extensionId = cliArguments[index + 1];
    }
  }
  let forceReinstall;
  {
    forceReinstall = cliArguments.indexOf(forceReinstallOption) !== -1;
  }
  console.info(`Packaging ${extensionId === undefined ? "all extensions" : `the extension with id '${extensionId}'`} in directory '${rootDirectoryPath}' into '${targetDirectoryPath}' with current working directory '${process.cwd()}', using Node.js ${process.version}`);

  if (process.platform === "darwin" || process.platform === "linux")
  {
    // We create the "extensions/lib" directory on macOS and Linux, because of a strange bug, see https://github.com/npm/cli/issues/6971
    const libDirectoryPath = path.join(rootDirectoryPath, "..", "lib");
    console.debug(`Ensuring that the '${libDirectoryPath}' directory exists`);
    if (fs.existsSync(libDirectoryPath) === false)
    {
      fs.mkdirSync(libDirectoryPath, { recursive: true });
    }
  }

  // We make sure that the target directory exists, otherwise the "npm pack" command will fail
  if (fs.existsSync(targetDirectoryPath) === false)
  {
    fs.mkdirSync(targetDirectoryPath, { recursive: true });
  }
  await crawl(extensionId, async (directoryName, _directoryPath) =>
  {
    await build(directoryName, targetDirectoryPath, forceReinstall);
  });
});
