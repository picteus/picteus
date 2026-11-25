import { type Icon } from "@tabler/icons-react";

import { ROUTES } from "utils";
import { ScreenIcons } from "../AppIcons/AppIcons.ts";


export type AppScreenIdType =
  | "explorer"
  | "desk"
  | "repositories"
  | "collections"
  | "extensions"
  | "activity"
  | "settings";

export interface AppScreenDescriptorType
{
  readonly id: AppScreenIdType;
  readonly route: string;
  readonly titleKey: string;
  readonly icon: Icon;
}

export const APP_SCREENS: Record<AppScreenIdType, AppScreenDescriptorType> = {
  explorer: {
    id: "explorer",
    route: ROUTES.home,
    titleKey: "menu.explorer",
    icon: ScreenIcons.explorer
  },
  desk: {
    id: "desk",
    route: ROUTES.desk,
    titleKey: "menu.desk",
    icon: ScreenIcons.desk
  },
  repositories: {
    id: "repositories",
    route: ROUTES.repositories,
    titleKey: "menu.repositories",
    icon: ScreenIcons.repositories
  },
  collections: {
    id: "collections",
    route: ROUTES.collections,
    titleKey: "menu.collections",
    icon: ScreenIcons.collections
  },
  extensions: {
    id: "extensions",
    route: ROUTES.extensions,
    titleKey: "menu.extensions",
    icon: ScreenIcons.extensions
  },
  activity: {
    id: "activity",
    route: ROUTES.activity,
    titleKey: "menu.activity",
    icon: ScreenIcons.activity
  },
  settings: {
    id: "settings",
    route: ROUTES.settings,
    titleKey: "menu.settings",
    icon: ScreenIcons.settings
  }
} as const;

export const PRIMARY_SIDEBAR_SCREENS: readonly AppScreenDescriptorType[] = [
  APP_SCREENS.explorer,
  APP_SCREENS.desk,
  APP_SCREENS.repositories,
  APP_SCREENS.collections,
  APP_SCREENS.extensions
];

export const ALL_APP_SCREENS: readonly AppScreenDescriptorType[] = [
  ...PRIMARY_SIDEBAR_SCREENS,
  APP_SCREENS.activity,
  APP_SCREENS.settings
];
