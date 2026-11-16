const urlSearchParams = new URLSearchParams(window.location.search);
export const BASE_PATH = urlSearchParams.get("webServicesBaseUrl") || "https://localhost:3001";
export const API_KEY = urlSearchParams.get("apiKey") || "";

export const ROUTES = {
  home: "/",
  desk: "/desk",
  collections: "/collections",
  repositories: "/repositories",
  repository: "/repository/:id",
  extensions: "/extensions",
  activity: "/activity",
  settings: "/settings",
  test: "/test"
};

export const DESK_TAB_QUERY_PARAMETER_NAME = "tabId";

export const REPOSITORIES_ONBOARDING_VIDEO_URL = "https://youtu.be/_wuDYBDr3Zs";

// "Open in new window" is implemented but hidden: set to true to show the menu entry and drawer button again
export const REPOSITORY_OPEN_IN_NEW_WINDOW_ENABLED = false;

export const APPLICATION_MANUAL_URL = "https://picteus.github.io/picteus";

export function computeExtensionSidebarUuid(extensionId: string, id: string): string
{
  return `${extensionId}-${id}`;
}

export function computeExtensionSidebarRoute(uuid: string): string
{
  return `/extension/${uuid}`;
}

export function computeMainRoute(): string
{
  return `${window.location.href.split("#")[0]}#`;
}

export function computeDeskRoute(tabId: string): string
{
  return `${ROUTES.desk}?${DESK_TAB_QUERY_PARAMETER_NAME}=${encodeURIComponent(tabId)}`;
}

export function computeRepositoryRoute(repositoryId: string): string
{
  return ROUTES.repository.replace(":id", encodeURIComponent(repositoryId));
}
