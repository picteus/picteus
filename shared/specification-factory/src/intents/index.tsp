import "../../dist/emitter/intents/decorators.js";

using TypeSpec.Reflection;

namespace Picteus.Intents;

@doc("Marks a model as an intent declaration.")
extern dec intent(target: Model);

@doc("Marks an intent model as a front-end intent dispatched to and handled by the client application.")
extern dec frontEndIntent(target: Model);

@doc("Marks an intent model as a back-end intent handled by the Picteus server or host service.")
extern dec backEndIntent(target: Model);

@doc("Generic key-value record mapping.")
scalar Record;

@doc("Unique identity metadata for an intent invocation.")
model Identity {
  @doc("Unique identifier string for the intent invocation.")
  id: string;
}

@doc("Contextual entity identifiers associated with an intent execution.")
model Context {
  @doc("Optional collection of target image identifiers in the active selection or workspace context.")
  imageIds?: string[];
}

@doc("Base intent model providing optional identity tracking.")
@intent
model BasisIntent {
  @doc("Optional unique identity metadata for the intent invocation.")
  identity?: Identity;
}

@doc("Base intent model extending BasisIntent with execution context references.")
@intent
model WithContextIntent extends BasisIntent {
  @doc("Optional execution context containing target entity identifiers such as image IDs.")
  context?: Context;
}

@doc("Base content structure providing an optional title.")
model WithTitle {
  @doc("Optional headline or primary title text.")
  title?: string;
}

@doc("Base content structure providing a subtitle.")
model WithSubtitle {
  @doc("Descriptive subtitle or message text.")
  subtitle: string;
}

@doc("Base content structure providing a title and subtitle.")
model TitleSubtitle extends WithTitle {
  ...WithSubtitle;
}

@doc("Base content structure providing a description.")
model WithDescription {
  @doc("Descriptive subtitle or explanatory message text.")
  description: string;
}

@doc("Base content structure providing optional details.")
model WithDetails {
  @doc("Optional supplementary details or extended body text.")
  details?: string;
}

@doc("Base content structure providing a description and optional details.")
model DescriptionDetails extends WithDescription {
  ...WithDetails;
}

@doc("Base content structure providing a title, description, and optional details.")
model TitleDescriptionDetails extends DescriptionDetails {
  @doc("Primary title text displayed in the header.")
  title: string;
}

@doc("Resource reference pointing to an external or local URL.")
model ResourceUrl {
  @doc("Resource destination URL.")
  url: string;
}

@doc("Resource payload containing raw binary data.")
model ResourceContent {
  @doc("Raw binary byte content of the resource.")
  content: bytes;
}

@doc("Resource descriptor providing content either via URL or raw binary bytes.")
union Resource {
  @doc("Resource located by URL.")
  url: ResourceUrl,

  @doc("Resource provided as raw binary bytes.")
  content: ResourceContent
}

@doc("Base content structure extending TitleDescriptionDetails with an optional icon resource.")
model TitleDescriptionDetailsIcon extends TitleDescriptionDetails {
  @doc("Optional visual icon resource — supplied as a URL or binary bytes.")
  icon?: Resource;
}

@doc("Base content structure extending TitleSubtitle and DescriptionDetails with a mandatory title and an optional icon resource.")
model TitleSubtitleDescriptionDetailsIcon extends TitleSubtitle {
  @doc("Primary title text.")
  title: string;

  ...DescriptionDetails;

  @doc("Optional visual icon resource — supplied as a URL or binary bytes.")
  icon?: Resource;
}

@doc("Textual content configuration for modal dialogs and notification cards.")
model DialogContent extends TitleDescriptionDetails {
}

@doc("Dialog content structure extending TitleDescriptionDetailsIcon with an optional icon resource.")
model DialogIconContent extends TitleDescriptionDetailsIcon {
}

@doc("Dialog content structure extending DialogIconContent with a modal window size preference.")
model DialogIconSizeContent extends DialogIconContent {
  @doc("Modal dialog window size variant.")
  size?: "auto" | "xs" | "s" | "m" | "l" | "xl";
}

@doc("Form configuration payload defining JSON Schema fields and optional dialog presentation settings.")
model FormContent {
  @doc("JSON Schema specification describing form parameters, input types, default values, and validation rules.")
  parameters: Record;

  @doc("Optional presentation settings for the modal dialog housing the form.")
  dialogContent?: DialogIconSizeContent;
}

@doc("Front-end intent that displays a dynamically generated JSON Schema form in a modal dialog to collect user input.")
@intent
@frontEndIntent
model FormIntent extends WithContextIntent {
  @doc("Form configuration containing the JSON Schema parameters definition and dialog presentation settings.")
  form: FormContent;
}

@doc("Target layout anchor where an embedded extension user interface should be integrated.")
enum UiAnchor {
  @doc("Rendered inside a centered or full-screen modal dialog.")
  modal: "modal",

  @doc("Docked within the Picteus collateral sidebar navigation.")
  sidebar: "sidebar",

  @doc("Rendered inside an independent floating desktop window.")
  window: "window",

  @doc("Embedded within the image detail inspection view.")
  imageDetail: "imageDetail",

  @doc("Displayed within a dedicated tab.")
  tab: "tab"
}

@doc("UI integration configuration for mounting an extension view inside the collateral sidebar.")
model UISidebarIntegration {
  @doc("Layout anchor discriminator specifying sidebar placement.")
  anchor: "sidebar";

  @doc("Whether the sidebar view should open in an external window rather than docked directly in the sidebar.")
  isExternal: boolean;
}

@doc("UI integration configuration for rendering an extension view inside an independent window.")
model UIWindowIntegration {
  @doc("Layout anchor discriminator specifying window placement.")
  anchor: "window";
}

@doc("UI integration configuration for rendering an extension view inside a modal dialog.")
model UIModalIntegration {
  @doc("Layout anchor discriminator specifying modal placement.")
  anchor: "modal";
}

@doc("UI integration configuration for rendering an extension view inside a tab.")
model UITabIntegration {
  @doc("Layout anchor discriminator specifying modal placement.")
  anchor: "tab";
}

@doc("Union of supported UI integration placement strategies.")
union UIIntegration {
  @doc("Collateral sidebar integration placement.")
  sidebar: UISidebarIntegration,

  @doc("Independent window integration placement.")
  window: UIWindowIntegration,

  @doc("Modal dialog integration placement.")
  modal: UIModalIntegration,

  @doc("Tab integration placement.")
  tab: UITabIntegration
}

@doc("Embedded frame content specified by a web URL.")
model UrlContent {
  @doc("Target web URL to load inside the embedded frame.")
  url: string;
}

@doc("Embedded frame content specified by raw inline HTML markup.")
model HtmlContent {
  @doc("Raw HTML markup string to render directly inside the embedded frame.")
  html: string;
}

@doc("Union of supported embedded frame content formats — URL or inline HTML.")
union FrameContent {
  @doc("Frame content loaded from a URL.")
  url: UrlContent,

  @doc("Frame content provided as inline HTML markup.")
  html: HtmlContent
}

@doc("Complete specification for embedding a custom extension user interface within Picteus.")
model Ui {
  @doc("Unique identifier for the UI instance or transient panel.")
  id: string;

  @doc("Placement strategy defining where and how the UI is mounted.")
  integration: UIIntegration;

  @doc("Web content to render inside the frame — either a URL or raw HTML.")
  frameContent: FrameContent;

  @doc("Optional header title, description, and icon metadata for the view.")
  dialogContent?: DialogIconContent;
}

@doc("Front-end intent that opens a dedicated UI frame (modal, sidebar, or window) rendering an external/internal URL or raw inline HTML.")
@intent
@frontEndIntent
model UiIntent extends WithContextIntent {
  @doc("UI view configuration specifying placement anchor, content, and header metadata.")
  ui: Ui;
}

@doc("Parameters for opening an external web URL in the user's default browser.")
model OpenBrowser {
  @doc("Destination web URL to open externally in the default browser.")
  @format("url")
  url: string;
}

@doc("Front-end intent that prompts the user for confirmation and opens an external URL in the default web browser.")
@intent
@frontEndIntent
model OpenBrowserIntent extends BasisIntent {
  @doc("External browser navigation payload containing the target URL.")
  openBrowser: OpenBrowser;
}

@doc("Semantic classification and visual styling category of a modal dialog.")
enum DialogType {
  @doc("Error notice dialog indicating a failure or critical condition.")
  error: "error",

  @doc("Informational dialog displaying status, instructions, or notices.")
  info: "info",

  @doc("Question or confirmation prompt requiring explicit user decision.")
  question: "question"
}

@doc("Embedded frame configuration rendered within a dialog modal.")
model Frame {
  @doc("Embedded web content to render inside the dialog frame.")
  content: FrameContent;

  @doc("Frame height expressed as a percentage of available dialog height (0 to 100).")
  @minValue(0)
  @maxValue(100)
  height: int32;
}

@doc("Button label configuration for interactive dialog actions.")
model DialogButtons {
  @doc("Label text for the primary affirmative / confirmation button.")
  yes: string;

  @doc("Optional label text for the secondary negative / cancellation button.")
  no?: string;
}

@doc("Configuration for interactive modal dialogs displaying notices, confirmation questions, or embedded frames.")
model Dialog extends DialogIconSizeContent {
  @doc("Semantic dialog type — error, info, or question.")
  type: DialogType;

  @doc("Optional embedded HTML or URL frame rendered inside the dialog body.")
  frame?: Frame;

  @doc("Button label definitions for user response choices.")
  buttons: DialogButtons;
}

@doc("Front-end intent that displays interactive modal dialog boxes (confirmation questions, info messages, error notices, or embedded frames) and returns the user's response.")
@intent
@frontEndIntent
model DialogIntent extends WithContextIntent {
  @doc("Modal dialog configuration including type, title, buttons, and optional frame content.")
  dialog: Dialog;
}

@doc("Individual image descriptor for gallery presentation.")
model Image {
  @doc("Unique identifier of the image in Picteus repositories.")
  imageId: string;

  @doc("Optional title, description, or detail text for the individual image.")
  details?: TitleDescriptionDetails;
}

@doc("Content configuration for image gallery presentation containing title, subtitle, description, details, and an optional icon.")
model ImagesContent extends TitleSubtitleDescriptionDetailsIcon {
}

@doc("Collection of image items displayed inside a dedicated gallery tab.")
model Images {
  @doc("List of image items to display in the gallery tab.")
  images: Image[];

  @doc("Header content configuration for the image gallery tab.")
  content: ImagesContent;
}

@doc("Front-end intent that opens a dedicated workspace desk tab displaying a gallery grid of images and registers a notification.")
@intent
@frontEndIntent
model ImagesIntent extends WithContextIntent {
  @doc("Image collection items and header metadata for the tab view.")
  images: Images;
}

@doc("Target view or entity type to display in the Picteus client application.")
enum ShowType {
  @doc("Registered collateral sidebar panel.")
  sidebar: "sidebar",

  @doc("Extension settings configuration modal.")
  extensionSettings: "extensionSettings",

  @doc("Full-screen image detail inspection view.")
  image: "image",

  @doc("Repository details and contents view.")
  repository: "repository"
}

@doc("Navigation payload targeting a specific view, panel, or entity.")
model Show {
  @doc("Target view or entity category discriminator.")
  type: ShowType;

  @doc("Unique identifier of the target entity — such as an image ID, repository ID, sidebar UUID, or extension ID.")
  id: string;
}

@doc("Front-end intent that navigates the Picteus client to a specific view, opening an image detail modal, registered sidebar panel, extension settings modal, or repository view.")
@intent
@frontEndIntent
model ShowIntent extends BasisIntent {
  @doc("Target entity and view type specification to display.")
  show: Show;
}

@doc("Visual style and severity variant for toast notifications.")
enum ToastType {
  @doc("Informational toast indicating general status or successful completion.")
  info: "info",

  @doc("Cancellation toast indicating an operation was aborted or cancelled.")
  cancel: "cancel",

  @doc("Error toast indicating a failure or warning condition.")
  error: "error"
}

@doc("Configuration payload for brief, non-intrusive toast notifications.")
model Toast extends TitleSubtitle {
  @doc("Visual style and severity variant of the toast.")
  type: ToastType;
}

@doc("Front-end intent that displays a brief, non-intrusive toast notification in the application interface.")
@intent
@frontEndIntent
model ToastIntent extends WithContextIntent {
  @doc("Toast notification configuration specifying type, title, and subtitle text.")
  toast: Toast;
}

@doc("Notification payload for notification center cards or native desktop notifications.")
model Notification extends TitleSubtitle {
  @doc("Primary notification title heading.")
  title: string;

  @doc("Detailed notification message body.")
  body: string;

  @doc("Whether audio alert chimes and sounds should be suppressed.")
  silent: boolean;

  @doc("Optional raw binary image icon displayed with the notification.")
  icon?: bytes;

  @doc("Whether the notification is dispatched through the operating system native desktop notification manager.")
  isNative: boolean;
}

@doc("Front-end intent that dispatches a notification to the Picteus notification center or operating system desktop notification manager.")
@intent
@frontEndIntent
model NotificationIntent extends WithContextIntent {
  @doc("Notification details including title, subtitle, body, icon, and delivery mode.")
  notification: Notification;
}

@doc("Specification identifying an extension command for programmatic invocation.")
model ProcessCommand {
  @doc("Unique identifier of the extension owning the target command.")
  extensionId: string;

  @doc("Unique identifier of the command to execute on the extension.")
  commandId: string;
}

@doc("Front-end intent that triggers execution of an extension command within the current context.")
@intent
model ProcessCommandIntent extends WithContextIntent {
  @doc("Extension and command identification payload.")
  processCommand: ProcessCommand;
}

@doc("Interactive action card configuration bundling an executable intent triggered by an action button inside a notification.")
model Action {
  @doc("Underlying intent executed when the user confirms the action button.")
  intent: ShowIntent | UiIntent | OpenBrowserIntent | ProcessCommandIntent;

  @doc("Header title, description, details, icon, and sizing configuration for the action card.")
  dialogContent: DialogIconSizeContent;

  @doc("Optional label text for the action confirmation button.")
  label?: string;
}

@doc("Front-end intent that posts an actionable card to the notification center, bundling an executable intent triggered when the user clicks an action button.")
@intent
@frontEndIntent
model ActionIntent extends WithContextIntent {
  @doc("Action card configuration including header content, action button label, and underlying intent.")
  action: Action;
}

@doc("Configuration for uploading and hosting a static web application bundle on the Picteus server.")
model ServeBundle {
  @doc("Binary ZIP archive payload containing static web application assets (HTML, CSS, JS).")
  content: bytes;

  @doc("Optional initial configuration parameters or settings forwarded to the served bundle.")
  settings?: Record;
}

@doc("Back-end intent that uploads and serves a zipped HTML/JS web application bundle from the extension to an iframe endpoint hosted by the Picteus server, returning the hosted URL.")
@intent
@backEndIntent
model ServeBundleIntent extends BasisIntent {
  @doc("Bundle archive payload and optional configuration settings.")
  serveBundle: ServeBundle;
}

@doc("Parameters for prompting the user to select an existing file through a native file picker dialog.")
model ReadFile {
  @doc("Optional list of allowed file extension filters (e.g. ['json', 'png']).")
  extensions?: string[];

  @doc("Informational dialog prompt message displayed to the user during file selection.")
  message: string;
}

@doc("Back-end intent that prompts the user with a native file picker dialog to select an existing file and returns the file content as binary bytes.")
@intent
@backEndIntent
model ReadFileIntent extends WithContextIntent {
  @doc("File filter extensions and dialog prompt message configuration.")
  readFile: ReadFile;
}

@doc("Parameters for prompting the user to save a file to disk through a native file save dialog.")
model WriteFile {
  @doc("Default suggested filename without extension.")
  name: string;

  @doc("File extension to apply to the saved file.")
  extension: string;

  @doc("Binary byte content to write to disk upon user confirmation.")
  content: bytes;

  @doc("Informational dialog prompt message displayed to the user during file saving.")
  message: string;
}

@doc("Back-end intent that prompts the user with a native file save dialog to save binary content to disk with a suggested filename and extension.")
@intent
@backEndIntent
model WriteFileIntent extends WithContextIntent {
  @doc("Target file name, extension, binary content, and dialog prompt message configuration.")
  writeFile: WriteFile;
}
