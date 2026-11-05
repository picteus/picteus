import path from "node:path";
import fs from "node:fs";
import process from "node:process";

import { Communicator, PicteusExtension, type SettingsValue } from "@picteus/extension-sdk";


class McpServerExtension extends PicteusExtension
{

  private currentPortNumber?: number;

  private stopMcpServer?: () => void;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
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
      const resolvedApiKey = apiKey ?? this.parameters.apiKey;
      process.env["PORT"] = String(portNumber);
      process.env["API_BASE_URL"] = this.parameters.webServicesBaseUrl;
      process.env["API_KEY_API_KEY"] = resolvedApiKey;
      fs.writeFileSync(path.join(process.cwd(), ".env"), `PORT=${portNumber}\nAPI_BASE_URL=${this.parameters.webServicesBaseUrl}\nAPI_KEY_API_KEY=${resolvedApiKey}\n`);
      if (this.currentPortNumber === portNumber)
      {
        return;
      }
      if (this.stopMcpServer !== undefined)
      {
        this.stopMcpServer();
        this.stopMcpServer = undefined;
      }
      const { main, SERVER_NAME } = await import("../generated/src/index.js");
      const baseUrl = `http://localhost:${portNumber}`;
      const mcpEndpointUrl = `${baseUrl}/mcp`;
      communicator.sendLog(`Starting the MCP server on port number ${portNumber}`, "info");
      await main();
      const isReady = await this.waitForServerReady(baseUrl, SERVER_NAME);
      if (isReady === false)
      {
        communicator.sendLog(`MCP server failed to become ready at '${mcpEndpointUrl}'`, "error");
        return;
      }
      this.currentPortNumber = portNumber;
      this.stopMcpServer = async () =>
      {
        communicator.sendLog(`Stopping the MCP server`, "info");
      };
      communicator.sendLog(`MCP server started and listening at '${mcpEndpointUrl}'`, "info");
    }
  }

  private async waitForServerReady(baseUrl: string, expectedServerName: string): Promise<boolean>
  {
    const maximumAttemptsCount = 20;
    const delayInMilliseconds = 250;
    for (let index = 0; index < maximumAttemptsCount; index++)
    {
      try
      {
        const response = await fetch(`${baseUrl}/health`);
        if (response.ok === true)
        {
          const body = await response.json() as { status?: string; server?: string };
          if (body.status === "OK" && body.server === expectedServerName)
          {
            return true;
          }
        }
      }
      catch
      {
        // Server is still binding the socket; retry shortly
      }
      await new Promise((resolve) => setTimeout(resolve, delayInMilliseconds));
    }
    return false;
  }

}

new McpServerExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
