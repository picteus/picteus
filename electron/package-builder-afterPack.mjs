// Taken and adapted from https://github.com/ganeshrvel/tutorial-electron-afterpack-script
import path from "node:path";
import fs from "node:fs";

import { sync } from "glob";


const postPackage = (context) =>
{
  console.info("Running a post-packaging script");
  const supportedLocales = ["en", "fr"];
  const fileExtension = "lproj";
  const lprojRegexp = RegExp(`(${supportedLocales.join("|")})\.${fileExtension}`, "g");
  const workingDirectory = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources`);
  const directoryNames = sync(`*.${fileExtension}`, { cwd: workingDirectory });

  const promises = [];
  switch (context.packager.platform.name)
  {
    case "mac":
      directoryNames.forEach(directoryName =>
      {
        if (lprojRegexp.test(directoryName) === false)
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
      break;
    default:
      break;
  }

  return Promise.all(promises);
};
// noinspection JSUnusedGlobalSymbols
export default postPackage;
