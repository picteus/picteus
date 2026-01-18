import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { unzip } from "node:zlib";
import { Readable } from "node:stream";
import { text } from "node:stream/consumers";

import { fdir } from "fdir";
import tar from "tar-fs";
import AdmZip from "adm-zip";
import { Injectable } from "@nestjs/common";

import { logger } from "../logger";
import { paths } from "../paths";
import {
  ExtensionManual,
  ExtensionStatus,
  Manifest,
  ManifestCapability,
  ManifestEvent,
  ManifestExtensionCommand,
  ManifestRuntimeEnvironment
} from "../dtos/app.dtos";
import { CompressedType, computeCompressedType, getTemporaryDirectoryPath } from "./utils/downloader";
import { parametersChecker } from "./utils/parametersChecker";
import { ImageEventAction } from "../notifier";


export type ExtendedManifest = Manifest & { directoryPath: string };

export type SdkInfo = { filePath: string, version: string };

export type ImageEvent = { imageId: string, action: ImageEventAction };

export type ExtensionMessage =
  {
    extensionId: string,
    eventKind: ManifestEvent,
    type: "started" | "stopped" | "error" | "fatal",
    value: string
  };

@Injectable()
export class ExtensionRegistry
{

  public static readonly manifestFileName = "manifest.json";

  public static readonly readmeFileName = "README.md";

  public static shellVariableName = "shell";

  public static nodeVariableName = "node";

  public static venvPythonVariableName = "venvPython";

  static async getSdkInfo(environment: ManifestRuntimeEnvironment): Promise<SdkInfo>
  {
    let directoryName: string;
    let fileExtension: string;
    let language: string;
    switch (environment)
    {
      default:
        throw new Error(`Unsupported runtime environment '${environment}' for computing the SDK file path`);
      case ManifestRuntimeEnvironment.Node:
        directoryName = "typescript";
        fileExtension = "tgz";
        language = "TypeScript";
        break;
      case ManifestRuntimeEnvironment.Python:
        directoryName = "python";
        fileExtension = "tar.gz";
        language = "Python";
        break;
    }
    const sdkDirectoryPath = path.join(paths.sdkDirectoryPath, directoryName);
    logger.debug(`Searching for the internal '${environment}' extension SDK in directory '${sdkDirectoryPath}'`);
    const filePaths = await new fdir().withFullPaths().glob(`**/*.${fileExtension}`).crawl(sdkDirectoryPath).withPromise();
    if (filePaths.length === 0)
    {
      throw new Error(`Missing internal '${environment}' ${language} extension SDK`);
    }
    else if (filePaths.length !== 1)
    {
      throw new Error(`Multiple internal '${environment}' ${language} extension SDKs`);
    }
    const filePath = filePaths[0];
    const fileName = path.basename(filePath);
    const match = fileName.match(`.*-(.*)\.${fileExtension}`);
    if (match === null)
    {
      throw new Error(`Cannot extract the SDK version from the '${environment}' ${language} extension internal SDK file '${filePath}'`);
    }
    const version = match[1];
    logger.debug(`Found the '${environment}' ${language} extension SDK with version '${version}' through the file '${filePath}'`);
    return { filePath, version: version };
  }

  public static computeVariablePlaceholder(key: string): string
  {
    return `$\{${key}}`;
  }

  public static from(manifest: Manifest, directoryPath: string): ExtendedManifest
  {
    return { ...manifest, directoryPath };
  }

  constructor()
  {
    logger.debug("Instantiating an ExtensionsRegistry");
  }

  parseManifest(filePath: string): ExtendedManifest
  {
    logger.debug(`Parsing the manifest '${filePath}'`);
    const content = fs.readFileSync(filePath, { encoding: "utf8" });
    const manifest: Manifest = JSON.parse(content);
    const directoryPath = path.resolve(filePath, "..");
    return ExtensionRegistry.from(manifest, directoryPath);
  }

  async list(includePaused: boolean, sortResult: boolean = false): Promise<ExtendedManifest[]>
  {
    logger.debug(`Listing the ${includePaused === true ? "" : "active "}extensions in directory '${paths.installedExtensionsDirectoryPath}'${includePaused === true ? " including the paused ones" : ""}`);
    // We also take into considerations the symbolic links
    const filePaths = new fdir().withFullPaths().withSymlinks().withMaxDepth(1).glob(`./**/${ExtensionRegistry.manifestFileName}`).crawl(paths.installedExtensionsDirectoryPath).sync();
    logger.info(`Found ${filePaths.length} extension(s)`);
    const manifests: ExtendedManifest[] = [];
    for (const filePath of filePaths)
    {
      let extendedManifest: ExtendedManifest;
      try
      {
        extendedManifest = this.parseManifest(filePath);
      }
      catch (error)
      {
        // This is a corrupted manifest file, hence we skip it
        logger.warn(`The extension manifest '${filePath}' is JSON-malformed`, error);
        continue;
      }
      logger.info(`Found in the manifest '${filePath}' the extension with id '${extendedManifest.id}'`);
      const directoryName = path.basename(extendedManifest.directoryPath);
      if (extendedManifest.id !== directoryName)
      {
        logger.warn(`The manifest with id '${extendedManifest.id}' is located in a folder with a different name '${directoryName}'`);
        continue;
      }
      if (includePaused === true || this.isPaused(extendedManifest.id) === false)
      {
        manifests.push(extendedManifest);
      }
    }
    if (sortResult === true)
    {
      return manifests.sort((manifest1: ExtendedManifest, manifest2: ExtendedManifest) =>
      {
        return manifest1.id.localeCompare(manifest2.id);
      });
    }
    else
    {
      return manifests;
    }
  }

  exists(id: string): boolean
  {
    logger.debug(`Checking whether the extension with id '${id}' exists`);
    if (id.length === 0)
    {
      return false;
    }
    return fs.existsSync(this.computeManifestFilePath(id));
  }

  async getExtensionsWithCapability(capability: ManifestCapability, includePaused: boolean): Promise<ExtendedManifest[]>
  {
    return (await this.list(includePaused)).filter((manifest) =>
    {
      return manifest.instructions.filter((instructions) =>
      {
        return instructions.events.indexOf(ManifestEvent.ProcessStarted) !== -1;
      }).find((instruction) =>
      {
        return instruction.capabilities !== undefined && instruction.capabilities.map((capability) =>
        {
          return capability.id;
        }).indexOf(capability.id) !== -1;
      }) !== undefined;
    });
  }

  get(id: string): ExtendedManifest | undefined
  {
    if (this.exists(id) === false)
    {
      return undefined;
    }
    return this.parseManifest(this.computeManifestFilePath(id));
  }

  getManual(manifest: Manifest): ExtensionManual | undefined
  {
    const readmeFilePath = path.join(this.computeExtensionDirectoryPath(manifest.id), ExtensionRegistry.readmeFileName);
    if (fs.existsSync(readmeFilePath) === false)
    {
      return undefined;
    }
    const instructions = fs.readFileSync(readmeFilePath, { encoding: "utf8" });
    return new ExtensionManual(instructions);
  }

  getStatus(id: string): ExtensionStatus
  {
    return this.isPaused(id) === true ? ExtensionStatus.Paused : ExtensionStatus.Enabled;
  }

  isPaused(id: string): boolean
  {
    return fs.existsSync(this.computePauseFilePath(id));
  }

  getCommand(manifest: Manifest, commandId: string): ManifestExtensionCommand | undefined
  {
    for (const instructions of manifest.instructions)
    {
      const command = instructions.commands?.find((command) =>
      {
        return command.id == commandId;
      });
      if (command !== undefined)
      {
        return command;
      }
    }
    return undefined;
  }

  pauseOrResume(id: string, isPause: boolean): void
  {
    const filePath = this.computePauseFilePath(id);
    if (isPause === true)
    {
      fs.writeFileSync(filePath, "");
    }
    else if (fs.existsSync(filePath) === true)
    {
      fs.rmSync(filePath);
    }
  }

  computeExtensionDirectoryPath(id: string): string
  {
    return path.join(paths.installedExtensionsDirectoryPath, id);
  }

  private computeManifestFilePath(id: string): string
  {
    return path.join(this.computeExtensionDirectoryPath(id), ExtensionRegistry.manifestFileName);
  }

  private computePauseFilePath(id: string): string
  {
    return path.join(this.computeExtensionDirectoryPath(id), ".paused");
  }

}

export class ExtensionArchiveReader
{

  readonly archive: Buffer;

  readonly type: CompressedType;

  directoryPrefix?: string;

  extractFunction?: (directoryPath: string) => Promise<void>;

  constructor(archive: Buffer)
  {
    this.archive = archive;
    const type = computeCompressedType(this.archive);
    if (type === null)
    {
      parametersChecker.throwBadParameterError("The body MIME type cannot be determined");
    }
    this.type = type;
    logger.debug(`The archive compressed type is '${type}'`);
  }

  async extractFile(fileName: string): Promise<string | undefined>
  {
    const isExpectedEntry = (file: string) =>
    {
      if (file === fileName)
      {
        return "";
      }
      else if (file.endsWith("/" + fileName) === true)
      {
        return file.substring(0, file.length - ("/" + fileName).length);
      }
      else
      {
        return undefined;
      }
    };
    let fileRawString: string | undefined;
    if (this.type === "tar.gz")
    {
      // This is not a zip content but might be a compressed tarball
      const do_unzip = promisify(unzip);
      const buffer: Buffer = await do_unzip(new Uint8Array(this.archive));
      const stream = Readable.from(buffer);
      const extract = tar.extract(getTemporaryDirectoryPath());
      stream.pipe(extract);
      for await (const entry of extract)
      {
        const header = entry.header;
        if (header.type === "file")
        {
          const possibleDirectoryPrefix = isExpectedEntry(header.name);
          if (possibleDirectoryPrefix !== undefined)
          {
            this.directoryPrefix = possibleDirectoryPrefix;
            fileRawString = await text(entry);
            this.extractFunction = async (directoryPath: string) =>
            {
              return new Promise<void>((resolve, reject) =>
              {
                Readable.from(buffer).pipe(tar.extract(directoryPath)).on("finish", resolve).on("error", reject);
              });
            };
            break;
          }
        }
        entry.resume();
      }
    }
    else if (this.type === "zip")
    {
      let zip: AdmZip;
      try
      {
        zip = new AdmZip(this.archive);
      }
      catch (error)
      {
        parametersChecker.throwBadParameterError("The body is not a zip content");
      }
      const zipEntries: AdmZip.IZipEntry[] = zip.getEntries();
      for (const zipEntry of zipEntries)
      {
        if (zipEntry.isDirectory === false)
        {
          const possibleDirectoryPrefix = isExpectedEntry(zipEntry.entryName);
          if (possibleDirectoryPrefix !== undefined)
          {
            this.directoryPrefix = possibleDirectoryPrefix;
            const data: Buffer = zipEntry.getData();
            fileRawString = data.toString();
            this.extractFunction = async (directoryPath: string) =>
            {
              zip.extractAllTo(directoryPath, true);
            };
            break;
          }
        }
      }
    }
    return fileRawString;
  }

  async extractManifest(): Promise<Manifest>
  {
    const manifestRawString: string | undefined = await this.extractFile(ExtensionRegistry.manifestFileName);
    if (manifestRawString === undefined)
    {
      parametersChecker.throwBadParameterError(`The body zip content does not contain the manifest '${ExtensionRegistry.manifestFileName}' file`);
    }

    let manifestObject;
    try
    {
      manifestObject = JSON.parse(manifestRawString);
    }
    catch (error)
    {
      parametersChecker.throwBadParameterError(`The archive contains a manifest '${ExtensionRegistry.manifestFileName}' file which is not a valid JSON content`);
    }
    return manifestObject;
  }

}
