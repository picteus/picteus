import { ReactElement, ReactNode } from "react";
import { RJSFSchema } from "@rjsf/utils";

import {
  FrontIntent,
  IntentContext,
  IntentDescriptionDetails,
  IntentDialog,
  IntentDialogIconSizeContent,
  IntentImages,
  IntentInlineContent,
  IntentResourceContent,
  IntentResourceUrl,
  IntentShow,
  IntentTitleSubtitleDescriptionDetailsIcon,
  IntentUi,
  IntentUrlContent,
  OpenBrowserIntent,
  ProcessCommandIntent,
  ShowIntent,
  UiIntent
} from "@picteus/shared-core";
import { detectImageMimeType } from "@picteus/shared-front-end";
import {
  Extension,
  Image,
  ImageFormat,
  ImageSummary,
  ManifestInterfaceElementIntegration,
  SearchFeatures,
  SearchFilter,
  SearchProperties,
  SearchSortingProperty
} from "@picteus/ws-client";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonType = Record<string, any>;

type WithIdAndMilliseconds = {
  id: string;
  milliseconds: number;
};

type SocketEventAdditionalMessage = { contextId: string; isActivity?: boolean };
export type SocketEventType = WithIdAndMilliseconds & SocketEventAdditionalMessage & {
  channel: string;
  value: JsonType;
};

export interface CommandSocketEventType
{
  id: string;

  error?: string;

  value?: JsonType;
}

export type CommandParameters = JsonType;

export type SendCommandType = (command: string, parameters: CommandParameters) => Promise<string>;

export interface CommandContextType
{
  sendCommand: SendCommandType;

  isAvailable: () => boolean;

  sendCommandOnConnected: SendCommandType;
}

export type ImageNotificationDataType = {
  readonly id: string;
};

export type TabNotificationDataType = {
  readonly id: string;
};

export type ActionNotificationIntentType =
  | ShowIntent
  | UiIntent
  | OpenBrowserIntent
  | ProcessCommandIntent;

export type ActionNotificationDataType = {
  readonly extensionId: string;
  readonly intent: ActionNotificationIntentType;
};

export type NotificationNotificationDataType = Record<string, never>;

type BaseNotificationType<Type extends string, Data> = WithIdAndMilliseconds & {
  readonly type: Type;
  readonly title: string;
  readonly subtitle: string;
  readonly body?: string;
  readonly extensionId?: string;
  readonly data: Data;
  readonly illustrationUri?: string;
  readonly actionLabel?: string;
};

export type ImageNotificationType = BaseNotificationType<"image", ImageNotificationDataType>;
export type TabNotificationType = BaseNotificationType<"tab", TabNotificationDataType>;
export type ActionNotificationType = BaseNotificationType<"action", ActionNotificationDataType>;
export type NotificationNotificationType = BaseNotificationType<"notification", NotificationNotificationDataType>;

export type NotificationType =
  | ImageNotificationType
  | TabNotificationType
  | ActionNotificationType
  | NotificationNotificationType;

export type LogEntityType = {
  type: "image" | "repository" | "collection";
  id: string | number;
};

export type LogType = WithIdAndMilliseconds & {
  type: "image" | "repository" | "collection" | "extension" | "unknown";
  text: string;
  level: string;
  entityId?: string | number;
  extensionId?: string;
  entity?: LogEntityType;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventOnResultValueType = any;

export type EventOnResultType = (result?: EventOnResultValueType) => void;

export type EventInformationType = SocketEventType & {
  onResult?: EventOnResultType;
};

export type ImageOrSummary = Image | ImageSummary;

export type ImageWithCaption = ImageOrSummary & {
  caption?: ReactNode;
};

export type ImageOrSummaryOrCaption = ImageOrSummary | ImageWithCaption;

export type ImageExplorerDataType = {
  total: number;
  images: ImageOrSummaryOrCaption[];
};

export enum FolderTypes
{
  REPOSITORY = "repository",
  EXTENSION = "extension",
}

export enum ImageItemMode
{
  PASSIVE = "PASSIVE",
  SELECT = "SELECT",
  VIEW = "VIEW",
}

export interface WithNavigationType
{
  hasPrevious: boolean;

  hasNext: boolean;

  onPrevious: () => void;

  onNext: () => void;
}

export type SizeType = IntentDialogIconSizeContent["size"];

export type IconSizeType = "xs" | "sm" | "md" | "lg" | "xl";

export type UiCommandType = {
  context?: IntentContext;
  id?: string;
  label?: string;
  iconUri?: string;
  form?: { parameters: RJSFSchema, dialogContent?: IntentDialogIconSizeContent };
  withTags?: string[];
  ui?: IntentUi;
  openBrowser?: {
    url: string
  }
  dialog?: IntentDialog;
  show?: IntentShow;
  images?: IntentImages;
};

export type UiExtensionCommandType = {
  extension: Extension;
  command: UiCommandType;
};

export type CommandKindType = "core" | "extension";

export type ExtensionCommandIdType = {
  extensionId: string;
  commandId: string;
};

export type CoreImageCommandIdType = "synchronize" | "pin" | "delete" | "closestImages" | "open" | "download";

export type ImageCommandIdType = CoreImageCommandIdType | ExtensionCommandIdType;

export type ImageCommandType = {
  id: string;
  kind: CommandKindType;
  commandId: string;
  extensionId?: string;
  label: string;
  subLabel?: string;
  icon: (size?: IconSizeType) => ReactElement;
  execute: () => Promise<void> | void;
  isAvailable: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  rawExtensionCommand?: UiExtensionCommandType;
};

export type CoreProcessCommandIdType = "textToImages";

export type ProcessCommandIdType = CoreProcessCommandIdType | ExtensionCommandIdType;

export type ProcessCommandShortcutType = {
  combo: string;
  label?: ReactNode;
};

export type ProcessCommandType = {
  id: string;
  kind: CommandKindType;
  commandId: string;
  extensionId?: string;
  label: string;
  subLabel?: string;
  shortcut?: ProcessCommandShortcutType;
  icon: (size?: IconSizeType) => ReactElement;
  execute: () => Promise<void> | void;
  isAvailable: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  rawExtensionCommand?: UiExtensionCommandType;
};

export type ExtensionIntentType = {
  id: string;
  intent: FrontIntent;
};

export type FilterOrCollectionId = { filter: SearchFilter } | { collectionId: number };

export type ViewMode = "masonry" | "gallery" | "table";

export type ViewTabDataType = {
  mode: ViewMode;
  filterOrCollectionId: FilterOrCollectionId;
};

export type TabsType = {
  id?: string;
  extensionId?: string;
  content: IntentDescriptionDetails;
  data: ViewTabDataType;
};

export type DeskTabImageContentType = {
  kind: "image";
  imageId: string;
};

export type DeskTabImagesContentType = {
  kind: "images";
  images: Array<{ imageId: string }>;
};

export type DeskTabHtmlUrlContentType = {
  kind: "html";
  url: string;
};

export type DeskTabHtmlInlineContentType = {
  kind: "html";
  html: string;
};

export type DeskTabMarkdownUrlContentType = {
  kind: "markdown";
  url: string;
};

export type DeskTabMarkdownInlineContentType = {
  kind: "markdown";
  markdown: string;
};

export type DeskTabContentType =
  | DeskTabImageContentType
  | DeskTabImagesContentType
  | DeskTabHtmlUrlContentType
  | DeskTabHtmlInlineContentType
  | DeskTabMarkdownUrlContentType
  | DeskTabMarkdownInlineContentType;

export type DeskTabType = {
  id: string;
  timestampInMilliseconds: number;
  extensionId?: string;
  icon?: IntentResourceUrl | IntentResourceContent;
  label: string;
  header?: IntentTitleSubtitleDescriptionDetailsIcon;
  content: DeskTabContentType;
  isShiftable?: boolean;
  isClosable?: boolean;
};

export enum ChannelEnum
{
  EXTENSION_PREFIX = "extension",
  EXTENSION_INSTALLED = "extension.installed",
  EXTENSION_UPDATED = "extension.updated",
  EXTENSION_UNINSTALLED = "extension.uninstalled",
  EXTENSION_STATE_STARTED = "extension.state.started",
  EXTENSION_STATE_STOPPED = "extension.state.stopped",
  EXTENSION_PROCESS_STARTED = "extension.process.started",
  EXTENSION_PROCESS_STOPPED = "extension.process.stopped",
  EXTENSION_CONNECTION_STARTED = "extension.connection.started",
  EXTENSION_CONNECTION_STOPPED = "extension.connection.stopped",
  EXTENSION_INTENT = "extension.intent",
  EXTENSION_ERROR = "extension.error",
  EXTENSION_LOG = "extension.log",
  EXTENSION_ACKNOWLEDGMENT = "extension.acknowledgment",

  REPOSITORY_PREFIX = "repository",
  REPOSITORY_SYNCHRONIZE_PREFIX = "repository.synchronize",
  REPOSITORY_CREATED = "repository.created",
  REPOSITORY_UPDATED = "repository.updated",
  REPOSITORY_SYNCHRONIZE_STARTED = "repository.synchronize.started",
  REPOSITORY_SYNCHRONIZE_STOPPED = "repository.synchronize.stopped",
  REPOSITORY_WATCH_STARTED = "repository.watch.started",
  REPOSITORY_WATCH_STOPPED = "repository.watch.stopped",
  REPOSITORY_DELETED = "repository.deleted",

  COLLECTION_PREFIX = "collection",
  COLLECTION_CREATED = "collection.created",
  COLLECTION_UPDATED = "collection.updated",
  COLLECTION_DELETED = "collection.deleted",

  IMAGE_PREFIX = "image",
  IMAGE_CREATED = "image.created",
  IMAGE_UPDATED = "image.updated",
  IMAGE_TAGS_UPDATED = "image.tags.updated",
  IMAGE_FEATURES_UPDATED = "image.features.updated",
  IMAGE_DELETED = "image.deleted",
}


export type ResourceType = IntentResourceUrl | IntentResourceContent;

export function computeResourceTypeUrl(resourceType: ResourceType): string | null
{
  if ("url" in resourceType)
  {
    return resourceType.url;
  }
  else
  {
    const uint8Array = new Uint8Array(resourceType.content);
    let mimeType: string;
    try
    {
      mimeType = detectImageMimeType(uint8Array);
    }
    catch (_error)
    {
      return null;
    }
    const string = String.fromCharCode(...uint8Array);
    return `data:${mimeType};base64,` + btoa(string);
  }
}

export type AdditionalUi = {
  uuid: string;
  integration: ManifestInterfaceElementIntegration;
  content: IntentUrlContent | IntentInlineContent;
  icon: ResourceType;
  title: string;
  extensionId: string;
  automaticallyReopen: boolean;
};

export type LocalFiltersType = {
  keyword?: string;
  searchIn?: ("inName" | "inMetadata" | "inFeatures")[];
  formats?: ImageFormat[];
  features?: SearchFeatures;
  properties?: SearchProperties;
  tags?: string[];
  images?: string[];
  repositories?: string[];
  sortBy?: SearchSortingProperty;
  sortOrder?: string;
};

export type ContentIconType = ResourceType | { icon: ReactNode };

export type ModalAction = {
  label: string;
  color?: string;
  onClick?: (close: () => void) => void | Promise<void>;
};

export type ActionModalValue = {
  id?: string;
  isStackable?: boolean;
  isFullScreen?: boolean;
  isFullHeight?: boolean;
  withCloseButton?: boolean;
  closeOnEscape?: boolean;
  size?: SizeType;
  icon?: ContentIconType;
  title: ReactNode;
  subtitle?: ReactNode;
  body: ReactElement;
  actions?: ModalAction[];
  onBeforeClose?: (viaOnSuccess: boolean) => void;
};

export const ManualSection =
  {
    Summary: "Summary",
    Prerequisites: "Prerequisites",
    Settings: "Settings",
    Commands: "Commands"
  } as const;
