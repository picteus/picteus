import path from "node:path";
import os from "node:os";
// A good article about worker threads is available under https://medium.com/@manikmudholkar831995/worker-threads-multitasking-in-nodejs-6028cdf35e9d
import { isMainThread, MessageChannel } from "node:worker_threads";

import Piscina from "piscina";

import { logger } from "../logger";
import { paths } from "../paths";
import { checkIsMainThread } from "../utils";
import { RepositoryLocationType } from "../dtos/app.dtos";
import { ImageIdAndFormat, RepositoryIdAndFilePath } from "../bos";
import { ImageEventAction } from "../notifier";
import { ExtensionsApiKeys } from "../app.guards";
import { ExtensionMessage, ImageEvent } from "../services/extensionRegistry";


function computeWorkersDirectoryPath(): string
{
  let workersDirectoryPath: string | undefined;

  function compute(): string
  {
    if (workersDirectoryPath === undefined)
    {
      let directoryPath = paths.workersDirectoryPath;
      if (directoryPath !== undefined)
      {
        workersDirectoryPath = directoryPath;
      }
      else
      {
        workersDirectoryPath = path.join(paths.serverDirectoryPath, "src", "workers");
      }
      if (isMainThread === true)
      {
        logger.debug(`The workers directory is set to '${workersDirectoryPath}'`);
      }
    }
    return workersDirectoryPath;
  }

  return compute();
}

export type ImageDeclarationManagerEvent = ImageIdAndFormat &
  {
    action: ImageEventAction | undefined
  }

abstract class Manager
{

  protected readonly maximumThreads: number;

  protected readonly piscina: Piscina;

  protected abstract getMaximumWorkersCount(): number;

  protected constructor(fileName: string, idealWorkersCount?: number)
  {
    checkIsMainThread();
    this.maximumThreads = Math.min(idealWorkersCount ?? this.getMaximumWorkersCount(), this.getMaximumWorkersCount());
    // Caution; this is set to "disabled", otherwise the spawned processes do not generate an "exit" event
    const atomics: undefined | "sync" | "async" | "disabled" = "disabled";
    const options =
      {
        filename: path.resolve(computeWorkersDirectoryPath(), fileName),
        maxThreads: this.maximumThreads,
        env: paths.computeProcessEnvironmentVariables(),
        trackUnmanagedFds: false,
        atomics
      };
    logger.debug(`Starting a pool of ${options.maxThreads} worker thread(s) for the manager '${this.toString()}'`);
    this.piscina = new Piscina(options);
    this.piscina.on("error", (error) =>
    {
      logger.error(`An unhandled exception occurred during the execution of the manager '${this.toString()}'`, error);
    });
  }

  protected async destroy(): Promise<void>
  {
    checkIsMainThread();
    logger.debug(`Stopping a pool of ${this.piscina.maxThreads} worker thread(s) for the manager '${this.toString()}'`);
    await this.piscina.close({ force: true });
    logger.debug(`The pool of threads of the manager '${this.toString()}' is now closed`);
    await this.piscina.destroy();
    logger.debug(`The pool of threads of the manager '${this.toString()}' is now destroyed`);
  }

  protected toString(): string
  {
    return this.constructor.name;
  }

}

export class ImageDeclarationManager extends Manager
{

  private static instances: ImageDeclarationManager[] = [];

  private isDestroyed = false;

  static async destroyAll()
  {
    checkIsMainThread();
    logger.debug("Destroying all the ImageDeclarationManager instances");
    for (const manager of ImageDeclarationManager.instances)
    {
      await manager.destroy();
    }
    ImageDeclarationManager.instances.length = 0;
  }

  constructor(idealWorkersCount?: number)
  {
    logger.debug("Creating an instance of 'ImageDeclarationManager'");
    super("handleImages.js", idealWorkersCount);
    logger.debug(`Spreading the processing over ${this.maximumThreads} worker threads`);
    ImageDeclarationManager.instances.push(this);
  }

  async destroy(): Promise<void>
  {
    if (this.isDestroyed === false)
    {
      logger.debug("Destroying an instance of 'ImageDeclarationManager'");
      await super.destroy();
      this.isDestroyed = true;
    }
  }

  protected getMaximumWorkersCount(): number
  {
    return Math.max(1, os.cpus().length - 2);
  }

  async listFiles(type: RepositoryLocationType, url: string): Promise<string[]>
  {
    return this.piscina.run({ type, url }, { name: "listFiles" });
  }

  async declareImage(repositoryIdAndFilePath: RepositoryIdAndFilePath): Promise<ImageIdAndFormat>
  {
    return this.runWorkerThreadFunction<ImageIdAndFormat>("declareImage", repositoryIdAndFilePath);
  }

  async synchronizeImage(repositoryIdAndFilePath: RepositoryIdAndFilePath): Promise<ImageDeclarationManagerEvent>
  {
    return this.runWorkerThreadFunction<ImageDeclarationManagerEvent>("synchronizeImage", repositoryIdAndFilePath);
  }

  async updateImage(repositoryIdAndFilePath: RepositoryIdAndFilePath): Promise<ImageDeclarationManagerEvent>
  {
    return this.runWorkerThreadFunction<ImageDeclarationManagerEvent>("updateImage", repositoryIdAndFilePath);
  }

  private async runWorkerThreadFunction<T extends ImageIdAndFormat | ImageDeclarationManagerEvent>(functionName: string, repositoryIdAndFilePath: RepositoryIdAndFilePath): Promise<T>
  {
    const { port1, port2 } = new MessageChannel();
    const imageClassifierPort = port2;
    return this.piscina.run(
      {
        ports: { port1, port2: imageClassifierPort },
        repositoryIdAndFilePath
      },
      {
        name: functionName,
        transferList: [port1, imageClassifierPort]
      });
  }

}

export type ExtensionOnMessageListener = (message: ExtensionMessage) => Promise<void>;

export class ExtensionsManager extends Manager
{

  private onMessageListener?: ExtensionOnMessageListener;

  constructor()
  {
    logger.debug("Creating an instance of 'ExtensionsManager'");
    super("extensionsRunner.js");
  }

  protected getMaximumWorkersCount(): number
  {
    return 1;
  }

  async destroy(): Promise<void>
  {
    logger.debug("Destroying the single instance of 'ExtensionsManager'");
    await this.stop();
    await super.destroy();
  }

  async start(webServicesBaseUrl: string, extensionsApiKeys: ExtensionsApiKeys, onMessageListener: ExtensionOnMessageListener): Promise<void>
  {
    logger.debug("Asking the ExtensionsRunner to start");
    this.onMessageListener = onMessageListener;
    // A very good article on how to communicate between the main and the worker thread is available at https://medium.com/@manikmudholkar831995/worker-threads-multitasking-in-nodejs-6028cdf35e9d
    for (const thread of this.piscina.threads)
    {
      thread.on("message", onMessageListener);
    }
    const result = await this.piscina.run({ webServicesBaseUrl, extensionsApiKeys },
      {
        name: "start",
        transferList: []
      });
    logger.debug("The ExtensionsRunner is now started");
    return result;
  }

  private async stop(): Promise<void>
  {
    logger.debug("Asking the ExtensionsRunner to stop");
    const result = await this.piscina.run({},
      {
        name: "stop",
        transferList: []
      });
    logger.debug("The ExtensionsRunner is now stopped");
    if (this.onMessageListener !== undefined)
    {
      for (const thread of this.piscina.threads)
      {
        thread.off("message", this.onMessageListener);
      }
    }
    return result;
  }

  async startProcesses(extensionsApiKeys: ExtensionsApiKeys): Promise<void>
  {
    return await this.piscina.run({ extensionsApiKeys },
      {
        name: "startProcesses",
        transferList: []
      });
  }

  async stopProcesses(extensionIds: string[]): Promise<void>
  {
    return await this.piscina.run({ extensionIds },
      {
        name: "stopProcesses",
        transferList: []
      });
  }

  async onImageEvent(event: ImageEvent): Promise<void>
  {
    return await this.piscina.run({ event },
      {
        name: "onImageEvent",
        transferList: []
      });
  }

}
