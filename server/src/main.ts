import path from "node:path";
import fs from "node:fs";
import process from "node:process";
import type { Server } from "node:http";

import { Express, Request, Response } from "express";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import { ExpressAdapter, NestExpressApplication } from "@nestjs/platform-express";
import { HttpStatus, NestApplicationOptions } from "@nestjs/common";
import { HttpsOptions } from "@nestjs/common/interfaces/external/https-options.interface";
import {
  OperationObject,
  PathItemObject,
  SecuritySchemeObject
} from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { SwaggerCustomOptions } from "@nestjs/swagger/dist/interfaces";
import { WinstonModule } from "nest-winston";
import compression from "compression";
import { types } from "http-constants";
import { HttpLlm, IHttpLlmApplication, OpenApi, OpenApiV3, OpenApiV3_1, SwaggerV2 } from "@samchon/openapi";

import {
  CliOptions,
  computeParseCommandLineAndRun,
  defaultCommand,
  HostCommandType,
  WebServer
} from "@picteus/shared-back-end";

import { getBootstrapLogs, logger, stopBootstrapLogs } from "./logger";
import { product } from "./constants";
import { paths } from "./paths";
import { environmentVariableChecker, StringLengths, StringNature } from "./services/utils/parametersChecker";
import { ManifestRuntimeEnvironment } from "./dtos/app.dtos";
import { stringify } from "./utils";
import { apiKeyHeaderName, AuthenticationGuard } from "./app.guards";
import { MainModule } from "./app.module";
import { HostService } from "./services/hostService";
import { getTemporaryDirectoryPath } from "./services/utils/downloader";
import { ExtensionGenerator } from "./services/extensionGenerator";


class InternalServer
{

  private _application?: NestExpressApplication;

  async writeOpenApi(filePath: string): Promise<void>
  {
    logger.info(`Generating the Open API specifications into file '${filePath}'`);
    const document = await this.createOpenApiDocument();

    const directoryPath = path.dirname(filePath);
    fs.mkdirSync(directoryPath, { recursive: true });
    fs.writeFileSync(filePath, stringify(document));
  }

  async writeFunctionCalling(filePath: string): Promise<void>
  {
    logger.info(`Generating the function calling into file '${filePath}'`);
    const openApiDocument = await this.createOpenApiDocument();
    const originalOpenApiDocument: | SwaggerV2.IDocument | OpenApiV3.IDocument | OpenApiV3_1.IDocument = JSON.parse(JSON.stringify(openApiDocument));
    const document: OpenApi.IDocument = OpenApi.convert(originalOpenApiDocument);
    const application: IHttpLlmApplication<"3.1"> = HttpLlm.application({ model: "3.1", document });

    const directoryPath = path.dirname(filePath);
    fs.mkdirSync(directoryPath, { recursive: true });
    fs.writeFileSync(filePath, stringify(application.functions));
  }

  async start(portNumber: number, secretsDirectoryPath: string | undefined, enableSwaggerUi: boolean): Promise<void>
  {
    const baseUrl = paths.webServicesBaseUrl;
    const swaggerUiPrefix = "swaggerui";
    logger.info(`Starting the HTTP server ${secretsDirectoryPath !== undefined ? "with SSL " : ""}available at '${baseUrl}'${enableSwaggerUi === false ? "" : ` and Swagger UI available at '${baseUrl}/${swaggerUiPrefix}'`}`);
    this.checkEnvironmentVariables();
    const application = await this.createApplication(secretsDirectoryPath, portNumber);
    const httpAdapter: ExpressAdapter = application.getHttpAdapter() as ExpressAdapter;
    const instance: Express = httpAdapter.getInstance();

    // We disable the "etag" generation
    instance.set("etag", false);

    // We do not use the "setGlobalPrefix()" function on purpose, by prefixing every controller, instead
    // application.setGlobalPrefix("prefix");
    // We want to compress the network output
    application.use(compression());
    // 64 MB. of body payload should be enough
    const limit = "64mb";
    application.useBodyParser("urlencoded", { limit, extended: true });
    application.useBodyParser("json", { limit });
    application.useBodyParser("text", { limit });
    application.useBodyParser("raw", { limit, type: "*/*" });
    {
      // We set an empty blank favicon, taken from https://github.com/KEINOS/blank_favicon_ico
      const directoryPath = getTemporaryDirectoryPath();
      const faviconFilePath = path.join(directoryPath, "favicon.ico");
      const buffer: Uint8Array = Buffer.from("AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAA==", "base64");
      fs.writeFileSync(faviconFilePath, buffer);
      application.useStaticAssets(faviconFilePath, { prefix: "/favicon.ico" });
    }

    if (enableSwaggerUi === true)
    {
      const document = await this.computeOpenApiDocument(application);
      const options: SwaggerCustomOptions =
        {
          swaggerUiEnabled: true,
          jsonDocumentUrl: "openapi.json",
          yamlDocumentUrl: "openapi.yaml",
          // We want to keep the authorization information when reloading the Swagger UI page
          swaggerOptions: { persistAuthorization: true }
        };
      SwaggerModule.setup(swaggerUiPrefix, application, document, options);
    }
    await application.listen(portNumber);
  }

  async stop(): Promise<void>
  {
    if (this._application !== undefined)
    {
      logger.debug("Stopping the application server");
      // We need to explicitly close the HTTP server, otherwise the application closing will be hanging
      await this._application.getHttpAdapter().close();
      await this._application.close();
      this._application = undefined;
      logger.debug("The application server is now stopped");
    }
  }

  get application(): NestExpressApplication
  {
    if (this._application === undefined)
    {
      throw new Error("The application server is not started");
    }
    return this._application;
  }

  private async createApplication(secretsDirectoryPath: string | undefined, portNumber?: number): Promise<NestExpressApplication>
  {
    let httpsOptions: HttpsOptions | undefined;
    if (secretsDirectoryPath !== undefined)
    {
      logger.debug(`Loading the SSL certificate files from folder '${secretsDirectoryPath}'`);
      const encoding = "utf8";
      // The explanation for generating a self-signed SSL certificate is available at https://dev.to/devland/how-to-generate-and-use-an-ssl-certificate-in-nodejs-2996
      // 1. openssl genrsa -out key.pem
      // 2. openssl req -new -key key.pem -out csr.pem
      // 3. openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem
      const privateKey: string = fs.readFileSync(path.join(secretsDirectoryPath, "key.pem")).toString(encoding);
      const certificate: string = fs.readFileSync(path.join(secretsDirectoryPath, "cert.pem")).toString(encoding);
      httpsOptions =
        {
          key: privateKey,
          cert: certificate
        };
    }
    const options: NestApplicationOptions =
      {
        // We allow CORS requests
        cors: true,
        // We do not want to abort the server on errors
        abortOnError: false,
        // We use the same logger as for the rest of the application
        logger: WinstonModule.createLogger({ instance: logger }),
        // This is not enough to prevent the application from hanging when closed, see https://docs.nestjs.com/faq/keep-alive-connections
        forceCloseConnections: true,
        // The SSL certificate
        httpsOptions
      };

    // This class is defined in order to start the HTTP server which responds to the "bootstrap" requests during the application start
    class CustomExpressAdapter extends ExpressAdapter
    {

      private readonly bootstrapUriPrefix = "/bootstrap";

      private listenCount = 0;

      constructor()
      {
        super();
        this.use((_request: Request, response: Response, next: () => void) =>
        {
          // We need to support CORS requests: we use a verbose strategy, there must cleaner alternatives through the "ExpressAdapter.useCors()" method…
          response.setHeader("Access-Control-Allow-Origin", "*");
          response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
          response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
          next();
        });
      }

      listen(port: any, ...args: any[]): Server
      {
        if (this.listenCount === 1)
        {
          this.close();
          stopBootstrapLogs();
        }
        this.listenCount++;
        return this.httpServer.listen(port, ...args);
      }

      bootstrap()
      {
        this.get(this.bootstrapUriPrefix, (_request: Request, response: Response) =>
        {
          if (this.listenCount >= 2)
          {
            response.status(HttpStatus.NOT_FOUND).contentType(types.txt).send();
          }
          else
          {
            response.status(HttpStatus.OK).contentType(types.json).json({ logs: getBootstrapLogs() });
          }
        });
      }

    }

    const httpAdapter = portNumber === undefined ? new ExpressAdapter() : new CustomExpressAdapter();
    this._application = await NestFactory.create<NestExpressApplication>(MainModule, httpAdapter, options);
    // We do not invoke the "this.application.enableShutdownHooks()" statement to prevent from receiving the "OnApplicationShutdown" event, because this causes duplicated "onModuleDestroy()" invocations. The https://github.com/hienngm/nestjs-graceful-shutdown is also supposed to help
    if (httpAdapter instanceof CustomExpressAdapter)
    {
      logger.debug("Starting the HTTP server to provide bootstrap information");
      httpAdapter.bootstrap();
      httpAdapter.listen(portNumber);
    }

    return this._application;
  }

  private async computeOpenApiDocument(application: NestExpressApplication<any>): Promise<OpenAPIObject>
  {
    // We do not use anymore the Swagger metadata plugin, because it brings little added-value, and it causes issue with the obfuscation
    // await SwaggerModule.loadPluginMetadata(metadata);
    const name = "api-key";
    const apiKeyOptions: SecuritySchemeObject =
      {
        type: "apiKey",
        name: apiKeyHeaderName,
        description: "Forces the caller to be authenticated.",
        in: "header"
      };
    const documentBuilder: DocumentBuilder = new DocumentBuilder().setOpenAPIVersion("3.1.0").setTitle(product.name).setDescription(`The ${product.name} API`).setVersion(product.apiVersion).setLicense(product.company.name, product.company.url).setContact(product.author.name, product.author.url, product.author.email).addServer(paths.webServicesBaseUrl, `The ${product.name} local HTTP server`).addApiKey(apiKeyOptions, name).addSecurityRequirements(name, []);

    const document: OpenAPIObject = SwaggerModule.createDocument(application, documentBuilder.build(),
      {
        // We change the generated Open API "operationId" property
        operationIdFactory: (controllerKey, methodKey) =>
        {
          // We remove the "Controller" key word, turn the controller name in lower case and remove any trailing "_" from the service name
          return `${controllerKey.substring(0, controllerKey.indexOf("Controller")).toLowerCase()}_${methodKey.indexOf("_") === 0 ? methodKey.substring(1) : methodKey}`;
        }
      });

    {
      // Fixes an issue with the NestJS Open API specification files generation
      const schemaReferencePropertyName = "$ref";
      const wrongSchemaReferenceValue = "#/components/schemas/";
      const fixSchemaReference = (object: Record<string, any>) =>
      {
        for (const property in object)
        {
          const subProperty = object[property];
          if (subProperty !== null && typeof subProperty === "object")
          {
            const schemaReference = subProperty[schemaReferencePropertyName];
            if (schemaReference === wrongSchemaReferenceValue)
            {
              delete subProperty[schemaReferencePropertyName];
            }
            fixSchemaReference(subProperty);
          }
        }
      };
      fixSchemaReference(document);
    }
    {
      // We fix the missing tags
      const tags: Set<string> = new Set<string>();
      Object.values(document.paths).forEach((pathItemObject: PathItemObject) =>
      {
        const values: OperationObject[] = [];
        const properties = ["get", "put", "post", "delete", "options", "head", "patch", "trace"] as const;
        for (const property of properties)
        {
          if (property in pathItemObject)
          {
            const operationObject: OperationObject | undefined = pathItemObject[property];
            if (operationObject !== undefined)
            {
              values.push(operationObject);
            }
          }
        }
        values.forEach((operationObject: OperationObject) =>
        {
          operationObject.tags?.forEach((tag) =>
          {
            tags.add(tag);
          });
        });
      });
      if (document.tags === undefined)
      {
        document.tags = [];
      }
      for (const tag of tags)
      {
        document.tags.push({ name: tag });
      }
    }

    return document;
  }

  private async createOpenApiDocument(): Promise<OpenAPIObject>
  {
    const application = await this.createApplication(undefined);
    return await this.computeOpenApiDocument(application);
  }

  private checkEnvironmentVariables()
  {
    logger.debug("Checking that the environment variables are properly set");
    const entries = paths.check();
    for (const entry of entries)
    {
      environmentVariableChecker.checkString(entry.name, entry.path, StringLengths.Length4096, entry.isFile === true ? StringNature.FileSystemFilePath : StringNature.FileSystemDirectoryPath);
    }
  }

}

function setExceptionHandlers(): void
{
  // The 2 centralized errors handlers
  process.on("uncaughtException", (error: Error) =>
  {
    logger.error("An unhandled error occurred", error);
  });
  process.on("unhandledRejection", (reason: unknown) =>
  {
    logger.error(`An unhandled rejection occurred during a promise, with reason '${reason}'`);
  });
}

async function run(): Promise<void>
{
  // We lazy-load Caporal because of the issue with the "process.argv" reported at https://github.com/mattallty/Caporal.js/issues/199
  const Caporal = await import("@caporal/core");
  // @ts-ignore
  type Program = Caporal.Program;
  // @ts-ignore
  const CaporalValidator = Caporal.CaporalValidator;
  // @ts-ignore
  type ActionParameters = Caporal.ActionParameters;
  const { chalk } = Caporal;

  const storageDirectoryPathOption = "storageDirectoryPath";
  const webDirectoryPathOption = "webDirectoryPath";
  const cliArguments = process.argv.slice(2);
  const parseCommandLineAndRun = await computeParseCommandLineAndRun();
  await parseCommandLineAndRun(logger, cliArguments, product.name, product.applicationVersion, true, async (program: Program): Promise<void> =>
    {
      const commands = await program.getAllCommands();
      for (const command of commands)
      {
        if (command.name === defaultCommand)
        {
          command.option(`--${webDirectoryPathOption} <path>`, "Indicates that an HTTP server serving the contents present under that path should be started", {
            validator: CaporalValidator.STRING,
            default: undefined
          });
          command.option(`--${storageDirectoryPathOption} <path>`, `Indicates the path of the directory where the server will store some files. This will set the '${paths.regularDatabaseFilePathEnvironmentVariable}', '${paths.vectorDatabaseDirectoryPathEnvironmentVariableName}', '${paths.repositoriesDirectoryPathEnvironmentVariableName}', '${paths.installedExtensionsDirectoryPathEnvironmentVariableName}', '${paths.modelsCacheDirectoryPathEnvironmentVariableName}', '${paths.runtimesDirectoryPathEnvironmentVariableName}' environment variables with a value prefixed with that directory path if they are not set`, {
            validator: CaporalValidator.STRING,
            default: undefined
          });
          command.help(`The following environment variables are taken into account:\n${paths.describeEnvironmentVariables().map((entry: {
            name: string,
            description: string
          }) =>
          {
            return `- ${chalk.green(entry.name)}: ${entry.description}`;
          }).join("\n")}`, { sectionName: "ENVIRONMENT VARIABLES", colorize: true });
        }
      }

      program.command("generateOpenApi", "Generates the OAS OpenAPI JSON specifications file").option("--filePath <path>", "Indicates the path of the JSON file to produce", {
        validator: CaporalValidator.STRING,
        default: undefined
      }).action((actionParameters: ActionParameters): Promise<void> =>
      {
        const server = new InternalServer();
        const filePath: string = actionParameters.options["filePath"] as string;
        return server.writeOpenApi(filePath);
      });

      program.command("generateFunctionCalling", "Generates the function calling specifications file").option("--filePath <path>", "Indicates the path of the JSON file to produce", {
        validator: CaporalValidator.STRING,
        default: undefined
      }).action((actionParameters: ActionParameters): Promise<void> =>
      {
        const server = new InternalServer();
        const filePath: string = actionParameters.options["filePath"] as string;
        return server.writeFunctionCalling(filePath);
      });

      program.command("generateExtension", "Generates the scaffolding of an extension")
        .option("--directoryPath <path>", "Indicates the path where the extension should be generated", {
          validator: CaporalValidator.STRING,
          required: true,
          default: undefined
        })
        .option("--environment <path>", "Indicates the runtime platform the extension should be written for", {
          validator: CaporalValidator.STRING,
          // choices: [ManifestRuntimeEnvironment.Python, ManifestRuntimeEnvironment.Node],
          required: true,
          default: ManifestRuntimeEnvironment.Python
        })
        .action((actionParameters: ActionParameters): Promise<string> =>
        {
          // TODO: make the parameter customizable
          return new ExtensionGenerator().run(actionParameters.options["directoryPath"] as string, {
            id: "id",
            version: ExtensionGenerator.version,
            name: "name",
            description: "description",
            author: "author",
            environment: actionParameters.options["environment"] as ManifestRuntimeEnvironment
          }, true);
        });
    },
    async (actionParameters: ActionParameters, cliOptions: CliOptions): Promise<void> =>
    {
      const secretsDirectoryPath = path.join(paths.serverDirectoryPath, "secrets");
      if (cliOptions.apiServerPortNumber !== undefined)
      {
        paths.setSecureAndPortNumber(undefined, cliOptions.apiServerPortNumber);
      }
      if (cliOptions.useSsl !== undefined)
      {
        paths.setSecureAndPortNumber(cliOptions.useSsl);
      }
      if (cliOptions.vectorDatabasePortNumber !== undefined)
      {
        paths.vectorDatabasePortNumber = cliOptions.vectorDatabasePortNumber;
      }
      if (cliOptions.requiresApiKeys !== undefined)
      {
        paths.requiresApiKey = cliOptions.requiresApiKeys;
      }
      if (cliOptions.unpackedExtensionsDirectoryPath !== undefined)
      {
        paths.unpackedExtensionsDirectoryPath = cliOptions.unpackedExtensionsDirectoryPath;
      }
      {
        const storeDirectoryPath = actionParameters.options[storageDirectoryPathOption] as string;
        if (storeDirectoryPath !== undefined)
        {
          paths.setStoreDirectoryPath(storeDirectoryPath);
        }
      }

      let webServer: WebServer;
      {
        const webDirectoryPath = actionParameters.options[webDirectoryPathOption] as string;
        if (webDirectoryPath !== undefined)
        {
          webServer = new WebServer(logger);
          await webServer.start(cliOptions.webServerPortNumber, cliOptions.useSsl, webDirectoryPath, secretsDirectoryPath);
        }
      }

      const server = new InternalServer();
      try
      {
        await server.start(paths.webServicesPortNumber, paths.isSecure === true ? secretsDirectoryPath : undefined, true);
        logger.info("The server is started");
      }
      catch (error)
      {
        logger.error("The server could not start properly", error);
        return process.exit(1);
      }
      let alreadyReceived = false;
      process.on("SIGINT", async (signal: NodeJS.Signals) =>
      {
        logger.info(`The server process received the '${signal}' signal`);
        if (alreadyReceived === false)
        {
          // In case the server takes time to end, the signal may be launched multiple times
          alreadyReceived = true;
          await server.stop();
          webServer?.stop();
          process.exit(0);
        }
      });
      {
        // We send the master API key
        const apiKey = AuthenticationGuard.generateApiKey();
        AuthenticationGuard.masterApiKey = apiKey;
        const hostService: HostService = server.application.get(HostService);
        try
        {
          hostService.send({ type: HostCommandType.ApiKey, apiKey }, true);
        }
        catch (error)
        {
          logger.error("An unexpected error occurred while notifying the parent process that the server is ready", error);
        }
      }
    },
    (code: number): void =>
    {
      process.exit(code);
    });
}

async function main(): Promise<void>
{
  logger.info(`Starting the server running under Node.js ${process.version} with working directory set to '${process.cwd()}'`);

  setExceptionHandlers();

  // We indicate that the server should be accessed via HTTPS
  paths.setSecureAndPortNumber(true);

  await run();
}

main().catch(((error) =>
{
  console.error(error);
  throw error;
}));
