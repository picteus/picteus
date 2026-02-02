import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { exec } from "node:child_process";
import { pipeline } from "node:stream";
import { createGzip } from "node:zlib";
import { promisify } from "node:util";

import gulp from "gulp";
import gulpRun from "gulp-run";
import gulpReplace from "gulp-replace";
import gulpDel from "del";
import through from "through2";
import tar from "tar-fs";
import micromatch from "micromatch";


const useGulpForExec = Math.random() > 1;
const rootDirectoryPath = path.join(import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url)), "..");
const buildDirectoryPath = path.join(rootDirectoryPath, "build");
const buildServerDirectoryPath = path.join(buildDirectoryPath, "server");
const electronDirectoryPath = path.join(rootDirectoryPath, "electron");
const serverDirectoryPath = path.join(rootDirectoryPath, "server");
const serverSourceDirectoryPath = path.join(serverDirectoryPath, "src");
const webDirectoryPath = path.join(rootDirectoryPath, "web");
const generatedDirectoryPath = path.join(rootDirectoryPath, "generated");
const openApiGeneratedDirectoryPath = path.join(generatedDirectoryPath, "openapi");
const temporaryDirectoryPath = path.join(rootDirectoryPath, "tmp");
const packageJsonFileName = "package.json";
const nodeModulesDirectoryName = "node_modules";

const cleanDirectory = (directoryPath) =>
{
  return () =>
  {
    return gulpDel([directoryPath], { force: true });
  };
};

const buildTargetDirectoryPath = path.join(temporaryDirectoryPath, "build");
const cleanNodeModules = () =>
{
  return cleanDirectory(path.join(buildServerDirectoryPath, nodeModulesDirectoryName))();
};

const runGulpRun = async (command, execOptions) =>
{
  await new Promise((resolve, reject) =>
  {
    console.info(`Running the command '${command}' in the directory '${execOptions.cwd}'`);
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
};

const copyPackageJson = (sourceDirectoryPath, targetDirectoryPath) =>
{
  // We use Gulp v4.0.2, because of the bug reported at https://github.com/gulpjs/glob-stream/issues/125 and worked-around at https://github.com/gulpjs/gulp/issues/2785
  const absoluteDirectoryPath = path.resolve(sourceDirectoryPath, "..");
  const fixedPath = process.platform !== "win32" ? absoluteDirectoryPath : absoluteDirectoryPath.replaceAll("\\", "\\\\");
  return gulp
    .src([packageJsonFileName], { cwd: sourceDirectoryPath })
    .pipe(gulpReplace(/file:..\//g, `file:${fixedPath}/`))
    .pipe(gulp.dest(targetDirectoryPath));
};

const copyServerPackageJson = () =>
{
  return copyPackageJson(serverDirectoryPath, buildServerDirectoryPath);
};

const npmInstallOptions = `--include=optional --os=${process.env["OPERATING_SYSTEM"] ?? process.platform} --cpu=${process.env["ARCHICTURE"] ?? process.arch}`;

const installNpmPackages = (directoryPath) =>
{
  // We use the "--install-link" option so that the linked "@picteus/shared-back-end" module is installed like a regular one, implying that its dependencies are installed directly in the "node_module" folder, which is described at https://docs.npmjs.com/cli/v8/commands/npm-install#install-links
  const command = `npm install --omit=dev --no-package-lock ${npmInstallOptions} --install-link`;
  console.info(`Installing the npm packages via the command '${command}' with working directory '${directoryPath}'`);
  return runGulpRun(
    command,
    { cwd: directoryPath }
  );
};

const installServer = () =>
{
  return installNpmPackages(buildServerDirectoryPath);
};

const pruneNodeModulesForProduction = () =>
{
  const nodesModuleDirectoryPath = path.join(buildServerDirectoryPath, nodeModulesDirectoryName);
  console.info(`Pruning the '${nodeModulesDirectoryName}' directory from non-production files`);

  // We filter out all the files that do not match the patterns above
  function deleteNonMatchingFilesByPatterns(directoryPath, patterns)
  {
    function walk(directoryPath, forDirectories)
    {
      let allPaths = [];
      const filePaths = fs.readdirSync(directoryPath);
      for (const file of filePaths)
      {
        const nodePath = path.join(directoryPath, file);
        const stat = fs.statSync(nodePath);
        if (stat.isDirectory() === true)
        {
          if (forDirectories !== false)
          {
            allPaths.push(nodePath);
          }
          allPaths = allPaths.concat(walk(nodePath, forDirectories));
        }
        else
        {
          if (forDirectories !== true)
          {
            allPaths.push(nodePath);
          }
        }
      }
      return allPaths;
    }

    // Adapted from https://gist.github.com/jakub-g/5903dc7e4028133704a4
    function cleanEmptyFoldersRecursively(directoryPath)
    {
      if (fs.statSync(directoryPath).isDirectory() === false)
      {
        return;
      }
      let files = fs.readdirSync(directoryPath);
      if (files.length > 0)
      {
        files.forEach(function(file)
        {
          cleanEmptyFoldersRecursively(path.join(directoryPath, file));
        });
        // Re-evaluates files after having deleted subfolders, because the folder may be empty now
        files = fs.readdirSync(directoryPath);
      }
      if (files.length === 0)
      {
        fs.rmdirSync(directoryPath);
      }
    }

    const isDebug = (Math.random() > 1);
    const allNodePaths = walk(directoryPath, null);
    const relativeNodePaths = allNodePaths.map(filePath => path.relative(directoryPath, filePath));
    const matchedRelativeNodePaths = new Set(micromatch(relativeNodePaths, patterns, { dot: true, contains: true })
      // On Windows, the matched paths resort to the "/" separator: hence, we need to translate it into the platform separator
      .map(nodePath => nodePath.replaceAll("/", path.sep)));
    if (isDebug === true)
    {
      for (const nodePath of matchedRelativeNodePaths)
      {
        console.debug(`The node path '${nodePath}' should be kept`);
      }
    }
    for (let index = 0; index < allNodePaths.length; index++)
    {
      const relativeNodePath = relativeNodePaths[index];
      if (isDebug === true)
      {
        console.debug(`Handling the node path '${relativeNodePath}'`);
      }
      if (matchedRelativeNodePaths.has(relativeNodePath) === false)
      {
        const nodePath = allNodePaths[index];
        let hasChildWhichShouldBeKept = false;
        for (const aMatchedRelativeNodePath of matchedRelativeNodePaths)
        {
          if (aMatchedRelativeNodePath.startsWith(relativeNodePath) === true)
          {
            hasChildWhichShouldBeKept = true;
            break;
          }
        }
        if (hasChildWhichShouldBeKept === false)
        {
          if (isDebug === true)
          {
            console.info(`Removing the node path '${nodePath}'`);
          }
          fs.rmSync(nodePath, { recursive: true, force: true });
        }
      }
    }
    cleanEmptyFoldersRecursively(directoryPath);
  }

  // const patterns = serverPatterns.concat(electronPatterns);
  const patterns = JSON.parse(fs.readFileSync(path.join(serverDirectoryPath, "package-pruning.json"), { encoding: "utf8" }));
  const resolvedPatterns = patterns.map((pattern) =>
  {
    return pattern.replace("${platform}", process.platform).replace("${arch}", process.arch);
  });
  deleteNonMatchingFilesByPatterns(nodesModuleDirectoryPath, resolvedPatterns);
  return Promise.resolve();
};

const copyElectronPackageJson = () =>
{
  return copyPackageJson(electronDirectoryPath, buildTargetDirectoryPath);
};

const installElectron = () =>
{
  return installNpmPackages(buildTargetDirectoryPath);
};

// Those are the packages that need to be kept in the server "node_modules" directory, even if they should be present in the Electron "node_modules" directory
// We also need to keep the "tslib" and "rxjs" modules, for a reason that cannot be explained so far
const toBeKeptPackages = ["tslib", "rxjs", "@babel", "color", "@xmldom", "base64-js", "mkdirp"];
const computePruneElectronDuplicates = () =>
{
  const collect = (directories) =>
  {
    return through.obj(
      (file, encoding, callback) =>
      {
        directories.push(file.basename);
        return callback(null, file);
      },
      undefined,
      false
    );
  };
  const serverDirectoryNames = [];
  const electronDirectoryNames = [];
  const pattern = nodeModulesDirectoryName + "/*";
  const areChainsInDebugMode = false;
  const serverChain = () =>
  {
    return gulp
      .src(pattern, { cwd: buildServerDirectoryPath, allowEmpty: false, debug: areChainsInDebugMode })
      .pipe(collect(serverDirectoryNames));
  };
  const electronChain = () =>
  {
    return gulp
      .src(pattern, { cwd: buildTargetDirectoryPath, debug: areChainsInDebugMode })
      .pipe(collect(electronDirectoryNames));
  };
  const removeDuplicates = () =>
  {
    console.log(`The Node.js modules of the 'server' are [${serverDirectoryNames.join(", ")}]`);
    console.log(`The Node.js modules of the 'electron' are [${electronDirectoryNames.join(", ")}]`);
    const alreadyAvailableModuleNames = serverDirectoryNames.filter((value) =>
    {
      return electronDirectoryNames.includes(value) === true && toBeKeptPackages.indexOf(value) === -1;
    });
    console.log(`The Node.js duplicated folders to delete are [${alreadyAvailableModuleNames.join(", ")}]`);
    const alreadyAvailableInElectronDirectoryPaths = alreadyAvailableModuleNames.concat([".bin"])
      .map((value) =>
      {
        return path.join(buildServerDirectoryPath, nodeModulesDirectoryName, value);
      });
    return gulpDel(alreadyAvailableInElectronDirectoryPaths, { force: true });
  };
  return [serverChain, electronChain, removeDuplicates];
};

const cleanPackageJson = () =>
{
  return gulpDel([path.join(buildServerDirectoryPath, packageJsonFileName)], {
    force: true
  });
};

// noinspection JSUnusedGlobalSymbols
export const installNodeModulesForDockerfile = gulp.series(
  cleanDirectory(buildTargetDirectoryPath),
  cleanNodeModules,
  copyServerPackageJson,
  installServer,
  pruneNodeModulesForProduction,
  cleanPackageJson
);

const [existingChain, newChain, removeDuplicates] = computePruneElectronDuplicates();
const pruneElectronDuplicates = gulp.series(existingChain, newChain, removeDuplicates);
// noinspection JSUnusedGlobalSymbols
export const installNodeModulesForElectron = gulp.series(
  cleanDirectory(buildTargetDirectoryPath),
  cleanNodeModules,
  copyServerPackageJson,
  installServer,
  copyElectronPackageJson,
  installElectron,
  pruneElectronDuplicates,
  pruneNodeModulesForProduction,
  cleanPackageJson
);

const secretsTargetDirectoryPath = path.join(buildServerDirectoryPath, "secrets");
// noinspection JSUnusedGlobalSymbols
export const copySecrets = gulp.series(
  cleanDirectory(secretsTargetDirectoryPath),
  () =>
  {
    return gulp
      .src(["**/*"], { cwd: path.join(serverDirectoryPath, "secrets") })
      .pipe(gulp.dest(secretsTargetDirectoryPath));
  }
);

// noinspection JSUnusedGlobalSymbols
export const copyDatabase = gulp.series(() =>
{
  return gulp
    .src(["database.db"], { cwd: serverDirectoryPath })
    .pipe(gulp.dest(buildServerDirectoryPath));
});

// noinspection JSUnusedGlobalSymbols
export const copyAssets = gulp.series(() =>
{
  return gulp
    .src(["assets/**/*", "!**/node_modules/**/*", "!**/node_modules", "!**/package-lock.json"], {
      cwd: serverDirectoryPath,
      dot: true
    })
    .pipe(gulp.dest(path.join(buildServerDirectoryPath, "assets")));
});

const packageId = "picteus-ws-client";
const npmPackageId = "@picteus/ws-client";
// const packageName = "Picteus client library";
const packageDescription = "The Picteus client library";
const packageUrl = "https://github.com/picteus/Picteus";
const gitUrl = "git@github.com:picteus/Picteus.git";
const dottedPackageName = "com.koppasoft.picteus.client";
const openApiFileName = "openapi.json";
const openApiFilePath = path.join(serverDirectoryPath, openApiFileName);
const openApiToolsFilePath = path.join(serverDirectoryPath, "openapitools.json");
const LanguageAndVariants =
  {
    TypeScript: "typescript-fetch",
    JavaScript: "javascript",
    Python: "python",
    Java: "java"
  };
const computeOpenApi = () =>
{
  return JSON.parse(fs.readFileSync(openApiFilePath, { encoding: "utf8" }));
};
const computeOpenApiVersion = () =>
{
  return computeOpenApi().info.version;
};
const computeOpenApiTargetDirectoryPath = (languageAndVariant) =>
{
  return path.join(openApiGeneratedDirectoryPath, languageAndVariant);
};
const generateOpenApiClient = (languageAndVariant) =>
{
  // The OpenAPI generator options are described at https://github.com/OpenAPITools/openapi-generator/blob/master/modules/openapi-generator-maven-plugin/README.md
  // Inspired from https://medium.com/@debshish.pal/publish-a-npm-package-locally-for-testing-9a00015eb9fd
  const packagePrefix =
    languageAndVariant === LanguageAndVariants.Python ||
    languageAndVariant === LanguageAndVariants.JavaScript
      ? ""
      : `${dottedPackageName}.`;
  const packageVersion = computeOpenApiVersion();
  const openApi = computeOpenApi();
  const info = openApi.info;
  const actualPackageName =
    languageAndVariant === LanguageAndVariants.Python
      ? packageId.replaceAll("-", "_")
      : `${dottedPackageName}`;
  const packagesFragment =
    languageAndVariant === LanguageAndVariants.Python
      ? ""
      : `,modelPackage="${packagePrefix}model",apiPackage="${packagePrefix}api"`;
  const licenseName = info.license === undefined ? undefined : `${languageAndVariant === LanguageAndVariants.Python ? "LicenseRef-" : ""}${info.license.name}`;

  const actualOpenApiFilePath = path.join(openApiGeneratedDirectoryPath, openApiFileName);
  if (fs.existsSync(openApiGeneratedDirectoryPath) === false)
  {
    fs.mkdirSync(openApiGeneratedDirectoryPath, { recursive: true });
  }
  if (info.license.name !== licenseName)
  {
    // We rewrite the OpenAPI specifications JSON file to fix an issue with the license when generating the code into Python, because even the "licenseInfo" parameter passed to the CLI "--additional-properties" option is not enough to fix the issue
    info.license.name = licenseName;
    fs.writeFileSync(actualOpenApiFilePath, JSON.stringify(openApi));
  }
  else
  {
    fs.copyFileSync(openApiFilePath, actualOpenApiFilePath);
  }

  // The documentation about the "openapi-generator-cli" configuration file is available at https://github.com/OpenAPITools/openapi-generator-cli?tab=readme-ov-file#configuration
  if (fs.existsSync(openApiToolsFilePath) === false)
  {
    const openApiToolsJsonObject =
      {
        "$schema": "./node_modules/@openapitools/openapi-generator-cli/config.schema.json",
        "spaces": 2,
        "generator-cli":
          {
            "version": "7.17.0"
          }
      };
    fs.writeFileSync(openApiToolsFilePath, JSON.stringify(openApiToolsJsonObject, undefined, 2));
  }
  const openApiToolsJsonObject = JSON.parse(fs.readFileSync(openApiToolsFilePath, { encoding: "utf8" }));
  const generatorCli = openApiToolsJsonObject["generator-cli"];
  let generators = generatorCli["generators"];
  if (generators === undefined)
  {
    generators = {};
    generatorCli["generators"] = generators;
  }
  const additionalProperties =
    {
      "packageName": actualPackageName,
      "gitRepoId": "koppasoft/Picteus",
      "gitUserId": "koppasoft",
      "npmName": npmPackageId,
      "npmVersion": packageVersion,
      "npmRepository": packageUrl,
      "projectDescription": packageDescription,
      "moduleName": npmPackageId,
      "projectName": languageAndVariant === LanguageAndVariants.JavaScript || languageAndVariant === LanguageAndVariants.TypeScript ? npmPackageId : packageId,
      "groupId": dottedPackageName,
      "artifactId": packageId,
      "artifactVersion": packageVersion,
      "withInterfaces": true,
      "paramNaming": "camelCase",
      "enumPropertyNaming": languageAndVariant === LanguageAndVariants.Java ? undefined : "PascalCase",
      "prefixParameterInterfaces": true,
      "removeOperationIdPrefix": false,
      "useSingleRequestParameter": true,
      "supportsES6": false,
      "legacyDiscriminatorBehavior": false,
      "importFileExtension": "",
      "platform": "node",
      "packageVersion": packageVersion,
      "packageUrl": packageUrl,
      "artifactUrl": packageUrl,
      "artifactDescription": packageDescription,
      "scmConnection": gitUrl,
      "scmDeveloperConnection": gitUrl,
      "scmUrl": packageUrl,
      "developerEmail": info.contact.email,
      "developerName": info.contact.name
    };
  if (info.license !== undefined)
  {
    Object.assign(additionalProperties,
      {
        "licenseName": licenseName,
        "licenseInfo": licenseName,
        "developerOrganization": info.license.name,
        "developerOrganizationUrl": info.license.url
      });
  }
  if (languageAndVariant !== LanguageAndVariants.Python)
  {
    Object.assign(additionalProperties,
      {
        "modelPackage": `${packagePrefix}model`,
        "apiPackage": `${packagePrefix}api`
      });
  }
  const generatorName = languageAndVariant;
  // This is a work-around in Windows, shared at https://github.com/OpenAPITools/openapi-generator/issues/14075#issuecomment-2266095826, otherwise we experience "Illegal character in opaque part at index 2" runtime errors during the code generation
  const inputSpec = process.platform === "win32" ? actualOpenApiFilePath.replaceAll("\\", "/") : actualOpenApiFilePath;
  generators[generatorName] =
    {
      "generatorName": generatorName,
      "inputSpec": inputSpec,
      "output": computeOpenApiTargetDirectoryPath(languageAndVariant),
      "additionalProperties": additionalProperties
      // Those options cause the generator process to fail
      // "globalProperties":
      //   {
      //     "apiTests": true,
      //     "modelTests": true,
      //     "modelDocs": true
      //   }
    };

  const resortToConfigurationFile = Math.random() <= 1;
  if (resortToConfigurationFile === true)
  {
    fs.writeFileSync(openApiToolsFilePath, JSON.stringify(openApiToolsJsonObject, undefined, 2));
    const openApiToolsOptionValue = process.platform === "win32" ? openApiToolsFilePath : `'${openApiToolsFilePath}'`;
    const openApiCommand = `openapi-generator-cli generate --openapitools ${openApiToolsOptionValue} --custom-generator ${generatorName}`;
    // We reduce the verbosity of the "openapi-generator-cli" executable via the Java logging level to "warn", as explained at https://github.com/OpenAPITools/openapi-generator/issues/1992
    return runGulpRun(openApiCommand, { cwd: serverDirectoryPath, env: { JAVA_OPTS: "-Dlog.level=warn" } });
  }
  else
  {
    fs.rmSync(openApiToolsFilePath);
    const openApiCommand = `openapi-generator-cli generate -g ${languageAndVariant} -i "${actualOpenApiFilePath}" -o "${computeOpenApiTargetDirectoryPath(languageAndVariant)}" --additional-properties=packageName="${actualPackageName}"${packagesFragment},gitRepoId="koppasoft/Picteus",gitUserId="koppasoft",npmName=${npmPackageId},npmVersion=${packageVersion},npmRepository="${packageUrl}",projectDescription="'${packageDescription}'",moduleName="${npmPackageId}",projectName="${languageAndVariant === LanguageAndVariants.JavaScript || languageAndVariant === LanguageAndVariants.TypeScript ? npmPackageId : packageId}",groupId="${dottedPackageName}",artifactId="${packageId}",artifactVersion="${packageVersion}",withInterfaces=true,paramNaming=camelCase,enumPropertyNaming=PascalCase,prefixParameterInterfaces=true,removeOperationIdPrefix=false,useSingleRequestParameter=true,supportsES6=false,legacyDiscriminatorBehavior=false,importFileExtension=,platform=node,packageVersion="${packageVersion}",packageUrl="${packageUrl}",artifactUrl="${packageUrl}",artifactDescription="'${packageDescription}'",scmConnection="${gitUrl}",scmDeveloperConnection="${gitUrl}",scmUrl="${packageUrl}"` + (info.license === undefined ? "" : `,licenseName="'${licenseName}'",licenseInfo="'${licenseName}'"`) + `,developerEmail="${info.contact.email}",developerName="'${info.contact.name}'"` + (info.license === undefined ? "" : `,developerOrganization="${info.license.name}"`) + (info.license === undefined ? "" : `,developerOrganizationUrl="${info.license.url}"`) + ` --global-property=apiTests=true,modelTests=true,modelDocs=true`;
    return runGulpRun(openApiCommand, { cwd: serverDirectoryPath });
  }
};

// noinspection JSUnusedGlobalSymbols
export const packageTypeScriptOpenApiClient = () =>
{
  const directoryPath = computeOpenApiTargetDirectoryPath(
    LanguageAndVariants.TypeScript
  );
  return runGulpRun(
    `cd ${directoryPath} && npm pack --loglevel warn && cd ${serverDirectoryPath}`,
    {}
  );
};

// noinspection JSUnusedGlobalSymbols
export const installTypeScriptOpenApiClient = () =>
{
  const directoryPath = computeOpenApiTargetDirectoryPath(
    LanguageAndVariants.TypeScript
  );
  const packageFilePath = path.join(
    directoryPath,
    `${packageId}-${computeOpenApiVersion()}.tgz`
  );
  return runGulpRun(
    `cd ${webDirectoryPath} && npm install ${packageFilePath} --no-save`,
    {}
  );
};

// noinspection JSUnusedGlobalSymbols
export const packageJavaScriptOpenApiClient = () =>
{
  const directoryPath = computeOpenApiTargetDirectoryPath(
    LanguageAndVariants.JavaScript
  );
  return runGulpRun(`npm install && npm pack`, { cwd: directoryPath });
};
// noinspection JSUnusedGlobalSymbols
export const packagePythonOpenApiClient = () =>
{
  const directoryPath = computeOpenApiTargetDirectoryPath(LanguageAndVariants.Python);
  const pythonExecutable = process.platform === "darwin" ? "python3" : "python";
  const activateCommand = `${process.platform === "darwin" ? "source " : (process.platform === "linux" ? ". " : "")}${path.join(".venv", process.platform === "win32" ? "Scripts" : "bin", "activate")}`;
  return runGulpRun(
    // The "-C--quiet" reduces the verbosity of the "build" module, taken from https://github.com/pypa/build/issues/772
    `${pythonExecutable} -m venv .venv && ${activateCommand} && pip install build && python -m build -C--quiet`,
    { cwd: directoryPath }
  );
};

// noinspection JSUnusedGlobalSymbols
export const updateVersion = async () =>
{
  const rootConfig = JSON.parse(fs.readFileSync(path.join(rootDirectoryPath, packageJsonFileName), { encoding: "utf8" }))["config"];
  const applicationVersion = rootConfig["serverVersion"];
  {
    const filePath = path.join(serverDirectoryPath, packageJsonFileName);
    const packageJson = JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }));
    packageJson.version = applicationVersion;
    fs.writeFileSync(filePath, JSON.stringify(packageJson, undefined, 2) + "\n");
  }
  {
    const filePath = path.join(serverSourceDirectoryPath, "constants.ts");
    const string = fs.readFileSync(filePath, { encoding: "utf8" });
    const apiVersion = rootConfig["apiVersion"];
    const tokens = [{ key: "applicationVersion", value: applicationVersion }, { key: "apiVersion", value: apiVersion }];
    const newString = tokens.reduce((string, token) =>
    {
      return string.replace(new RegExp(String.raw`${token.key}: "(\d+\.\d+\.\d+)"`, "g"), `${token.key}: "${token.value}"`);
    }, string);
    fs.writeFileSync(filePath, newString);
  }
  return Promise.resolve();
};

// noinspection JSUnusedGlobalSymbols
export const generateTypeScriptOpenApiClient = gulp.series(
  cleanDirectory(
    computeOpenApiTargetDirectoryPath(LanguageAndVariants.TypeScript)
  ),
  () =>
  {
    return generateOpenApiClient(LanguageAndVariants.TypeScript);
  },
  async () =>
  {
    // Lastly, we install the node dependencies so that the folder may be linked to other npm modules locally
    await runGulpRun(
      "npm install",
      { cwd: path.join(openApiGeneratedDirectoryPath, LanguageAndVariants.TypeScript), verbosity: 3 });
  }
);

// noinspection JSUnusedGlobalSymbols
export const generateJavaScriptOpenApiClient = gulp.series(
  cleanDirectory(
    computeOpenApiTargetDirectoryPath(LanguageAndVariants.JavaScript)
  ),
  () =>
  {
    return generateOpenApiClient(LanguageAndVariants.JavaScript);
  }
);

// noinspection JSUnusedGlobalSymbols
export const generatePythonOpenApiClient =
  gulp.series(
    cleanDirectory(computeOpenApiTargetDirectoryPath(LanguageAndVariants.Python)),
    () =>
    {
      return generateOpenApiClient(LanguageAndVariants.Python);
    }
  );

// noinspection JSUnusedGlobalSymbols
export const generateJavaOpenApiClient = gulp.series(
  cleanDirectory(computeOpenApiTargetDirectoryPath(LanguageAndVariants.Java)),
  () =>
  {
    return generateOpenApiClient(LanguageAndVariants.Java);
  }
);

const dotPrisma = ".prisma";

const deletePrismaClient = () =>
{
  return gulpDel([path.join(buildServerDirectoryPath, nodeModulesDirectoryName, dotPrisma)], {
    force: true
  });
};

// noinspection JSUnusedGlobalSymbols
export const copyPrismaClient = gulp.series(deletePrismaClient, () =>
{
  const directoryPath = path.join(serverDirectoryPath, nodeModulesDirectoryName);
  const intermediatePaths = [nodeModulesDirectoryName, dotPrisma, "client"];
  const otherDirectoryPath = path.join(buildServerDirectoryPath, ...intermediatePaths);
  fs.mkdirSync(otherDirectoryPath, { recursive: true });

  // We copy the "libquery_engine-*" files manually, because they are binary files that Gulp does not handle properly
  const libQueryEnginePrefix = "libquery_engine-";
  const prismaClientDirectoryPath = path.join(serverDirectoryPath, ...intermediatePaths);
  const libQueryEngineFileNames = fs.readdirSync(prismaClientDirectoryPath).filter((fileName) =>
  {
    return fileName.startsWith(libQueryEnginePrefix);
  });
  libQueryEngineFileNames.forEach((fileName) =>
  {
    fs.copyFileSync(
      path.join(prismaClientDirectoryPath, fileName),
      path.join(otherDirectoryPath, fileName)
    );
  });

  // Then, we copy the other files via Gulp
  return gulp
    .src([`${dotPrisma}/**`, `!${dotPrisma}/**/${libQueryEnginePrefix}*`], {
      cwd: directoryPath,
      base: dotPrisma,
      allowEmpty: false,
      buffer: false
    })
    .pipe(
      gulp.dest(path.join(buildServerDirectoryPath, nodeModulesDirectoryName), { buffer: false })
    );
});

const prisma = "prisma";

// Removes the absolute path from a generated class file
// noinspection JSUnusedGlobalSymbols
export const fixPrisma = async () =>
{
  const filePath = path.join(serverSourceDirectoryPath, "generated", "prisma-client", "internal", "class.ts");
  const content = fs.readFileSync(filePath, { encoding: "utf8" });
  fs.writeFileSync(filePath, content.replaceAll(serverDirectoryPath + path.sep, ""), { encoding: "utf8" });
};

const deletePrismaMigrations = () =>
{
  return gulpDel([path.join(buildServerDirectoryPath, prisma)], { force: true });
};

const copyPrismaMigrationsFolder = () =>
{
  const migrations = "migrations";
  const intermediatePaths = [prisma, migrations];
  const migrationsDirectoryPath = path.join(
    buildServerDirectoryPath,
    ...intermediatePaths
  );
  return gulp
    .src([`${prisma}/${migrations}/**/*.sql`], {
      cwd: serverDirectoryPath,
      allowEmpty: true,
      buffer: false
    })
    .pipe(gulp.dest(migrationsDirectoryPath, { buffer: false }));
};

// noinspection JSUnusedGlobalSymbols
export const copyPrismaMigrations = gulp.series(
  deletePrismaMigrations,
  copyPrismaMigrationsFolder
);

function downloadAndStoreFile(url, filePath, logFragment)
{
  return new Promise((resolve, reject) =>
  {
    console.debug(`Downloading the ${logFragment} from '${url}' and storing to the file '${filePath}'`);
    fetch(url).then((response) =>
    {
      if (response.ok === true)
      {
        return response.arrayBuffer().then((buffer) =>
        {
          fs.writeFileSync(filePath, Buffer.from(buffer));
          resolve();
        }).catch((error) =>
        {
          reject(new Error(`Could not write into the file '${filePath}' the content from URL '${url}'. Reason: '${error.message}`));
        });
      }
      else
      {
        reject(new Error(`Failed to download the ${logFragment} from '${url}', because of an HTTP request with status ${response.status}`));
      }
    });
  });
}


const pyenvArchiveFileName = "pyenv-posix.tar.gz";
const pythonRuntimePaths = ["runtimes", "python"];
const pythonRuntimeDirectoryPath = path.join(serverDirectoryPath, ...pythonRuntimePaths);

// noinspection JSUnusedGlobalSymbols
export const buildPyenv = async () =>
{
  const installationDirectoryPath = fs.mkdtempSync(path.join(os.tmpdir(), "picteus-"));
  // const installationDirectoryPath = "/var/folders/wf/7lf651m12tv4qrbb4984qdt80000gp/T/picteus-B7KGoP";
  const pyenvRootDirectoryPath = path.join(installationDirectoryPath, "root");
  if (fs.existsSync(installationDirectoryPath) === false)
  {
    fs.mkdirSync(installationDirectoryPath, { recursive: true });
  }
  const pyenvBaseUrl = "https://github.com/pyenv/pyenv-installer/raw/master/bin/";
  const downloadPackageFileName = "download-pyenv-package.sh";
  const downloadPackageFilePath = path.join(installationDirectoryPath, downloadPackageFileName);
  await downloadAndStoreFile(pyenvBaseUrl + downloadPackageFileName, downloadPackageFilePath, "pyenv download package");
  fs.chmodSync(downloadPackageFilePath, 0o755);
  const offlineInstallerFileName = "pyenv-offline-installer";
  const offlineInstallerFilePath = path.join(installationDirectoryPath, offlineInstallerFileName);
  await downloadAndStoreFile(pyenvBaseUrl + offlineInstallerFileName, offlineInstallerFilePath, "pyenv offline installer");
  fs.chmodSync(offlineInstallerFilePath, 0o755);

  await runGulpRun(
    `./${downloadPackageFileName}`,
    { cwd: installationDirectoryPath, verbosity: 3 }
  );
  await runGulpRun(
    `export PYENV_ROOT="${pyenvRootDirectoryPath}" && ./${offlineInstallerFileName}`,
    { cwd: installationDirectoryPath, verbosity: 3 }
  );
  const tarStream = tar.pack(pyenvRootDirectoryPath, {});
  const gzip = createGzip();
  const writeStream = fs.createWriteStream(pythonRuntimeDirectoryPath + "/" + pyenvArchiveFileName);
  const pipe = promisify(pipeline);
  // noinspection JSCheckFunctionSignatures
  await pipe(tarStream, gzip, writeStream);
};

// noinspection JSUnusedGlobalSymbols
export const copyPyenv = async () =>
{
  return gulp
    .src([pyenvArchiveFileName], { cwd: pythonRuntimeDirectoryPath })
    .pipe(gulp.dest(path.join(buildServerDirectoryPath, ...pythonRuntimePaths)));
};
