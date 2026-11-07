// Taken form https://github.com/sindresorhus/file-metadata/blob/main/index.js
import { promisify } from "node:util";
import childProcess from "node:child_process";

import { parse as parsePlist } from "plist";


const parse = (data: string): Record<string, any> =>
{
  const object = parsePlist(data);
  const returnValue: Record<string, any> = {};

  if (object === null || typeof object !== "object" || Array.isArray(object) || object instanceof Date || object instanceof Uint8Array)
  {
    return returnValue;
  }

  for (let [ key, value ] of Object.entries(object))
  {
    key = key.replace(/^kMDItem/, "").replace(/_/g, "");
    key = key.startsWith("FS") ? key.replace(/^FS/, "fs") : key[0].toLowerCase() + key.slice(1);
    returnValue[key] = value;
  }

  return returnValue;
};

export async function fileMetadata(filePath: string): Promise<Record<string, any>>
{
  const { stdout } = await promisify(childProcess.execFile)("mdls", [ "-plist", "-", filePath ]);
  return parse(stdout.trim());
}
