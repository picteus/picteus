import process, { env } from "node:process";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";


let directoryName: string;
try
{
  directoryName = dirname(fileURLToPath(import.meta.url));
}
catch (error)
{
  // This is expected when the runtime uses CommonJS
  directoryName = __dirname;
}


export class Paths
{

  static readonly instance = new Paths();

  readonly serverDirectoryPath: string = path.join(directoryName, "..");

  readonly connection: string = "connection";

  readonly events: string = "events";

  readonly notifications: string = "notifications";

  private readonly nodePathVariableName: string = "NODE_PATH";

  private readonly environmentEnvironmentVariableName: string = "NODE_ENV";

  private readonly databaseUrlEnvironmentVariable: string = "DATABASE_URL";

  private readonly referenceDatabaseFilePathEnvironmentVariable: string = "REFERENCE_DATABASE_FILE_PATH";

  public readonly regularDatabaseFilePathEnvironmentVariable: string = "REGULAR_DATABASE_FILE_PATH";

  public readonly vectorDatabaseDirectoryPathEnvironmentVariableName: string = "VECTOR_DATABASE_DIRECTORY_PATH";

  public readonly repositoriesDirectoryPathEnvironmentVariableName: string = "REPOSITORIES_DIRECTORY_PATH";

  public readonly installedExtensionsDirectoryPathEnvironmentVariableName: string = "INSTALLED_EXTENSIONS_DIRECTORY_PATH";

  private readonly builtInExtensionsDirectoryPathEnvironmentVariableName: string = "BUILT_IN_EXTENSIONS_DIRECTORY_PATH";

  public readonly modelsCacheDirectoryPathEnvironmentVariableName: string = "MODELS_CACHE_DIRECTORY_PATH";

  public readonly runtimesDirectoryPathEnvironmentVariableName: string = "RUNTIMES_DIRECTORY_PATH";

  private readonly npmDirectoryPathEnvironmentVariableName: string = "NPM_DIRECTORY_PATH";

  private readonly sdkDirectoryPathEnvironmentVariableName: string = "SDK_DIRECTORY_PATH";

  private readonly workersDirectoryPathEnvironmentVariableName = "WORKERS_DIRECTORY_PATH";

  private readonly repositoryMappingPathsEnvironmentVariableName = "REPOSITORY_MAPPING_PATHS";

  private _webServicesPortNumber: number = 3001;

  private _vectorDatabasePortNumber: number = 3002;

  private _isSecure: boolean = false;

  private _migrationDirectoryPath?: string;

  private _runMigrations: boolean = true;

  private _unpackedExtensionsDirectoryPath?: string;

  private _builtInExtensionsDirectoryPath?: string;

  private _useVectorDatabase: boolean = true;

  private _requiresApiKey?: boolean;

  private _repositoryMappingPaths?: Map<string, string>;

  private constructor()
  {
  }

  describeEnvironmentVariables(): { name: string, description: string }[]
  {
    return [
      {
        name: this.regularDatabaseFilePathEnvironmentVariable,
        description: "the path of the file where the regular SQLite database will be stored, that will store all the application data, except the embeddings. It will be created and initialized with a default database if it does exist"
      },
      {
        name: this.vectorDatabaseDirectoryPathEnvironmentVariableName,
        description: "the path of the directory where the Chroma vector database will be installed, that will store the embeddings. This directory will be created if it does not exist"
      },
      {
        name: this.repositoriesDirectoryPathEnvironmentVariableName,
        description: "the path of the directory where the internal image repositories will be created on the file system. This directory will be created if it does not exist"
      },
      {
        name: this.installedExtensionsDirectoryPathEnvironmentVariableName,
        description: "the path of the directory where the extensions will be installed"
      },
      {
        name: this.modelsCacheDirectoryPathEnvironmentVariableName,
        description: "the path of the directory where all AI models files will be downloaded. This directory will be created if it does not exist, and a symbolic link with the name '.cache' will be written in every extension's folder, pointing to that directory"
      },
      {
        name: this.runtimesDirectoryPathEnvironmentVariableName,
        description: "the path of the directory where the Python, Node.js related runtimes will be downloaded"
      },
      {
        name: this.builtInExtensionsDirectoryPathEnvironmentVariableName,
        description: "the path of the directory where all the built-in extensions archives are located"
      },
      {
        name: this.sdkDirectoryPathEnvironmentVariableName,
        description: "the path of the directory where the extension's SDKs are located"
      },
      {
        name: this.repositoryMappingPathsEnvironmentVariableName,
        description: "a string of the form `sourceDirectory1=targetDirectory1\\nsourceDirectory2=targetDirectory2`, where `sourceDirectoryN` and `targetDirectoryN` are directory paths, used to map the path of the source path to the destination path"
      }
    ];
  }

  setStoreDirectoryPath(directoryPath: string): void
  {
    const entries =
      [
        {
          name: this.regularDatabaseFilePathEnvironmentVariable,
          value: path.resolve(directoryPath, "database.db")
        },
        {
          name: this.repositoriesDirectoryPathEnvironmentVariableName,
          value: path.resolve(directoryPath, "repositories")
        },
        {
          name: this.installedExtensionsDirectoryPathEnvironmentVariableName,
          value: path.resolve(directoryPath, "extensions")
        },
        {
          name: this.modelsCacheDirectoryPathEnvironmentVariableName,
          value: path.resolve(directoryPath, "models")
        },
        {
          name: this.runtimesDirectoryPathEnvironmentVariableName,
          value: path.resolve(directoryPath, "runtimes")
        }
      ];
    if (this.useVectorDatabase === true)
    {
      entries.push(
        {
          name: this.vectorDatabaseDirectoryPathEnvironmentVariableName,
          value: path.resolve(directoryPath, "chroma")
        }
      );
    }
    for (const entry of entries)
    {
      if (this.getValue(entry.name) === undefined)
      {
        this.setValue(entry.name, entry.value);
      }
    }
  }

  check(): { name: string, path: string, isFile: boolean }[]
  {
    const inputEntries =
      [
        {
          name: this.regularDatabaseFilePathEnvironmentVariable,
          isFile: true
        },
        {
          name: this.repositoriesDirectoryPathEnvironmentVariableName,
          isFile: false
        },
        {
          name: this.installedExtensionsDirectoryPathEnvironmentVariableName,
          isFile: false
        },
        {
          name: this.modelsCacheDirectoryPathEnvironmentVariableName,
          isFile: false
        },
        {
          name: this.runtimesDirectoryPathEnvironmentVariableName,
          isFile: false
        },
        {
          name: this.sdkDirectoryPathEnvironmentVariableName,
          isFile: false
        }
      ];
    if (this.useVectorDatabase === true)
    {
      inputEntries.push({ name: this.vectorDatabaseDirectoryPathEnvironmentVariableName, isFile: false });
    }
    const outputEntries: { name: string, path: string, isFile: boolean }[] = [];
    for (const inputEntry of inputEntries)
    {
      outputEntries.push({
        name: inputEntry.name,
        path: this.getValueOrThrow(inputEntry.name),
        isFile: inputEntry.isFile
      });
    }
    return outputEntries;
  }

  // Because the worker threads inherit the parent process environment (see https://nodejs.org/api/worker_threads.html), and because some environment variables that may have been tweaked by the process and which need to be transmitted to the worker threads, we need to explicitly transmit those environment variables.
  computeProcessEnvironmentVariables()
  {
    const variables =
      {
        // We also transmit the main process environment variables
        ...process.env,
        [paths.nodePathVariableName]: this.getValue(paths.nodePathVariableName),
        [paths.environmentEnvironmentVariableName]: this.getValue(paths.environmentEnvironmentVariableName)
      };
    // We do not transmit the "referenceDatabaseFilePathEnvironmentVariable" variable because we only want the main process main thread to duplicate the reference database, when required
    // We do not transmit the "regularDatabaseFilePathEnvironmentVariable" variable because it is only defined to set the "databaseUrlEnvironmentVariable" properly
    [paths.databaseUrlEnvironmentVariable, paths.vectorDatabaseDirectoryPathEnvironmentVariableName, paths.repositoriesDirectoryPathEnvironmentVariableName, paths.installedExtensionsDirectoryPathEnvironmentVariableName, paths.builtInExtensionsDirectoryPathEnvironmentVariableName, paths.modelsCacheDirectoryPathEnvironmentVariableName, paths.runtimesDirectoryPathEnvironmentVariableName, paths.npmDirectoryPathEnvironmentVariableName, paths.sdkDirectoryPathEnvironmentVariableName, paths.workersDirectoryPathEnvironmentVariableName].forEach((variableName) =>
    {
      const useDummyModelEnvironmentVariableValue = this.getValue(variableName);
      if (useDummyModelEnvironmentVariableValue !== undefined)
      {
        variables[variableName] = useDummyModelEnvironmentVariableValue;
      }
    });
    return variables;
  }

  get isProductionEnvironment()
  {
    return this.getValue(this.environmentEnvironmentVariableName) === "production";
  }

  get isSecure(): boolean
  {
    return this._isSecure;
  }

  get webServicesPortNumber(): number
  {
    return this._webServicesPortNumber;
  }

  setSecureAndPortNumber(isSecure?: boolean, portNumber?: number)
  {
    if (isSecure !== undefined)
    {
      this._isSecure = isSecure;
    }
    if (portNumber !== undefined)
    {
      this._webServicesPortNumber = portNumber;
    }
  }

  get webServicesBaseUrl()
  {
    return `http${this._isSecure === true ? "s" : ""}://localhost:${this._webServicesPortNumber}`;
  }

  get vectorDatabasePortNumber(): number
  {
    return this._vectorDatabasePortNumber;
  }

  set vectorDatabasePortNumber(value: number)
  {
    this._vectorDatabasePortNumber = value;
  }

  get migrationDirectoryPath(): string
  {
    return this._migrationDirectoryPath === undefined ? path.join(this.serverDirectoryPath, "prisma") : this._migrationDirectoryPath;
  }

  set migrationDirectoryPath(value: string)
  {
    this._migrationDirectoryPath = value;
  }

  get runMigrations(): boolean
  {
    return this._runMigrations;
  }

  set runMigrations(value: boolean)
  {
    this._runMigrations = value;
  }

  get useVectorDatabase(): boolean
  {
    return this._useVectorDatabase;
  }

  set useVectorDatabase(value: boolean)
  {
    this._useVectorDatabase = value;
  }

  get requiresApiKey(): boolean
  {
    return this._requiresApiKey === undefined ? paths.isProductionEnvironment === true : this._requiresApiKey;
  }

  set requiresApiKey(value: boolean)
  {
    this._requiresApiKey = value;
  }

  get referenceDatabaseFilePath(): string | undefined
  {
    return this.toAbsolutePath(this.getValue(this.referenceDatabaseFilePathEnvironmentVariable));
  }

  set referenceDatabaseFilePath(value: string)
  {
    this.setValue(this.referenceDatabaseFilePathEnvironmentVariable, value);
  }

  set regularDatabaseFilePath(value: string)
  {
    this.setValue(this.regularDatabaseFilePathEnvironmentVariable, value);
  }

  getAndFixDatabaseCoordinates(): { path: string, url: string }
  {
    const filePath = this.getValueOrThrow(this.regularDatabaseFilePathEnvironmentVariable);
    const url = "file:" + filePath;
    this.setValue(this.databaseUrlEnvironmentVariable, url);
    return { path: filePath, url };
  }

  get vectorDatabaseDirectoryPath(): string
  {
    return this.toAbsolutePath(this.getValueOrThrow(this.vectorDatabaseDirectoryPathEnvironmentVariableName))!;
  }

  get repositoriesDirectoryPath(): string
  {
    return this.toAbsolutePath(this.getValueOrThrow(this.repositoriesDirectoryPathEnvironmentVariableName))!;
  }

  set repositoriesDirectoryPath(value: string)
  {
    this.setValue(this.repositoriesDirectoryPathEnvironmentVariableName, value);
  }

  get installedExtensionsDirectoryPath(): string
  {
    return this.toAbsolutePath(this.getValueOrThrow(this.installedExtensionsDirectoryPathEnvironmentVariableName))!;
  }

  set installedExtensionsDirectoryPath(value: string)
  {
    this.setValue(this.installedExtensionsDirectoryPathEnvironmentVariableName, value);
  }

  get unpackedExtensionsDirectoryPath(): string | undefined
  {
    return this._unpackedExtensionsDirectoryPath;
  }

  set unpackedExtensionsDirectoryPath(value: string)
  {
    this._unpackedExtensionsDirectoryPath = value;
  }

  get builtInExtensionsDirectoryPath(): string
  {
    if (this._builtInExtensionsDirectoryPath !== undefined)
    {
      return this._builtInExtensionsDirectoryPath;
    }
    const value = this.getValue(this.builtInExtensionsDirectoryPathEnvironmentVariableName);
    return value !== undefined ? value : path.join(this.serverDirectoryPath, "..", "extensions");
  }

  set builtInExtensionsDirectoryPath(value: string)
  {
    this._builtInExtensionsDirectoryPath = value;
  }

  get modelsCacheDirectoryPath(): string
  {
    return this.toAbsolutePath(this.getValueOrThrow(this.modelsCacheDirectoryPathEnvironmentVariableName))!;
  }

  set modelsCacheDirectoryPath(value: string)
  {
    this.setValue(this.modelsCacheDirectoryPathEnvironmentVariableName, value);
  }

  get runtimesDirectoryPath(): string | undefined
  {
    return this.getValue(this.runtimesDirectoryPathEnvironmentVariableName);
  }

  // noinspection JSUnusedGlobalSymbols
  set runtimesDirectoryPath(value: string)
  {
    this.setValue(this.runtimesDirectoryPathEnvironmentVariableName, value);
  }

  get npmDirectoryPath(): string
  {
    const npmDirectoryPath = this.getValue(this.npmDirectoryPathEnvironmentVariableName);
    if (npmDirectoryPath !== undefined)
    {
      return this.toAbsolutePath(npmDirectoryPath)!;
    }
    return path.join(this.toAbsolutePath(this.getValueOrThrow(this.runtimesDirectoryPathEnvironmentVariableName))!, "node", "npm");
  }

  // noinspection JSUnusedGlobalSymbols
  set npmDirectoryPath(value: string)
  {
    this.setValue(this.npmDirectoryPathEnvironmentVariableName, value);
  }

  get sdkDirectoryPath(): string
  {
    return this.toAbsolutePath(this.getValueOrThrow(this.sdkDirectoryPathEnvironmentVariableName))!;
  }

  set sdkDirectoryPath(value: string)
  {
    this.setValue(this.sdkDirectoryPathEnvironmentVariableName, value);
  }

  get workersDirectoryPath(): string | undefined
  {
    return this.getValue(this.workersDirectoryPathEnvironmentVariableName);
  }

  set workersDirectoryPath(value: string)
  {
    this.setValue(this.workersDirectoryPathEnvironmentVariableName, value);
  }

  get repositoryMappingPaths(): Map<string, string>
  {
    if (this._repositoryMappingPaths === undefined)
    {
      return this.evalRepositoryMappingPaths();
    }
    return this._repositoryMappingPaths;
  }

  set repositoryMappingPaths(value: Map<string, string>)
  {
    this.setValue(this.repositoryMappingPathsEnvironmentVariableName, [...value.entries()].map(([key, value]) => `${key}=${value}`).join("\n"));
    this.evalRepositoryMappingPaths();
  }

  private evalRepositoryMappingPaths(): Map<string, string>
  {
    this._repositoryMappingPaths = new Map<string, string>();
    const string = this.getValue(this.repositoryMappingPathsEnvironmentVariableName);
    if (string !== undefined && string !== "")
    {
      const lines = string.split("\n");
      for (const line of lines)
      {
        const [key, value] = line.split("=");
        if (value === undefined)
        {
          throw new Error(`Invalid environment variable '${this.repositoryMappingPathsEnvironmentVariableName}'`);
        }
        this._repositoryMappingPaths.set(key, value);
      }
    }
    return this._repositoryMappingPaths;
  }

  private toAbsolutePath(aPath: string | undefined): string | undefined
  {
    return aPath === undefined ? undefined : (path.resolve(path.isAbsolute(aPath) === true ? aPath : path.join(process.cwd(), aPath)));
  }

  private getValue(variableName: string): string | undefined
  {
    return env[variableName];
  }

  private setValue(variableName: string, variableValue: string): void
  {
    env[variableName] = variableValue;
  }

  private getValueOrThrow(environmentVariable: string): string
  {
    const value = this.getValue(environmentVariable);
    if (value === undefined)
    {
      throw new Error(`The '${environmentVariable}' environment variable is not set`);
    }
    return value;
  }

}

export const paths = Paths.instance;
