import "../../dist/emitter/intents/decorators.js";

using TypeSpec.Reflection;

namespace Picteus.Intents;

extern dec frontEndIntent(target: Model);

extern dec backEndIntent(target: Model);

model IntentIdentity {
  id: string;
}

model IntentContext {
  imageIds?: string[];
}

model BasisIntent {
  identity?: IntentIdentity;
}

model WithContextIntent extends BasisIntent {
  context?: IntentContext;
}

model IntentResourceUrl {
  url: string;
}

model IntentResourceContent {
  content: bytes;
}

union IntentResource {
  url: IntentResourceUrl,
  content: IntentResourceContent
}

model IntentDialogContent {
  title: string;
  description: string;
  details?: string;
}

model IntentDialogIconContent extends IntentDialogContent {
  icon?: IntentResource;
}

model IntentDialogIconSizeContent extends IntentDialogIconContent {
  size?: "auto" | "xs" | "s" | "m" | "l" | "xl";
}

model IntentFormContent {
  parameters: Record<unknown>;
  dialogContent?: IntentDialogIconSizeContent;
}

@frontEndIntent
model FormIntent extends WithContextIntent {
  form: IntentFormContent;
}

enum IntentUiAnchor {
  modal: "modal",
  sidebar: "sidebar",
  window: "window",
  imageDetail: "imageDetail"
}

model IntentUISidebarIntegration {
  anchor: "sidebar";
  isExternal: boolean;
}

model IntentUIWindowIntegration {
  anchor: "window";
}

model IntentUIModalIntegration {
  anchor: "modal";
}

union IntentUIIntegration {
  sidebar: IntentUISidebarIntegration,
  window: IntentUIWindowIntegration,
  modal: IntentUIModalIntegration
}

model IntentUrlContent {
  url: string;
}

model IntentHtmlContent {
  html: string;
}

union IntentFrameContent {
  url: IntentUrlContent,
  html: IntentHtmlContent
}

model IntentUi {
  id: string;
  integration: IntentUIIntegration;
  frameContent: IntentFrameContent;
  dialogContent?: IntentDialogIconContent;
}

@frontEndIntent
model UiIntent extends WithContextIntent {
  ui: IntentUi;
}

model IntentOpenBrowser {
  @format("url")
  url: string;
}

@frontEndIntent
model OpenBrowserIntent extends BasisIntent {
  openBrowser: IntentOpenBrowser;
}

enum IntentDialogType {
  error: "error",
  info: "info",
  question: "question"
}

model IntentFrame {
  content: IntentFrameContent;
  @minValue(0)
  @maxValue(100)
  height: int32;
}

model IntentDialogButtons {
  yes: string;
  no?: string;
}

model IntentDialog extends IntentDialogIconSizeContent {
  type: IntentDialogType;
  frame?: IntentFrame;
  buttons: IntentDialogButtons;
}

@frontEndIntent
model DialogIntent extends WithContextIntent {
  dialog: IntentDialog;
}

model IntentImage {
  imageId: string;
  dialogContent?: IntentDialogContent;
}

model IntentImages {
  images: IntentImage[];
  dialogContent: IntentDialogIconContent;
}

@frontEndIntent
model ImagesIntent extends WithContextIntent {
  images: IntentImages;
}

enum IntentShowType {
  sidebar: "sidebar",
  extensionSettings: "extensionSettings",
  image: "image",
  repository: "repository"
}

model IntentShow {
  type: IntentShowType;
  id: string;
}

@frontEndIntent
model ShowIntent extends BasisIntent {
  show: IntentShow;
}

enum IntentToastType {
  info: "info",
  cancel: "cancel",
  error: "error"
}

model IntentToast {
  type: IntentToastType;
  title?: string;
  subtitle: string;
}

@frontEndIntent
model ToastIntent extends WithContextIntent {
  toast: IntentToast;
}

model IntentNotification {
  title: string;
  subtitle: string;
  body: string;
  silent: boolean;
  icon?: bytes;
  isNative: boolean;
}

@frontEndIntent
model NotificationIntent extends WithContextIntent {
  notification: IntentNotification;
}

model IntentProcessCommand {
  extensionId: string;
  commandId: string;
}

model ProcessCommandIntent extends WithContextIntent {
  processCommand: IntentProcessCommand;
}

model IntentAction {
  intent: ShowIntent | UiIntent | OpenBrowserIntent | ProcessCommandIntent;
  dialogContent: IntentDialogIconSizeContent;
  label?: string;
}

@frontEndIntent
model ActionIntent extends WithContextIntent {
  action: IntentAction;
}

model IntentServeBundle {
  content: bytes;
  settings?: Record<unknown>;
}

@backEndIntent
model ServeBundleIntent extends BasisIntent {
  serveBundle: IntentServeBundle;
}

model IntentReadFile {
  extensions?: string[];
  message: string;
}

@backEndIntent
model ReadFileIntent extends WithContextIntent {
  readFile: IntentReadFile;
}

model IntentWriteFile {
  name: string;
  extension: string;
  content: bytes;
  message: string;
}

@backEndIntent
model WriteFileIntent extends WithContextIntent {
  writeFile: IntentWriteFile;
}
