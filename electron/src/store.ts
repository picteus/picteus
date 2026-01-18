import path from "node:path";
import fs from "node:fs";

import { app } from "electron";


export class Store
{

  private readonly filePath: string;

  private readonly values: Record<string, any>;

  constructor(name: string)
  {
    this.filePath = path.join(app.getPath("userData"), "store", name + ".json");
    let values: Record<string, any> | undefined;
    if (fs.existsSync(this.filePath) === true)
    {
      try
      {
        values = JSON.parse(fs.readFileSync(this.filePath, { encoding: "utf8" }));
      }
      catch (error)
      {
        // It is likely that the JSON content is invalid, so we will reset the store
      }
    }
    this.values = values ?? {};
  }

  set<T>(key: string, value: T): void
  {
    this.values[key] = value;
    if (fs.existsSync(this.filePath) === false)
    {
      fs.mkdirSync(path.join(this.filePath, ".."), { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.values, undefined, 2), { encoding: "utf8" });
  }

  get<T>(key: string, defaultValue: T): T
  {
    const value = this.values[key];
    return value === undefined ? defaultValue : value as T;
  }

}