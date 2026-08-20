import * as path from "node:path";
import * as fs from "node:fs";
import * as process from "node:process";

import {
  Communicator,
  EventName,
  type EventValue,
  PicteusExtension,
  type SettingsValue,
  type Versions
} from "@picteus/internal-extension-sdk";


const blotterFilePath = path.join(process.cwd(), "blotter.json");
const blotterEvents: Record<string, any>[] = [];
const saveBlotterFile = (id: string, value?: Record<string, any>) =>
{
  const entry = { id, value };
  blotterEvents.push(entry);
  console.debug(`Saving the blotter file '${blotterFilePath}' with new entry '${JSON.stringify(entry)}'`);
  fs.writeFileSync(blotterFilePath, JSON.stringify(blotterEvents, undefined, 2));
};

class TestNodeExtension extends PicteusExtension
{

  protected async initialize(): Promise<boolean>
  {
    const result = await super.initialize();
    saveBlotterFile("initialize");
    return result;
  }

  protected async onUpgrade(communicator: Communicator, versions: Versions): Promise<void>
  {
    saveBlotterFile("onUpgrade", versions);
    if (process.argv.find(argument => argument === "--failOnUpgrade") !== undefined)
    {
      throw new Error("onUpgrade");
    }
  }

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    await super.onReady(communicator);
    saveBlotterFile("onReady");
  }

  protected async onTerminate(): Promise<void>
  {
    await super.onTerminate();
    saveBlotterFile("onTerminate");
  }

  protected async onSettings(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    await super.onSettings(communicator, value);
    saveBlotterFile("onSettings", value);
  }

  protected async onEvent(communicator: Communicator, event: EventName, value: EventValue): Promise<any>
  {
    return await super.onEvent(communicator, event, value);
  }

}

new TestNodeExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
