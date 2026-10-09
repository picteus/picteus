// This is a polyfill for ReactDOM.findDOMNode removed in React 19
import "./react-dom-polyfill";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.tsx";


// noinspection PlatformDetectionJS
const userAgent = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
const isRunningInElectron = userAgent.includes("electron");
if (isRunningInElectron === true)
{
  document.documentElement.classList.add("electron");
  // noinspection JSDeprecatedSymbols,PlatformDetectionJS
  const platformString = (typeof navigator !== "undefined" ? (navigator.platform || "") : "").toLowerCase();
  const isDarwin = platformString.includes("mac") || userAgent.includes("macintosh");
  const isWindows = platformString.includes("win") || userAgent.includes("windows");
  const platform = isDarwin ? "darwin" : (isWindows ? "win32" : "linux");
  document.documentElement.classList.add(`electron-${platform}`);
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App/>);
