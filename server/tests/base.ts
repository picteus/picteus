import path, { dirname } from "node:path";
import fs from "node:fs";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import Timers from "node:timers";

import { expect, jest } from "@jest/globals";
import { pickPort } from "pick-port";
import AdmZip from "adm-zip";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { logger } from "../src/logger";
import { paths } from "../src/paths";
import { stringify } from "../src/utils";
import {
  AdministrationController,
  ApiSecretController,
  ExtensionController,
  ImageAttachmentController,
  ImageController,
  RepositoryController
} from "../src/controllers/app.controllers";
import {
  EntitiesProvider,
  ExtensionRegistry,
  SearchService,
  VectorDatabaseAccessor
} from "../src/services/app.service";
import { MainModule } from "../src/app.module";
import {
  Extension,
  fileWithProtocol,
  Image,
  ImageFormat,
  ImageSummary,
  Manifest,
  ManifestCapability,
  ManifestEvent,
  ManifestExtensionCommand,
  ManifestRuntimeEnvironment,
  Repository,
  RepositoryActivityKind,
  RepositoryLocationType,
  RepositoryStatus
} from "../src/dtos/app.dtos";
import { EventEntity, ExtensionEventProcess, Notifier, RepositoryEventAction } from "../src/notifier";
import { writeMetadata } from "../src/services/utils/images";
import { ExtensionService } from "../src/services/extensionServices";
import { Type } from "@nestjs/common/interfaces";
import { ApiScope } from "../src/app.guards";


let directoryPath: string;
try
{
  directoryPath = dirname(fileURLToPath(import.meta.url));
}
catch (error)
{
  // This is expected when the runtime uses CommonJS
  directoryPath = __dirname;
}
const rootDirectoryPath = path.resolve(path.join(directoryPath, "..", ".."));
const buildServerDirectoryPath = path.join(rootDirectoryPath, "build", "server");
const nodePathEnvironmentVariableName = "NODE_PATH";
const nodePathEnvironmentVariableValue = process.env[nodePathEnvironmentVariableName];
logger.info(`\n+++++\nRunning the tests with ` + (nodePathEnvironmentVariableValue === undefined ? `no '${nodePathEnvironmentVariableName} environment variable set'` : `the '${nodePathEnvironmentVariableName}' environment variable set to '${nodePathEnvironmentVariableValue}'\n+++++`));
{
  // We fix an issue with the "NODE_PATH" environment variable which is not taken into account when using the Node.js "--experimental-vm-modules" option
  const serverBuildNodeModulesDirectoryPath = path.join(buildServerDirectoryPath, "node_modules");
  if (nodePathEnvironmentVariableValue !== undefined && fs.existsSync(serverBuildNodeModulesDirectoryPath) === false)
  {
    const tokens = nodePathEnvironmentVariableValue.split(path.delimiter);
    const nodePath = path.resolve(tokens[tokens.length - 1]);
    logger.warn(`Creating a symbolic link to fix the '${nodePathEnvironmentVariableName}' environment variable from '${nodePath}' to '${serverBuildNodeModulesDirectoryPath}'`);
    fs.symlinkSync(nodePath, serverBuildNodeModulesDirectoryPath, "dir");
  }
}
paths.workersDirectoryPath = path.join(buildServerDirectoryPath, "src", "workers");

export class Defaults
{
  static readonly locationType = RepositoryLocationType.File;
  static readonly repositoryName = "name";
  static readonly emptyDirectoryName = "empty";
}

export class ImageFeeder
{

  readonly imagesDirectoryPath = path.resolve(path.join(Base.rootDirectoryPath, "server", "tests", "images"));

  readonly pngImageFileName = "Dali.png";

  readonly jpegImageFileName = "Pieta.jpeg";

  readonly webpImageFileName = "Hallucination Partielle.webp";

  readonly gifImageFileName = "Montres molles.gif";

  readonly avifFileName = "parrot.avif";

  readonly heifFileName = "rock.heif";

  getImageFilePath(imageFileName: string): string
  {
    return path.join(this.imagesDirectoryPath, imageFileName);
  }

  readImage(imageFileName: string): Buffer
  {
    return fs.readFileSync(this.getImageFilePath(imageFileName));
  }

  copyImage(directoryPath: string, imageFileName: string): string
  {
    const imageFilePath = path.join(directoryPath, imageFileName);
    this.duplicateImage(path.join(this.imagesDirectoryPath, imageFileName), imageFilePath);
    return imageFilePath;
  }

  duplicateImage(sourceFilePath: string, destinationFilePath: string): void
  {
    fs.copyFileSync(sourceFilePath, destinationFilePath);
  }

  async prepareAutomatic1111Image(filePath: string): Promise<string>
  {
    this.duplicateImage(path.join(this.imagesDirectoryPath, this.pngImageFileName), filePath);
    const userComment = "anime, Futuristic utopia, Adventure, Aether, Kraken, Car, Nebula, Verdant, Canvas, Spontaneous Human Combustion, Voyage, Lovely, Grateful [:vintage cars:15], (Double exposure:1.3) photo of a noble lady made of mosaic of iridescent crystal glass with sub scattering mirror surface imposing onto transparent tree hollow trunk in living brocade underbust dress made out of flowers, bokeh sky by Peter Gric, Conrad Roset, Brandon Kidwell, Andreas Lie, Dan Mountford, Dan Witz, Agnes Cecile, Jeremy Mann, fine art, super dramatic moonshine, silhouette photo illustration, amazing depth, intricate detailed fine cracked surface, stunning atmosphere, mesmerizing whimsical vibrant scenery, complex masterwork by head of prompt engineering, black humanoid made of diamonds, upper body, bare-chested, male, ((masterpiece, best quality)), ultra detail, glass skin, white electricity coming through cracks, muscular male, (dragonborn:0.6), 8k Glitch art of a Nautical Woman, at Cityscape, split diopter, Weirdcore, F/2.8, (art by Chris Friel:1.0), white hair, outdoors, detailed background, (Anime Rage pose), (Cracked Skin:1.4), anime style, realistic, photorealistic, white hair, purple eyes, (((sexy school uniform))), wearing a stylish very sexy school uniform, with a funny expression on her face, Hellwalker, incoming death, hell, black bloody veins growing and intertwining out of the darkness, oozing thick yellow blood, veins growing and pumping blood, (female body:1.3), vascular networks growing, connecting, expanding, red veins everywhere, zdzislaw beksinski, (sharp colors:1.3), (rainbow skin:1.1), (Infrared:1.2), ultra detailed, intricate, oil on canvas, ((dry brush, ultra sharp)), (surrealism:1.4), (disturbing:1.5), beksinski style painting, satanic symbols, (full torso), full body in frame, centered body, (male:1.2), realistic, ((intricate details)), (pale gothic evil king), dynamic pose, perfect face, (realistic eyes), perfect eyes, ((dark gothic background)), sharp focus\nNegative prompt: bad quality, bad anatomy, worst quality, low quality, low resolution, extra fingers, blur, blurry, ugly, wrong proportions, watermark, image artifacts, lowres, ugly, jpeg artifacts, deformed, noisy\nSteps: 7, Sampler: DPM++ SDE Karras, CFG scale: 4, Seed: 376120860, Size: 768x1216, Model hash: 250e13115b, Model: DreamShaperXL_Turbo_5_00001_, Denoising strength: 0.55, ADetailer model: face_yolov8n.pt, ADetailer confidence: 0.3, ADetailer dilate/erode: 4, ADetailer mask blur: 4, ADetailer denoising strength: 0.4, ADetailer inpaint only masked: True, ADetailer inpaint padding: 32, ADetailer version: 23.10.1, Hires upscale: 1.4, Hires steps: 15, Hires upscaler: Latent (bicubic antialiased), Version: v1.6.0-2-g4afaaf8a";
    const metadata =
      {
        userComment
      };
    await this.writeImageMetadata(filePath, ImageFormat.PNG, metadata);
    return userComment;
  }

  async prepareMidjourneyImage(filePath: string): Promise<Record<string, any>>
  {
    this.duplicateImage(path.join(this.imagesDirectoryPath, this.pngImageFileName), filePath);
    const string = `{"ImageWidth":960,"ImageHeight":1200,"BitDepth":8,"ColorType":"RGB","Compression":"Deflate/Inflate","Filter":"Adaptive","Interlace":"Noninterlaced","Creation Time":"Thu, 20 Jun 2024 22:50:03 GMT","Author":"Grand Daron","Description":"https://s.mj.run/jhiJzyVBla8 Editorial fashion, photo by Tim Walker, Biomechatronic Chanel girl model within shimmering platinum fluid in code, made of fusion of antimatter, binary code, transistor, microphone, hard drive, static, fiber optics, in designer fashion style --chaos 16 --ar 4:5 --sref 4169606994 --personalize yfbxsj7 Job ID: d95be554-d446-4c51-ad75-e00d9f9bbb35","DigImageGUID":"d95be554-d446-4c51-ad75-e00d9f9bbb35","DigitalSourceType":"https://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"}`;
    const metadata = JSON.parse(string);
    await this.writeImageMetadata(filePath, ImageFormat.PNG, metadata);
    return metadata;
  }

  async prepareComfyUiImage(filePath: string): Promise<{ prompt: Record<string, any>; workflow: Record<string, any>; }>
  {
    this.duplicateImage(path.join(this.imagesDirectoryPath, this.pngImageFileName), filePath);
    const prompt = { 1: { inputs: [{ title: "Super node" }] } };
    const workflow = { nodes: [{ id: 1, type: "Super workflow" }] };
    const metadata =
      {
        prompt: JSON.stringify(prompt),
        workflow: JSON.stringify(workflow)
      };
    await this.writeImageMetadata(filePath, ImageFormat.PNG, metadata);
    return { prompt, workflow };
  }

  async writeImageMetadata(filePath: string, imageFormat: ImageFormat, metadata: Record<string, string>): Promise<void>
  {
    const buffer = await writeMetadata(filePath, imageFormat, metadata);
    fs.writeFileSync(filePath, buffer);
  }

}

export class Core
{

  static readonly directoryPath: string = directoryPath;

  static readonly rootDirectoryPath: string = rootDirectoryPath;

  private static readonly timeoutPlatformFactor: number = (process.platform === "win32" ? 1.5 : 1);

  static readonly beforeAfterTimeoutInMilliseconds: number = Math.round((10 * 1_000) * Core.timeoutPlatformFactor);

  static readonly defaultTimeoutInMilliseconds: number = Math.round((13 * 1_000) * Core.timeoutPlatformFactor);

  readonly largeTimeoutInMilliseconds: number = Math.round(Core.defaultTimeoutInMilliseconds * 1.5);

  readonly xLargeTimeoutInMilliseconds: number = Math.round(this.largeTimeoutInMilliseconds * 2);

  readonly xxLargeTimeoutInMilliseconds: number = Math.round(this.largeTimeoutInMilliseconds * 4);

  static readonly fastestIntervalInMilliseconds: number = 1_000 / 60;

  protected readonly checkingIntervalInMilliseconds: number = 100;

  private workingDirectoryPath?: string;

  protected intervals: NodeJS.Timeout[] = [];

  static async beforeAll(): Promise<void>
  {
  }

  static async afterAll(): Promise<void>
  {
  }

  async beforeEach(): Promise<void>
  {
    logger.info(`\n---\nRunning the '${expect.getState().currentTestName}' test\n---`);
    this.workingDirectoryPath = path.join(path.resolve(path.join(Core.rootDirectoryPath, "tmp")), `test-${randomUUID()}`);
    fs.mkdirSync(this.workingDirectoryPath, { recursive: true });
    logger.debug(`Using the working directory with path '${this.workingDirectoryPath}'`);
  }

  async afterEach(): Promise<void>
  {
    logger.debug(`\n---\nCleaning up the '${expect.getState().currentTestName}' test\n---`);
    for (const interval of this.intervals)
    {
      Timers.clearInterval(interval);
    }
    this.intervals.length = 0;
    await this.onAfterEach();
    if (fs.existsSync(this.getWorkingDirectoryPath()) === true)
    {
      logger.debug(`Deleting the working directory '${this.getWorkingDirectoryPath()}'`);
      // We allow retrying the removal of the directory a few times in case the OS still locks some files
      try
      {
        fs.rmSync(this.getWorkingDirectoryPath(), { recursive: true, force: true, maxRetries: 3, retryDelay: 1_000 });
      }
      catch (error)
      {
        logger.warn(`Could not delete the working directory '${this.getWorkingDirectoryPath()}'. Reason: ${(error as Error).message}`);
      }
    }
  }

  protected async onAfterEach()
  {
  }

  getWorkingDirectoryPath(): string
  {
    return this.workingDirectoryPath!;
  }

  prepareEmptyDirectory(directoryName: string, parentDirectoryPath?: string): string
  {
    const directoryPath = path.join(parentDirectoryPath ?? this.getWorkingDirectoryPath(), directoryName);
    if (fs.existsSync(directoryPath) === true)
    {
      fs.rmSync(directoryPath, { recursive: true, force: true });
    }
    fs.mkdirSync(directoryPath, { recursive: true });
    return directoryPath;
  }

  async waitUntil(checkFunction: () => Promise<boolean>, intervalInMilliseconds: number = this.checkingIntervalInMilliseconds): Promise<void>
  {
    await new Promise<void>((resolve) =>
    {
      const interval = Timers.setInterval(async () =>
      {
        const shouldStopWaiting = await checkFunction();
        if (shouldStopWaiting === true)
        {
          Timers.clearInterval(interval);
          resolve();
        }
      }, intervalInMilliseconds);
      this.intervals.push(interval);
    });
  }

  async wait(durationInMilliseconds?: number): Promise<void>
  {
    await new Promise((resolve) =>
    {
      Timers.setTimeout(resolve, durationInMilliseconds === undefined ? this.checkingIntervalInMilliseconds : durationInMilliseconds);
    });
  }

  computeProcessJavaScriptCode(startedFilePath: string, writeStartedFileOnlyOnce: boolean = true, signalFilePath: string | undefined = undefined, willNotRespondToTermination: boolean = false, frequencyInMilliseconds: number = Core.fastestIntervalInMilliseconds, delayAfterTerminationSignalToExitInMilliseconds: number = Core.fastestIntervalInMilliseconds, environmentVariable: string | undefined = undefined): string
  {
    function fixPath(nodePath: string | undefined): string | undefined
    {
      return nodePath === undefined ? undefined : (process.platform === "win32" ? nodePath.replaceAll(/\\/g, "\\\\") : nodePath);
    }

    const signal: NodeJS.Signals = "SIGTERM";
    startedFilePath = fixPath(startedFilePath)!;
    signalFilePath = fixPath(signalFilePath);
    const singleQuote = "\\'";
    const writeEnvironmentVariableStatement = environmentVariable === undefined ? "" : `fs.writeFileSync('${environmentVariable}.txt', process.env['${environmentVariable}'] || '', { encoding: 'utf8' });`;
    const signalStatement = `process.on('${signal}', () => { console.info('Received a ${singleQuote}${signal}${singleQuote} signal for the process with id ${singleQuote}' + process.pid + '${singleQuote} ${willNotRespondToTermination === true ? "but will not exit" : `and will exit in ${delayAfterTerminationSignalToExitInMilliseconds} ms`}');${signalFilePath === undefined ? "" : ` fs.writeFileSync('${signalFilePath}', '${signal}', { encoding: 'utf8' });`}${willNotRespondToTermination === true ? "" : ` setTimeout(() => { console.info('The process with id ${singleQuote}' + process.pid + '${singleQuote} is now exiting'); process.exit(0); }, ${delayAfterTerminationSignalToExitInMilliseconds});`} });`;
    const signalAbortionStatement = `process.on('SIGABRT', () => { console.info('Received a ${singleQuote}SIGABRT${singleQuote} signal for the process with id ${singleQuote}' + process.pid + '${singleQuote}');${willNotRespondToTermination === true ? "" : ` process.exit(0);`} });`;
    const mainFunction = "main";
    const hasBeenWrittenVariable = "hasBeenWritten";
    const setHasBeenWrittenStatement = writeStartedFileOnlyOnce === true ? ` ${hasBeenWrittenVariable} = true;` : "";
    const setIntervalStatement = `setInterval(() => { if (${hasBeenWrittenVariable} !== false) { return; } console.info('Writing into the file ${singleQuote}${startedFilePath}${singleQuote} from the process with id ${singleQuote}' + process.pid + '${singleQuote}'); try { fs.writeFileSync('${startedFilePath}', 'started', { encoding: 'utf8' });${setHasBeenWrittenStatement} } catch (error) { console.error('Could not write the file ${singleQuote}${startedFilePath}${singleQuote} from the process with id ${singleQuote}' + process.pid + '${singleQuote}', error); } }, ${frequencyInMilliseconds});`;
    const mainFunctionStatement = `async function ${mainFunction}() { let ${hasBeenWrittenVariable} = false; ${setIntervalStatement} await new Promise(() => { console.info('Running the process with id ${singleQuote}' + process.pid + '${singleQuote} under directory ${singleQuote}' + process.cwd() + '${singleQuote}'); }); }`;
    const mainFunctionInvocation = `${mainFunction}().then(() => {});`;
    const requirementsStatement = `const fs = require('fs'); const process = require('process');`;
    return `${requirementsStatement} ${signalStatement} ${signalAbortionStatement} ${writeEnvironmentVariableStatement} ${mainFunctionStatement} ${mainFunctionInvocation}`;
  }

}

export type ListenerMock = jest.Mock<(command: string, value: object, marker?: string, onResult?: (value: object) => void) => Promise<void>>;

export class ExtensionBasisBuilder
{

  static readonly nodeExecutable = process.execPath;

  static readonly startedJsFileName = "started.js";

  private static readonly startedJsFilePath = path.join(directoryPath, "extensions", "started", ExtensionBasisBuilder.startedJsFileName);

  computeStartedFileContent(): string
  {
    const nodeModulesDirectoryPath = path.resolve(path.join(directoryPath, "..", "node_modules"));
    // We fix the path on Windows so that we discard the backslashes
    const fixedNodeModulesDirectoryPath = nodeModulesDirectoryPath.replaceAll("\\", "/");
    return fs.readFileSync(ExtensionBasisBuilder.startedJsFilePath, { encoding: "utf8" }).replaceAll("${nodeModulesDirectoryPath}", fixedNodeModulesDirectoryPath);
  }

}

export class Base extends Core
{

  public static readonly allPolicyContext = { scopes: [ApiScope.All] };

  public static readonly extensionParametersFileName = "parameters.json";

  private readonly createApplication: boolean;

  private isTerminating: boolean = false;

  private moduleRef?: TestingModule;

  private application?: INestApplication;

  public readonly originalDatabaseDirectoryPath = path.resolve(path.join(Base.rootDirectoryPath, "server", "database.db"));

  readonly imageFeeder = new ImageFeeder();

  readonly internalErrorCode = -1;

  readonly badParameterCode = 3;

  readonly imageMaximumBinaryWeightInBytes = 32 * 1024 * 1024;

  static async beforeAll(): Promise<void>
  {
  }

  static async afterAll(): Promise<void>
  {
  }

  constructor(createApplication: boolean)
  {
    super();
    this.createApplication = createApplication;
  }

  async beforeEach(): Promise<void>
  {
    await super.beforeEach();
    try
    {
      expect(this.moduleRef).toBeUndefined();
      expect(this.application).toBeUndefined();
      expect(this.isTerminating).toBe(false);
    }
    finally
    {
      if (this.moduleRef !== undefined || this.application !== undefined || this.isTerminating !== false)
      {
        this.moduleRef = undefined;
        this.application = undefined;
        this.isTerminating = false;
        logger.warn("Forced the clean-up of the previous test fixture state");
      }
    }
    const workingDirectoryPath = this.getWorkingDirectoryPath();
    const databaseFilePath = path.join(workingDirectoryPath, path.basename(this.originalDatabaseDirectoryPath));
    fs.cpSync(this.originalDatabaseDirectoryPath, databaseFilePath);
    paths.regularDatabaseFilePath = databaseFilePath;
    paths.runMigrations = false;
    paths.useVectorDatabase = false;
    paths.installedExtensionsDirectoryPath = path.join(workingDirectoryPath, "extensions");
    paths.builtInExtensionsDirectoryPath = path.join(workingDirectoryPath, "built-in-extensions");
    paths.modelsCacheDirectoryPath = path.join(workingDirectoryPath, "models");
    paths.repositoryMappingPaths = new Map<string, string>();
    fs.mkdirSync(paths.modelsCacheDirectoryPath, { recursive: true });
    await this.initialize();
  }

  async afterEach(): Promise<void>
  {
    await super.afterEach();
    expect(this.isTerminating).toBe(false);
    expect(this.moduleRef).toBeUndefined();
    expect(this.application).toBeUndefined();
  }

  protected async onAfterEach(): Promise<void>
  {
    await this.terminate();
    await super.onAfterEach();
  }

  async restart(callback?: () => Promise<void>): Promise<void>
  {
    await this.terminate();
    if (callback !== undefined)
    {
      await callback();
    }
    await this.initialize();
  }

  private async initialize(): Promise<void>
  {
    if (this.createApplication === true)
    {
      await this.createNestApplication();
    }
    else
    {
      await this.createModuleRef();
    }
  }

  async terminate(): Promise<void>
  {
    if (this.createApplication === true)
    {
      await this.destroyNestApplication();
    }
    else
    {
      await this.destroyModuleRef();
    }
  }

  private async createModuleRef(): Promise<void>
  {
    logger.debug("Creating a Nest module");
    this.moduleRef = await this.createTestingModule();
    await this.moduleRef.init();
  }

  private async waitForTermination(entity: string): Promise<boolean>
  {
    if (this.isTerminating === true)
    {
      logger.warn(`The Nest ${entity} is already being terminated`);
      return new Promise<boolean>((resolve) =>
      {
        const interval = Timers.setInterval(() =>
        {
          if (this.isTerminating === false)
          {
            logger.debug(`The Nest ${entity} is now terminated`);
            Timers.clearInterval(interval);
            resolve(true);
          }
          else
          {
            logger.debug(`Waiting for the Nest ${entity} to be terminated`);
          }
        }, Core.fastestIntervalInMilliseconds);
      });
    }
    return false;
  }

  private async destroyModuleRef(): Promise<void>
  {
    if (this.moduleRef !== undefined)
    {
      if (await this.waitForTermination("module") === true)
      {
        return;
      }
      logger.debug("Destroying the Nest module");
      this.isTerminating = true;
      await this.moduleRef.close();
      this.isTerminating = false;
      this.moduleRef = undefined;
      logger.debug("The Nest module is now destroyed");
    }
  }

  private async createNestApplication(): Promise<void>
  {
    logger.debug("Creating the Nest application");
    this.moduleRef = await this.createTestingModule();
    this.application = this.moduleRef.createNestApplication<INestApplication>();
    const portNumber = await pickPort({ type: "tcp", minPort: 7000, maxPort: 8000 });
    paths.setSecureAndPortNumber(undefined, portNumber);
    logger.debug(`The Nest application is listening incoming requests on port ${portNumber}`);
    await this.application.listen(paths.webServicesPortNumber);
  }

  private async destroyNestApplication(): Promise<void>
  {
    if (this.application !== undefined)
    {
      if (await this.waitForTermination("application") === true)
      {
        return;
      }
      logger.debug("Destroying a Nest application");
      this.isTerminating = true;
      await this.application.close();
      this.isTerminating = false;
      this.application = undefined;
      this.moduleRef = undefined;
      logger.debug("The Nest application is now destroyed");
    }
    else
    {
      await this.destroyModuleRef();
    }
  }

  private async createTestingModule(): Promise<TestingModule>
  {
    return await Test.createTestingModule({ imports: [MainModule] }).compile();
  }

  private getModuleRef(): TestingModule
  {
    return this.moduleRef!;
  }

  setSdkDirectoryPath(): void
  {
    paths.sdkDirectoryPath = path.join(Base.rootDirectoryPath, "build", "sdk");
  }

  getEntitiesProvider(): EntitiesProvider
  {
    return this.getModuleRef().get<EntitiesProvider, EntitiesProvider>(EntitiesProvider)!;
  }

  getAdministrationController(): AdministrationController
  {
    return this.getModuleRef().get<AdministrationController, AdministrationController>(AdministrationController)!;
  }

  getApiSecretController(): ApiSecretController
  {
    return this.getModuleRef().get<ApiSecretController, ApiSecretController>(ApiSecretController)!;
  }

  getExtensionController(): ExtensionController
  {
    return this.getModuleRef().get<ExtensionController, ExtensionController>(ExtensionController)!;
  }

  getRepositoryController(): RepositoryController
  {
    return this.getModuleRef().get<RepositoryController, RepositoryController>(RepositoryController)!;
  }

  getImageController(): ImageController
  {
    return this.getModuleRef().get<ImageController, ImageController>(ImageController)!;
  }

  getImageAttachmentController(): ImageAttachmentController
  {
    return this.getModuleRef().get<ImageAttachmentController, ImageAttachmentController>(ImageAttachmentController)!;
  }

  getModuleProvider<Provider = any>(type: Type<Provider>): Provider
  {
    return this.getModuleRef().get<Provider, Provider>(type)!;
  }

  getSearchService(): SearchService
  {
    return this.getModuleProvider(SearchService);
  }

  getExtensionService(): ExtensionService
  {
    return this.getModuleProvider(ExtensionService);
  }

  getVectorDatabaseAccessor(): VectorDatabaseAccessor
  {
    return this.getModuleProvider(VectorDatabaseAccessor);
  }

  getEventEmitter(): EventEmitter2
  {
    return this.getModuleProvider(EventEmitter2);
  }

  getNotifier(): Notifier
  {
    return new Notifier(this.getEventEmitter());
  }

  async createRepository(url: string, name: string = Defaults.repositoryName, comment: string | undefined = undefined, watch: boolean | undefined = undefined): Promise<Repository>
  {
    return await this.getRepositoryController().create(Defaults.locationType, url, undefined, name, comment, watch);
  }

  async prepareEmptyRepository(directoryPath: string | undefined = undefined, watch: boolean = true): Promise<Repository>
  {
    const actualDirectoryPath = directoryPath !== undefined ? directoryPath : this.prepareEmptyDirectory(Defaults.emptyDirectoryName, this.getWorkingDirectoryPath());
    const repository = await this.createRepository(fileWithProtocol + actualDirectoryPath, path.basename(actualDirectoryPath), undefined, watch);
    await this.waitUntilRepositoryReady(repository.id);
    return repository;
  }

  async prepareRepositoryWithImage(fileName: string, directoryName: string = Defaults.emptyDirectoryName, watch: boolean = true): Promise<{
    repository: Repository;
    image: Image
  }>
  {
    const { repository, images } = await this.prepareRepositoryWithImages([fileName], directoryName, watch);
    return { repository, image: images[0] };
  }

  async prepareRepositoryWithImages(fileNames: string[], directoryName: string = Defaults.emptyDirectoryName, watch: boolean = true): Promise<{
    repository: Repository;
    images: Image[]
  }>
  {
    const directoryPath = this.prepareEmptyDirectory(directoryName, this.getWorkingDirectoryPath());
    for (const fileName of fileNames)
    {
      fs.copyFileSync(path.join(this.imageFeeder.imagesDirectoryPath, fileName), path.join(directoryPath, fileName));
    }
    const repository = await this.createRepository(fileWithProtocol + directoryPath, directoryName, undefined, watch);
    await this.waitUntilRepositoryReady(repository.id);
    const images: Image [] = [];
    for (const fileName of fileNames)
    {
      const image = await this.getRepositoryController().getImageByUrl(fileWithProtocol + path.join(directoryPath, fileName));
      images.push(image);
    }
    return { repository, images };
  }

  async prepareExtension(extensionId: string = "extensionId", events: ManifestEvent[] = [ManifestEvent.ProcessStarted], commands: ManifestExtensionCommand [] = [], capabilities: ManifestCapability[] | undefined = undefined): Promise<Extension>
  {
    const zip = new AdmZip();
    const manifest: Manifest =
      {
        id: extensionId,
        version: "1.0.0",
        name: "Extension",
        description: "An extension for testing.",
        runtimes: [{ environment: ManifestRuntimeEnvironment.Node }],
        instructions: [
          {
            events,
            capabilities,
            execution:
              {
                executable: capabilities === undefined ? "${node}" : ExtensionBasisBuilder.nodeExecutable,
                arguments: capabilities === undefined ? ["--eval", this.computeExtensionJavaScriptCode("started.txt", false)] : [ExtensionBasisBuilder.startedJsFileName]
              },
            commands
          }
        ],
        settings: { type: "object" }
      };
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    if (capabilities !== undefined)
    {
      zip.addFile(ExtensionBasisBuilder.startedJsFileName, Buffer.from(new ExtensionBasisBuilder().computeStartedFileContent(), "utf8"));
    }
    return await this.getExtensionController().install(zip.toBuffer());
  }

  computeExtensionJavaScriptCode(startedFileName: string, willNotRespondToTermination: boolean, environmentVariable?: string): string
  {
    return this.computeProcessJavaScriptCode(startedFileName, true, undefined, willNotRespondToTermination, undefined, undefined, environmentVariable);
  }

  async waitUntilRepositoryReady(repositoryId: string): Promise<void>
  {
    const notifier = this.getNotifier();
    await new Promise(async (resolve) =>
    {
      const offListener = notifier.on(EventEntity.Repository, RepositoryEventAction.Synchronize, ExtensionEventProcess.Stopped, async (_event: string, value: object) =>
      {
        if ("id" in value && value.id === repositoryId)
        {
          offListener.off();
          resolve(undefined);
        }
      });
      const repository = await this.getRepositoryController().get(repositoryId);
      logger.debug(`The repository with id '${repositoryId}' has the '${repository.status}' status`);
      if (repository.status === RepositoryStatus.READY)
      {
        resolve(undefined);
        offListener.off();
        return;
      }
    });
  }

  async waitUntilRepositoryWatching(repositoryId: string): Promise<void>
  {
    await this.waitUntil(async () =>
    {
      const activities = await this.getRepositoryController().activities();
      const activity = activities.find((activity) =>
      {
        return activity.id === repositoryId;
      });
      return activity !== undefined && activity.kind === RepositoryActivityKind.Watching;
    });
  }

  async waitUntilImage(repositoryId: string, filePath: string, isAvailable: boolean, runner: (() => void) | undefined = undefined): Promise<ImageSummary>
  {
    let initialImageSummary: ImageSummary | undefined;
    const url = fileWithProtocol + filePath;
    if (isAvailable === false)
    {
      initialImageSummary = await this.getRepositoryController().getImageByUrl(url);
    }
    if (runner !== undefined)
    {
      Timers.setTimeout(runner, this.checkingIntervalInMilliseconds);
    }
    return await new Promise<ImageSummary>((resolve) =>
    {
      const interval = Timers.setInterval(async () =>
      {
        const imageSummaries = await this.getRepositoryController().searchImages(repositoryId, {});
        const imageSummary: ImageSummary | undefined = imageSummaries.entities.find((summary) =>
        {
          return summary.url === url;
        });
        if (imageSummary !== undefined && isAvailable === true)
        {
          Timers.clearInterval(interval);
          resolve(imageSummary);
        }
        else if (imageSummary === undefined && isAvailable === false)
        {
          Timers.clearInterval(interval);
          resolve(initialImageSummary!);
        }
      }, this.checkingIntervalInMilliseconds);
      this.intervals.push(interval);
    });
  }

  computeEventListener(): ListenerMock
  {
    return jest.fn((command: string): Promise<void> =>
    {
      logger.debug(`Mock listener called with command '${JSON.stringify(command)}'`);
      return Promise.resolve();
    });
  }

}

// We increase the unit test default time-out duration
jest.setTimeout(Base.defaultTimeoutInMilliseconds);
