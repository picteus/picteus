import * as React from "react";
import { useCallback, useEffect, useState } from "react";

import { Configuration, ExtensionApi } from "@picteus/extension-sdk/dist/picteus-ws-client";


export default () =>
{
  const [url, setUrl] = useState<string>();
  const [message, setMessage] = useState<string | undefined>("Loading…");
  const [retry, setRetry] = useState<boolean>(false);
  const connect = useCallback(async () =>
  {
    // TODO: find a save way to access to the extension parameters
    setRetry(false);
    const parameters = await (await fetch("../../parameters.json")).json();
    const configuration = new Configuration({ basePath: parameters.webServicesBaseUrl, apiKey: parameters.apiKey });
    const settings = await new ExtensionApi(configuration).extensionGetSettings({ id: parameters.extensionId });
    const theUrl = (settings.value as Record<string, any>)["url"] as string;
    if (theUrl !== undefined)
    {
      try
      {
        await fetch(`${theUrl}/picteus/ping`, { method: "POST", mode: "no-cors" });
        setUrl(theUrl);
        setMessage(undefined);
      }
      catch (error)
      {
        setMessage(`ComfyUI server not started or extension misconfigured: URL '${theUrl}' is not reachable.`);
        setRetry(true);
      }
    }
    else
    {
      setMessage("The settings of the extension are not defined");
      setRetry(true);
    }
  }, []);
  useEffect(() =>
  {
    void connect();
  }, []);

  return (
    <>
      {(message || retry) && <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: "large",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px"
      }}>
        <button disabled={!retry} onClick={connect} title="Retry" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px",
          cursor: retry ? "pointer" : "auto"
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        {message && <span>{message}</span>}
      </div>}
      {url && <iframe
        src={url}
        style={{ width: "100vw", height: "100vh", border: "none" }}
      ></iframe>}
    </>
  );
};
