import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import Timers from "node:timers";
import process from "node:process";
import { ChildProcess, fork } from "node:child_process";
import { PassThrough } from "node:stream";
import zlib from "node:zlib";

import tar from "tar-fs";

import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  MenuItem,
  MenuItemConstructorOptions,
  nativeImage,
  Rectangle,
  screen,
  session,
  shell,
  Size,
  Tray
} from "electron";

import {
  CliOptions,
  computeParseCommandLineAndRun,
  defaultCliOptions,
  defaultCommand,
  HostCommandType,
  InstallChromeExtensionHostCommand,
  UninstallChromeExtensionHostCommand
} from "@picteus/shared-back-end";

import { logger } from "./logger";
import { Store } from "./store";
import { CommandsManager, SocketCoordinates } from "./commands";
import { autoUpdateApplication } from "./autoUpdater";
import { PersistentWindowManager } from "./persistentWindowManager";


const environment: "development" | "production" = app.isPackaged === true ? "production" : "development";
const applicationQuitting = "The application will quit";
const referenceDirectoryPath = dirname(fileURLToPath(import.meta.url));
const applicationDirectoryPath = app.getPath("userData");


interface HttpServerApplicationCoordinator
{

  isApplicationQuitting: () => boolean;

  onError: (exitCode: (number | null)) => void;

}

class HttpServer
{

  private static _instance: HttpServer = new HttpServer();

  private serverProcess?: ChildProcess;

  static get instance(): HttpServer
  {
    return HttpServer._instance;
  }

  private constructor()
  {
  }

  async start(serverDirectoryPath: string, emptyDatabaseFilePath: string, portNumber: number, useSsl: boolean | undefined, requiresApiKeys: boolean | undefined, unpackedExtensionsDirectoryPath: string | undefined, coordinator: HttpServerApplicationCoordinator): Promise<string>
  {
    const serverSourceDirectoryPath = path.join(serverDirectoryPath, "src");
    const filePath = path.join(serverSourceDirectoryPath, "main.js");
    logger.info(`Starting the process server from the main file '${filePath}'`);

    const environmentVariables: Record<string, string> =
      {
        NODE_ENV: environment,
        NODE_PATH: path.join(serverSourceDirectoryPath, "node_modules"),
        // This prevents from experiencing the "Request Header Fields Too Large" error when the URL is too long, see https://www.electronjs.org/docs/latest/api/environment-variables
        NODE_OPTIONS: `--max-http-header-size=${4_096 * 32}`,
        REFERENCE_DATABASE_FILE_PATH: emptyDatabaseFilePath
      };
    const applicationFilePath = app.getAppPath();
    const unpackedAsarDirectoryPath = applicationFilePath + ".unpacked";
    const sdkDirectoryPaths = ["build", "sdk"];
    const unpackedSdkDirectoryPath = path.join(unpackedAsarDirectoryPath, ...sdkDirectoryPaths);
    const sdkDirectoryPath = environment === "production" ? (fs.existsSync(unpackedSdkDirectoryPath) === true ? unpackedSdkDirectoryPath : path.join(applicationFilePath, ...sdkDirectoryPaths)) : process.env.SDK_DIRECTORY_PATH;
    if (sdkDirectoryPath !== undefined)
    {
      logger.debug(`The SDK directory path is set to '${sdkDirectoryPath}'`);
      environmentVariables.SDK_DIRECTORY_PATH = sdkDirectoryPath;
    }
    const forkArguments = ["--storageDirectoryPath", applicationDirectoryPath, "--apiServerPort", portNumber.toString()];
    if (useSsl !== undefined)
    {
      forkArguments.push("--useSsl", useSsl.toString());
    }
    if (requiresApiKeys !== undefined)
    {
      forkArguments.push("--requiresApiKeys", requiresApiKeys.toString());
    }
    if (unpackedExtensionsDirectoryPath !== undefined)
    {
      forkArguments.push("--unpackedExtensionsDirectoryPath", unpackedExtensionsDirectoryPath);
    }
    const serverProcess = fork(filePath, [...forkArguments], { env: { ...process.env, ...environmentVariables } });
    this.serverProcess = serverProcess;
    CommandsManager.instance.listenToServerProcess(serverProcess);
    serverProcess.once("exit", (code: number | null) =>
    {
      const prefix = "The server process exited";
      if (code === null || code === 0)
      {
        logger.info(prefix);
      }
      else
      {
        logger.error(`${prefix} with code ${code}`);
      }
      if (coordinator.isApplicationQuitting() === false)
      {
        coordinator.onError(code);
      }
    });
    // We wait for the server to be ready
    return new Promise<string>((resolve) =>
    {
      CommandsManager.instance.once(HostCommandType.ApiKey, resolve);
    });
  }

  async stop(): Promise<void>
  {
    if (this.serverProcess !== undefined)
    {
      logger.info("Stopping the process server");
      const definedProcess = this.serverProcess!;
      this.serverProcess = undefined;
      return await new Promise<void>((resolve) =>
      {
        // We wait for the process to be killed
        definedProcess.once("close", (code: number | null, signal: NodeJS.Signals | null) =>
        {
          logger.info(`The server process is now killed and exited${code === null ? "" : `, with code ${code}`}${signal === null ? "" : `, with signal '${signal}'`}`);
          resolve();
        });
        definedProcess.kill("SIGINT");
      });
    }
  }

}

class TrayGenerator
{

  private readonly tray: Tray;

  private readonly rightClickMenu = () =>
  {
    const menu: MenuItemConstructorOptions[] = [
      {
        role: "quit",
        accelerator: "Command+Q"
      }
    ];
    this.tray.popUpContextMenu(Menu.buildFromTemplate(menu));
  };

  private readonly toggleWindow = () =>
  {
    if (this.window.isVisible() === true)
    {
      this.window.hide();
    }
    else
    {
      this.window.show();
    }
  };

  constructor(private readonly window: BrowserWindow)
  {
    const icon = nativeImage.createFromPath(path.join(referenceDirectoryPath, "..", "assets", "icon.png"));
    // Taken from https://stackoverflow.com/a/74713842/808618
    const trayIcon = icon.resize({ width: 16 });
    trayIcon.setTemplateImage(true);
    this.tray = new Tray(trayIcon);
    this.tray.setToolTip("This enables to interact with the application");
    this.tray.setIgnoreDoubleClickEvents(true);
    this.tray.on("click", this.toggleWindow);
    this.tray.on("right-click", this.rightClickMenu);
  }

}

class ChromeExtensionManager
{

  private readonly useIntervalToKeepWorkerThreadAlive = Math.random() > 1;

  private readonly perExtensionIdTimersMap: Map<string, NodeJS.Timeout> = new Map();

  // TODO: enable this back once an extension will be able to install a Chromium extension
  // private async interceptRequests(): Promise<void>
  // {
  //   logger.info("Listening to all HTTP requests");
  //   const requestMonitor = new RequestMonitor<Buffer, Electron.WebContents>();
  //   const webRequest = session.defaultSession.webRequest;
  //   webRequest.onBeforeRequest({ urls: ["<all_urls>"] }, async (details: Electron.OnBeforeRequestListenerDetails, callback) =>
  //   {
  //     const bytes = (details.uploadData === undefined || details.uploadData.length === 0) ? undefined : details.uploadData[0].bytes;
  //     try
  //     {
  //       await requestMonitor.onBeforeRequest(async () => details.webContents!, details.url, details.method, bytes);
  //     }
  //     catch (error)
  //     {
  //       logger.error(`An unexpected error occurred at the start of the monitoring of the network request with URL '${details.url}'`, error);
  //     }
  //     callback({});
  //   });
  //   webRequest.onCompleted({ urls: ["<all_urls>"] }, async (details: Electron.OnCompletedListenerDetails) =>
  //   {
  //     try
  //     {
  //       await requestMonitor.onCompleted(details.url, details.method);
  //     }
  //     catch (error)
  //     {
  //       logger.error(`An unexpected error occurred at the end of the monitoring of the network request with URL '${details.url}'`, error);
  //     }
  //   });
  // }

  async listenToChromeExtensionEvents(): Promise<void>
  {
    logger.info("Listening to the Chrome extension events");
    const theSession: Electron.Session = session.defaultSession;
    // We clean the service workers cache so that the Chromium extension new version overwrites the previous version
    await theSession.clearStorageData({ storages: ["serviceworkers"] });
    const extensions = theSession.extensions || session;
    extensions.on("extension-loaded", (_event: Electron.Event, extension: Electron.Extension): void =>
    {
      logger.debug("The Chrome extension '" + extension.id + "' is loaded");
    });
    extensions.on("extension-unloaded", (_event: Electron.Event, extension: Electron.Extension): void =>
    {
      logger.debug("The Chrome extension '" + extension.id + "' is unloaded");
    });
    extensions.on("extension-ready", (_event: Electron.Event, extension: Electron.Extension): void =>
    {
      logger.debug("The Chrome extension '" + extension.id + "' is ready with URL '" + extension.url + "'");
    });
  }

  async load(extensionPath: string): Promise<void>
  {
    logger.info(`Loading the Chrome extension located at '${extensionPath}'`);
    const extension: Electron.Extension = await this.getExtensions().loadExtension(extensionPath, { allowFileAccess: true });
    logger.debug("The Chrome extension with id '" + extension.id + `' with version '${extension.version}' under path '${extension.path}' is being loaded`);
    const extensionId = extension.id;
    this.removeIntervalListener(extensionId);
    if (this.useIntervalToKeepWorkerThreadAlive === true)
    {
      const interval: NodeJS.Timeout = Timers.setInterval(async () =>
      {
        logger.debug("Making sure that the Chrome extension with '" + extensionId + `' background worker thread is running`);
        const scope = `chrome-extension://${extensionId}`;
        try
        {
          await this.getSession().serviceWorkers.startWorkerForScope(scope);
        }
        catch (error)
        {
          console.error(`Failed to start worker for extension with id '${extensionId}'`, error);
        }
      }, 5_000);
      this.perExtensionIdTimersMap.set(extensionId, interval);
    }
  }

  removeByExtensionName(extensionName: string): void
  {
    logger.info(`Removing the Chrome extension with name '${extensionName}'`);
    const extensions = this.getExtensions().getAllExtensions();
    for (const extension of extensions)
    {
      if (extension.name === extensionName)
      {
        this.removeByExtensionId(extension.id);
        return;
      }
    }
    throw new Error("There is no currently installed Chrome extension with name '" + extensionName + "'");
  }

  removeByExtensionId(extensionId: string): void
  {
    logger.info(`Removing the Chrome extension with id '${extensionId}'`);
    this.removeIntervalListener(extensionId);
    this.getExtensions().removeExtension(extensionId);
    logger.debug("The Chrome extension with id '" + extensionId + `has been removed`);
  }

  private removeIntervalListener(extensionId: string): void
  {
    if (this.useIntervalToKeepWorkerThreadAlive === true)
    {
      const interval = this.perExtensionIdTimersMap.get(extensionId);
      if (interval !== undefined)
      {
        Timers.clearInterval(interval);
        this.perExtensionIdTimersMap.delete(extensionId);
      }
    }
  }

  private getExtensions(): Electron.Extensions
  {
    return this.getSession().extensions;
  }

  private getSession(): Electron.Session
  {
    return session.defaultSession;
  }

}

export class ApplicationWrapper
{

  private static readonly _instance: ApplicationWrapper = new ApplicationWrapper();

  private isApplicationQuitting = false;

  private readonly chromeExtensionManager: ChromeExtensionManager = new ChromeExtensionManager();

  private readonly persistentWindowManager: PersistentWindowManager = new PersistentWindowManager(path.join(applicationDirectoryPath, "window-states.json"), this.computeWindowOptions());

  private readonly localhost = "localhost";

  private readonly loopBackIpAddress = "127.0.0.1";

  private mainWindow?: BrowserWindow;

  static instance(): ApplicationWrapper
  {
    return ApplicationWrapper._instance;
  }

  private constructor()
  {
  }

  tweakCommandLine(): ApplicationWrapper
  {
    logger.debug("Tweaking the Electron command line");
    // This redirects the Chromium log to the standard error, see https://www.electronjs.org/docs/latest/api/command-line-switches#--enable-loggingfile
    app.commandLine.appendSwitch("enable-logging", "");
    return this;
  }

  start(useSsl: boolean = defaultCliOptions.useSsl, apiServerPortNumber: number = defaultCliOptions.apiServerPortNumber, webServerPortNumber: number = defaultCliOptions.webServerPortNumber, requiresApiKeys: boolean | undefined = defaultCliOptions.requiresApiKeys, unpackedExtensionsDirectoryPath: string | undefined = defaultCliOptions.unpackedExtensionsDirectoryPath): void
  {
    const version = app.getVersion();
    logger.info(`Running the application v${version} in the ${environment} environment`);

    app.on("ready", async () =>
    {
      logger.debug("The application is ready");

      await this.onVersion(version);

      try
      {
        this.mainWindow = this.createMainWindow(useSsl, apiServerPortNumber, webServerPortNumber);
        await this.listenToChromeExtensionInstructions();
        this.setMenu(this.mainWindow);
        new TrayGenerator(this.mainWindow);
        await this.handleAutoUpdate(this.mainWindow);

        const fileWithProtocol = "file://";
        const applicationRootDirectoryPath = path.join(referenceDirectoryPath, "..", "..");
        const serverDirectoryPath = path.join(applicationRootDirectoryPath, "server");
        const electronDirectoryPath = path.resolve(path.join(applicationRootDirectoryPath, "electron"));

        let socketCoordinates;
        try
        {
          socketCoordinates = await this.startHttpProxyServer(webServerPortNumber, useSsl, path.join(applicationRootDirectoryPath, "web"), serverDirectoryPath);
        }
        catch (error)
        {
          dialog.showErrorBox(applicationQuitting, `The internal web server could not start. Reason: '${(error as Error).message}'`);
          app.exit(2);
          return undefined;
        }

        const useBootstrap = Math.random() <= 1;
        if (useBootstrap === true)
        {
          // We load the web application in bootstrap mode
          await this.loadWebApplication(this.mainWindow, useSsl, apiServerPortNumber, socketCoordinates);
        }
        else
        {
          // We load a temporary URL while waiting for the internal server to be ready
          await this.loadUrl(this.mainWindow, new URL(`${fileWithProtocol}${path.join(electronDirectoryPath, "assets", "index.html")}`));
        }

        const apiKey = await this.startProcessServer(apiServerPortNumber, useSsl, requiresApiKeys, unpackedExtensionsDirectoryPath, serverDirectoryPath, {
          isApplicationQuitting: () =>
          {
            return this.isApplicationQuitting;
          },
          onError: (exitCode: number | null) =>
          {
            dialog.showErrorBox(applicationQuitting, `The process server stopped unexpectedly${exitCode === null ? "" : ` with code ${exitCode}`}`);
            app.exit(1);
          }
        });

        const url: URL = await this.loadWebApplication(this.mainWindow, useSsl, apiServerPortNumber, socketCoordinates, apiKey);

        app.on("activate", async () =>
        {
          if (BrowserWindow.getAllWindows().length === 0)
          {
            this.mainWindow = this.createMainWindow(useSsl, apiServerPortNumber, webServerPortNumber);
            await this.loadUrl(this.mainWindow, url);
            this.setMenu(this.mainWindow);
          }
        });

        // We restore the windows previous states
        this.persistentWindowManager.initialize();
        await this.persistentWindowManager.restore();
      }
      catch (error)
      {
        dialog.showErrorBox(applicationQuitting, `An internal error occurred while starting the application. Reason: '${(error as Error).message}'`);
        app.exit(4);
      }
    });

    app.on("window-all-closed", () =>
    {
      logger.debug("All windows are now closed");
      if (process.platform !== "darwin")
      {
        app.quit();
      }
    });

    app.on("before-quit", async (event: Electron.Event) =>
    {
      // Turning this callback into an async function causes the application not to close: hence, we introduce a work-around taken from https://github.com/electron/electron/issues/9433
      if (this.isApplicationQuitting === false)
      {
        logger.debug("The application is about to quit");
        this.isApplicationQuitting = true;
        event.preventDefault();
        await CommandsManager.instance.stop();
        await HttpServer.instance.stop();
        this.persistentWindowManager.quit();
        if (this.mainWindow !== undefined)
        {
          // This is the way to make the window closable
          logger.debug("Marking the window as closable");
          this.mainWindow.closable = true;
        }
        logger.debug("The application is now quitting");
        app.quit();
      }
    });
  }

  async openWindow(url: string): Promise<void>
  {
    await this.persistentWindowManager.open(url, true);
  }

  private async listenToChromeExtensionInstructions(): Promise<void>
  {
    await this.chromeExtensionManager.listenToChromeExtensionEvents();
    CommandsManager.instance.on(HostCommandType.InstallChromeExtension, async (command: InstallChromeExtensionHostCommand) =>
    {
      // TODO: check that provided Chrome extension name matches the manifest in the archive
      async function inflateArchive(archive: Buffer): Promise<string>
      {
        const temporaryDirectoryPath = fs.mkdtempSync(path.join(os.tmpdir(), "picteus-"));
        const directoryPath = path.join(temporaryDirectoryPath, "extension");
        logger.debug(`Inflating the archive to the temporary directory '${directoryPath}'`);

        fs.mkdirSync(directoryPath, { recursive: true });
        const stream = new PassThrough();
        stream.end(archive);
        const gunzip = zlib.createGunzip();
        const extractor = tar.extract(directoryPath);
        await new Promise<void>((resolve, reject) =>
        {
          extractor.on("finish", resolve);
          extractor.on("error", reject);
          gunzip.on("error", reject);
          stream.on("error", reject);
          stream.pipe(gunzip).pipe(extractor);
        });
        return directoryPath;
      }

      const buffer = Buffer.from(command.archive, "base64");
      const directoryPath = await inflateArchive(buffer);
      await this.chromeExtensionManager.load(directoryPath);
    });
    CommandsManager.instance.on(HostCommandType.UninstallChromeExtension, async (command: UninstallChromeExtensionHostCommand) =>
    {
      this.chromeExtensionManager.removeByExtensionName(command.name);
    });
  }

  private computeWindowOptions(): Electron.BrowserWindowConstructorOptions
  {
    return {
      center: true,
      minimizable: true,
      maximizable: true,
      fullscreenable: true,
      autoHideMenuBar: true,
      webPreferences:
        {
          // We disable the access to the DevTools in production mode
          devTools: environment !== "production",
          // We disable the Node.js integration
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
          scrollBounce: true
        }
    };
  }

  private createMainWindow(useSsl: boolean, apiServerPortNumber: number, webServerPortNumber: number): Electron.BrowserWindow
  {
    const store: Store = new Store("windows");
    const fullScreen: boolean = store.get<boolean>("fullScreen", false);
    const commonOptions: Electron.BrowserWindowConstructorOptions = this.computeWindowOptions();
    const size: Size = screen.getPrimaryDisplay().workAreaSize;
    const bounds: Rectangle = store.get<Rectangle>("bounds", { x: 0, y: 0, width: size.width, height: size.height });
    const isWindows = os.platform() === "win32";
    const window: BrowserWindow = new BrowserWindow(isWindows === true ? commonOptions : {
      ...commonOptions,
      closable: false,
      fullscreen: fullScreen, ...bounds
    });
    if (fullScreen === true)
    {
      window.fullScreen = fullScreen;
    }
    else if (isWindows === true)
    {
      bounds.x++;
      bounds.width--;
      window.setContentBounds(bounds);
    }

    const webContents: Electron.WebContents = window.webContents;
    const windowSession: Electron.Session = webContents.session;
    // TODO: reactivate this, but check that it does not prevent the Chrome extension "chrome.webRequest.onBeforeRequest.addListener()" listener from working
    const applyContentSecurityPolicy = !(Math.random() < 1);
    if (applyContentSecurityPolicy === true)
    {
      // We augment the "Content-Security-Policy", which addresses the Electron Security Warning
      const apiServerHostAndPortNumber = `${this.localhost}:${apiServerPortNumber}`;
      const httpPrefix = `http${useSsl === true ? "s" : ""}://`;
      const wsPrefix = `ws${useSsl === true ? "s" : ""}://`;
      const apiServerBaseUrl = `${httpPrefix}${apiServerHostAndPortNumber}`;
      const webServerHostAndPortNumber = `${this.localhost}:${webServerPortNumber}`;
      const webServerBaseUrl = `${httpPrefix}${webServerHostAndPortNumber}`;
      const styleSrcSha256s = ["sha256-AkGc/9SiOd74zk72UnCdLs+k10sM4iy2uKmgoXkaHe0="];
      const contentSecurityPolicy = `default-src 'none'; connect-src ${apiServerBaseUrl} ${wsPrefix}${apiServerHostAndPortNumber} ${wsPrefix}${webServerHostAndPortNumber}; script-src 'self' 'unsafe-eval'; script-src-elem 'self'; frame-src ${apiServerBaseUrl}; style-src 'self' ${styleSrcSha256s.map(string => `'${string}'`).join(" ")}; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.googleapis.com https://fonts.gstatic.com; img-src ${apiServerHostAndPortNumber};`;
      // noinspection HttpUrlsUsage
      // const additionalLocalhostItems = [`http://${this.localhost}:*`, `https://${this.localhost}:*`, `http://${this.loopBackIpAddress}:*`, `https://${this.loopBackIpAddress}:*`].join(" ");
      // const othersCsP = `default-src 'none'; connect-src ${additionalLocalhostItems}; script-src 'self' 'unsafe-eval'; script-src-elem 'self'; frame-src ${additionalLocalhostItems}; style-src 'self' 'unsafe-hashes' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline' ${additionalLocalhostItems}; font-src ${additionalLocalhostItems}; img-src ${additionalLocalhostItems};`;
      const webRequest: Electron.WebRequest = windowSession.webRequest;
      webRequest.onHeadersReceived((details, callback) =>
      {
        const isSelfUrl = details.url.startsWith(webServerBaseUrl) === true;
        const responseHeaders = details.responseHeaders || {};
        if (isSelfUrl === true)
        {
          responseHeaders["Content-Security-Policy"] = [contentSecurityPolicy];
        }
        callback({ responseHeaders });
      });
    }

    // We ignore the SSL certificate errors. Taken from https://stackoverflow.com/questions/38986692/how-do-i-trust-a-self-signed-certificate-from-an-electron-app
    windowSession.setCertificateVerifyProc((request, callback) =>
    {
      const { hostname, certificate, verificationResult, errorCode } = request;

      const issuer = certificate.issuer;
      let result: number;
      if (errorCode !== -202 || verificationResult !== "net::ERR_CERT_AUTHORITY_INVALID" || (hostname !== this.localhost && hostname !== this.loopBackIpAddress) || (issuer.commonName !== this.localhost && issuer.commonName !== this.loopBackIpAddress) || issuer.organizations.length !== 1 || issuer.organizations[0] !== "KoppaSoft")
      {
        result = errorCode;
      }
      else
      {
        result = 0;
      }
      callback(result);
    });

    // We allow any window to be opened
    webContents.setWindowOpenHandler((_details: Electron.HandlerDetails) =>
    {
      return {
        action: "allow",
        createWindow: (options: Electron.BrowserWindowConstructorOptions): Electron.WebContents =>
        {
          const newWindow = new BrowserWindow(options);
          return newWindow.webContents;
        }
      };
    });

    window.on("close", () =>
    {
      logger.debug("The main window is closing");
      store.set<Rectangle>("bounds", isWindows === true ? window.getContentBounds() : window.getBounds());
      store.set<boolean>("fullScreen", window.fullScreen);
    });

    return window;
  }

  private async handleAutoUpdate(window: Electron.CrossProcessExports.BrowserWindow): Promise<void>
  {
    const checkForUpdate = environment === "production" && (process.platform === "win32" || process.platform === "darwin");
    if (checkForUpdate === true)
    {
      // We check whether there is a newer version of the application
      try
      {
        const updateBaseUrl = "https://storage.googleapis.com/understitiel/picteus";
        const updateFeedUrl = `${updateBaseUrl}/feed-${process.platform}.json`;
        await autoUpdateApplication(window, updateFeedUrl);
      }
      catch (error)
      {
        // This should not break the application
        logger.warn(`The auto-update of the application failed. Reason: '${(error as Error).message}'`, error);
      }
    }
  }

  private async loadUrl(window: BrowserWindow, url: URL): Promise<void>
  {
    logger.debug(`Loading the URL '${url}'`);
    const options: Electron.LoadURLOptions = {};
    await window.loadURL(url.toString(), options);
  }

  private async loadWebApplication(window: BrowserWindow, useSsl: boolean, processServerPortNumber: number, socketCoordinates: SocketCoordinates, apiKey?: string): Promise<URL>
  {
    // We load the web application
    const webServicesBaseUrl = `http${useSsl === true ? "s" : ""}://${this.localhost}:${processServerPortNumber}`;
    // const url = new URL(`${fileWithProtocol}${path.join(applicationRootDirectoryPath, "web", "index.html")}`);
    const url = new URL(`${socketCoordinates.webCoordinates.baseUrl}/index.html`);
    url.searchParams.set("webServicesBaseUrl", webServicesBaseUrl);
    if (apiKey !== undefined)
    {
      // When the API key is not provided, we are supposed to be running the web application in bootstrap mode, which means that the commands' socket coordinates are not necessary
      url.searchParams.set("apiKey", apiKey);
      url.searchParams.set("commandsSocketBaseUrl", socketCoordinates.webCoordinates.baseUrl);
      url.searchParams.set("commandsSocketSecret", socketCoordinates.secret);
    }
    await this.loadUrl(window, url);
    return url;
  }

  private setMenu(window: BrowserWindow): void
  {
    const defaultMenu = Menu.getApplicationMenu()!;
    const newMenu: Menu = new Menu();
    defaultMenu.items.filter((item) =>
    {
      return item.role !== "help";
    }).forEach((item) =>
    {
      // @ts-ignore
      if (item.role === "appmenu")
      {
        const subMenu: Menu | undefined = item.submenu;
        subMenu?.items.find((subItem, index) =>
        {
          if (subItem.role === "services")
          {
            subMenu.insert(index++, new MenuItem({ type: "separator" }
            ));
            subMenu.insert(index++, new MenuItem({
                type: "normal",
                id: "applicationFolder",
                label: "Application Folder",
                click: async (): Promise<void> =>
                {
                  const directoryPath = applicationDirectoryPath;
                  const result = await shell.openPath(directoryPath);
                  if (result !== "")
                  {
                    await dialog.showMessageBox(window, {
                      type: "error",
                      title: app.getName(),
                      message: `Cannot open the application folder located at '${directoryPath}'`,
                      buttons: ["OK"]
                    });
                  }
                }
              }
            ));
            if (environment !== "production")
            {
              subMenu.insert(index++, new MenuItem({
                  type: "normal",
                  id: "test1",
                  label: "Test 1",
                  accelerator: "Command+1",
                  click: async (): Promise<void> =>
                  {
                    const window = new BrowserWindow({ width: 800, height: 600 });
                    await window.loadURL("https://gemini.google.com/");
                  }
                }
              ));
              subMenu.insert(index++, new MenuItem({
                  type: "normal",
                  id: "test2",
                  label: "Test 2",
                  accelerator: "Command+2",
                  click: async (): Promise<void> =>
                  {
                  }
                }
              ));
            }
            subMenu.insert(index++, new MenuItem({ type: "separator" }
            ));
            return true;
          }
          return false;
        });
      }
      // @ts-ignore
      else if (item.role === "viewmenu" && environment === "production")
      {
        const subMenu: Menu | undefined = item.submenu;
        subMenu?.items.find((anItem) =>
        {
          // @ts-ignore
          if (anItem.role === "toggledevtools")
          {
            anItem.visible = false;
            return true;
          }
          return false;
        });
      }
      newMenu.append(item);
    });
    Menu.setApplicationMenu(newMenu);
  }

  private async startHttpProxyServer(portNumber: number, useSsl: boolean, webDirectoryPath: string, serverDirectoryPath: string): Promise<SocketCoordinates>
  {
    return await CommandsManager.instance.start(portNumber, useSsl, webDirectoryPath, path.join(serverDirectoryPath, "secrets"));
  }

  private async startProcessServer(portNumber: number, useSsl: boolean | undefined, requiresApiKeys: boolean | undefined, unpackedExtensionsDirectoryPath: string | undefined, serverDirectoryPath: string, coordinator: HttpServerApplicationCoordinator): Promise<string>
  {
    return await HttpServer.instance.start(serverDirectoryPath, path.join(serverDirectoryPath, "database.db"), portNumber, useSsl, requiresApiKeys, unpackedExtensionsDirectoryPath, coordinator);
  }

  private async onVersion(version: string): Promise<void>
  {
    const versionFilePath = path.join(applicationDirectoryPath, "version.txt");
    if (fs.existsSync(versionFilePath) === true)
    {
      const previousLaunchVersion = fs.readFileSync(versionFilePath, "utf8");
      if (previousLaunchVersion !== version)
      {
        logger.info(`Launching for the first time the application with version '${version}', while the previous launch was with version '${previousLaunchVersion}'`);
      }
    }
    else
    {
      logger.info(`Launching the application for the very first time`);
    }
    fs.writeFileSync(versionFilePath, version);
  }

}

async function main(): Promise<void>
{
  logger.info(`Starting the application v${app.getVersion()} running under Node.js ${process.version}, Electron v${process.versions.electron}, with working directory set to '${process.cwd()}'`);
  const applicationWrapper = ApplicationWrapper.instance().tweakCommandLine();

  if (environment === "production")
  {
    // This is a work-around on all OSes, otherwise Caporal fails to start properly on macOS because of the issue reported at https://github.com/mattallty/Caporal.js/issues/199 and does not work properly on Windows
    process.argv.splice(1, 0, process.execPath);
  }

  // We lazy-load Caporal because of the issue with the "process.argv" reported at https://github.com/mattallty/Caporal.js/issues/199
  // noinspection JSUnusedLocalSymbols
  const Caporal = await import("@caporal/core");
  // @ts-ignore
  type Program = Caporal.Program;
  // @ts-ignore
  type ActionParameters = Caporal.ActionParameters;

  const cliArguments: string[] = process.argv.slice(2);
  if (cliArguments.length === 0)
  {
    // TODO: understand why the default command does not apply
    cliArguments.push(defaultCommand);
  }
  const parseCommandLineAndRun = await computeParseCommandLineAndRun();
  await parseCommandLineAndRun(logger, cliArguments, app.getName(), app.getVersion(), environment === "production", async (_program: Program): Promise<void> =>
  {
  }, async (_actionParameters: ActionParameters, cliOptions: CliOptions): Promise<void> =>
  {
    applicationWrapper.start(cliOptions.useSsl, cliOptions.apiServerPortNumber, cliOptions.webServerPortNumber, cliOptions.requiresApiKeys, cliOptions.unpackedExtensionsDirectoryPath);
  }, (code: number): void =>
  {
    app.exit(code);
  });
}

main().catch(((error) =>
{
  console.error(error);
  throw error;
}));
