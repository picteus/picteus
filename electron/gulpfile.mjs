import path from "node:path";
import fs from "node:fs";
import process from "node:process";

import gulpRun from "gulp-run";
import YAML from "yaml";


const rootDirectoryPath = path.resolve(import.meta.dirname);
const packageJsonFileName = "package.json";
const packageJsonFilePath = path.join(rootDirectoryPath, packageJsonFileName);

function getPackageJson()
{
  return JSON.parse(fs.readFileSync(packageJsonFilePath, {encoding: "utf8"}));
}

// noinspection JSUnusedGlobalSymbols
export const updateVersion = async () =>
{
  const version = JSON.parse(fs.readFileSync(path.join(rootDirectoryPath, "..", packageJsonFileName), {encoding: "utf8"}))["config"]["applicationVersion"];
  {
    const packageJson = getPackageJson();
    packageJson.version = version;
    fs.writeFileSync(packageJsonFilePath, JSON.stringify(packageJson, undefined, 2) + "\n");
  }
  return Promise.resolve();
};

// noinspection JSUnusedGlobalSymbols
export const preparePackageBuilder = async () =>
{
  const cliArguments = process.argv;
  const entitlementFilePath = cliArguments.indexOf("--entitlementFilePath") === -1 ? "" : path.resolve(cliArguments[cliArguments.indexOf("--entitlementFilePath") + 1]);
  const outputDirectoryPath = cliArguments.indexOf("--directoryPath") === -1 ? "" : path.resolve(cliArguments[cliArguments.indexOf("--directoryPath") + 1]);
  const appleIdentityCompany = cliArguments.indexOf("--appleIdentityCompany") === -1 ? "" : cliArguments[cliArguments.indexOf("--appleIdentityCompany") + 1];
  // noinspection JSUnusedLocalSymbols
  const architecture = cliArguments[cliArguments.indexOf("--architecture") + 1];
  const packageBuilderFileName = "package-builder.json";
  if (fs.existsSync(outputDirectoryPath) === false)
  {
    fs.mkdirSync(outputDirectoryPath, {recursive: true});
  }
  const packagePruningFilePath = path.join(rootDirectoryPath, "..", "back-end", "package-pruning.json");
  const electronReplaceValue = JSON.parse(fs.readFileSync(packagePruningFilePath, {encoding: "utf8"})).map(entry =>
  {
    const isExclude = entry.startsWith("!") === true;
    const prefix = isExclude === true ? "!" : "";
    const newEntry = isExclude === true ? entry.substring(1) : entry;
    return `"${prefix}node_modules/${newEntry}"`;
  }).join(",\n");
  const backendReplaceValue = JSON.parse(fs.readFileSync(packagePruningFilePath, {encoding: "utf8"})).map(entry =>
  {
    const isExclude = entry.startsWith("!") === true;
    const prefix = isExclude === true ? "!" : "";
    const newEntry = isExclude === true ? entry.substring(1) : entry;
    return `"${prefix}${newEntry}"`;
  }).join(",\n");
  const keysAndValues =
    [
      {key: "extraElectronFilter", value: electronReplaceValue.substring(1, electronReplaceValue.length - 2)},
      {key: "extraBackendFilter", value: backendReplaceValue.substring(1, backendReplaceValue.length - 2)},
      {key: "entitlementFilePath", value: entitlementFilePath},
      {key: "appleIdentityCompany", value: appleIdentityCompany}
    ];
  let replacedString = fs.readFileSync(path.join(rootDirectoryPath, packageBuilderFileName), {encoding: "utf8"});
  for (const keysAndValue of keysAndValues)
  {
    replacedString = replacedString.replaceAll(`$\{${keysAndValue.key}}`, keysAndValue.value.replaceAll("\\", "\\\\"));
  }
  const filePath = path.join(outputDirectoryPath, packageBuilderFileName);
  console.debug(`Writing the electron-builder overwritten content to the the file '${filePath}'`);
  fs.writeFileSync(filePath, replacedString, {encoding: "utf8"});
  return Promise.resolve();
};

function computeUpdateFeedFilePath(outputDirectoryPath)
{
  return path.join(outputDirectoryPath, `feed-${process.platform}.json`);
}

function computeInstallPackageFileName(packageJson, withVersion)
{
  return `${packageJson.productName}${withVersion === true ? `-v${packageJson.version}` : ""}-${process.platform}-${process.arch}.${process.platform === "win32" ? "exe" : "zip"}`;
}

function computeGcsBucketBaseUrl(gcsBucketCoordinates, packageJson, isHttp, withVersion)
{
  const gcsBucketBaseUrl = isHttp === true ? `https://storage.googleapis.com/${gcsBucketCoordinates.substring("gs://".length)}` : gcsBucketCoordinates;
  return `${gcsBucketBaseUrl}${computeInstallPackageFileName(packageJson, withVersion)}`;
}

function computeGitHubPagesBaseUrl(gitHubProjectUrl, packageJson, withVersion)
{
  return `${gitHubProjectUrl}/releases/download/V${packageJson.version}/${computeInstallPackageFileName(packageJson, withVersion)}`;
}

// noinspection JSUnusedGlobalSymbols
export const generateUpdateFeed = async () =>
{
  const packageJson = getPackageJson();
  const cliArguments = process.argv;
  const outputDirectoryPath = path.resolve(cliArguments[cliArguments.indexOf("--directoryPath") + 1]);
  const inputFilePath = path.resolve(cliArguments[cliArguments.indexOf("--inputFilePath") + 1]);
  const bucketOptions = "--bucket";
  const gcsBucketCoordinates = cliArguments.indexOf(bucketOptions) === -1 ? undefined : cliArguments[cliArguments.indexOf(bucketOptions) + 1];
  const gitHubProjectOptions = "--githubprojecturl";
  const gitHubProjectUrl = cliArguments.indexOf(gitHubProjectOptions) === -1 ? undefined : cliArguments[cliArguments.indexOf(gitHubProjectOptions) + 1];
  const yamlFeed = YAML.parse(fs.readFileSync(inputFilePath, {encoding: "utf8"}));
  const withVersion = true;
  const feed =
    {
      version: packageJson.version,
      name: `v${packageJson.version}`,
      pub_date: yamlFeed.releaseDate,
      notes: undefined,
      url: gcsBucketCoordinates !== undefined ? computeGcsBucketBaseUrl(gcsBucketCoordinates, packageJson, true, withVersion) : computeGitHubPagesBaseUrl(gitHubProjectUrl, packageJson, withVersion),
      sha512: yamlFeed.sha512
    };
  const outputFilePath = computeUpdateFeedFilePath(outputDirectoryPath);
  fs.writeFileSync(outputFilePath, JSON.stringify(feed, undefined, 2), {encoding: "utf8"});
  console.info(`Generated the application update feed file '${outputFilePath}'`);
  return Promise.resolve();
};

// noinspection JSUnusedGlobalSymbols
export const deployUpdateFeedAndArtifactOnGcs = async () =>
{
  const cliArguments = process.argv;
  const outputDirectoryPath = path.resolve(cliArguments[cliArguments.indexOf("--directoryPath") + 1]);
  const gcsBucketCoordinates = cliArguments[cliArguments.indexOf("--bucket") + 1];
  const filePath = computeUpdateFeedFilePath(outputDirectoryPath);

  const promises = [];
  {
    const command = `gcloud storage cp --canned-acl publicRead ${process.platform === "win32" ? filePath : `"${filePath}"`} ${gcsBucketCoordinates}`;
    console.info(`Running the command '${command}'`);
    promises.push(gulpRun(
      command,
      {}
    ).exec(undefined, undefined));
  }
  {
    const packageJson = getPackageJson();
    const command = `gcloud storage cp --canned-acl publicRead ${computeGcsBucketBaseUrl(gcsBucketCoordinates, packageJson, false, true)} ${computeGcsBucketBaseUrl(gcsBucketCoordinates, packageJson, false, false)}`;
    console.info(`Running the command '${command}'`);
    promises.push(gulpRun(
      command,
      {}
    ).exec(undefined, undefined));
  }
  return Promise.all(promises);
};

// noinspection JSUnusedGlobalSymbols
export const deployArtefact = async () =>
{
  const cliArguments = process.argv;
  const distributionDirectoryPath = path.resolve(cliArguments[cliArguments.indexOf("--distributionDirectoryPath") + 1]);
  const packageJson = getPackageJson();
  const version = packageJson.version;
  const fileName = `${packageJson.productName}-v${version}-${process.platform}-${process.arch}.${process.platform === "win32" ? "exe" : "zip"}`;
  const filePath = path.join(distributionDirectoryPath, fileName);
  const command = `gh release upload v${version} ${filePath} --clobber`;
  console.info(`Running the command '${command}'`);
  return gulpRun(command, {}).exec(undefined, undefined);
};
