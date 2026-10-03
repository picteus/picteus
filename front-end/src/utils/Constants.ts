const urlSearchParams = new URLSearchParams(window.location.search);
export const BASE_PATH = urlSearchParams.get("webServicesBaseUrl") || "https://localhost:3001";
export const API_KEY = urlSearchParams.get("apiKey") || "";

export const ROUTES = {
  home: "/",
  desk: "/desk",
  collections: "/collections",
  repositories: "/repositories",
  extensions: "/extensions",
  activity: "/activity",
  settings: "/settings",
  test: "/test"
};

export const DESK_TAB_QUERY_PARAMETER_NAME = "tabId";

export function computeExtensionSidebarUuid(extensionId: string, id: string): string
{
  return `${extensionId}-${id}`;
}

export function computeExtensionSidebarRoute(uuid: string): string
{
  return `/extension/${uuid}`;
}

export function computeDeskRoute(tabId: string): string
{
  return `${ROUTES.desk}?${DESK_TAB_QUERY_PARAMETER_NAME}=${encodeURIComponent(tabId)}`;
}
