import * as fs from "fs";

import { BrowserWindow } from "electron";

import { logger } from "./logger";


interface WindowState
{
  x: number;
  y: number;
  width: number;
  height: number;
  currentUrl: string;
  open: boolean;
}

export class PersistentWindowManager
{

  private states: Record<string, WindowState> = {};

  private readonly windows: Map<string, BrowserWindow> = new Map();

  private shouldListenToCloseEvents: boolean = true;

  constructor(private readonly stateFilePath: string, private readonly options: Electron.BrowserWindowConstructorOptions)
  {
  }

  initialize(): void
  {
    this.shouldListenToCloseEvents = true;
    this.loadStates();
  }

  async open(url: string, focus: boolean): Promise<BrowserWindow>
  {
    const existingWindow = this.windows.get(url);
    if (existingWindow && existingWindow.isDestroyed() === false)
    {
      if (focus === true)
      {
        existingWindow.focus();
      }
      return existingWindow;
    }

    const savedState = this.states[url];
    const options: Electron.BrowserWindowConstructorOptions = { ...this.options };
    if (savedState !== undefined)
    {
      options.x = savedState.x;
      options.y = savedState.y;
      options.width = savedState.width;
      options.height = savedState.height;
    }

    const window = new BrowserWindow(options);
    this.windows.set(url, window);

    const actualUrl = savedState?.currentUrl || url;
    await window.loadURL(actualUrl);

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
      this.saveWindowState(window, url, false);
      this.saveStates();
      this.windows.delete(url);
    });

    return window;
  }

  async restore(): Promise<void>
  {
    for (const [url, state] of Object.entries(this.states))
    {
      if (state.open === true)
      {
        await this.open(url, false);
      }
    }
  }

  quit(): void
  {
    this.shouldListenToCloseEvents = false;
    for (const [url, window] of this.windows.entries())
    {
      this.saveWindowState(window, url, true);
    }
    this.saveStates();
    for (const [, window] of this.windows.entries())
    {
      window.close();
    }
    this.windows.clear();
    this.states = {};
  }

  private loadStates(): void
  {
    if (fs.existsSync(this.stateFilePath) === true)
    {
      try
      {
        const data = fs.readFileSync(this.stateFilePath, "utf8");
        this.states = JSON.parse(data);
      }
      catch (error)
      {
        logger.error(`Could not parse as JSON content the file '${this.stateFilePath}': resetting the windows state`);
        fs.rmSync(this.stateFilePath);
        this.states = {};
      }
    }
  }

  private saveWindowState(window: BrowserWindow, url: string, open: boolean): void
  {
    const bounds = window.getBounds();
    this.states[url] =
      {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        currentUrl: window.webContents.getURL(),
        open
      };
  }

  private saveStates(): void
  {
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.states, null, 2));
  }

}
