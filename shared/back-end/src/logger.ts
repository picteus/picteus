import { pid } from "node:process";
import { isMainThread, threadId } from "worker_threads";

import { TransformableInfo } from "logform";
import { createLogger as builtInCreateLogger, format, Logger, transports } from "winston";


export function createLogger(callback?: (level: string, message: string) => void): Logger
{
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
    transports: [new transports.Console()]
  });
}
