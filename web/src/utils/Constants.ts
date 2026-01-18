const urlSearchParams = new URLSearchParams(window.location.search);
export const BASE_PATH =
  urlSearchParams.get("webServicesBaseUrl") || "https://localhost:3001";
export const API_KEY = urlSearchParams.get("apiKey") || "";

export const ROUTES = {
  extension_sidebar_suffix: "/extension/",
  home: "/",
  bootstrap: "/bootstrap",
  repositories: "/repositories",
  extensions: "/extensions",
  activity: "/activity",
  settings: "/settings",
  explore: "/explore",
};

export const VISUALIZER_DEFAULT_PANEL_SIZES: number[] = [60, 30];
