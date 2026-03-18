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

export interface NotificationDialogContent
{
  readonly title: string;
  readonly description: string;
  readonly details?: string;
}

export interface NotificationsParametersIntent extends NotificationsWithContextIntent
{
  readonly parameters: Json;
  readonly dialogContent?: NotificationDialogContent;
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
  readonly dialogContent?: NotificationDialogContent;
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

export interface NotificationsDialog extends NotificationDialogContent
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
  readonly dialogContent?: NotificationDialogContent;
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
  NotificationsParametersIntent
  | NotificationsUiIntent
  | NotificationsDialogIntent
  | NotificationsImagesIntent
  | NotificationsShowIntent
  | NotificationsServeBundleIntent
