import fs from "node:fs";
import { spawn } from "child_process";
import { createHash } from "node:crypto";

import { Request, Response } from "express";
import { headers, methods } from "http-constants";
import { HttpStatus } from "@nestjs/common";

import { logger } from "./logger";
import { fileWithProtocol, NumericRange } from "./dtos/app.dtos";
import { ErrorCodes } from "./services/utils/parametersChecker";
import {
  DefinedResizeFormat,
  ErrorCause,
  guessFormat,
  ImageError,
  resize,
  ResizeFormat,
  ResizeRender
} from "./services/utils/images";


// TODO: give a try to Jimp, https://jimp-dev.github.io/
export class Resizer
{

  static readonly webServerBasePath = "resize";

  async handle(request: Request, response: Response, fileValidator: (nodePath: string) => string | undefined): Promise<void>
  {
    const url: string | undefined = request.query.u === undefined ? undefined : request.query.u as string;
    if (url === undefined)
    {
      response.status(HttpStatus.BAD_REQUEST).send(
        {
          code: 1,
          message: "Missing 'u' parameter"
        });
      return;
    }
    const index = url.indexOf(fileWithProtocol);
    const nodePath = index === -1 ? url : url.substring(fileWithProtocol.length);
    const result = fileValidator(nodePath);
    if (result !== undefined)
    {
      this.sendAssetError(response, HttpStatus.FORBIDDEN, 8, url, result);
    }
    else
    {
      await this.resize(request, response, "image", url, nodePath);
    }
  }

  sendTooManyRequestsError(response: Response): void
  {
    this.sendAssetError(response, HttpStatus.TOO_MANY_REQUESTS, 9, undefined, "too many requests");
  }

  private async resize(request: Request, response: Response, assetType: string, url: string, input: string | Buffer): Promise<void>
  {
    if (request.method === methods.OPTIONS)
    {
      response.status(HttpStatus.OK).send();
      return;
    }
    const timestamp = Date.now();
    const query = request.query;
    const renderParameterValue = query.r === undefined ? undefined : query.r as string;
    const widthParameterValue = query.w === undefined ? undefined : parseFloat(query.w as string);
    const heightParameterValue = query.h === undefined ? undefined : parseFloat(query.h as string);
    const formatParameterValue = query.f === undefined ? undefined : query.f as string;
    const qualityParameterValue = query.q === undefined ? 80 : parseInt(query.q as string);
    const enlargeableParameterValue = query.e;

    const width: number | undefined = (widthParameterValue !== undefined && widthParameterValue > 0) ? widthParameterValue : undefined;
    const height: number | undefined = (heightParameterValue !== undefined && heightParameterValue > 0) ? heightParameterValue : undefined;
    const format: ResizeFormat = formatParameterValue as ResizeFormat;
    const imageFormatLogFragment = `${assetType} ${typeof input === "string" ? ("in the file '" + input + "'") : ""}`;
    const logSuffix = `${imageFormatLogFragment} with render parameter set to '${renderParameterValue}'${enlargeableParameterValue === undefined ? "" : (", with enlargeable parameter set to '" + enlargeableParameterValue + "'")}${format === undefined ? "" : (`, with format '${format}'`)} and (width, height) set to (${width}, ${height})`;

    const logDuration = () =>
    {
      logger.debug("Resized locally in " + (Date.now() - timestamp) + " ms " + logSuffix);
    };

    const isInputBuffer = Buffer.isBuffer(input) === true;
    let stats: fs.Stats | undefined;
    try
    {
      stats = isInputBuffer === false ? fs.statSync(input) : undefined;
    }
    catch (error)
    {
      // It is very likely that the file does not exist
      const theError = error as Error;
      const isFileNotFound = "code" in theError === true ? (theError.code === "ENOENT") : false;
      this.sendAssetError(response, isFileNotFound === true ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR, isFileNotFound === true ? ErrorCodes.NOT_FOUND : ErrorCodes.INTERNAL_SERVER_ERROR, url, `the file '${input} does not exist`);
      return;
    }
    let lastModified: string | undefined;
    if (stats !== undefined)
    {
      const fileLastModificationDate: Date = stats.mtime;
      lastModified = fileLastModificationDate.toUTCString();
      // @ts-ignore
      const rawIfMatchValues: string | undefined = request.get(headers.request.IF_MATCH);
      const ifMatch: string | undefined = rawIfMatchValues === undefined ? undefined : rawIfMatchValues;
      // @ts-ignore
      const rawIfNoneMatchValues: string | undefined = request.get(headers.request.IF_NONE_MATCH);
      const ifNoneMatch: string | undefined = rawIfNoneMatchValues === undefined ? undefined : rawIfNoneMatchValues;
      const etag = ifMatch !== undefined ? ifMatch : ifNoneMatch;
      if (etag !== undefined)
      {
        const previousHash = this.computeHash(lastModified);
        if (previousHash === etag)
        {
          this.setOkOrUnmodifiedResponse(false, response, lastModified);
          response.end();
          logger.debug("Indicating no modification for the " + logSuffix);
          return;
        }
      }
      const rawIfModifiedSinceHeaderValues = request.get(headers.request.IF_MODIFIED_SINCE);
      const ifModifiedSince: string | undefined = rawIfModifiedSinceHeaderValues === undefined ? undefined : rawIfModifiedSinceHeaderValues[0];
      if (ifModifiedSince !== undefined)
      {
        const milliseconds: number = Date.parse(ifModifiedSince);
        if (fileLastModificationDate.getUTCDate() === milliseconds)
        {
          this.setOkOrUnmodifiedResponse(false, response, lastModified);
          response.end();
          logger.debug("Indicating no modification for the " + logSuffix);
          return;
        }
      }
    }
    else if (isInputBuffer === false)
    {
      logger.warn(`There are no statistics for the file '${input}'`);
    }

    logger.debug("Resizing locally the " + logSuffix);
    const contentTypePrefix = "image/";
    if ((width === 0 && height === 0) || (width === undefined && height === undefined))
    {
      // In this case, we are supposed to return the image as is
      const buffer: Buffer = isInputBuffer === false ? fs.readFileSync(input) : input as Buffer;
      const guessedFormat: DefinedResizeFormat = await guessFormat(imageFormatLogFragment, input);
      if (format === undefined || guessedFormat === format)
      {
        this.setOkOrUnmodifiedResponse(true, response, lastModified, contentTypePrefix + guessedFormat.toLowerCase());
        response.send(buffer);
        response.end();
        return;
      }
      else
      {
        // It enables not to read twice the image file
        input = buffer;
      }
    }

    if (Math.random() > 1)
    {
      // TODO: implement the animated GIF image
      if (formatParameterValue === "GIF")
      {
        if (Math.random() <= 1)
        {
          this.sendAssetError(response, HttpStatus.NOT_IMPLEMENTED, ErrorCodes.NOT_IMPLEMENTED, url, "cannot resize an animated GIF image other than on macOS");
          return;
        }
        // The "gifsicle" manual is available at https://www.lcdf.org/gifsicle/man.html
        const isInputFile = isInputBuffer === false;
        // TODO: implement this
        const gifsicleFilePath = "";
        const process = spawn(gifsicleFilePath, ["--resize", `${width === undefined ? "_" : width}x${height === undefined ? "_" : height}`, isInputFile === true ? input as string : "-"]);
        logger.debug("Resizing an animated GIF image");
        // Taken from https://stackoverflow.com/questions/14269233/node-js-how-to-read-a-stream-into-a-buffer
        const buffers: Uint8Array[] = [];
        process.stdout.on("data", (data: Uint8Array) =>
        {
          buffers.push(data);
        });
        process.on("close", (code: number | null) =>
        {
          if (code !== 0)
          {
            this.sendAssetError(response, HttpStatus.INTERNAL_SERVER_ERROR, 7, url, "animated GIF resizing internal error");
          }
          else
          {
            logDuration();
            this.setOkOrUnmodifiedResponse(true, response, lastModified, contentTypePrefix + "gif");
            response.send(Buffer.concat(buffers));
          }
        });
        if (isInputFile === false)
        {
          process.stdin.write(input);
          // We need to close the standard input stream
          process.stdin.end();
        }
      }
    }
    else
    {
      if (formatParameterValue !== undefined && format === undefined)
      {
        this.sendAssetError(response, HttpStatus.BAD_REQUEST, ErrorCodes.BAD_PARAMETER, url, `Invalid 'f' parameter with value '${formatParameterValue}'`);
        return;
      }
      const render: ResizeRender = renderParameterValue as ResizeRender;
      if (renderParameterValue !== undefined && render === undefined)
      {
        this.sendAssetError(response, HttpStatus.BAD_REQUEST, ErrorCodes.BAD_PARAMETER, url, `Invalid 'r' parameter with value '${renderParameterValue}'`);
        return;
      }
      try
      {
        const {
          format: actualFormat,
          buffer
        } = await resize(imageFormatLogFragment, input, format, width, height, render, Math.max(1, Math.min(100, qualityParameterValue)) as NumericRange<1, 100>, 1, enlargeableParameterValue === "1", false);
        logDuration();
        this.setOkOrUnmodifiedResponse(true, response, lastModified, contentTypePrefix + actualFormat.toLowerCase());
        response.send(buffer);
        response.end();
      }
      catch (error)
      {
        logger.error(`An unexpected error occurred while attempting to resize${format === undefined ? "" : `with the format '${format}'`} ${imageFormatLogFragment}`, error);
        const resizeError = error as ImageError;
        this.sendAssetError(response, resizeError.cause === ErrorCause.NotImplemented ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR, resizeError.cause === ErrorCause.NotImplemented ? ErrorCodes.BAD_PARAMETER : ErrorCodes.INTERNAL_SERVER_ERROR, url, resizeError.message);
      }
    }
  }

  private sendAssetError(response: Response, statusCode: number, code: number, url: string | undefined, reason: string): void
  {
    response.status(statusCode).json(
      {
        code: code,
        message: `Could not process the image${url === undefined ? "" : ` with URL '${url}'`}. Reason: '${reason}'`
      });
  };

  private setOkOrUnmodifiedResponse(isOk: boolean, response: Response, lastModified: string | undefined, mimeType?: string): void
  {
    const cacheDurationInSeconds = 0;
    response.setHeader(headers.response.CACHE_CONTROL, `max-age=${cacheDurationInSeconds}`);
    if (mimeType !== undefined)
    {
      response.setHeader(headers.response.CONTENT_TYPE, mimeType);
    }
    if (lastModified !== undefined)
    {
      response.setHeader(headers.response.LAST_MODIFIED, lastModified);
      const etag = this.computeHash(lastModified);
      response.setHeader(headers.response.ETAG, etag);
    }
    response.status(isOk === true ? HttpStatus.OK : HttpStatus.NOT_MODIFIED);
  }

  private computeHash(string: string): string
  {
    return createHash("sha256").update(string, "utf8").digest("hex");
  }

}
