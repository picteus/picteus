import { pid } from "node:process";
import { isMainThread, threadId } from "worker_threads";

import { TransformableInfo } from "logform";
import { createLogger as builtInCreateLogger, format, Logger, transports } from "winston";


export interface FileLoggerOptions
{
  directoryPath: string;

  name: string;
}

function computeFileTransport(options: FileLoggerOptions): typeof transports.File
{
  return new transports.File({
    dirname: options.directoryPath,
    filename: "picteus-" + options.name + ".log",
    format: format.uncolorize(),
    maxFiles: 20,
    maxsize: 1_024 * 1_024
  });
}

export function addFileTransport(logger: Logger, options: FileLoggerOptions): void
{
  logger.add(computeFileTransport(options));
}

export function createLogger(options?: FileLoggerOptions, callback?: (level: string, message: string) => void): Logger
{
  const loggerTransports: any[] = [new transports.Console()];

  if (options !== undefined)
  {
    loggerTransports.push(computeFileTransport(options));
  }

  return builtInCreateLogger({
    level: "silly",
    format: format.combine(
      format.timestamp({ format: "HH:mm:ss.SSS" }),
      format.errors({ stack: true }),
      format.printf(({ level, message, stack, timestamp }: TransformableInfo) =>
      {
        if (callback !== undefined)
        {
          callback(level, message as string);
        }
        const processFragment = String(pid).padStart(5, " ");
        return `${timestamp} | ${processFragment} | ${(isMainThread === true ? "main" : String(threadId)).padStart(4, " ")} [${level.toUpperCase().padStart(5, " ")}]: ${message}${stack === undefined ? "" : (`
${stack}`)}`;
      }),
      format.colorize({ all: true })),
    transports: loggerTransports
  });
}
