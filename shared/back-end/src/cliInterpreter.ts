import { Logger } from "winston";


export interface CliOptions
{
  readonly useSsl: boolean;
  readonly apiServerPortNumber: number;
  readonly webServerPortNumber: number;
  readonly vectorDatabasePortNumber: number;
  readonly requiresApiKeys?: boolean;
  readonly unpackedExtensionsDirectoryPath?: string;
}

export const defaultCliOptions: CliOptions =
  {
    useSsl: false,
    apiServerPortNumber: 3001,
    webServerPortNumber: 2999,
    vectorDatabasePortNumber: 3002,
    requiresApiKeys: undefined,
    unpackedExtensionsDirectoryPath: undefined
  };

export const defaultCommand = "run";

export type Program = any;
export type ActionParameters = any;

export type parseCommandLineAndRunType = (logger: Logger, cliArguments: string[], name: string, version: string, isStrict: boolean, tuner: (program: Program) => Promise<void>, starter: (actionParameters: ActionParameters, cliOptions: CliOptions) => Promise<void>, exiter: (code: number) => void) => Promise<void>;

export async function computeParseCommandLineAndRun(): Promise<parseCommandLineAndRunType>
{
  // We lazy-load Caporal because of the issue with the "process.argv" reported at https://github.com/mattallty/Caporal.js/issues/199
  const Caporal = await import("@caporal/core");
  const program = Caporal.program;
  // @ts-ignore
  type Program = Caporal.Program;
  // @ts-ignore
  const CaporalValidator = Caporal.CaporalValidator;
  // @ts-ignore
  type ActionParameters = Caporal.ActionParameters;

  // An interesting article regarding the comparison of different command line (CLI) parsers, including caporal, gluegun and oclif is available https://developer.vonage.com/en/blog/comparing-cli-building-libraries
  // noinspection UnnecessaryLocalVariableJS
  const parseCommandLineAndRun = async (logger: Logger, cliArguments: string[], name: string, version: string, isStrict: boolean, tuner: (program: Program) => Promise<void>, starter: (actionParameters: ActionParameters, cliOptions: CliOptions) => Promise<void>, exiter: (code: number) => void): Promise<void> =>
  {
    if (Math.random() > 1)
    {
      logger.debug(`Setting up the command line interpreter with the command line arguments '${cliArguments.join(" ")}'`);
    }
    let exit = true;
    // noinspection RequiredAttributes
    const theProgram = program;
    theProgram.name(name).version(version).strict(isStrict);
    theProgram.command(defaultCommand, "Starts the application")
      .default()
      .option("--useSsl <enabled>", "Whether SSL should be enabled", {
        validator: CaporalValidator.BOOLEAN,
        default: defaultCliOptions.useSsl
      })
      .option("--apiServerPort <portNumber>", "Indicates the internal API server port number", {
        validator: CaporalValidator.NUMBER,
        default: defaultCliOptions.apiServerPortNumber
      })
      .option("--webServerPort <portNumber>", "Indicates the internal web server port number", {
        validator: CaporalValidator.NUMBER,
        default: defaultCliOptions.webServerPortNumber
      })
      .option("--vectorDatabasePort <portNumber>", "Indicates the internal vector database port number", {
        validator: CaporalValidator.NUMBER,
        default: defaultCliOptions.vectorDatabasePortNumber
      })
      .option("--requiresApiKeys <enabled>", "Indicates whether the internal HTTP server requires API keys to interact with it", {
        validator: CaporalValidator.BOOLEAN,
        default: defaultCliOptions.requiresApiKeys
      })
      .option("--unpackedExtensionsDirectoryPath <path>", "Indicates the directory path where unpacked extensions are located", {
        validator: CaporalValidator.STRING,
        default: undefined
      })
      .action((actionParameters: ActionParameters) =>
      {
        exit = false;
        const useSsl: boolean = actionParameters.options["useSsl"] as boolean;
        const apiServerPort: number = actionParameters.options["apiServerPort"] as number;
        const webServerPort: number = actionParameters.options["webServerPort"] as number;
        const vectorDatabasePort: number = actionParameters.options["vectorDatabasePortNumber"] as number;
        const requiresApiKeys: boolean = actionParameters.options["requiresApiKeys"] as boolean;
        const unpackedExtensionsDirectoryPath: string = actionParameters.options["unpackedExtensionsDirectoryPath"] as string;

        if (apiServerPort === webServerPort)
        {
          throw new Error("Cannot start the application, because the API server and the web server ports numbers are the same");
        }

        return starter(actionParameters, {
          useSsl,
          apiServerPortNumber: apiServerPort,
          webServerPortNumber: webServerPort,
          vectorDatabasePortNumber: vectorDatabasePort,
          requiresApiKeys,
          unpackedExtensionsDirectoryPath
        });
      });

    await tuner(theProgram);

    theProgram.run(cliArguments).then(() =>
    {
      // This is a work-around to exit when the "--help" option is used
      if (exit === true)
      {
        exiter(0);
      }
    }).catch(async (error: Error) =>
    {
      const message: string = error.message;
      logger.error("Could not start properly the process. Reason: '" + message + "");
      // Unfortunately, the proposal https://github.com/mattallty/Caporal.js/issues/70 does not allow to print the help
      // const helpCommand: Command = (program.getCommands()).filter((command) => command.name === "help")[0];
      // await helpCommand.run({});
      exiter(3);
    });
  };

  return parseCommandLineAndRun;
}
