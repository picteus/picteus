import path from "node:path";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer as createServerHttp, IncomingMessage, Server as ServerHttp, ServerResponse } from "node:http";
import { createServer as createServerHttps, Server as ServerHttps, ServerOptions } from "node:https";

import { Logger } from "winston";


export type Server = ServerHttp | ServerHttps;
export type WebCoordinates = { baseUrl: string, httpServer: Server };

export class WebServer
{

  private httpServer?: Server;

  public constructor(private readonly logger: Logger)
  {
  }

  async start(portNumber: number, useSsl: boolean, directoryPath: string, secretsDirectoryPath: string): Promise<WebCoordinates>
  {
    const baseUrl = `http${useSsl === false ? "" : "s"}://localhost:${portNumber}`;
    this.logger.info(`Starting the internal web server on port ${portNumber} server the local files located under '${directoryPath}', available under '${baseUrl}'`);
    const key = useSsl === false ? undefined : await readFile(path.join(secretsDirectoryPath, "key.pem"));
    const cert = useSsl === false ? undefined : await readFile(path.join(secretsDirectoryPath, "cert.pem"));

    const contentTypeHeaderName = "Content-Type";
    const textPlain = "text/plain";
    const options: ServerOptions = { key, cert };
    const handleMessage = async (request: IncomingMessage, response: ServerResponse) =>
    {
      if (request.url === undefined)
      {
        response.setHeader(contentTypeHeaderName, textPlain).writeHead(403).end();
        return;
      }
      const url = new URL(`https://domain${request.url}`);
      const fileName = url.pathname.substring(1);
      const filePath = path.join(directoryPath, fileName === "" ? "index.html" : fileName);
      if (fs.existsSync(filePath) === false)
      {
        response.setHeader(contentTypeHeaderName, textPlain).writeHead(404).end(`File ${filePath} does not exist`);
        return;
      }
      const rawExtension = path.extname(filePath);
      const extension = rawExtension.startsWith(".") ? rawExtension.substring(1) : "";
      let mimeType: string;
      switch (extension)
      {
        default :
          mimeType = textPlain;
          break;
        case "html":
          mimeType = "text/html";
          break;
        case "js":
          mimeType = "application/javascript";
          break;
        case "css":
          mimeType = "text/css";
          break;
        case "json":
          mimeType = "application/json";
          break;
      }
      this.logger.debug(`Serving the file '${filePath}' with MIME type '${mimeType}'`);
      const content = fs.readFileSync(filePath, { encoding: "utf8" });
      response.setHeader(contentTypeHeaderName, mimeType).writeHead(200).end(content);
    };
    const httpServer: Server = useSsl === false ? createServerHttp(options, handleMessage) : createServerHttps(options, handleMessage);
    this.httpServer = httpServer;
    return new Promise<WebCoordinates>((resolve, reject) =>
    {
      httpServer.on("error", reject);
      httpServer.on("listening", () =>
      {
        this.logger.debug("The internal web server is listening");
        resolve({ baseUrl, httpServer });
      });
      httpServer.listen(portNumber, () =>
      {
        this.logger.debug("The internal web server is started");
      });
    });
  }

  stop(): void
  {
    if (this.httpServer !== undefined)
    {
      this.logger.info("Stopping the HTTP server");
      this.httpServer.close();
      this.logger.debug("The HTTP server is now stopped");
    }
  }

}
