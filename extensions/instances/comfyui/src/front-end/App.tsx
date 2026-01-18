import * as React from "react";
import { useEffect, useState } from "react";

import { Configuration, ExtensionApi } from "@picteus/extension-sdk/dist/picteus-ws-client";


export default () =>
{
  const [url, setUrl] = useState(undefined);
  useEffect(() =>
  {
    const run = async () =>
    {
      // TODO: find a save way to access to the extension parameters
      const parameters = await (await fetch("../../parameters.json")).json();
      const configuration = new Configuration({ basePath: parameters.webServicesBaseUrl, apiKey: parameters.apiKey });
      const settings = await new ExtensionApi(configuration).extensionGetSettings({ id: parameters.extensionId });
      setUrl(settings.value["url"]);
    };
    // noinspection JSIgnoredPromiseFromCall
    run();
  }, []);

  return (
    <>
      <iframe
        src={url}
        style={{ width: "100vw", height: "100vh", border: "none" }}
      ></iframe>
    </>
  );
};
