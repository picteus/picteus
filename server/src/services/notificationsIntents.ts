import { Json } from "../bos";


export interface NotificationIdentity
{
  readonly id: string;
}

export interface NotificationContext
{
  readonly imageIds?: string[];
}

export interface NotificationsBasisIntent
{
  readonly identity?: NotificationIdentity;
}

export interface NotificationsWithContextIntent extends NotificationsBasisIntent
{
  readonly context?: NotificationContext;
}

export interface NotificationResourceUrl
{
  readonly url: string;
}

export interface NotificationResourceContent
{
  readonly content: Buffer;
}

export type NotificationResource = NotificationResourceUrl | NotificationResourceContent;

export interface NotificationDialogContent
{
  readonly title: string;
  readonly description: string;
  readonly details?: string;
}

export interface NotificationDialogIconContent extends NotificationDialogContent
{
  readonly icon?: NotificationResource;
}

export interface NotificationFormContent
{
  readonly parameters: Json;
  readonly dialogContent?: NotificationDialogIconContent;
}

export interface NotificationsFormIntent extends NotificationsWithContextIntent
{
  readonly form: NotificationFormContent;
}

export enum NotificationsUiAnchor
{
  Modal = "modal",
  Sidebar = "sidebar",
  Window = "window",
  ImageDetail = "imageDetail"
}

export interface NotificationsUrlContent
{
  readonly url: string;
}

export interface NotificationsHtmlContent
{
  readonly html: string;
}

export type NotificationFrameContent = NotificationsUrlContent | NotificationsHtmlContent;

export interface NotificationsUi
{
  readonly anchor: NotificationsUiAnchor;
  readonly frameContent: NotificationFrameContent;
  readonly dialogContent?: NotificationDialogIconContent;
}

export interface NotificationsUiIntent extends NotificationsWithContextIntent
{
  readonly ui: NotificationsUi;
}

export enum NotificationsDialogType
{
  Error = "Error",
  Info = "Info",
  Question = "Question"
}

export interface NotificationsFrame
{
  readonly content: NotificationFrameContent;
  readonly height: number;
}

export interface NotificationsDialogButtons
{
  yes: string;
  no?: string;
}

export interface NotificationsDialog extends NotificationDialogIconContent
{
  readonly type: NotificationsDialogType;
  readonly size?: "auto" | "xs" | "s" | "m" | "l" | "xl";
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
  readonly dialogContent?: NotificationDialogContent;
}

export interface NotificationsImages
{
  readonly images: NotificationsImage[];
  readonly dialogContent: NotificationDialogIconContent;
}

export interface NotificationsImagesIntent extends NotificationsWithContextIntent
{
  readonly images: NotificationsImages;
}

export enum NotificationsShowType
{
  ExtensionSettings = "ExtensionSettings",
  Image = "Image",
  Repository = "Repository"
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
