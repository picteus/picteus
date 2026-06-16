import path from "node:path";
import fs, { constants } from "node:fs";
import os from "node:os";
import zlib from "node:zlib";

import AdmZip from "adm-zip";
import tar from "tar-fs";

import { logger } from "../../logger";


export function getTemporaryDirectoryPath(): string
{
  return fs.mkdtempSync(path.join(os.tmpdir(), "picteus-"));
}

export function computeAttachmentDisposition(fileName: string): string
{
  // See the discussion regarding the encoding of the file name at https://stackoverflow.com/questions/70804280/utf-8-characters-in-filename-for-content-disposition-yield-illegalargumente
  return `attachment; filename*=utf-8''${encodeURIComponent(fileName)}`;
}

export type CompressedType = "tar.gz" | "zip";

export function computeCompressedType(buffer: Buffer): CompressedType | null
{
  // A buffer must be at least 4 bytes long to check the longest signature we need (ZIP)
  if (buffer.length < 4)
  {
    return null;
  }

  // The gzip signature is '0x1F 0x8B 0x08'
  if (buffer[0] === 0x1F && buffer[1] === 0x8B && buffer[2] === 0x08)
  {
    // Since .tar.gz and .tgz are essentially gzipped files, they share this magic number.
    return "tar.gz";
  }

  // The zip signature is '0x50 0x4B 0x03 0x04' or '0x50 0x4B 0x05 0x06' in case of an empty archive or '0x50 0x4B 0x07 0x08' in case of an empty archive, see https://en.wikipedia.org/wiki/List_of_file_signatures
  if (buffer[0] === 0x50 && buffer[1] === 0x4B && ((buffer[2] === 0x03 && buffer[3] === 0x04)) || (buffer[2] === 0x05 && buffer[3] === 0x06) || (buffer[2] === 0x07 && buffer[3] === 0x08))
  {
    return "zip";
  }
  return null;
}

export function downloadAndStoreFile(url: string, filePath: string, logFragment: string): Promise<void>
{
  return new Promise<void>((resolve, reject) =>
  {
    logger.debug(`Downloading the ${logFragment} from '${url}' and storing it to the file '${filePath}'`);
    fetch(url).then((response) =>
    {
      if (response.ok === true)
      {
        return response.arrayBuffer().then((buffer: ArrayBuffer) =>
        {
          fs.writeFileSync(filePath, new DataView(buffer));
          resolve();
        }).catch((error) =>
        {
          reject(new Error(`Could not write into the file '${filePath}' the content from URL '${url}'. Reason: '${error.message}`));
        });
      }
      else
      {
        reject(new Error(`Failed to download the ${logFragment} from '${url}', because of an HTTP request with status ${response.status}`));
      }
    });
  });
}

export async function inflateZip(archiveFilePathOrBuffer: string | Buffer, targetDirectoryPath: string, logFragment: string): Promise<void>
{
  logger.info(`Inflating the ${logFragment} zip file${Buffer.isBuffer(archiveFilePathOrBuffer) === true ? "" : ` '${archiveFilePathOrBuffer}'`} into directory '${targetDirectoryPath}'`);
  const buffer: Buffer = Buffer.isBuffer(archiveFilePathOrBuffer) === true ? archiveFilePathOrBuffer : fs.readFileSync(archiveFilePathOrBuffer);
  const zip: AdmZip = new AdmZip(buffer);
  zip.extractAllTo(targetDirectoryPath, true);
}

export async function inflateGzippedTarball(archiveFilePath: string, targetDirectoryPath: string, logFragment: string): Promise<void>
{
  logger.debug(`Inflating the ${logFragment} gzipped tarball into '${targetDirectoryPath}'`);
  // We ensure that the target directory exists
  fs.mkdirSync(targetDirectoryPath, { recursive: true });
  return new Promise<void>((resolve, reject) =>
  {
    // We create a read stream from the tarball
    const tarballStream = fs.createReadStream(archiveFilePath);
    // We create a gzip decompression stream
    const gunzip = zlib.createGunzip();
    tarballStream.pipe(gunzip).pipe(tar.extract(targetDirectoryPath)).on("finish", resolve).on("error", reject);
  });
}

export function generateTarGz(sourceDirectoryPath: string, targetFilePath: string, logFragment: string)
{
  logger.debug(`Creating the ${logFragment} gzipped tarball file '${targetFilePath}' from the files in directory '${sourceDirectoryPath}'`);
  const output = fs.createWriteStream(targetFilePath);
  const compress = zlib.createGzip();
  const packer = tar.pack(sourceDirectoryPath,
    {
      // We exclude the resulting .tar.gz file if it happens to be inside the source directory
      ignore: (name) => path.resolve(name) === path.resolve(targetFilePath)
    });

  return new Promise<void>((resolve, reject) =>
  {
    packer.pipe(compress).pipe(output).on("error", reject).on("close", resolve);
  });
}

export function ensureDirectory(directoryPath: string, symbolicLinkTargetDirectoryPath?: string, overwrite?: boolean): void
{
  logger.debug(symbolicLinkTargetDirectoryPath === undefined ? `Ensuring that the directory path '${directoryPath}' exists` : `Ensuring that the symbolic link directory '${directoryPath}' pointing to ${symbolicLinkTargetDirectoryPath} exists`);
  let doDelete = false;
  let doCreate = false;
  if (fs.existsSync(directoryPath) === false)
  {
    let stats: fs.Stats | undefined;
    try
    {
      // Checks whether the path exists as a symbolic link
      stats = fs.lstatSync(directoryPath);
    }
    catch (error)
    {
      let isExpectedError = false;
      if (typeof error === "object" && error !== null && "code" in error)
      {
        if (error.code === "EEXIST")
        {
          // The symbolic link does not exist
          doCreate = true;
          isExpectedError = true;
        }
        else if (error.code === "ENOENT")
        {
          // A file with that path exists
          doCreate = true;
          isExpectedError = true;
        }
      }
      if (isExpectedError === false)
      {
        if (symbolicLinkTargetDirectoryPath === undefined)
        {
          throw new Error(`The path '${directoryPath}' is invalid${typeof error === "object" && error !== null && "message" in error ? `. Reason: '${error.message}'` : ""}`);
        }
      }
    }
    if (stats !== undefined && stats.isSymbolicLink() === true)
    {
      // A filesystem node path exists and is a symbolic link: we assess whether this is the expected symbolic link
      try
      {
        const realDirectoryPath = fs.realpathSync(directoryPath);
        if (symbolicLinkTargetDirectoryPath !== undefined)
        {
          doDelete = realDirectoryPath !== symbolicLinkTargetDirectoryPath;
          doCreate = doDelete;
        }
      }
      catch (error)
      {
        if (symbolicLinkTargetDirectoryPath === undefined)
        {
          throw new Error("The path '" + directoryPath + "' points to a symbolic link with a non-existing target");
        }
        if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")
        {
          // The target symbolic link does not exist
          doDelete = true;
          doCreate = true;
        }
        else
        {
          throw error;
        }
      }
    }
  }
  else
  {
    if (symbolicLinkTargetDirectoryPath !== undefined)
    {
      const realDirectoryPath = fs.realpathSync(directoryPath);
      if (symbolicLinkTargetDirectoryPath !== undefined)
      {
        if (realDirectoryPath !== symbolicLinkTargetDirectoryPath)
        {
          // The symbolic link is broken
          doDelete = true;
          doCreate = true;
        }
      }
    }
    else
    {
      const stats = fs.lstatSync(directoryPath);
      if (stats.isDirectory() === false && fs.lstatSync(directoryPath).isSymbolicLink() === false)
      {
        throw new Error("The path '" + directoryPath + "' already exists and is not a directory");
      }
    }
  }
  if (symbolicLinkTargetDirectoryPath !== undefined && doDelete === true)
  {
    if (overwrite === true)
    {
      logger.debug(`Deleting the symbolic with path '${directoryPath}'`);
      fs.rmSync(directoryPath, { recursive: true, force: true });
    }
    else
    {
      throw new Error(`The path '${directoryPath}' already exists and is not the expected symbolic link to '${symbolicLinkTargetDirectoryPath}'`);
    }
  }
  if (doCreate === true)
  {
    logger.debug(symbolicLinkTargetDirectoryPath !== undefined ? `Creating the symbolic link directory from path '${directoryPath}' to '${symbolicLinkTargetDirectoryPath}'` : `Creating the directory '${directoryPath}'`);
    if (symbolicLinkTargetDirectoryPath !== undefined)
    {
      fs.symlinkSync(symbolicLinkTargetDirectoryPath, directoryPath, "dir");
    }
    else
    {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
  }
}

export async function move(sourcePath: string, destinationPath: string, options: {
  overwrite?: boolean,
  preserveSymlinks?: boolean
} = {}): Promise<void>
{
  logger.info(`Moving the path '${sourcePath}' into '${destinationPath}'`);

  function isCrossDeviceError(error: unknown): boolean
  {
    return typeof error === "object" && error !== null && "code" in error && error.code === "EXDEV";
  }

  const { overwrite = false, preserveSymlinks = true } = options;
  const sourceStats = fs.lstatSync(sourcePath);
  if (sourceStats.isDirectory() === false)
  {
    try
    {
      fs.renameSync(sourcePath, destinationPath);
    }
    catch (error)
    {
      if (isCrossDeviceError(error) === true)
      {
        // This is expected because "EXDEV" means cross-device
        fs.copyFileSync(sourcePath, destinationPath, overwrite === true ? constants.COPYFILE_FICLONE : constants.COPYFILE_EXCL);
      }
      else
      {
        throw error;
      }
    }
    return;
  }

  if (fs.existsSync(destinationPath) === true)
  {
    const destinationStats = fs.lstatSync(destinationPath);
    if (destinationStats.isDirectory() === true || destinationStats.isFile() === true || destinationStats.isSymbolicLink() === true)
    {
      if (overwrite === false)
      {
        throw new Error(`The destination path '${destinationPath}' already exists`);
      }
      // We remove the existing destination
      fs.rmSync(destinationPath, { recursive: true, force: true });
    }
  }

  // We first try an atomic rename first, which works if the source and destination are on the same filesystem
  try
  {
    fs.renameSync(sourcePath, destinationPath);
    // The work is done, no need to go further
    return;
  }
  catch (error)
  {
    if (isCrossDeviceError(error) === true)
    {
      // This is expected because "EXDEV" means cross-device, we will handle that below
    }
    else
    {
      throw error;
    }
  }

  async function copyDirectoryRecursive(sourceDirectoryPath: string, destinationDirectoryPath: string, preserveSymlinks: boolean): Promise<void>
  {
    // We create the destination directory
    fs.mkdirSync(destinationDirectoryPath, { recursive: true });

    // We read the directory contents
    const entries = fs.readdirSync(sourceDirectoryPath, { withFileTypes: true });

    // We process each entry
    await Promise.all(entries.map(async (entry) =>
      {
        const sourcePath = path.join(sourceDirectoryPath, entry.name);
        const destinationPath = path.join(destinationDirectoryPath, entry.name);
        if (entry.isSymbolicLink() === true)
        {
          // We handle a symbolic link
          if (preserveSymlinks === true)
          {
            const linkTargetPath = fs.readlinkSync(sourcePath);
            fs.symlinkSync(linkTargetPath, destinationPath);
          }
          else
          {
            // We copy the target content instead of the link
            const targetStats = fs.statSync(sourcePath);
            if (targetStats.isDirectory() === true)
            {
              await copyDirectoryRecursive(sourcePath, destinationPath, preserveSymlinks);
            }
            else
            {
              fs.copyFileSync(sourcePath, destinationPath);
            }
          }
        }
        else if (entry.isDirectory() === true)
        {
          // We recursively copy the subdirectories
          await copyDirectoryRecursive(sourcePath, destinationPath, preserveSymlinks);
        }
        else if (entry.isFile() === true)
        {
          // We copy the file
          fs.copyFileSync(sourcePath, destinationPath);
        }
      })
    );

    // Preserve directory permissions
    const sourceStats = fs.statSync(sourceDirectoryPath);
    fs.chmodSync(destinationDirectoryPath, sourceStats.mode);
  }

  // We copy and then delete the source directory recursively
  logger.debug(`Copying the directory '${sourcePath}' into '${destinationPath}'`);
  await copyDirectoryRecursive(sourcePath, destinationPath, preserveSymlinks);
  fs.rmSync(sourcePath, { recursive: true, force: true });
}
