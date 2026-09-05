import fs from "node:fs";
import { ChildProcess } from "node:child_process";

import { ChromaDBContainer, StartedChromaDBContainer } from "@testcontainers/chromadb";

import { logger } from "../src/logger";
import { killProcess } from "../src/services/utils/processWrapper";
import { VectorDatabaseProvider } from "../src/services/app.service";


export interface StartChromaTestcontainersOptions
{

  /**
   * Docker image name when using Testcontainers mode.
   */
  readonly dockerImageName: string;

}

export interface StartChromaProcessOptions
{

  /**
   * The host or bind address for the Chroma server.
   */
  readonly host: string;

  /**
   * Directory used for persisted data (corresponds to CHROMA_PERSIST_PATH).
   * Must be defined when running the Chroma server via a Python process.
   */
  readonly persistPath: string;

  /**
   * Custom path to the Python executable.
   */
  readonly pythonExecutablePath: string;

}

export interface StartChromaServerOptions
{

  /**
   * The port number the Chroma server should listen to.
   */
  readonly portNumber: number;

  /**
   * Options specific to running Chroma as a local process.
   * Exactly one of 'process' or 'testcontainers' must be defined.
   */
  readonly process?: StartChromaProcessOptions;

  /**
   * Options specific to running Chroma via Testcontainers (Docker).
   * Exactly one of 'process' or 'testcontainers' must be defined.
   */
  readonly testcontainers?: StartChromaTestcontainersOptions;

  /**
   * Whether destructive reset operations are enabled (corresponds to CHROMA_ALLOW_RESET).
   * Default: true.
   */
  readonly shouldAllowReset?: boolean;

  /**
   * Additional environment variables passed to the Chroma server.
   * See https://docs.trychroma.com/reference/server-env-vars.
   */
  readonly environmentVariables?: Record<string, string>;

  /**
   * Maximum duration to wait for the server to be ready, in milliseconds.
   * Default: 30000 ms.
   */
  readonly readinessTimeoutMilliseconds?: number;

}

export interface ChromaServerInstance
{

  readonly host: string;
  readonly portNumber: number;
  readonly endpoint: string;
  readonly process?: ChildProcess;
  readonly container?: StartedChromaDBContainer;

  stop(): Promise<void>;

}

async function waitForChromaServerReadiness(
  host: string,
  portNumber: number,
  timeoutMilliseconds: number
): Promise<void>
{
  const startTime = Date.now();
  const heartbeatUrl = `http://${host}:${portNumber}/api/v2/heartbeat`;
  const legacyHeartbeatUrl = `http://${host}:${portNumber}/api/v1/heartbeat`;

  while (Date.now() - startTime < timeoutMilliseconds)
  {
    try
    {
      const response = await fetch(heartbeatUrl, { signal: AbortSignal.timeout(1000) });
      if (response.status === 200)
      {
        return;
      }
    }
    catch (error)
    {
      try
      {
        const legacyResponse = await fetch(legacyHeartbeatUrl, { signal: AbortSignal.timeout(1000) });
        // The v1 API might return 200 or 400 with a migration notice, either indicates the server is answering HTTP requests
        if (legacyResponse.status === 200 || legacyResponse.status === 400)
        {
          return;
        }
      }
      catch (legacyError)
      {
        // Connection refused or not ready yet, continue polling
      }
    }

    await new Promise((resolve) =>
    {
      setTimeout(resolve, 200);
    });
  }

  throw new Error(`Timed out waiting for the Chroma server at http://${host}:${portNumber} to become ready within ${timeoutMilliseconds} ms`);
}

async function startChromaServerViaProcess(
  options: StartChromaServerOptions
): Promise<ChromaServerInstance>
{
  const portNumber = options.portNumber;
  const processOptions = options.process!;
  const host = processOptions.host;
  const persistPath = processOptions.persistPath;
  const shouldAllowReset = options.shouldAllowReset ?? true;
  const readinessTimeoutMilliseconds = options.readinessTimeoutMilliseconds ?? 30000;

  if (fs.existsSync(persistPath) === false)
  {
    fs.mkdirSync(persistPath, { recursive: true });
  }

  const chromaBinaryFilePath = await VectorDatabaseProvider.installChroma(persistPath);
  const childProcess: ChildProcess = await VectorDatabaseProvider.startChroma(persistPath, chromaBinaryFilePath, portNumber, host, shouldAllowReset);

  // We ensure the HTTP heartbeat responds before declaring the server ready
  await waitForChromaServerReadiness(host, portNumber, readinessTimeoutMilliseconds);

  const endpoint = `http://${host}:${portNumber}`;
  logger.info(`The Chroma server process is ready and listening at ${endpoint}`);

  const instance: ChromaServerInstance =
    {
      host,
      portNumber,
      endpoint,
      process: childProcess,
      stop: async (): Promise<void> =>
      {
        await stopChromaServer(instance);
      }
    };

  return instance;
}

async function startChromaServerViaTestcontainers(
  options: StartChromaServerOptions
): Promise<ChromaServerInstance>
{
  const portNumber = options.portNumber;
  const testcontainersOptions = options.testcontainers!;
  const dockerImageName = testcontainersOptions.dockerImageName;
  const shouldAllowReset = options.shouldAllowReset ?? true;
  const containerPort = 8000;

  logger.info(`Starting the Chroma server container with image '${dockerImageName}' on port ${portNumber}`);

  const container = new ChromaDBContainer(dockerImageName);

  container.withExposedPorts(
    {
      container: containerPort,
      host: portNumber
    }
  );

  const containerEnvironment: Record<string, string> =
    {
      "CHROMA_PORT": containerPort.toString(),
      "CHROMA_LISTEN_ADDRESS": "0.0.0.0",
      "CHROMA_ALLOW_RESET": shouldAllowReset === true ? "TRUE" : "FALSE",
      "ANONYMIZED_TELEMETRY": "False",
      ...(options.environmentVariables ?? {})
    };

  for (const [ key, value ] of Object.entries(containerEnvironment))
  {
    container.withEnvironment({ [key]: value });
  }

  if (options.readinessTimeoutMilliseconds !== undefined)
  {
    container.withStartupTimeout(options.readinessTimeoutMilliseconds);
  }

  const startedContainer = await container.start();
  const mappedPort = startedContainer.getMappedPort(containerPort);
  const containerHost = startedContainer.getHost();
  const endpoint = `http://${containerHost}:${mappedPort}`;

  logger.info(`The Chroma server container is ready and listening at ${endpoint}`);

  const instance: ChromaServerInstance =
    {
      host: containerHost,
      portNumber: mappedPort,
      endpoint,
      container: startedContainer,
      stop: async (): Promise<void> =>
      {
        await stopChromaServer(instance);
      }
    };

  return instance;
}

/**
 * Spins up a Chroma server, either as a local process or via Testcontainers depending on configuration.
 *
 * @param options Configuration options specifying execution mode, host, port, and mode-specific settings.
 * @returns The ChromaServerInstance with endpoint information and teardown handler.
 */
export async function startChromaServer(
  options: StartChromaServerOptions
): Promise<ChromaServerInstance>
{
  const hasProcessOptions = options.process !== undefined;
  const hasTestcontainersOptions = options.testcontainers !== undefined;
  if (hasProcessOptions === true && hasTestcontainersOptions === true)
  {
    throw new Error("Both 'process' and 'testcontainers' options cannot be defined together in StartChromaServerOptions");
  }
  if (hasProcessOptions === false && hasTestcontainersOptions === false)
  {
    throw new Error("Either 'process' or 'testcontainers' option must be defined in StartChromaServerOptions");
  }
  if (hasTestcontainersOptions === true)
  {
    return await startChromaServerViaTestcontainers(options);
  }
  return await startChromaServerViaProcess(options);
}

/**
 * Turns off a running Chroma server.
 *
 * @param instance The Chroma server instance to stop.
 */
export async function stopChromaServer(
  instance: ChromaServerInstance
): Promise<void>
{
  const mode = instance.container !== undefined ? "testcontainers" : "process";
  logger.info(`Stopping the Chroma server on port ${instance.portNumber} (mode: ${mode})`);

  if (instance.process !== undefined)
  {
    const childProcess = instance.process;
    childProcess.stdout?.destroy();
    childProcess.stderr?.destroy();

    await killProcess(childProcess);

    if (childProcess.exitCode === null)
    {
      await new Promise<void>(
        (resolve) =>
        {
          childProcess.once(
            "exit",
            () =>
            {
              resolve();
            }
          );
          setTimeout(resolve, 500);
        }
      );
    }
  }
  else if (instance.container !== undefined)
  {
    await instance.container.stop();
  }

  logger.info("The Chroma server has been stopped");
}
