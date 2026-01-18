import { Logger } from "winston";

import { createLogger } from "@picteus/shared-back-end";


class LogsBlotter
{

  private readonly logs: string[] = [];

  private isRunning: boolean = true;

  public log(message: string): void
  {
    if (this.isRunning === true)
    {
      this.logs.push(message);
    }
  }

  public stop(): void
  {
    this.isRunning = false;
    this.logs.length = 0;
  }

  public getLogs(): string[]
  {
    return this.logs;
  }

}

const bootstrapLogger = new LogsBlotter();
export const getBootstrapLogs: () => string[] = bootstrapLogger.getLogs.bind(bootstrapLogger);
export const stopBootstrapLogs: () => void = bootstrapLogger.stop.bind(bootstrapLogger);

export const logger: Logger = createLogger((level: string, message: string): void =>
{
  if (level === "error" || level === "warn" || level === "info")
  {
    bootstrapLogger.log(message as string);
  }
});
