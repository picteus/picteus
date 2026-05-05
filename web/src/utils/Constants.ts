const urlSearchParams = new URLSearchParams(window.location.search);
export const BASE_PATH =
  urlSearchParams.get("webServicesBaseUrl") || "https://localhost:3001";
export const API_KEY = urlSearchParams.get("apiKey") || "";

export const ROUTES = {
  home: "/",
  collections: "/collections",
  repositories: "/repositories",
  extensions: "/extensions",
  activity: "/activity",
  settings: "/settings",
};

export function computeExtensionSidebarUuid(extensionId: string, id: string): string {
  return `${extensionId}-${id}`;
}

export function computeExtensionSidebarRoute(uuid: string) {
  return `/extension/${uuid}`;
}

export const VISUALIZER_DEFAULT_PANEL_SIZES: number[] = [60, 30];
