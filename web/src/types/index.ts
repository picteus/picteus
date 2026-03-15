import {
  Extension,
  Image,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageSummary,
  SearchFilter,
  SearchSortingProperty,
  UserInterfaceAnchor
} from "@picteus/ws-client";
import { RJSFSchema } from "@rjsf/utils";
import { ReactElement, ReactNode } from "react";

export type SocketResponseType =
  | {
      channel: string;
      contextId: string;
      milliseconds: number;
      value: object;
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

type FrameContent = ({ url: string }) | ({ html: string });

export type DialogType = DialogContent & {
  type: "Error" | "Info" | "Question";
  frame?: { content: FrameContent; height: number };
  buttons: { yes: string; no?: string };
};

export type ShowType = {
  type: "ExtensionSettings" | "Image" | "Repository";
  id: string;
};

export type ImagesType = {
  description: string;
  title: string;
  images: Array<{ imageId: string }>;
};

export type ContextType = {
  imageIds?: string[];
};

export type UiCommandType = {
  context?: ContextType;
  id?: string;
  label?: string;
  parameters?: RJSFSchema;
  dialogContent?: DialogContent;
  withTags?: string[];
  ui?: {
    anchor: "modal" | "window";
    frameContent: FrameContent;
    dialogContent?: DialogContent;
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
  IMAGE_DELETED = "image.deleted",
}

export type AdditionalUi = {
  anchor: UserInterfaceAnchor;
  url: string;
  iconURL: string;
  title: string;
  extensionId: string;
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
  iconUrl?: string;
  fullScreen?: boolean;
  component: ReactElement | undefined;
  onBeforeClose?: () => void;
};
