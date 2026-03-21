import * as React from "react";
import { useEffect, useState } from "react";

import { Configuration, ExtensionApi } from "@picteus/extension-sdk/dist/picteus-ws-client";


export default () =>
{
  const [url, setUrl] = useState<string>();
  const [message, setMessage] = useState<string | undefined>("Loading…");
  useEffect(() =>
  {
    const run = async () =>
    {
      // TODO: find a save way to access to the extension parameters
      const parameters = await (await fetch("../../parameters.json")).json();
      const configuration = new Configuration({ basePath: parameters.webServicesBaseUrl, apiKey: parameters.apiKey });
      const settings = await new ExtensionApi(configuration).extensionGetSettings({ id: parameters.extensionId });
      const theUrl = (settings.value as Record<string, any>)["url"] as string;
      if (theUrl !== undefined)
      {
        try
        {
          // TODO: once the CORS issue is fixed, re-enable
          // await fetch(`${theUrl}/picteus/ping`, { method: "POST"});
          setUrl(theUrl);
          setMessage(undefined);
        }
        catch (error)
        {
          setMessage((error as Error).message);
        }
      }
      else
      {
        setMessage("The settings of the extension are not defined");
      }
    };
    void run();
  }, []);

  return (
    <>
      {message && <div style={{ fontSize: "x-large" }}>{message}</div>}
      {url && <iframe
        src={url}
        style={{ width: "100%", height: "100%", border: "none" }}
      ></iframe>}
    </>
  );
};
