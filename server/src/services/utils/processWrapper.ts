import fs from "node:fs";
// Taken form https://github.com/sindresorhus/file-metadata/blob/main/index.js
import os from "node:os";
import process from "node:process";
import {
  ChildProcess,
  CommonOptions,
  exec,
  ExecException,
  ExecOptions,
  execSync,
  fork as processFork,
  ForkOptions,
  spawn as processSpawn,
  SpawnOptions,
  StdioOptions
} from "node:child_process";
import Timers from "node:timers";
import { text } from "node:stream/consumers";

import { logger } from "../../logger";


const defaultStdio: StdioOptions = ["inherit", "inherit", "inherit"];

export type ProcessResult = { stdout: string, stderr: string | undefined };

function computeCommand(executable: string, parameters: string[] | undefined): string
{
  const actualExecutable = executable.indexOf(" ") === -1 ? executable : `"${executable}"`;
  return `${actualExecutable}${(parameters === undefined || parameters.length === 0) ? "" : (" " + parameters.join(" "))}`;
}

export function wasSpawnViaShellWithFaultyProcessId(childProcess: ChildProcess): boolean
{
  const platform = os.platform();
  // On Linux and Windows, it looks like when the spawn "options.shell" property is set to "true", this causes the spawn of an intermediate shell process, which spawns the expected one on its turn, but the accessible runtime process "id" (identifier) is incorrect, because it is equal to the shell and not the child process
  // On Windows, the spawn file path is usually "C:\Windows\system32\cmd.exe" or "cmd.exe" in case of the GitHub CI / CD
  const windowsCommandSpawnFilePathSuffix = "cmd.exe";
  const result = (platform === "linux" && childProcess.spawnfile === "/bin/sh") || (platform === "win32" && childProcess.spawnfile.endsWith(windowsCommandSpawnFilePathSuffix) === true);
  logger.debug(`It seems that the process with is id '${childProcess.pid}' was ${result === true ? "" : "not "}spawned via a shell with a faulty process id`);
  return result;
}

export function isProcessAlive(processId: number): boolean
{
  logger.debug(`Assessing whether the process with id '${processId}' is alive`);
  let isAlive = false;
  try
  {
    // Taken from https://stackoverflow.com/questions/14390930/how-to-check-if-an-arbitrary-pid-is-running-using-node-js and https://stackoverflow.com/questions/57285590/nodejs-how-to-check-independently-a-process-is-running-by-pid
    isAlive = process.kill(processId, 0);
  }
  catch (error)
  {
    // This is expected when the process does not exist anymore
    const theError = error as Error;
    if (("code" in theError) === false)
    {
      throw new Error("Cannot determine whether a process is still alive");
    }
    if (theError.code !== "ESRCH")
    {
      logger.warn(`An error occurred while assessing whether the process with id '${processId}' is still alive`, error);
    }
    isAlive = theError.code === "EPERM";
  }
  logger.debug(`The assessment revealed that the process with id '${processId}' ${isAlive === true ? "is alive" : "does not exist"}`);
  return isAlive;
}

export async function getChildProcessIds(childProcessOrId: ChildProcess | number): Promise<number[]>
{
  // We do not use anymore the "ps-tree" library, because it resorts to the "wmic.exe", which is being deprecated on Windows, see https://github.com/indexzero/ps-tree/issues/58
  const processId = childProcessOrId instanceof ChildProcess ? childProcessOrId.pid : childProcessOrId;
  if (processId === undefined)
  {
    // The process does not seem to be running anymore
    return [];
  }
  logger.debug(`Getting the child process ids of the process with id '${processId}'`);

  async function requestChildProcessIds(parentProcessId: number): Promise<number[]>
  {
    let command: string;
    const timeoutInSeconds = 2;
    if (os.platform() === "win32")
    {
      // On Windows, we resort to PowerShell command using CIM / WMI
      command = ["powershell", "-NoProfile -NonInteractive -Command", `"Get-CimInstance Win32_Process -Filter "ParentProcessId=${parentProcessId}" -ErrorAction SilentlyContinue -OperationTimeoutSec ${timeoutInSeconds} | Select-Object -ExpandProperty ProcessId"`, "3>&1 4>&1 5>&1 6>&1"].join(" ");
    }
    else if (os.platform() === "darwin")
    {
      // On macOS (BSD ps) we use a combination of "ps" and "awk"
      command = `ps -axo pid,ppid | grep -w "${parentProcessId}" | awk '{print $1}'`;
    }
    else
    {
      // On other platforms (Linux), we use "ps"
      command = `ps -o pid= --ppid ${parentProcessId}`;
    }
    const processResultPromise = execute(command, null);
    let gotProcessResult: ProcessResult | undefined;
    const timeoutPromise = new Promise<ProcessResult>((resolve, reject) =>
    {
      const milliseconds = timeoutInSeconds * 1_000;
      Timers.setTimeout(() =>
      {
        if (gotProcessResult === undefined)
        {
          reject(new Error(`The '${command}' command did not received a response within ${milliseconds} ms`));
        }
        else
        {
          resolve(gotProcessResult);
        }
      }, milliseconds);
    });
    const processResult = await Promise.race([processResultPromise, timeoutPromise]);
    gotProcessResult = processResult;
    const processIds = processResult.stdout.split(/\r?\n/).map(line => line.trim()).filter(line => /^\d+$/.test(line)).map(Number);
    const index = processIds.indexOf(parentProcessId);
    if (index !== -1)
    {
      processIds.splice(index, 1);
    }
    logger.debug(`The process with id '${processId}' child process ids are [${processIds.map(id =>
    {
      return `'${id}'`;
    }).join(", ")}]`);
    return processIds;
  }

  async function getProcessTree(parentProcessId: number): Promise<number[]>
  {
    const descendantProcessIds = new Set<number>();

    async function walk(processId: number): Promise<void>
    {
      const childrenProcessIds = await requestChildProcessIds(processId);
      for (const childProcessId of childrenProcessIds)
      {
        if (descendantProcessIds.has(childProcessId) === false)
        {
          descendantProcessIds.add(childProcessId);
          await walk(childProcessId);
        }
      }
    }

    await walk(parentProcessId);
    return [...descendantProcessIds];
  }

  const processIds = await getProcessTree(processId);
  logger.info(`The ids of the child processes of the process with id '${processId}' are [${processIds.map(id =>
  {
    return `'${id}'`;
  }).join(", ")}]`);
  return processIds;
}

export async function execute(executableOrCommand: string, parameters?: string[] | null, cwd?: string, env?: NodeJS.ProcessEnv, withCallback: boolean = true): Promise<ProcessResult>
{
  const command = parameters === null ? executableOrCommand : computeCommand(executableOrCommand, parameters);
  const options: CommonOptions = { windowsHide: true };
  if (cwd !== undefined)
  {
    options.cwd = cwd;
  }
  if (env !== undefined)
  {
    options.env = env;
  }
  const logFragment = `the process command '${command}'${cwd === undefined ? "" : ` in the directory '${cwd}'`}${env === undefined ? "" : (" with environment variables " + JSON.stringify(env))}`;
  if (parameters !== null && fs.existsSync(executableOrCommand) === false)
  {
    // We even do not want to try to execute a non-existing binary
    throw new Error(`Will not execute the ${logFragment} because the executable binary '${executableOrCommand}' does not exist`);
  }
  // We could also use a micro library such as tinyspawn, https://github.com/microlinkhq/tinyspawn
  if (withCallback === false)
  {
    logger.debug(`Executing ${logFragment}`);
    const specificOptions: ExecOptions = options;
    return new Promise((resolve, reject) =>
    {
      exec(command, specificOptions, (error: ExecException | null, stdout: string, stderr: string) =>
      {
        const newError = computeProcessError(`with command '${command}'`, (error === null || error.code === undefined) ? null : error.code, (error === null || error.signal === undefined) ? null : error.signal);
        if (newError !== undefined)
        {
          reject(newError);
        }
        else
        {
          resolve({ stdout, stderr });
        }
      });
    });
  }
  else
  {
    const specificOptions: ExecOptions = options;
    // We increase the default buffer size of 1 MB to 10 MB in order to be able to capture larger outputs and prevent from facing stdout deadlock issues
    specificOptions.maxBuffer = 4 * 1024 * 1024;
    const childProcess: ChildProcess = exec(command, specificOptions);
    if (childProcess.pid === undefined)
    {
      throw new Error(`Could not execute the process command '${command}' in the working directory '${cwd}'`);
    }
    logger.debug(`Executing ${logFragment} with id '${childProcess.pid}' and with spawn file '${childProcess.spawnfile}'`);
    return await waitForWithOutputs(childProcess);
  }
}

export async function which(command: string): Promise<string>
{
  let stdout: Buffer;
  try
  {
    const cliCommand = os.platform() === "win32" ? "where" : "which";
    const fullCommand = `${cliCommand} ${command}`;
    logger.debug(`Executing the '${fullCommand}' command to determine the absolute path of the '${command}' command`);
    stdout = execSync(fullCommand, {});
  }
  catch (error)
  {
    throw new Error(`The '${command}' command is not accessible`);
  }
  // On Windows, multiple lines may be returned, one per matching executable: we take the first one, which should be the one with the highest priority, i.e. the first one of the "PATH" environment variable
  const lines = stdout.toString().split("\n");
  const filePath = lines[0];
  return filePath.trim();
}

export function spawn(executable: string, parameters: string[], cwd?: string | undefined, env?: NodeJS.ProcessEnv | undefined, shell?: boolean | string | undefined, stdio?: StdioOptions | null): ChildProcess
{
  const command = computeCommand(executable, parameters);
  const options: SpawnOptions =
    {
      detached: false,
      // We log the process output to the hereby parent process, unless stated differently
      stdio: stdio === null ? undefined : (stdio ?? defaultStdio),
      // On Windows, we do not want to open a subprocess window
      windowsHide: true
    };
  if (cwd !== undefined)
  {
    options.cwd = cwd;
  }
  if (env !== undefined)
  {
    options.env = env;
  }
  if (shell !== undefined)
  {
    // Caution: on Linux and Windows, it looks like this option, when set to true, causes the spawn of an intermediate shell process, which spawns the expected one on its turn, but the accessible runtime process "id" (identifier) is incorrect, because it is equal to the shell and not the child process
    // TODO: on Windows, use the "exit" event when the shell option is used, in order to send a signal to the child, via the "SIGINT" signal
    options.shell = shell;
  }
  // When using a shell, the command should be passed as a single string, as discussed at https://github.com/nodejs/help/issues/5063
  const childProcess: ChildProcess = options.shell === true ? processSpawn(command, options) : processSpawn(executable, parameters, options);
  const mainLogFragment = `${options.shell === true ? "via a shell" : "with no shell"} the process${childProcess.pid === undefined ? "" : ` with id '${childProcess.pid}'`}${options.cwd === undefined ? "" : ` in working directory '${options.cwd}'`}${options.env === undefined ? "" : (" with environment variables " + JSON.stringify(options.env))} through the command '${command}'`;
  if (childProcess.pid === undefined)
  {
    // This is a work-around, because if we do not set this error listener, the process exits
    childProcess.once("error", (error: Error) =>
    {
      // TODO: investigate on whether we could handle this situation differently
      // This happens when the executable binary does not exist
      if ("code" in error && error.code === "ENOENT")
      {
        // The binary executable does not exist
      }
      else
      {
        // The root cause is unknown
      }
    });
    throw new Error(`Could not spawn ${mainLogFragment} ${fs.existsSync(executable) === false ? `because the binary '${executable}' does not exist` : "for an unknown reason"}`);
  }
  logger.debug(`Spawned ` + mainLogFragment + ` and with spawn file '${childProcess.spawnfile}'`);
  return childProcess;
}

export async function spawnAndWait(executable: string, parameters: string[], cwd?: string | undefined, env?: NodeJS.ProcessEnv | undefined, shell?: boolean | string | undefined, stdio?: StdioOptions | null): Promise<void>
{
  const childProcess = spawn(executable, parameters, cwd, env, shell, stdio);
  await waitFor(childProcess);
}

// The way to fork the Node.js part of the application is explained at https://www.matthewslipper.com/2019/09/22/everything-you-wanted-electron-child-process.html
export function fork(modulePath: string, parameters: string[], cwd?: string, stdio?: StdioOptions | null): ChildProcess
{
  const command = computeCommand(modulePath, parameters);
  const options: ForkOptions =
    {
      cwd,
      detached: false,
      // We log the process output to the hereby parent process, unless stated differently
      stdio: stdio === null ? undefined : (stdio ?? defaultStdio)
    };
  const childProcess: ChildProcess = processFork(modulePath, parameters, options);
  if (childProcess.pid === undefined)
  {
    throw new Error(`Could not fork the process in working directory '${cwd}' through the command '${command}'`);
  }
  logger.debug(`Forked the process with id '${childProcess.pid}' in working directory '${cwd}' through the command '${command}' and with spawn file '${childProcess.spawnfile}'`);
  return childProcess;
}

export async function waitForWithOutputs(childProcess: ChildProcess): Promise<ProcessResult>
{
  const { stdout, stderr } = childProcess;
  const stdoutPromise = text(stdout!);
  const stderrPromise = text(stderr!);
  await waitFor(childProcess);

  const stdoutString: string | undefined = stdout === null ? undefined : await stdoutPromise;
  const stderrString: string | undefined = stderr === null ? undefined : await stderrPromise;
  if (stdoutString === undefined)
  {
    throw new Error(`The process with id '${childProcess.pid}' exited with an empty stdout`);
  }
  else
  {
    return { stdout: stdoutString, stderr: stderrString };
  }
}

function computeProcessError(processDesignator: string | undefined, code: number | null, signal: NodeJS.Signals | null): Error | undefined
{
  const hasErrorExitCode = code !== null && code !== 0;
  const hasSignal = signal !== null;
  const isAbnormalExit = hasErrorExitCode === true || hasSignal === true;

  if (isAbnormalExit === true)
  {
    return new Error(`The process ${processDesignator === undefined ? "" : (`${processDesignator} `)}exited${(hasErrorExitCode === true) ? ` with code ${code}` : (signal !== null) ? ` with signal '${signal}'` : ""}`);
  }
  else
  {
    return undefined;
  }
}

export async function waitFor(childProcess: ChildProcess): Promise<void>
{
  return await new Promise<void>((resolve, reject) =>
  {
    childProcess.on("exit", async (code: number | null, signal: NodeJS.Signals | null) =>
    {
      const error = computeProcessError(`with id '${childProcess.pid}'`, code, signal);
      if (error !== undefined)
      {
        reject(error);
      }
      else
      {
        logger.debug(`The process with id '${childProcess.pid}' successfully exited`);
        resolve();
      }
    });
  });
}

export async function killProcess(childProcess: ChildProcess, signal: NodeJS.Signals | number = "SIGTERM"): Promise<void>
{
  // TODO: should we re-expose that parameter?
  const timeoutInMilliseconds: undefined | number = undefined;
  const stopProcessesIndividually = wasSpawnViaShellWithFaultyProcessId(childProcess);
  logger.debug(`Stopping the process with id '${childProcess.pid}' via the '${signal}' signal${stopProcessesIndividually === false ? "" : ", resorting to a work-around for terminating its child processes"}`);
  if (stopProcessesIndividually === false)
  {
    childProcess.kill(signal);
    if (timeoutInMilliseconds !== undefined)
    {
      return new Promise<void>((resolve, reject) =>
      {
        let alreadyResolvedOrRejected = false;
        Timers.setTimeout(() =>
        {
          if (alreadyResolvedOrRejected === false)
          {
            alreadyResolvedOrRejected = true;
            reject();
          }
        }, timeoutInMilliseconds);
        childProcess.on("exit", () =>
        {
          logger.debug(`The process with id '${childProcess.pid}' has exited`);
          if (alreadyResolvedOrRejected === false)
          {
            alreadyResolvedOrRejected = true;
            resolve();
          }
        });
      });
    }
  }
  else
  {
    // We kill the subprocesses, which will ultimately cause the parent process to stop as well
    const childProcessIds = await getChildProcessIds(childProcess);
    for (const processId of childProcessIds)
    {
      killProcessViaId(processId, signal);
    }
  }
}

export function killProcessViaId(processId: number, signal?: NodeJS.Signals | number): void
{
  logger.debug(`Stopping the process with id '${processId}' via the '${signal}' signal`);
  try
  {
    process.kill(processId, signal);
  }
  catch (error)
  {
    logger.warn(`An unexpected error occurred while attempting to kill the process with id '${processId}' via the '${signal} signal'`, error);
    const theError = error as Error;
    if (("code" in theError) === false)
    {
      throw new Error("Cannot determine why the process could not be killed");
    }
    if (theError.code !== "ESRCH")
    {
      throw error;
    }
  }
}

export async function stopProcessGracefully(childProcess: ChildProcess, gracePeriodDurationInMilliseconds: number, logFragment?: string): Promise<void>
{
  const stopProcessesIndividually = wasSpawnViaShellWithFaultyProcessId(childProcess);
  const processId = childProcess.pid;
  if (processId === undefined)
  {
    throw new Error("Cannot stop gracefully a process with an undefined process id");
  }
  const terminationSignal = "SIGTERM";
  const processIds: number[] = [];
  let resortToWorkAround = stopProcessesIndividually;
  if (stopProcessesIndividually === true)
  {
    try
    {
      const childProcessIds = await getChildProcessIds(childProcess);
      processIds.push(...childProcessIds, processId);
    }
    catch (error)
    {
      logger.warn(`Cannot determine the child processes of the process with id '${processId}': no action will be performed on its child processes`, error);
      processIds.push(processId);
      resortToWorkAround = false;
    }
  }
  logger.debug(`Stopping gracefully the process with id '${processId}'${resortToWorkAround === false ? "" : ", resorting to a work-around for terminating its child processes"}`);
  const getStillAliveProcessIds = (): number[] =>
  {
    const aliveProcessIds = [];
    for (const processId of processIds)
    {
      if (isProcessAlive(processId) === true)
      {
        aliveProcessIds.push(processId);
      }
    }
    return aliveProcessIds;
  };
  const promise = new Promise<void>((resolve) =>
  {
    let isAlreadyResolved = false;
    Timers.setTimeout(async () =>
    {
      // We have a grace period for the process to handle the "SIGTERM" signal: if, after this period the process is still alive, we abort it
      // An insightful article regarding the "death" of a Node.js process event: https://thomashunter.name/posts/2021-03-08-the-death-of-a-nodejs-process
      if (isAlreadyResolved === false)
      {
        const killSignal = "SIGKILL";
        if (stopProcessesIndividually === false)
        {
          logger.warn(`The process with id '${process.pid}'${logFragment === undefined ? "" : logFragment} is still running: it will now be killed`);
          await killProcess(childProcess, killSignal);
        }
        else
        {
          const stillAliveProcessIds = getStillAliveProcessIds();
          for (const processId of stillAliveProcessIds)
          {
            logger.warn(`The process with id '${processId}'${logFragment === undefined ? "" : logFragment} is still running: it will now be killed`);
            killProcessViaId(processId, killSignal);
          }
        }
        isAlreadyResolved = true;
        resolve();
      }
    }, gracePeriodDurationInMilliseconds);
    if (stopProcessesIndividually === false)
    {
      childProcess.on("exit", () =>
      {
        if (isAlreadyResolved === false)
        {
          isAlreadyResolved = true;
          resolve();
        }
      });
    }
    else
    {
      const interval = Timers.setInterval(() =>
      {
        const stopInterval = () =>
        {
          logger.debug(`Stops from waiting for all the processes related to the one with id '${processId}' to be terminated`);
          clearInterval(interval);
        };
        if (isAlreadyResolved === false)
        {
          stopInterval();
        }
        else
        {
          logger.debug(`Still waiting for all the processes related to the one with id '${processId}' to be terminated`);
          if (getStillAliveProcessIds().length === 0)
          {
            stopInterval();
            isAlreadyResolved = true;
            resolve();
          }
        }
      }, 1000 / 60);
    }
  });
  // We send a termination signal the process, so that it can stop gracefully
  if (stopProcessesIndividually === false)
  {
    await killProcess(childProcess, terminationSignal);
  }
  else
  {
    const stillAliveProcessIds = getStillAliveProcessIds();
    for (const processId of stillAliveProcessIds)
    {
      killProcessViaId(processId, terminationSignal);
    }
  }
  // And we wait for the process to be over
  await promise;
}
