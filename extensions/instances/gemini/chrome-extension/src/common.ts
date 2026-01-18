export function isRunningInElectron(): boolean
{
  return chrome.windows === undefined;
}

export interface Settings
{
  webServicesBaseUrl?: string;
  apiKey?: string;
  repositoryId?: string;
}

export const settingsProperties: (keyof Settings)[] = ["webServicesBaseUrl", "apiKey", "repositoryId"];

export async function getSettings(): Promise<Settings>
{
  if (isRunningInElectron() === true)
  {
    console.log("Taking the settings from a file");
    try
    {
      const rawJson = chrome.runtime.getManifest().action.default_title;
      return JSON.parse(rawJson);
    }
    catch (error)
    {
      throw new Error("Unable to retrieve settings from file. Reason: " + (error as Error).message);
    }
  }
  console.log("Taking the settings from the user's storage");
  const result = await chrome.storage.local.get("settings");
  return result.settings ?? {};
}

export async function setSettings(settings: Settings): Promise<void>
{
  await chrome.storage.local.set({ "settings": settings });
}
