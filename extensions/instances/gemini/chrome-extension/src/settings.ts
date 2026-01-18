import { getSettings, setSettings, Settings, settingsProperties } from "./common";

console.debug("Picteus Chrome Extension settings");

document.addEventListener("DOMContentLoaded", async () =>
{
  async function handleLoad(): Promise<void>
  {
    const settings = await getSettings();
    if (settings !== undefined)
    {
      for (const property of settingsProperties)
      {
        const element = document.getElementById(property) as HTMLInputElement;
        if (element !== null)
        {
          const value = settings[property];
          if (value !== undefined)
          {
            if (element.type === "number" && typeof value === "number")
            {
              element.value = (value as number).toString();
            }
            else if (element.type === "checkbox" && typeof value === "boolean")
            {
              element.checked = value as boolean;
            }
            else
            {
              element.value = value;
            }
          }
        }
      }
    }
  }

  function handleSave(): void
  {
    document.getElementById("save")?.addEventListener("click", async (event) =>
    {
      event.preventDefault();
      const settings: Settings = {};
      for (const property of settingsProperties)
      {
        const element = document.getElementById(property) as HTMLInputElement;
        if (element !== null)
        {
          // if (element.type === "number")
          // {
          //   settings[property] = parseInt(element.value, 10);
          // }
          // else if (element.type === "checkbox")
          // {
          //   settings[property] = element.checked;
          // }
          // else
          if (element.value === "")
          {
            delete settings[property];
          }
          else
          {
            settings[property] = element.value;
          }
        }
      }
      await setSettings(settings);
      window.close();
    });
  }

  async function main(): Promise<void>
  {
    await handleLoad();
    handleSave();
  }

  main().catch(console.error);

});
