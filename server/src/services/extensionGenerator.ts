import path from "node:path";
import fs from "node:fs";

import { logger } from "../logger";
import { paths } from "../paths";
import { stringify } from "../utils";
import { ExtensionGenerationOptions, Manifest, ManifestEvent, ManifestRuntimeEnvironment } from "../dtos/app.dtos";
import { parametersChecker } from "./utils/parametersChecker";
import { waitFor } from "./utils/processWrapper";
import { internalNodeSdkIdentifier, packageJsonFileName, publicNodeSdkIdentifier, runNpm } from "./utils/npmWrapper";
import { internalPythonSdkIdentifier, publicPythonSdkIdentifier } from "./utils/pythonWrapper";
import { ExtensionArchiveReader, ExtensionRegistry } from "./extensionRegistry";


export class ExtensionGenerator
{

  static readonly version = "1.0.0";

  async run(parentDirectoryPath: string, options: ExtensionGenerationOptions, withPublicSdk: boolean): Promise<string>
  {
    logger.info(`Generating the scaffolding for the extension with id '${options.id}' running in environment '${options.environment}' into the directory '${parentDirectoryPath}' with the ${withPublicSdk === true ? "public" : "private"} SDK`);
    // noinspection FallThroughInSwitchStatementJS
    switch (options.environment)
    {
      default:
        parametersChecker.throwBadParameter("environment", options.environment, "the environment is not supported");
      case ManifestRuntimeEnvironment.Node:
        return this.generateNodeExtension(parentDirectoryPath, options, withPublicSdk);
      case ManifestRuntimeEnvironment.Python:
        return await this.generatePythonExtension(parentDirectoryPath, options, withPublicSdk);
    }
  }

  private async generateNodeExtension(parentDirectoryPath: string, options: ExtensionGenerationOptions, withPublicSdk: boolean): Promise<string>
  {
    const moduleDirectoryPath = this.prepareModuleDirectory(parentDirectoryPath, options.id);
    await this.generateNodeExtensionViaTemplate(moduleDirectoryPath, options, withPublicSdk);
    await parametersChecker.checkObject<Manifest>(Manifest, JSON.parse(fs.readFileSync(path.join(moduleDirectoryPath, ExtensionRegistry.manifestFileName), "utf8")), `The manifest '${ExtensionRegistry.manifestFileName}' file does not respect the expected schema`);
    return moduleDirectoryPath;
  }

  private async generateNodeExtensionViaTemplate(moduleDirectoryPath: string, options: ExtensionGenerationOptions, withPublicSdk: boolean): Promise<void>
  {
    await this.copyTemplateFiles(moduleDirectoryPath, options, withPublicSdk);

    const packageJsonFilePath = path.join(moduleDirectoryPath, packageJsonFileName);
    const packageJson: Record<string, any> = JSON.parse(fs.readFileSync(packageJsonFilePath, "utf8"));
    packageJson.name = options.id;
    packageJson.version = options.version;
    packageJson.productName = options.name;
    packageJson.description = options.description;
    fs.writeFileSync(packageJsonFilePath, stringify(packageJson), "utf8");

    this.replaceManifest(moduleDirectoryPath, options);
  }

  // noinspection JSUnusedLocalSymbols
  private async generateNodeExtensionViaCode(moduleDirectoryPath: string, options: ExtensionGenerationOptions, withPublicSdk: boolean): Promise<void>
  {
    const distributionRelativePath = "./dist";
    {
      const childProcess = await runNpm(["init", "--yes"], moduleDirectoryPath);
      await waitFor(childProcess);
      const packageJsonFilePath = path.join(moduleDirectoryPath, packageJsonFileName);
      const packageJson = JSON.parse(fs.readFileSync(packageJsonFilePath, "utf8"));
      packageJson.productName = options.name;
      packageJson.description = options.description;
      packageJson.version = options.version;
      packageJson.engines = { node: ">=20" };
      packageJson.type = "module";
      packageJson.main = `${distributionRelativePath}/main.js`;
      packageJson.files = [distributionRelativePath, `./${ExtensionRegistry.manifestFileName}`];
      packageJson.scripts =
        {
          "build": "tsc"
        };
      packageJson.devDependencies = { "typescript": "5.9.2", "@types/node": "22.17.1" };
      {
        const archiveFilePath = (await ExtensionRegistry.getSdkInfo(ManifestRuntimeEnvironment.Node)).filePath;
        const buffer = fs.readFileSync(archiveFilePath);
        const string = await new ExtensionArchiveReader(buffer).extractFile(packageJsonFileName);
        if (string === undefined)
        {
          parametersChecker.throwBadParameterError(`The TypeScript extension SDK tarball '${archiveFilePath}' misses the '${packageJsonFileName}' file`);
        }
        const packageJson: Record<string, any> = JSON.parse(string);
        packageJson.dependencies = { [packageJson.name]: packageJson.version };
      }
      fs.writeFileSync(packageJsonFilePath, stringify(packageJson), "utf8");
    }
    {
      const tsConfig =
        {
          "$schema": "https://json.schemastore.org/tsconfig",
          "compilerOptions": {
            "module": "esnext",
            "moduleResolution": "Node",
            "target": "es2022",
            "outDir": "./dist",
            "declaration": false,
            "emitDecoratorMetadata": false,
            "experimentalDecorators": false,
            "noImplicitAny": true,
            "sourceMap": false
          },
          "include": ["./src"]
        };
      fs.writeFileSync(path.join(moduleDirectoryPath, "tsconfig.json"), stringify(tsConfig), "utf8");
    }
    {
      const manifest: Manifest =
        {
          id: options.id,
          version: options.version,
          name: options.name,
          description: options.description,
          runtimes:
            [
              {
                environment: ManifestRuntimeEnvironment.Node
              }
            ],
          instructions:
            [
              {
                events: [ManifestEvent.ProcessStarted],
                execution:
                  {
                    executable: "${node}",
                    arguments: [`${distributionRelativePath}/main.js`]
                  },
                commands: []
              }
            ],
          settings:
            {
              "type": "object",
              "properties": {
                "parameter": {
                  "type": "string",
                  "title": "Parameter",
                  "description": "A parameter which enables to tune the extension."
                }
              },
              "required": ["parameter"]
            }
        };
      fs.writeFileSync(path.join(moduleDirectoryPath, ExtensionRegistry.manifestFileName), stringify(manifest), "utf8");
    }
  }

  private async generatePythonExtension(parentDirectoryPath: string, options: ExtensionGenerationOptions, withPublicSdk: boolean): Promise<string>
  {
    const moduleDirectoryPath = this.prepareModuleDirectory(parentDirectoryPath, options.id);
    await this.copyTemplateFiles(moduleDirectoryPath, options, withPublicSdk);
    this.replaceManifest(moduleDirectoryPath, options);
    return moduleDirectoryPath;
  }

  private prepareModuleDirectory(parentDirectoryPath: string, id: string): string
  {
    const moduleDirectoryPath = path.join(parentDirectoryPath, id);
    if (fs.existsSync(moduleDirectoryPath) === true)
    {
      parametersChecker.throwBadParameter("directoryPath", moduleDirectoryPath, `the directory '${moduleDirectoryPath}' already exists`);
    }
    fs.mkdirSync(moduleDirectoryPath, { recursive: true });
    return moduleDirectoryPath;
  }

  private async copyTemplateFiles(moduleDirectoryPath: string, options: ExtensionGenerationOptions, withPublicSdk: boolean): Promise<void>
  {
    const environment = options.environment;
    const sourceDirectoryPath = path.join(paths.serverDirectoryPath, "assets", "extensions-generators", `template-${environment}`);
    logger.debug(`Copying the '${environment}' extension template located in '${sourceDirectoryPath}' into the directory '${moduleDirectoryPath}'`);
    this.copyFiles(sourceDirectoryPath, moduleDirectoryPath);
    const sdkVersion = (await ExtensionRegistry.getSdkInfo(environment)).version;
    const values = { sdkVersion, author: options.author };
    switch (environment)
    {
      default:
        break;
      case ManifestRuntimeEnvironment.Node:
        const packageJsonFilePath = path.join(moduleDirectoryPath, packageJsonFileName);
        this.replacePlaceholdersInFile(packageJsonFilePath, values);
        const packageJson = JSON.parse(fs.readFileSync(packageJsonFilePath, { encoding: "utf8" }));
        const dependencies = packageJson.dependencies;
        if (withPublicSdk === false)
        {
          delete dependencies[publicNodeSdkIdentifier];
          dependencies[internalNodeSdkIdentifier] = sdkVersion;
        }
        fs.writeFileSync(packageJsonFilePath, JSON.stringify(packageJson, undefined, 2));
        break;
      case ManifestRuntimeEnvironment.Python:
        const requirementsFilePath = path.join(moduleDirectoryPath, "requirements.txt");
        this.replacePlaceholdersInFile(requirementsFilePath, values);
        if (withPublicSdk === false)
        {
          let content = fs.readFileSync(requirementsFilePath, { encoding: "utf8" });
          content = content.replace(new RegExp(`^${publicPythonSdkIdentifier} == .*`, "i"), internalPythonSdkIdentifier);
          fs.writeFileSync(requirementsFilePath, content);
        }
        break;
    }
  }

  // Enables to list the files and directories of a directory located inside an Electron ASAR archive or a plain file system directory, and to copy them on the file system
  // Taken from https://gist.github.com/benloong/586d6c899c2d84cea557d358311ae9d7
  private copyFiles(fileOrDirectoryPath: string, destinationDirectoryPath: string): void
  {
    if (fs.existsSync(fileOrDirectoryPath) === true)
    {
      if (fs.statSync(fileOrDirectoryPath).isFile() === true)
      {
        const directoryName = path.dirname(destinationDirectoryPath);
        if (fs.existsSync(directoryName) === false)
        {
          fs.mkdirSync(directoryName, { recursive: true });
        }
        logger.debug(`Copying file '${fileOrDirectoryPath}' to '${destinationDirectoryPath}'`);
        fs.writeFileSync(destinationDirectoryPath, fs.readFileSync(fileOrDirectoryPath, { encoding: "binary" }), { encoding: "binary" });
      }
      else if (fs.statSync(fileOrDirectoryPath).isDirectory() === true)
      {
        fs.readdirSync(fileOrDirectoryPath).forEach((fileOrFolderName) =>
        {
          if (["node_modules", ".venv"].indexOf(fileOrFolderName) === -1)
          {
            this.copyFiles(path.join(fileOrDirectoryPath, fileOrFolderName), path.join(destinationDirectoryPath, fileOrFolderName));
          }
        });
      }
    }
  }

  private replaceManifest(moduleDirectoryPath: string, options: ExtensionGenerationOptions): void
  {
    const manifestFilePath = path.join(moduleDirectoryPath, ExtensionRegistry.manifestFileName);
    const manifest: Record<string, any> = JSON.parse(fs.readFileSync(manifestFilePath, "utf8"));
    manifest.id = options.id;
    manifest.name = options.name;
    manifest.version = ExtensionGenerator.version;
    manifest.description = options.description;
    fs.writeFileSync(manifestFilePath, stringify(manifest), "utf8");
  }

  private replacePlaceholdersInFile(filePath: string, values: { sdkVersion: string, author: string; }): void
  {
    let content = fs.readFileSync(filePath, "utf8");
    const map: Record<string, string> = { "sdkVersion": values.sdkVersion, "author": values.author };
    for (const key of Object.keys(map))
    {
      const value = map[key];
      content = content.replaceAll(ExtensionRegistry.computeVariablePlaceholder(key), value);
    }
    fs.writeFileSync(filePath, content);
  }

}
