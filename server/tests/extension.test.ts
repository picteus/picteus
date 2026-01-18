import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import process from "node:process";
import { Stream } from "node:stream";
import { buffer } from "node:stream/consumers";
import zlib from "node:zlib";
import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import waitForExpect from "wait-for-expect";
import fastCartesian from "fast-cartesian";
import AdmZip from "adm-zip";
import tarStream from "tar-stream";
import { fdir } from "fdir";
import * as IO from "socket.io-client";
import { headers, types } from "http-constants";
import HttpCodes from "http-codes";

import { paths } from "../src/paths";
import { stringify } from "../src/utils";
import { computeAttachmentDisposition } from "../src/services/utils/downloader";
import { Base, Core, ExtensionBasisBuilder, ListenerMock } from "./base";
import {
  applicationXGzipMimeType,
  CommandEntity,
  Extension,
  ExtensionActivityKind,
  ExtensionGenerationOptions,
  ExtensionSettings,
  ExtensionStatus,
  fileWithProtocol,
  ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageSummary,
  Manifest,
  ManifestCapability,
  ManifestCapabilityId,
  ManifestEvent,
  ManifestExecution,
  ManifestExtensionCommand,
  ManifestInstructions,
  ManifestRuntimeEnvironment,
  ManifestUserInterface,
  Repository,
  toMimeType,
  UserInterfaceAnchor
} from "../src/dtos/app.dtos";
import { ServiceError } from "../src/app.exceptions";
import { apiKeyHeaderName, AuthenticationGuard } from "../src/app.guards";
import { ExtensionRegistry, ImageAttachmentService } from "../src/services/app.service";
import { readMetadata } from "../src/services/utils/images";
import { EventEntity, ExtensionEventAction, ExtensionEventProcess, Notifier } from "../src/notifier";
import { ExtensionGenerator } from "../src/services/extensionGenerator";

const { io } = IO;

const { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } = HttpCodes;


describe("Extensions", () =>
{

  const base = new Base(true);

  const connectionChannelName = "connection";

  const connectChannelName = "connect";

  const eventsChannelName = "events";

  beforeAll(async () =>
  {
    await Base.beforeAll();
    paths.requiresApiKey = true;
    const relativePath: string[] = process.platform === "win32" ? [".."] : ["..", ".."];
    paths.npmDirectoryPath = path.join(ExtensionBuilder.nodeExecutable, ...relativePath);
  });

  beforeEach(async () =>
  {
    await base.beforeEach();
  }, Core.beforeAfterTimeoutInMilliseconds);

  afterEach(async () =>
  {
    await base.afterEach();
  }, Core.beforeAfterTimeoutInMilliseconds);

  afterAll(async () =>
  {
    await Base.afterAll();
  });

  // noinspection JSPotentiallyInvalidUsageOfThis
  class ExtensionBuilder extends ExtensionBasisBuilder
  {

    static readonly dummyExecution: ManifestExecution =
      {
        executable: ExtensionBuilder.nodeExecutable,
        arguments: ["--eval", "console.info('Started'); setTimeout(() => {}, 1_000_000);"]
      };

    static readonly javaScriptFileName = "main.js";

    readonly extensionId: string;

    readonly extensionName: string;

    readonly extensionVersion: string;

    readonly extensionDirectoryPath: string;

    private readonly touchedFileName = "touched.txt";

    readonly touchedFilePath: string;

    private readonly startedFileName: string;

    readonly startedFilePath: string;

    readonly installedListener: ListenerMock;

    readonly startedListener: ListenerMock;

    readonly errorListener: ListenerMock;

    constructor(isPrepareDirectory?: boolean, startedFileName?: string, extensionId?: string, extensionName?: string, extensionVersion?: string)
    {
      super();
      this.extensionId = extensionId ?? (`id-${Math.round(Math.random() * 1_000_000)}`);
      this.extensionName = extensionName ?? "Test";
      this.extensionVersion = extensionVersion ?? `1.${Math.round(Math.random() * 10)}.0`;
      this.extensionDirectoryPath = path.join(paths.installedExtensionsDirectoryPath, this.extensionId);
      this.touchedFilePath = path.join(this.extensionDirectoryPath, this.touchedFileName);
      this.startedFileName = startedFileName === undefined ? "started.txt" : startedFileName;
      this.startedFilePath = path.join(this.extensionDirectoryPath, this.startedFileName);
      if (isPrepareDirectory === true)
      {
        base.prepareEmptyDirectory(this.extensionId, path.join(this.extensionDirectoryPath, ".."));
      }
      this.installedListener = base.computeEventListener();
      base.getNotifier().on(EventEntity.Extension, ExtensionEventAction.Installed, undefined, this.installedListener);
      this.startedListener = base.computeEventListener();
      base.getNotifier().on(EventEntity.Extension, ExtensionEventAction.Process, ExtensionEventProcess.Started, this.startedListener);
      this.errorListener = base.computeEventListener();
      base.getNotifier().on(EventEntity.Extension, ExtensionEventAction.Error, undefined, this.errorListener);
    }

    computeSimpleManifest(javascriptFilePath?: string, viaNode?: boolean, willNotRespondToTermination?: boolean, processStartedExecutable ?: string, javaScriptCode?: string, settings?: Record<string, any>, ui?: ManifestUserInterface, environmentVariable?: string): Manifest
    {
      const nodeScriptCode = javaScriptCode ?? base.computeExtensionJavaScriptCode(this.startedFileName, willNotRespondToTermination === true, environmentVariable);
      if (javascriptFilePath !== undefined)
      {
        fs.writeFileSync(javascriptFilePath, nodeScriptCode);
      }
      return this.computeWithInstructionsManifest([
        {
          events: [ManifestEvent.ProcessStarted],
          execution:
            {
              // In case of the "--eval" CLI option, we need to run Node.js go through a shell intermediate process, otherwise the spawn Node.js process exits immediately
              executable: processStartedExecutable ?? (viaNode === true ? "${node}" : (javascriptFilePath !== undefined ? ExtensionBuilder.nodeExecutable : "${shell}")),
              arguments: javascriptFilePath !== undefined ? [javascriptFilePath] : [ExtensionBuilder.nodeExecutable, "--eval", `"${nodeScriptCode}"`]
            }
        },
        {
          events: [ManifestEvent.ImageCreated],
          execution:
            {
              executable: "${shell}",
              arguments: os.platform() === "win32" ? ["echo", ".>", `"${this.touchedFileName}"`] : ["touch", `"${this.touchedFileName}"`]
            }
        }
      ], this.extensionVersion, this.extensionName, "A test extension.", settings, ui);
    }

    computeStartedManifest(entity: CommandEntity = CommandEntity.Image, commands?: ManifestExtensionCommand[], throttlingDurationInMilliseconds?: number): Manifest
    {
      const throttableEvents = [ManifestEvent.ImageCreated, ManifestEvent.ImageUpdated, ManifestEvent.ImageDeleted, ManifestEvent.ImageComputeFeatures, ManifestEvent.ImageComputeTags, ManifestEvent.TextComputeEmbeddings, entity == CommandEntity.Image ? ManifestEvent.ImageRunCommand : ManifestEvent.ProcessRunCommand];
      return this.computeWithInstructionsManifest([
          {
            events: [ManifestEvent.ProcessStarted, ...throttableEvents],
            throttlingPolicies:
              [
                {
                  events: throttableEvents,
                  maximumCount: 1,
                  durationInMilliseconds: Math.round(throttlingDurationInMilliseconds ?? Core.fastestIntervalInMilliseconds)
                }
              ],
            capabilities: [{ id: ManifestCapabilityId.ImageTags }, { id: ManifestCapabilityId.ImageFeatures }, { id: ManifestCapabilityId.TextEmbeddings }],
            execution:
              {
                executable: ExtensionBuilder.nodeExecutable,
                arguments: [ExtensionBuilder.startedJsFileName]
              },
            commands: commands ?? [
              {
                id: entity == CommandEntity.Image ? "logDimensions" : "askForSomething",
                on: { entity },
                parameters: entity == CommandEntity.Image ? undefined : [
                  {
                    id: "age",
                    definition: {
                      type: "integer",
                      title: "Age",
                      description: "What is your age?",
                      minimum: 1,
                      maximum: 128,
                      default: 35
                    }
                  }
                ],
                specifications: [
                  {
                    locale: "en",
                    label: entity == CommandEntity.Image ? "Logs dimensions" : "Asks the user",
                    description: entity == CommandEntity.Image ? "Logs the image dimensions" : "Asks for something from the user"
                  }
                ]
              }
            ]
          }
        ]
      );
    }

    computeWithInstructionsManifest(instructions: ManifestInstructions[], extensionVersion: string = this.extensionVersion, extensionName: string = this.extensionName, extensionDescription: string = "An extension for testing.", settings: Record<string, any> = {
      type: "object",
      properties: {}
    }, ui: ManifestUserInterface | undefined = undefined): Manifest
    {
      return {
        id: this.extensionId,
        version: extensionVersion,
        name: extensionName,
        description: extensionDescription,
        runtimes: [{ environment: ManifestRuntimeEnvironment.Node }],
        instructions,
        settings,
        ui
      };
    }

    async createRepository(watch: boolean | undefined = undefined): Promise<Repository>
    {
      const directoryPath = base.prepareEmptyDirectory("images", base.getWorkingDirectoryPath());
      base.imageFeeder.copyImage(directoryPath, base.imageFeeder.pngImageFileName);
      base.imageFeeder.copyImage(directoryPath, base.imageFeeder.jpegImageFileName);
      const repository = await base.createRepository(fileWithProtocol + directoryPath, undefined, undefined, watch);
      await base.waitUntilRepositoryReady(repository.id);
      return repository;
    }

    async createRepositoryAndGetImages(watch: boolean | undefined = undefined): Promise<{
      repository: Repository,
      images: ImageSummary[]
    }>
    {
      const repository = await this.createRepository(watch);
      const summaries = await base.getRepositoryController().searchImages(repository.id, {});
      return { repository, images: summaries.entities };
    }

    async waitUntilExtensionInstalled(): Promise<void>
    {
      await waitForExpect(() =>
      {
        expect(this.installedListener).toHaveBeenCalledTimes(1);
      });
      expect(this.installedListener).toHaveBeenCalledWith(EventEntity.Extension + Notifier.delimiter + ExtensionEventAction.Installed, { id: this.extensionId });
    }

    checkExtensionProcessStarted(): void
    {
      expect(this.startedListener).toHaveBeenCalledTimes(1);
      expect(this.startedListener).toHaveBeenCalledWith(EventEntity.Extension + Notifier.delimiter + ExtensionEventAction.Process + Notifier.delimiter + ExtensionEventProcess.Started, { id: this.extensionId });
    }

    async checkExtensionRunning(checkStartedFile: boolean = true, checkImageTouchedFile: boolean = true, environment: {
      name: string,
      value: string
    } | undefined = undefined): Promise<void>
    {
      expect(fs.existsSync(this.extensionDirectoryPath)).toEqual(true);
      expect(fs.existsSync(path.join(this.extensionDirectoryPath, "manifest.json"))).toEqual(true);
      const parametersFilePath = path.join(this.extensionDirectoryPath, Base.extensionParametersFileName);
      expect(fs.existsSync(parametersFilePath)).toEqual(true);
      const cacheDirectoryPath = path.join(this.extensionDirectoryPath, ".cache");
      expect(fs.existsSync(cacheDirectoryPath)).toEqual(true);
      expect(fs.lstatSync(cacheDirectoryPath).isSymbolicLink()).toEqual(true);
      const parameters = JSON.parse(fs.readFileSync(parametersFilePath, { encoding: "utf8" }));
      expect(parameters.webServicesBaseUrl).toEqual(paths.webServicesBaseUrl);
      expect(parameters.extensionId).toEqual(this.extensionId);
      const apiKey = parameters.apiKey;
      expect(apiKey).toBeDefined();
      if (checkStartedFile === true)
      {
        expect(fs.existsSync(this.startedFilePath)).toEqual(true);
      }
      if (checkImageTouchedFile === true)
      {
        expect(fs.existsSync(this.touchedFilePath)).toEqual(true);
      }
      if (environment !== undefined)
      {
        const filePath = path.join(this.extensionDirectoryPath, `${environment.name}.txt`);
        expect(fs.existsSync(filePath)).toEqual(true);
        const value = fs.readFileSync(filePath, { encoding: "utf8" });
        expect(value).toEqual(environment.value);
      }

      // We make sure that we can invoke the web services via the dedicated API key
      const webServiceRoute = `extension/${this.extensionId}/getSettings`;
      const response = await fetch(`${parameters.webServicesBaseUrl}/${webServiceRoute}`, { headers: { [apiKeyHeaderName]: apiKey } });
      if (response.status !== OK)
      {
        throw new Error(`The '${webServiceRoute}' web service response status is equal to '${response.status}'`);
      }
    }

    async checkExtensionOver(): Promise<void>
    {
      this.deleteStartedFile();
      await base.wait();
      this.checkStartedFileNotFound();
    }

    deleteStartedFile(): void
    {
      fs.rmSync(this.startedFilePath);
    }

    checkStartedFileNotFound(): void
    {
      expect(fs.existsSync(this.startedFilePath)).toEqual(false);
    }

  }

  test("Install via filesystem", async () =>
  {
    const builder = new ExtensionBuilder(true);
    const javaScriptFilePath = path.join(builder.extensionDirectoryPath, ExtensionBuilder.javaScriptFileName);
    const environmentVariableName = "name";
    const environmentVariableValue = "value";
    process.env[environmentVariableName] = environmentVariableValue;
    const manifest = builder.computeSimpleManifest(javaScriptFilePath, false, false, undefined, undefined, undefined, undefined, environmentVariableName);
    fs.writeFileSync(path.join(builder.extensionDirectoryPath, ExtensionRegistry.manifestFileName), stringify(manifest));
    await base.restart();

    await builder.createRepository();
    await waitForExpect(async () =>
    {
      await builder.checkExtensionRunning(undefined, undefined, {
        name: environmentVariableName,
        value: environmentVariableValue
      });
    });
    // We delete the file generated by an extension and make sure that it is not generated anymore
    await base.terminate();
    await builder.checkExtensionOver();
  });

  test("Install zip wrong parameters", async () =>
  {
    {
      await expect(async () =>
      {
        await base.getExtensionController().install(Buffer.from(""));
      }).rejects.toThrow(new ServiceError("The body MIME type cannot be determined", BAD_REQUEST, base.badParameterCode));
    }
    {
      await expect(async () =>
      {
        await base.getExtensionController().install(Buffer.from(Array(8 * 1024 * 1024 + 1).fill(0)));
      }).rejects.toThrow(new ServiceError("The provided extension archive exceeds the maximum allowed binary weight of 8388608 bytes", BAD_REQUEST, base.badParameterCode));
    }
    {
      const zip = new AdmZip();
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError("The body zip content does not contain the manifest 'manifest.json' file", BAD_REQUEST, base.badParameterCode));
    }
    {
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from("malformed JSON", "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError("The archive contains a manifest 'manifest.json' file which is not a valid JSON content", BAD_REQUEST, base.badParameterCode));
    }
    const manifest: Record<string, any> = {};
    {
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());

      }).rejects.toThrow(new ServiceError("The manifest 'manifest.json' file does not respect the expected schema: the property 'runtimes' is invalid, because runtimes should not be null or undefined", BAD_REQUEST, base.badParameterCode));
    }
    {
      // manifest.capabilities = [{ id: ManifestCapabilityId.Features }];
      manifest.runtimes = [];
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError("The manifest 'manifest.json' file does not respect the expected schema: the property 'instructions' is invalid, because instructions should not be null or undefined", BAD_REQUEST, base.badParameterCode));
    }
    {
      manifest.instructions = [{ events: [ManifestEvent.ProcessStarted], execution: ExtensionBuilder.dummyExecution }];
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError("The manifest 'manifest.json' file does not respect the expected schema: the property 'settings' is invalid, because settings should not be null or undefined", BAD_REQUEST, base.badParameterCode));
    }
    {
      manifest.settings = {};
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError("The manifest 'manifest.json' file does not respect the expected schema: the property 'id' is invalid, because id should not be null or undefined", BAD_REQUEST, base.badParameterCode));
    }
    {
      manifest.id = "an.id";
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError("The manifest 'manifest.json' file does not respect the expected schema: the property 'version' is invalid, because version should not be null or undefined", BAD_REQUEST, base.badParameterCode));
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify({
        ...manifest,
        version: "invalid"
      }), "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError("The manifest 'manifest.json' file does not respect the expected schema: the property 'version' is invalid, because version must match ^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$ regular expression", BAD_REQUEST, base.badParameterCode));
    }
    {
      manifest.version = "1.0.0";
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError("The manifest 'manifest.json' file does not respect the expected schema: the property 'name' is invalid, because name should not be null or undefined", BAD_REQUEST, base.badParameterCode));
    }
    {
      manifest.name = "Assessment";
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError("The manifest 'manifest.json' file does not respect the expected schema: the property 'description' is invalid, because description should not be null or undefined", BAD_REQUEST, base.badParameterCode));
    }
  });

  test("With '${node}'", async () =>
  {
    const builder = new ExtensionBuilder();
    const javaScriptFilePath = path.join(base.getWorkingDirectoryPath(), ExtensionBuilder.javaScriptFileName);
    const manifest = builder.computeSimpleManifest(javaScriptFilePath, true);
    const zip = new AdmZip();
    zip.addFile(path.basename(javaScriptFilePath), fs.readFileSync(javaScriptFilePath));
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    await testApiInstall(builder, manifest, zip.toBuffer());
  });

  test("With --eval", async () =>
  {
    const builder = new ExtensionBuilder();
    const manifest = builder.computeSimpleManifest(undefined, false);
    const zip = new AdmZip();
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    await testApiInstall(builder, manifest, zip.toBuffer());
  });

  test("Ignores SIGTERM signal", async () =>
  {
    const builder = new ExtensionBuilder();
    const manifest = builder.computeSimpleManifest(undefined, false, true);
    const zip = new AdmZip();
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    await testApiInstall(builder, manifest, zip.toBuffer());
  });

  test("Install zip via API under root", async () =>
  {
    const builder = new ExtensionBuilder();
    const javaScriptFilePath = path.join(base.getWorkingDirectoryPath(), ExtensionBuilder.javaScriptFileName);
    const manifest = builder.computeSimpleManifest(javaScriptFilePath);
    const zip = new AdmZip();
    zip.addFile(path.basename(javaScriptFilePath), fs.readFileSync(javaScriptFilePath));
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    await testApiInstall(builder, manifest, zip.toBuffer());
  });

  test("Install zip via API under sub-directory", async () =>
  {
    const builder = new ExtensionBuilder();
    const javaScriptFilePath = path.join(base.getWorkingDirectoryPath(), ExtensionBuilder.javaScriptFileName);
    const manifest = builder.computeSimpleManifest(javaScriptFilePath);
    const zip = new AdmZip();
    zip.addFile(path.basename(javaScriptFilePath), fs.readFileSync(javaScriptFilePath));
    zip.addFile(`subdirectory/${ExtensionRegistry.manifestFileName}`, Buffer.from(stringify(manifest), "utf8"));
    zip.addFile(`otherdirectory/somefile.txt`, Buffer.from("Hello World!", "utf8"));
    await testApiInstall(builder, manifest, zip.toBuffer());
  });

  test("Install compressed tarball via API under root", async () =>
  {
    const builder = new ExtensionBuilder();
    const javaScriptFilePath = path.join(base.getWorkingDirectoryPath(), ExtensionBuilder.javaScriptFileName);
    const manifest = builder.computeSimpleManifest(javaScriptFilePath);
    const entries =
      [
        {
          name: path.basename(javaScriptFilePath),
          content: fs.readFileSync(javaScriptFilePath)
        },
        {
          name: ExtensionRegistry.manifestFileName,
          content: Buffer.from(stringify(manifest), "utf8")
        }
      ];
    const buffer = await buildCompressedTarball(entries);
    await testApiInstall(builder, manifest, buffer);
  });

  test("Install faulty", async () =>
  {
    const builder = new ExtensionBuilder();
    {
      const capabilityId = ManifestCapabilityId.TextEmbeddings;
      const manifest = builder.computeWithInstructionsManifest([
        {
          events: [ManifestEvent.ImageCreated],
          capabilities: [new ManifestCapability(capabilityId)],
          execution: ExtensionBuilder.dummyExecution
        }
      ]);
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError(`The capability of the extension with id '${manifest.id}', with id '${capabilityId}' requires the '${ManifestEvent.ProcessStarted}' event`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We assess with an invalid throttling policy
      const manifest = builder.computeWithInstructionsManifest([
        {
          events: [ManifestEvent.ProcessStarted],
          throttlingPolicies:
            [
              {
                events: [ManifestEvent.ImageCreated],
                maximumCount: 1,
                durationInMilliseconds: -1
              }
            ],
          execution: ExtensionBuilder.dummyExecution
        }
      ]);
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError(`The manifest 'manifest.json' file does not respect the expected schema: the property 'instructions' is invalid, because at the level of 'instructions.0.throttlingPolicies.0', durationInMilliseconds must be a positive number`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We assess missing events when setting throttling policies
      const manifest = builder.computeWithInstructionsManifest([
        {
          events: [ManifestEvent.ProcessStarted],
          throttlingPolicies:
            [
              {
                events: [ManifestEvent.ImageCreated],
                maximumCount: 1,
                durationInMilliseconds: 1_000
              }
            ],
          execution: ExtensionBuilder.dummyExecution
        }
      ]);
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError(`A throttling policy of the extension with id '${manifest.id}' refers to the 'image.created' event which is not declared through the 'events' property`, BAD_REQUEST, base.badParameterCode));
    }
    {
      const capabilityId = ManifestCapabilityId.TextEmbeddings;
      const manifest = builder.computeWithInstructionsManifest([
        {
          events: [ManifestEvent.ProcessStarted],
          capabilities: [new ManifestCapability(capabilityId)],
          execution: ExtensionBuilder.dummyExecution
        }
      ]);
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError(`The capability of the extension with id '${manifest.id}', with id '${capabilityId}' is missing the ['${ManifestEvent.TextComputeEmbeddings}'] events`, BAD_REQUEST, base.badParameterCode));
    }
    {
      const commandId = "commandId";
      const commands = [{
        id: commandId,
        on: { entity: CommandEntity.Process },
        specifications: [{ locale: "en", label: "A command" }]
      }];
      {
        const manifest = builder.computeWithInstructionsManifest([
          {
            events: [ManifestEvent.ImageComputeFeatures],
            execution: ExtensionBuilder.dummyExecution,
            commands
          }
        ]);
        const zip = new AdmZip();
        zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
        await expect(async () =>
        {
          await base.getExtensionController().install(zip.toBuffer());
        }).rejects.toThrow(new ServiceError(`The command of the extension with id '${manifest.id}', with '${commandId}' on entity 'Process' is missing the ['${ManifestEvent.ProcessStarted}', '${ManifestEvent.ProcessRunCommand}'] events`, BAD_REQUEST, base.badParameterCode));
      }
      const additionEvents = [ManifestEvent.ProcessStarted, ManifestEvent.ProcessRunCommand];
      for (const additionEvent of additionEvents)
      {
        const manifest = builder.computeWithInstructionsManifest([
          {
            events: [ManifestEvent.ImageComputeFeatures, additionEvent],
            execution: ExtensionBuilder.dummyExecution,
            commands
          }
        ]);
        const zip = new AdmZip();
        zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
        await expect(async () =>
        {
          await base.getExtensionController().install(zip.toBuffer());
        }).rejects.toThrow(new ServiceError(`The command of the extension with id '${manifest.id}', with '${commandId}' on entity 'Process' is missing the ['${additionEvent === ManifestEvent.ProcessStarted ? ManifestEvent.ProcessRunCommand : ManifestEvent.ProcessStarted}'] events`, BAD_REQUEST, base.badParameterCode));
      }
    }
    {
      const manifest = builder.computeWithInstructionsManifest([
        {
          events: [ManifestEvent.ProcessStarted],
          capabilities: [],
          execution: ExtensionBuilder.dummyExecution
        }
      ], undefined, undefined, undefined, { type: "invalid", properties: {} });
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError(`The settings of the extension with id '${manifest.id}' do not respect the JSON schema. Reason: 'the 'enum' property '/type' must be equal to one of the allowed values'`, BAD_REQUEST, base.badParameterCode));
    }
    {
      const url = "/sidebar/index.html";
      const manifest = builder.computeWithInstructionsManifest([
        {
          events: [ManifestEvent.ProcessStarted],
          capabilities: [],
          execution: ExtensionBuilder.dummyExecution
        }
      ], undefined, undefined, undefined, undefined, {
        elements: [{
          anchor: UserInterfaceAnchor.Sidebar,
          url: url
        }]
      });
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await expect(async () =>
      {
        await base.getExtensionController().install(zip.toBuffer());
      }).rejects.toThrow(new ServiceError(`The UI element of the extension with id '${manifest.id}', with URL '${url}' has no corresponding file`, BAD_REQUEST, base.badParameterCode));
    }
  });

  test("Install compressed tarball via API under sub-directory", async () =>
  {
    const builder = new ExtensionBuilder();
    const javaScriptFilePath = path.join(base.getWorkingDirectoryPath(), ExtensionBuilder.javaScriptFileName);
    const manifest = builder.computeSimpleManifest(javaScriptFilePath);
    const entries =
      [
        {
          name: path.basename(javaScriptFilePath),
          content: fs.readFileSync(javaScriptFilePath)
        },
        {
          name: `subdirectory/${ExtensionRegistry.manifestFileName}`,
          content: Buffer.from(stringify(manifest), "utf8")
        }
      ];
    const buffer = await buildCompressedTarball(entries);
    await testApiInstall(builder, manifest, buffer);
  });

  test("Install with UI", async () =>
  {
    const builder = new ExtensionBuilder();
    const javaScriptFilePath = path.join(base.getWorkingDirectoryPath(), ExtensionBuilder.javaScriptFileName);
    const elementBasePath = "sidebar/";
    const manifest = builder.computeSimpleManifest(javaScriptFilePath, undefined, undefined, undefined, undefined, undefined, {
      elements:
        [
          {
            anchor: UserInterfaceAnchor.Sidebar,
            url: `/${elementBasePath}index.html`
          }
        ]
    });
    const zip = new AdmZip();
    zip.addFile(path.basename(javaScriptFilePath), fs.readFileSync(javaScriptFilePath));
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));

    class Case
    {

      readonly path: string;

      readonly content: string;

      readonly mimeType: string;

      constructor(path: string, content: string, mimeType: string)
      {
        this.path = path;
        this.content = content;
        this.mimeType = mimeType;
      }

    }

    const cases = [new Case("index.html", "Content", types.html), new Case("style.css", "body {}", types.css), new Case("javascript.js", "var dummy = value;", types.js), new Case("json.json", JSON.stringify({ key: "value" }), types.json)];
    for (const aCase of cases)
    {
      zip.addFile(elementBasePath + aCase.path, Buffer.from(aCase.content, "utf8"));
    }
    await testApiInstall(builder, manifest, zip.toBuffer(), async () =>
    {
      for (const aCase of cases)
      {
        const url = `${paths.webServicesBaseUrl}/ui/${manifest.id}/${elementBasePath + aCase.path}`;
        const response = await fetch(url);
        expect(response.ok).toBeTruthy();
        expect(await response.text()).toEqual(aCase.content);
        expect(response.headers.get(headers.request.CONTENT_TYPE)).toEqual(`${aCase.mimeType}; charset=utf-8`);
      }
    });
  });

  test("get", async () =>
  {
    {
      // We assess with invalid parameters
      const inexistentId = "inexistentId";
      await expect(async () =>
      {
        await base.getExtensionController().get(inexistentId);
      }).rejects.toThrow(new ServiceError(`The parameter 'id' with value '${inexistentId}' is invalid because there is no extension with that identifier`, BAD_REQUEST, base.badParameterCode));
    }
    {
      // We assess with valid parameters
      const builder = new ExtensionBuilder();
      const javaScriptFilePath = path.join(base.getWorkingDirectoryPath(), ExtensionBuilder.javaScriptFileName);
      const manifest = builder.computeSimpleManifest(javaScriptFilePath);
      const zip = new AdmZip();
      zip.addFile(path.basename(javaScriptFilePath), fs.readFileSync(javaScriptFilePath));
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      const instructions = "This is the README content!";
      zip.addFile(ExtensionRegistry.readmeFileName, Buffer.from(instructions, "utf8"));
      const extension = await base.getExtensionController().install(zip.toBuffer());

      const returnedExtension = await base.getExtensionController().get(extension.manifest.id);
      expect(returnedExtension.manifest).toEqual(extension.manifest);
      expect(returnedExtension.status).toEqual(ExtensionStatus.Enabled);
      expect(returnedExtension.manual).toBeDefined();
      expect(returnedExtension.manual?.instructions).toEqual(instructions);
    }
  });

  test("icon", async () =>
  {
    const builder = new ExtensionBuilder();
    const javaScriptFilePath = path.join(base.getWorkingDirectoryPath(), ExtensionBuilder.javaScriptFileName);
    const manifest = builder.computeSimpleManifest(javaScriptFilePath);
    const zip = new AdmZip();
    zip.addFile(path.basename(javaScriptFilePath), fs.readFileSync(javaScriptFilePath));
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    zip.addFile("icon.png", Buffer.from("R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", "base64"));
    const extension = await base.getExtensionController().install(zip.toBuffer());
    await checkIcon(extension);
  });

  test("uninstall", async () =>
  {
    const listener = base.computeEventListener();
    base.getNotifier().once(EventEntity.Extension, ExtensionEventAction.Uninstalled, undefined, listener);
    const builder = new ExtensionBuilder(false, "../started.txt");
    const javaScriptFilePath = path.join(base.getWorkingDirectoryPath(), ExtensionBuilder.javaScriptFileName);
    const key = "key";
    const manifest = builder.computeSimpleManifest(javaScriptFilePath, undefined, undefined, undefined, undefined, {
      type: "object",
      properties: { [key]: { type: "string" } }
    });
    const zip = new AdmZip();
    zip.addFile(path.basename(javaScriptFilePath), fs.readFileSync(javaScriptFilePath));
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    const extension = await base.getExtensionController().install(zip.toBuffer());
    await base.getExtensionController().setSettings(Base.allPolicyContext, manifest.id, new ExtensionSettings({ [key]: "value" }));

    const { images } = await builder.createRepositoryAndGetImages();
    await waitForExpect(async () =>
    {
      await builder.checkExtensionRunning();
    });
    const id = extension.manifest.id;
    const imageId = images[0].id;
    {
      // We attach features with a binary attachment, and embeddings to the extension
      const stringFeature = new ImageFeature(ImageFeatureType.CAPTION, ImageFeatureFormat.STRING, undefined, "A feature");
      const attachmentUri = await base.getImageAttachmentController().create(Base.allPolicyContext, imageId, id, toMimeType(ImageFormat.JPEG), fs.readFileSync(path.join(base.imageFeeder.imagesDirectoryPath, base.imageFeeder.jpegImageFileName)));
      const binaryFeature = new ImageFeature(ImageFeatureType.OTHER, ImageFeatureFormat.BINARY, undefined, attachmentUri);
      const features = [stringFeature, binaryFeature];
      await base.getImageController().setFeatures(Base.allPolicyContext, imageId, id, features);
      const storedFeatures = await base.getImageController().getAllFeatures(imageId);
      expect(storedFeatures[0]).toEqual({ id, ...stringFeature });
      expect(storedFeatures[1]).toEqual({ id, ...binaryFeature });
      expect((await base.getModuleProvider(ImageAttachmentService).list(imageId)).length).toEqual(1);
      expect((await base.getEntitiesProvider().imageFeature.findMany({ where: { extensionId: id } })).length).toEqual(features.length);
      const values = [0, 1, 2, 3, 4];
      await base.getImageController().setEmbeddings(Base.allPolicyContext, imageId, id, { values: values });
      expect((await base.getImageController().getEmbeddings(imageId, id)).values).toEqual(values);
      expect(await base.getVectorDatabaseAccessor().getEmbeddings(imageId, id)).toEqual(values);
    }
    await base.getExtensionController().uninstall(id);
    await waitForExpect(() =>
    {
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(EventEntity.Extension + Notifier.delimiter + ExtensionEventAction.Uninstalled, { id: manifest.id });
    });
    {
      // We check that the features, their attachments, and the embeddings and the settings attached to the extension are deleted
      expect(await base.getEntitiesProvider().imageFeature.findMany({ where: { extensionId: id } })).toEqual([]);
      expect(await base.getModuleProvider(ImageAttachmentService).list(imageId)).toEqual([]);
      expect(await base.getVectorDatabaseAccessor().getEmbeddings(imageId, id)).toBeUndefined();
      await expect(async () =>
      {
        await base.getExtensionController().getSettings(Base.allPolicyContext, manifest.id);
      }).rejects.toThrow(new ServiceError(`The parameter 'id' with value '${id}' is invalid because there is no extension with that identifier`, BAD_REQUEST, base.badParameterCode));
      expect(await base.getEntitiesProvider().extensionSettings.findUnique({ where: { extensionId: id } })).toBeNull();
    }
    // We make sure that the extension process is now over
    await builder.checkExtensionOver();

    // We attempt to uninstall a non-installed extension
    await expect(async () =>
    {
      await base.getExtensionController().uninstall(id);
    }).rejects.toThrow(new ServiceError(`The parameter 'id' with value '${id}' is invalid because there is no extension with that identifier`, BAD_REQUEST, base.badParameterCode));
  });

  test("non-existent binary file", async () =>
  {
    const builder = new ExtensionBuilder();
    const manifest = builder.computeSimpleManifest(undefined, false, true, "/dummyFilePath");
    const zip = new AdmZip();
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    await testApiInstall(builder, manifest, zip.toBuffer(), async () =>
    {
      expect(builder.errorListener).toHaveBeenCalledTimes(1);
      expect(builder.errorListener).toHaveBeenCalledWith(EventEntity.Extension + Notifier.delimiter + ExtensionEventAction.Error, {
        id: manifest.id,
        message: `The start of the process of the extension with id '${manifest.id}' related to the event 'process.started' failed`
      });
    }, false);
  });

  test.each([0, 50])("failing binary file with timeout=%p", async (timeoutInMilliseconds) =>
  {
    const builder = new ExtensionBuilder();
    const manifest = builder.computeSimpleManifest(undefined, false, true, undefined, `const process = require('process'); setTimeout(() => { console.info('Exiting process with id \\'' + process.pid + '\\''); process.exit(1); }, ${timeoutInMilliseconds});`);
    const zip = new AdmZip();
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    const stoppedListener = base.computeEventListener();
    base.getNotifier().on(EventEntity.Extension, ExtensionEventAction.Process, ExtensionEventProcess.Stopped, stoppedListener);
    await testApiInstall(builder, manifest, zip.toBuffer(), async () =>
    {
      await waitForExpect(async () =>
      {
        expect(builder.errorListener).toHaveBeenCalledTimes(1);
      });
      expect(builder.errorListener).toHaveBeenCalledWith(EventEntity.Extension + Notifier.delimiter + ExtensionEventAction.Error, {
        id: manifest.id,
        message: `The process of the extension with id '${manifest.id}' regarding the 'process.started' event has exited 3 times in a row, it will not be restarted anymore`
      });
      const maximumAttemptsCount = 3;
      expect(builder.startedListener).toHaveBeenCalledTimes(maximumAttemptsCount);
      expect(builder.startedListener).toHaveBeenCalledWith(EventEntity.Extension + Notifier.delimiter + ExtensionEventAction.Process + Notifier.delimiter + ExtensionEventProcess.Started, { id: manifest.id });
      expect(stoppedListener).toHaveBeenCalledTimes(maximumAttemptsCount);
      expect(stoppedListener).toHaveBeenCalledWith(EventEntity.Extension + Notifier.delimiter + ExtensionEventAction.Process + Notifier.delimiter + ExtensionEventProcess.Stopped, { id: manifest.id });
    });
  });

  test("update", async () =>
  {
    const listener = base.computeEventListener();
    base.getNotifier().once(EventEntity.Extension, ExtensionEventAction.Updated, undefined, listener);
    const extensionId = "id";
    const firstBuilder = new ExtensionBuilder(false, "../started-1.txt", extensionId);
    const firstJavaScriptFilePath = path.join(base.getWorkingDirectoryPath(), ExtensionBuilder.javaScriptFileName);
    const manifest = firstBuilder.computeSimpleManifest(firstJavaScriptFilePath);
    {
      const zip = new AdmZip();
      zip.addFile(path.basename(firstJavaScriptFilePath), fs.readFileSync(firstJavaScriptFilePath));
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));

      {
        // We assess with invalid parameters
        {
          // We assess with a too-large archive
          await expect(async () =>
          {
            await base.getExtensionController().update(firstBuilder.extensionId, Buffer.from(Array(8 * 1024 * 1024 + 1).fill(0)));
          }).rejects.toThrow(new ServiceError("The provided extension archive exceeds the maximum allowed binary weight of 8388608 bytes", BAD_REQUEST, base.badParameterCode));
        }
        {
          // We attempt to update a non-installed extension
          await expect(async () =>
          {
            await base.getExtensionController().update(firstBuilder.extensionId, zip.toBuffer());
          }).rejects.toThrow(new ServiceError(`There is no extension with id '${manifest.id}'`, BAD_REQUEST, base.badParameterCode));
        }
      }

      await base.getExtensionController().install(zip.toBuffer());

      await firstBuilder.createRepository();
      await waitForExpect(async () =>
      {
        await firstBuilder.checkExtensionRunning();
      });
    }

    const secondBuilder = new ExtensionBuilder(false, "../started-2.txt", extensionId);
    let secondArchive: Buffer;
    {
      const secondJavaScriptFilePath = path.join(base.getWorkingDirectoryPath(), ExtensionBuilder.javaScriptFileName);
      const secondManifest = secondBuilder.computeSimpleManifest(secondJavaScriptFilePath);
      const zip = new AdmZip();
      zip.addFile(path.basename(secondJavaScriptFilePath), fs.readFileSync(secondJavaScriptFilePath));
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(secondManifest), "utf8"));
      secondArchive = zip.toBuffer();
      await base.getExtensionController().update(secondBuilder.extensionId, secondArchive);
      await waitForExpect(() =>
      {
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(EventEntity.Extension + Notifier.delimiter + ExtensionEventAction.Updated, { id: manifest.id });
      });

      {
        // We attempt to update the extension with a faulty extension identifier
        const faultyExtensionId = `${secondBuilder.extensionId}.faulty`;
        await expect(async () =>
        {
          await base.getExtensionController().update(faultyExtensionId, secondArchive);
        }).rejects.toThrow(new ServiceError(`The parameter 'id' with value '${faultyExtensionId}' is invalid because the identifier '${secondBuilder.extensionId}' of the manifest 'manifest.json' does not match`, BAD_REQUEST, base.badParameterCode));
      }

      // We make sure that the previous version of the extension process is now over
      await firstBuilder.checkExtensionOver();
      await waitForExpect(async () =>
      {
        await secondBuilder.checkExtensionRunning();
      });
    }
    {
      // We pause the extension and make sure that when updating it, it is still paused
      await base.getExtensionController().pauseOrResume(extensionId, true);
      await base.getExtensionController().update(secondBuilder.extensionId, secondArchive);
      await secondBuilder.checkExtensionOver();
    }
  });

  test("synchronize", async () =>
  {
    const builder = new ExtensionBuilder();
    const repository = await builder.createRepository();
    const manifest = builder.computeStartedManifest();
    const zip = new AdmZip();
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    zip.addFile(ExtensionBuilder.startedJsFileName, Buffer.from(builder.computeStartedFileContent(), "utf8"));

    const tagsEventFilePath = path.join(builder.extensionDirectoryPath, "image.computeTags");
    const featuresEventFilePath = path.join(builder.extensionDirectoryPath, "image.computeFeatures");
    {
      // We install the extension and make sure that the event related to the features' computation is processed
      await base.getExtensionController().install(zip.toBuffer());
      await waitForExpect(() =>
      {
        expect(fs.existsSync(tagsEventFilePath)).toEqual(true);
        expect(fs.existsSync(featuresEventFilePath)).toEqual(true);
      });
      await base.getExtensionController().pauseOrResume(builder.extensionId, true);
      fs.rmSync(tagsEventFilePath);
      fs.rmSync(featuresEventFilePath);
    }

    await expect(async () =>
    {
      await base.getExtensionController().synchronize(manifest.id);
    }).rejects.toThrow(new ServiceError(`The parameter 'id' with value '${manifest.id}' is invalid because because the extension is paused`, BAD_REQUEST, base.badParameterCode));

    {
      // We make sure that no tags nor features' computation event is processed when the extension is paused
      await base.getRepositoryController().watch(repository.id, true);
      const newImageFilePath = base.imageFeeder.copyImage(repository.url.substring(fileWithProtocol.length), base.imageFeeder.jpegImageFileName);
      await base.waitUntilImage(repository.id, newImageFilePath, true);
      expect(fs.existsSync(tagsEventFilePath)).toEqual(false);
      expect(fs.existsSync(featuresEventFilePath)).toEqual(false);
    }
    {
      // We resume the extension, which synchronizes it, and we make sure that the tags and features' computation event is processed
      await base.getExtensionController().pauseOrResume(builder.extensionId, false);
      await waitForExpect(() =>
      {
        expect(fs.existsSync(tagsEventFilePath)).toEqual(true);
        expect(fs.existsSync(featuresEventFilePath)).toEqual(true);
      });
    }
    {
      // We remove the tags and features' computation event files, we pause the extension again, we set some tags and features, we resume the extension which causes it be synchronized, and we make sure that no features' computation event occurs
      fs.rmSync(tagsEventFilePath);
      fs.rmSync(featuresEventFilePath);
      await base.getExtensionController().pauseOrResume(builder.extensionId, true);
      const images = (await base.getImageController().search({})).entities;
      for (const image of images)
      {
        await base.getImageController().setTags(Base.allPolicyContext, image.id, manifest.id, ["tag"]);
        await base.getImageController().setFeatures(Base.allPolicyContext, image.id, manifest.id, [new ImageFeature(ImageFeatureType.OTHER, ImageFeatureFormat.STRING, undefined, "string")]);
      }
      await base.getExtensionController().pauseOrResume(builder.extensionId, false);
      await base.wait();
      expect(fs.existsSync(tagsEventFilePath)).toEqual(false);
      expect(fs.existsSync(featuresEventFilePath)).toEqual(false);
    }
  });

  test("runCapability", async () =>
  {
    const builder = new ExtensionBuilder();
    const manifest = builder.computeStartedManifest();
    const zip = new AdmZip();
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    zip.addFile(ExtensionBuilder.startedJsFileName, Buffer.from(builder.computeStartedFileContent(), "utf8"));
    await base.getExtensionController().install(zip.toBuffer());

    {
      const {
        extensionId,
        value: embeddings
      } = await base.getExtensionService().runCapability<number[]>(new ManifestCapability(ManifestCapabilityId.TextEmbeddings), { text: "some text" });
      expect(extensionId).toEqual(manifest.id);
      expect(embeddings.length).toEqual(512);
    }
    {
      await base.getExtensionController().pauseOrResume(manifest.id, true);
      const capabilityId = ManifestCapabilityId.TextEmbeddings;
      await expect(async () =>
      {
        await base.getExtensionService().runCapability<number[]>(new ManifestCapability(capabilityId), { text: "some text" });
      }).rejects.toThrow(new ServiceError(`Cannot operate because no extension with the capability id '${capabilityId}' is installed and enabled`, INTERNAL_SERVER_ERROR, base.internalErrorCode));
    }
    {
      const capabilityId = ManifestCapabilityId.ImageEmbeddings;
      await expect(async () =>
      {
        await base.getExtensionService().runCapability<number[]>(new ManifestCapability(capabilityId), { image: "dummy" });
      }).rejects.toThrow(new ServiceError(`The capability with id '${capabilityId}' is not supported`, INTERNAL_SERVER_ERROR, base.internalErrorCode));
    }
  });

  test("runProcessCommand", async () =>
  {
    const age = "age";
    const validCommand =
      {
        id: "askForSomething",
        on: { entity: CommandEntity.Process },
        parameters:
          {
            type: "object",
            properties:
              {
                [age]:
                  {
                    type: "integer",
                    title: "Age",
                    description: "What is your age?",
                    minimum: 1,
                    maximum: 128,
                    default: 35
                  }
              },
            required: [age]
          },
        specifications:
          [
            {
              locale: "en",
              label: "Asks for something from the user"
            }
          ]
      };
    const validCommandParameters = { [age]: 33 };
    const faultyCommandParameters = { [age]: "33" };
    const supernumeraryCommandParametersPropertyName = "supernumerary";
    const supernumeraryCommandParameters = {
      ...validCommandParameters,
      [supernumeraryCommandParametersPropertyName]: "property"
    };
    const expectedFaultyCommandParametersMessagePrefix = (faultyParameter: Record<string, any>) =>
    {
      return `The parameter 'parameters' with value '${JSON.stringify(faultyParameter)}' is invalid because it does not comply with the command with id '${validCommand.id}' expected parameters`;
    };
    const expectedFaultyCommandParametersMessage = `${expectedFaultyCommandParametersMessagePrefix(faultyCommandParameters)}. Reason: 'the entity at '/${age}' must be integer'`;
    const expectedIntentEventValue =
      {
        parameters:
          {
            type: "object",
            properties:
              {
                favoriteColor:
                  {
                    title: "Favorite Color",
                    description: "What is your favorite color?",
                    type: "string",
                    default: "pink"
                  },
                likeChocolate: { title: "Chocolate?", description: "Do you like chocolate?", type: "boolean" }
              },
            required: ["favoriteColor"],
            additionalProperties: false
          }
      };

    interface Case
    {

      readonly command: ManifestExtensionCommand;

      readonly validCommandParameters: Record<string, any>;

      readonly faultyCommandParameters?: Record<string, any>;

      readonly expectedFaultyCommandParametersMessage?: string;

      readonly intentParameters?: Record<string, any>;

      readonly expectedIntentEventValue?: Record<string, any>;

      readonly expectedIntentResult?: Record<string, any>;

    }

    const cases: Case[] =
      [
        {
          command: validCommand,
          validCommandParameters,
          faultyCommandParameters,
          expectedFaultyCommandParametersMessage,
          intentParameters:
            {
              value:
                {
                  favoriteColor: "yellow",
                  likeChocolate: true
                }
            },
          expectedIntentEventValue
        },
        {
          command: validCommand,
          validCommandParameters,
          faultyCommandParameters: supernumeraryCommandParameters,
          expectedFaultyCommandParametersMessage: `${expectedFaultyCommandParametersMessagePrefix(supernumeraryCommandParameters)}. Reason: 'the entity at '/' should not have the '${supernumeraryCommandParametersPropertyName}' property'`,
          intentParameters:
            {
              value:
                {
                  favoriteColor: "yellow",
                  likeChocolate: true
                }
            },
          expectedIntentEventValue
        },
        {
          command: validCommand,
          validCommandParameters,
          faultyCommandParameters,
          expectedFaultyCommandParametersMessage,
          intentParameters:
            {
              cancel: "Cancelled"
            },
          expectedIntentEventValue
        },
        {
          command: validCommand,
          validCommandParameters,
          faultyCommandParameters,
          expectedFaultyCommandParametersMessage,
          intentParameters:
            {
              error: "An error occurred"
            },
          expectedIntentEventValue
        },
        {
          command: validCommand,
          validCommandParameters,
          faultyCommandParameters,
          expectedFaultyCommandParametersMessage,
          intentParameters:
            {
              value: { faulty: "value" }
            },
          expectedIntentEventValue,
          expectedIntentResult:
            {
              error: "The intent returned value is not compliant with the JSON schema. Reason: 'the entity at '/' must have required property 'favoriteColor''"
            }
        },
        {
          command: validCommand,
          validCommandParameters,
          intentParameters:
            {
              badFormed: "result"
            },
          expectedIntentEventValue,
          expectedIntentResult:
            {
              error: "The intent should have been returned an object with either a 'value', 'cancel' or 'error' property"
            }
        },
        {
          command:
            {
              id: "malformedIntent",
              on: { entity: CommandEntity.Process },
              specifications:
                [
                  {
                    locale: "en",
                    label: "Triggers a faulty intent"
                  }
                ]
            },
          validCommandParameters: {},
          expectedIntentResult:
            {
              error: "The intent type is unknown"
            }
        },
        {
          command:
            {
              id: "faultyIntentParameters",
              on: { entity: CommandEntity.Process },
              specifications:
                [
                  {
                    locale: "en",
                    label: "Triggers a faulty intent"
                  }
                ]
            },
          validCommandParameters: {},
          expectedIntentResult:
            {
              error: "The intent is not compliant with the JSON schema. Reason: 'strict mode: unknown keyword: \"dummy\"'"
            }
        }
      ];

    for (const aCase of cases)
    {
      // We simulate a GUI master socket client
      const ioClient = io(paths.webServicesBaseUrl, { autoConnect: true, transports: ["websocket"] });
      let eventsCommand: Record<string, any> | undefined;
      try
      {
        ioClient.on(eventsChannelName, async (command: {
          channel: string,
          contextId: string,
          value: Record<string, any>
        }, onResult: (result: any) => void): Promise<void> =>
        {
          const { channel } = command;
          if (channel === "extension.intent")
          {
            eventsCommand = command;
            onResult(aCase.intentParameters);
          }
        });
        const apiKey = AuthenticationGuard.generateApiKey();
        AuthenticationGuard.masterApiKey = apiKey;
        ioClient.emit(connectionChannelName, { apiKey, isOpen: true });

        const builder = new ExtensionBuilder(undefined, undefined, randomUUID().substring(0, 32));
        const manifest = builder.computeStartedManifest(CommandEntity.Process, [aCase.command]);
        const zip = new AdmZip();
        zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
        zip.addFile(ExtensionBuilder.startedJsFileName, Buffer.from(builder.computeStartedFileContent(), "utf8"));
        await base.getExtensionController().install(zip.toBuffer());
        try
        {
          await waitForExpect(async () =>
          {
            expect((await base.getExtensionController().activities()).find((activity) =>
            {
              return activity.id === builder.extensionId;
            })?.kind).toEqual(ExtensionActivityKind.Connected);
          });
          const commandId = aCase.command.id;

          if (aCase.faultyCommandParameters !== undefined)
          {
            // We assess with faulty parameters
            await expect(async () =>
            {
              await base.getExtensionController().runProcessCommand(Base.allPolicyContext, manifest.id, commandId, aCase.faultyCommandParameters);
            }).rejects.toThrow(new ServiceError(aCase.expectedFaultyCommandParametersMessage!, BAD_REQUEST, base.badParameterCode));
          }
          const parameters = aCase.validCommandParameters;
          await base.getExtensionController().runProcessCommand(Base.allPolicyContext, manifest.id, commandId, parameters);
          const filePath = path.join(builder.extensionDirectoryPath, "process.runCommand");
          await waitForExpect(() =>
          {
            expect(fs.existsSync(filePath)).toEqual(true);
          });
          const receivedValue = JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }));
          expect(receivedValue).toEqual({ commandId, parameters });

          const intentResultFilePath = path.join(builder.extensionDirectoryPath, "intent.result");
          await waitForExpect(() =>
          {
            expect(fs.existsSync(intentResultFilePath)).toEqual(true);
          });
          const content = JSON.parse(fs.readFileSync(intentResultFilePath, { encoding: "utf8" }));
          expect(content.value).toEqual(aCase.expectedIntentResult ?? aCase.intentParameters);
          if (aCase.expectedIntentEventValue !== undefined)
          {
            expect(eventsCommand).toBeDefined();
            expect(eventsCommand?.contextId).toEqual(content.contextId);
            expect(eventsCommand?.milliseconds).toBeDefined();
            expect(eventsCommand?.value.id).toEqual(manifest.id);
            expect(eventsCommand?.value.intent).toEqual(aCase.expectedIntentEventValue);
          }
          else
          {
            expect(eventsCommand).toBeUndefined();
          }
        }
        finally
        {
          await base.getExtensionController().uninstall(manifest.id);
        }
      }
      finally
      {
        ioClient.close();
      }
    }
  });

  test("runImageCommand", async () =>
  {
    const builder = new ExtensionBuilder();
    const manifest = builder.computeStartedManifest();
    const zip = new AdmZip();
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    zip.addFile(ExtensionBuilder.startedJsFileName, Buffer.from(builder.computeStartedFileContent(), "utf8"));
    await base.getExtensionController().install(zip.toBuffer());
    await waitForExpect(async () =>
    {
      expect((await base.getExtensionController().activities()).find((activity) =>
      {
        return activity.id === builder.extensionId;
      })?.kind).toEqual(ExtensionActivityKind.Connected);
    });
    const { images } = await builder.createRepositoryAndGetImages();
    const image = images[0];
    const commandId = manifest.instructions[0].commands![0].id;

    {
      const commandId = "nonExistentCommandId";
      await expect(async () =>
      {
        await base.getExtensionController().runImageCommand(Base.allPolicyContext, manifest.id, commandId, undefined, [image.id]);
      }).rejects.toThrow(new ServiceError(`The parameter 'commandId' with value '${commandId}' is invalid because because the extension with id '${manifest.id}' has no command with id '${commandId}'`, BAD_REQUEST, base.badParameterCode));
    }
    {
      const imageId = "nonExistentImageId";
      await expect(async () =>
      {
        await base.getExtensionController().runImageCommand(Base.allPolicyContext, manifest.id, commandId, undefined, [imageId]);
      }).rejects.toThrow(new ServiceError(`The parameter 'imageIds' with value '[${imageId}]' is invalid because because one or more image do not exist`, BAD_REQUEST, base.badParameterCode));
    }
    {
      const imageIds = [image.id, images[1].id];
      await expect(async () =>
      {
        await base.getExtensionController().runImageCommand(Base.allPolicyContext, manifest.id, commandId, undefined, imageIds);
      }).rejects.toThrow(new ServiceError(`The parameter 'imageIds' with value '[${imageIds.join(", ")}]' is invalid because because the command with id '${commandId}' can only be run on a single image`, BAD_REQUEST, base.badParameterCode));
    }
    {
      const parameters = { key: "value" };
      await base.getExtensionController().runImageCommand(Base.allPolicyContext, manifest.id, commandId, parameters, [image.id]);
      const filePath = path.join(builder.extensionDirectoryPath, "image.runCommand");
      await waitForExpect(() =>
      {
        expect(fs.existsSync(filePath)).toEqual(true);
      });
      const receivedValue = JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }));
      expect(receivedValue).toEqual({ commandId, parameters, imageIds: [image.id] });
    }
  });

  test("throttling", async () =>
  {
    const builder = new ExtensionBuilder();
    const durationInMilliseconds = Core.fastestIntervalInMilliseconds * 20;
    const manifest = builder.computeStartedManifest(CommandEntity.Image, undefined, durationInMilliseconds);
    const zip = new AdmZip();
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    zip.addFile(ExtensionBuilder.startedJsFileName, Buffer.from(builder.computeStartedFileContent(), "utf8"));
    await base.getExtensionController().install(zip.toBuffer());
    await waitForExpect(async () =>
    {
      expect((await base.getExtensionController().activities()).find((activity) =>
      {
        return activity.id === builder.extensionId;
      })?.kind).toEqual(ExtensionActivityKind.Connected);
    });
    const { repository, images } = await builder.createRepositoryAndGetImages(true);
    const image = images[0];
    const commandId = manifest.instructions[0].commands![0].id;

    const precisionFactor = 0.90;
    let milliseconds: number = -1;
    for (let index = 0; index < 3; index++)
    {
      const parameters = { key: "value" };
      await base.getExtensionController().runImageCommand(Base.allPolicyContext, manifest.id, commandId, parameters, [image.id]);
      const filePath = path.join(builder.extensionDirectoryPath, "image.runCommand");
      await waitForExpect(() =>
      {
        expect(fs.existsSync(filePath)).toEqual(true);
      });
      const receivedValue = JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }));
      expect(receivedValue).toEqual({ commandId, parameters, imageIds: [image.id] });
      fs.rmSync(filePath);
      const now = Date.now();
      if (milliseconds !== -1)
      {
        expect(now - milliseconds).toBeGreaterThanOrEqual(durationInMilliseconds * precisionFactor);
      }
      milliseconds = now;
    }
    {
      // We create images and check that the events were properly throttled
      base.imageFeeder.copyImage(repository.getLocation().toFilePath(), base.imageFeeder.webpImageFileName);
      base.imageFeeder.copyImage(repository.getLocation().toFilePath(), base.imageFeeder.gifImageFileName);
      let fileNames: string[] = [];
      await waitForExpect(async () =>
      {
        fileNames = await new fdir().glob("**/image-*").crawl(builder.extensionDirectoryPath).withPromise();
        expect(fileNames.length).toEqual(4);
      });
      const millisecondsArray = fileNames.map(fileName => fs.lstatSync(path.join(builder.extensionDirectoryPath, fileName)).ctime.getTime()).sort((date1, date2) => date1 - date2);
      for (let index = 1; index < millisecondsArray.length; index++)
      {
        expect(millisecondsArray[index] - millisecondsArray[index - 1]).toBeGreaterThanOrEqual(durationInMilliseconds * precisionFactor);
      }
    }
  });

  test("list", async () =>
  {
    const extension1Name = "B";
    const extension2Name = "A";
    {
      const manifest = new ExtensionBuilder(false, undefined, "id2", extension1Name).computeSimpleManifest();
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await base.getExtensionController().install(zip.toBuffer());
    }
    {
      const manifest = new ExtensionBuilder(false, undefined, "id1", extension2Name).computeSimpleManifest();
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      await base.getExtensionController().install(zip.toBuffer());
    }
    const extensions = await base.getExtensionController().list();
    expect(extensions[0].manifest.name).toEqual(extension2Name);
    expect(extensions[1].manifest.name).toEqual(extension1Name);
    expect((await base.getExtensionController().get(extensions[0].manifest.id)).manifest).toEqual(extensions[0].manifest);
    expect((await base.getExtensionController().get(extensions[1].manifest.id)).manifest).toEqual(extensions[1].manifest);
  });

  test("getConfiguration", async () =>
  {
    const command2Id = "command2";
    const manifest2 = new ExtensionBuilder(false, undefined, "id2", "B").computeWithInstructionsManifest([
      {
        events: [ManifestEvent.ProcessStarted, ManifestEvent.ImageCreated, ManifestEvent.ImageUpdated, ManifestEvent.ImageDeleted, ManifestEvent.ImageComputeFeatures, ManifestEvent.ImageComputeEmbeddings, ManifestEvent.ImageRunCommand],
        capabilities: [{ id: ManifestCapabilityId.ImageEmbeddings }, { id: ManifestCapabilityId.ImageFeatures }],
        execution: ExtensionBuilder.dummyExecution,
        commands: [
          {
            id: command2Id,
            on: { entity: CommandEntity.Image },
            specifications: [{ locale: "en", label: "A dummy command" }]
          }
        ]
      }
    ]);
    {
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest2), "utf8"));
      await base.getExtensionController().install(zip.toBuffer());
    }
    const command1Id = "command1";
    const manifest1 = new ExtensionBuilder(false, undefined, "id1", "A").computeWithInstructionsManifest([
      {
        events: [ManifestEvent.ProcessStarted, ManifestEvent.ProcessRunCommand, ManifestEvent.ImageCreated, ManifestEvent.ImageUpdated, ManifestEvent.ImageDeleted, ManifestEvent.ImageComputeFeatures, ManifestEvent.ImageComputeEmbeddings, ManifestEvent.TextComputeEmbeddings],
        capabilities: [{ id: ManifestCapabilityId.ImageEmbeddings }, { id: ManifestCapabilityId.TextEmbeddings }],
        execution: ExtensionBuilder.dummyExecution,
        commands: [
          {
            id: command1Id,
            on: { entity: CommandEntity.Process },
            specifications: [{ locale: "en", label: "A dummy command" }]
          }
        ]
      }
    ]);
    {
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest1), "utf8"));
      await base.getExtensionController().install(zip.toBuffer());
    }
    const configuration = await base.getExtensionController().getConfiguration();
    expect(configuration.capabilities).toBeDefined();
    expect(configuration.capabilities.length).toEqual(3);
    expect(configuration.capabilities[0].capability.id).toEqual(ManifestCapabilityId.ImageEmbeddings);
    expect(configuration.capabilities[0].extensionIds).toEqual([manifest1.id, manifest2.id]);
    expect(configuration.capabilities[1].capability.id).toEqual(ManifestCapabilityId.ImageFeatures);
    expect(configuration.capabilities[1].extensionIds).toEqual([manifest2.id]);
    expect(configuration.capabilities[2].capability.id).toEqual(ManifestCapabilityId.TextEmbeddings);
    expect(configuration.capabilities[2].extensionIds).toEqual([manifest1.id]);
    expect(configuration.commands).toBeDefined();
    expect(configuration.commands.length).toEqual(2);
    expect(configuration.commands[0].extensionId).toEqual(manifest1.id);
    expect(configuration.commands[0].command.id).toEqual(command1Id);
    expect(configuration.commands[1].extensionId).toEqual(manifest2.id);
    expect(configuration.commands[1].command.id).toEqual(command2Id);
  });

  test("pause and resume", async () =>
  {
    const builder = new ExtensionBuilder();
    const manifest = builder.computeSimpleManifest();
    const zip = new AdmZip();
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    await testApiInstall(builder, manifest, zip.toBuffer(), async () =>
    {
      await builder.createRepository();
      await waitForExpect(async () =>
      {
        await builder.checkExtensionRunning();
      });
      await base.getExtensionController().pauseOrResume(manifest.id, true);
      await builder.checkExtensionOver();
      await base.getExtensionController().pauseOrResume(manifest.id, false);
      await waitForExpect(async () =>
      {
        await builder.checkExtensionRunning();
      });
    });

    // We pause the extension and make sure that it is not restarted
    await base.getExtensionController().pauseOrResume(manifest.id, true);
    await builder.checkExtensionOver();
    await base.restart();
    await base.wait(200);
    builder.checkStartedFileNotFound();
  }, base.largeTimeoutInMilliseconds);

  test("unpacked", async () =>
  {
    const builder = new ExtensionBuilder();
    const javaScriptFilePath = path.join(base.getWorkingDirectoryPath(), ExtensionBuilder.javaScriptFileName);
    const manifest = builder.computeSimpleManifest(javaScriptFilePath, true);
    const zip = new AdmZip();
    zip.addFile(path.basename(javaScriptFilePath), fs.readFileSync(javaScriptFilePath));
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));

    const directoryPath = base.prepareEmptyDirectory(manifest.id);
    zip.extractAllTo(directoryPath);
    await base.getExtensionService().registerUnpackedExtension(directoryPath, true);
    await waitForExpect(async () =>
    {
      await builder.checkExtensionRunning(true, false);
    });

    builder.deleteStartedFile();
    builder.checkStartedFileNotFound();
    // We touch the extension manifest file
    const now = new Date();
    fs.utimesSync(path.join(directoryPath, ExtensionRegistry.manifestFileName), now, now);
    // And we make sure that the extension process has been restarted
    await waitForExpect(async () =>
    {
      await builder.checkExtensionRunning(true, false);
    });

    builder.deleteStartedFile();
    builder.checkStartedFileNotFound();
    // We uninstall the extension
    await base.getExtensionService().uninstall(manifest.id);
    // And we make sure that the extension process does not restart
    await base.wait();
    builder.checkStartedFileNotFound();
  });

  test("settings", async () =>
  {
    const builder = new ExtensionBuilder();
    const key1 = "key1";
    const key2 = "key2";
    const key2SubKey = "subKey";
    const key3 = "key3";
    const manifest = builder.computeWithInstructionsManifest([
      {
        events: [ManifestEvent.ProcessStarted],
        capabilities: [],
        execution: ExtensionBuilder.dummyExecution
      }
    ], undefined, undefined, undefined, {
      type: "object",
      properties: {
        [key1]: { type: "string" },
        [key2]: { type: "object", properties: { [key2SubKey]: { type: "number" } }, required: [key2SubKey] },
        [key3]: { type: "boolean" }
      },
      required: [key1, key2]
    });
    const zip = new AdmZip();
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    await testApiInstall(builder, manifest, zip.toBuffer(), async () =>
    {
      const listener = base.computeEventListener();
      base.getNotifier().on(EventEntity.Extension, ExtensionEventAction.Settings, undefined, listener);
      const value = { [key1]: "value1", [key2]: { [key2SubKey]: 12.345 } };
      await base.getExtensionController().setSettings(Base.allPolicyContext, manifest.id, new ExtensionSettings(value));
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(EventEntity.Extension + Notifier.delimiter + ExtensionEventAction.Settings, {
        id: manifest.id,
        value
      }, manifest.id);
      expect((await base.getExtensionController().getSettings(Base.allPolicyContext, manifest.id)).value).toEqual(value);

      // We test faulty parameters
      {
        interface Case
        {
          value: Object,
          reason: string
        }

        const cases: Case[] =
          [
            { value: {}, reason: `the entity at '/' must have required property '${key1}'` },
            { value: { [key1]: "value1" }, reason: `the entity at '/' must have required property '${key2}'` },
            {
              value: { [key1]: "value1", [key2]: {} },
              reason: `the entity at '/${key2}' must have required property '${key2SubKey}'`
            },
            {
              value: { [key1]: "value1", [key2]: { [key2SubKey]: "value" } },
              reason: `the entity at '/${key2}/${key2SubKey}' must be number`
            },
            {
              value: { [key1]: "value1", [key2]: { [key2SubKey]: 1.23 }, [key3]: "value" },
              reason: `the entity at '/${key3}' must be boolean`
            }
          ];
        for (const aCase of cases)
        {
          await expect(async () =>
          {
            await base.getExtensionController().setSettings(Base.allPolicyContext, manifest.id, new ExtensionSettings(aCase.value));
          }).rejects.toThrow(new ServiceError(`The parameter 'settings' with value '{"value":${JSON.stringify(aCase.value)}}' is invalid because because it does not comply with the settings JSON schema. Reason: '` + aCase.reason + "'", BAD_REQUEST, base.badParameterCode));
        }
      }
    });
  });

  test("built-in", async () =>
  {
    const builtInExtensionsDirectoryPath = path.join(base.getWorkingDirectoryPath(), "built-in");
    fs.mkdirSync(builtInExtensionsDirectoryPath);

    const extensionId = "built-in";
    const upgradeBuiltInExtension = async (version: string, expectedStartedFilePath?: string): Promise<string> =>
    {
      const builder = new ExtensionBuilder(undefined, version, extensionId, undefined, version);
      const manifest = builder.computeSimpleManifest();
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      fs.writeFileSync(path.join(base.getWorkingDirectoryPath(), "built-in", manifest.id + ".zip"), zip.toBuffer());

      paths.builtInExtensionsDirectoryPath = builtInExtensionsDirectoryPath;
      await base.restart();
      await waitForExpect(() =>
      {
        expect(fs.existsSync(expectedStartedFilePath ?? builder.startedFilePath)).toEqual(true);
      });
      return builder.startedFilePath;
    };

    await upgradeBuiltInExtension("1.0.0");
    const filePath = await upgradeBuiltInExtension("1.0.1");
    await upgradeBuiltInExtension("0.9.0", filePath);
  });

  test.each([ManifestRuntimeEnvironment.Node, ManifestRuntimeEnvironment.Python])("getSdkInfo for %p environment", async (environment: ManifestRuntimeEnvironment) =>
  {
    const directoryPath = base.prepareEmptyDirectory("sdk");
    paths.sdkDirectoryPath = directoryPath;
    let sdkVersion: string;
    let sdkFilePath: string;
    switch (environment)
    {
      case ManifestRuntimeEnvironment.Python:
        sdkVersion = "0.1.2";
        sdkFilePath = path.join(directoryPath, "python", `xxx-${sdkVersion}.tar.gz`);
        break;
      case ManifestRuntimeEnvironment.Node:
        sdkVersion = "0.3.4";
        sdkFilePath = path.join(directoryPath, "typescript", `xxx-${sdkVersion}.tgz`);
        break;
    }
    fs.mkdirSync(path.join(sdkFilePath, ".."), { recursive: true });
    fs.writeFileSync(sdkFilePath, "");
    expect((await ExtensionRegistry.getSdkInfo(environment)).version).toEqual(sdkVersion);
  }, base.xLargeTimeoutInMilliseconds);

  test.each([ManifestRuntimeEnvironment.Node, ManifestRuntimeEnvironment.Python])("ExtensionGenerator for %p environment", async (environment: ManifestRuntimeEnvironment) =>
  {
    base.setSdkDirectoryPath();
    const extensionsDirectoryPath = path.join(base.getWorkingDirectoryPath(), `generated-${environment}`);
    const options: ExtensionGenerationOptions =
      {
        id: `${randomUUID()}`.substring(0, 32),
        version: ExtensionGenerator.version,
        name: "name",
        description: "description",
        author: "author",
        environment
      };
    const directoryPath = await new ExtensionGenerator().run(extensionsDirectoryPath, options, false);
    const manifestFilePath = path.join(directoryPath, "manifest.json");
    expect(fs.existsSync(manifestFilePath)).toEqual(true);
    const manifest = base.getModuleProvider(ExtensionRegistry).parseManifest(manifestFilePath);
    expect(manifest.id).toBe(options.id);
    expect(manifest.name).toBe(options.name);
    expect(manifest.version).toBe(ExtensionGenerator.version);
    expect(manifest.description).toBe(options.description);
  });

  test.each(fastCartesian([[ManifestRuntimeEnvironment.Node, ManifestRuntimeEnvironment.Python], [false, true]]))("generate for %p environment with public SDK=%p", async (environment: ManifestRuntimeEnvironment, withPublicSdk: boolean) =>
  {
    base.setSdkDirectoryPath();
    const options =
      {
        id: `id-${environment}`,
        name: "name",
        version: "1.0.0",
        author: "author",
        description: "description",
        environment
      };
    const streamableFile = await base.getExtensionController().generate(withPublicSdk, options);
    const zipBuffer = await buffer(streamableFile.getStream());
    const zip = new AdmZip(zipBuffer);
    {
      const entry = zip.getEntries().find((entry: AdmZip.IZipEntry) =>
      {
        return entry.entryName === ExtensionRegistry.manifestFileName;
      });
      expect(entry).toBeDefined();
      const manifest: Manifest = JSON.parse(entry!.getData().toString("utf8"));
      expect(manifest.id).toBe(options.id);
      expect(manifest.name).toBe(options.name);
      expect(manifest.version).toBe(ExtensionGenerator.version);
      expect(manifest.description).toBe(options.description);
    }
    const sdkVersion = (await ExtensionRegistry.getSdkInfo(environment)).version;
    const findArchiveEntry = (fileName: string): AdmZip.IZipEntry | undefined =>
    {
      return zip.getEntries().find((entry: AdmZip.IZipEntry) =>
      {
        return entry.entryName === fileName;
      });
    };
    const internalSdkToken = "internal-";
    switch (environment)
    {
      case ManifestRuntimeEnvironment.Node:
      {
        const entry = findArchiveEntry("package.json");
        expect(entry).toBeDefined();
        expect(JSON.parse(entry!.getData().toString("utf8"))["dependencies"]).toEqual({ [`@picteus/${withPublicSdk === false ? internalSdkToken : ""}extension-sdk`]: `${sdkVersion}` });
      }
        break;
      case ManifestRuntimeEnvironment.Python:
      {
        const entry = findArchiveEntry("requirements.txt");
        expect(entry).toBeDefined();
        expect(entry!.getData().toString("utf8").trim()).toBe(`picteus-${withPublicSdk === false ? internalSdkToken : ""}extension-sdk${withPublicSdk === false ? "" : ` == ${sdkVersion}`}`);
      }
        break;
    }
    const builder = new ExtensionBuilder(false, undefined, options.id, options.name, options.version);
    const extension = await base.getExtensionController().install(zipBuffer);
    expect(extension.manifest.id).toEqual(options.id);
    await builder.waitUntilExtensionInstalled();
    builder.checkExtensionProcessStarted();
  }, base.xxLargeTimeoutInMilliseconds);

  test.each(fastCartesian([[ManifestRuntimeEnvironment.Node, ManifestRuntimeEnvironment.Python], [false, true]]))("build for %p environment with public SDK=%p", async (environment: ManifestRuntimeEnvironment, withPublicSdk: boolean) =>
  {
    base.setSdkDirectoryPath();
    const options =
      {
        id: `id-${environment}`,
        name: "name",
        version: "1.0.0",
        author: "author",
        description: "description",
        environment
      };
    const generatedStreamableFile = await base.getExtensionController().generate(withPublicSdk, options);
    if (environment === ManifestRuntimeEnvironment.Node && withPublicSdk === false)
    {
      // We assess with a too-large archive
      await expect(async () =>
      {
        await base.getExtensionController().build(Buffer.from(Array(8 * 1024 * 1024 + 1).fill(0)));
      }).rejects.toThrow(new ServiceError("The provided extension archive exceeds the maximum allowed binary weight of 8388608 bytes", BAD_REQUEST, base.badParameterCode));
    }
    const builtStreamableFile = await base.getExtensionController().build(await buffer(generatedStreamableFile.getStream()));
    expect(builtStreamableFile.getHeaders().type).toEqual(environment === ManifestRuntimeEnvironment.Node ? applicationXGzipMimeType : types.zip);
    expect(builtStreamableFile.getHeaders().disposition).toEqual(computeAttachmentDisposition(`${options.id}-${options.version}.${environment === ManifestRuntimeEnvironment.Node ? "tgz" : "zip"}`));

    const builder = new ExtensionBuilder(false, undefined, options.id, options.name, options.version);
    const builtBuffer = await buffer(builtStreamableFile.getStream());
    const extension = await base.getExtensionController().install(builtBuffer);
    expect(extension.manifest.id).toEqual(options.id);
    await builder.waitUntilExtensionInstalled();
    builder.checkExtensionProcessStarted();
    await base.wait();
    await builder.checkExtensionRunning(false, false);
  }, base.xxLargeTimeoutInMilliseconds);

  // TODO: add a test for Python
  test("sdk", async () =>
  {
    base.setSdkDirectoryPath();
    const options =
      {
        id: "id",
        name: "name",
        version: "1.0.0",
        author: "author",
        description: "description",
        environment: ManifestRuntimeEnvironment.Node
      };
    const generatedStreamableFile = await base.getExtensionController().generate(false, options);
    const generatedDirectoryPath = path.join(base.getWorkingDirectoryPath(), "generated");
    new AdmZip(await buffer(generatedStreamableFile.getStream())).extractAllTo(generatedDirectoryPath);
    // We replace the generated main file with a custom one to test the SDK
    fs.copyFileSync(path.join(Base.directoryPath, "extensions", "node", "main.ts"), path.join(generatedDirectoryPath, "src", "main.ts"));
    const zip = new AdmZip();
    zip.addLocalFolder(generatedDirectoryPath);
    const zipBuffer = zip.toBuffer();

    const builtStreamableFile = await base.getExtensionController().build(zipBuffer);
    const extension = await base.getExtensionController().install(await buffer(builtStreamableFile.getStream()));
    const manifest = extension.manifest;
    const builder = new ExtensionBuilder(false, undefined, manifest.id, manifest.name, manifest.version);
    await builder.checkExtensionRunning(false, false);
    const waitForEvent = async (event: string): Promise<Record<string, any> | undefined> =>
    {
      const blotterFilePath = path.join(paths.installedExtensionsDirectoryPath, manifest.id, "blotter.json");
      return new Promise<Record<string, any> | undefined>((resolve) =>
      {
        base.waitUntil(async () =>
        {
          if (fs.existsSync(blotterFilePath) === true)
          {
            const entry = JSON.parse(fs.readFileSync(blotterFilePath, { encoding: "utf8" })).find((entry: Record<string, any>) => entry.id === event);
            if (entry !== undefined)
            {
              resolve(entry.value);
            }
            return entry !== undefined;
          }
          return false;
        });
      });
    };
    await waitForEvent("initialize");
    await waitForEvent("onReady");
    await base.getExtensionService().setSettings(manifest.id, new ExtensionSettings({ parameter: "value" }));
    await waitForEvent("onSettings");

    const { image } = await base.prepareRepositoryWithImage(base.imageFeeder.jpegImageFileName);
    // We send an image command to check that the throttling bottleneck keeps not waiting for a socket response coming from the extension
    await base.getExtensionController().runImageCommand(Base.allPolicyContext, manifest.id, "logDimensions", undefined, [image.id]);
    await base.getExtensionService().pauseOrResume(manifest.id, true);
    if (process.platform !== "win32")
    {
      // Because there is no mechanism on Windows for stopping gracefully the process
      await waitForEvent("onTerminate");
    }
  }, base.xxLargeTimeoutInMilliseconds);

  test("events", async () =>
  {
    const ioClient = io(paths.webServicesBaseUrl, { autoConnect: true, transports: ["websocket"] });

    type TypeOfMessage =
      {
        channel: string,
        contextId: string,
        milliseconds: number,
        value: object
      };
    const listener = jest.fn((_message: TypeOfMessage): Promise<void> =>
    {
      return Promise.resolve();
    });
    ioClient.on(eventsChannelName, listener);
    await new Promise<void>((resolve) =>
    {
      ioClient.on(connectChannelName, () =>
      {
        resolve();
      });
    });
    const apiKey = AuthenticationGuard.generateApiKey();
    AuthenticationGuard.masterApiKey = apiKey;
    ioClient.emit(connectionChannelName, { apiKey, isOpen: true });
    const initialEventsCount = 11;

    try
    {
      const builder = new ExtensionBuilder();
      const manifest = builder.computeStartedManifest();
      const zip = new AdmZip();
      zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
      zip.addFile(ExtensionBuilder.startedJsFileName, Buffer.from(builder.computeStartedFileContent(), "utf8"));
      await base.getExtensionController().install(zip.toBuffer());

      const repository = await builder.createRepository();
      await base.getRepositoryController().watch(repository.id, true);
      await base.waitUntilRepositoryWatching(repository.id);
      await waitForExpect(() =>
      {
        expect(fs.existsSync(path.join(builder.extensionDirectoryPath, "image.created"))).toEqual(true);
      });

      const summary = (await base.getRepositoryController().searchImages(repository.id, {})).entities[0];

      const now = new Date();
      const filePath = summary.url.substring(fileWithProtocol.length);
      const timestampInSeconds = now.getTime() / 1_000;
      fs.utimesSync(filePath, timestampInSeconds, timestampInSeconds);
      await waitForExpect(() =>
      {
        expect(fs.existsSync(path.join(builder.extensionDirectoryPath, "image.updated"))).toEqual(true);
      });

      const expectEvent = (callTimes: number, channel: string, value: Record<string, any>) =>
      {
        expect(listener).toHaveBeenCalledTimes(callTimes);
        for (let index = 0; index < listener.mock.calls.length; index++)
        {
          const call = listener.mock.calls[index];
          const mockArguments: TypeOfMessage = call[0];
          if (mockArguments.channel === channel)
          {
            expect(mockArguments.value).toEqual(value);
            expect(mockArguments.contextId).toBeDefined();
            return;
          }
        }
        throw new Error(`The '${channel}' event did not occur`);
      };

      {
        expectEvent(initialEventsCount, EventEntity.Extension + Notifier.delimiter + ExtensionEventAction.Log, {
          id: manifest.id,
          message: { message: "message", level: "info" }
        });
      }

      fs.rmSync(filePath);
      await waitForExpect(() =>
      {
        expect(fs.existsSync(path.join(builder.extensionDirectoryPath, "image.deleted"))).toEqual(true);
      });

      await base.getExtensionController().pauseOrResume(manifest.id, true);
      await waitForExpect(() =>
      {
        expectEvent(initialEventsCount + 3, EventEntity.Extension + Notifier.delimiter + ExtensionEventAction.Paused, { id: manifest.id });
      });

      await base.getExtensionController().pauseOrResume(manifest.id, false);
      await waitForExpect(() =>
      {
        expectEvent(initialEventsCount + 7, EventEntity.Extension + Notifier.delimiter + ExtensionEventAction.Resumed, { id: manifest.id });
      });
    }
    finally
    {
      ioClient.close();
    }
  });

  async function testApiInstall(builder: ExtensionBuilder, manifest: Manifest, archive: Buffer, callback?: () => Promise<void>, checkStarted: boolean = true): Promise<void>
  {
    const extension = await base.getExtensionController().install(archive);
    expect(extension.manifest.id).toEqual(manifest.id);
    await builder.waitUntilExtensionInstalled();
    if (checkStarted === true)
    {
      builder.checkExtensionProcessStarted();
    }
    await checkIcon(extension);

    if (callback === undefined)
    {
      await builder.createRepository();
      await waitForExpect(async () =>
      {
        await builder.checkExtensionRunning();
      });
      await base.terminate();
      await builder.checkExtensionOver();
    }
    else
    {
      await callback();
    }
  }

  async function buildCompressedTarball(entries: { name: string; content: Buffer }[]): Promise<Buffer>
  {
    return await new Promise<Buffer>((resolve, reject) =>
    {
      class BufferWritableStream extends Stream.Writable
      {

        private chunks: Buffer[] = [];

        constructor()
        {
          super();
        }

        _write(chunk: Buffer, _encoding: string, callback: Function): void
        {
          this.chunks.push(chunk);
          callback();
        }

        getBuffer(): Buffer
        {
          return Buffer.concat(this.chunks);
        }

      }

      const pack = tarStream.pack();
      const gzip = zlib.createGzip();
      const output = new BufferWritableStream();
      output.on("finish", () =>
      {
        resolve(output.getBuffer());
      });
      output.on("error", reject);
      entries.forEach(entry =>
      {
        pack.entry({ name: entry.name }, entry.content);
      });
      pack.finalize();
      pack.pipe(gzip).pipe(output);
    });
  }

  async function checkIcon(extension: Extension)
  {
    const response = await fetch(`${paths.webServicesBaseUrl}/ui/${extension.manifest.id}/icon.png`);
    const blob = await response.blob();
    expect(blob.type).toEqual("image/png");
    const buffer = Buffer.from((await blob.arrayBuffer()));
    const metadata = await readMetadata(buffer);
    expect(metadata.width).toEqual(24);
    expect(metadata.height).toEqual(24);
    expect(metadata.format).toEqual("PNG");
  }

});
