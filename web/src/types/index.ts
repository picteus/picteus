import { ReactElement, ReactNode } from "react";
import { RJSFSchema } from "@rjsf/utils";

import {
  Extension,
  Image,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageSummary,
  ManifestInterfaceElementIntegration,
  SearchFilter,
  SearchSortingProperty
} from "@picteus/ws-client";

export type SocketResponseType =
  | {
      channel: string;
      contextId: string;
      milliseconds: number;
      value: Record<string, any>;
    }
  | undefined;

export interface CommandSocketResponseType {
  id: string;
  error?: string;
  value?: any;
}

export interface CommandParameters {
  [key: string]: any;
}

export interface CommandContextType {
  sendCommand: (command: string, parameters: CommandParameters) => Promise<any>;
  isAvailable: () => boolean;
  sendCommandOnConnected: (command: string, parameters: CommandParameters) => Promise<any>;
}

export type EventNotificationType = {
  title: string;
  type: "image" | "repository";
  timeInMilliseconds: number;
  description: string;
  iconUrl: string;
  seen: boolean;
};

export type EventInformationType = {
  id: string;
  channel: string;
  rawData: SocketResponseType;
  statusText: string;
  logLevel: string;
  date: string;
  notification?: EventNotificationType;
  onResult?: (result: any) => void;
};

export type ImageWithCaption = (Image | ImageSummary) & {
  caption?: ReactNode;
};

export type ImageMasonryDataType = {
  currentPage: number;
  total: number;
  images: Image[] | ImageSummary[] | ImageWithCaption[];
};

export enum FolderTypes {
  REPOSITORY = "repository",
  EXTENSION = "extension",
}

export enum ImageItemMode {
  PASSIVE = "PASSIVE",
  SELECT = "SELECT",
  VIEW = "VIEW",
}

export type DialogContent = {
  title: string;
  description: string;
  details?: string;
};

export type DialogIconContent = DialogContent & {
  icon?: ResourceType;
};

export type FrameContent = ({ url: string }) | ({ html: string });

type SizeType = "auto" | "xs" | "s" | "m" | "l" | "xl";

export type DialogIconSizeContent = DialogIconContent & {
  size?: SizeType;
};

export type DialogType = DialogIconSizeContent & {
  type: "error" | "info" | "question";
  frame?: { content: FrameContent; height: number };
  buttons: { yes: string; no?: string };
};

export type ShowType = {
  type: "sidebar" | "extensionSettings" | "image" | "repository";
  id: string;
};

export type ImagesType = {
  images: Array<{ imageId: string }>;
  dialogContent: DialogContent;
};

export type ContextType = {
  imageIds?: string[];
};

export type UiCommandType = {
  context?: ContextType;
  id?: string;
  label?: string;
  form?: { parameters: RJSFSchema, dialogContent?: DialogIconSizeContent };
  withTags?: string[];
  ui?: {
    id: string;
    integration: { anchor: "modal" } | { anchor: "sidebar", isExternal: boolean } | { anchor: "window" };
    frameContent: FrameContent;
    dialogContent?: DialogIconContent;
  };
  dialog?: DialogType;
  show?: ShowType;
  images?: ImagesType;
};

export type UiExtensionCommandType = {
  extension: Extension;
  command: UiCommandType;
};

type BaseTab = {
  id?: string;
  label: string;
  description?: string;
};

export type FilterOrCollectionId = { filter?: SearchFilter, collectionId?: number };

type ViewTab = BaseTab & {
  type: "View";
  data: {
    images?: never;
    filterOrCollectionId: FilterOrCollectionId;
  };
};

type MasonryTab = BaseTab & {
  type: "Masonry";
  data: {
    imageIds: Array<{ imageId: string }>;
    filterOrCollectionId?: never;
  };
};

export type TabsType = ViewTab | MasonryTab;
export enum ChannelEnum {
  EXTENSION_PREFIX = "extension",
  EXTENSION_PROCESS_PREFIX = "extension.process",
  EXTENSION_INSTALLED = "extension.installed",
  EXTENSION_UPDATED = "extension.updated",
  EXTENSION_PAUSED = "extension.paused",
  EXTENSION_RESUMED = "extension.resumed",
  EXTENSION_UNINSTALLED = "extension.uninstalled",
  EXTENSION_INTENT = "extension.intent",
  EXTENSION_ERROR = "extension.error",
  EXTENSION_LOG = "extension.log",
  EXTENSION_ACKNOWLEDGMENT = "extension.acknowledgment",

  REPOSITORY_PREFIX = "repository",
  REPOSITORY_CREATED = "repository.created",
  REPOSITORY_SYNCHRONIZE_STARTED = "repository.synchronize.started",
  REPOSITORY_SYNCHRONIZE_STOPPED = "repository.synchronize.stopped",
  REPOSITORY_WATCH_STARTED = "repository.watch.started",
  REPOSITORY_WATCH_STOPPED = "repository.watch.stopped",
  REPOSITORY_DELETED = "repository.deleted",

  IMAGE_PREFIX = "image",
  IMAGE_CREATED = "image.created",
  IMAGE_UPDATED = "image.updated",
  IMAGE_TAGS_UPDATED = "image.tagsUpdated",
  IMAGE_FEATURES_UPDATED = "image.featuresUpdated",
  IMAGE_DELETED = "image.deleted",
}


export type ResourceType = ({ url: string }) | ({ content: ArrayBuffer });

export function computeResourceTypeUrl(resourceType: ResourceType) {
  return "url" in resourceType ? resourceType.url : ("data:image/png;base64," + btoa(String.fromCharCode(...new Uint8Array(resourceType.content))));
}

export type AdditionalUi = {
  uuid: string,
  integration: ManifestInterfaceElementIntegration;
  content: FrameContent;
  icon: ResourceType;
  title: string;
  extensionId: string;
  automaticallyReopen: boolean;
};

export type LocalFiltersTypeFeature = { category: string, format: ImageFeatureFormat, type: ImageFeatureType, name?: string };

export type LocalFiltersType = {
  keyword?: string;
  searchIn?: string[];
  formats?: ImageFormat[];
  features?: LocalFiltersTypeFeature[];
  tags?: string[];
  repositories?: string[];
  sortBy?: SearchSortingProperty;
  sortOrder?: string;
};

export type ActionModalValue = {
  id?: string;
  title?: string;
  withCloseButton?: boolean;
  icon?: ResourceType;
  fullScreen?: boolean;
  size?: SizeType;
  component: ReactElement | undefined;
  onBeforeClose?: () => void;
};
