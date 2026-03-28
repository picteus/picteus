type Json = Record<string, any>;

export interface NotificationsIdentity
{
  readonly id: string;
}

export interface NotificationsContext
{
  readonly imageIds?: string[];
}

export interface NotificationsBasisIntent
{
  readonly identity?: NotificationsIdentity;
}

export interface NotificationsWithContextIntent extends NotificationsBasisIntent
{
  readonly context?: NotificationsContext;
}

export interface NotificationsResourceUrl
{
  readonly url: string;
}

export interface NotificationsResourceContent
{
  readonly content: Buffer;
}

export type NotificationsResource = NotificationsResourceUrl | NotificationsResourceContent;

export interface NotificationsDialogContent
{
  readonly title: string;
  readonly description: string;
  readonly details?: string;
}

export interface NotificationsDialogIconContent extends NotificationsDialogContent
{
  readonly icon?: NotificationsResource;
}

export interface NotificationsDialogIconSizeContent extends NotificationsDialogIconContent
{
  readonly size?: "auto" | "xs" | "s" | "m" | "l" | "xl";
}

export interface NotificationsFormContent
{
  readonly parameters: Json;
  readonly dialogContent?: NotificationsDialogIconSizeContent;
}

export interface NotificationsFormIntent extends NotificationsWithContextIntent
{
  readonly form: NotificationsFormContent;
}

export enum NotificationsUiAnchor
{
  Modal = "modal",
  Sidebar = "sidebar",
  Window = "window",
  ImageDetail = "imageDetail"
}

export interface NotificationsUISidebarIntegration
{
  anchor: NotificationsUiAnchor.Sidebar,
  isExternal: boolean
}

export interface NotificationsUIWindowIntegration
{
  anchor: NotificationsUiAnchor.Window;
}

export interface NotificationsUIModalIntegration
{
  anchor: NotificationsUiAnchor.Modal;
}

export type NotificationsUIIntegration =
  NotificationsUISidebarIntegration
  | NotificationsUIWindowIntegration
  | NotificationsUIModalIntegration;

export interface NotificationsUrlContent
{
  readonly url: string;
}

export interface NotificationsHtmlContent
{
  readonly html: string;
}

export type NotificationsFrameContent = NotificationsUrlContent | NotificationsHtmlContent;

export interface NotificationsUi
{
  readonly id: string;
  readonly integration: NotificationsUIIntegration;
  readonly frameContent: NotificationsFrameContent;
  readonly dialogContent?: NotificationsDialogIconContent;
}

export interface NotificationsUiIntent extends NotificationsWithContextIntent
{
  readonly ui: NotificationsUi;
}

export enum NotificationsDialogType
{
  Error = "error",
  Info = "info",
  Question = "question"
}

export interface NotificationsFrame
{
  readonly content: NotificationsFrameContent;
  readonly height: number;
}

export interface NotificationsDialogButtons
{
  yes: string;
  no?: string;
}

export interface NotificationsDialog extends NotificationsDialogIconSizeContent
{
  readonly type: NotificationsDialogType;
  readonly frame?: NotificationsFrame;
  readonly buttons: NotificationsDialogButtons;
}

export interface NotificationsDialogIntent extends NotificationsWithContextIntent
{
  readonly dialog: NotificationsDialog;
}

export interface NotificationsImage
{
  readonly imageId: string;
  readonly dialogContent?: NotificationsDialogContent;
}

export interface NotificationsImages
{
  readonly images: NotificationsImage[];
  readonly dialogContent: NotificationsDialogIconContent;
}

export interface NotificationsImagesIntent extends NotificationsWithContextIntent
{
  readonly images: NotificationsImages;
}

export enum NotificationsShowType
{
  Sidebar = "sidebar",
  ExtensionSettings = "extensionSettings",
  Image = "image",
  Repository = "repository"
}

export interface NotificationsShow
{
  readonly type: NotificationsShowType;
  readonly id: string;
}

export interface NotificationsShowIntent extends NotificationsBasisIntent
{
  readonly show: NotificationsShow;
}

export interface NotificationsServeBundle
{
  readonly content: Buffer;
  readonly settings?: Json;
}

export interface NotificationsServeBundleIntent extends NotificationsBasisIntent
{
  readonly serveBundle: NotificationsServeBundle;
}

export type NotificationsIntent =
  NotificationsFormIntent
  | NotificationsUiIntent
  | NotificationsDialogIntent
  | NotificationsImagesIntent
  | NotificationsShowIntent
  | NotificationsServeBundleIntent
