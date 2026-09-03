import path from "node:path";
import fs from "node:fs";
import { ClassConstructor } from "class-transformer/types/interfaces";
import { z } from "zod";
import HttpCodes from "http-codes";

import { toInstanceAndValidate } from "./classValidatorWrapper";
import { ServiceError } from "../../app.exceptions";
import {
  alphaNumericPlusAdditionalAuthorizedCharactersPattern,
  alphaNumericPlusPattern,
  fileWithProtocol
} from "../../dtos/app.dtos";


const { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_IMPLEMENTED } = HttpCodes;

export enum ErrorCodes
{
  INTERNAL_SERVER_ERROR = -1,
  BAD_PARAMETER = 3,
  NOT_FOUND = 4,
  NOT_IMPLEMENTED = 5
}

export enum StringLengths
{
  Length32 = 32,
  Length64 = 64,
  Length256 = 256,
  Length1024 = 1_024,
  Length4096 = 4 * 1_024
}

export enum StringNature
{
  Free = "free",
  Technical = "technical",
  Tag = "tag",
  FileSystemFileName = "fileSystemFileName",
  FileSystemRelativeDirectoryPath = "fileSystemRelativeDirectoryPath",
  FileSystemDirectoryPath = "fileSystemDirectoryPath",
  FileSystemFilePath = "fileSystemFilePath",
  Url = "url",
}

export class ParametersChecker
{

  constructor(private readonly entityName: string)
  {
  }

  stringify(items: (string | number) []): string
  {
    const quotedItems = items.map(item => typeof item === "string" ? `'${item}'` : item.toString());
    return `[${quotedItems.join(", ")}]`;
  }

  async checkObject<T extends object>(theClass: ClassConstructor<T>, object: Object, errorMessage: string): Promise<T>
  {
    const result = await toInstanceAndValidate<T>(theClass, object, false, true);
    if ("error" in result)
    {
      this.throwBadParameterError(`${errorMessage}: the property '${result.error.property}' is invalid` + `, because ${result.error.cause}`);
    }
    return result.success;
  }

  checkString(name: string, value: string | undefined, maximumLength: StringLengths, nature: StringNature = StringNature.Free, isOptional: boolean = false, mayBeEmpty: boolean = false): void
  {
    if (value === undefined && isOptional === false)
    {
      this.throwMissingParameter(name);
    }
    if (value !== undefined)
    {
      {
        const returnType = z.string().min(mayBeEmpty === true ? 0 : 1).max(maximumLength).safeParse(value);
        if (returnType.success === false)
        {
          this.throwBadParameter(name, value, `${returnType.error.issues[0].code === "too_small" ? "it is empty" : `it exceeds ${maximumLength} characters`}`);
        }
      }
      if (nature === StringNature.Technical || nature === StringNature.Tag)
      {
        const returnType = z.string().regex(new RegExp(`^[${nature === StringNature.Technical ? alphaNumericPlusPattern : alphaNumericPlusAdditionalAuthorizedCharactersPattern}]*$`)).safeParse(value);
        if (returnType.success === false)
        {
          this.throwBadParameter(name, value, "it contains illegal characters");
        }
      }
      else if (nature === StringNature.FileSystemFileName)
      {
        let isValidValue: boolean;
        {
          // Inspired from https://stackoverflow.com/questions/1976007/what-characters-are-forbidden-in-windows-and-linux-directory-names
          const returnType = z.string().regex(/^[^<>:,?"*|\\/]+$/).safeParse(value);
          isValidValue = returnType.success === true;
        }
        if (isValidValue === true)
        {
          const forbiddenCharacters = process.platform === "win32" ? Array.from(Array(32), (_, index) => index) : [ 0 ];
          for (let index = 0; index < value.length; index++)
          {
            const codePoint = value.codePointAt(index)!;
            if (forbiddenCharacters.indexOf(codePoint) !== -1)
            {
              isValidValue = false;
            }
          }
        }
        if (isValidValue === true)
        {
          if (process.platform === "win32")
          {
            const forbiddenPrefixes = [ "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9" ];
            if (forbiddenPrefixes.filter(prefix => value.startsWith(prefix) === true).length > 0)
            {
              isValidValue = false;
            }
            else if (value.endsWith(" ") === true)
            {
              isValidValue = false;
            }
          }
          if (value === "." || value === "..")
          {
            isValidValue = false;
          }
        }
        if (isValidValue === false)
        {
          this.throwBadParameter(name, value, "it contains illegal characters");
        }
      }
      else if (nature === StringNature.FileSystemRelativeDirectoryPath)
      {
        const relativePathTokens = value.split("/");
        if (relativePathTokens[0] === "" && value.length > 0)
        {
          parametersChecker.throwBadParameter(name, value, "it starts with a '/'");
        }
        const referencePath = path.resolve("reference", "path");
        if (path.relative(referencePath, path.resolve(referencePath, ...relativePathTokens)).startsWith(".."))
        {
          parametersChecker.throwBadParameter(name, value, "it is a traversal path pointing to a location higher that the repository's on the file system");
        }
      }
      else if (nature === StringNature.FileSystemDirectoryPath || nature === StringNature.FileSystemFilePath)
      {
        const prefix = process.platform === "win32" ? "[a-zA-Z]:[\\\\\\/]" : "/";
        const returnType = z.string().regex(new RegExp(`^${prefix}[^<>:,?"*|]+$`, "")).safeParse(value);
        if (returnType.success === false)
        {
          this.throwBadParameter(name, value, "it contains illegal characters");
        }
        const parsedPath = path.parse(value);
        const nodePath = path.join(parsedPath.dir, parsedPath.base);
        if (nodePath !== value)
        {
          this.throwBadParameter(name, value, "it is not a valid file system path");
        }
        let stats: fs.Stats | undefined;
        try
        {
          stats = fs.lstatSync(nodePath);
        }
        catch (error)
        {
          // This happens if the path does not correspond to any existing node
        }
        if (stats !== undefined)
        {
          if (stats.isSymbolicLink() === true)
          {
            let resolvedNodePath;
            try
            {
              resolvedNodePath = fs.realpathSync(nodePath);
            }
            catch (error)
            {
              // This happens if the symbolic link is broken
              this.throwBadParameter(name, value, "it corresponds to a broken symbolic link");
            }
            stats = fs.lstatSync(resolvedNodePath);
          }
          if (nature === StringNature.FileSystemDirectoryPath)
          {
            if (stats.isDirectory() === false)
            {
              this.throwBadParameter(name, value, "it does corresponds to a directory");
            }
          }
          else if (nature === StringNature.FileSystemFilePath)
          {
            if (stats.isFile() === false)
            {
              this.throwBadParameter(name, value, "it does corresponds to a file");
            }
          }
        }
      }
      else if (nature === StringNature.Url)
      {
        const returnType = z.url().safeParse(value);
        if (returnType.success === false)
        {
          this.throwBadParameter(name, value, "is not a valid URL");
        }
      }
    }
  }

  checkNumber(name: string, value: number | undefined, minimumValue?: number, maximumValue?: number): void
  {
    if (value !== undefined)
    {
      let zodNumber = z.number();
      if (minimumValue !== undefined)
      {
        zodNumber = zodNumber.min(minimumValue, `it is lower than ${minimumValue}`);
      }
      if (maximumValue !== undefined)
      {
        zodNumber = zodNumber.max(maximumValue, `it is greater than ${maximumValue}`);
      }
      const returnType = zodNumber.safeParse(value);
      if (returnType.success === false)
      {
        const reason = returnType.error.issues[0].message;
        this.throwBadParameter(name, value.toString(), reason);
      }
    }
  }

  checkFileUrl(name: string, value: string): void
  {
    const returnType = z.string().startsWith(fileWithProtocol).safeParse(value);
    if (returnType.success === false)
    {
      this.throwBadParameter(name, value, `it should start with '${fileWithProtocol}`);
    }
  }

  throwMissingParameter(name: string): never
  {
    this.throwBadParameterError(`The '${name}' ${this.entityName} is missing`);
  }

  computeBadParameter(name: string, value: string | string [] | number[] | undefined, reason: string): ServiceError
  {
    const valueAsString = value === undefined ? undefined : (typeof value === "string" ? `'${value}'` : this.stringify(value));
    return this.computeBadParameterError(`The ${this.entityName} '${name}'${value === undefined ? "" : ` with value ${valueAsString}`} is invalid because ${reason}`);
  }

  throwBadParameter(name: string, value: string | string [] | number[] | undefined, reason: string): never
  {
    throw this.computeBadParameter(name, value, reason);
  }

  throwBadParameterError(message: string): never
  {
    throw this.computeBadParameterError(message);
  }

  throwInternalError(message: string): never
  {
    throw this.computeInternalError(message);
  }

  // noinspection JSUnusedGlobalSymbols
  throwNotImplemented(): never
  {
    throw new ServiceError("Not implemented", NOT_IMPLEMENTED, ErrorCodes.NOT_IMPLEMENTED);
  }

  private computeBadParameterError(message: string): ServiceError
  {
    return new ServiceError(message, BAD_REQUEST, ErrorCodes.BAD_PARAMETER);
  }

  private computeInternalError(message: string): ServiceError
  {
    return new ServiceError(message, INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_SERVER_ERROR);
  }

}

export const parametersChecker: ParametersChecker = new ParametersChecker("parameter");

export const environmentVariableChecker: ParametersChecker = new ParametersChecker("environment variable");
