import i18n from "../i18n/i18n.ts";


export function removeFilePrefixFromUrl(url: string)
{
  if (url)
  {
    return url.replace(/^file:\/\//, "");
  }
}

export function capitalizeText(text: string)
{
  if (!text)
  {
    return "";
  }
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function timeAgoFromMilliseconds(dateInMilliseconds: number, nowInMilliseconds: number = Date.now())
{
  const diffInMs = nowInMilliseconds - dateInMilliseconds;
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInSeconds < 60)
  {
    return i18n.t("utils.timeAgo.second", { count: diffInSeconds });
  }
  else if (diffInMinutes < 60)
  {
    return i18n.t("utils.timeAgo.minute", { count: diffInMinutes });
  }
  else if (diffInHours < 12)
  {
    return i18n.t("utils.timeAgo.hour", { count: diffInHours });
  }
  else
  {
    return i18n.t("utils.timeAgo.fullDate", { date: new Date(dateInMilliseconds).toLocaleString() });
  }
}

export function generateRandomId()
{
  return Math.random().toString(36).substring(2);
}

function detectPlatformFromPath(filePath: string): "windows" | "unix"
{
  if (filePath.includes("\\"))
  {
    if (/^[a-zA-Z]:\\/.test(filePath) || filePath.startsWith("\\\\"))
    {
      return "windows";
    }
  }
  return "unix";
}

export function computePathSeparator(nodePath: string): string
{
  return detectPlatformFromPath(nodePath) === "windows" ? "\\" : "/";
}

export function computeFilePath(directoryPath: string, fileName: string): string
{
  const separator = computePathSeparator(directoryPath);
  return `${directoryPath}${separator}${fileName}`;
}

export function shortenPath(filePath: string, homeDirectory?: string): string
{
  const rawPath = removeFilePrefixFromUrl(filePath) ?? filePath;
  const homePath = homeDirectory === undefined ? undefined : (removeFilePrefixFromUrl(homeDirectory) ?? homeDirectory);
  let path = rawPath;
  if (homePath !== undefined && homePath !== "" && path.startsWith(homePath))
  {
    path = `~${path.slice(homePath.length)}`;
  }
  const separator = computePathSeparator(path);
  const segments = path.split(separator).filter((segment) => segment !== "");
  const isAbsolute = path.startsWith(separator);
  const hasHomePrefix = segments[0] === "~";
  const leadingSeparator = isAbsolute ? separator : "";
  const headSegment = hasHomePrefix ? "~" : (isAbsolute ? "" : segments[0]);
  const headWithSeparator = `${leadingSeparator}${headSegment}${headSegment === "" ? "" : separator}`;
  const contentSegments = segments.slice(1);
  if (contentSegments.length === 0)
  {
    return `${leadingSeparator}${headSegment}`;
  }
  if (contentSegments.length <= 2)
  {
    return `${headWithSeparator}${contentSegments.join(separator)}`;
  }
  const tailSegments = contentSegments.slice(-2);
  return `${headWithSeparator}…${separator}${tailSegments.join(separator)}`;
}
