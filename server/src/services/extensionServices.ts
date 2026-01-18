import fs from "node:fs";
import path from "node:path";
import Timers from "node:timers";
import { fdir } from "fdir";
import AdmZip from "adm-zip";
import semver from "semver";
import { types } from "http-constants";
import {
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  StreamableFile
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Request, Response } from "express";

import { HostCommandType } from "@picteus/shared-back-end";

import { logger } from "../logger";
import { paths } from "../paths";
import { plainToInstanceViaJSON } from "../utils";
import {
  EventAction,
  EventEntity,
  ExtensionEventAction,
  ExtensionEventProcess,
  ImageEventAction,
  Notifier,
  ProcessEventAction,
  TextEventAction
} from "../notifier";
import { ExtensionsManager } from "../threads/managers";
import { AuthenticationGuard } from "../app.guards";
import {
  applicationXGzipMimeType,
  CommandEntity,
  ConfigurationCapability,
  ConfigurationExtensionCommand,
  Extension,
  ExtensionActivities,
  ExtensionActivity,
  ExtensionActivityKind,
  ExtensionAndManual,
  ExtensionGenerationOptions,
  ExtensionsConfiguration,
  ExtensionSettings,
  ExtensionStatus,
  Manifest,
  ManifestCapability,
  ManifestCapabilityId,
  ManifestEvent,
  ManifestRuntimeEnvironment
} from "../dtos/app.dtos";
import { parametersChecker } from "./utils/parametersChecker";
import { waitFor } from "./utils/processWrapper";
import {
  ensureNpm,
  installPackages,
  internalNodeSdkIdentifier,
  npmVersion,
  packageJsonFileName,
  runNpm
} from "./utils/npmWrapper";
import {
  ensureVirtualEnvironment,
  installViaVirtualEnvironmentRequirements,
  pythonVersion
} from "./utils/pythonWrapper";
import { addJsonSchemaAdditionalProperties, computeAjv, validateJsonSchema, validateSchema } from "./utils/ajvWrapper";
import {
  computeAttachmentDisposition,
  computeCompressedType,
  ensureDirectory,
  generateTarGz,
  getTemporaryDirectoryPath,
  inflateZip,
  move
} from "./utils/downloader";
import { fromCapacityToImageEventAction } from "../bos";
import { resize } from "./utils/images";
import { WatcherEvent, WatcherTerminator, watchPath } from "./utils/pathWatcher";
import { EntitiesProvider, VectorDatabaseAccessor } from "./databaseProviders";
import { ExtendedManifest, ExtensionArchiveReader, ExtensionMessage, ExtensionRegistry } from "./extensionRegistry";
import { ExtensionGenerator } from "./extensionGenerator";
import { ImageAttachmentService } from "./imageAttachmentService";
import { ExtensionTaskExecutor } from "./extensionTaskExecutor";
import { HostService } from "./hostService";


@Injectable()
export class ExtensionsUiServer
{

  static readonly webServerBasePath = "ui";

  private static readonly textPlain = types.txt;

  private readonly defaultIconFilePath: string;

  constructor(private readonly extensionsRegistry: ExtensionRegistry)
  {
    logger.debug("Instantiating an ExtensionsUiServer");
    // We need to copy the default icon into a temporary directory, otherwise sharp cannot operate with a file within the ASAR archive
    const fileName = "extension-default-icon.png";
    this.defaultIconFilePath = path.join(getTemporaryDirectoryPath(), fileName);
    fs.copyFileSync(path.join(paths.serverDirectoryPath, "assets", fileName), this.defaultIconFilePath);
  }

  async handle(request: Request, response: Response): Promise<void>
  {
    const pathSeparator = "/";
    const pathTokens = request.path.split(pathSeparator);
    if (pathTokens.length < 3)
    {
      response.status(HttpStatus.NOT_FOUND).type(ExtensionsUiServer.textPlain).send("Invalid path");
      return;
    }
    const extensionId = pathTokens[1];
    const uiPath = `${pathTokens.slice(2).join(pathSeparator)}`;

    const manifest: ExtendedManifest | undefined = this.extensionsRegistry.get(extensionId);
    if (manifest === undefined)
    {
      response.status(HttpStatus.NOT_FOUND).type(ExtensionsUiServer.textPlain).send(`Non-existent extension with id '${extensionId}'`);
      return;
    }
    else if (this.extensionsRegistry.isPaused(extensionId) === true)
    {
      response.status(HttpStatus.FORBIDDEN).type(ExtensionsUiServer.textPlain).send(`The extension with id '${extensionId}' is paused`);
      return;
    }

    const filePath = path.join(manifest.directoryPath, uiPath);
    // We handle the special elements
    if (uiPath === "icon.png")
    {
      const actualFilePath = fs.existsSync(filePath) === false ? this.defaultIconFilePath : filePath;
      const edgeInPixels = 24;
      const formatAndBuffer = await resize("extension icon", actualFilePath, "PNG", edgeInPixels, edgeInPixels, "inbox", undefined, undefined, true, false);
      response.status(HttpStatus.OK).type(types.png).send(formatAndBuffer.buffer);
      return;
    }
    if (fs.existsSync(filePath) === false)
    {
      response.status(HttpStatus.NOT_FOUND).type(ExtensionsUiServer.textPlain).send(`Non-existent file '${uiPath}' related to the extension with id '${extensionId}'`);
      return;
    }
    const rawExtension = path.extname(filePath);
    const extension = rawExtension.startsWith(".") ? rawExtension.substring(1) : "";
    let mimeType: string;
    switch (extension)
    {
      default :
        mimeType = ExtensionsUiServer.textPlain;
        break;
      case "html":
        mimeType = types.html;
        break;
      case "js":
        mimeType = types.js;
        break;
      case "css":
        mimeType = types.css;
        break;
      case "json":
        mimeType = types.json;
        break;
    }
    logger.debug(`Serving the file with path '${uiPath}' with MIME type '${mimeType}' related to the extension with id '${extensionId}'`);
    response.status(HttpStatus.OK).type(mimeType).sendFile(filePath);
  }

}

type Runnable = () => Promise<void>;

export type CapabilityResult<T> = { extensionId: string, value: T };

@Injectable()
export class ExtensionService
  implements OnModuleInit, OnModuleDestroy
{

  // @ts-ignore
  private extensionsManager: ExtensionsManager;

  // @ts-ignore
  private notifier: Notifier;

  private readonly perExtensionIdConnections: Map<string, boolean> = new Map<string, boolean>();

  private readonly perExtensionIdRunnables: Map<string, Runnable[]> = new Map<string, Runnable[]>();

  private readonly errorExtensionIds: Set<string> = new Set<string>();

  private readonly perUnpackedExtensionIdDirectoryPaths: Map<string, string> = new Map<string, string>();

  private readonly perExtensionIdWatcherTerminators: Map<string, WatcherTerminator> = new Map<string, WatcherTerminator>();

  private readonly perExtensionIdChromeExtensionNames: Map<string, string[]> = new Map<string, string[]>();

  constructor(private readonly entitiesProvider: EntitiesProvider, private readonly vectorDatabaseAccessor: VectorDatabaseAccessor, private readonly extensionsRegistry: ExtensionRegistry, private readonly extensionTaskExecutor: ExtensionTaskExecutor, @Inject(forwardRef(() => ImageAttachmentService)) private readonly imageAttachmentService: ImageAttachmentService, private readonly hostService: HostService, private readonly eventEmitter: EventEmitter2)
  {
    logger.debug("Instantiating an ExtensionService");
  }

  async onModuleInit(): Promise<void>
  {
    const installedExtensionsDirectoryPath = paths.installedExtensionsDirectoryPath;
    logger.debug(`Ensuring that the installed extensions directory '${installedExtensionsDirectoryPath}' exists'`);
    ensureDirectory(installedExtensionsDirectoryPath);
    const modelsCacheDirectoryPath = paths.modelsCacheDirectoryPath;
    logger.debug(`Ensuring that the models cache directory '${modelsCacheDirectoryPath}' exists'`);
    ensureDirectory(modelsCacheDirectoryPath);

    this.notifier = new Notifier(this.eventEmitter);
    // We listen to all the image events and propagate them to the extensions
    this.notifier.onAll(async (event: string, value: object) =>
    {
      const parsedEvent = Notifier.parseEvent(event);
      const action: ImageEventAction = parsedEvent.action as ImageEventAction;
      if (parsedEvent.eventEntity === EventEntity.Image && action !== ImageEventAction.RunCommand)
      {
        const { id } = value as { id: string };
        await this.extensionsManager.onImageEvent({ imageId: id, action });
      }
      return Promise.resolve();
    });

    // We manage the unpacked extensions
    await this.registerUnpackedExtensions();

    // We install or update the built-in extensions
    await this.installOrUpdateBuiltInExtensions();

    // We start all the extensions
    const manifests = await this.extensionsRegistry.list(false);
    const extensionIds = manifests.map((manifest) =>
    {
      return manifest.id;
    });
    this.extensionsManager = new ExtensionsManager();
    await this.extensionsManager.start(paths.webServicesBaseUrl, AuthenticationGuard.registerExtensionsApiKeys(extensionIds), async (message: ExtensionMessage) =>
    {
      const extensionId = message.extensionId;
      if (message.type === "fatal")
      {
        this.errorExtensionIds.add(extensionId);
      }
      if (message.type === "started" || message.type === "stopped")
      {
        const hasExtensionStarted = message.type === "started";
        const manifest = this.extensionsRegistry.get(extensionId);
        if (manifest === undefined)
        {
          logger.error(`Received a '${message.type}' message for the unknown extension with id '${extensionId}'`);
        }
        else
        {
          await this.notifyTaskExecutor(manifest, hasExtensionStarted);
        }
        this.notifier.emit(EventEntity.Extension, ExtensionEventAction.Process, hasExtensionStarted === true ? ExtensionEventProcess.Started : ExtensionEventProcess.Stopped, {
          id: extensionId
        });
      }
      else if (message.type === "error" || message.type === "fatal")
      {
        this.notifier.emit(EventEntity.Extension, ExtensionEventAction.Error, undefined, {
          id: extensionId,
          message: message.value
        });
      }
    });
    logger.debug("The initializing of an ExtensionService is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.debug("Destroying an ExtensionService");
    await this.extensionsManager.destroy();
    AuthenticationGuard.resetExtensionsApiKeys();
    await this.unregisterUnpackedExtensions();
    this.notifier.destroy();
    this.perExtensionIdConnections.clear();
    this.perExtensionIdRunnables.clear();
    this.errorExtensionIds.clear();
    logger.debug("Destroyed an ExtensionService");
  }

  onConnection(id: string, isConnected: boolean): void
  {
    logger.debug(`The extension with id '${id}' is now ${isConnected ? "connected" : "disconnected"}`);
    this.perExtensionIdConnections.set(id, isConnected);
    if (isConnected === true)
    {
      const runnables = this.perExtensionIdRunnables.get(id);
      if (runnables !== undefined)
      {
        while (runnables.length > 0)
        {
          const [runnable] = runnables.splice(0, 1);
          // We do not make the call synchronous, as we do not want to block the main thread
          // noinspection JSIgnoredPromiseFromCall
          runnable();
        }
      }
    }
  }

  async getConfiguration(): Promise<ExtensionsConfiguration>
  {
    const extensions = await this.extensionsRegistry.list(false);
    const perCapabilityExtensionIds = new Map<ManifestCapability, string[]>();
    for (const extension of extensions)
    {
      for (const instructions of extension.instructions)
      {
        if (instructions.capabilities !== undefined)
        {
          for (const capability of instructions.capabilities)
          {
            let extensionIds: string[] | undefined;
            for (const aCapability of perCapabilityExtensionIds.keys())
            {
              if (aCapability.id === capability.id)
              {
                extensionIds = perCapabilityExtensionIds.get(aCapability);
                break;
              }
            }
            if (extensionIds === undefined)
            {
              extensionIds = [];
              perCapabilityExtensionIds.set(capability, extensionIds);
            }
            extensionIds.push(extension.id);
          }
        }
      }
    }
    const capabilities: ConfigurationCapability[] = Array.from(perCapabilityExtensionIds.entries()).map(([capability, extensionIds]) =>
    {
      return new ConfigurationCapability(capability, extensionIds.sort((extensionId1: string, extensionId2: string) =>
      {
        return extensionId1.localeCompare(extensionId2);
      }));
    }).sort((capability1: ConfigurationCapability, capability2: ConfigurationCapability) =>
    {
      return capability1.capability.id.localeCompare(capability2.capability.id);
    });
    const commands: ConfigurationExtensionCommand[] = [];
    for (const extension of extensions)
    {
      for (const instruction of extension.instructions)
      {
        if (instruction.commands !== undefined)
        {
          for (const command of instruction.commands)
          {
            commands.push(new ConfigurationExtensionCommand(extension.id, command));
          }
        }
      }
    }
    return new ExtensionsConfiguration(capabilities, commands.sort((command1: ConfigurationExtensionCommand, command2: ConfigurationExtensionCommand) =>
    {
      return command1.command.id.localeCompare(command2.command.id);
    }));
  }

  async list(): Promise<Extension[]>
  {
    logger.info("Listing all extensions");
    return (await this.extensionsRegistry.list(true, true)).map((extendedManifest =>
    {
      // We need to remove the "directoryPath" property from the extended manifest
      const { directoryPath, ...manifest } = extendedManifest;
      return plainToInstanceViaJSON(Extension, {
        manifest,
        status: this.extensionsRegistry.getStatus(extendedManifest.id)
      });
    }));
  }

  async activities(): Promise<ExtensionActivities>
  {
    logger.info("Getting the extensions activities");
    return (await this.extensionsRegistry.list(false, true)).map((manifest =>
    {
      return plainToInstanceViaJSON(ExtensionActivity, {
        id: manifest.id,
        kind: this.perExtensionIdConnections.get(manifest.id) === true ? ExtensionActivityKind.Connected : (this.errorExtensionIds.has(manifest.id) === true ? ExtensionActivityKind.Error : ExtensionActivityKind.Connecting)
      });
    }));
  }

  async get(id: string): Promise<ExtensionAndManual>
  {
    logger.info(`Getting the extension with id '${id}'`);
    this.checkExtensionExists(id);
    const extendedManifest = this.extensionsRegistry.get(id)!;
    const manual = this.extensionsRegistry.getManual(extendedManifest);
    // We need to remove the "directoryPath" property from the extended manifest
    const { directoryPath, ...manifest } = extendedManifest;
    return plainToInstanceViaJSON(ExtensionAndManual, {
      manifest,
      status: this.extensionsRegistry.getStatus(extendedManifest.id),
      manual
    });
  }

  async install(idWhenUpdating: string | undefined, archive: Buffer, shouldHandleProcesses: boolean): Promise<Extension>
  {
    this.checkExtensionArchiveBinaryWeight(archive);
    const manifest = await this.installUpdateOrUnpack(idWhenUpdating, new ExtensionArchiveReader(archive), shouldHandleProcesses);
    return plainToInstanceViaJSON(Extension, {
      manifest,
      status: this.extensionsRegistry.getStatus(manifest.id)
    });
  }

  async uninstall(id: string): Promise<void>
  {
    // TODO: forbid this while a repository is synchronizing
    logger.info(`Uninstalling the extension with id '${id}'`);
    this.checkExtensionExists(id);
    await this.extensionsManager.stopProcesses([id]);
    this.uninstallChromeExtensions(id);
    const isUnpackedExtension = this.perUnpackedExtensionIdDirectoryPaths.has(id);
    if (isUnpackedExtension === true)
    {
      // In case the extension is unpacked, we unregister it
      await this.unregisterUnpackedExtension(id);
    }
    AuthenticationGuard.unregisterExtensionsApiKey(id);
    // We delete all the features computed by the extension
    await this.entitiesProvider.imageFeature.deleteMany({ where: { extensionId: id } });
    // We delete all the embeddings computed by the extension
    await this.vectorDatabaseAccessor.deleteExtensionEmbeddings(id);
    // We delete all the tags set by the extension
    await this.entitiesProvider.imageTag.deleteMany({ where: { extensionId: id } });
    // We delete all the attachments set by the extension
    await this.imageAttachmentService.deleteForExtension(id);
    if ((await this.entitiesProvider.extensionSettings.findUnique({ where: { extensionId: id } })) !== null)
    {
      // We delete the extension settings
      await this.entitiesProvider.extensionSettings.delete({ where: { extensionId: id } });
    }
    if (isUnpackedExtension === false)
    {
      // We eventually delete the extension's folder
      this.deleteExtensionFolder(id);
    }
    this.perExtensionIdConnections.delete(id);
    this.perExtensionIdRunnables.delete(id);
    this.errorExtensionIds.delete(id);
    this.notifier.emit(EventEntity.Extension, ExtensionEventAction.Uninstalled, undefined, { id });
  }

  async pauseOrResume(id: string, isPause: boolean): Promise<void>
  {
    // TODO: forbid this while a repository is synchronizing
    logger.info(`${isPause === true ? "Pauses" : "Resumes"} the extension with id '${id}'`);
    const extensionAndManual = await this.get(id);
    if (this.extensionsRegistry.isPaused(id) === isPause)
    {
      parametersChecker.throwBadParameter("isPause", isPause === true ? "true" : "false", `because the extension with id '${id}' is already ${isPause === true ? "paused" : "resumed"}`);
    }
    this.extensionsRegistry.pauseOrResume(id, isPause);
    this.uninstallChromeExtensions(id);
    await this.notifyTaskExecutor(extensionAndManual.manifest, isPause === false);
    if (isPause === true)
    {
      await this.extensionsManager.stopProcesses([id]);
      AuthenticationGuard.unregisterExtensionsApiKey(id);
    }
    else
    {
      await this.extensionsManager.startProcesses([AuthenticationGuard.registerExtensionsApiKey(id)]);
      // We synchronize the images via this extension, once it is resumed
      await this.synchronize(id);
    }
    this.notifier.emit(EventEntity.Extension, isPause === true ? ExtensionEventAction.Paused : ExtensionEventAction.Resumed, undefined, { id });
  }

  async registerUnpackedExtension(directoryPath: string, shouldHandleProcesses: boolean): Promise<void>
  {
    logger.info(`Analyzing the unpacked extension under directory '${directoryPath}'`);
    if (fs.existsSync(path.join(directoryPath, ExtensionRegistry.manifestFileName)) === true)
    {
      const manifest = this.extensionsRegistry.parseManifest(path.join(directoryPath, ExtensionRegistry.manifestFileName));
      logger.info(`Registering the unpacked extension with id '${manifest.id}' in directory '${directoryPath}'`);
      const targetDirectoryPath = this.extensionsRegistry.computeExtensionDirectoryPath(manifest.id);
      if (fs.existsSync(targetDirectoryPath) === false)
      {
        fs.symlinkSync(directoryPath, targetDirectoryPath, "dir");
        logger.debug(`Created a symbolic link from the unpacked extension directory '${directoryPath}' to the installed extensions directory '${targetDirectoryPath}'`);
      }
      if (fs.lstatSync(targetDirectoryPath).isSymbolicLink() === true && fs.realpathSync(targetDirectoryPath) === directoryPath)
      {
        try
        {
          await this.installUpdateOrUnpack(undefined, manifest, shouldHandleProcesses);
          this.perUnpackedExtensionIdDirectoryPaths.set(manifest.id, targetDirectoryPath);
        }
        catch (error)
        {
          logger.error(`The installation of update of the unpacked extension with id '${manifest.id}' failed`, error);
          this.perUnpackedExtensionIdDirectoryPaths.delete(manifest.id);
          if (fs.lstatSync(targetDirectoryPath).isSymbolicLink() === true)
          {
            fs.rmSync(targetDirectoryPath);
          }
          return;
        }
      }
      else
      {
        logger.warn(`The extension with id '${manifest.id}' is already installed: cannot override it with the unpacked extension`);
      }

      const filePath = path.join(targetDirectoryPath, ExtensionRegistry.manifestFileName);
      const watcherTerminator = await watchPath(filePath, async (event: WatcherEvent, _relativePath: string) =>
      {
        if (event === WatcherEvent.Changed)
        {
          // TODO: do not stop or start the process if the extension is already being restarted because of a previous change and do not anything if the ExtensionRunner is not ready
          logger.info(`The manifest file '${filePath}' of the unpacked extension with id '${manifest.id}' has changed: reloading the extension`);
          await this.installUpdateOrUnpack(manifest.id, this.extensionsRegistry.parseManifest(path.join(directoryPath, ExtensionRegistry.manifestFileName)), true);
        }
      }, (error: Error) =>
      {
        console.error(`An unexpected error occurred when watching the manifest file '${filePath}' of the unpacked extension with id '${manifest.id}'`, error);
      });
      this.perExtensionIdWatcherTerminators.set(manifest.id, watcherTerminator);
    }
  }

  async getSettings(id: string): Promise<ExtensionSettings>
  {
    logger.info(`Getting the settings of the extension with id '${id}'`);
    this.checkExtensionExists(id);
    const entity = await this.entitiesProvider.extensionSettings.findUnique({ where: { extensionId: id } });
    return new ExtensionSettings(entity === null ? {} : JSON.parse(entity.value));
  }

  async setSettings(id: string, settings: ExtensionSettings): Promise<void>
  {
    logger.info(`Setting the settings of the extension with id '${id}'`);
    this.checkExtensionExists(id);
    const extension = this.extensionsRegistry.get(id)!;
    const value = settings.value;
    const extensionSettings = extension.settings;
    addJsonSchemaAdditionalProperties(extensionSettings);
    try
    {
      validateSchema(computeAjv(), extensionSettings, value);
    }
    catch (error)
    {
      parametersChecker.throwBadParameter("settings", JSON.stringify(settings), `because it does not comply with the settings JSON schema. Reason: '${(error as Error).message}'`);
    }
    const settingsValue = JSON.stringify(value);
    const objectValue = { extensionId: id, value: settingsValue };
    await this.entitiesProvider.extensionSettings.upsert({
      where: { extensionId: id },
      create: objectValue,
      update: objectValue
    });
    // We indicate to the extension that its settings have changed so that it can take action
    this.notifier.emit(EventEntity.Extension, ExtensionEventAction.Settings, undefined, { id, value }, id);
  }

  async synchronize(id: string): Promise<void>
  {
    // TODO: add a start and a stop event, and for that, we need an acknowledgment from the extension for every action
    logger.info(`Synchronizing the images through the extension with id '${id}'`);
    const manifest: ExtendedManifest | undefined = this.extensionsRegistry.get(id);
    if (manifest === undefined)
    {
      this.throwBadParameterId(id);
    }
    if (this.extensionsRegistry.isPaused(id) === true)
    {
      parametersChecker.throwBadParameter("id", id, "because the extension is paused");
    }
    for (const instructions of manifest.instructions)
    {
      if (instructions.capabilities !== undefined)
      {
        for (const capability of instructions.capabilities)
        {
          await this.synchronizeCapability(capability, manifest.id, instructions.events.indexOf(ManifestEvent.ProcessStarted) !== -1);
        }
      }
    }
  }

  async synchronizeImage(manifest: Manifest, imageId: string): Promise<void>
  {
    logger.info(`Synchronizing the image with id '${imageId}' through the extension with id '${manifest.id}'`);
    for (const instructions of manifest.instructions)
    {
      if (instructions.capabilities !== undefined)
      {
        for (const capability of instructions.capabilities)
        {
          const action = fromCapacityToImageEventAction(capability);
          if (action !== undefined && action !== null)
          {
            await this.synchronizeCapabilityForImage(manifest.id, imageId, action, instructions.events.indexOf(ManifestEvent.ProcessStarted) !== -1, true);
          }
        }
      }
    }
  }

  async runCapability<T>(capability: ManifestCapability, value: object): Promise<CapabilityResult<T>>
  {
    logger.info(`Running the capability with id '${capability.id}'`);
    let eventEntity: EventEntity;
    let action: EventAction;
    let state: string | undefined;
    // noinspection FallThroughInSwitchStatementJS
    switch (capability.id)
    {
      default:
        parametersChecker.throwInternalError(`The capability with id '${capability.id}' is not supported`);
      case ManifestCapabilityId.TextEmbeddings:
        eventEntity = EventEntity.Text;
        action = TextEventAction.ComputeEmbeddings;
        state = undefined;
        break;
    }
    const extensions: ExtendedManifest[] = await this.extensionsRegistry.getExtensionsWithCapability(capability, false);
    if (extensions.length === 0)
    {
      parametersChecker.throwInternalError(`Cannot operate because no extension with the capability id '${capability.id}' is installed and enabled`);
    }
    const extension = extensions[0];
    const extensionId = extension.id;
    if (this.perExtensionIdConnections.get(extensionId) !== true)
    {
      await new Promise<void>((resolve, reject) =>
      {
        let invoked = false;
        const timeout = Timers.setTimeout(() =>
        {
          if (invoked === false)
          {
            invoked = true;
            reject(new Error(`The extension with id '${extensionId}' is not connected`));
          }
        }, 10_000);
        this.runWhenConnected(extensionId, async () =>
        {
          if (invoked === false)
          {
            invoked = true;
            clearTimeout(timeout);
            resolve();
          }
        });
      });
    }
    return await new Promise<CapabilityResult<T>>((resolve) =>
    {
      this.notifier.emit<T>(eventEntity, action, state, value, extensionId, (value: T) =>
      {
        resolve({ extensionId, value });
      });
    });
  }

  async runCommand(entity: CommandEntity.Process | CommandEntity.Images, id: string, commandId: string, parameters: Record<string, any> | undefined, imageIds: string[] | undefined): Promise<void>
  {
    logger.info(`Running on the extension with id '${id}' the command with id '${commandId}' attached to the entity '${entity}'`);
    this.checkExtensionExists(id);
    if (this.extensionsRegistry.getStatus(id) === ExtensionStatus.Paused)
    {
      parametersChecker.throwBadParameterError(`Cannot run the command with id '${commandId}' on the extension with id '${id}' because the latter is paused`);
    }
    const extension = this.extensionsRegistry.get(id)!;
    const command = this.extensionsRegistry.getCommand(extension, commandId);
    if (command === undefined)
    {
      parametersChecker.throwBadParameter("commandId", commandId, `because the extension with id '${id}' has no command with id '${commandId}'`);
    }
    if (!(entity === CommandEntity.Images && (command.on.entity === CommandEntity.Images || command.on.entity === CommandEntity.Image)) && command.on.entity !== entity)
    {
      parametersChecker.throwBadParameter("commandId", commandId, `because the command is not attached to the entity '${entity}'`);
    }
    if (command.parameters !== undefined)
    {
      const schema = command.parameters;
      addJsonSchemaAdditionalProperties(schema);
      try
      {
        validateSchema(computeAjv(), schema, parameters || {});
      }
      catch (error)
      {
        parametersChecker.throwBadParameter("parameters", JSON.stringify(parameters), `it does not comply with the command with id '${commandId}' expected parameters. Reason: '${(error as Error).message}'`);
      }
    }
    if (entity === CommandEntity.Images)
    {
      if (imageIds === undefined)
      {
        parametersChecker.throwBadParameter("imageIds", "undefined", "because it is undefined");
      }
      if (new Set(imageIds).size !== imageIds.length)
      {
        parametersChecker.throwBadParameter("imageIds", `[${imageIds.join(", ")}]`, "because an image identifier is repeated");
      }
      if (command.on.entity === CommandEntity.Image && imageIds.length > 1)
      {
        parametersChecker.throwBadParameter("imageIds", `[${imageIds.join(", ")}]`, `because the command with id '${commandId}' can only be run on a single image`);
      }
      const entities = await this.entitiesProvider.images.findMany({
        where: { id: { in: imageIds } },
        select: { id: true, tags: command.on.withTags !== undefined }
      });
      if (command.on.withTags !== undefined)
      {
        // We check that the images have the required tags
        for (const entity of entities)
        {
          if (entity.tags.find((tag) =>
          {
            return command.on.withTags!.indexOf(tag.value) !== -1;
          }) === undefined)
          {
            parametersChecker.throwBadParameter("imageIds", `[${imageIds.join(", ")}]`, "because one or more image do not have the required tags");
          }
        }
      }
      const foundImageIds = entities.map((image) =>
      {
        return image.id;
      });
      const notFoundImageIds = imageIds.filter((imageId) =>
      {
        return foundImageIds.indexOf(imageId) === -1;
      });
      if (notFoundImageIds.length > 0)
      {
        parametersChecker.throwBadParameter("imageIds", `[${imageIds.join(", ")}]`, "because one or more image do not exist");
      }
    }
    let eventEntity: EventEntity;
    let eventAction: EventAction;
    // noinspection FallThroughInSwitchStatementJS
    switch (entity)
    {
      default:
        parametersChecker.throwInternalError(`The entity '${entity}' is not supported to run commands`);
      case CommandEntity.Process:
        eventEntity = EventEntity.Process;
        eventAction = ProcessEventAction.RunCommand;
        break;
      case CommandEntity.Images:
        eventEntity = EventEntity.Image;
        eventAction = ImageEventAction.RunCommand;
        break;
    }
    this.notifier.emit(eventEntity, eventAction, undefined, {
      commandId,
      parameters,
      imageIds
    }, extension.id);
  }

  async installChromeExtension(id: string, chromeExtensionName: string, archive: Buffer)
  {
    logger.debug(`Installing the Chrome extension with name '${chromeExtensionName}' for the extension with id '` + id + "'");
    if (archive.length > Extension.CHROME_EXTENSION_MAXIMUM_BINARY_WEIGHT_IN_BYTES)
    {
      parametersChecker.throwBadParameterError(`The provided Chrome extension archive exceeds the maximum allowed binary weight of ${Extension.CHROME_EXTENSION_MAXIMUM_BINARY_WEIGHT_IN_BYTES} bytes`);
    }
    this.checkExtensionExists(id);
    const type = computeCompressedType(archive);
    if (type === null)
    {
      parametersChecker.throwBadParameterError("The provided file is not a supported compressed archive");
    }
    let buffer: Buffer;
    if (type === "zip")
    {
      // We need to convert the .zip archive into a tar.gz archive
      const temporaryDirectoryPath = getTemporaryDirectoryPath();
      const logFragment = "Chrome extension archive";
      try
      {
        await inflateZip(archive, temporaryDirectoryPath, logFragment);
      }
      catch (error)
      {
        parametersChecker.throwBadParameterError(`The extraction of the archive failed. Reason: '${(error as Error).message}'`);
      }
      const filePath = path.join(temporaryDirectoryPath, "extension.tar.gz");
      await generateTarGz(temporaryDirectoryPath, filePath, logFragment);
      buffer = fs.readFileSync(filePath);
    }
    else
    {
      buffer = archive;
    }
    try
    {
      this.hostService.send({
        type: HostCommandType.InstallChromeExtension,
        name: chromeExtensionName,
        archive: buffer.toString("base64")
      });
      let chromeExtensionNames = this.perExtensionIdChromeExtensionNames.get(id);
      if (chromeExtensionNames === undefined)
      {
        chromeExtensionNames = [];
        this.perExtensionIdChromeExtensionNames.set(id, chromeExtensionNames);
      }
      chromeExtensionNames.push(chromeExtensionName);
    }
    catch (error)
    {
      parametersChecker.throwInternalError(`Could install the Chrome extension. Reason: '${(error as Error).message}'`);
    }
  }

  async generate(options: ExtensionGenerationOptions, withPublicSdk: boolean): Promise<StreamableFile>
  {
    logger.info(`Generating an extension with id '${options.id}', name '${options.name}' and for the '${options.environment}' runtime environment`);
    const temporaryDirectoryPath = getTemporaryDirectoryPath();
    const extensionDirectoryPath = await new ExtensionGenerator().run(temporaryDirectoryPath, options, withPublicSdk);
    const zip = new AdmZip();
    zip.addLocalFolder(extensionDirectoryPath);
    const buffer: Uint8Array = zip.toBuffer();
    return new StreamableFile(buffer, {
      type: types.zip,
      disposition: computeAttachmentDisposition(`${options.id}-${options.version}.zip`)
    });
  }

  async build(archive: Buffer): Promise<StreamableFile>
  {
    this.checkExtensionArchiveBinaryWeight(archive);
    const archiveReader = new ExtensionArchiveReader(archive);
    const manifest = await archiveReader.extractManifest();
    logger.info(`Building an extension with id '${manifest.id}' and name '${manifest.name}'`);
    let buffer: Buffer;
    if (manifest.runtimes.map(runtime => runtime.environment).indexOf(ManifestRuntimeEnvironment.Node) !== -1)
    {
      const buildDirectoryPath = getTemporaryDirectoryPath();
      await archiveReader.extractFunction!(buildDirectoryPath);
      const packageJsonFilePath = path.join(buildDirectoryPath, packageJsonFileName);
      if (fs.existsSync(packageJsonFilePath) === true)
      {
        {
          let packageJson: Record<string, any>;
          try
          {
            packageJson = JSON.parse(fs.readFileSync(packageJsonFilePath, { encoding: "utf-8" }));
          }
          catch (error)
          {
            parametersChecker.throwBadParameterError(`The archive is invalid because it contains the '${packageJsonFileName}' file, which is not a valid JSON content`);
          }
          if (packageJson?.scripts?.build === undefined)
          {
            parametersChecker.throwBadParameterError(`The archive is invalid because it contains the '${packageJsonFileName}' file, which does not contain a npm 'build' script`);
          }
        }
        const sdkInfo = await ExtensionRegistry.getSdkInfo(ManifestRuntimeEnvironment.Node);
        await installPackages(packageJsonFilePath, false, sdkInfo.version, sdkInfo.filePath);
        {
          const childProcess = await runNpm(["run", "build"], buildDirectoryPath);
          await waitFor(childProcess);
        }
        {
          const packageJson: Record<string, any> = JSON.parse(fs.readFileSync(packageJsonFilePath, { encoding: "utf8" }));
          const dependencies = packageJson["dependencies"];
          if (dependencies[internalNodeSdkIdentifier] !== undefined)
          {
            // For the internal SDK, we revert the internal SDK dependency because the previous installation has set it to something like "file:../../../../../../../disk/root/…"
            dependencies[internalNodeSdkIdentifier] = sdkInfo.version;
            fs.writeFileSync(packageJsonFilePath, JSON.stringify(packageJson, undefined, 2));
          }
        }
        {
          const childProcess = await runNpm(["pack"], buildDirectoryPath);
          await waitFor(childProcess);
        }
        const tarballFilePaths = new fdir().withFullPaths().withMaxDepth(0).crawl(buildDirectoryPath).sync().filter(filePath => filePath.endsWith(".tgz"));
        if (tarballFilePaths.length !== 1)
        {
          parametersChecker.throwInternalError(`Could not determine the built tarball`);
        }
        const tarballFilePath = tarballFilePaths[0];
        return new StreamableFile(fs.createReadStream(tarballFilePath), {
          type: applicationXGzipMimeType,
          disposition: computeAttachmentDisposition(path.basename(tarballFilePath))
        });
      }
      else
      {
        logger.warn(`The archive contains a '${ManifestRuntimeEnvironment.Node}' runtime but does not contain a '${packageJsonFileName}' file`);
        buffer = archive;
      }
    }
    else
    {
      buffer = archive;
    }
    return new StreamableFile(buffer, {
      type: types.zip,
      disposition: computeAttachmentDisposition(`${manifest.id}-${manifest.version}.zip`)
    });
  }

  private async registerUnpackedExtensions(): Promise<void>
  {
    const unpackedExtensionsDirectoryPath = paths.unpackedExtensionsDirectoryPath;
    if (unpackedExtensionsDirectoryPath === undefined)
    {
      return;
    }
    if (fs.existsSync(unpackedExtensionsDirectoryPath) === false)
    {
      logger.warn(`The directory '${unpackedExtensionsDirectoryPath}' which is supposed to contain the unpacked extensions does not exist`);
      return;
    }
    logger.info(`Handling the unpacked extensions available under directory '${unpackedExtensionsDirectoryPath}'`);
    const result = new fdir().withFullPaths().withMaxDepth(0).withDirs().withSymlinks().crawl(unpackedExtensionsDirectoryPath).sync();
    const directoryPaths = result.filter((nodePath) => nodePath !== unpackedExtensionsDirectoryPath).filter((nodePath) => fs.lstatSync(nodePath).isFile() === false).map((directoryPath) =>
    {
      // We remove the trailing path separator
      return path.resolve(directoryPath);
    });
    logger.debug(`Found ${directoryPaths.length} potential extension(s) in the unpacked directory '${unpackedExtensionsDirectoryPath}'`);
    for (const directoryPath of directoryPaths)
    {
      await this.registerUnpackedExtension(directoryPath, false);
    }
  }

  private async unregisterUnpackedExtensions(): Promise<void>
  {
    for (const id of this.perUnpackedExtensionIdDirectoryPaths.keys())
    {
      await this.unregisterUnpackedExtension(id);
    }
  }

  private async unregisterUnpackedExtension(id: string): Promise<void>
  {
    const directoryPath = this.perUnpackedExtensionIdDirectoryPaths.get(id);
    if (directoryPath === undefined)
    {
      throw new Error(`Cannot unregister an unregistered unpacked extension with id '${id}'`);
    }

    logger.info(`Unregistering the unpacked extension in directory '${directoryPath}'`);
    const terminator = this.perExtensionIdWatcherTerminators.get(id);
    if (terminator !== undefined)
    {
      await terminator();
      this.perExtensionIdWatcherTerminators.delete(id);
    }
    if (fs.lstatSync(directoryPath).isSymbolicLink() === true)
    {
      // We add an extra protection, which consists in only removing symbolic links
      fs.unlinkSync(directoryPath);
    }
    this.perUnpackedExtensionIdDirectoryPaths.delete(id);
  }

  private async installOrUpdateBuiltInExtensions(): Promise<void>
  {
    const builtInExtensionsDirectoryPath = paths.builtInExtensionsDirectoryPath;
    if (fs.existsSync(builtInExtensionsDirectoryPath) === false)
    {
      return;
    }
    logger.info(`Installing or updating the built-in extensions available under directory '${builtInExtensionsDirectoryPath}'`);
    const extensions = await this.extensionsRegistry.list(true);
    const filePaths = new fdir().withFullPaths().withMaxDepth(0).glob("**/*.zip", "**/*.tgz", "**/*.tar.gz").crawl(builtInExtensionsDirectoryPath).sync();
    for (const filePath of filePaths)
    {
      const archive = fs.readFileSync(filePath);
      const manifest = await new ExtensionArchiveReader(archive).extractManifest();
      // We only install the extension if it is not already installed or if its version is greater than the installed one
      const alreadyInstalledExtension = extensions.find((extension) =>
      {
        return extension.id === manifest.id;
      });
      const shouldExtensionBeUpdated = alreadyInstalledExtension !== undefined && semver.gt(manifest.version, alreadyInstalledExtension.version) === true;
      if (alreadyInstalledExtension === undefined || shouldExtensionBeUpdated === true)
      {
        logger.debug(`${shouldExtensionBeUpdated === true ? "Updating" : "Installing"} the built-in extension with id '${manifest.id}' with version '${manifest.version}'`);
        try
        {
          await this.install(shouldExtensionBeUpdated === true ? manifest.id : undefined, archive, false);
        }
        catch (error)
        {
          // We do not want to stop the process just because one extension failed to install or to be updated
          logger.error(`Could not ${shouldExtensionBeUpdated === true ? "update" : "install"} the built-in extension with id '${manifest.id}'`, error);
          if (shouldExtensionBeUpdated === false)
          {
            this.deleteExtensionFolder(manifest.id);
          }
        }
      }
    }
  }

  private checkExtensionExists(id: string): void
  {
    if (this.extensionsRegistry.exists(id) === false)
    {
      this.throwBadParameterId(id);
    }
  }

  private throwBadParameterId(id: string): never
  {
    parametersChecker.throwBadParameter("id", id, `there is no extension with that identifier`);
  }

  private async installUpdateOrUnpack(idWhenUpdating: string | undefined, readerOrManifest: ExtensionArchiveReader | Manifest, shouldHandleProcesses: boolean): Promise<Manifest>
  {
    // TODO: forbid this while a repository is synchronizing
    const useReader = readerOrManifest instanceof ExtensionArchiveReader;
    logger.info(useReader === false ? `Installing the unpacked extension with id '${readerOrManifest.id}'` : ((idWhenUpdating === undefined ? "Installing an extension" : `Updating the extension with id '${idWhenUpdating}'`)));
    let manifest: Manifest;
    if (useReader == true)
    {
      const manifestObject = await readerOrManifest.extractManifest();
      manifest = await parametersChecker.checkObject<Manifest>(Manifest, manifestObject, `The manifest '${ExtensionRegistry.manifestFileName}' file does not respect the expected schema`);
      logger.info(`Found the extension declaration with id '${manifest.id}' in the archive`);
      if (idWhenUpdating !== undefined && idWhenUpdating !== manifest.id)
      {
        parametersChecker.throwBadParameter("id", idWhenUpdating, `the identifier '${manifest.id}' of the manifest '${ExtensionRegistry.manifestFileName}' does not match`);
      }

      const exists = this.extensionsRegistry.exists(manifest.id);
      if (idWhenUpdating === undefined && exists === true)
      {
        parametersChecker.throwBadParameterError(`An extension with the same id '${manifest.id}' already exists`);
      }
      else if (idWhenUpdating !== undefined && exists === false)
      {
        parametersChecker.throwBadParameterError(`There is no extension with id '${manifest.id}'`);
      }
    }
    else
    {
      manifest = readerOrManifest!;
    }

    await this.checkManifest(manifest, undefined);

    logger.debug(`Proceeding to the installation of the extension with id '${manifest.id}', name '${manifest.name}' and version '${manifest.version}'`);
    const extendedManifest = ExtensionRegistry.from(manifest, this.extensionsRegistry.computeExtensionDirectoryPath(manifest.id));
    const directoryPath = extendedManifest.directoryPath;
    if (idWhenUpdating !== undefined)
    {
      if (shouldHandleProcesses === true)
      {
        await this.extensionsManager.stopProcesses([manifest.id]);
      }
      AuthenticationGuard.unregisterExtensionsApiKey(manifest.id);
    }
    if (useReader === true && (idWhenUpdating === undefined || this.perUnpackedExtensionIdDirectoryPaths.has(manifest.id) === true))
    {
      const terminator = this.perExtensionIdWatcherTerminators.get(manifest.id);
      if (terminator !== undefined)
      {
        await terminator();
        this.perExtensionIdWatcherTerminators.delete(manifest.id);
      }
      this.perUnpackedExtensionIdDirectoryPaths.delete(manifest.id);
      // We delete any previous extension folder and create a new empty one
      if (fs.existsSync(directoryPath) === true)
      {
        this.deleteExtensionFolder(manifest.id);
      }
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    if (useReader === true)
    {
      // We now extract the archive
      let extractionDirectoryPath = directoryPath;
      const actualDirectoryPrefix = readerOrManifest.directoryPrefix!;
      logger.debug(`Extracting the extension with id '${manifest.id}' archive into the directory '${directoryPath}'${actualDirectoryPrefix === "" ? "" : (` which is located in the archive in the path with prefix '${actualDirectoryPrefix}'`)}`);
      if (actualDirectoryPrefix !== "")
      {
        // The extension is located in a sub-path of the archive
        extractionDirectoryPath = getTemporaryDirectoryPath();
      }
      await readerOrManifest.extractFunction!(extractionDirectoryPath);
      if (actualDirectoryPrefix !== "")
      {
        // We only want to overwrite the sub-path files and leave the already existing files
        const subDirectoryPath = path.join(extractionDirectoryPath, actualDirectoryPrefix);
        logger.debug(`Moving the extension with id '${manifest.id}' archive file from directory '${subDirectoryPath}'`);
        const filePaths = new fdir().withDirs().withFullPaths().withSymlinks().withMaxDepth(1).crawl(subDirectoryPath).sync();
        for (const filePath of filePaths)
        {
          if (filePath !== `${subDirectoryPath}/` && path.join(filePath, "..") === subDirectoryPath)
          {
            await move(filePath, path.join(directoryPath, path.basename(filePath)), { overwrite: true });
          }
        }
      }
    }

    // We now check that the UI elements are valid, which we cannot perform as long as the archive is not inflated
    await this.checkManifest(manifest, extendedManifest);

    if (useReader === true)
    {
      // We remove the undesired macOS artifacts
      const macOsUndesirableDirectoryPath = path.join(directoryPath, "__MACOSX");
      if (fs.existsSync(macOsUndesirableDirectoryPath) === true)
      {
        fs.rmSync(macOsUndesirableDirectoryPath, { recursive: true });
      }
    }

    try
    {
      await this.prepareRuntimeEnvironment(extendedManifest, useReader);
    }
    catch (error)
    {
      // In case the runtime installation was not successful, we roll back the installation
      if (idWhenUpdating === undefined)
      {
        this.deleteExtensionFolder(manifest.id);
      }
      throw error;
    }

    if (idWhenUpdating === undefined)
    {
      // We ensure that the collection of embeddings for this extension exists
      await this.vectorDatabaseAccessor.ensureCollection(manifest.id);
    }
    this.notifier.emit(EventEntity.Extension, idWhenUpdating !== undefined ? ExtensionEventAction.Updated : ExtensionEventAction.Installed, undefined, {
      id: manifest.id
    });
    // We do not start the extension if it was initially paused
    if (shouldHandleProcesses === true && this.extensionsRegistry.isPaused(manifest.id) === false)
    {
      await this.extensionsManager.startProcesses([AuthenticationGuard.registerExtensionsApiKey(manifest.id)]);
      if (idWhenUpdating === undefined)
      {
        // We automatically synchronize the images via this extension, once it is installed
        await this.synchronize(manifest.id);
      }
    }
    return manifest;
  }

  private async checkManifest(manifest: Manifest, extendedManifest: ExtendedManifest | undefined): Promise<void>
  {
    logger.debug(`Checking that the extension with id '${manifest.id}' is valid${extendedManifest === undefined ? "" : " as far as its UI is concerned"}`);
    if (extendedManifest === undefined)
    {
      {
        // We check that the manifest is consistent regarding its events and capabilities
        for (const instructions of manifest.instructions)
        {
          if (instructions.throttlingPolicies !== undefined)
          {
            for (const throttlingPolicy of instructions.throttlingPolicies)
            {
              // If a throttling policy is defined for an event, the event must be declared
              for (const event of throttlingPolicy.events)
              {
                if (instructions.events.indexOf(event) === -1)
                {
                  parametersChecker.throwBadParameterError(`A throttling policy of the extension with id '${manifest.id}' refers to the '${event}' event which is not declared through the 'events' property`);
                }
              }
              if (throttlingPolicy.maximumCount === undefined && throttlingPolicy.durationInMilliseconds === undefined)
              {
                parametersChecker.throwBadParameterError(`A throttling policy of the extension with id '${manifest.id}' does not define the 'maximumCount' or the 'durationInMilliseconds' property`);
              }
            }
          }
          if (instructions.capabilities !== undefined)
          {
            for (const capability of instructions.capabilities)
            {
              if (instructions.events.indexOf(ManifestEvent.ProcessStarted) === -1)
              {
                parametersChecker.throwBadParameterError(`The capability of the extension with id '${manifest.id}', with id '${capability.id}' requires the '${ManifestEvent.ProcessStarted}' event`);
              }
              let requiredEvents: ManifestEvent[];
              // noinspection FallThroughInSwitchStatementJS
              switch (capability.id)
              {
                default:
                  parametersChecker.throwInternalError(`The capability with id '${capability.id}' is not handled`);
                case ManifestCapabilityId.ImageFeatures:
                  requiredEvents = [ManifestEvent.ImageCreated, ManifestEvent.ImageUpdated, ManifestEvent.ImageComputeFeatures];
                  break;
                case ManifestCapabilityId.ImageEmbeddings:
                  requiredEvents = [ManifestEvent.ImageCreated, ManifestEvent.ImageUpdated, ManifestEvent.ImageComputeEmbeddings];
                  break;
                case ManifestCapabilityId.ImageTags:
                  requiredEvents = [ManifestEvent.ImageCreated, ManifestEvent.ImageUpdated, ManifestEvent.ImageComputeTags];
                  break;
                case ManifestCapabilityId.TextEmbeddings:
                  requiredEvents = [ManifestEvent.TextComputeEmbeddings];
                  break;
              }
              requiredEvents = requiredEvents.filter((event) =>
              {
                return instructions.events.indexOf(event) === -1;
              });
              if (requiredEvents.length > 0)
              {
                parametersChecker.throwBadParameterError(`The capability of the extension with id '${manifest.id}', with id '${capability.id}' is missing the [${requiredEvents.map(event => `'${event}'`).join(", ")}] events`);
              }
            }
          }
          if (instructions.commands !== undefined)
          {
            for (const command of instructions.commands)
            {
              const expectedCommands = [ManifestEvent.ProcessStarted, command.on.entity === CommandEntity.Process ? ManifestEvent.ProcessRunCommand : ManifestEvent.ImageRunCommand];
              const requiredEvents: ManifestEvent[] = expectedCommands.filter((event) =>
              {
                return instructions.events.indexOf(event) === -1;
              });
              if (requiredEvents.length > 0)
              {
                parametersChecker.throwBadParameterError(`The command of the extension with id '${manifest.id}', with '${command.id}' on entity '${command.on.entity}' is missing the ['${requiredEvents.join("', '")}'] events`);
              }
            }
          }
        }
      }
      if (manifest.settings === undefined)
      {
        parametersChecker.throwBadParameterError(`The settings of the extension with id '${manifest.id}' are undefined`);
      }
      else
      {
        // We check that the manifest settings are valid
        const ajv = computeAjv();
        try
        {
          validateJsonSchema(ajv, manifest.settings);
        }
        catch (error)
        {
          parametersChecker.throwBadParameterError(`The settings of the extension with id '${manifest.id}' do not respect the JSON schema. Reason: '${(error as Error).message}'`);
        }

        // We check that the manifest command parameters are valid
        for (const instructions of manifest.instructions)
        {
          if (instructions.commands !== undefined)
          {
            for (const command of instructions.commands)
            {
              if (command.parameters !== undefined)
              {
                try
                {
                  validateJsonSchema(ajv, command.parameters);
                }
                catch (error)
                {
                  parametersChecker.throwBadParameterError(`The command of the extension with id '${manifest.id}', with id '${command.id}' contains parameters which present a definition that does not respect the JSON schema. Reason: '${(error as Error).message}'`);
                }
              }
            }
          }
        }
      }
    }
    else
    {
      if (extendedManifest.ui !== undefined)
      {
        for (const element of extendedManifest.ui.elements)
        {
          if (element.url.startsWith("/") === true)
          {
            if (fs.existsSync(path.join(extendedManifest.directoryPath, element.url)) === false)
            {
              parametersChecker.throwBadParameterError(`The UI element of the extension with id '${manifest.id}', with URL '${element.url}' has no corresponding file`);
            }
          }
        }
      }
    }
  }

  private checkExtensionArchiveBinaryWeight(archive: Buffer<ArrayBufferLike>): void
  {
    if (archive.length > Extension.ARCHIVE_MAXIMUM_BINARY_WEIGHT_IN_BYTES)
    {
      parametersChecker.throwBadParameterError(`The provided extension archive exceeds the maximum allowed binary weight of ${Extension.ARCHIVE_MAXIMUM_BINARY_WEIGHT_IN_BYTES} bytes`);
    }
  }

  private async prepareRuntimeEnvironment(extendedManifest: ExtendedManifest, installDependencies: boolean): Promise<void>
  {
    try
    {
      const directoryPath = extendedManifest.directoryPath;
      const installedEnvironments = new Set<ManifestRuntimeEnvironment>();
      for (const runtime of extendedManifest.runtimes)
      {
        if (installedEnvironments.has(runtime.environment) === false)
        {
          if (runtime.environment === ManifestRuntimeEnvironment.Node)
          {
            // This requires a Node.js runtime environment to create: we install the dependency packages
            const packageJsonFilePath = path.join(directoryPath, packageJsonFileName);
            if (fs.existsSync(packageJsonFilePath) === true)
            {
              // We only install npm if necessary
              await ensureNpm(paths.npmDirectoryPath, npmVersion);
              if (installDependencies === true)
              {
                const sdkInfo = await ExtensionRegistry.getSdkInfo(ManifestRuntimeEnvironment.Node);
                await installPackages(packageJsonFilePath, true, sdkInfo.version, sdkInfo.filePath);
              }
            }
            else
            {
              logger.warn(`There is no '${packageJsonFileName}' file in the extension with id '${extendedManifest.id}', which relies on Node.js`);
            }
          }
          else if (runtime.environment === ManifestRuntimeEnvironment.Python)
          {
            // There is a Python virtual environment to create: we prepare the necessary Python virtual environments and install their requirements
            await ensureVirtualEnvironment(pythonVersion, directoryPath);
            if (installDependencies === true)
            {
              const requirementsFileName = "requirements.txt";
              const requirementsFilePath = path.join(directoryPath, requirementsFileName);
              if (fs.existsSync(requirementsFilePath) === true)
              {
                const sdkInfo = await ExtensionRegistry.getSdkInfo(ManifestRuntimeEnvironment.Python);
                await installViaVirtualEnvironmentRequirements(requirementsFilePath, sdkInfo.version);
              }
              else
              {
                logger.warn(`There is no '${requirementsFileName}' file in the extension with id '${extendedManifest.id}', which relies on Python`);
              }
            }
          }
          else
          {
            parametersChecker.throwBadParameterError(`The runtime environment '${runtime.environment}' is not supported`);
          }
          installedEnvironments.add(runtime.environment);
        }
      }
    }
    catch (error)
    {
      const message = `Could not install properly the runtime environment for the extension with id '${extendedManifest.id}'`;
      logger.error(message, error);
      parametersChecker.throwInternalError(`${message}. Reason: '${(error as Error).message}'`);
    }
  }

  private deleteExtensionFolder(id: string): void
  {
    const directoryPath = this.extensionsRegistry.computeExtensionDirectoryPath(id);
    logger.debug(`Deleting extension folder '${directoryPath}' related to extension the with id '${id}'`);
    fs.rmSync(directoryPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 2_000 });
  }

  private async synchronizeCapability(capability: ManifestCapability, id: string, viaSocket: boolean): Promise<void>
  {
    const runnable = async () =>
    {
      const getAllImageIds = async (): Promise<string[]> =>
      {
        const imageSummaries = await this.entitiesProvider.images.findMany({
          select: { id: true }
        });
        return imageSummaries.map((imageSummary) =>
        {
          return imageSummary.id;
        });
      };
      const cleanUpDirtyImageTagOrFeatures = async (allImageIds: string[], eligibleImageIds: string [], callback: (unexpectedImageIds: string []) => Promise<void>): Promise<void> =>
      {
        const unexpectedImageIds: string[] = eligibleImageIds.filter((id) =>
        {
          return allImageIds.indexOf(id) === -1;
        });
        if (unexpectedImageIds.length > 0)
        {
          // This happens when an image was deleted while its repository was not watching
          await callback(unexpectedImageIds);
        }
      };
      let imageIds: string[];
      // noinspection FallThroughInSwitchStatementJS
      switch (capability.id)
      {
        default:
          parametersChecker.throwInternalError(`The capability with id '${capability.id}' is not supported`);
        case ManifestCapabilityId.TextEmbeddings:
          return;
        case ManifestCapabilityId.ImageFeatures:
        {
          const featuresImageIds = (await this.entitiesProvider.imageFeature.findMany({
            select: { imageId: true },
            where: { extensionId: id }
          })).map((imageFeature) =>
          {
            return imageFeature.imageId;
          });
          const allImageIds = await getAllImageIds();
          imageIds = allImageIds.filter((id) =>
          {
            return featuresImageIds.indexOf(id) === -1;
          });
          await cleanUpDirtyImageTagOrFeatures(allImageIds, featuresImageIds, async (unexpectedImageIds: string[]) =>
          {
            logger.warn(`Deleting ${unexpectedImageIds} unexpected image feature(s) related to the extension with id '${id}'`);
            await this.entitiesProvider.imageFeature.deleteMany({
              where:
                {
                  extensionId: id,
                  imageId: { in: unexpectedImageIds }
                }
            });
          });
        }
          break;
        case ManifestCapabilityId.ImageTags:
        {
          const tagsImageIds = (await this.entitiesProvider.imageTag.findMany({
            select: { imageId: true },
            where: { extensionId: id }
          })).map((imageTag) =>
          {
            return imageTag.imageId;
          });
          const allImageIds = await getAllImageIds();
          imageIds = allImageIds.filter((id) =>
          {
            return tagsImageIds.indexOf(id) === -1;
          });
          await cleanUpDirtyImageTagOrFeatures(allImageIds, tagsImageIds, async (unexpectedImageIds: string[]) =>
          {
            logger.warn(`Deleting ${unexpectedImageIds} unexpected image tag(s) related to the extension with id '${id}'`);
            await this.entitiesProvider.imageTag.deleteMany({
              where:
                {
                  extensionId: id,
                  imageId: { in: unexpectedImageIds }
                }
            });
          });
        }
          break;
        case ManifestCapabilityId.ImageEmbeddings:
        {
          const withEmbeddingsImageIds = await this.vectorDatabaseAccessor.getImageIds(id);
          const allImageIds = await getAllImageIds();
          imageIds = allImageIds.filter((id) =>
          {
            return withEmbeddingsImageIds.indexOf(id) === -1;
          });
          const unexpectedImageIds: string[] = withEmbeddingsImageIds.filter((id) =>
          {
            return allImageIds.indexOf(id) === -1;
          });
          if (unexpectedImageIds.length > 0)
          {
            // This happens when an image was deleted while its repository was not watching
            logger.warn(`Deleting ${unexpectedImageIds} unexpected image embedding(s) related to the extension with id '${id}'`);
            await this.vectorDatabaseAccessor.deleteImagesEmbeddings(unexpectedImageIds, id);
          }
        }
          break;
      }
      logger.info(`Synchronizing ${imageIds.length} image(s) through the extension with id '${id}' for the capability with id '${capability.id}'`);
      const action: ImageEventAction = fromCapacityToImageEventAction(capability)!;
      for (const imageId of imageIds)
      {
        await this.synchronizeCapabilityForImage(id, imageId, action, viaSocket);
      }
    };
    if (viaSocket === true && this.perExtensionIdConnections.get(id) !== true)
    {
      // We wait for the extension to be connected
      this.runWhenConnected(id, runnable);
    }
    else
    {
      await runnable();
    }
  }

  private async synchronizeCapabilityForImage(id: string, imageId: string, action: ImageEventAction, viaSocket: boolean, wait: boolean = false): Promise<void>
  {
    if (viaSocket === true)
    {
      if (wait === false)
      {
        this.notifier.emit(EventEntity.Image, action, undefined, { id: imageId }, id);
      }
      else
      {
        return new Promise<void>(resolve =>
        {
          this.notifier.emit(EventEntity.Image, action, undefined, { id: imageId }, id, () =>
          {
            resolve();
          });
        });
      }
    }
    else
    {
      await this.extensionsManager.onImageEvent({ imageId, action });
    }
  }

  private async notifyTaskExecutor(manifest: Manifest, isStarting: boolean)
  {
    for (let index = 0; index < manifest.instructions.length; index++)
    {
      if (isStarting === true)
      {
        this.extensionTaskExecutor.onExtension(manifest.id, index, manifest.instructions[index].throttlingPolicies);
      }
      else
      {
        await this.extensionTaskExecutor.offExtension(manifest.id);
      }
    }
  }

  private runWhenConnected(id: string, runnable: Runnable): void
  {
    let runnables = this.perExtensionIdRunnables.get(id);
    if (runnables === undefined)
    {
      runnables = [];
      this.perExtensionIdRunnables.set(id, runnables);
    }
    runnables.push(runnable);
  }

  private uninstallChromeExtensions(id: string): void
  {
    const chromeExtensionNames = this.perExtensionIdChromeExtensionNames.get(id);
    if (chromeExtensionNames !== undefined)
    {
      for (const chromeExtensionName of chromeExtensionNames)
      {
        this.hostService.send({ type: HostCommandType.UninstallChromeExtension, name: chromeExtensionName });
      }
      this.perExtensionIdChromeExtensionNames.delete(id);
    }
  }

}
