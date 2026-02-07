// Taken and adapted from https://github.com/ganeshrvel/tutorial-electron-afterpack-script
import path from "node:path";
import fs from "node:fs";

import { sync } from "glob";


const postPackage = (context) =>
{
  const platformName = context.packager.platform.name;
  console.info(`Running a post-packaging script for the '${platformName}' platform on directory '${context.appOutDir}'`);

  let fileExtension;
  let workingDirectory;
  switch (platformName)
  {
    case "mac":
      workingDirectory = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources`);
      fileExtension = "lproj";
      break;
    case "windows":
      workingDirectory = path.join(context.appOutDir, "locales");
      fileExtension = "pak";
      break;
    default:
      break;
  }

  const promises = [];

  if (workingDirectory !== undefined)
  {
    const supportedLocales = [platformName === "windows" ? "en-US" : "en"];
    const regexpPattern = `(${supportedLocales.join("|")})\.${fileExtension}`;
    const regexp = RegExp(regexpPattern, "g");
    const filesPattern = `*.${fileExtension}`;
    const directoryNames = sync(filesPattern, { cwd: workingDirectory });

    directoryNames.forEach(directoryName =>
    {
      if (regexp.test(directoryName) === false)
      {
        const directoryPath = path.join(workingDirectory, directoryName);
        console.debug(`Removing the directory '${directoryPath}' from the package`);
        const promise = new Promise((resolve) =>
        {
          fs.rmSync(directoryPath, { recursive: true, force: true });
          resolve();
        });
        promises.push(promise);
      }
    });
  }

  return Promise.all(promises);
};
// noinspection JSUnusedGlobalSymbols
export default postPackage;
