import path from "node:path";
import fs from "node:fs";
import process from "node:process";

import { Communicator, PicteusExtension, SettingsValue } from "@picteus/extension-sdk";


class McpServerExtension extends PicteusExtension
{

  private stopMcpServer?: () => void;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    await super.onReady(communicator);
    await this.setup(communicator!, await this.getSettings());
  }

  protected async onSettings(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    await this.setup(communicator, value);
  }

  private async setup(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    const portNumber: number | undefined = value["portNumber"];
    const apiKey: string | undefined = value["apiKey"];
    if (portNumber !== undefined)
    {
      fs.writeFileSync(path.join(process.cwd(), ".env"), `PORT=${portNumber}\nAPI_BASE_URL=${this.parameters.webServicesBaseUrl}\nAPI_KEY_API_KEY=${apiKey ?? this.parameters.apiKey}\n`);
      if (this.stopMcpServer !== undefined)
      {
        this.stopMcpServer();
        this.stopMcpServer = undefined;
      }
      const { main } = await import("../generated/src/index.js");
      communicator.sendLog(`Starting the MCP server on port number ${portNumber}`, "info");
      await main();
      this.stopMcpServer = async () =>
      {
        communicator.sendLog(`Stopping the MCP server`, "info");
      };
      communicator.sendLog(`MCP server started`, "info");
    }
  }

}

new McpServerExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
