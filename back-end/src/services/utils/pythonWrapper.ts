import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { ChildProcess } from "node:child_process";
import os from "node:os";

import semver from "semver";

import { paths } from "../../paths";
import { logger } from "../../logger";
import { execute, spawn, spawnAndWait, waitFor, which } from "./processWrapper";
import { downloadAndStoreFile, getTemporaryDirectoryPath, inflateGzippedTarball, move } from "./downloader";


const acceptedPython3MajorVersion = 3;

const runtimePythonDirectoryName = "python";

const runtimePythonVersionsDirectoryName = "versions";

const fromRuntimesPyenvPaths = [ runtimePythonDirectoryName, "pyenv" ];

const fromRuntimesHomebrewPaths = [ "brew" ];

const fromHomebrewRootToBinaryPaths = [ "bin", "brew" ];

const isWindows = os.platform() === "win32";

const pyenvPythonExecutable = "python";

const minicondaPythonExecutable = isWindows === false ? "python" : "python.exe";

const pythonBinaryDirectoryName = "bin";

const homeBrewVersion = "4.3.23";

const xzModuleName = "xz";

const useMinicondaOrPyenv = Math.random() <= 1;

export const pythonExecutable = isWindows === false ? "python3" : "python.exe";

export const publicPythonSdkIdentifier = "picteus-extension-sdk";

export const internalPythonSdkIdentifier = "picteus-internal-extension-sdk";

export const acceptedPython3MinorVersions = [ 8, 9, 10, 11, 12, 13, 14 ];

export const pythonVersion = "3.11.14";

function computeHomebrewPaths(): {
  brewDirectoryPath: string,
  brewBinaryDirectoryPath: string,
  brewFilePath: string
} | undefined
{
  if (isWindows === true)
  {
    return undefined;
  }
  if (paths.runtimesDirectoryPath === undefined)
  {
    return undefined;
  }
  const brewDirectoryPath = path.join(paths.runtimesDirectoryPath, ...fromRuntimesHomebrewPaths);
  return {
    brewDirectoryPath,
    brewBinaryDirectoryPath: path.join(brewDirectoryPath, ...fromHomebrewRootToBinaryPaths.slice(0, fromHomebrewRootToBinaryPaths.length - 1)),
    brewFilePath: path.join(brewDirectoryPath, ...fromHomebrewRootToBinaryPaths)
  };
}

async function ensureHomebrew(): Promise<void>
{
  if (isWindows === true)
  {
    return;
  }
  const paths = computeHomebrewPaths();
  if (paths === undefined)
  {
    return;
  }
  const { brewDirectoryPath, brewFilePath } = paths;
  logger.info(`Ensuring that Homebrew is installed in directory '${brewDirectoryPath}'`);
  if (fs.existsSync(brewDirectoryPath) === true)
  {
    return;
  }
  const fileName = homeBrewVersion + ".tar.gz";
  const temporaryDirectoryPath = getTemporaryDirectoryPath();
  const archiveFilePath = path.join(temporaryDirectoryPath, fileName);
  const repositoryId = "brew";
  await downloadAndStoreFile(`https://github.com/Homebrew/${repositoryId}/archive/refs/tags/${fileName}`, archiveFilePath, "Homebrew archive");
  await inflateGzippedTarball(archiveFilePath, temporaryDirectoryPath, "Homebrew archive");

  {
    const brewParentDirectoryPath = path.join(brewDirectoryPath, "..");
    if (fs.existsSync(brewParentDirectoryPath) === false)
    {
      fs.mkdirSync(brewParentDirectoryPath, { recursive: true });
    }
    const brewTemporaryRootDirectoryPath = path.join(temporaryDirectoryPath, `${repositoryId}-${homeBrewVersion}`);
    fs.renameSync(brewTemporaryRootDirectoryPath, brewDirectoryPath);
  }

  try
  {
    // We fake a .git directory so that no git operations are performed
    const gitDirectoryPath = path.join(brewDirectoryPath, ".git");
    fs.mkdirSync(gitDirectoryPath, { recursive: true });
    fs.writeFileSync(path.join(gitDirectoryPath, "HEAD"), "");

    // We install the formulas for the xz module and other dependencies, but not the "zlib" and "tcl-tk" formulas recommended at https://github.com/pyenv/pyenv/wiki
    // TODO: find a work-around to have "openssl" installed, because it currently fails, because of spaces in the Homebrew root path
    // const formulas: string[] = [xzModuleName, "readline", "openssl"];
    const formulas: string[] = [ xzModuleName, "readline" ];
    for (const formula of formulas)
    {
      logger.debug(`Installing the Homebrew formula '${formula}'`);
      const childProcess = spawn(brewFilePath, [ "install", formula ], brewDirectoryPath, undefined, true);
      await waitFor(childProcess);
    }
  }
  catch (error)
  {
    fs.rmSync(brewDirectoryPath, { recursive: true });
    throw error;
  }
}

function computePyenvPaths(version: string): {
  pyenvDirectoryPath: string,
  pythonVersionsParentDirectoryPath: string,
  pythonVersionDirectoryPath: string
} | undefined
{
  if (isWindows === true)
  {
    return undefined;
  }
  if (paths.runtimesDirectoryPath === undefined)
  {
    return undefined;
  }
  const pyenvDirectoryPath = path.join(paths.runtimesDirectoryPath, ...fromRuntimesPyenvPaths);
  const pythonVersionsParentDirectoryPath = path.join(pyenvDirectoryPath, "..");
  const pythonVersionDirectoryPath = path.join(pythonVersionsParentDirectoryPath, runtimePythonVersionsDirectoryName, version);
  return { pyenvDirectoryPath, pythonVersionsParentDirectoryPath, pythonVersionDirectoryPath };
}

async function ensurePyenv(pyenvArchiveFilePath: string): Promise<void>
{
  const pyenvDirectoryPath = paths.runtimesDirectoryPath === undefined ? undefined : path.join(paths.runtimesDirectoryPath, ...fromRuntimesPyenvPaths);
  if (isWindows === true)
  {
    return;
  }
  logger.info(`Ensuring that pyenv is installed${pyenvDirectoryPath === undefined ? "" : ` in directory '${pyenvDirectoryPath}'`}`);
  if (pyenvDirectoryPath === undefined || fs.existsSync(pyenvDirectoryPath) === true)
  {
    return;
  }
  fs.mkdirSync(pyenvDirectoryPath, { recursive: true });
  try
  {
    await inflateGzippedTarball(pyenvArchiveFilePath, pyenvDirectoryPath, "pyenv archive");
  }
  catch (error)
  {
    fs.rmSync(pyenvDirectoryPath, { recursive: true });
    throw error;
  }
}

async function ensurePythonViaPyenv(pythonVersion: string): Promise<string>
{
  const pyenvPaths = computePyenvPaths(pythonVersion);
  const brewPaths = computeHomebrewPaths();
  if (pyenvPaths === undefined || brewPaths === undefined)
  {
    return await getPythonFilePath(pythonVersion);
  }
  logger.info(`Ensuring that Python v${pythonVersion} is installed`);
  const { pyenvDirectoryPath, pythonVersionsParentDirectoryPath, pythonVersionDirectoryPath } = pyenvPaths;
  const { brewDirectoryPath, brewBinaryDirectoryPath, brewFilePath } = brewPaths;
  if (fs.existsSync(pythonVersionDirectoryPath) === false)
  {
    await ensureHomebrew();
    await ensurePyenv(path.join(paths.serverDirectoryPath, "runtimes", "python", "pyenv-posix.tar.gz"));
    if (fs.existsSync(pythonVersionsParentDirectoryPath) === false)
    {
      fs.mkdirSync(pythonVersionsParentDirectoryPath, { recursive: true });
    }

    // We need to use a symbolic link to work around an issue with the pyenv not working with directories that have a space in their path, see https://github.com/pyenv/pyenv/issues/2738
    const temporaryDirectoryPath = getTemporaryDirectoryPath();
    const workingDirectoryPath = path.join(temporaryDirectoryPath, "pyenv");
    const versionsDirectoryPath = path.join(temporaryDirectoryPath, "versions");
    fs.symlinkSync(pyenvDirectoryPath, workingDirectoryPath, "dir");
    fs.symlinkSync(pythonVersionsParentDirectoryPath, versionsDirectoryPath, "dir");

    const xzDirectoryPath = (await execute(brewFilePath, [ "--prefix", xzModuleName ])).stdout.trim();
    // We also need to create a symbolic link for the xz module C headers and dynamic library, because a space if their path causes the Python installation to fail
    const xzTemporaryDirectoryPath = path.join(temporaryDirectoryPath, xzModuleName);
    fs.symlinkSync(xzDirectoryPath, xzTemporaryDirectoryPath, "dir");
    const brewTemporaryDirectoryPath = path.join(temporaryDirectoryPath, "brew");
    fs.symlinkSync(brewDirectoryPath, brewTemporaryDirectoryPath, "dir");

    logger.info(`Installing Python v${pythonVersion} via pyenv`);
    const pyenvFilePath = path.join(workingDirectoryPath, "bin", "pyenv");
    const childProcess = spawn(pyenvFilePath, [ "install", pythonVersion ], workingDirectoryPath, {
      PYENV_ROOT: versionsDirectoryPath,
      // Taken from https://github.com/pyenv/pyenv/wiki#how-to-build-cpython-with-framework-support-on-os-x
      // PYTHON_CONFIGURE_OPTS: "--enable-framework"
      // In order to fix the issue with the missing Homebrew xz formulae (xs library at https://github.com/tukaani-project/xz) not available and the _lzma module missing at runtime, see https://github.com/pyenv/pyenv/issues/1800 and https://stackoverflow.com/questions/57743230/userwarning-could-not-import-the-lzma-module-your-installed-python-is-incomple (https://stackoverflow.com/a/67591858/808618)
      CFLAGS: `-I'${xzTemporaryDirectoryPath}/include'`,
      LDFLAGS: `-L'${xzTemporaryDirectoryPath}/lib'`,
      PATH: `${brewBinaryDirectoryPath}:${process.env.PATH}`
    }, true);
    await waitFor(childProcess);
  }
  return path.join(pythonVersionDirectoryPath, pythonBinaryDirectoryName, pyenvPythonExecutable);
}

function computeMinicondaPaths(version: string): {
  pythonVersionsDirectoryPath: string,
  pythonVersionDirectoryPath: string
} | undefined
{
  if (paths.runtimesDirectoryPath === undefined)
  {
    return undefined;
  }
  const pythonVersionsDirectoryPath = path.join(paths.runtimesDirectoryPath, runtimePythonDirectoryName, runtimePythonVersionsDirectoryName);
  const pythonVersionDirectoryPath = path.join(pythonVersionsDirectoryPath, version);
  return { pythonVersionsDirectoryPath, pythonVersionDirectoryPath };
}

async function ensurePythonViaMiniconda(pythonVersion: string): Promise<string>
{
  const minicondaPaths = computeMinicondaPaths(pythonVersion);
  if (minicondaPaths === undefined)
  {
    return await getPythonFilePath(pythonVersion);
  }
  const fromRootPaths = isWindows === true ? [ minicondaPythonExecutable ] : [ pythonBinaryDirectoryName, minicondaPythonExecutable ];
  if (fs.existsSync(minicondaPaths.pythonVersionDirectoryPath) === false)
  {
    const result = semver.parse(pythonVersion);
    if (result === null)
    {
      throw new Error(`Invalid Python version '${pythonVersion}'`);
    }
    const { major, minor } = result;
    if (major !== acceptedPython3MajorVersion || acceptedPython3MinorVersions.indexOf(minor) === -1)
    {
      throw new Error(`Unsupported Python version '${pythonVersion}'`);
    }
    const minicondaVersion = "25.9.1-3";
    let minicondaDownloadVersion: string;
    switch (minor)
    {
      default:
        throw new Error(`Unhandled Python version '${pythonVersion}'`);
      case 8:
        minicondaDownloadVersion = "38_23.11.0-2";
        break;
      case 9:
      case 10:
      case 11:
      case 12:
      case 13:
      // TODO: once Miniconda provides a build for Python 3.14, we should update this version
      case 14:
        minicondaDownloadVersion = `3${minor}_${minicondaVersion}`;
        break;
    }
    const temporaryDirectoryPath = getTemporaryDirectoryPath();
    const architecture = os.arch();
    let osFlavor: string;
    let architectureFlavor: string;
    let scriptExtension: string;
    switch (os.platform())
    {
      case "win32":
        osFlavor = "Windows";
        architectureFlavor = architecture === "x64" ? "x86_64" : "x86";
        scriptExtension = "exe";
        break;
      case "darwin":
        osFlavor = "MacOSX";
        architectureFlavor = architecture === "x64" ? "x86_64" : "arm64";
        scriptExtension = "sh";
        break;
      case "linux":
        osFlavor = "Linux";
        architectureFlavor = architecture === "x64" ? "x86_64" : (architecture === "s390  " ? "s390x" : "aarch64");
        scriptExtension = "sh";
        break;
      default:
        throw new Error(`Unsupported operating system for Miniconda '${os.platform()}'`);
    }
    const archiveFilePath = path.join(temporaryDirectoryPath, "install." + scriptExtension);
    const url = `https://repo.anaconda.com/miniconda/Miniconda3-py${minicondaDownloadVersion}-${osFlavor}-${architectureFlavor}.${scriptExtension}`;
    await downloadAndStoreFile(url, archiveFilePath, "Miniconda archive");
    fs.chmodSync(archiveFilePath, 0o755);
    // We need to install Miniconda in a temporary directory without space, because the installation path cannot contain spaces
    const temporaryInstallationDirectoryPath = path.join(temporaryDirectoryPath, "miniconda");
    const parentDirectoryPath = path.join(temporaryInstallationDirectoryPath, "..");
    if (fs.existsSync(parentDirectoryPath) === false)
    {
      fs.mkdirSync(parentDirectoryPath, { recursive: true });
    }
    const childProcess = spawn(archiveFilePath, isWindows === true ? [ "/S", `/D=${temporaryInstallationDirectoryPath}` ] : [ "-b", "-m", "-p", `"${temporaryInstallationDirectoryPath}"` ], temporaryDirectoryPath, undefined, true);
    await waitFor(childProcess);

    if (isWindows === false)
    {
      // We clean up unnecessary files, which are heavy
      fs.rmSync(path.join(temporaryInstallationDirectoryPath, "pkgs"), { recursive: true, force: true });
    }

    const minicondaPythonVersion = await computePythonVersion(path.join(temporaryInstallationDirectoryPath, ...fromRootPaths));
    if (minicondaPythonVersion !== pythonVersion)
    {
      throw new Error(`Cannot install Python '${pythonVersion}' because its Miniconda counterpart version is '${minicondaPythonVersion}'`);
    }
    const installationDirectoryPath = minicondaPaths.pythonVersionDirectoryPath;
    fs.mkdirSync(path.resolve(installationDirectoryPath, ".."), { recursive: true });
    await move(temporaryInstallationDirectoryPath, installationDirectoryPath, { preserveSymlinks: true });
  }
  return path.join(minicondaPaths.pythonVersionDirectoryPath, ...fromRootPaths);
}

async function ensurePython(pythonVersion: string): Promise<string>
{
  logger.debug(`Ensuring that Python version '${pythonVersion}' is available`);
  if (useMinicondaOrPyenv === false)
  {
    return await ensurePythonViaPyenv(pythonVersion);
  }
  else
  {
    return await ensurePythonViaMiniconda(pythonVersion);
  }
}

async function computeInstalledPythonFilePath(): Promise<string>
{
  const useWhich = Math.random() <= 1;
  let filPath: string;
  if (useWhich === true)
  {
    filPath = await which(pythonExecutable);
  }
  else
  {
    const processResult = await execute(pythonExecutable, [ "-c", `"import sys\nprint(sys.executable)"` ]);
    filPath = processResult.stdout.trim();
  }
  logger.debug(`The installed Python file path is '${filPath}'`);
  return filPath;
}

export async function getPythonFilePath(pythonVersion: string): Promise<string>
{
  const getPythonExecutableAndCheckingVersion = async (): Promise<string> =>
  {
    const filePath = await computeInstalledPythonFilePath();
    await checkPythonVersion3(filePath, acceptedPython3MinorVersions);
    return filePath;
  };
  if (useMinicondaOrPyenv === false)
  {
    const paths = computePyenvPaths(pythonVersion);
    if (paths === undefined)
    {
      return await getPythonExecutableAndCheckingVersion();
    }
    return path.join(paths.pythonVersionDirectoryPath, pythonBinaryDirectoryName, pyenvPythonExecutable);
  }
  else
  {
    const paths = computeMinicondaPaths(pythonVersion);
    if (paths === undefined)
    {
      return await getPythonExecutableAndCheckingVersion();
    }
    return path.join(paths.pythonVersionsDirectoryPath, pythonBinaryDirectoryName, minicondaPythonExecutable);
  }
}

export async function checkPythonVersion3(pythonExecutablePath: string, acceptedMinorVersions: number[]): Promise<void>
{
  const pythonVersion = await computePythonVersion(pythonExecutablePath);
  const result = semver.parse(pythonVersion);
  if (result === null)
  {
    throw new Error(`Invalid Python version '${pythonVersion}'`);
  }
  const { major, minor } = result;
  if (major !== acceptedPython3MajorVersion || acceptedMinorVersions.indexOf(minor) === -1)
  {
    throw new Error(`Neither Python ${acceptedMinorVersions.map((minor) =>
    {
      return `v${acceptedPython3MajorVersion}.${minor}`;
    }).join(" or ")} is installed`);
  }
}

export async function computePythonVersion(pythonExecutablePath: string): Promise<string>
{
  const result = (await execute(pythonExecutablePath, [ "--version" ])).stdout.trim();
  const groups = /^Python (.*)$/.exec(result);
  if (groups === null || groups.length != 2)
  {
    throw new Error(`Invalid Python --version output '${result}'`);
  }
  const version = groups[1];
  logger.info(`The found Python version is '${version}'`);
  return version;
}

function computeVirtualEnvironmentDirectoryPath(parentDirectoryPath: string): string
{
  return path.join(parentDirectoryPath, ".venv");
}

export function computeVirtualEnvironmentBinaryDirectoryPath(parentDirectoryPath: string): string
{
  return path.join(computeVirtualEnvironmentDirectoryPath(parentDirectoryPath), isWindows === true ? "Scripts" : "bin");
}

export function computeVirtualEnvironmentPythonFilePath(parentDirectoryPath: string): string
{
  return path.join(computeVirtualEnvironmentBinaryDirectoryPath(parentDirectoryPath), pyenvPythonExecutable);
}

export function computeVirtualEnvironmentPipFilePath(parentDirectoryPath: string): string
{
  const directoryPath = computeVirtualEnvironmentBinaryDirectoryPath(parentDirectoryPath);
  let pipFilePath: string = path.join(directoryPath, isWindows === true ? "pip.exe" : "pip");
  if (fs.existsSync(pipFilePath) === true)
  {
    return pipFilePath;
  }
  pipFilePath = path.join(directoryPath, isWindows === true ? "pip3.exe" : "pip3");
  if (fs.existsSync(pipFilePath) === true)
  {
    return pipFilePath;
  }
  throw new Error(`The Python virtual environment in directory '${parentDirectoryPath}' does not contain a 'pip' executable`);
}

export async function ensureVirtualEnvironment(pythonVersion: string, parentDirectoryPath: string): Promise<boolean>
{
  const virtualEnvironmentDirectoryPath = computeVirtualEnvironmentDirectoryPath(parentDirectoryPath);
  logger.info(`Ensuring that the Python virtual environment in directory '${parentDirectoryPath}' exists`);
  let shouldCreate: boolean = true;
  if (fs.existsSync(virtualEnvironmentDirectoryPath) === true)
  {
    // We check that the virtual environment is totally set up because a previous creation of the virtual environment may have been interrupted
    // The script names are taken from https://docs.python.org/3/library/venv.html#how-venvs-work
    const activateFilePaths = (os.platform() === "win32" ? [ "activate.bat", "Activate.ps1" ] : [ "activate", "activate.fish", "activate.csh", "Activate.ps1" ]).map((fileName: string) =>
    {
      const binaryDirectoryPath = computeVirtualEnvironmentBinaryDirectoryPath(parentDirectoryPath);
      return path.join(binaryDirectoryPath, fileName);
    });
    shouldCreate = activateFilePaths.find((filePath: string) => fs.existsSync(filePath) === true) === undefined;
    if (shouldCreate === true)
    {
      logger.warn(`Deleting the corrupted Python virtual environment in directory '${virtualEnvironmentDirectoryPath}'`);
      fs.rmSync(virtualEnvironmentDirectoryPath, { recursive: true, force: true });
    }
  }
  if (shouldCreate === true)
  {
    if (fs.existsSync(parentDirectoryPath) === false)
    {
      fs.mkdirSync(parentDirectoryPath, { recursive: true });
    }
    logger.info(`Creating a new Python virtual environment in directory '${parentDirectoryPath}'`);
    const pythonFilePath = await ensurePython(pythonVersion);
    const directoryName = path.basename(virtualEnvironmentDirectoryPath);
    await spawnAndWait(pythonFilePath, [ "-m", "venv", directoryName ], parentDirectoryPath);
    return true;
  }
  else
  {
    return false;
  }
}

export async function installViaVirtualEnvironmentRequirements(requirementsFilePath: string, sdkArchiveVersion: string): Promise<void>
{
  logger.info(`Installing the Python requirements expressed through the file '${requirementsFilePath}'`);
  const parentDirectoryPath = path.join(requirementsFilePath, "..");
  const requirementsContent = fs.readFileSync(requirementsFilePath, { encoding: "utf8" });
  const resortToPublicSdk = requirementsContent.indexOf(publicPythonSdkIdentifier) !== -1;
  const resortToInternalSdk = resortToPublicSdk === false && requirementsContent.indexOf(internalPythonSdkIdentifier) !== -1;
  if (resortToInternalSdk === true)
  {
    const tokens = requirementsContent.substring(requirementsContent.indexOf(internalPythonSdkIdentifier)).split("\n")[0].split("==");
    if (tokens.length === 2)
    {
      const requiredSdkVersion = tokens[1].trim();
      if (requiredSdkVersion !== sdkArchiveVersion)
      {
        throw new Error(`The internal Python SDK version '${requiredSdkVersion}' is not available, only the version '${sdkArchiveVersion}' is supported`);
      }
    }
  }
  const pythonInternalSdkDirectoryPath = resortToInternalSdk === false ? undefined : path.join(paths.sdkDirectoryPath, "python");
  const additionalParameters = pythonInternalSdkDirectoryPath === undefined ? [] : [ "--find-links", pythonInternalSdkDirectoryPath ];
  const pipFilePath = computeVirtualEnvironmentPipFilePath(parentDirectoryPath);
  await spawnAndWait(pipFilePath, [ "install", "-r", requirementsFilePath, ...additionalParameters ], parentDirectoryPath);
  if (pythonInternalSdkDirectoryPath !== undefined)
  {
    // We want to make sure that no cached version of the SDK is used
    await spawnAndWait(pipFilePath, [ "install", "--no-cache-dir", "--force", "--find-links", pythonInternalSdkDirectoryPath, internalPythonSdkIdentifier ], parentDirectoryPath, undefined, false);
  }
}

export async function installViaVirtualEnvironmentPip(parentDirectoryPath: string, packages: string []): Promise<void>
{
  logger.info(`Installing the Python package(s) '${packages.join("', '")}'`);
  await execute(computeVirtualEnvironmentPipFilePath(parentDirectoryPath), [ "install", ...packages ], parentDirectoryPath);
}

export async function ensureViaVirtualEnvironmentPip(parentDirectoryPath: string, packages: string [], binaryFileName: string): Promise<void>
{
  logger.info(`Checking that the Python package(s) '${packages.join("', '")}' are installed in the virtual environment in directory '${parentDirectoryPath}' and that the '${binaryFileName}' binary is available`);
  if (fs.existsSync(path.join(computeVirtualEnvironmentBinaryDirectoryPath(parentDirectoryPath), binaryFileName)) === false)
  {
    await installViaVirtualEnvironmentPip(parentDirectoryPath, packages);
  }
}

// TODO: factorize the code with the one in spawnPythonWithWatchdog, in case of non-Windows OS
const getWindowsPythonWatchdogDirectory: () => string = (function (): () => string
{
  let windowsPythonWatchdogDirectoryPath: string | undefined;
  return function (): string
  {
    if (windowsPythonWatchdogDirectoryPath === undefined)
    {
      windowsPythonWatchdogDirectoryPath = path.join(getTemporaryDirectoryPath(), "picteus-windows-python-watchdog");
      if (fs.existsSync(windowsPythonWatchdogDirectoryPath) === false)
      {
        fs.mkdirSync(windowsPythonWatchdogDirectoryPath, { recursive: true });
      }
      const sitecustomizeFilePath = path.join(windowsPythonWatchdogDirectoryPath, "sitecustomize.py");
      const WINDOWS_PYTHON_WATCHDOG_PARENT_TERMINATION_EXIT_CODE = 0;
      const pythonWatchdogCode = `
import ctypes
import os
import threading

def _setup_windows_parent_watchdog():
    if os.name != "nt":
        return

    SYNCHRONIZE = 0x00100000
    PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
    INFINITE = 0xFFFFFFFF
    EXIT_CODE = ${WINDOWS_PYTHON_WATCHDOG_PARENT_TERMINATION_EXIT_CODE}

    parent_pid = os.getppid()
    if not parent_pid or parent_pid <= 1:
        return

    kernel32 = ctypes.windll.kernel32
    access = SYNCHRONIZE | PROCESS_QUERY_LIMITED_INFORMATION
    handle = kernel32.OpenProcess(access, False, parent_pid)
    if not handle:
        # Parent process already vanished before watchdog handle could be opened
        kernel32.ExitProcess(EXIT_CODE)
        return

    # Verify parent process creation and exit times to protect against PID recycling
    cur_proc = kernel32.GetCurrentProcess()
    parent_creation = ctypes.c_ulonglong()
    parent_exit = ctypes.c_ulonglong()
    dummy = ctypes.c_ulonglong()
    cur_creation = ctypes.c_ulonglong()

    if kernel32.GetProcessTimes(handle, ctypes.byref(parent_creation), ctypes.byref(parent_exit), ctypes.byref(dummy), ctypes.byref(dummy)):
        if parent_exit.value != 0:
            # Parent process has already exited
            kernel32.CloseHandle(handle)
            kernel32.ExitProcess(EXIT_CODE)
            return
        if kernel32.GetProcessTimes(cur_proc, ctypes.byref(cur_creation), ctypes.byref(dummy), ctypes.byref(dummy), ctypes.byref(dummy)):
            if parent_creation.value > cur_creation.value:
                # PID was recycled
                kernel32.CloseHandle(handle)
                kernel32.ExitProcess(EXIT_CODE)
                return

    def _wait_parent_exit():
        try:
            if kernel32.WaitForSingleObject(handle, 0) == 0:
                kernel32.CloseHandle(handle)
                kernel32.ExitProcess(EXIT_CODE)
                return

            kernel32.WaitForSingleObject(handle, INFINITE)
            kernel32.CloseHandle(handle)
            kernel32.ExitProcess(EXIT_CODE)
        except Exception:
            kernel32.ExitProcess(EXIT_CODE)

    # Daemon thread ensures normal Python program completion is not blocked
    watchdog_thread = threading.Thread(target=_wait_parent_exit, daemon=True, name="WindowsParentWatchdog")
    watchdog_thread.start()

_setup_windows_parent_watchdog()
`.trim();
      fs.writeFileSync(sitecustomizeFilePath, pythonWatchdogCode, { encoding: "utf8" });
    }
    return windowsPythonWatchdogDirectoryPath;
  };
})();

export function spawnPythonWithWatchdog(pythonExecutable: string, parameters: string[], cwd?: string | undefined, env?: NodeJS.ProcessEnv | undefined, resortToExternalSupervisor?: boolean): ChildProcess
{
  const options =
    {
      loggedIndications: `via a${process.platform === "win32" ? " Windows" : ""} termination watch dog`,
      loggedCommand: `${pythonExecutable}${parameters.length === 0 ? "" : (" " + parameters.join(" "))}`
    };
  const shell = false;
  const stdio = "pipe";
  if (process.platform === "win32")
  {
    const watchdogDirectory = getWindowsPythonWatchdogDirectory();
    const childEnv: NodeJS.ProcessEnv = env === undefined ? {} : { ...env };
    const existingPythonPath = childEnv.PYTHONPATH;
    childEnv.PYTHONPATH = existingPythonPath !== undefined && existingPythonPath.length > 0 ? `${watchdogDirectory}${path.delimiter}${existingPythonPath}` : watchdogDirectory;
    return spawn(pythonExecutable, parameters, cwd, childEnv, shell, stdio, options);
  }
  else
  {
    const commonWatchdogBootstrapCode = `
import os, signal, sys, threading, time

def _setup_watchdog(child_process=None):
    if sys.platform.startswith("linux"):
        try:
            import ctypes
            libc = ctypes.CDLL("libc.so.6")
            PR_SET_PDEATHSIG = 1
            libc.prctl(PR_SET_PDEATHSIG, signal.SIGTERM)
        except Exception:
            pass

    def _terminate(process):
        if process is not None:
            try:
                process.kill()
            except Exception:
                pass
        os._exit(0)

    if sys.platform == "win32":
        try:
            import ctypes
            SYNCHRONIZE = 0x00100000
            INFINITE = 0xFFFFFFFF
            handle = ctypes.windll.kernel32.OpenProcess(SYNCHRONIZE, False, os.getppid())
            if handle:
                def _win_wait():
                    ctypes.windll.kernel32.WaitForSingleObject(handle, INFINITE)
                    ctypes.windll.kernel32.CloseHandle(handle)
                    _terminate(child_process)
                threading.Thread(target=_win_wait, daemon=True).start()
        except Exception:
            pass

    def _stdin_monitor():
        try:
            if sys.stdin is not None and not sys.stdin.closed:
                char = sys.stdin.read(1)
                if char == "":
                    _terminate(child_process)
        except Exception:
            _terminate(child_process)
    threading.Thread(target=_stdin_monitor, daemon=True).start()

    if sys.platform != "win32":
        initial_ppid = os.getppid()
        def _ppid_poll():
            while True:
                time.sleep(0.1)
                if os.getppid() != initial_ppid:
                    _terminate(child_process)
        threading.Thread(target=_ppid_poll, daemon=True).start()
`.trim();

    // This version is in-process, hence causing minimal overhead
    const inProcessPythonWatchdogBootstrapCode = `
${commonWatchdogBootstrapCode}

_setup_watchdog()

import runpy
target = sys.argv[1]
if target == "-c":
    code = sys.argv[2]
    sys.argv = ["-c"] + sys.argv[3:]
    exec(code)
elif target == "-m":
    module_name = sys.argv[2]
    sys.argv = sys.argv[2:]
    runpy.run_module(module_name, run_name="__main__", alter_sys=True)
elif ":" in target:
    import importlib, inspect, asyncio
    module_path, class_or_callable = target.split(":", 1)
    mod = importlib.import_module(module_path)
    entity = getattr(mod, class_or_callable)
    sys.argv = [target] + sys.argv[2:]
    if inspect.isclass(entity):
        try:
            inst = entity()
        except TypeError:
            inst = entity(sys.argv[1:])
        if hasattr(inst, "run") and callable(inst.run):
            if inspect.iscoroutinefunction(inst.run):
                asyncio.run(inst.run())
            else:
                inst.run()
        elif hasattr(inst, "main") and callable(inst.main):
            if inspect.iscoroutinefunction(inst.main):
                asyncio.run(inst.main())
            else:
                inst.main()
        elif callable(inst):
            if inspect.iscoroutinefunction(inst):
                asyncio.run(inst())
            else:
                inst()
    elif callable(entity):
        if inspect.iscoroutinefunction(entity):
            asyncio.run(entity())
        else:
            entity()
else:
    sys.argv = sys.argv[1:]
    runpy.run_path(target, run_name="__main__")
`.trim();

    // This version has been introduced to work around GIL deadlock issues and resorts to an intermediate process
    const supervisedPythonWatchdogBootstrapCode = `
import subprocess
${commonWatchdogBootstrapCode}

target = sys.argv[1]
if target == "-c":
    child_command = [sys.executable, "-c", sys.argv[2]] + sys.argv[3:]
elif target == "-m":
    child_command = [sys.executable, "-m", sys.argv[2]] + sys.argv[3:]
elif ":" in target:
    runner_code = (
        "import sys, importlib, inspect, asyncio; "
        "mod_name, func_name = sys.argv[1].split(':', 1); "
        "mod = importlib.import_module(mod_name); "
        "entity = getattr(mod, func_name); "
        "sys.argv = sys.argv[1:]; "
        "inst = entity() if inspect.isclass(entity) else entity; "
        "fn = getattr(inst, 'run', getattr(inst, 'main', inst if callable(inst) else None)); "
        "asyncio.run(fn()) if inspect.iscoroutinefunction(fn) else fn()"
    )
    child_command = [sys.executable, "-c", runner_code] + sys.argv[1:]
else:
    child_command = [sys.executable, target] + sys.argv[2:]

child = subprocess.Popen(child_command)
_setup_watchdog(child)

def _forward_signal(sig, frame):
    try:
        child.terminate()
        child.wait(timeout=2)
    except Exception:
        try:
            child.kill()
        except Exception:
            pass
    sys.exit(0)

try:
    signal.signal(signal.SIGTERM, _forward_signal)
    signal.signal(signal.SIGINT, _forward_signal)
except Exception:
    pass

try:
    exit_code = child.wait()
except KeyboardInterrupt:
    _forward_signal(signal.SIGINT, None)

sys.exit(exit_code)
`.trim();

    return spawn(pythonExecutable, [ "-c", resortToExternalSupervisor === true ? supervisedPythonWatchdogBootstrapCode : inProcessPythonWatchdogBootstrapCode, ...parameters ], cwd, env, shell, stdio, options);
  }
}
