import path from "node:path";
import fs from "node:fs";
import process from "node:process";

import gulp from "gulp";
import gulpRun from "gulp-run";
import zip from "gulp-zip";


const forceReinstall = Math.random() > 1;
const rootDirectoryPath = path.join(import.meta.dirname, ".");

const extensionSdk = "extension-sdk";
const nodeSdkScope = "picteus";
const excludedPackagedExtensionIds = ["example-python", "example-typescript", "c2pa", "freepik", "flux"];

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
      await callback(fileName);
    }
  }
}

async function inspectExtensionRuntimes(directoryName, callback)
{
  const directoryPath = path.join(rootDirectoryPath, directoryName);
  console.info(`Analyzing the extension in directory '${directoryPath}'`);
  const manifest = JSON.parse(fs.readFileSync(path.join(directoryPath, "manifest.json"), { encoding: "utf8" }));
  for (const runtime of manifest["runtimes"])
  {
    const environment = runtime["environment"];
    if (environment === "node")
    {
      // It requires some Node.js runtime environment
      const filePath = path.join(directoryPath, "package.json");
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

async function build(directoryName, targetDirectoryPath)
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
  });
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
    await crawl(undefined, async (directoryName) =>
    {
      await inspectExtensionRuntimes(directoryName, (environment, filePath) =>
      {
        const options = { recursive: true, force: true };
        const directoryPath = path.join(rootDirectoryPath, directoryName);
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
export const updateVersion = gulp.series(async () =>
  {
    const version = JSON.parse(fs.readFileSync(path.join(rootDirectoryPath, "..", "..", "package.json"), { encoding: "utf8" }))["config"]["sdkVersion"];
    await crawl(undefined, async (directoryName) =>
    {
      await inspectExtensionRuntimes(directoryName, (environment, filePath) =>
      {
        if (environment === "node")
        {
          const json = JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }));
          const dependencies = json["dependencies"];
          const internalSdkIdentifier = `@${nodeSdkScope}/internal-${extensionSdk}`;
          if (dependencies[internalSdkIdentifier] !== undefined)
          {
            dependencies[internalSdkIdentifier] = version;
          }
          const publicSdkIdentifier = `@${nodeSdkScope}/${extensionSdk}`;
          if (dependencies[publicSdkIdentifier] !== undefined)
          {
            dependencies[publicSdkIdentifier] = version;
          }
          fs.writeFileSync(filePath, JSON.stringify(json, undefined, 2) + "\n");
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
  const usage = "Usage: gulp buildAll --target-directory <target-directory> [--extensionId <extension-id>]";
  let targetDirectoryPath;
  {
    const index = cliArguments.indexOf("--targetDirectoryPath");
    if (index === -1 || index > cliArguments.length)
    {
      throw new Error(`Wrong CLI arguments\n${usage}`);
    }
    targetDirectoryPath = cliArguments[index + 1];
  }
  let extensionId;
  {
    const index = cliArguments.indexOf("--extensionId");
    if (index !== -1)
    {
      if (index > cliArguments.length)
      {
        throw new Error(`Missing parameter '--extensionId'\n${usage}`);
      }
      extensionId = cliArguments[index + 1];
    }
  }
  console.info(`Packaging ${extensionId === undefined ? "all extensions" : `the extension with id ${extensionId}`} in directory '${rootDirectoryPath}' into '${targetDirectoryPath}' with current working directory '${process.cwd()}', using Node.js ${process.version}`);

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
  await crawl(extensionId, async (directoryName) =>
  {
    await build(directoryName, targetDirectoryPath);
  });
});
