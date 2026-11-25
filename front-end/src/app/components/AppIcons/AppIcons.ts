import {
  IconActivity,
  IconBooks,
  IconBox,
  IconFolder,
  IconFolders,
  IconLibrary,
  IconPhoto,
  IconPhotoMinus,
  IconSettings,
  IconStack2
} from "@tabler/icons-react";


export const EntityIcons = {
  image: IconPhoto,
  repository: IconFolder,
  repositories: IconFolders,
  collection: IconLibrary,
  collections: IconBooks,
  extension: IconBox,
  extensions: IconBox,
  desk: IconStack2,
  activity: IconActivity,
  settings: IconSettings
} as const;

export const ScreenIcons = {
  explorer: IconPhotoMinus,
  desk: IconStack2,
  repositories: IconFolders,
  collections: IconBooks,
  extensions: IconBox,
  activity: IconActivity,
  settings: IconSettings
} as const;

export type EntityIconKeyType = keyof typeof EntityIcons;
export type ScreenIconKeyType = keyof typeof ScreenIcons;
