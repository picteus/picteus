import { FolderTypes, TabsType, ViewTabDataType } from "types";
import { VISUALIZER_DEFAULT_PANEL_SIZES } from "utils";
import { SearchFilter } from "@picteus/ws-client";


const prefix = "picteus_";
const VERSION_KEY = prefix + "version";
const MAIN_TAB_KEY = prefix + "mainTab";
const TABS_KEY = prefix + "tabs";
const ACTIVITY_FILTERS_KEY: string = prefix + "activityFilters";
const VISUALIZER_PANEL_SIZES_KEY: string = prefix + "visualizerPanelSizes";
const CLOSEST_IMAGES_RESULTS_COUNT: string =
  prefix + "closestImagesResultsCount";
const TEXT_TO_IMAGES_RESULTS_COUNT: string =
  prefix + "textToImagesResultsCount";
const FOLDER_PICKER_LAST_LOCATION = prefix + "extensionPickerLastLocation";

export const EXTENSION_INTENT_SHOW_SHOULD_CONFIRM_REDIRECTION =
  prefix + "extensionIntentShowShouldConfirmRedirection";

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
  COLOR_SCHEME: prefix + "colorScheme",
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
  setExtensionIntentShowShouldConfirm: (shouldConfirm: boolean) => {
    localStorage.setItem(
      EXTENSION_INTENT_SHOW_SHOULD_CONFIRM_REDIRECTION,
      shouldConfirm.toString(),
    );
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
      filterOrCollectionId: { filter: defaultFilter }
    });
  },
  setMainViewTabData(data: ViewTabDataType): void {
    storeJson(MAIN_TAB_KEY, data);
  },
  getGalleryTabs(): TabsType[] {
    return getJsonNullValue<TabsType[]>(TABS_KEY, []);
  },
  setGalleryTabs(tabs: TabsType[]): void {
    storeJson(TABS_KEY, tabs);
  },
};
