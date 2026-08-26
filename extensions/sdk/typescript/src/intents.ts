type Json = Record<string, any>;

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

export interface IntentOpenBrowser
{
  readonly url: string;
}

export interface OpenBrowserIntent extends BasisIntent
{
  readonly openBrowser: IntentOpenBrowser;
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

export enum IntentToastType
{
  Info = "info",
  Cancel = "cancel",
  Error = "error"
}

export interface IntentToast
{
  readonly type: IntentToastType;
  readonly title?: string;
  readonly subtitle: string;
}

export interface ToastIntent extends WithContextIntent
{
  readonly toast: IntentToast;
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

export interface IntentProcessCommand
{
  readonly extensionId: string;
  readonly commandId: string;
}

export interface ProcessCommandIntent extends WithContextIntent
{
  readonly processCommand: IntentProcessCommand;
}

export interface IntentAction
{
  readonly intent: ShowIntent | UiIntent | OpenBrowserIntent | ProcessCommandIntent;
  readonly dialogContent: IntentDialogIconSizeContent;
  readonly label?: string;
}

export interface ActionIntent extends WithContextIntent
{
  readonly action: IntentAction;
}

export type FrontIntent =
  FormIntent
  | UiIntent
  | OpenBrowserIntent
  | DialogIntent
  | ImagesIntent
  | ShowIntent
  | ToastIntent
  | NotificationIntent
  | ActionIntent;

export interface IntentServeBundle
{
  readonly content: Buffer;
  readonly settings?: Json;
}

export interface BundleIntent extends BasisIntent
{
  readonly serveBundle: IntentServeBundle;
}

export interface IntentReadFile
{
  readonly extensions?: string [];
  readonly message: string;
}

export interface ReadFileIntent extends WithContextIntent
{
  readonly readFile: IntentReadFile;
}

export interface IntentWriteFile
{
  readonly content: Buffer;
  readonly name: string;
  readonly extension: string;
  readonly message: string;
}

export interface WriteFileIntent extends WithContextIntent
{
  readonly writeFile: IntentWriteFile;
}

export type BackIntent =
  | BundleIntent
  | ReadFileIntent
  | WriteFileIntent;

export type Intent = FrontIntent | BackIntent;
