import path from "node:path";
import fs from "node:fs";
import { ChildProcess } from "node:child_process";

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { paths } from "../paths";
import { logger } from "../logger";
import { killProcess } from "./utils/processWrapper";
import {
  computeVirtualEnvironmentBinaryDirectoryPath,
  computeVirtualEnvironmentPythonFilePath,
  ensureViaVirtualEnvironmentPip,
  ensureVirtualEnvironment,
  pythonVersion,
  spawnPythonWithWatchdog
} from "./utils/pythonWrapper";


// Chroma alternatives are: https://github.com/weaviate/weaviate; https://github.com/qdrant/qdrant, https://github.com/facebookresearch/faiss
@Injectable()
export class VectorDatabaseService implements OnModuleInit, OnModuleDestroy
{

  private static readonly chromaDbVersion = "1.0.20";

  private readonly enabled;

  private childProcess?: ChildProcess;

  static async installChroma(chromaDirectoryPath: string): Promise<string>
  {
    const chromaBinaryFileName = "chroma" + (process.platform === "win32" ? ".exe" : "");
    try
    {
      logger.info("Ensuring that Chroma is installed as a vector database");
      await ensureVirtualEnvironment(pythonVersion, chromaDirectoryPath);
      await ensureViaVirtualEnvironmentPip(chromaDirectoryPath, [ "chromadb==" + this.chromaDbVersion ], chromaBinaryFileName);
    }
    catch (error)
    {
      logger.error("Could not ensure the Chroma runtime environment", error);
      throw error;
    }

    if (fs.existsSync(chromaDirectoryPath) === false)
    {
      fs.mkdirSync(chromaDirectoryPath, { recursive: true });
    }
    return path.join(computeVirtualEnvironmentBinaryDirectoryPath(chromaDirectoryPath), chromaBinaryFileName);
  }

  static async startChroma(chromaDirectoryPath: string, portNumber: number, host: string, shouldAllowReset: boolean | undefined, chromaBinaryFilePath?: string): Promise<ChildProcess>
  {
    logger.info(`Starting the Chroma server on port ${portNumber} and waiting for it to be ready`);
    // We assemble the environment variables per https://docs.trychroma.com/reference/server-env-vars
    const env: NodeJS.ProcessEnv = { "ANONYMIZED_TELEMETRY": "False" };
    if (shouldAllowReset !== undefined)
    {
      env.CHROMA_ALLOW_RESET = shouldAllowReset === true ? "TRUE" : "FALSE";
    }
    const pythonExecutable = chromaBinaryFilePath === undefined ? computeVirtualEnvironmentPythonFilePath(chromaDirectoryPath) : chromaBinaryFilePath;
    const preliminaryArguments = chromaBinaryFilePath === undefined ? [ "-c", "from chromadb.cli.cli import app; app()" ] : [];
    const childProcess: ChildProcess = spawnPythonWithWatchdog(pythonExecutable, [ ...preliminaryArguments, "run", "--path", ".", "--host", host, "--port", portNumber.toString() ], chromaDirectoryPath, env, true, [ "pipe", "pipe", "pipe" ]);
    if (childProcess.stdout === null)
    {
      throw new Error("The Chroma server stdout is null");
    }

    await new Promise<void>((resolve, reject) =>
    {
      let resolvedOrRejected = false;
      // We keep on listening to the vector database server forever
      childProcess.once("exit", (code: number | null, signal: NodeJS.Signals | null) =>
      {
        const hasErrorExitCode = code !== null && code !== 0;
        const hasUnexpectedSignal = signal !== null && signal !== "SIGTERM";
        const message = `The Chroma server running through the process with id '${childProcess.pid}' exited${(hasErrorExitCode === true) ? ` with code ${code}` : hasUnexpectedSignal === true ? ` with signal '${signal}'` : ""}`;
        if (resolvedOrRejected === false && (hasErrorExitCode === true || hasUnexpectedSignal === true))
        {
          resolvedOrRejected = true;
          reject(new Error(message));
        }
        else
        {
          if (hasErrorExitCode === true || hasUnexpectedSignal === true)
          {
            logger.error(message);
          }
          else
          {
            logger.info(message);
          }
        }
      });
      const stdout = childProcess.stdout!;
      const stderr = childProcess.stderr!;
      const listener = (chunk: Buffer) =>
      {
        const log = chunk.toString();
        if (log.indexOf("is not available") !== -1)
        {
          stdout.removeListener("data", listener);
          stderr.removeListener("data", listener);
          if (resolvedOrRejected === false)
          {
            resolvedOrRejected = true;
            reject(new Error(`The Chroma server could not start because the port ${portNumber} is already in use`));
          }
        }
        else if (log.indexOf("Uvicorn running on") !== -1 || log.indexOf("Listening on ") !== -1 || log.indexOf("Connect to Chroma at") !== -1)
        {
          logger.info("The Chroma server is up and running");
          stdout.removeListener("data", listener);
          stderr.removeListener("data", listener);
          // We resume the streams to continuously drain the pipes and avoid 64 KB buffer deadlocks
          stdout.resume();
          stderr.resume();
          if (resolvedOrRejected === false)
          {
            resolvedOrRejected = true;
            resolve();
          }
        }
      };
      stdout.addListener("data", listener);
      stderr.addListener("data", listener);
    });

    return childProcess;
  }

  constructor()
  {
    this.enabled = paths.startVectorDatabase;
  }

  async onModuleInit(): Promise<void>
  {
    await this.initialize();
    logger.debug("The initializing of a VectorDatabaseService is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.debug("Destroying a VectorDatabaseService");
    await this.terminate();
    logger.debug("Destroyed a VectorDatabaseService");
  }

  private async initialize(): Promise<void>
  {
    if (this.enabled === true)
    {
      const chromaDirectoryPath = paths.vectorDatabaseDirectoryPath;
      await VectorDatabaseService.installChroma(chromaDirectoryPath);
      this.childProcess = await VectorDatabaseService.startChroma(chromaDirectoryPath, paths.vectorDatabasePortNumber, "127.0.0.1", undefined);
    }
  }

  private async terminate(): Promise<void>
  {
    if (this.childProcess !== undefined)
    {
      logger.info("Stopping the Chroma server");
      await killProcess(this.childProcess);
      this.childProcess = undefined;
    }
  }

}
