import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import * as IO from "socket.io-client";
import waitForExpect from "wait-for-expect";
import fastCartesian from "fast-cartesian";
import HttpCodes from "http-codes";
import Bottleneck from "bottleneck";

import { Prisma } from ".prisma/client";

import { paths } from "../src/paths";
import { logger } from "../src/logger";
import { Base, Core } from "./base";
import { ImageSearchParameters, Manifest, toMimeType } from "../src/dtos/app.dtos";
import { plainToInstanceViaJSON } from "../src/utils";
import { ServiceError } from "../src/app.exceptions";
import { EventEntity, ImageEventAction, Notifier, RepositoryEventAction, TextEventAction } from "../src/notifier";
import { AuthenticationGuard } from "../src/app.guards";
import {
  execute,
  getChildProcessIds,
  isProcessAlive,
  killProcess,
  killProcessViaId,
  ProcessResult,
  spawn,
  stopProcessGracefully,
  waitFor,
  wasSpawnViaShellWithFaultyProcessId,
  which
} from "../src/services/utils/processWrapper";
import { ensureDirectory, getTemporaryDirectoryPath, move } from "../src/services/utils/downloader";
import {
  environmentVariableChecker,
  parametersChecker,
  StringLengths,
  StringNature
} from "../src/services/utils/parametersChecker";
import { computeAjv, validateJsonSchema, validateSchema } from "../src/services/utils/ajvWrapper";
import { DeepObjectPipeTransform } from "../src/controllers/app.pipes";
import { WatcherEvent, watchPath } from "../src/services/utils/pathWatcher";
import {
  computePythonVersion,
  getPythonFilePath,
  pythonExecutable,
  pythonVersion
} from "../src/services/utils/pythonWrapper";
import { Resizer } from "../src/resizer";

const { io } = IO;

const { OK, BAD_REQUEST, FORBIDDEN, INTERNAL_SERVER_ERROR } = HttpCodes;


describe("Miscellaneous bare", () =>
{

  const core = new Core();

  const dummyExecutable = "/bin/dummybin";

  const isPlatformWindows = process.platform === "win32";

  const isPlatformWindowsOrLinux = isPlatformWindows || process.platform === "linux";

  const windowsPingExecutableFilePath = `C:\\Windows\\System32\\PING.EXE`;

  beforeAll(async () =>
  {
    await Core.beforeAll();
  });

  beforeEach(async () =>
  {
    await core.beforeEach();
  }, Core.beforeAfterTimeoutInMilliseconds);

  afterEach(async () =>
  {
    await core.afterEach();
  }, Core.beforeAfterTimeoutInMilliseconds);

  afterAll(async () =>
  {
    await Core.afterAll();
  });

  test("which", async () =>
  {
    {
      const command = "dummybin";
      await expect(async () =>
      {
        await which(command);
      }).rejects.toThrow(new Error(`The '${command}' command is not accessible`));
    }
    {
      const isWindows = isPlatformWindows;
      const command = isWindows === true ? "ping" : "ls";
      const result = await which(command);
      const expectedLocation = isWindows === true ? `C:${path.sep}Windows${path.sep}System32${path.sep}PING.EXE` : `${process.platform === "linux" ? "/usr" : ""}/bin/ls`;
      expect(result).toEqual(expectedLocation);
    }
  });

  test.each([false, true])("getChildProcessIds with shell=%p", async (shell) =>
  {
    {
      // We assess with a non-existent process
      expect(await getChildProcessIds(123456789)).toEqual([]);
    }
    const directoryPath = core.getWorkingDirectoryPath();
    const pidFileName = "pid.txt";
    const pidFilePath = path.join(directoryPath, pidFileName);
    const childNodeJavaScript = `console.log('Child process with id ' + process.pid + ' started'); const fs = require('fs'); fs.writeFileSync('${pidFileName}', process.pid.toString(), { encoding: 'utf8' }); setTimeout(() => { process.exit(0); }, 1_000_000);`;
    const javaScriptFileName = "javascript.js";
    const javaScriptFilePath = path.join(core.getWorkingDirectoryPath(), javaScriptFileName);
    fs.writeFileSync(javaScriptFilePath, childNodeJavaScript);
    const childProcessArguments = `'${javaScriptFileName}'`;
    const parentProcessForkJavaScriptStatement = `const { fork } = require('node:child_process'); const childProcess = fork(${childProcessArguments}, { cwd: process.cwd() }); console.log('The parent started the process with id ' + childProcess.pid + ' started'); childProcess.on('exit', (code) => { console.info('Child process exited with code ' + code); }); childProcess.on('error', (error) => { console.error(error); });`;
    const parentProcessJavaScript = `console.info('Parent process starting with id ' + process.pid); setTimeout(() => { process.exit(0); }, 1_000_000); ${parentProcessForkJavaScriptStatement}`;
    const parentProcess = spawn(process.execPath, ["--eval", shell === true ? `"${parentProcessJavaScript}"` : parentProcessJavaScript], path.resolve(pidFilePath, ".."), undefined, shell);
    try
    {
      await core.wait(Core.fastestIntervalInMilliseconds * 5);
      expect(parentProcess.exitCode).toBeNull();
      await core.waitUntil(async () =>
      {
        return fs.existsSync(pidFilePath);
      });
      const childProcessIds = await getChildProcessIds(parentProcess);
      expect(childProcessIds.length).toEqual((isPlatformWindows === true && shell === true) ? 2 : 1);
      const expectedChildProcessId = Number.parseInt(fs.readFileSync(pidFilePath, { encoding: "utf8" }), 10);
      const knownChildProcessId = childProcessIds[childProcessIds.length - 1];
      expect(knownChildProcessId).toEqual(expectedChildProcessId);
    }
    finally
    {
      const signal = "SIGKILL";
      const childProcessIds = await getChildProcessIds(parentProcess);
      for (const childProcessId of childProcessIds)
      {
        killProcessViaId(childProcessId, signal);
      }
      await killProcess(parentProcess, signal);
      const allProcessIds = [...childProcessIds];
      if (parentProcess.pid !== undefined)
      {
        allProcessIds.push(parentProcess.pid);
      }
      await core.waitUntil(async () =>
      {
        return allProcessIds.filter((processId) => isProcessAlive(processId) === true).length === 0;
      });
    }
  });

  test.each([true, false])("execute with stdio=%p", async (withCallback: boolean) =>
  {
    const env = undefined;
    {
      // We assess with a non-existent binary executable
      const parameters = "--help";
      await expect(async () =>
      {
        await execute(dummyExecutable, [parameters], undefined, env, withCallback);
      }).rejects.toThrow(new Error(`Will not execute the the process command '${dummyExecutable} ${parameters}' because the executable binary '${dummyExecutable}' does not exist`));
    }

    {
      // We assess with a valid executable binary but which exits with a non-zero code
      const directoryPath = core.prepareEmptyDirectory("dummybin");
      const fileName = "file";
      fs.writeFileSync(path.join(directoryPath, fileName), "");

      function checkResult(result: ProcessResult, fileName: string)
      {
        expect(result.stderr).toEqual("");
        if (isPlatformWindows === true)
        {
          expect(result.stdout).toContain("ms");
        }
        else
        {
          expect(result.stdout).toEqual(fileName + "\n");
        }
      }

      const parameters = isPlatformWindows ? ["localhost"] : [];
      const executable = isPlatformWindows ? windowsPingExecutableFilePath : ((process.platform === "linux" ? "/usr" : "") + "/bin/ls");
      {
        // We separate the executable and the parameters
        const result = await execute(executable, parameters, directoryPath, env, withCallback);
        checkResult(result, fileName);
      }
      {
        // We combine both
        const result = await execute([executable, ...parameters].join(" "), null, directoryPath, env, withCallback);
        checkResult(result, fileName);
      }
    }
  });

  test("spawn", async () =>
  {
    {
      // We assess with a non-existent binary executable
      const option = "--help";
      expect(() =>
      {
        spawn(dummyExecutable, [option], undefined, undefined);
      }).toThrow(new Error(`Could not spawn with no shell the process through the command '${dummyExecutable} ${option}' because the binary '${dummyExecutable}' does not exist`));
    }
    {
      // We assess with a non-existent command in a shell
      const nonExistingCommand = "dummyCommand";
      const childProcess = spawn(nonExistingCommand, [], undefined, undefined, true);
      await expect(async () =>
      {
        await waitFor(childProcess);
      }).rejects.toThrow(new Error(`The process with id '${childProcess.pid}' exited with code ${isPlatformWindows === true ? 1 : 127}`));
    }
    for (const shell of [false, true])
    {
      // We assess with a command which exits with a non-zero code
      const command = process.execPath;
      const exitCode = 10;
      const options = ["--eval", `process.exit(${exitCode});`];
      const childProcess = spawn(command, options, undefined, undefined, shell);
      await expect(async () =>
      {
        await waitFor(childProcess);
      }).rejects.toThrow(new Error(`The process with id '${childProcess.pid}' exited with code ` + ((shell === true && isPlatformWindows === false) ? 2 : exitCode)));
    }
  });

  test("Python executable", async () =>
  {
    const filePath = await getPythonFilePath(pythonVersion);
    expect(filePath).toBeDefined();
    expect(filePath.endsWith(isPlatformWindows === true ? pythonExecutable : `/bin/${pythonExecutable}`)).toBe(true);

    const version = await computePythonVersion(filePath);
    expect(version.startsWith("3.")).toBe(true);
  });

  test.each(fastCartesian([[0, 400], [true, false]]))("spawn Node.js --eval with timeout=%p and shell=%p", async (timeoutInMilliseconds, shell) =>
  {
    const milliseconds = Date.now();
    // When Node.js is not run through a shell intermediate process, the spawn Node.js process exits immediately
    const childProcess = spawn(process.execPath, ["--eval", `"setTimeout(() => {}, ${timeoutInMilliseconds});"`], undefined, undefined, shell);
    let withExitCode: number | null = null;
    let withSignal: string | null = null;
    childProcess.on("exit", (exitCode: number | null, signal: string | null) =>
    {
      withExitCode = exitCode;
      withSignal = signal;
    });
    await waitFor(childProcess);
    expect(withExitCode).toEqual(0);
    expect(withSignal).toEqual(null);
    const elapsedInMilliseconds = Date.now() - milliseconds;
    if (shell === false)
    {
      if (timeoutInMilliseconds > 0)
      {
        expect(elapsedInMilliseconds).toBeLessThan(timeoutInMilliseconds);
      }
    }
    else
    {
      expect(elapsedInMilliseconds).toBeGreaterThanOrEqual(timeoutInMilliseconds);
    }
  });

  test("kill shell process", async () =>
  {
    const getPs = async (processIds: number []): Promise<Map<number, string>> =>
    {
      const psProcess = spawn("ps", ["-aef", "|", "cat"], core.getWorkingDirectoryPath(), undefined, true, "pipe");
      let psStdout = "";
      psProcess.stdout?.on("data", (stdout: string) =>
      {
        psStdout += stdout;
      });
      await waitFor(psProcess);
      const lines = psStdout.split("\n");
      const perIdString: Map<number, string> = new Map();
      for (const line of lines)
      {
        for (const processId of processIds)
        {
          const index = line.indexOf(` ${processId} `);
          if (index !== -1)
          {
            let matches = true;
            for (const otherProcessId of processIds)
            {
              if (otherProcessId === processId)
              {
                continue;
              }
              const otherIndex = line.indexOf(` ${otherProcessId} `);
              if (otherIndex !== -1 && otherIndex < index)
              {
                matches = false;
                break;
              }
            }
            if (matches === true)
            {
              perIdString.set(processId, line);
            }
          }
        }
      }
      return perIdString;
    };
    const filePath = path.join(core.getWorkingDirectoryPath(), "running.txt");
    const childProcess = spawn(process.execPath, ["--eval", `"${core.computeProcessJavaScriptCode(path.basename(filePath), false)}"`], core.getWorkingDirectoryPath(), undefined, true);
    await core.wait(Core.fastestIntervalInMilliseconds * 15);
    const childProcessIds = await getChildProcessIds(childProcess);
    expect(childProcessIds.length).toBe(isPlatformWindowsOrLinux === true ? 1 : 0);
    const childProcessId = childProcessIds[0];

    const assessViaPs = process.platform === "linux" || process.platform === "darwin";
    const processId = childProcess.pid!;
    const allProcessesIds = [processId];
    if (childProcessId !== undefined)
    {
      allProcessesIds.push(childProcessId);
    }
    if (assessViaPs === true)
    {
      const perIdString = await getPs(allProcessesIds);
      const isLinux = process.platform === "linux";
      expect(perIdString.size).toBe(isLinux === true ? 2 : 1);
      expect(perIdString.get(isLinux === true ? childProcessId : processId)).toContain(" --eval ");
      if (isLinux === true)
      {
        expect(perIdString.get(processId)).toContain("/bin/sh");
      }
    }
    await killProcess(childProcess, "SIGTERM");
    await core.wait(Core.fastestIntervalInMilliseconds * 15);
    if (assessViaPs === true)
    {
      const perIdString = await getPs(allProcessesIds);
      expect(perIdString.size).toBe(0);
    }
    for (const processId of allProcessesIds)
    {
      expect(isProcessAlive(processId)).toBe(false);
    }
  });

  test.each([false, true])("stop shell process and reject SIGTERM=%p", async (willNotRespondToTermination) =>
  {
    const filePath = path.join(core.getWorkingDirectoryPath(), "running.txt");
    const childProcess = spawn(process.execPath, ["--eval", `"${core.computeProcessJavaScriptCode(path.basename(filePath), false, undefined, willNotRespondToTermination)}"`], core.getWorkingDirectoryPath(), undefined, true);
    const processIds = await getChildProcessIds(childProcess);
    const effectDurationInMilliseconds = Core.fastestIntervalInMilliseconds * 30;
    await core.wait(effectDurationInMilliseconds);
    await killProcess(childProcess, "SIGTERM");
    await core.wait(effectDurationInMilliseconds);
    fs.rmSync(filePath);
    await core.wait(effectDurationInMilliseconds);
    const willNotBeImmediatelyTerminated = willNotRespondToTermination === true && isPlatformWindows === false;
    expect(fs.existsSync(filePath)).toBe(willNotBeImmediatelyTerminated);
    const specificCheck = wasSpawnViaShellWithFaultyProcessId(childProcess);
    const shellChildProcessId = specificCheck === true ? processIds[0] : childProcess.pid!;

    const isProcessStillAlive = isProcessAlive(shellChildProcessId);
    expect(isProcessStillAlive).toBe(willNotBeImmediatelyTerminated);
    if (willNotBeImmediatelyTerminated === true)
    {
      // We kill the process so that there is no remaining zombie
      killProcessViaId(shellChildProcessId, "SIGKILL");
      await core.wait(effectDurationInMilliseconds);
      expect(isProcessAlive(shellChildProcessId)).toBe(false);
      if (isPlatformWindowsOrLinux === true)
      {
        await stopProcessGracefully(childProcess, 100);
      }
    }
  });

  test.each([false, true])("stop gracefully shell process and reject SIGTERM=%p", async (willNotRespondToTermination: boolean) =>
  {
    const filePath = path.join(core.getWorkingDirectoryPath(), "running.txt");
    const milliseconds = Core.fastestIntervalInMilliseconds;
    const childProcess = spawn(process.execPath, ["--eval", `"${core.computeProcessJavaScriptCode(path.basename(filePath), false, undefined, willNotRespondToTermination, milliseconds, milliseconds * 3)}"`], core.getWorkingDirectoryPath(), undefined, true);
    const effectDurationInMilliseconds = milliseconds * 30;
    await core.wait(effectDurationInMilliseconds);
    const gracePeriodDurationInMilliseconds = 200;
    await stopProcessGracefully(childProcess, gracePeriodDurationInMilliseconds);
    await core.wait(effectDurationInMilliseconds);
    fs.rmSync(filePath);
    await core.wait(effectDurationInMilliseconds);
    expect(fs.existsSync(filePath)).toBe(false);
    expect(isProcessAlive(childProcess.pid!)).toBe(false);
  });

  test("Manifest", async () =>
  {
    const id = "id";
    const executable = "echo";
    const argument1 = "dummy";
    const string = `{ "id": "${id}", "instructions": [ { "execution": { "executable": "${executable}", "arguments": ["${argument1}"] } } ] }`;
    const object = JSON.parse(string);
    const manifest: Manifest = plainToInstanceViaJSON(Manifest, object);
    expect(manifest.id).toBe(id);
    expect(manifest.instructions).toBeDefined();
    expect(manifest.instructions.length).toEqual(1);
    const instruction = manifest.instructions[0];
    expect(instruction.execution).toBeDefined();
    expect(instruction.execution.executable).toBe(executable);
    expect(instruction.execution.arguments[0]).toBe(argument1);
  });

  test("ensureDirectory", async () =>
  {
    const mainDirectoryPath = path.join(core.getWorkingDirectoryPath(), "main");
    fs.mkdirSync(mainDirectoryPath, { recursive: true });
    {
      // We assess with no symbolic link
      {
        // We assess with a non-existing directory
        const directoryPath = path.join(mainDirectoryPath, "dir1");
        for (let index = 0; index < 2; index++)
        {
          ensureDirectory(directoryPath);
          expect(fs.existsSync(directoryPath)).toBe(true);
          expect(fs.lstatSync(directoryPath).isDirectory()).toBe(true);
        }
      }
      {
        // We assess with a non-existent symbolic directory
        const directoryPath = path.join(mainDirectoryPath, "dir2");
        fs.symlinkSync(mainDirectoryPath, directoryPath);
        for (let index = 0; index < 2; index++)
        {
          ensureDirectory(directoryPath);
          expect(fs.existsSync(directoryPath)).toBe(true);
          expect(fs.lstatSync(directoryPath).isSymbolicLink()).toBe(true);
        }
      }
      {
        // We assess with a file which already exists
        const nodePath = path.join(mainDirectoryPath, "path1");
        fs.writeFileSync(nodePath, "");
        expect(() => ensureDirectory(nodePath)).toThrow(new Error(`The path '${nodePath}' already exists and is not a directory`));
      }
      {
        // We assess with a symbolic link which does not exist
        const nodePath = path.join(mainDirectoryPath, "path2");
        fs.symlinkSync("/invalid/path", nodePath);
        expect(() => ensureDirectory(nodePath)).toThrow(new Error(`The path '${nodePath}' points to a symbolic link with a non-existing target`));
      }
    }
    {
      const secondDirectoryPath = path.join(core.getWorkingDirectoryPath(), "second");
      fs.mkdirSync(secondDirectoryPath, { recursive: true });
      // We assess with a symbolic link
      {
        // We assess with a non-existing directory
        const directoryPath = path.join(mainDirectoryPath, "dir3");
        for (let index = 0; index < 2; index++)
        {
          ensureDirectory(directoryPath, secondDirectoryPath, index === 1);
          expect(fs.existsSync(directoryPath)).toBe(true);
          expect(fs.lstatSync(directoryPath).isSymbolicLink()).toBe(true);
        }
      }
      {
        const targetDirectoryPath = path.join(core.getWorkingDirectoryPath(), "target");
        // We assess with a non-existent symbolic directory
        fs.symlinkSync(mainDirectoryPath, targetDirectoryPath);
        const directoryPath = path.join(mainDirectoryPath, "dir4");
        for (let index = 0; index < 1; index++)
        {
          ensureDirectory(directoryPath, targetDirectoryPath, index === 1);
          expect(fs.existsSync(directoryPath)).toBe(true);
          expect(fs.lstatSync(directoryPath).isSymbolicLink()).toBe(true);
        }
      }
      {
        // We assess with a file which already exists
        const nodePath = path.join(secondDirectoryPath, "path1");
        fs.writeFileSync(nodePath, "");
        expect(() => ensureDirectory(nodePath, secondDirectoryPath)).toThrow(new Error(`The path '${nodePath}' already exists and is not the expected symbolic link to '${secondDirectoryPath}'`));
        ensureDirectory(nodePath, secondDirectoryPath, true);
        expect(fs.existsSync(nodePath)).toBe(true);
        expect(fs.lstatSync(nodePath).isSymbolicLink()).toBe(true);
      }
      {
        // We assess with a symbolic link which does not exist
        const nodePath = path.join(secondDirectoryPath, "path2");
        fs.symlinkSync("/invalid/path", nodePath);
        expect(() => ensureDirectory(nodePath, secondDirectoryPath)).toThrow(new Error(`The path '${nodePath}' already exists and is not the expected symbolic link to '${secondDirectoryPath}'`));
        ensureDirectory(nodePath, secondDirectoryPath, true);
        expect(fs.existsSync(nodePath)).toBe(true);
        expect(fs.lstatSync(nodePath).isSymbolicLink()).toBe(true);
      }
    }
  });

  test("moveDirectory", async () =>
  {
    const sourceDirectoryPath = path.join(core.getWorkingDirectoryPath(), "source");
    const targetDirectoryPath = path.join(core.getWorkingDirectoryPath(), "target");
    const fileName = "file.txt";
    const filePath = path.join(targetDirectoryPath, fileName);
    {
      fs.mkdirSync(sourceDirectoryPath);
      fs.writeFileSync(path.join(sourceDirectoryPath, fileName), "");
      await move(sourceDirectoryPath, targetDirectoryPath);
      expect(fs.existsSync(sourceDirectoryPath)).toBe(false);
      expect(fs.existsSync(targetDirectoryPath)).toBe(true);
      expect(fs.existsSync(filePath)).toBe(true);
    }
    {
      fs.mkdirSync(sourceDirectoryPath);
      const newFilePath = path.join(sourceDirectoryPath, fileName);
      await move(filePath, newFilePath);
      expect(fs.existsSync(filePath)).toBe(false);
      expect(fs.existsSync(newFilePath)).toBe(true);
    }
  });

  test("ParametersChecker", async () =>
  {
    const name = "name";
    const errorCode = 3;
    {
      // We assess the file system node name
      {
        // We assess with an invalid value
        const values = [`directory\\a-file-path`, `directory/a-file-path`];
        for (const value of values)
        {
          await expect(async () =>
          {
            parametersChecker.checkString(name, value, StringLengths.Length256, StringNature.FileSystemFileName);
          }).rejects.toThrow(new ServiceError(`The parameter '${name}' with value '${value}' is invalid because it contains illegal characters`, BAD_REQUEST, errorCode));
        }
      }
      {
        // We assess with a valid value
        const values = [`a-file-path`, `a file path`];
        for (const value of values)
        {
          parametersChecker.checkString(name, value, StringLengths.Length256, StringNature.FileSystemFileName);
        }
      }
    }
    {
      // We assess the file node paths
      const directoryPath = getTemporaryDirectoryPath();
      const filePath = path.join(directoryPath, "file");
      fs.writeFileSync(filePath, "");
      const validSymbolicLinkDirectoryPath = path.join(directoryPath, "symbolicDirectory");
      fs.symlinkSync(directoryPath, validSymbolicLinkDirectoryPath);
      const brokenSymbolicLinkDirectoryPath = path.join(directoryPath, "brokenSymbolicDirectory");
      fs.symlinkSync(path.join(directoryPath, randomUUID()), brokenSymbolicLinkDirectoryPath);
      const validSymbolicLinkFilePath = path.join(directoryPath, "symbolicFile");
      fs.symlinkSync(filePath, validSymbolicLinkFilePath);
      const brokenSymbolicLinkFilePath = path.join(directoryPath, "brokenSymbolicFile");
      fs.symlinkSync(path.join(directoryPath, randomUUID()), brokenSymbolicLinkFilePath);

      {
        // We assess with invalid values
        for (const value of [filePath, validSymbolicLinkFilePath])
        {
          await expect(async () =>
          {
            parametersChecker.checkString(name, value, StringLengths.Length256, StringNature.FileSystemDirectoryPath);
          }).rejects.toThrow(new ServiceError(`The parameter '${name}' with value '${value}' is invalid because it does corresponds to a directory`, BAD_REQUEST, errorCode));
        }
        for (const value of [directoryPath, validSymbolicLinkDirectoryPath])
        {
          await expect(async () =>
          {
            parametersChecker.checkString(name, value, StringLengths.Length256, StringNature.FileSystemFilePath);
          }).rejects.toThrow(new ServiceError(`The parameter '${name}' with value '${value}' is invalid because it does corresponds to a file`, BAD_REQUEST, errorCode));
        }
        for (const value of [brokenSymbolicLinkDirectoryPath, brokenSymbolicLinkFilePath])
        {
          for (const nature of [StringNature.FileSystemDirectoryPath, StringNature.FileSystemFilePath])
          {
            await expect(async () =>
            {
              parametersChecker.checkString(name, value, StringLengths.Length256, nature);
            }).rejects.toThrow(new ServiceError(`The parameter '${name}' with value '${value}' is invalid because it corresponds to a broken symbolic link`, BAD_REQUEST, errorCode));
          }
        }
      }
      {
        // We assess with valid values
        parametersChecker.checkString(name, directoryPath, StringLengths.Length256, StringNature.FileSystemDirectoryPath);
        parametersChecker.checkString(name, validSymbolicLinkDirectoryPath, StringLengths.Length256, StringNature.FileSystemDirectoryPath);
        parametersChecker.checkString(name, filePath, StringLengths.Length256, StringNature.FileSystemFilePath);
        parametersChecker.checkString(name, validSymbolicLinkFilePath, StringLengths.Length256, StringNature.FileSystemFilePath);
        parametersChecker.checkString(name, "", StringLengths.Length256, StringNature.FileSystemRelativeDirectoryPath, false, true);
      }
    }
    {
      // We assess with a non-existing environment variable
      const environmentVariableName = randomUUID();
      await expect(async () =>
      {
        environmentVariableChecker.checkString(environmentVariableName, undefined, StringLengths.Length32, StringNature.Free);
      }).rejects.toThrow(new ServiceError(`The '${environmentVariableName}' environment variable is missing`, BAD_REQUEST, errorCode));
    }
  });

  test("JSON schema", async () =>
  {
    const ajv = computeAjv();
    const validate = ajv.getSchema("http://json-schema.org/draft-07/schema#");
    {
      expect(validate!({
        type: "object",
        properties:
          {
            foo: { type: "int" }
          },
        required: ["foo"]
      })).toBeFalsy();
      expect(validate?.errors).toBeDefined();
      expect(validate?.errors?.length).toEqual(3);
    }
    {
      expect(validate!({
        type: "object",
        properties:
          {
            foo: { type: "integer" },
            bar: { type: "string" }
          },
        required: ["foo"]
      })).toBeTruthy();
      expect(validate?.errors).toBeNull();
    }
    {
      expect(validate!({
        type: "object",
        properties:
          {
            userName: {
              type: "string2",
              description: "The identifier",
              minLength: 1,
              maxLength: 64,
              default: "id"
            }
          }
      })).toBeFalsy();
      expect(validate?.errors).toBeDefined();
    }

    {
      // We assess the JSON schema validation
      validateJsonSchema(ajv, {});
      await expect(async () =>
      {
        validateJsonSchema(ajv, { dummy: "value" });
      }).rejects.toThrow(new Error("strict mode: unknown keyword: \"dummy\""));
      await expect(async () =>
      {
        validateJsonSchema(ajv, { type: "invalid" });
      }).rejects.toThrow(new Error("the 'enum' property '/type' must be equal to one of the allowed values"));
    }
    {
      // We assess the JSON schema validation against a value
      {
        const schema =
          {
            type: "object",
            properties:
              {
                favoriteColor:
                  {
                    title: "Favorite color",
                    description: "What is your favorite color?",
                    type: "string",
                    default: "pink"
                  },
                likeChocolate:
                  {
                    title: "Chocolate?",
                    description: "Do you like chocolate?",
                    type: "boolean"
                  }
              },
            required: ["favoriteColor"],
            additionalProperties: false
          };
        const value = { favoriteColor: "pink", age: 35, likeChocolate: true };
        await expect(async () =>
        {
          validateSchema(ajv, schema, value);
        }).rejects.toThrow(new Error("the entity at '/' should not have the 'age' property"));
      }
      {
        // We assess with the unknown "uri" format
        const schema =
          {
            "type": "object",
            "required": [
              "prompt"
            ],
            "properties": {
              "size": {
                "allOf": [
                  {
                    "enum": [
                      "1K",
                      "2K",
                      "4K",
                      "custom"
                    ],
                    "type": "string",
                    "title": "size",
                    "description": "An enumeration."
                  }
                ],
                "default": "2K",
                "description": "Image resolution: 1K (1024px), 2K (2048px), 4K (4096px), or 'custom' for specific dimensions."
              },
              "width": {
                "type": "integer",
                "title": "Width",
                "default": 2048,
                "maximum": 4096,
                "minimum": 1024,
                "description": "Custom image width (only used when size='custom'). Range: 1024-4096 pixels."
              },
              "height": {
                "type": "integer",
                "title": "Height",
                "default": 2048,
                "maximum": 4096,
                "minimum": 1024,
                "description": "Custom image height (only used when size='custom'). Range: 1024-4096 pixels."
              },
              "prompt": {
                "type": "string",
                "title": "Prompt",
                "description": "Text prompt for image generation"
              },
              "max_images": {
                "type": "integer",
                "title": "Max Images",
                "default": 1,
                "maximum": 15,
                "minimum": 1,
                "description": "Maximum number of images to generate when sequential_image_generation='auto'. Range: 1-15. Total images (input + generated) cannot exceed 15."
              },
              "image_input": {
                "type": "array",
                "items": {
                  "type": "string",
                  "format": "uri"
                },
                "title": "Image Input",
                "default": [],
                "description": "Input image(s) for image-to-image generation. List of 1-10 images for single or multi-reference generation."
              },
              "aspect_ratio": {
                "allOf": [
                  {
                    "enum": [
                      "match_input_image",
                      "1:1",
                      "4:3",
                      "3:4",
                      "16:9",
                      "9:16",
                      "3:2",
                      "2:3",
                      "21:9"
                    ],
                    "type": "string",
                    "title": "aspect_ratio",
                    "description": "An enumeration."
                  }
                ],
                "default": "match_input_image",
                "description": "Image aspect ratio. Only used when size is not 'custom'. Use 'match_input_image' to automatically match the input image's aspect ratio."
              },
              "enhance_prompt": {
                "type": "boolean",
                "title": "Enhance Prompt",
                "default": true,
                "description": "Enable prompt enhancement for higher quality results, this will take longer to generate."
              },
              "sequential_image_generation": {
                "allOf": [
                  {
                    "enum": [
                      "disabled",
                      "auto"
                    ],
                    "type": "string",
                    "title": "sequential_image_generation",
                    "description": "An enumeration."
                  }
                ],
                "default": "disabled",
                "description": "Group image generation mode. 'disabled' generates a single image. 'auto' lets the model decide whether to generate multiple related images (e.g., story scenes, character variations)."
              }
            },
            "additionalProperties": false
          };
        const value =
          {
            "size": "2K",
            "width": 2048,
            "height": 2048,
            "prompt": "prompt",
            "max_images": 1,
            "image_input": [],
            "aspect_ratio": "match_input_image",
            "enhance_prompt": true,
            "sequential_image_generation": "disabled"
          };
        validateSchema(ajv, schema, value);
      }
    }
  });

  test.each([[false, false], [true, false], [true, true]])("watchPath with file preexisting=%p and with path as file=%p", async (isFilePreexisting: boolean, isNodeFile: boolean) =>
  {
    const directoryPath = core.prepareEmptyDirectory("watch");
    const fileName = "file";
    const filePath = path.join(directoryPath, fileName);
    if (isFilePreexisting === true)
    {
      fs.writeFileSync(filePath, "content", { encoding: "utf8" });
    }
    const millisecondsArray: number[] = [];
    const milliseconds = Core.fastestIntervalInMilliseconds * 3;
    const eventListener: (event: WatcherEvent, relativePath: string) => Promise<void> = jest.fn(async () =>
    {
      millisecondsArray.push(Date.now());
      return await new Promise<void>((resolve) =>
      {
        setTimeout(resolve, milliseconds);
      });
    });

    const terminator = await watchPath(isNodeFile === true ? filePath : directoryPath, eventListener, undefined);
    try
    {
      let calledTimes = 1;
      {
        fs.writeFileSync(filePath, "newContent", { encoding: "utf8" });
        await waitForExpect(async () =>
        {
          expect(eventListener).toHaveBeenCalledTimes(calledTimes);
          expect(eventListener).toHaveBeenCalledWith(isFilePreexisting === true ? WatcherEvent.Changed : WatcherEvent.Added, fileName);
        });
        fs.rmSync(filePath);
        calledTimes++;
        await waitForExpect(async () =>
        {
          expect(eventListener).toHaveBeenCalledTimes(calledTimes);
          expect(eventListener).toHaveBeenLastCalledWith(WatcherEvent.Deleted, fileName);
        });
      }

      if (isNodeFile !== true)
      {
        // We now copy two files in succession to make sure that both are detected
        const sourceFilePath = path.join(core.getWorkingDirectoryPath(), "file");
        fs.writeFileSync(sourceFilePath, "newContent", { encoding: "utf8" });
        const file1Name = "file1";
        const file1Path = path.join(directoryPath, file1Name);
        const file2Name = "file2";
        const file2Path = path.join(directoryPath, file2Name);
        fs.copyFileSync(sourceFilePath, file1Path);
        fs.copyFileSync(sourceFilePath, file2Path);
        calledTimes += 2;
        await waitForExpect(async () =>
        {
          expect(eventListener).toHaveBeenCalledTimes(calledTimes);
          expect(eventListener).toHaveBeenCalledWith(WatcherEvent.Added, file1Name);
          expect(eventListener).toHaveBeenCalledWith(WatcherEvent.Added, file2Name);
        });
        expect(millisecondsArray[millisecondsArray.length - 1] - millisecondsArray[millisecondsArray.length - 2]).toBeGreaterThanOrEqual(milliseconds * .95);
      }

      await terminator();

      // We make sure that the watcher is not operational anymore, once terminated
      fs.writeFileSync(filePath, "otherContent", { encoding: "utf8" });
      await core.wait();
      expect(eventListener).toHaveBeenCalledTimes(calledTimes);
    }
    finally
    {
      await terminator();
    }
  });

  test("DeepObjectPipeTransform", async () =>
  {
    const object: ImageSearchParameters | unknown = new DeepObjectPipeTransform<ImageSearchParameters>().transform({
        criteria: undefined,
        sorting: undefined,
        range: undefined,
        ids: undefined,
        "criteria[keyword][text]": "man",
        "criteria[keyword][inName]": "true",
        "criteria[keyword][inMetadata]": "true",
        "criteria[keyword][inFeatures]": "false",
        "criteria[formats]": "WEBP",
        "sorting[property]": "creationDate",
        "sorting[isAscending]": "false",
        "range[take]": "40",
        "range[skip]": "0"
      }, { type: "query", metatype: ImageSearchParameters, data: undefined }
    );
    expect(object).toBeDefined();
    const imageSearchParameters: ImageSearchParameters = object!;
    expect(imageSearchParameters).toEqual({
      "criteria": {
        "formats": [
          "WEBP"
        ],
        "keyword": {
          "inFeatures": false,
          "inMetadata": true,
          "inName": true,
          "text": "man"
        }
      },
      "range": {
        "skip": 0,
        "take": 40
      },
      "sorting": {
        "isAscending": false,
        "property": "creationDate"
      }
    });
  });

  test("Bottleneck", async () =>
  {
    const milliseconds = 50;
    const timeoutInMilliseconds = 2 * milliseconds;
    const options: Bottleneck.ConstructorOptions =
      {
        minTime: milliseconds,
        maxConcurrent: 1
      };
    const bottleneck = new Bottleneck(options);
    const notSetValue = -1;
    const taskTimestamps: { startMilliseconds: number, endMilliseconds: number }[] = Array(10).fill(0).map(() =>
      ({ startMilliseconds: notSetValue, endMilliseconds: notSetValue }));
    const generateCallback = (index: number) =>
    {
      return new Promise<void>(resolve =>
      {
        taskTimestamps[index].startMilliseconds = Date.now();
        logger.debug(`Starting the task with index ${index}`);
        setTimeout(() =>
        {
          taskTimestamps[index].endMilliseconds = Date.now();
          logger.debug(`Ending the task with index ${index}`);
          resolve();
        }, timeoutInMilliseconds);
      });
    };
    for (let index = 0; index < taskTimestamps.length; index++)
    {
      // noinspection ES6MissingAwait
      bottleneck.schedule(() => generateCallback(index));
    }
    await core.waitUntil(async () =>
    {
      return taskTimestamps.filter(entry => entry.startMilliseconds === notSetValue || entry.endMilliseconds === notSetValue).length === 0;
    });
    for (let index = 1; index < taskTimestamps.length; index++)
    {
      const previousTimestamp = taskTimestamps[index - 1];
      const nextTimestamp = taskTimestamps[index];
      expect(nextTimestamp.startMilliseconds - previousTimestamp.startMilliseconds).toBeGreaterThanOrEqual(timeoutInMilliseconds);
      expect(nextTimestamp.startMilliseconds - previousTimestamp.endMilliseconds).toBeGreaterThanOrEqual(0);
    }
  });

});

describe("Miscellaneous via module", () =>
{

  const base = new Base(false);

  beforeAll(async () =>
  {
    await Base.beforeAll();
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

  test("referenceDatabaseFilePath", async () =>
  {
    const databaseFilePath = path.join(base.getWorkingDirectoryPath(), "newDatabase.db");
    await base.restart(async () =>
    {
      paths.referenceDatabaseFilePath = base.originalDatabaseDirectoryPath;
      paths.regularDatabaseFilePath = databaseFilePath;
    });
    expect(fs.existsSync(databaseFilePath)).toBe(true);
  });

  test("migrateDatabaseWithSuccess", async () =>
  {
    const migrationsDirectoryPath = base.prepareEmptyDirectory("migrations", base.getWorkingDirectoryPath());
    const firstMigrationDirectoryName = "0";
    writeMigration(migrationsDirectoryPath, firstMigrationDirectoryName, "");
    // We write the second script first to make sure that the migration scripts are run in the right order
    const type2 = "type2";
    const value2 = "value2";
    const thirdMigrationDirectoryName = "2";
    writeMigration(migrationsDirectoryPath, thirdMigrationDirectoryName, `-- InsertValue
INSERT INTO Test (type, value) VALUES ("${type2}","${value2}");
`);
    const type1 = "type1";
    const value1 = "value1";
    const secondMigrationDirectoryName = "1";
    writeMigration(migrationsDirectoryPath, secondMigrationDirectoryName, `-- CreateTable
CREATE TABLE "Test" ("type" TEXT NOT NULL, "value" TEXT NOT NULL);
-- InsertValue
INSERT INTO Test (type, value) VALUES ("${type1}","${value1}");
`);

    const persistence = base.getEntitiesProvider().persistence;
    await persistence.setMigration(firstMigrationDirectoryName);
    paths.migrationDirectoryPath = migrationsDirectoryPath;
    await base.getAdministrationController().migrateDatabase();

    // noinspection SqlResolve
    expect(await persistence.prisma.$queryRaw(Prisma.sql([`SELECT value
                                                           from Test
                                                           WHERE type = "${type1}";`]))).toEqual([{ value: value1 }]);
    // noinspection SqlResolve
    expect(await persistence.prisma.$queryRaw(Prisma.sql([`SELECT value
                                                           from Test
                                                           WHERE type = "${type2}";`]))).toEqual([{ value: value2 }]);
    expect(await persistence.getMigration()).toEqual(thirdMigrationDirectoryName);
  });

  test("migrateDatabaseWithFailure", async () =>
  {
    const migrationsDirectoryPath = base.prepareEmptyDirectory("migrations", base.getWorkingDirectoryPath());
    const firstMigrationDirectoryName = "0";
    writeMigration(migrationsDirectoryPath, firstMigrationDirectoryName, "");
    const secondMigrationDirectoryName = "1";
    const TABLE = "TABLE";
    writeMigration(migrationsDirectoryPath, secondMigrationDirectoryName, `CREATE ${TABLE} "Dummy" ("type" TEXT NOT NULL, "value" TEXT NOT NULL);`);
    const thirdMigrationDirectoryName = "2";
    const nonexistentTableName = "Test";
    const fileName = writeMigration(migrationsDirectoryPath, thirdMigrationDirectoryName, `INSERT INTO ${nonexistentTableName} (type, value)
                                                                                           VALUES ("type", "value");`);

    const persistence = base.getEntitiesProvider().persistence;
    await persistence.setMigration(firstMigrationDirectoryName);
    paths.migrationDirectoryPath = migrationsDirectoryPath;
    await expect(async () =>
    {
      await base.getAdministrationController().migrateDatabase();
    }).rejects.toThrow(new ServiceError(`The migration script '${thirdMigrationDirectoryName}/${fileName}' was a failure. Reason: 'no such table: ${nonexistentTableName}'`, INTERNAL_SERVER_ERROR, -1));

    expect(await persistence.getMigration()).toEqual(secondMigrationDirectoryName);
  });

  test("EventEmitter", async () =>
  {
    const emitter = base.getEventEmitter();
    const eventPrefixName = "broadcast|";
    const eventName = eventPrefixName + "event.with.dots";
    const value = { key: "value" };
    const listener: (value: object) => Promise<void> = jest.fn(() =>
    {
      return Promise.resolve();
    });
    emitter.on(eventName, listener);
    // The event listener with wildcards does not work
    emitter.on(eventPrefixName + Notifier.eventWildcardSuffix, listener);
    emitter.emit(eventName, value);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(value);
    {
      emitter.on(eventPrefixName, listener);
      emitter.emit(eventName, "otherValue");
      expect(listener).toHaveBeenCalledTimes(2);
    }
  });

  test("Notifier", async () =>
  {
    const entityName = EventEntity.Image;
    const action = ImageEventAction.Created;
    {
      const event = Notifier.parseEvent(Notifier.buildEvent(entityName, action));
      expect(event.eventEntity).toBe(entityName);
      expect(event.action).toBe(action);
    }
    {
      const state = "state";
      const event = Notifier.parseEvent(Notifier.buildEvent(entityName, action, state));
      expect(event.eventEntity).toBe(entityName);
      expect(event.action).toBe(action);
      expect(event.state).toBe(state);
    }
    {
      // We assess with and without a marker
      const notifier = base.getNotifier();
      const eventEntity = EventEntity.Extension;
      const action = RepositoryEventAction.Created;
      const state = "state";
      const markers = [undefined, "marker"];
      for (const marker of markers)
      {
        const listener: (event: string, value: object, marker?: string) => Promise<void> = jest.fn(() =>
        {
          return Promise.resolve();
        });
        const offAllListener = notifier.onAll(async (event: string, value: object, marker?: string) =>
        {
          await listener(event, value, marker);
        });
        const offOnListener = notifier.on(eventEntity, action, state, async (event: string, value: object, marker?: string) =>
        {
          await listener(event, value, marker);
        });
        const value = { key: "value" };
        const event = eventEntity + Notifier.delimiter + action + Notifier.delimiter + state;
        const expectedCallTimes = 2;
        {
          notifier.emit(eventEntity, action, state, value, marker);
          expect(listener).toHaveBeenCalledTimes(expectedCallTimes);
          expect(listener).toHaveBeenCalledWith(event, value, marker);
        }
        {
          // We make sure that we do not receive any more event when the listeners are removed
          offAllListener.off();
          offOnListener.off();
          notifier.emit(eventEntity, action, state, value, marker);
          expect(listener).toHaveBeenCalledTimes(expectedCallTimes);
          expect(listener).toHaveBeenCalledWith(event, value, marker);
        }
      }
    }
    {
      // We assess with a callback
      const notifier = base.getNotifier();
      const eventEntity = EventEntity.Text;
      const action = TextEventAction.ComputeEmbeddings;
      const state = "state";
      const marker = undefined;
      const onListener: (event: string, value: object, marker?: string) => Promise<void> = jest.fn(() =>
      {
        return Promise.resolve();
      });
      const returnedValue = "returnedValue";
      const resultValue = { value: returnedValue };
      notifier.on(eventEntity, action, state, async (event: string, value: object, marker?: string, onResult?: (value: object) => void) =>
      {
        await onListener(event, value, marker);
        if (onResult !== undefined)
        {
          onResult(resultValue);
        }
      });
      const allListener: (event: string, value: object, marker?: string) => Promise<void> = jest.fn(() =>
      {
        return Promise.resolve();
      });
      notifier.onAll(allListener);
      const callbackListener = jest.fn((_value: string) =>
      {
      });
      const value = { key: "value" };
      const result = notifier.emit<string>(eventEntity, action, state, value, marker, callbackListener);
      expect(result).toEqual(true);
      expect(onListener).toHaveBeenCalledTimes(1);
      expect(onListener).toHaveBeenCalledWith(eventEntity + Notifier.delimiter + action + Notifier.delimiter + state, value, marker);
      await waitForExpect(async () =>
      {
        expect(callbackListener).toHaveBeenCalledTimes(1);
        expect(callbackListener).toHaveBeenCalledWith(returnedValue);
        expect(allListener).toHaveBeenCalledTimes(1);
      });
    }
  });

  function writeMigration(migrationsDirectoryPath: string, migration: string, sqlStatements: string): string
  {
    const directoryPath = path.join(migrationsDirectoryPath, migration);
    fs.mkdirSync(directoryPath);
    const fileName = "migration.sql";
    fs.writeFileSync(path.join(directoryPath, fileName), sqlStatements);
    return fileName;
  }

});

describe("Miscellaneous via application", () =>
{

  const base = new Base(true);

  beforeAll(async () =>
  {
    await Base.beforeAll();
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

  test("socket", async () =>
  {
    const ioClient = io(paths.webServicesBaseUrl, {
      autoConnect: false,
      transports: ["websocket"]
    });
    ioClient.connect();
    await new Promise<void>((resolve) =>
    {
      ioClient.on("connect", () =>
      {
        resolve();
      });
    });
    const notifications: { channel: string, value: object }[] = [];
    ioClient.on(paths.events, ({ channel, value }: {
      channel: string,
      milliseconds: number,
      value: object
    }) =>
    {
      notifications.push({ channel, value });
    });
    const apiKey = AuthenticationGuard.generateApiKey();
    AuthenticationGuard.masterApiKey = apiKey;
    ioClient.emit(paths.connection, { apiKey, isOpen: true });

    const repository = await base.prepareEmptyRepository(undefined, false);

    // We wait for the 3 notifications to be received, instead of assuming that the "repository.synchronize.stopped" has already been received
    await waitForExpect(async () =>
    {
      expect(notifications.length).toEqual(3);
    });
    let index = 0;
    {
      const notification = notifications[index++];
      expect(notification.channel).toBe(EventEntity.Repository + Notifier.delimiter + RepositoryEventAction.Created);
      expect(notification.value).toEqual({ id: repository.id });
    }
    {
      const notification = notifications[index++];
      expect(notification.channel).toBe(EventEntity.Repository + Notifier.delimiter + RepositoryEventAction.Synchronize + Notifier.delimiter + "started");
      expect(notification.value).toEqual({ id: repository.id });
    }
    {
      const notification = notifications[index++];
      expect(notification.channel).toBe(EventEntity.Repository + Notifier.delimiter + RepositoryEventAction.Synchronize + Notifier.delimiter + "stopped");
      expect(notification.value).toEqual({ id: repository.id });
    }

    ioClient.disconnect();
  });

  test("resizer", async () =>
  {
    const { image } = await base.prepareRepositoryWithImage(base.imageFeeder.pngImageFileName);

    const baseUrl = `${paths.webServicesBaseUrl}/${Resizer.webServerBasePath}`;
    {
      // We assess with an invalid parameter
      const filePath = base.imageFeeder.copyImage(base.getWorkingDirectoryPath(), base.imageFeeder.pngImageFileName);
      const response = await fetch(`${baseUrl}?u=${filePath}`);
      expect(response.status).toEqual(FORBIDDEN);
      expect(await response.json()).toEqual({
        code: 8,
        message: `Could not process the image with URL '${filePath}'. Reason: 'it does not belong to any repository'`
      });
    }
    {
      // We assess with a valid parameter
      const response = await fetch(`${baseUrl}?u=${image.uri}`);
      expect(response.status).toEqual(OK);
      const blob = await response.blob();
      expect(blob.type).toEqual(toMimeType(image.format));
    }
  });

});
