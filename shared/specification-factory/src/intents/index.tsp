import "../../dist/emitter/intents/decorators.js";

using TypeSpec.Reflection;

@summary("Intent models describe the payloads sent from an extension to the back-end. An intent always travels through the back-end first, which checks that it is well formed: when it is \"front-end\", it is transmitted to the front-end, otherwise it is considered as \"back-end\" and is handled by the back-end. Any unknown or not well-formed submitted intent is rejected.")
@doc("Its envelope can include a shared identity and execution context, followed by a payload specific to a front-end or back-end operation. Intent consumers should treat optional fields as absent unless explicitly supplied; payload models below define each operation's required data and presentation behavior.")
namespace Picteus.Intents;

@summary("Marks a model as an intent declaration.")
extern dec intent(target: Model);

/**
 * Front-end intents are operations handled by the front-end. They may request navigation, present UI or notifications, or invoke extension commands.
 */
extern dec frontEndIntent(target: Model);

/**
 * Back-end intents are operations handled by the back-end. They describe server-side work such as hosting extension bundles or coordinating native file operations.
 */
extern dec backEndIntent(target: Model);

@summary("Unique identity metadata for an intent invocation.")
@doc("The identity is carried by intent envelopes that inherit from BasisIntent. Producers may use it to correlate an intent with its request or response; it does not identify the user, extension, or target entity.")
model Identity {
  @summary("Unique identifier string for the intent invocation.")
  @doc("Opaque correlation value supplied by the producer. Preserve the value unchanged when forwarding or responding to the same invocation.")
  id: string;
}

@summary("Contextual entity identifiers associated with an intent execution.")
@doc("Context communicates which entities are currently selected or otherwise relevant to an operation. It is supplementary to the payload and must not be treated as a substitute for an explicit target required by that payload.")
model Context {
  @summary("Optional collection of image identifiers.")
  imageIds?: string[];
}

@summary("Base intent model providing optional identity tracking.")
@doc("Intent payload models inherit this envelope when they need request correlation. The identity is optional so intents can also be dispatched without a correlation token.")
@intent
model BasisIntent {
  @summary("Optional unique identity metadata for the intent invocation.")
  @doc("Correlation metadata for the invocation, should be kept intact during its whole lifecycle.")
  identity?: Identity;
}

@summary("Base intent model extending BasisIntent with execution context references.")
@doc("It offers additional information about the context of execution the intent.")
@intent
model WithContextIntent extends BasisIntent {
  @summary("Optional execution context containing target entity identifiers such as image identifiers.")
  context?: Context;
}

@summary("Base content structure providing an optional title.")
@doc("Reusable heading metadata for dialog, notification, and view content. The title is optional in this base so that a consumer can render content that has a description or body without a heading.")
model WithTitle {
  @summary("Optional headline or primary title text.")
  @doc("Short heading intended for a title position in the associated UI. Keep this concise; place explanatory prose in description, subtitle, or details fields.")
  title?: string;
}

@summary("Base content structure providing a subtitle.")
@doc("Reusable secondary text content. This model makes the subtitle required because its consumers use it as the primary short message when no separate body field is available.")
model WithSubtitle {
  @summary("Descriptive subtitle or message text.")
  @doc("Short supporting message displayed below a title or as the main text of a compact notification. Use details or body fields for longer content.")
  subtitle: string;
}

@summary("Base content structure providing a title and subtitle.")
@doc("Composition of the reusable title and subtitle fields for compact content that needs a heading and one supporting line.")
model TitleSubtitle extends WithTitle {
  ...WithSubtitle;
}

@summary("Base content structure providing a description.")
@doc("Reusable explanatory text for content that needs a description independent of its heading. The value is plain text and is not interpreted as markup.")
model WithDescription {
  @summary("Descriptive subtitle or explanatory message text.")
  @doc("Explanatory text associated with the content. Use this for a short overview; additional or more detailed text can be supplied through a details field.")
  description: string;
}

@summary("Base content structure providing optional details.")
@doc("Reusable extended body text, intended for information that is useful but should not be part of the primary heading or message.")
model WithDetails {
  @summary("Optional supplementary details or extended body text.")
  @doc("Optional longer-form supporting content. Consumers may present it as secondary or expandable text; it remains plain text rather than a markup document.")
  details?: string;
}

@summary("Base content structure providing a description and optional details.")
@doc("Composition for explanatory content with a required overview and optional supplementary body text.")
model DescriptionDetails extends WithDescription {
  ...WithDetails;
}

@summary("Base content structure providing a title, description, and optional details.")
@doc("Combines required descriptive content with an additional required title, suitable for cards where a heading and explanatory body are both needed.")
model TitleDescriptionDetails extends DescriptionDetails {
  @summary("Primary title text displayed in the header.")
  title: string;
}

@summary("Resource reference pointing to an external or local URL.")
@doc("Use a URL reference when the resource is available to the consumer through a location rather than inline bytes. The value is interpreted according to the resource consumer and may refer to remote or local content.")
model ResourceUrl {
  @summary("Resource destination URL.")
  @doc("Location from which the front-end can retrieve the resource.")
  url: string;
}

@summary("Resource payload containing raw binary data.")
@doc("Use this representation to transfer a resource as bytes in the intent payload instead of requiring the consumer to resolve a separate URL.")
model ResourceContent {
  @summary("Raw binary byte content of the resource.")
  @doc("Complete binary representation of the resource. The consumer is responsible for interpreting the bytes in the context in which the resource is used.")
  content: bytes;
}

@summary("Resource descriptor providing content either via URL or raw binary bytes.")
@doc("Exactly one resource representation is selected by the union variant: a resolvable location or inline binary data. Prefer URL references for reusable hosted assets and byte content when the payload must be self-contained.")
union Resource {
  @summary("Resource located by URL.")
  url: ResourceUrl,

  @summary("Resource provided as raw binary bytes.")
  content: ResourceContent
}

@summary("Base content structure extending TitleDescriptionDetails with an optional icon resource.")
@doc("Combines a title and explanatory text with an optional icon for headers and notification cards. The icon can be supplied by URL or as bytes through Resource.")
model TitleDescriptionDetailsIcon extends TitleDescriptionDetails {
  @summary("Optional visual icon resource — supplied as a URL or binary bytes.")
  @doc("Decorative or identifying image for the content header. Choose a URL for separately hosted assets or inline bytes when the asset must travel with the payload.")
  icon?: Resource;
}

@summary("Base content structure extending title, subtitle, description, and details content with an optional icon.")
@doc("Combines the common heading and body fields for richer views. The title is required here; subtitle, description, and details are supplied by the composed content structures, while the icon remains optional.")
model TitleSubtitleDescriptionDetailsIcon extends TitleSubtitle {
  @summary("Primary title text.")
  @doc("Required concise heading for the content. It is distinct from the supporting subtitle and longer description/details fields.")
  title: string;

  ...DescriptionDetails;

  @summary("Optional visual icon resource — supplied as a URL or binary bytes.")
  @doc("Optional image accompanying the content heading. Its resource can be inline or externally located, as described by Resource.")
  icon?: Resource;
}

@summary("Textual content configuration for modal dialogs and notification cards.")
@doc("Convenience model for dialog text that requires a title and description with optional details, without an icon or size preference.")
model DialogContent extends TitleDescriptionDetails {
}

@summary("Dialog content structure extending TitleDescriptionDetailsIcon with an optional icon resource.")
@doc("Adds the optional resource icon to standard title and description content for dialogs.")
model DialogIconContent extends TitleDescriptionDetailsIcon {
}

@summary("Dialog content structure extending DialogIconContent with a modal window size preference.")
@doc("Controls the preferred width class of a modal dialog. The front-end may choose an appropriate actual width for its viewport when the preference is automatic or a fixed size cannot fit.")
model DialogIconSizeContent extends DialogIconContent {
  @summary("Modal dialog window size variant.")
  @doc("Preferred modal size. Use auto when content should determine a suitable width; named sizes express a relative front-end-defined width rather than a pixel measurement.")
  size?: "auto" | "xs" | "s" | "m" | "l" | "xl";
}

@summary("Form configuration containing JSON Schema fields and optional dialog presentation settings.")
@doc("The parameters value is a JSON Schema object used by the front-end to construct inputs and validate submitted values. Dialog content controls the surrounding modal presentation; it does not change the parameter schema.")
model FormContent {
  @summary("JSON Schema specification describing form parameters, input types, default values, and validation rules.")
  @doc("JSON Schema object describing the fields to render, including their types, titles, defaults, and validation constraints. Define an object schema with named properties so collected values can be returned as a keyed object.")
  parameters: Record<unknown>;

  @summary("Optional presentation settings for the modal dialog housing the form.")
  @doc("Optional title, descriptive content, icon, and preferred size for the form dialog. Leave this out when the form can use the front-end's default dialog presentation.")
  dialogContent?: DialogIconSizeContent;
}

@summary("An intent that displays a JSON Schema-based form in a modal dialog to collect user input.")
@doc("The front-end renders the form associated to the schema, collects values, and returns them through the intent interaction flow. Use this for capturing structured input rather than embedding a hand-built form in a custom UI frame.")
@intent
@frontEndIntent
model FormIntent extends WithContextIntent {
  @summary("Form configuration containing the JSON Schema parameters definition and dialog presentation settings.")
  @doc("Schema and optional modal presentation configuration for the requested form. The schema defines the form's inputs and validation rules.")
  form: FormContent;
}

@summary("Target layout anchor where an embedded extension user interface should be integrated.")
@doc("The selected anchor is the discriminator for the supported integration surface. Its string value is part of the serialized intent contract and must match one of these declared choices.")
enum UiAnchor {
  @summary("Rendered inside a centered or full-screen modal dialog.")
  modal: "modal",

  @summary("Docked within the collateral sidebar navigation.")
  sidebar: "sidebar",

  @summary("Rendered inside an independent floating desktop window.")
  window: "window",

  @summary("Embedded within the image detail inspection view.")
  imageDetail: "imageDetail",

  @summary("Displayed within a dedicated tab.")
  tab: "tab"
}

@summary("UI integration configuration for mounting an extension view inside the collateral sidebar.")
@doc("Selects the front-end's sidebar host as the integration point. The external flag allows the view to be presented in an independent window instead of occupying the docked sidebar surface.")
model UISidebarIntegration {
  @summary("Layout anchor discriminator specifying sidebar placement.")
  @doc("Literal integration discriminator for the sidebar variant. Keep it set to sidebar so consumers can distinguish this payload from other integration modes.")
  anchor: "sidebar";

  @summary("Whether the sidebar view should open in an external window rather than docked directly in the sidebar.")
  @doc("When true, asks the front-end to open the sidebar-backed view in a separate window. When false, the view is embedded in the sidebar; this flag does not change the integration anchor.")
  isExternal: boolean;
}

@summary("UI integration configuration for rendering an extension view inside an independent window.")
@doc("Selects a standalone host window without additional window-specific options in this contract.")
model UIWindowIntegration {
  @summary("Layout anchor discriminator specifying window placement.")
  @doc("Literal integration discriminator for the independent-window variant.")
  anchor: "window";
}

@summary("UI integration configuration for rendering an extension view inside a modal dialog.")
@doc("Selects a front-end-managed modal as the host surface for the embedded extension view.")
model UIModalIntegration {
  @summary("Layout anchor discriminator specifying modal placement.")
  @doc("Literal integration discriminator for the modal variant.")
  anchor: "modal";
}

@summary("UI integration configuration for rendering an extension view inside a tab.")
@doc("Selects a dedicated front-end tab as the host surface for the embedded extension view.")
model UITabIntegration {
  @summary("Layout anchor discriminator specifying tab placement.")
  @doc("Literal integration discriminator for the tab variant.")
  anchor: "tab";
}

@summary("Union of supported UI integration placement strategies.")
@doc("Discriminated by each integration model's anchor field. Use the matching variant model so the anchor and any surface-specific settings remain consistent.")
union UIIntegration {
  @summary("Collateral sidebar integration placement.")
  sidebar: UISidebarIntegration,

  @summary("Independent window integration placement.")
  window: UIWindowIntegration,

  @summary("Modal dialog integration placement.")
  modal: UIModalIntegration,

  @summary("Tab integration placement.")
  tab: UITabIntegration
}

@summary("Embedded frame content specified by a web URL.")
@doc("URL-backed frame content is loaded by the front-end. The target must be reachable from that front-end's environment and should use an appropriate secure scheme.")
model UrlContent {
  @summary("Target web URL to load inside the embedded frame.")
  @doc("Address of the web document to load. The frame host must be able to reach the location; use a secure URL for remote content.")
  url: string;
}

@summary("Embedded frame content specified by raw inline HTML markup.")
@doc("Inline document content supplied as a string. It is rendered by the host frame rather than fetched as a separate page; callers should not assume access to the host application's privileges.")
model HtmlContent {
  @summary("Raw HTML markup string to render directly inside the embedded frame.")
  @doc("HTML source rendered as the frame document. The TypeSpec contract treats it as an opaque string and does not validate markup or grant access to the host application's privileges.")
  html: string;
}

@summary("Union of supported embedded frame content formats — URL or inline HTML.")
@doc("Selects exactly one source for frame contents. The URL and inline HTML variants are alternative transport forms, not fields to combine in one value.")
union FrameContent {
  @summary("Frame content loaded from a URL.")
  url: UrlContent,

  @summary("Frame content provided as inline HTML markup.")
  html: HtmlContent
}

@summary("Complete specification for embedding a custom extension user interface within the front-end.")
@doc("The front-end uses id to identify the view, integration to choose its host surface, and frameContent to load its contents. dialogContent supplies optional header metadata where the selected integration supports it.")
model Ui {
  @summary("Unique identifier for the UI instance or transient panel.")
  @doc("Identifier for this view instance. Supply a stable identifier when the front-end should recognize the same registered view across invocations; otherwise use an identifier appropriate to the transient view lifecycle.")
  id: string;

  @summary("Placement strategy defining where and how the UI is mounted.")
  @doc("Discriminated integration configuration. The anchor selects a supported host surface, while fields on that specific variant refine its presentation.")
  integration: UIIntegration;

  @summary("Web content to render inside the frame — either a URL or raw HTML.")
  @doc("Content source for the embedded frame. Supply one supported variant; use a URL for hosted application content or inline HTML for a self-contained document.")
  frameContent: FrameContent;

  @summary("Optional header title, description, and icon metadata for the view.")
  @doc("Optional display metadata associated with the embedded view. It does not control the integration anchor or the content rendered within the frame.")
  dialogContent?: DialogIconContent;
}

@summary("An intent that opens a dedicated UI frame — modal, sidebar, window or tab — rendering a URL or raw inline HTML.")
@doc("Requests that the front-end mount the content in the selected integration surface, supplying the frame source and optional header metadata.")
@intent
@frontEndIntent
model UiIntent extends WithContextIntent {
  @summary("UI view configuration specifying placement anchor, content, and header metadata.")
  @doc("Required view descriptor containing the host integration, content source, and optional display metadata.")
  ui: Ui;
}

@summary("Parameters for opening an external web URL in the user's default browser.")
@doc("This payload targets external browser navigation rather than an embedded UI frame. The operating system or front-end handles the actual hand-off to the default browser.")
model OpenBrowser {
  @summary("Destination web URL to open externally in the default browser.")
  @format("url")
  @doc("External destination passed to the platform's default browser.")
  url: string;
}

@summary("An intent that prompts the user for confirmation and opens an external URL in the default web browser.")
@intent
@frontEndIntent
model OpenBrowserIntent extends BasisIntent {
  @summary("External browser navigation payload containing the target URL.")
  @doc("Required URL payload passed to the operating system or front-end for external browser navigation.")
  openBrowser: OpenBrowser;
}

@summary("Semantic classification and visual styling category of a modal dialog.")
enum DialogType {
  @summary("Error notice dialog indicating a failure or critical condition.")
  error: "error",

  @summary("Informational dialog displaying status, instructions, or notices.")
  info: "info",

  @summary("Question or confirmation prompt requiring explicit user decision.")
  question: "question"
}

@summary("Embedded frame configuration rendered within a dialog modal.")
@doc("The frame embeds URL- or HTML-based content in a dialog body. Its height is expressed as a percentage of the available dialog height so that the front-end can adapt the frame to the dialog's rendered dimensions.")
model Frame {
  @summary("Embedded web content to render inside the dialog frame.")
  @doc("Source for the embedded content. The selected FrameContent variant determines whether the front-end loads a URL or renders supplied markup.")
  content: FrameContent;

  @summary("Frame height expressed as a percentage of available dialog height (0 to 100).")
  @doc("Relative height request, bounded from 0 through 100. A value of 100 requests the full available dialog height; the final rendered dimensions remain controlled by the front-end.")
  @minValue(0)
  @maxValue(100)
  height: int32;
}

@summary("Button label configuration for interactive dialog actions.")
@doc("Defines user-visible text for the dialog's affirmative choice and optional secondary choice. These labels are presentation strings, not command identifiers.")
model DialogButtons {
  @summary("Label text for the primary affirmative / confirmation button.")
  @doc("Text shown for the affirmative action. Keep it specific to the requested decision when possible.")
  yes: string;

  @summary("Optional label text for the secondary negative / cancellation button.")
  @doc("Text shown for the secondary choice, commonly a cancellation label. Omission leaves that choice to the front-end's default dialog behavior.")
  no?: string;
}

@summary("Configuration for interactive modal dialogs displaying notices, confirmation questions, or embedded frames.")
@doc("Defines the dialog's semantic type and user-facing content, with optional embedded content and button labels. Use question for a decision that requires an explicit response; other types communicate status or errors.")
model Dialog extends DialogIconSizeContent {
  @summary("Semantic dialog type — error, info, or question.")
  @doc("Selects the dialog's interaction and visual treatment. Use question when the caller needs a yes/no choice, and error or info for non-question messages.")
  type: DialogType;

  @summary("Optional embedded HTML or URL frame rendered inside the dialog body.")
  @doc("Optional embedded content displayed within the dialog. Omit it for text-only dialogs; when present, content should be suitable for the dialog's available space.")
  frame?: Frame;

  @summary("Button label definitions for user response choices.")
  @doc("Labels for the affirmative action and optional secondary cancellation action. The front-end determines the button behavior and returns the user's choice to the intent caller.")
  buttons: DialogButtons;
}

@summary("An intent that displays an interactive modal dialog and returns the user's response.")
@doc("Requests a front-end-managed modal using the supplied dialog configuration. The front-end presents the available controls and resolves the interaction with the user's response.")
@intent
@frontEndIntent
model DialogIntent extends WithContextIntent {
  @summary("Modal dialog configuration including type, title, buttons, and optional frame content.")
  @doc("Required modal content and interaction configuration. Its type, buttons, and optional frame determine what the user sees and which response can be returned.")
  dialog: Dialog;
}

@summary("Individual image descriptor for gallery presentation.")
@doc("An image entry references an existing image by identifier and may override or augment its displayed textual details.")
model Image {
  @summary("Unique identifier of the image in repositories.")
  @doc("Identifier used by the front-end to resolve the image from its repositories. This is a image identifier, not an image URL or binary payload.")
  imageId: string;

  @summary("Optional title, description, or detail text for the individual image.")
  @doc("Optional display metadata associated with this image entry. The front-end can use it as a per-image caption or descriptive context without changing the referenced image.")
  details?: TitleDescriptionDetails;
}

@summary("Content configuration for image gallery presentation containing title, subtitle, description, details, and an optional icon.")
@doc("Header metadata specialized for the image gallery tab. It reuses the common content fields so gallery presentation follows the same title, text, and icon conventions as other views.")
model ImagesContent extends TitleSubtitleDescriptionDetailsIcon {
}

@summary("Collection of image items displayed inside a dedicated gallery tab.")
@doc("Pairs the gallery's image entries with the header content shown above them. Each entry points to an existing image; this model does not carry image bytes.")
model Images {
  @summary("List of image items to display in the gallery tab.")
  @doc("Ordered gallery entries. The sequence supplied here is the order in which images are presented by the front-end.")
  images: Image[];

  @summary("Header content configuration for the image gallery tab.")
  @doc("Title, subtitle, description, details, and optional icon for the gallery view header.")
  content: ImagesContent;
}

@summary("An intent that opens a tab displaying an image gallery.")
@doc("Requests a dedicated desk tab for the supplied ordered image collection and header metadata.")
@intent
@frontEndIntent
model ImagesIntent extends WithContextIntent {
  @summary("Image collection items and header metadata for the tab view.")
  @doc("Required gallery payload containing both the image references and the content used to describe the tab.")
  images: Images;
}

@summary("Target view or entity type to display in the front-end.")
enum ShowType {
  @summary("Registered collateral sidebar panel.")
  sidebar: "sidebar",

  @summary("Extension settings configuration modal.")
  extensionSettings: "extensionSettings",

  @summary("Full-screen image detail inspection view.")
  image: "image",

  @summary("Repository details and contents view.")
  repository: "repository"
}

@summary("Navigation payload targeting a specific view, panel, or entity.")
@doc("Combines a front-end-recognized view category with the identifier needed to resolve the destination. Valid identifier formats depend on the selected view type.")
model Show {
  @summary("Target view or entity category discriminator.")
  @doc("Selects which front-end surface or entity resolver handles the navigation request. The id property must identify an entity compatible with this category.")
  type: ShowType;

  @summary("Unique identifier of the target entity — such as an image ID, repository ID, sidebar UUID, or extension ID.")
  @doc("Identifier consumed by the selected destination resolver, for example an image ID for image, repository ID for repository, or extension ID for extensionSettings.")
  id: string;
}

@summary("An intent that navigates the front-end to a specific view, opening an image detail modal, a registered sidebar panel, an extension settings modal, or a repository view.")
@doc("It requests navigation in the front-end using a type-and-identifier pair.")
@intent
@frontEndIntent
model ShowIntent extends BasisIntent {
  @summary("Target entity and view type specification to display.")
  @doc("Destination descriptor used by the front-end to select the view and resolve its target.")
  show: Show;
}

@summary("Visual style and severity variant for toast notifications.")
enum ToastType {
  @summary("Informational toast indicating general status or successful completion.")
  info: "info",

  @summary("Cancellation toast indicating an operation was aborted or cancelled.")
  cancel: "cancel",

  @summary("Error toast indicating a failure or warning condition.")
  error: "error"
}

@summary("Configuration payload for brief, non-intrusive toast notifications.")
@doc("Toast content is intended for transient status feedback rather than a durable notification or an interaction requiring a decision.")
model Toast extends TitleSubtitle {
  @summary("Visual style and severity variant of the toast.")
  @doc("Controls the font-end-side visual treatment and communicates the message category; it does not alter the notification text.")
  type: ToastType;
}

@summary("An intent that displays a brief, non-intrusive toast notification in the front-end.")
@doc("It dispatches a transient status feedback to the front-end.")
@intent
@frontEndIntent
model ToastIntent extends WithContextIntent {
  @summary("Toast notification configuration specifying type, title, and subtitle text.")
  @doc("Required toast content and severity configuration.")
  toast: Toast;
}

@summary("Notification payload for notification center cards or native desktop notifications.")
@doc("Provides content and delivery preferences for a notification. The consumer can route it to the in-app notification center, the operating system notification manager, or both according to its supported behavior.")
model Notification extends TitleSubtitle {
  @summary("Primary notification title heading.")
  @doc("Short heading shown as the notification's primary label.")
  title: string;

  @summary("Detailed notification message body.")
  @doc("Main explanatory text shown with the notification title and subtitle. Keep the body understandable when the user sees it outside the surrounding application context.")
  body: string;

  @summary("Whether audio alert chimes and sounds should be suppressed.")
  @doc("Set true when delivery should not produce an audible alert. This preference does not suppress the visual notification.")
  silent: boolean;

  @summary("Optional raw binary image icon displayed with the notification.")
  @doc("Image bytes supplied for the notification icon. The target notification surface may apply its own size and format constraints.")
  icon?: bytes;

  @summary("Whether the notification is dispatched through the operating system native desktop notification manager.")
  @doc("Selects native desktop notification delivery when true. When false, the front-end notification center is the target; actual OS behavior is subject to platform support.")
  isNative: boolean;
}

@summary("An intent that dispatches a notification to the front-end notification center or operating system native desktop notification manager.")
@doc("It sends a notification content with delivery preferences to the front-end.")
@intent
@frontEndIntent
model NotificationIntent extends WithContextIntent {
  @summary("Notification details including title, subtitle, body, icon, and delivery mode.")
  @doc("Required notification content and delivery options.")
  notification: Notification;
}

@summary("Specification identifying an extension command for programmatic invocation.")
@doc("A command is resolved within its owning extension, so both identifiers are required to avoid ambiguity across installed extensions.")
model ProcessCommand {
  @summary("Unique identifier of the extension owning the target command.")
    @doc("Identifier of the installed extension that registers the command. It scopes commandId to the correct extension.")
    extensionId: string;

  @summary("Unique identifier of the command to execute on the extension.")
  @doc("Identifier of the command registered by the owning extension. The extension's command handler determines the accepted input and execution behavior.")
  commandId: string;
}

@summary("An intent that triggers execution of an extension command within the current context.")
@doc("It asks the front-end to execute an command, submitted its form when it requires inputs.")
@intent
@frontEndIntent
model ProcessCommandIntent extends WithContextIntent {
  @summary("Extension and command identification payload.")
  @doc("Identifies the extension and command that the front-end should invoke.")
  processCommand: ProcessCommand;
}

@summary("Interactive action card configuration bundling an executable intent triggered by a notification button.")
@doc("Combines user-facing card content and an executable intent. The notification center can present the card and dispatch the nested intent only after the user activates its action.")
model Action {
  @summary("Underlying intent executed when the user confirms the action button.")
  @doc("Intent dispatched as the action's effect. Only the supported intent variants are accepted; the action itself does not execute or validate the nested operation.")
  intent: ShowIntent | UiIntent | OpenBrowserIntent | ProcessCommandIntent;

  @summary("Header title, description, details, icon, and sizing configuration for the action card.")
  @doc("User-facing card content displayed with the action button.")
  dialogContent: DialogIconSizeContent;

  @summary("Optional label text for the action confirmation button.")
  @doc("Optional concise text for the button that activates the nested intent.")
  label?: string;
}

@summary("An intent that posts an entry to the front-end notification center, executing an action when the user clicks its action button.")
@doc("It publishes a user-facing action card containing a nested intent. The nested operation is dispatched in response to the user's activation rather than immediately when this intent is handled.")
@intent
@frontEndIntent
model ActionIntent extends WithContextIntent {
  @summary("Action card configuration including header content, action button label, and underlying intent.")
  @doc("Required card configuration, including the intent to dispatch after user activation.")
  action: Action;
}

@summary("Configuration for uploading and hosting a static web application bundle on the back-end.")
@doc("The server accepts a ZIP archive of static assets and hosts it for use in an embedded frame. Configuration is passed to the served application separately from the archive contents.")
model ServeBundle {
  @summary("Binary ZIP archive payload containing static web application assets (HTML, CSS, JS).")
  @doc("ZIP-encoded bundle containing the entry HTML document and its static dependencies. The archive must be suitable for extraction and static hosting; this property is the archive bytes, not a URL to an existing bundle.")
  content: bytes;

  @summary("Optional initial configuration parameters or settings forwarded to the served bundle.")
  @doc("JSON-compatible key/value settings made available to the hosted application when it is initialized.")
  settings?: Record<unknown>;
}

@summary("An intent for uploading and hosting a web application bundle or a plain HTML page on the back-end.")
@doc("The back-end hosts the supplied static assets and returns a URL that can be used to open the application in a frame.")
@intent
@backEndIntent
model ServeBundleIntent extends BasisIntent {
  @summary("Bundle archive payload and optional configuration settings.")
  @doc("Required data used by the server to host the static application bundle.")
  serveBundle: ServeBundle;
}

@summary("Parameters for prompting the user to select an existing file through a native file picker dialog.")
@doc("Specifies the filters and prompt used by the host's file picker. The selected file content is returned by the corresponding read-file operation.")
model ReadFile {
  @summary("Optional list of allowed file extension filters (e.g. ['json', 'png']).")
  @doc("File extensions offered as selection filters. Supply extensions without a leading dot; omit this field to leave the available file types unrestricted by the request.")
  extensions?: string[];

  @summary("Informational dialog prompt message displayed to the user during file selection.")
  @doc("User-facing prompt describing what file should be selected. It is informational and does not enforce the extension filters.")
  message: string;
}

@summary("An intent for prompting the user to select an existing file through a native file picker dialog.")
@doc("It requests a file picker with the supplied filters and prompt. The selected content is returned to the caller as binary data; the extension does not receive a filesystem path through this contract.")
@intent
@backEndIntent
model ReadFileIntent extends WithContextIntent {
  @summary("File filter extensions and dialog prompt message configuration.")
  @doc("Required file picker request. The selected bytes are returned by the host operation.")
  readFile: ReadFile;
}

@summary("Parameters for prompting the user to save a file to disk through a native file save dialog.")
@doc("Specifies the suggested output name, extension, bytes, and prompt for a host-managed save dialog. The host controls the destination path and confirms the write with the user.")
model WriteFile {
  @summary("Default suggested filename without extension.")
  @doc("Suggested base name shown in the save dialog. Keep the extension in its separate property to avoid a duplicated suffix.")
  name: string;

  @summary("File extension to apply to the saved file.")
  @doc("Suffix associated with the saved file. Supply the extension expected by the content format, without relying on the host to infer it from the bytes.")
  extension: string;

  @summary("Binary byte content to write to disk upon user confirmation.")
  @doc("Complete file payload written if the user confirms the save operation.")
  content: bytes;

  @summary("Informational dialog prompt message displayed to the user during file saving.")
  @doc("User-facing explanation of the file being saved. It supplements the suggested name and does not choose the destination path.")
  message: string;
}

@summary("An intent that prompts the user to save some content to disk through a native file saver dialog.")
@doc("Requests a host-managed save dialog using the proposed filename, extension, and content. The user and host determine the destination; callers should handle cancellation according to the surrounding intent flow.")
@intent
@backEndIntent
model WriteFileIntent extends WithContextIntent {
  @summary("Target file name, extension, binary content, and dialog prompt message configuration.")
  @doc("Required save request containing the suggested name, output extension, content, and user-facing prompt.")
  writeFile: WriteFile;
}
