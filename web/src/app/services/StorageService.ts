import { SearchFilter } from "@picteus/ws-client";

import { FolderTypes, TabsType, ViewTabDataType } from "types";
import { VISUALIZER_DEFAULT_PANEL_SIZES } from "utils";


const prefix = "picteus_";
const VERSION_KEY = `${prefix}version`;
const MAIN_TAB_KEY = `${prefix}mainTab`;
const TABS_KEY = `${prefix}tabs`;
const ACTIVITY_FILTERS_KEY = `${prefix}activityFilters`;
const VISUALIZER_PANEL_SIZES_KEY = `${prefix}visualizerPanelSizes`;
const CLOSEST_IMAGES_RESULTS_COUNT = `${prefix}closestImagesResultsCount`;
const TEXT_TO_IMAGES_RESULTS_COUNT = `${prefix}textToImagesResultsCount`;
const FOLDER_PICKER_LAST_LOCATION = `${prefix}extensionPickerLastLocation`;
const EXTENSION_INTENT_SHOW_SHOULD_CONFIRM_REDIRECTION = `${prefix}extensionIntentShowShouldConfirmRedirection`;
const IMAGE_DETAIL_TRAITS = `${prefix}imageDetailTraits`;
const SELECTED_IMAGES_AFFIX_ACTION = `${prefix}selectedImagesAffixAction`;

function get(key: string, defaultValue: string = undefined): string {
  const value = localStorage.getItem(key);
  return value === null ? defaultValue : value;
}

function set(key: string, value: string): void {
  localStorage.setItem(key, value);
}

function getWithNullValue(key: string): string {
  return get(key, "null");
}

function getJsonNullValue<T>(key: string, defaultValue: T = null): T {
  return JSON.parse(getWithNullValue(key)) || defaultValue;
}

function storeJson<T>(key:string, value: T) {
  set(key, JSON.stringify(value));
}


export default {
  COLOR_SCHEME: `${prefix}colorScheme`,
  getVersion: (): string | undefined => {
    return getWithNullValue(VERSION_KEY);
  },
  setVersion: (value: string): void => {
    set(VERSION_KEY, value);
  },
  setActivityFilters: (
    filters: Array<{
      field: string;
      value: string;
    }>
  ): void => storeJson(ACTIVITY_FILTERS_KEY, filters),
  getActivityFilters: (): Array<{
    field: string;
    value: string;
  }> => getJsonNullValue(getWithNullValue(ACTIVITY_FILTERS_KEY)),
  getVisualizerPanelSizes: (): number[] =>
    getJsonNullValue<number[]>(VISUALIZER_PANEL_SIZES_KEY) ||
    VISUALIZER_DEFAULT_PANEL_SIZES,
  setVisualizerPanelSizes: (sizes: number[]): void => {
    storeJson(VISUALIZER_PANEL_SIZES_KEY, sizes)
  },
  getClosestImagesResultsCount: (): number => {
    return parseInt(get(CLOSEST_IMAGES_RESULTS_COUNT, "4"));
  },
  setClosestImagesResultsCount: (value: number): void => {
    set(CLOSEST_IMAGES_RESULTS_COUNT, value.toString())
  },
  getTextToImagesResultsCount: (): number => {
    return parseInt(get(TEXT_TO_IMAGES_RESULTS_COUNT, "4"));
  },
  setTextToImagesResultsCount: (value: number) => {
    set(TEXT_TO_IMAGES_RESULTS_COUNT, value.toString())
  },
  getLastFolderLocation: (folderType: FolderTypes) => {
    const location = getJsonNullValue<object>(FOLDER_PICKER_LAST_LOCATION)
    if (location) {
      return location[folderType];
    }
    return "/Users";
  },
  setLastFolderLocation: (folderType: FolderTypes, lastLocation: string) => {
    const jsonLocation = JSON.parse(get(FOLDER_PICKER_LAST_LOCATION, "{}"));
    const updatedLocation = {
      ...jsonLocation,
      [folderType]: lastLocation,
    };
    storeJson(FOLDER_PICKER_LAST_LOCATION, updatedLocation);
  },
  setExtensionIntentShowShouldConfirm: (value: boolean) => {
    set(EXTENSION_INTENT_SHOW_SHOULD_CONFIRM_REDIRECTION, value.toString());
  },
  getExtensionIntentShowShouldConfirm: () => {
    return get(EXTENSION_INTENT_SHOW_SHOULD_CONFIRM_REDIRECTION) === "true";
  },
  getMainViewTabData(defaultFilter: SearchFilter): ViewTabDataType {
    return getJsonNullValue<ViewTabDataType>(MAIN_TAB_KEY, {
      mode: "masonry",
      pinnable: true,
      filterOrCollectionId: { filter: defaultFilter }
    });
  },
  setMainViewTabData(value: ViewTabDataType): void {
    storeJson(MAIN_TAB_KEY, value);
  },
  getGalleryTabs(): TabsType[] {
    return getJsonNullValue<TabsType[]>(TABS_KEY, []);
  },
  setGalleryTabs(value: TabsType[]): void {
    storeJson(TABS_KEY, value);
  },
  getImageDetailTraits(defaultValue: string []): string[] {
    return getJsonNullValue<string[]>(IMAGE_DETAIL_TRAITS, defaultValue);
  },
  setImageDetailTraits(value: string[]): void {
    storeJson(IMAGE_DETAIL_TRAITS, value);
  },
  getSelectedImagesAffixAction(): string | undefined {
    return get(SELECTED_IMAGES_AFFIX_ACTION);
  },
  setSelectedImagesAffixAction(action: string): void {
    set(SELECTED_IMAGES_AFFIX_ACTION, action);
  }
};
