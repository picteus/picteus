import path from "node:path";
import fs from "node:fs";
import os from "node:os";

import semver from "semver";
import { app, autoUpdater, BrowserWindow, dialog, Event } from "electron";
import { CustomPublishOptions, ProgressInfo, UpdateInfo } from "builder-util-runtime";
import ElectronUpdater from "electron-updater";
import { ResolvedUpdateFileInfo, UpdateDownloadedEvent } from "electron-updater/out/types";
import { ProviderRuntimeOptions } from "electron-updater/out/providers/Provider";
import { ElectronAppAdapter } from "electron-updater/out/ElectronAppAdapter";
import { AppUpdater } from "electron-updater/out/AppUpdater";

import { logger } from "./logger";

const { autoUpdater: electronUpdaterAutoUpdater, Provider } = ElectronUpdater;


interface Feed
{
  version: string;
  name: string;
  pub_date: string;
  notes: string;
  url: string;
  sha512: string;
}

async function downloadFeed(updateFeedUrl: string): Promise<Feed>
{
  let feed: Record<string, any>;
  try
  {
    feed = await (await fetch(updateFeedUrl)).json();
  }
  catch (error)
  {
    throw new Error(`Could not access to the application update feed. Reason: '${(error as Error).message}'`);
  }
  // The feed must be a JSON object with properties "version", "name, "pub_date", "notes", "url" and "sha512"
  const checkProperty = (property: string) =>
  {
    const propertyValue = feed[property];
    if (typeof propertyValue === "undefined")
    {
      throw new Error(`Missing property '${property}'`);
    }
    else if (typeof propertyValue !== "string")
    {
      throw new Error(`Property '${property}' is not of type 'string'`);
    }
  };
  try
  {
    checkProperty("version");
    checkProperty("name");
    checkProperty("pub_date");
    checkProperty("notes");
    checkProperty("url");
    checkProperty("sha512");
  }
  catch (error)
  {
    throw new Error(`The content related to the application update feed at URL '${updateFeedUrl}' is not a well-formed content. Reason: '${(error as Error).message}'`);
  }
  return feed as Feed;
}

async function showInstallQuestion(window: BrowserWindow, releaseName: string, releaseNotes: string | undefined): Promise<boolean>
{
  logger.info("The update package has been downloaded and the name of the candidate release version is '" + releaseName + "', with release notes '" + releaseNotes + "'");
  const returnValue: Electron.MessageBoxReturnValue = await dialog.showMessageBox(window, {
    type: "question",
    title: app.getName(),
    message: `A new version '${releaseName}' of the application has been downloaded: do you want to relaunch the application and install it now (patience, it will take about 30 seconds to restart)? Or do you prefer that it gets installed at next launch?`,
    detail: (releaseNotes !== undefined && releaseNotes.trim().length > 0) ? ("Here are the release notes of this version:" + "\n\n" + releaseNotes) : undefined,
    buttons: ["Later", "Relaunch"]
  });
  return returnValue.response === 1;
}

function installAndQuitApplication(window: BrowserWindow, run: () => void): void
{
  logger.info("Quitting and installing the new version of the application");
  // We make the main window closable, otherwise, the "autoUpdater.quitAndInstall()" does not work, as stated on https://github.com/electron-userland/electron-builder/issues/3402
  window.closable = true;
  run();
}

async function autoUpdateApplicationViaAutoUpdater(window: BrowserWindow, updateFeedUrl: string): Promise<void>
{
  logger.info(`Running the auto-update process against the application feed at URL '${updateFeedUrl}'`);
  return new Promise<void>(async (resolve, reject) =>
  {
    autoUpdater.on("error", (error: Error): void =>
    {
      logger.error("A problem occurred while running the auto-update process. Reason: '" + error.message + "'", error);
    });
    autoUpdater.on("update-available", (): void =>
    {
      logger.debug("An application update is available");
    });
    autoUpdater.on("update-not-available", (): void =>
    {
      logger.warn("No update is available");
      resolve();
    });
    autoUpdater.on("update-downloaded", async (_event: Event, releaseNotes: string, releaseName: string, _releaseDate: Date, _updateURL: string): Promise<void> =>
    {
      if ((await showInstallQuestion(window, releaseName, releaseNotes)) === true)
      {
        installAndQuitApplication(window, () =>
        {
          autoUpdater.quitAndInstall();
        });
      }
    });
    let feed: Feed;
    try
    {
      feed = await downloadFeed(updateFeedUrl);
    }
    catch (error)
    {
      return reject(error);
    }
    const latestVersion: string = feed.version;
    const currentVersion: string = app.getVersion();
    if (currentVersion === latestVersion)
    {
      logger.debug(`The current application version '${currentVersion}' is already the latest version, no need to update`);
      return resolve();
    }
    if (latestVersion !== undefined && semver.gte(currentVersion, latestVersion) === true)
    {
      logger.debug(`The current application version '${currentVersion}' is fresher that the latest version '${latestVersion}', no need to update`);
      return resolve();
    }

    const directoryPath = fs.mkdtempSync(path.join(os.tmpdir(), "picteus-"));
    const feedFilePath = path.join(directoryPath, "feed.json");
    logger.debug(`Using the local auto-update feed file '${feedFilePath}' with a latest version set to '${latestVersion}'`);
    fs.writeFileSync(feedFilePath, JSON.stringify(feed));

    try
    {
      // Caution: it is necessary to use the "file" protocol and to encode the URI when the file path contains spaces (for instance)
      autoUpdater.setFeedURL({ url: `file://${encodeURI(feedFilePath)}` });
      autoUpdater.checkForUpdates();
    }
    catch (error)
    {
      return reject(new Error(`An unexpected error occurred during the application auto-update. Reason: '${(error as Error).message}'`));
    }
    resolve();
  });
}

class CustomProvider extends Provider<UpdateInfo>
{

  constructor(private readonly options: CustomPublishOptions, updater: AppUpdater, runtimeOptions: ProviderRuntimeOptions)
  {
    super(runtimeOptions);
    // @ts-ignore
    const appAdapter: ElectronAppAdapter = updater.app as ElectronAppAdapter;
    const configurationFilePath = appAdapter.appUpdateConfigPath;
    // We need to manually write that configuration file, otherwise the auto-update process fails
    fs.writeFileSync(configurationFilePath, `updaterCacheDirName: ${app.name}`);
  }

  async getLatestVersion(): Promise<UpdateInfo>
  {
    const feed = await downloadFeed(this.options.url);
    const sha512 = feed.sha512;
    // noinspection JSDeprecatedSymbols
    return {
      releaseName: feed.name,
      releaseDate: feed.pub_date,
      releaseNotes: feed.notes,
      version: feed.version,
      files: [{ url: feed.url, sha512 }],
      stagingPercentage: 100,
      path: feed.url,
      sha512
    };
  }

  resolveFiles(updateInfo: UpdateInfo): Array<ResolvedUpdateFileInfo>
  {
    return updateInfo.files.map((file) =>
    {
      return {
        url: new URL(file.url),
        info: file,
        packageInfo: { path: file.url, sha512: file.sha512 }
      };
    });
  }

}

async function autoUpdateApplicationViaElectronUpdater(window: BrowserWindow, updateFeedUrl: string): Promise<void>
{
  // Enables the next line, when you need to test the auto-update process in development mode
  // electronUpdaterAutoUpdater.forceDevUpdateConfig = true;
  electronUpdaterAutoUpdater.logger = logger;
  electronUpdaterAutoUpdater.disableDifferentialDownload = true;
  electronUpdaterAutoUpdater.disableWebInstaller = false;

  electronUpdaterAutoUpdater.on("error", (error: Error) =>
  {
    logger.error("A problem occurred while running the auto-update process. Reason: '" + error.message + "'", error);
  });
  electronUpdaterAutoUpdater.on("checking-for-update", () =>
  {
    logger.debug("Checking for an update of the application");
  });
  electronUpdaterAutoUpdater.on("update-available", (info: UpdateInfo): void =>
  {
    logger.debug(`An application update is available with version '${info.version}'`);
  });
  electronUpdaterAutoUpdater.on("download-progress", (info: ProgressInfo): void =>
  {
    logger.debug(`The download of the application update has reached ${info.percent}%`);
  });
  electronUpdaterAutoUpdater.on("update-downloaded", async (event: UpdateDownloadedEvent): Promise<void> =>
  {
    const releaseName = event.releaseName!;
    const eventReleaseNotes = event.releaseNotes;
    const releaseNotes = (eventReleaseNotes === undefined || eventReleaseNotes === null) ? undefined : (typeof eventReleaseNotes === "string" ? eventReleaseNotes as string : (eventReleaseNotes.length === 0 ? undefined : eventReleaseNotes![0].note ?? undefined));

    if ((await showInstallQuestion(window, releaseName, releaseNotes)) === true)
    {
      installAndQuitApplication(window, () =>
      {
        electronUpdaterAutoUpdater.quitAndInstall(true, true);
      });
    }
  });

  const options: CustomPublishOptions =
    {
      provider: "custom",
      requestHeaders: { "Cache-Control": "no-cache" },
      updateProvider: CustomProvider,
      url: updateFeedUrl
    };
  electronUpdaterAutoUpdater.setFeedURL(options);
  await electronUpdaterAutoUpdater.checkForUpdates();
}

export const autoUpdateApplication = os.platform() === "darwin" ? autoUpdateApplicationViaAutoUpdater : autoUpdateApplicationViaElectronUpdater;
