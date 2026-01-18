import { FolderTypes, LocalFiltersType, TabsType } from "types";
import { VISUALIZER_DEFAULT_PANEL_SIZES } from "utils";

const prefix = "picteus_";
const SEARCH_FILTERS_KEY: string = prefix + "searchFilters";
const ACTIVITY_FILTERS_KEY: string = prefix + "activityFilters";
const VISUALIZER_PANEL_SIZES_KEY: string = prefix + "visualizerPanelSizes";
const CLOSEST_IMAGES_RESULTS_COUNT: string =
  prefix + "closestImagesResultsCount";
const TEXT_TO_IMAGES_RESULTS_COUNT: string =
  prefix + "textToImagesResultsCount";
const FOLDER_PICKER_LAST_LOCATION = prefix + "extensionPickerLastLocation";
export const COLOR_SCHEME = prefix + "colorScheme";

export const EXTENSION_INTENT_SHOW_SHOULD_CONFIRM_REDIRECTION =
  prefix + "extensionIntentShowShouldConfirmRedirection";

export default {
  setActivityFilters: (
    filters: Array<{
      field: string;
      value: string;
    }>,
  ) => localStorage.setItem(ACTIVITY_FILTERS_KEY, JSON.stringify(filters)),
  getActivityFilters: (): Array<{
    field: string;
    value: string;
  }> => JSON.parse(localStorage.getItem(ACTIVITY_FILTERS_KEY) || "null"),
  setSearchFilters: (filters: LocalFiltersType) =>
    localStorage.setItem(SEARCH_FILTERS_KEY, JSON.stringify(filters)),
  getSearchFilters: (): LocalFiltersType | null => {
    const filters = JSON.parse(
      localStorage.getItem(SEARCH_FILTERS_KEY) || "null",
    );
    if (filters?.criteria) {
      return null;
    }
    return filters;
  },

  getVisualizerPanelSizes: (): number[] =>
    JSON.parse(localStorage.getItem(VISUALIZER_PANEL_SIZES_KEY) || "null") ||
    VISUALIZER_DEFAULT_PANEL_SIZES,
  setVisualizerPanelSizes: (sizes: number[]) => {
    localStorage.setItem(VISUALIZER_PANEL_SIZES_KEY, JSON.stringify(sizes));
  },
  getClosestImagesResultsCount: (): number => {
    return parseInt(localStorage.getItem(CLOSEST_IMAGES_RESULTS_COUNT) || "4");
  },
  setClosestImagesResultsCount: (value: number) => {
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
  setGalleryTabs(tabs: TabsType[]) {
    localStorage.setItem("tabs", JSON.stringify(tabs));
  },
  getGalleryTabs(): TabsType[] {
    const tabs = localStorage.getItem("tabs");
    if (tabs) {
      return JSON.parse(tabs);
    }
    return [];
  },
};
