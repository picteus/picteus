import { execSync, spawn } from "node:child_process";
import { accessSync, constants, existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, delimiter, join } from "node:path";

import { Communicator, IntentDialogType } from "@picteus/extension-sdk";

import { LlamaClient } from "./llamaClient.js";


export interface DownloadModelOptions
{

  readonly model: string;
  readonly communicator: Communicator;
  readonly baseUrl: string;

}

export class LlamaDownloader
{

  private static readonly inFlightDownloads: Map<string, Promise<boolean>> = new Map<string, Promise<boolean>>();

  public static isLocalBaseUrl(baseUrl: string): boolean
  {
    try
    {
      const parsedUrl = new URL(baseUrl);
      const hostname = parsedUrl.hostname.toLowerCase();
      return hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        hostname === "0.0.0.0" ||
        hostname.startsWith("127.");
    }
    catch
    {
      return false;
    }
  }

  public static detectCliPath(): string | undefined
  {
    const isWindows = process.platform === "win32";
    const executableNames = isWindows === true ? [ "llama.exe", "llama-cli.exe" ] : [ "llama", "llama-cli" ];

    // We check directories defined in the PATH environment variable
    const pathEnvironment = process.env["PATH"];
    if (typeof pathEnvironment === "string" && pathEnvironment.length > 0)
    {
      const pathDirectories = pathEnvironment.split(delimiter);
      for (const directory of pathDirectories)
      {
        for (const executableName of executableNames)
        {
          const candidatePath = join(directory, executableName);
          if (LlamaDownloader.isExecutable(candidatePath) === true)
          {
            return candidatePath;
          }
        }
      }
    }

    // We check standard platform-specific directories
    const standardCandidatePaths = LlamaDownloader.getStandardCliCandidatePaths(isWindows);
    for (const candidatePath of standardCandidatePaths)
    {
      if (LlamaDownloader.isExecutable(candidatePath) === true)
      {
        return candidatePath;
      }
    }

    return undefined;
  }

  private static getStandardCliCandidatePaths(isWindows: boolean): string[]
  {
    const homeDirectory = homedir();
    if (isWindows === true)
    {
      const userProfile = process.env["USERPROFILE"] ?? homeDirectory;
      const localAppData = process.env["LOCALAPPDATA"] ?? "";
      const programFiles = process.env["ProgramFiles"] ?? "C:\\Program Files";

      return [
        join(userProfile, ".local", "bin", "llama.exe"),
        join(localAppData, "Programs", "llama", "llama.exe"),
        join(localAppData, "Programs", "Llama", "llama.exe"),
        join(programFiles, "llama", "llama.exe"),
        join(userProfile, ".local", "bin", "llama-cli.exe"),
        join(localAppData, "Programs", "llama", "llama-cli.exe")
      ];
    }

    return [
      join(homeDirectory, ".local", "bin", "llama"),
      "/opt/homebrew/bin/llama",
      "/usr/local/bin/llama",
      join(homeDirectory, ".local", "bin", "llama-cli"),
      "/opt/homebrew/bin/llama-cli",
      "/usr/local/bin/llama-cli"
    ];
  }

  private static isExecutable(candidatePath: string): boolean
  {
    try
    {
      if (existsSync(candidatePath) === false)
      {
        return false;
      }
      const fileStatus = statSync(candidatePath);
      if (fileStatus.isDirectory() === true)
      {
        return false;
      }
      if (process.platform !== "win32")
      {
        accessSync(candidatePath, constants.X_OK);
      }
      return true;
    }
    catch
    {
      return false;
    }
  }

  public static resolveRepositoryIdentifier(modelIdentifier: string): string
  {
    const sanitized = modelIdentifier.trim();
    if (sanitized.includes("/") === true)
    {
      return sanitized;
    }

    const curatedModel = LlamaClient.findCuratedModel(sanitized);
    if (curatedModel !== undefined)
    {
      return curatedModel.defaultRepository;
    }

    return sanitized;
  }

  public static async resolveModelDirectory(baseUrl: string): Promise<string | undefined>
  {
    // 1. We attempt to infer the directory from models currently loaded on the active server
    const serverDirectory = await LlamaDownloader.detectServerModelDirectory(baseUrl);
    if (serverDirectory !== undefined)
    {
      return serverDirectory;
    }

    // 2. We check platform-specific desktop application preferences (Llama.app on macOS, Llama-Windows on Windows)
    const macOsDirectory = LlamaDownloader.detectMacOsLlamaAppModelDirectory();
    if (macOsDirectory !== undefined)
    {
      return macOsDirectory;
    }

    const windowsDirectory = LlamaDownloader.detectWindowsLlamaAppModelDirectory();
    if (windowsDirectory !== undefined)
    {
      return windowsDirectory;
    }

    // 3. We check environment variables
    return LlamaDownloader.detectEnvironmentModelDirectory();
  }

  private static async detectServerModelDirectory(baseUrl: string): Promise<string | undefined>
  {
    try
    {
      const response = await fetch(`${baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(2_000)
      });
      if (response.ok === true)
      {
        const payload = (await response.json()) as {
          readonly data?: Array<{
            readonly status?: {
              readonly args?: readonly string[];
              readonly preset?: string;
            };
          }>;
        };
        if (Array.isArray(payload.data) === true)
        {
          for (const item of payload.data)
          {
            const argumentList = item.status?.args ?? [];
            for (const argument of argumentList)
            {
              const directory = LlamaDownloader.extractCacheDirectoryFromPath(argument);
              if (directory !== undefined)
              {
                return directory;
              }
            }

            const presetText = item.status?.preset;
            if (typeof presetText === "string" && presetText.length > 0)
            {
              const directory = LlamaDownloader.extractCacheDirectoryFromPath(presetText);
              if (directory !== undefined)
              {
                return directory;
              }
            }
          }
        }
      }
    }
    catch
    {
      // We fall back to desktop preferences when server introspection fails
    }

    return undefined;
  }

  private static extractCacheDirectoryFromPath(rawPath: string): string | undefined
  {
    const match = /(?:^|[\s"'])([A-Za-z]:[\\/][^"'\r\n]+?|[\\/][^"'\r\n]+?)[\\/]models--/i.exec(rawPath);
    if (match !== null && match[1] !== undefined)
    {
      const candidateDirectory = match[1].trim();
      if (candidateDirectory.length > 0 && existsSync(candidateDirectory) === true)
      {
        return candidateDirectory;
      }
    }

    return undefined;
  }

  private static detectMacOsLlamaAppModelDirectory(): string | undefined
  {
    if (process.platform !== "darwin")
    {
      return undefined;
    }

    try
    {
      const commandOutput = execSync("defaults read app.llama.Llama hfCacheDirectory", {
        encoding: "utf8",
        timeout: 1_500,
        stdio: [ "ignore", "pipe", "ignore" ]
      }).trim();

      if (commandOutput.length > 0 && existsSync(commandOutput) === true)
      {
        return commandOutput;
      }
    }
    catch
    {
      // We ignore errors if defaults cannot be read or key does not exist
    }

    return undefined;
  }

  private static detectWindowsLlamaAppModelDirectory(): string | undefined
  {
    if (process.platform !== "win32")
    {
      return undefined;
    }

    const localAppData = process.env["LOCALAPPDATA"] ?? join(homedir(), "AppData", "Local");
    const candidateConfigPaths =
      [
        join(localAppData, "Llama", "settings.json"),
        join(localAppData, "LlamaApp", "settings.json")
      ];

    for (const candidatePath of candidateConfigPaths)
    {
      try
      {
        if (existsSync(candidatePath) === true)
        {
          const fileContent = readFileSync(candidatePath, "utf8");
          const parsedSettings = JSON.parse(fileContent) as {
            readonly CacheDirectory?: unknown;
            readonly cacheDirectory?: unknown;
          };

          const rawDirectory = parsedSettings.CacheDirectory ?? parsedSettings.cacheDirectory;
          if (typeof rawDirectory === "string" && rawDirectory.trim().length > 0)
          {
            const trimmedDirectory = rawDirectory.trim();
            if (existsSync(trimmedDirectory) === true)
            {
              return trimmedDirectory;
            }
          }
        }
      }
      catch
      {
        // We ignore parsing or reading errors and check the next candidate
      }
    }

    return undefined;
  }

  private static detectEnvironmentModelDirectory(): string | undefined
  {
    const candidateEnvironmentVariables = [
      process.env["HF_HUB_CACHE"],
      process.env["HUGGINGFACE_HUB_CACHE"],
      process.env["HF_HOME"]
    ];

    for (const candidateDirectory of candidateEnvironmentVariables)
    {
      if (typeof candidateDirectory === "string" && candidateDirectory.trim().length > 0)
      {
        const trimmed = candidateDirectory.trim();
        if (existsSync(trimmed) === true)
        {
          return trimmed;
        }
      }
    }

    return undefined;
  }

  public async downloadModel(options: DownloadModelOptions): Promise<boolean>
  {
    const resolvedRepository = LlamaDownloader.resolveRepositoryIdentifier(options.model);

    if (LlamaDownloader.isLocalBaseUrl(options.baseUrl) === false)
    {
      options.communicator.sendLog(
        `Cannot download model '${options.model}' on demand because the llama.cpp server at '${options.baseUrl}' is not local. On-demand downloads are supported only for local servers.`,
        "warn"
      );
      return false;
    }

    const resolvedExecutablePath = LlamaDownloader.detectCliPath();
    if (resolvedExecutablePath === undefined)
    {
      options.communicator.sendLog(
        `Cannot download model '${options.model}': the llama CLI executable was not found. Please install llama (from https://llama.app).`,
        "warn"
      );
      return false;
    }

    const activeDownload = LlamaDownloader.inFlightDownloads.get(options.model);
    if (activeDownload !== undefined)
    {
      options.communicator.sendLog(`A download for model '${options.model}' is already in progress. Awaiting its completion…`, "info");
      return await activeDownload;
    }

    const modelDirectory = await LlamaDownloader.resolveModelDirectory(options.baseUrl);
    if (modelDirectory !== undefined)
    {
      options.communicator.sendLog(`Using model cache directory '${modelDirectory}' for downloading '${options.model}'.`, "debug");
    }

    const downloadPromise = this.executeDownload(
      options.communicator,
      resolvedExecutablePath,
      resolvedRepository,
      options.model,
      modelDirectory
    );
    LlamaDownloader.inFlightDownloads.set(options.model, downloadPromise);

    try
    {
      const isDownloadSucceeded = await downloadPromise;
      if (isDownloadSucceeded === false)
      {
        return false;
      }
      try
      {
        await options.communicator.launchIntent<boolean>({
          dialog:
            {
              type: IntentDialogType.Question,
              size: "m",
              title: "llama.cpp model downloaded",
              description: `The llama.cpp model '${options.model}' has been downloaded: click on the menu bar llama.cpp icon, and make sure that the new downloaded model is listed: this will force llama.cpp to take this into account.`,
              details: "Click on the 'OK' button only once you have operated that action.",
              buttons: { yes: "OK" }
            }
        });
      }
      catch (_error: unknown)
      {
        // In case the user canceled the dialog box
      }
      return await this.awaitServerModelRecognition(options.baseUrl, options.model, options.communicator);
    }
    finally
    {
      LlamaDownloader.inFlightDownloads.delete(options.model);
    }
  }

  private executeDownload(
    communicator: Communicator,
    executablePath: string,
    repository: string,
    model: string,
    modelDirectory?: string
  ): Promise<boolean>
  {
    return new Promise<boolean>((resolve) =>
      {
        const directoryNotice = typeof modelDirectory === "string" && modelDirectory.length > 0 ? ` into '${modelDirectory}'` : "";
        communicator.sendLog(`Initiating download of repository '${repository}' for model '${model}' using executable '${executablePath}'${directoryNotice}…`, "info");

        const binaryBaseName = basename(executablePath).toLowerCase();
        const isLlamaCliBinary = binaryBaseName.startsWith("llama-cli");
        const commandArguments = isLlamaCliBinary === true ? [ "-hf", repository ] : [ "download", "-hf", repository ];

        let hasFinished = false;
        let lastReportedTimestamp = Date.now();
        let collectedErrorOutput = "";

        const environmentVariables: NodeJS.ProcessEnv = { ...process.env };
        if (typeof modelDirectory === "string" && modelDirectory.length > 0)
        {
          environmentVariables["HF_HUB_CACHE"] = modelDirectory;
          environmentVariables["HUGGINGFACE_HUB_CACHE"] = modelDirectory;
        }

        const childProcess = spawn(executablePath, commandArguments,
          {
            stdio: [ "ignore", "pipe", "pipe" ],
            windowsHide: true,
            env: environmentVariables
          }
        );

        const handleDataChunk = (chunk: Buffer): void =>
        {
          const text = chunk.toString("utf8");
          const lines = text.split(/[\r\n]+/).map((line) => line.trim()).filter((line) => line.length > 0);
          for (const line of lines)
          {
            if (line.toLowerCase().includes("error") === true || line.toLowerCase().includes("failed") === true)
            {
              collectedErrorOutput = line;
            }
          }

          const currentTimestamp = Date.now();
          if (currentTimestamp - lastReportedTimestamp >= 4_000)
          {
            const progressLine = lines[lines.length - 1];
            if (progressLine !== undefined && progressLine.length > 0)
            {
              communicator.sendLog(`Downloading '${model}': ${progressLine}`, "info");
              lastReportedTimestamp = currentTimestamp;
            }
          }
        };

        childProcess.stdout?.on("data", handleDataChunk);
        childProcess.stderr?.on("data", handleDataChunk);

        childProcess.on("error", (error: Error) =>
          {
            if (hasFinished === false)
            {
              hasFinished = true;
              communicator.sendLog(`Failed to spawn llama downloader process: ${error.message}`, "error");
              resolve(false);
            }
          }
        );

        childProcess.on("close", (exitCode: number | null) =>
          {
            if (hasFinished === false)
            {
              hasFinished = true;
              if (exitCode === 0)
              {
                communicator.sendLog(`Model '${model}' was successfully downloaded into the local llama cache.`, "info");
                resolve(true);
              }
              else
              {
                const failureDetail = collectedErrorOutput.length > 0 ? ` Details: ${collectedErrorOutput}` : "";
                communicator.sendLog(`Model download for '${model}' exited with code ${exitCode ?? "unknown"}.${failureDetail}`, "error");
                resolve(false);
              }
            }
          }
        );
      }
    );
  }

  private async awaitServerModelRecognition(
    baseUrl: string,
    model: string,
    communicator: Communicator,
    timeoutInMilliseconds: number = 60_000,
    pollIntervalInMilliseconds: number = 2_000
  ): Promise<boolean>
  {
    communicator.sendLog(`Model '${model}' files were downloaded into cache. Waiting for the llama.cpp server to register the new model…`, "warn");

    const startTimestamp = Date.now();
    let lastReportedSeconds = 0;

    while (Date.now() - startTimestamp < timeoutInMilliseconds)
    {
      // We trigger a preset reload on the server
      try
      {
        await fetch(`${baseUrl}/models?reload=1`, { signal: AbortSignal.timeout(pollIntervalInMilliseconds) });
      }
      catch
      {
        // We ignore network errors on reload endpoints
      }

      const isModelRegistered = await this.checkServerModelRegistered(baseUrl, model);
      if (isModelRegistered === true)
      {
        communicator.sendLog(`The llama.cpp server has registered and recognized the model '${model}'.`, "info");
        return true;
      }

      const elapsedSeconds = Math.round((Date.now() - startTimestamp) / 1_000);
      if (elapsedSeconds >= lastReportedSeconds + 8)
      {
        communicator.sendLog(`Waiting for llama.cpp server to register '${model}' (${elapsedSeconds}s elapsed)…`, "debug");
        lastReportedSeconds = elapsedSeconds;
      }

      await new Promise<void>((resolve) =>
        {
          setTimeout(resolve, pollIntervalInMilliseconds);
        }
      );
    }

    communicator.sendLog(`The model '${model}' was downloaded, but was not recognized by the llama.cpp server within ${Math.round(timeoutInMilliseconds / 1_000)} seconds. If using the Llama desktop app, ensure it is open and refreshed.`, "warn"
    );
    return false;
  }

  private async checkServerModelRegistered(baseUrl: string, model: string): Promise<boolean>
  {
    try
    {
      const response = await fetch(`${baseUrl}/v1/models?reload=1`, { signal: AbortSignal.timeout(5_000) });
      if (response.ok === true)
      {
        const payload = (await response.json()) as { readonly data?: Array<{ readonly id?: string }>; };
        if (Array.isArray(payload.data) === true)
        {
          for (const item of payload.data)
          {
            if (typeof item.id === "string" && item.id.length > 0)
            {
              if (this.isMatchingModelIdentifier(item.id, model) === true)
              {
                return true;
              }
            }
          }
        }
      }
    }
    catch
    {
      // We ignore transient polling errors
    }

    return false;
  }

  private isMatchingModelIdentifier(serverId: string, requestedModel: string): boolean
  {
    if (serverId.toLowerCase() === requestedModel.toLowerCase())
    {
      return true;
    }

    const serverCurated = LlamaClient.findCuratedModel(serverId);
    const requestedCurated = LlamaClient.findCuratedModel(requestedModel);
    if (serverCurated !== undefined && requestedCurated !== undefined && serverCurated.id === requestedCurated.id)
    {
      return true;
    }

    const normalizedServerId = serverId.split(":")[0]?.toLowerCase();
    const normalizedRequested = requestedModel.split(":")[0]?.toLowerCase();
    return normalizedServerId !== undefined && normalizedRequested !== undefined && normalizedServerId === normalizedRequested;


  }

}
