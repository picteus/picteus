import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import os from "node:os";

import semver from "semver";

import { paths } from "../../paths";
import { logger } from "../../logger";
import { execute, spawn, spawnAndWait, waitFor, which } from "./processWrapper";
import { downloadAndStoreFile, getTemporaryDirectoryPath, inflateGzippedTarball, move } from "./downloader";


const acceptedPython3MajorVersion = 3;

const runtimePythonDirectoryName = "python";

const runtimePythonVersionsDirectoryName = "versions";

const fromRuntimesPyenvPaths = [runtimePythonDirectoryName, "pyenv"];

const fromRuntimesHomebrewPaths = ["brew"];

const fromHomebrewRootToBinaryPaths = ["bin", "brew"];

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

export const acceptedPython3MinorVersions = [8, 9, 10, 11, 12, 13, 14];

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
    const formulas: string[] = [xzModuleName, "readline"];
    for (const formula of formulas)
    {
      logger.debug(`Installing the Homebrew formula '${formula}'`);
      const childProcess = spawn(brewFilePath, ["install", formula], brewDirectoryPath, undefined, true);
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

    const xzDirectoryPath = (await execute(brewFilePath, ["--prefix", xzModuleName])).stdout.trim();
    // We also need to create a symbolic link for the xz module C headers and dynamic library, because a space if their path causes the Python installation to fail
    const xzTemporaryDirectoryPath = path.join(temporaryDirectoryPath, xzModuleName);
    fs.symlinkSync(xzDirectoryPath, xzTemporaryDirectoryPath, "dir");
    const brewTemporaryDirectoryPath = path.join(temporaryDirectoryPath, "brew");
    fs.symlinkSync(brewDirectoryPath, brewTemporaryDirectoryPath, "dir");

    logger.info(`Installing Python v${pythonVersion} via pyenv`);
    const pyenvFilePath = path.join(workingDirectoryPath, "bin", "pyenv");
    const childProcess = spawn(pyenvFilePath, ["install", pythonVersion], workingDirectoryPath, {
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
  const fromRootPaths = isWindows === true ? [minicondaPythonExecutable] : [pythonBinaryDirectoryName, minicondaPythonExecutable];
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
    const childProcess = spawn(archiveFilePath, isWindows === true ? ["/S", `/D=${temporaryInstallationDirectoryPath}`] : ["-b", "-m", "-p", `"${temporaryInstallationDirectoryPath}"`], temporaryDirectoryPath, undefined, true);
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
    const processResult = await execute(pythonExecutable, ["-c", `"import sys\nprint(sys.executable)"`]);
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
  const result = (await execute(pythonExecutablePath, ["--version"])).stdout.trim();
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
    const activateFilePaths = (os.platform() === "win32" ? ["activate.bat", "Activate.ps1"] : ["activate", "activate.fish", "activate.csh", "Activate.ps1"]).map((fileName: string) =>
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
    await spawnAndWait(pythonFilePath, ["-m", "venv", directoryName], parentDirectoryPath);
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
  const additionalParameters = pythonInternalSdkDirectoryPath === undefined ? [] : ["--find-links", pythonInternalSdkDirectoryPath];
  const pipFilePath = computeVirtualEnvironmentPipFilePath(parentDirectoryPath);
  await spawnAndWait(pipFilePath, ["install", "-r", requirementsFilePath, ...additionalParameters], parentDirectoryPath);
  if (pythonInternalSdkDirectoryPath !== undefined)
  {
    // We want to make sure that no cached version of the SDK is used
    await spawnAndWait(pipFilePath, ["install", "--no-cache-dir", "--force", "--find-links", pythonInternalSdkDirectoryPath, publicPythonSdkIdentifier], parentDirectoryPath, undefined, false);
  }
}

export async function installViaVirtualEnvironmentPip(parentDirectoryPath: string, packages: string []): Promise<void>
{
  logger.info(`Installing the Python package(s) '${packages.join("', '")}'`);
  await execute(computeVirtualEnvironmentPipFilePath(parentDirectoryPath), ["install", ...packages], parentDirectoryPath);
}

export async function ensureViaVirtualEnvironmentPip(parentDirectoryPath: string, packages: string [], binaryFileName: string): Promise<void>
{
  logger.info(`Checking that the Python package(s) '${packages.join("', '")}' are installed in the virtual environment in directory '${parentDirectoryPath}' and that the '${binaryFileName}' binary is available`);
  if (fs.existsSync(path.join(computeVirtualEnvironmentBinaryDirectoryPath(parentDirectoryPath), binaryFileName)) === false)
  {
    await installViaVirtualEnvironmentPip(parentDirectoryPath, packages);
  }
}
