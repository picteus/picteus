import { SearchFilter } from "@picteus/ws-client";

import { FolderTypes, TabsType, ViewTabDataType } from "types";


export const prefix = "picteus_";

export const StorageKeys =
  {
    ACTIVITY_LOGS_BATCH_SIZE: "activityLogsBatchSize",
    AUTO_RELOAD_IMAGES_VIEWS: "autoReloadImagesViews",
    CLOSEST_IMAGES_EMBEDDING_NAME: "closestImagesEmbeddingName",
    CLOSEST_IMAGES_RESULTS_COUNT: "closestImagesResultsCount",
    COLOR_SCHEME: "colorScheme",
    EXTENSION_INTENT_SHOW_SHOULD_CONFIRM_REDIRECTION: "extensionIntentShowShouldConfirmRedirection",
    FOLDER_PICKER_LAST_LOCATION: "extensionPickerLastLocation",
    IMAGE_DETAIL_HIDDEN_SECTIONS: "imageDetailHiddenSections",
    IMAGE_DETAIL_SECTIONS_ORDER: "imageDetailSectionsOrder",
    IMAGE_DETAIL_TRAITS: "imageDetailTraits",
    MAIN_TAB: "mainTab",
    RUN_CAPABILITIES_EXCLUDED_EXTENSION_IDS: "runCapabilitiesExcludedExtensionIds",
    SELECTED_IMAGE_IDS: "selectedImagesIds",
    SELECTED_IMAGES_ACTION: "selectedImagesAction",
    TABS: "tabs",
    TEXT_TO_IMAGES_RESULTS_COUNT: "textToImagesResultsCount",
    VERSION: "version",
    VISUALIZER_PANEL_SIZES: "visualizerPanelSizes"
  } as const;

function get(key: string, defaultValue?: string): string | undefined
{
  const value = localStorage.getItem(`${prefix}${key}`);
  return value === null ? defaultValue : value;
}

function set(key: string, value: string): void
{
  localStorage.setItem(`${prefix}${key}`, value);
}

function remove(key: string): void
{
  localStorage.removeItem(`${prefix}${key}`);
}

function getNumber(key: string, defaultValue: number): number
{
  const value = get(key);
  if (value === undefined)
  {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function setNumber(key: string, value: number): void
{
  set(key, value.toString());
}

function getBoolean(key: string, isDefaultTrue: boolean = true): boolean
{
  const value = get(key);
  if (value === undefined)
  {
    return isDefaultTrue;
  }

  return value !== "false";
}

function setBoolean(key: string, isEnabled: boolean): void
{
  set(key, isEnabled.toString());
}

function getJson<ValueType>(key: string, defaultValue?: ValueType): ValueType
{
  const value = get(key);
  if (value === undefined || value === null)
  {
    return defaultValue;
  }

  try
  {
    const parsed = JSON.parse(value);
    return parsed === null ? defaultValue : (parsed as ValueType);
  }
  catch (error)
  {
    return defaultValue;
  }
}

function setJson<ValueType>(key: string, value: ValueType): void
{
  set(key, JSON.stringify(value));
}

function getVersion(): string | undefined
{
  return get(StorageKeys.VERSION);
}

function setVersion(value: string): void
{
  set(StorageKeys.VERSION, value);
}

function getActivityLogsBatchSize(): number
{
  return getNumber(StorageKeys.ACTIVITY_LOGS_BATCH_SIZE, 20);
}

function setActivityLogsBatchSize(batchSize: number): void
{
  setNumber(StorageKeys.ACTIVITY_LOGS_BATCH_SIZE, batchSize);
}

function getVisualizerPanelSizes(): number[]
{
  return getJson<number[]>(StorageKeys.VISUALIZER_PANEL_SIZES, [ 60, 30 ]) || [ 60, 30 ];
}

function setVisualizerPanelSizes(panelSizes: number[]): void
{
  setJson(StorageKeys.VISUALIZER_PANEL_SIZES, panelSizes);
}

function getClosestImagesResultsCount(): number
{
  return getNumber(StorageKeys.CLOSEST_IMAGES_RESULTS_COUNT, 4);
}

function setClosestImagesResultsCount(count: number): void
{
  setNumber(StorageKeys.CLOSEST_IMAGES_RESULTS_COUNT, count);
}

function getClosestImagesEmbeddingName(): string | undefined
{
  return get(StorageKeys.CLOSEST_IMAGES_EMBEDDING_NAME);
}

function setClosestImagesEmbeddingName(embeddingName: string): void
{
  set(StorageKeys.CLOSEST_IMAGES_EMBEDDING_NAME, embeddingName);
}

function getTextToImagesResultsCount(): number
{
  return getNumber(StorageKeys.TEXT_TO_IMAGES_RESULTS_COUNT, 4);
}

function setTextToImagesResultsCount(count: number): void
{
  setNumber(StorageKeys.TEXT_TO_IMAGES_RESULTS_COUNT, count);
}

function getLastFolderLocation(folderType: FolderTypes): string
{
  const location = getJson<Record<string, string>>(StorageKeys.FOLDER_PICKER_LAST_LOCATION, {});
  return location?.[folderType] || "/Users";
}

function setLastFolderLocation(folderType: FolderTypes, lastLocation: string): void
{
  const location = getJson<Record<string, string>>(StorageKeys.FOLDER_PICKER_LAST_LOCATION, {});
  const updatedLocation =
    {
      ...location,
      [folderType]: lastLocation
    };
  setJson(StorageKeys.FOLDER_PICKER_LAST_LOCATION, updatedLocation);
}

function getAutoReloadImagesViews(): boolean
{
  return getBoolean(StorageKeys.AUTO_RELOAD_IMAGES_VIEWS, true);
}

function setAutoReloadImagesViews(shouldAutoReload: boolean): void
{
  setBoolean(StorageKeys.AUTO_RELOAD_IMAGES_VIEWS, shouldAutoReload);
}

function getExtensionIntentShowShouldConfirm(): boolean
{
  return getBoolean(StorageKeys.EXTENSION_INTENT_SHOW_SHOULD_CONFIRM_REDIRECTION, true);
}

function setExtensionIntentShowShouldConfirm(shouldConfirm: boolean): void
{
  setBoolean(StorageKeys.EXTENSION_INTENT_SHOW_SHOULD_CONFIRM_REDIRECTION, shouldConfirm);
}

function getMainViewTabData(defaultFilter: SearchFilter): ViewTabDataType
{
  return getJson<ViewTabDataType>(
    StorageKeys.MAIN_TAB,
    {
      mode: "masonry",
      pinnable: true,
      filterOrCollectionId: { filter: defaultFilter }
    }
  );
}

function setMainViewTabData(viewTabData: ViewTabDataType): void
{
  setJson(StorageKeys.MAIN_TAB, viewTabData);
}

function getGalleryTabs(): TabsType[]
{
  return getJson<TabsType[]>(StorageKeys.TABS, []);
}

function setGalleryTabs(tabs: TabsType[]): void
{
  setJson(StorageKeys.TABS, tabs);
}

function getImageDetailTraits(defaultValue: string[]): string[]
{
  return getJson<string[]>(StorageKeys.IMAGE_DETAIL_TRAITS, defaultValue);
}

function setImageDetailTraits(traits: string[]): void
{
  setJson(StorageKeys.IMAGE_DETAIL_TRAITS, traits);
}

function getImageDetailHiddenSections(defaultValue: string[]): string[]
{
  return getJson<string[]>(StorageKeys.IMAGE_DETAIL_HIDDEN_SECTIONS, defaultValue);
}

function setImageDetailHiddenSections(hiddenSections: string[]): void
{
  setJson(StorageKeys.IMAGE_DETAIL_HIDDEN_SECTIONS, hiddenSections);
}

function getImageDetailSectionsOrder(defaultValue: string[]): string[]
{
  return getJson<string[]>(StorageKeys.IMAGE_DETAIL_SECTIONS_ORDER, defaultValue);
}

function setImageDetailSectionsOrder(sectionsOrder: string[]): void
{
  setJson(StorageKeys.IMAGE_DETAIL_SECTIONS_ORDER, sectionsOrder);
}

function getRunCapabilitiesExcludedExtensionIds(): string[]
{
  return getJson<string[]>(StorageKeys.RUN_CAPABILITIES_EXCLUDED_EXTENSION_IDS, []);
}

function setRunCapabilitiesExcludedExtensionIds(extensionIds: string[]): void
{
  setJson(StorageKeys.RUN_CAPABILITIES_EXCLUDED_EXTENSION_IDS, extensionIds);
}

function getSelectedImagesIds(): string[]
{
  return getJson<string[]>(StorageKeys.SELECTED_IMAGE_IDS, []);
}

function setSelectedImageIds(imageIds: string[]): void
{
  setJson(StorageKeys.SELECTED_IMAGE_IDS, imageIds);
}

function getSelectedImagesAction(): string | undefined
{
  return get(StorageKeys.SELECTED_IMAGES_ACTION);
}

function setSelectedImagesAction(action: string): void
{
  set(StorageKeys.SELECTED_IMAGES_ACTION, action);
}

export default {
  COLOR_SCHEME: `${prefix}${StorageKeys.COLOR_SCHEME}`,
  getVersion,
  setVersion,
  getActivityLogsBatchSize,
  setActivityLogsBatchSize,
  getVisualizerPanelSizes,
  setVisualizerPanelSizes,
  getClosestImagesResultsCount,
  setClosestImagesResultsCount,
  getClosestImagesEmbeddingName,
  setClosestImagesEmbeddingName,
  getTextToImagesResultsCount,
  setTextToImagesResultsCount,
  getLastFolderLocation,
  setLastFolderLocation,
  getAutoReloadImagesViews,
  setAutoReloadImagesViews,
  getExtensionIntentShowShouldConfirm,
  setExtensionIntentShowShouldConfirm,
  getMainViewTabData,
  setMainViewTabData,
  getGalleryTabs,
  setGalleryTabs,
  getImageDetailTraits,
  setImageDetailTraits,
  getImageDetailHiddenSections,
  setImageDetailHiddenSections,
  getImageDetailSectionsOrder,
  setImageDetailSectionsOrder,
  getRunCapabilitiesExcludedExtensionIds,
  setRunCapabilitiesExcludedExtensionIds,
  getSelectedImagesIds,
  setSelectedImageIds,
  getSelectedImagesAction,
  setSelectedImagesAction
};
