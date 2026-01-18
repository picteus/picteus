import path from "node:path";
import fs from "node:fs";

import gulp from "gulp";
import gulpRun from "gulp-run";


const pythonPublicSdkName = "picteus-extension-sdk";
const nodePublicSdkName = "@picteus/extension-sdk";

function computeTypeScriptDirectoryPath(workingDirectoryPath)
{
  return path.join(workingDirectoryPath, "typescript");
}

function computeTypeScriptPackageFilePath(workingDirectoryPath)
{
  return path.join(computeTypeScriptDirectoryPath(workingDirectoryPath), "package.json");
}

function computePythonDirectoryPath(workingDirectoryPath)
{
  return path.join(workingDirectoryPath, "python");
}

function computePythonPyProjectFilePath(workingDirectoryPath)
{
  return path.join(computePythonDirectoryPath(workingDirectoryPath), "pyproject.toml");
}

// noinspection JSUnusedGlobalSymbols
export const updateVersion = gulp.series(
  () =>
  {
    const workingDirectoryPath = path.resolve(".");
    const version = JSON.parse(fs.readFileSync(path.join(workingDirectoryPath, "..", "..", "package.json"), { encoding: "utf8" }))["config"]["sdkVersion"];
    {
      const filePath = computeTypeScriptPackageFilePath(workingDirectoryPath);
      const json = JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }));
      json["version"] = version;
      fs.writeFileSync(filePath, JSON.stringify(json, undefined, 2) + "\n");
    }
    {
      {
        const filePath = computePythonPyProjectFilePath(workingDirectoryPath);
        const string = fs.readFileSync(filePath, { encoding: "utf8" });
        fs.writeFileSync(filePath, string.replace(/version = "(\d+\.\d+\.\d+)"/g, `version = "${version}"`));
      }
      {
        const filePath = path.join(computePythonDirectoryPath(workingDirectoryPath), "picteus_extension_sdk", "__init__.py");
        const string = fs.readFileSync(filePath, { encoding: "utf8" });
        const newString = string.replace(/__version__: str = "(\d+\.\d+\.\d+)"/g, `__version__: str = "${version}"`);
        fs.writeFileSync(filePath, newString);
      }
    }
    return Promise.resolve();
  }
);

export const tweakForPublicSdk = gulp.series(
  () =>
  {
    const workingDirectoryPath = path.resolve(".");
    {
      {
        const filePath = computeTypeScriptPackageFilePath(workingDirectoryPath);
        const packageJson = JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }));
        packageJson["name"] = nodePublicSdkName;
        packageJson["private"] = false;
        fs.writeFileSync(filePath, JSON.stringify(packageJson, undefined, 2));
      }
      {
        const filePath = computePythonPyProjectFilePath(workingDirectoryPath);
        const string = fs.readFileSync(filePath, { encoding: "utf8" });
        fs.writeFileSync(filePath, string.replace(/name = "(.*)"/g, `name = "${pythonPublicSdkName}"`));
      }
    }
    {
      const parentDirectoryPath = path.join(workingDirectoryPath, "..");
      const packageJsonFilePath = path.join(parentDirectoryPath, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonFilePath, { encoding: "utf8" }));
      const config = packageJson["config"];
      config["referenceRelativePath"] = "../../server";
      config["buildRelativePath"] = "build";
      config["sdkRelativePath"] = "sdk";
      fs.writeFileSync(packageJsonFilePath, JSON.stringify(packageJson, undefined, 2));

      let environmentFileName;
      let npmScript;
      const cliArguments = process.argv;
      for (let index = 0; index < cliArguments.length; index++)
      {
        const argument = cliArguments[index];
        if (argument === "--environmentFileName" && (index + 1) < cliArguments.length)
        {
          environmentFileName = cliArguments[index + 1];
        }
        if (argument === "--npmScript" && (index + 1) < cliArguments.length)
        {
          npmScript = cliArguments[index + 1];
        }
      }
      const environmentFilePath = path.join(parentDirectoryPath, environmentFileName);

      // We spawn a new process because this is a way to discard the inherited environment variables
      const env = process.env;
      const content = fs.readFileSync(environmentFilePath, { encoding: "utf8" });
      const lines = content.split("\n");
      for (const line of lines)
      {
        const tokens = line.split("=");
        if (tokens.length === 2)
        {
          const variableName = tokens[0].trim();
          console.debug("Deleting the environment variable '" + variableName + "'");
          delete env[variableName];
        }
      }
      return gulpRun(`npm run ${npmScript}`, {
        cwd: parentDirectoryPath,
        verbosity: 3,
        env
      }).exec(undefined, undefined);
    }

  }
);
