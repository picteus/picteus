import { Json } from "../bos";


export interface NotificationDialogContent
{
  readonly title: string;
  readonly description: string;
  readonly details?: string;
}

export interface NotificationsParametersIntent
{
  readonly parameters: Json;
  readonly dialogContent?: NotificationDialogContent;
}

export enum NotificationsUiAnchor
{
  Modal = "modal",
  Sidebar = "sidebar",
  ImageDetail = "imageDetail"
}

export interface NotificationsUi
{
  readonly anchor: NotificationsUiAnchor;
  readonly url: string;
}

export interface NotificationsUiIntent
{
  readonly ui: NotificationsUi;
}

export enum NotificationsDialogType
{
  Error = "Error",
  Info = "Info",
  Question = "Question"
}

export interface NotificationsDialog extends NotificationDialogContent
{
  readonly type: NotificationsDialogType;
  readonly buttons: { yes: string, no?: string };
}

export interface NotificationsDialogIntent
{
  readonly dialog: NotificationsDialog;
}

export interface NotificationsImage
{
  readonly imageId: string;
  readonly title?: string;
  readonly description?: string;
  readonly details?: string;
}

export interface NotificationsImages
{
  readonly images: NotificationsImage[];
  readonly title?: string;
  readonly description?: string;
  readonly details?: string;
}

export interface NotificationsImagesIntent
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

export interface NotificationsShowIntent
{
  readonly show: NotificationsShow;
}

export type NotificationsIntent =
  NotificationsParametersIntent
  | NotificationsUiIntent
  | NotificationsDialogIntent
  | NotificationsImagesIntent
  | NotificationsShowIntent
