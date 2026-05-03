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

function getWithNullValue(key: string): string {
  const value = localStorage.getItem(key);
  return value == null ? "null" : value;
}

function getJsonNullValue<T>(key: string, defaultValue: T = null): T {
  return JSON.parse(getWithNullValue(key)) || defaultValue;
}

function storeJson<T>(key:string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}


export default {
  COLOR_SCHEME: `${prefix}colorScheme`,
  getVersion: (): string | undefined => {
    return getWithNullValue(VERSION_KEY);
  },
  setVersion: (value: string): void => {
    localStorage.setItem(VERSION_KEY, value);
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
    localStorage.setItem(VISUALIZER_PANEL_SIZES_KEY, JSON.stringify(sizes));
  },
  getClosestImagesResultsCount: (): number => {
    return parseInt(localStorage.getItem(CLOSEST_IMAGES_RESULTS_COUNT) || "4");
  },
  setClosestImagesResultsCount: (value: number): void => {
    localStorage.setItem(CLOSEST_IMAGES_RESULTS_COUNT, value.toString());
  },
  getTextToImagesResultsCount: (): number => {
    return parseInt(localStorage.getItem(TEXT_TO_IMAGES_RESULTS_COUNT) || "4");
  },
  setTextToImagesResultsCount: (value: number) => {
    localStorage.setItem(TEXT_TO_IMAGES_RESULTS_COUNT, value.toString());
  },
  getLastFolderLocation: (folderType: FolderTypes) => {
    const location = localStorage.getItem(FOLDER_PICKER_LAST_LOCATION);
    if (location) {
      const jsonLocation = JSON.parse(location);
      return jsonLocation[folderType];
    }
    return "/Users";
  },
  setLastFolderLocation: (folderType: FolderTypes, lastLocation: string) => {
    const location = localStorage.getItem(FOLDER_PICKER_LAST_LOCATION) || "{}";
    const jsonLocation = JSON.parse(location);
    const updatedLocation = {
      ...jsonLocation,
      [folderType]: lastLocation,
    };
    localStorage.setItem(
      FOLDER_PICKER_LAST_LOCATION,
      JSON.stringify(updatedLocation),
    );
  },
  setExtensionIntentShowShouldConfirm: (value: boolean) => {
    localStorage.setItem(EXTENSION_INTENT_SHOW_SHOULD_CONFIRM_REDIRECTION, value.toString());
  },
  getExtensionIntentShowShouldConfirm: () => {
    return (
      localStorage.getItem(EXTENSION_INTENT_SHOW_SHOULD_CONFIRM_REDIRECTION) ===
      "true"
    );
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
  }
};
