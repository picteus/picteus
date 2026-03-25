import * as fs from "fs";

import { BrowserWindow } from "electron";

import { logger } from "./logger";


interface IdUrl
{
  id: string;
  url: string;
}

interface WindowWithUrl
{
  url: string;
  window: BrowserWindow;
  automaticallyReopen: boolean;
}

interface WindowState
{
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
  currentUrl: string;
  automaticallyReopen: boolean;
  open: boolean;
}

export class PersistentWindowManager
{

  private perIdStates: Record<string, WindowState> = {};

  private readonly perIdWindowWithUrls: Map<string, WindowWithUrl> = new Map();

  private shouldListenToCloseEvents: boolean = true;

  constructor(private readonly stateFilePath: string, private readonly options: Electron.BrowserWindowConstructorOptions)
  {
  }

  initialize(): void
  {
    this.shouldListenToCloseEvents = true;
    this.loadStates();
  }

  async open(idUrl: IdUrl, automaticallyReopen: boolean, focus: boolean): Promise<BrowserWindow>
  {
    {
      const existingEntry: WindowWithUrl | undefined = this.perIdWindowWithUrls.get(idUrl.id);
      if (existingEntry !== undefined && existingEntry.window.isDestroyed() === false)
      {
        if (focus === true)
        {
          existingEntry.window.focus();
        }
        return existingEntry.window;
      }
    }

    const savedState = this.perIdStates[idUrl.id];
    const options: Electron.BrowserWindowConstructorOptions = { ...this.options };
    if (savedState !== undefined)
    {
      options.x = savedState.x;
      options.y = savedState.y;
      options.width = savedState.width;
      options.height = savedState.height;
    }

    const window = new BrowserWindow(options);
    window.setMenuBarVisibility(false);
    this.perIdWindowWithUrls.set(idUrl.id, { window, url: idUrl.url, automaticallyReopen });

    const actualUrl = savedState?.currentUrl || idUrl.url;
    const filePrefix = "file://";
    actualUrl.startsWith(filePrefix) === true ? await window.loadFile(actualUrl.substring(filePrefix.length)) : await window.loadURL(actualUrl);

    // We save the state when the window is closed
    window.once("close", () =>
    {
      if (this.shouldListenToCloseEvents === false)
      {
        return;
      }
      if (window.isDestroyed() === true)
      {
        return;
      }
      window.setClosable(false);
      this.saveWindowState(window, idUrl, automaticallyReopen, false);
      this.saveStates();
      this.perIdWindowWithUrls.delete(idUrl.id);
    });

    return window;
  }

  async restore(): Promise<void>
  {
    for (const [id, state] of Object.entries(this.perIdStates))
    {
      if (state.open === true && state.automaticallyReopen === true)
      {
        await this.open({ id, url: state.currentUrl }, state.automaticallyReopen, false);
      }
    }
  }

  quit(): void
  {
    this.shouldListenToCloseEvents = false;
    for (const [id, { url, window, automaticallyReopen }] of this.perIdWindowWithUrls.entries())
    {
      this.saveWindowState(window, { id, url }, automaticallyReopen, true);
    }
    this.saveStates();
    for (const [, entry] of this.perIdWindowWithUrls.entries())
    {
      entry.window.close();
    }
    this.perIdWindowWithUrls.clear();
    this.perIdStates = {};
  }

  private loadStates(): void
  {
    if (fs.existsSync(this.stateFilePath) === true)
    {
      try
      {
        const data = fs.readFileSync(this.stateFilePath, "utf8");
        this.perIdStates = JSON.parse(data);
      }
      catch (error)
      {
        logger.error(`Could not parse as JSON content the file '${this.stateFilePath}': resetting the windows state`);
        fs.rmSync(this.stateFilePath);
        this.perIdStates = {};
      }
    }
  }

  private saveWindowState(window: BrowserWindow, idUrl: IdUrl, automaticallyReopen: boolean, open: boolean): void
  {
    const bounds = window.getBounds();
    this.perIdStates[idUrl.id] =
      {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        url: idUrl.url,
        currentUrl: window.webContents.getURL(),
        automaticallyReopen,
        open
      };
  }

  private saveStates(): void
  {
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.perIdStates, null, 2));
  }

}
