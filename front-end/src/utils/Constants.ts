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

export const APPLICATION_MANUAL_URL = "https://picteus.github.io/picteus";

export const EXTENSIONS_MANUAL_URL = `${APPLICATION_MANUAL_URL}/docs/extensions`;

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
