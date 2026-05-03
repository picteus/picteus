import i18n from "../i18n/i18n.ts";


export function removeFilePrefixFromUrl(url: string) {
  if (url) {
    return url.replace(/^file:\/\//, "");
  }
}

export function capitalizeText(text: string) {
  if (!text) {
    return "";
  }
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function timeAgoFromMilliseconds(dateInMilliseconds: number, nowInMilliseconds: number = Date.now()) {
  const diffInMs = nowInMilliseconds - dateInMilliseconds;
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInSeconds < 60) {
    return i18n.t("utils.timeAgo.second", { count: diffInSeconds });
  } else if (diffInMinutes < 60) {
    return i18n.t("utils.timeAgo.minute", { count: diffInMinutes });
  } else if (diffInHours < 12) {
    return i18n.t("utils.timeAgo.hour", { count: diffInHours });
  } else {
    return i18n.t("utils.timeAgo.fullDate", { date: new Date(dateInMilliseconds).toLocaleString() });
  }
}

export function generateRandomId() {
  return Math.random().toString(36).substring(2);
}

export function hexToRgb(hex) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

export function detectPlatformFromPath(filePath: string): "windows" | "unix" {
  if (filePath.includes("\\")) {
    if (/^[a-zA-Z]:\\/.test(filePath) || filePath.startsWith("\\\\")) {
      return "windows";
    }
  }
  return "unix";
}

export function recursivelyIncludes(value: unknown, search: string): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase().includes(search);
  }

  if (Array.isArray(value)) {
    return value.some((item) => recursivelyIncludes(item, search));
  }

  if (typeof value === "object") {
    return Object.values(value).some((val) => recursivelyIncludes(val, search));
  }

  return false;
}
