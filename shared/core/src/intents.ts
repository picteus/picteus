export type Json = Record<string, any>;

export interface IntentIdentity
{
  readonly id: string;
}

export interface IntentContext
{
  readonly imageIds?: string[];
}

export interface BasisIntent
{
  readonly identity?: IntentIdentity;
}

export interface WithContextIntent extends BasisIntent
{
  readonly context?: IntentContext;
}

export interface IntentResourceUrl
{
  readonly url: string;
}

export interface IntentResourceContent
{
  readonly content: Buffer;
}

export type IntentResource = IntentResourceUrl | IntentResourceContent;

export interface IntentDialogContent
{
  readonly title: string;
  readonly description: string;
  readonly details?: string;
}

export interface IntentDialogIconContent extends IntentDialogContent
{
  readonly icon?: IntentResource;
}

export interface IntentDialogIconSizeContent extends IntentDialogIconContent
{
  readonly size?: "auto" | "xs" | "s" | "m" | "l" | "xl";
}

export interface IntentFormContent
{
  readonly parameters: Json;
  readonly dialogContent?: IntentDialogIconSizeContent;
}

export interface FormIntent extends WithContextIntent
{
  readonly form: IntentFormContent;
}

export enum IntentUiAnchor
{
  Modal = "modal",
  Sidebar = "sidebar",
  Window = "window",
  ImageDetail = "imageDetail"
}

export interface IntentUISidebarIntegration
{
  anchor: IntentUiAnchor.Sidebar,
  isExternal: boolean
}

export interface IntentUIWindowIntegration
{
  anchor: IntentUiAnchor.Window;
}

export interface IntentUIModalIntegration
{
  anchor: IntentUiAnchor.Modal;
}

export type IntentUIIntegration =
  IntentUISidebarIntegration
  | IntentUIWindowIntegration
  | IntentUIModalIntegration;

export interface IntentUrlContent
{
  readonly url: string;
}

export interface IntentHtmlContent
{
  readonly html: string;
}

export type IntentFrameContent = IntentUrlContent | IntentHtmlContent;

export interface IntentUi
{
  readonly id: string;
  readonly integration: IntentUIIntegration;
  readonly frameContent: IntentFrameContent;
  readonly dialogContent?: IntentDialogIconContent;
}

export interface UiIntent extends WithContextIntent
{
  readonly ui: IntentUi;
}

export enum IntentDialogType
{
  Error = "error",
  Info = "info",
  Question = "question"
}

export interface IntentFrame
{
  readonly content: IntentFrameContent;
  readonly height: number;
}

export interface IntentDialogButtons
{
  yes: string;
  no?: string;
}

export interface IntentDialog extends IntentDialogIconSizeContent
{
  readonly type: IntentDialogType;
  readonly frame?: IntentFrame;
  readonly buttons: IntentDialogButtons;
}

export interface DialogIntent extends WithContextIntent
{
  readonly dialog: IntentDialog;
}

export interface IntentImage
{
  readonly imageId: string;
  readonly dialogContent?: IntentDialogContent;
}

export interface IntentImages
{
  readonly images: IntentImage[];
  readonly dialogContent: IntentDialogIconContent;
}

export interface ImagesIntent extends WithContextIntent
{
  readonly images: IntentImages;
}

export enum IntentShowType
{
  Sidebar = "sidebar",
  ExtensionSettings = "extensionSettings",
  Image = "image",
  Repository = "repository"
}

export interface IntentShow
{
  readonly type: IntentShowType;
  readonly id: string;
}

export interface ShowIntent extends BasisIntent
{
  readonly show: IntentShow;
}

export interface IntentNotification
{
  readonly title: string;
  readonly subtitle: string;
  readonly body: string;
  readonly silent: boolean;
  readonly icon?: Buffer;
  readonly isNative: boolean;
}

export interface NotificationIntent extends WithContextIntent
{
  readonly notification: IntentNotification;
}

export interface IntentRunCommandParameters
{
  readonly search: object;
  readonly command?: Json;
}

export interface IntentRunCommand
{
  readonly extensionId: string;
  readonly commandId: string;
  readonly parameters: IntentRunCommandParameters;
  readonly actionLabel: string;
}

export interface IntentAction
{
  readonly what: IntentShow | IntentUi | IntentRunCommand;
  readonly dialogContent: IntentDialogIconSizeContent;
}

export interface ActionIntent extends WithContextIntent
{
  readonly action: IntentAction;
}

export type FrontIntent =
  FormIntent
  | UiIntent
  | DialogIntent
  | ImagesIntent
  | ShowIntent
  | NotificationIntent
  | ActionIntent;

export function isFormIntent(intent: any): intent is FormIntent
{
  return (intent as FormIntent).form !== undefined;
}

export function isUiIntent(intent: any): intent is UiIntent
{
  return (intent as UiIntent).ui !== undefined;
}

export function isDialogIntent(intent: any): intent is DialogIntent
{
  return (intent as DialogIntent).dialog !== undefined;
}

export function isImagesIntent(intent: any): intent is ImagesIntent
{
  return (intent as ImagesIntent).images !== undefined;
}

export function isShowIntent(intent: any): intent is ShowIntent
{
  return (intent as ShowIntent).show !== undefined;
}

export function isNotificationIntent(intent: any): intent is NotificationIntent
{
  return (intent as NotificationIntent).notification !== undefined;
}

export function isActionIntent(intent: any): intent is ActionIntent
{
  return (intent as ActionIntent).action !== undefined;
}
