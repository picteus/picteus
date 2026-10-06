# Intent models

Intent models describe the payloads sent from an extension to the back-end. An intent always travels through the
back-end first, which checks that it is well formed: when it is "front-end", it is transmitted to the front-end,
otherwise it is considered as "back-end" and is handled by the back-end. Any unknown or not well-formed submitted intent
is rejected.

Its envelope can include a shared identity and execution context, followed by a payload specific to a front-end or
back-end operation. Intent consumers should treat optional fields as absent unless explicitly supplied; payload models
below define each operation's required data and presentation behavior.

## Front-end intents

Front-end intents are operations handled by the front-end. They may request navigation, present UI or notifications, or
invoke extension commands.

| Intent model                                  | Description                                                                                                                                                                                                                                                                                                                     | Base model                              |
|-----------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| [FormIntent](#formintent)                     | An intent that displays a JSON Schema-based form in a modal dialog to collect user input. The front-end renders the form associated to the schema, collects values, and returns them through the intent interaction flow. Use this for capturing structured input rather than embedding a hand-built form in a custom UI frame. | [WithContextIntent](#withcontextintent) |
| [UiIntent](#uiintent)                         | An intent that opens a dedicated UI frame — modal, sidebar, window or tab — rendering a URL or raw inline HTML. Requests that the front-end mount the content in the selected integration surface, supplying the frame source and optional header metadata.                                                                     | [WithContextIntent](#withcontextintent) |
| [OpenBrowserIntent](#openbrowserintent)       | An intent that prompts the user for confirmation and opens an external URL in the default web browser.                                                                                                                                                                                                                          | [BasisIntent](#basisintent)             |
| [DialogIntent](#dialogintent)                 | An intent that displays an interactive modal dialog and returns the user's response. Requests a front-end-managed modal using the supplied dialog configuration. The front-end presents the available controls and resolves the interaction with the user's response.                                                           | [WithContextIntent](#withcontextintent) |
| [ImagesIntent](#imagesintent)                 | An intent that opens a tab displaying an image gallery. Requests a dedicated desk tab for the supplied ordered image collection and header metadata.                                                                                                                                                                            | [WithContextIntent](#withcontextintent) |
| [ShowIntent](#showintent)                     | An intent that navigates the front-end to a specific view, opening an image detail modal, a registered sidebar panel, an extension settings modal, or a repository view. It requests navigation in the front-end using a type-and-identifier pair.                                                                              | [BasisIntent](#basisintent)             |
| [ToastIntent](#toastintent)                   | An intent that displays a brief, non-intrusive toast notification in the front-end. It dispatches a transient status feedback to the front-end.                                                                                                                                                                                 | [WithContextIntent](#withcontextintent) |
| [NotificationIntent](#notificationintent)     | An intent that dispatches a notification to the front-end notification center or operating system native desktop notification manager. It sends a notification content with delivery preferences to the front-end.                                                                                                              | [WithContextIntent](#withcontextintent) |
| [ProcessCommandIntent](#processcommandintent) | An intent that triggers execution of an extension command within the current context. It asks the front-end to execute an command, submitted its form when it requires inputs.                                                                                                                                                  | [WithContextIntent](#withcontextintent) |
| [ActionIntent](#actionintent)                 | An intent that posts an entry to the front-end notification center, executing an action when the user clicks its action button. It publishes a user-facing action card containing a nested intent. The nested operation is dispatched in response to the user's activation rather than immediately when this intent is handled. | [WithContextIntent](#withcontextintent) |

## Front-end intent details

### FormIntent

An intent that displays a JSON Schema-based form in a modal dialog to collect user input.

The front-end renders the form associated to the schema, collects values, and returns them through the intent
interaction flow. Use this for capturing structured input rather than embedding a hand-built form in a custom UI frame.

Extends [WithContextIntent](#withcontextintent).

| Property | Type                        | Required | Default | Details                                                                                                                                                                                                                                       |
|----------|-----------------------------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `form`   | [FormContent](#formcontent) | Yes      |         | Form configuration containing the JSON Schema parameters definition and dialog presentation settings. Schema and optional modal presentation configuration for the requested form. The schema defines the form's inputs and validation rules. |

### UiIntent

An intent that opens a dedicated UI frame — modal, sidebar, window or tab — rendering a URL or raw inline HTML.

Requests that the front-end mount the content in the selected integration surface, supplying the frame source and
optional header metadata.

Extends [WithContextIntent](#withcontextintent).

| Property | Type      | Required | Default | Details                                                                                                                                                                                   |
|----------|-----------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `ui`     | [Ui](#ui) | Yes      |         | UI view configuration specifying placement anchor, content, and header metadata. Required view descriptor containing the host integration, content source, and optional display metadata. |

### OpenBrowserIntent

An intent that prompts the user for confirmation and opens an external URL in the default web browser.

Extends [BasisIntent](#basisintent).

| Property      | Type                        | Required | Default | Details                                                                                                                                                          |
|---------------|-----------------------------|----------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `openBrowser` | [OpenBrowser](#openbrowser) | Yes      |         | External browser navigation payload containing the target URL. Required URL payload passed to the operating system or front-end for external browser navigation. |

### DialogIntent

An intent that displays an interactive modal dialog and returns the user's response.

Requests a front-end-managed modal using the supplied dialog configuration. The front-end presents the available
controls and resolves the interaction with the user's response.

Extends [WithContextIntent](#withcontextintent).

| Property | Type              | Required | Default | Details                                                                                                                                                                                                                                             |
|----------|-------------------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `dialog` | [Dialog](#dialog) | Yes      |         | Modal dialog configuration including type, title, buttons, and optional frame content. Required modal content and interaction configuration. Its type, buttons, and optional frame determine what the user sees and which response can be returned. |

### ImagesIntent

An intent that opens a tab displaying an image gallery.

Requests a dedicated desk tab for the supplied ordered image collection and header metadata.

Extends [WithContextIntent](#withcontextintent).

| Property | Type              | Required | Default | Details                                                                                                                                                              |
|----------|-------------------|----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `images` | [Images](#images) | Yes      |         | Image collection items and header metadata for the tab view. Required gallery payload containing both the image references and the content used to describe the tab. |

### ShowIntent

An intent that navigates the front-end to a specific view, opening an image detail modal, a registered sidebar panel, an
extension settings modal, or a repository view.

It requests navigation in the front-end using a type-and-identifier pair.

Extends [BasisIntent](#basisintent).

| Property | Type          | Required | Default | Details                                                                                                                                       |
|----------|---------------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| `show`   | [Show](#show) | Yes      |         | Target entity and view type specification to display. Destination descriptor used by the front-end to select the view and resolve its target. |

### ToastIntent

An intent that displays a brief, non-intrusive toast notification in the front-end.

It dispatches a transient status feedback to the front-end.

Extends [WithContextIntent](#withcontextintent).

| Property | Type            | Required | Default | Details                                                                                                                        |
|----------|-----------------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------|
| `toast`  | [Toast](#toast) | Yes      |         | Toast notification configuration specifying type, title, and subtitle text. Required toast content and severity configuration. |

### NotificationIntent

An intent that dispatches a notification to the front-end notification center or operating system native desktop
notification manager.

It sends a notification content with delivery preferences to the front-end.

Extends [WithContextIntent](#withcontextintent).

| Property       | Type                          | Required | Default | Details                                                                                                                            |
|----------------|-------------------------------|----------|---------|------------------------------------------------------------------------------------------------------------------------------------|
| `notification` | [Notification](#notification) | Yes      |         | Notification details including title, subtitle, body, icon, and delivery mode. Required notification content and delivery options. |

### ProcessCommandIntent

An intent that triggers execution of an extension command within the current context.

It asks the front-end to execute an command, submitted its form when it requires inputs.

Extends [WithContextIntent](#withcontextintent).

| Property         | Type                              | Required | Default | Details                                                                                                              |
|------------------|-----------------------------------|----------|---------|----------------------------------------------------------------------------------------------------------------------|
| `processCommand` | [ProcessCommand](#processcommand) | Yes      |         | Extension and command identification payload. Identifies the extension and command that the front-end should invoke. |

### ActionIntent

An intent that posts an entry to the front-end notification center, executing an action when the user clicks its action
button.

It publishes a user-facing action card containing a nested intent. The nested operation is dispatched in response to the
user's activation rather than immediately when this intent is handled.

Extends [WithContextIntent](#withcontextintent).

| Property | Type              | Required | Default | Details                                                                                                                                                                              |
|----------|-------------------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `action` | [Action](#action) | Yes      |         | Action card configuration including header content, action button label, and underlying intent. Required card configuration, including the intent to dispatch after user activation. |

## Back-end intents

Back-end intents are operations handled by the back-end. They describe server-side work such as hosting extension
bundles or coordinating native file operations.

| Intent model                            | Description                                                                                                                                                                                                                                                                                                         | Base model                              |
|-----------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| [ServeBundleIntent](#servebundleintent) | An intent for uploading and hosting a web application bundle or a plain HTML page on the back-end. The back-end hosts the supplied static assets and returns a URL that can be used to open the application in a frame.                                                                                             | [BasisIntent](#basisintent)             |
| [ReadFileIntent](#readfileintent)       | An intent for prompting the user to select an existing file through a native file picker dialog. It requests a file picker with the supplied filters and prompt. The selected content is returned to the caller as binary data; the extension does not receive a filesystem path through this contract.             | [WithContextIntent](#withcontextintent) |
| [WriteFileIntent](#writefileintent)     | An intent that prompts the user to save some content to disk through a native file saver dialog. Requests a host-managed save dialog using the proposed filename, extension, and content. The user and host determine the destination; callers should handle cancellation according to the surrounding intent flow. | [WithContextIntent](#withcontextintent) |

## Back-end intent details

### ServeBundleIntent

An intent for uploading and hosting a web application bundle or a plain HTML page on the back-end.

The back-end hosts the supplied static assets and returns a URL that can be used to open the application in a frame.

Extends [BasisIntent](#basisintent).

| Property      | Type                        | Required | Default | Details                                                                                                                             |
|---------------|-----------------------------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------|
| `serveBundle` | [ServeBundle](#servebundle) | Yes      |         | Bundle archive payload and optional configuration settings. Required data used by the server to host the static application bundle. |

### ReadFileIntent

An intent for prompting the user to select an existing file through a native file picker dialog.

It requests a file picker with the supplied filters and prompt. The selected content is returned to the caller as binary
data; the extension does not receive a filesystem path through this contract.

Extends [WithContextIntent](#withcontextintent).

| Property   | Type                  | Required | Default | Details                                                                                                                                              |
|------------|-----------------------|----------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| `readFile` | [ReadFile](#readfile) | Yes      |         | File filter extensions and dialog prompt message configuration. Required file picker request. The selected bytes are returned by the host operation. |

### WriteFileIntent

An intent that prompts the user to save some content to disk through a native file saver dialog.

Requests a host-managed save dialog using the proposed filename, extension, and content. The user and host determine the
destination; callers should handle cancellation according to the surrounding intent flow.

Extends [WithContextIntent](#withcontextintent).

| Property    | Type                    | Required | Default | Details                                                                                                                                                                                       |
|-------------|-------------------------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `writeFile` | [WriteFile](#writefile) | Yes      |         | Target file name, extension, binary content, and dialog prompt message configuration. Required save request containing the suggested name, output extension, content, and user-facing prompt. |

## Other intent models

| Intent model                            | Description                                                                                                                                                                                                                     | Base model                  |
|-----------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------|
| [BasisIntent](#basisintent)             | Base intent model providing optional identity tracking. Intent payload models inherit this envelope when they need request correlation. The identity is optional so intents can also be dispatched without a correlation token. |                             |
| [WithContextIntent](#withcontextintent) | Base intent model extending BasisIntent with execution context references. It offers additional information about the context of execution the intent.                                                                          | [BasisIntent](#basisintent) |

## Other intent details

### BasisIntent

Base intent model providing optional identity tracking.

Intent payload models inherit this envelope when they need request correlation. The identity is optional so intents can
also be dispatched without a correlation token.

| Property   | Type                  | Required | Default | Details                                                                                                                                                 |
|------------|-----------------------|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| `identity` | [Identity](#identity) | No       |         | Optional unique identity metadata for the intent invocation. Correlation metadata for the invocation, should be kept intact during its whole lifecycle. |

### WithContextIntent

Base intent model extending BasisIntent with execution context references.

It offers additional information about the context of execution the intent.

Extends [BasisIntent](#basisintent).

| Property  | Type                | Required | Default | Details                                                                                    |
|-----------|---------------------|----------|---------|--------------------------------------------------------------------------------------------|
| `context` | [Context](#context) | No       |         | Optional execution context containing target entity identifiers such as image identifiers. |

## Shared payload models

### Identity

Unique identity metadata for an intent invocation.

The identity is carried by intent envelopes that inherit from BasisIntent. Producers may use it to correlate an intent
with its request or response; it does not identify the user, extension, or target entity.

| Property | Type   | Required | Default | Details                                                                                                                                                                                   |
|----------|--------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`     | string | Yes      |         | Unique identifier string for the intent invocation. Opaque correlation value supplied by the producer. Preserve the value unchanged when forwarding or responding to the same invocation. |

### Context

Contextual entity identifiers associated with an intent execution.

Context communicates which entities are currently selected or otherwise relevant to an operation. It is supplementary to
the payload and must not be treated as a substitute for an explicit target required by that payload.

| Property   | Type     | Required | Default | Details                                   |
|------------|----------|----------|---------|-------------------------------------------|
| `imageIds` | string[] | No       |         | Optional collection of image identifiers. |

### WithTitle

Base content structure providing an optional title.

Reusable heading metadata for dialog, notification, and view content. The title is optional in this base so that a
consumer can render content that has a description or body without a heading.

| Property | Type   | Required | Default | Details                                                                                                                                                                                            |
|----------|--------|----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `title`  | string | No       |         | Optional headline or primary title text. Short heading intended for a title position in the associated UI. Keep this concise; place explanatory prose in description, subtitle, or details fields. |

### WithSubtitle

Base content structure providing a subtitle.

Reusable secondary text content. This model makes the subtitle required because its consumers use it as the primary
short message when no separate body field is available.

| Property   | Type   | Required | Default | Details                                                                                                                                                                              |
|------------|--------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `subtitle` | string | Yes      |         | Descriptive subtitle or message text. Short supporting message displayed below a title or as the main text of a compact notification. Use details or body fields for longer content. |

### TitleSubtitle

Base content structure providing a title and subtitle.

Composition of the reusable title and subtitle fields for compact content that needs a heading and one supporting line.

Extends [WithTitle](#withtitle).

| Property   | Type   | Required | Default | Details                                                                                                                                                                              |
|------------|--------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `subtitle` | string | Yes      |         | Descriptive subtitle or message text. Short supporting message displayed below a title or as the main text of a compact notification. Use details or body fields for longer content. |

### WithDescription

Base content structure providing a description.

Reusable explanatory text for content that needs a description independent of its heading. The value is plain text and
is not interpreted as markup.

| Property      | Type   | Required | Default | Details                                                                                                                                                                                                  |
|---------------|--------|----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `description` | string | Yes      |         | Descriptive subtitle or explanatory message text. Explanatory text associated with the content. Use this for a short overview; additional or more detailed text can be supplied through a details field. |

### WithDetails

Base content structure providing optional details.

Reusable extended body text, intended for information that is useful but should not be part of the primary heading or
message.

| Property  | Type   | Required | Default | Details                                                                                                                                                                                                       |
|-----------|--------|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `details` | string | No       |         | Optional supplementary details or extended body text. Optional longer-form supporting content. Consumers may present it as secondary or expandable text; it remains plain text rather than a markup document. |

### DescriptionDetails

Base content structure providing a description and optional details.

Composition for explanatory content with a required overview and optional supplementary body text.

Extends [WithDescription](#withdescription).

| Property  | Type   | Required | Default | Details                                                                                                                                                                                                       |
|-----------|--------|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `details` | string | No       |         | Optional supplementary details or extended body text. Optional longer-form supporting content. Consumers may present it as secondary or expandable text; it remains plain text rather than a markup document. |

### TitleDescriptionDetails

Base content structure providing a title, description, and optional details.

Combines required descriptive content with an additional required title, suitable for cards where a heading and
explanatory body are both needed.

Extends [DescriptionDetails](#descriptiondetails).

| Property | Type   | Required | Default | Details                                     |
|----------|--------|----------|---------|---------------------------------------------|
| `title`  | string | Yes      |         | Primary title text displayed in the header. |

### ResourceUrl

Resource reference pointing to an external or local URL.

Use a URL reference when the resource is available to the consumer through a location rather than inline bytes. The
value is interpreted according to the resource consumer and may refer to remote or local content.

| Property | Type   | Required | Default | Details                                                                                |
|----------|--------|----------|---------|----------------------------------------------------------------------------------------|
| `url`    | string | Yes      |         | Resource destination URL. Location from which the front-end can retrieve the resource. |

### ResourceContent

Resource payload containing raw binary data.

Use this representation to transfer a resource as bytes in the intent payload instead of requiring the consumer to
resolve a separate URL.

| Property  | Type  | Required | Default | Details                                                                                                                                                                                       |
|-----------|-------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `content` | bytes | Yes      |         | Raw binary byte content of the resource. Complete binary representation of the resource. The consumer is responsible for interpreting the bytes in the context in which the resource is used. |

### TitleDescriptionDetailsIcon

Base content structure extending TitleDescriptionDetails with an optional icon resource.

Combines a title and explanatory text with an optional icon for headers and notification cards. The icon can be supplied
by URL or as bytes through Resource.

Extends [TitleDescriptionDetails](#titledescriptiondetails).

| Property | Type                                                               | Required | Default | Details                                                                                                                                                                                                                           |
|----------|--------------------------------------------------------------------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `icon`   | [ResourceUrl](#resourceurl) \| [ResourceContent](#resourcecontent) | No       |         | Optional visual icon resource — supplied as a URL or binary bytes. Decorative or identifying image for the content header. Choose a URL for separately hosted assets or inline bytes when the asset must travel with the payload. |

### TitleSubtitleDescriptionDetailsIcon

Base content structure extending title, subtitle, description, and details content with an optional icon.

Combines the common heading and body fields for richer views. The title is required here; subtitle, description, and
details are supplied by the composed content structures, while the icon remains optional.

Extends [TitleSubtitle](#titlesubtitle).

| Property      | Type                                                               | Required | Default | Details                                                                                                                                                                                                       |
|---------------|--------------------------------------------------------------------|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `title`       | string                                                             | Yes      |         | Primary title text. Required concise heading for the content. It is distinct from the supporting subtitle and longer description/details fields.                                                              |
| `details`     | string                                                             | No       |         | Optional supplementary details or extended body text. Optional longer-form supporting content. Consumers may present it as secondary or expandable text; it remains plain text rather than a markup document. |
| `description` | string                                                             | Yes      |         | Descriptive subtitle or explanatory message text. Explanatory text associated with the content. Use this for a short overview; additional or more detailed text can be supplied through a details field.      |
| `icon`        | [ResourceUrl](#resourceurl) \| [ResourceContent](#resourcecontent) | No       |         | Optional visual icon resource — supplied as a URL or binary bytes. Optional image accompanying the content heading. Its resource can be inline or externally located, as described by Resource.               |

### DialogContent

Textual content configuration for modal dialogs and notification cards.

Convenience model for dialog text that requires a title and description with optional details, without an icon or size
preference.

Extends [TitleDescriptionDetails](#titledescriptiondetails).

_No properties._

### DialogIconContent

Dialog content structure extending TitleDescriptionDetailsIcon with an optional icon resource.

Adds the optional resource icon to standard title and description content for dialogs.

Extends [TitleDescriptionDetailsIcon](#titledescriptiondetailsicon).

_No properties._

### DialogIconSizeContent

Dialog content structure extending DialogIconContent with a modal window size preference.

Controls the preferred width class of a modal dialog. The front-end may choose an appropriate actual width for its
viewport when the preference is automatic or a fixed size cannot fit.

Extends [DialogIconContent](#dialogiconcontent).

| Property | Type                                        | Required | Default | Details                                                                                                                                                                                                  |
|----------|---------------------------------------------|----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `size`   | "auto" \| "xs" \| "s" \| "m" \| "l" \| "xl" | No       |         | Modal dialog window size variant. Preferred modal size. Use auto when content should determine a suitable width; named sizes express a relative front-end-defined width rather than a pixel measurement. |

### FormContent

Form configuration containing JSON Schema fields and optional dialog presentation settings.

The parameters value is a JSON Schema object used by the front-end to construct inputs and validate submitted values.
Dialog content controls the surrounding modal presentation; it does not change the parameter schema.

| Property        | Type                                            | Required | Default | Details                                                                                                                                                                                                                                                                                                                                |
|-----------------|-------------------------------------------------|----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `parameters`    | Record&lt;string, unknown&gt;                   | Yes      |         | JSON Schema specification describing form parameters, input types, default values, and validation rules. JSON Schema object describing the fields to render, including their types, titles, defaults, and validation constraints. Define an object schema with named properties so collected values can be returned as a keyed object. |
| `dialogContent` | [DialogIconSizeContent](#dialogiconsizecontent) | No       |         | Optional presentation settings for the modal dialog housing the form. Optional title, descriptive content, icon, and preferred size for the form dialog. Leave this out when the form can use the front-end's default dialog presentation.                                                                                             |

### UISidebarIntegration

UI integration configuration for mounting an extension view inside the collateral sidebar.

Selects the front-end's sidebar host as the integration point. The external flag allows the view to be presented in an
independent window instead of occupying the docked sidebar surface.

| Property     | Type      | Required | Default | Details                                                                                                                                                                                                                                                                                       |
|--------------|-----------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `anchor`     | "sidebar" | Yes      |         | Layout anchor discriminator specifying sidebar placement. Literal integration discriminator for the sidebar variant. Keep it set to sidebar so consumers can distinguish this payload from other integration modes.                                                                           |
| `isExternal` | boolean   | Yes      |         | Whether the sidebar view should open in an external window rather than docked directly in the sidebar. When true, asks the front-end to open the sidebar-backed view in a separate window. When false, the view is embedded in the sidebar; this flag does not change the integration anchor. |

### UIWindowIntegration

UI integration configuration for rendering an extension view inside an independent window.

Selects a standalone host window without additional window-specific options in this contract.

| Property | Type     | Required | Default | Details                                                                                                                        |
|----------|----------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------|
| `anchor` | "window" | Yes      |         | Layout anchor discriminator specifying window placement. Literal integration discriminator for the independent-window variant. |

### UIModalIntegration

UI integration configuration for rendering an extension view inside a modal dialog.

Selects a front-end-managed modal as the host surface for the embedded extension view.

| Property | Type    | Required | Default | Details                                                                                                          |
|----------|---------|----------|---------|------------------------------------------------------------------------------------------------------------------|
| `anchor` | "modal" | Yes      |         | Layout anchor discriminator specifying modal placement. Literal integration discriminator for the modal variant. |

### UITabIntegration

UI integration configuration for rendering an extension view inside a tab.

Selects a dedicated front-end tab as the host surface for the embedded extension view.

| Property | Type  | Required | Default | Details                                                                                                      |
|----------|-------|----------|---------|--------------------------------------------------------------------------------------------------------------|
| `anchor` | "tab" | Yes      |         | Layout anchor discriminator specifying tab placement. Literal integration discriminator for the tab variant. |

### UrlContent

Embedded frame content specified by a web URL.

URL-backed frame content is loaded by the front-end. The target must be reachable from that front-end's environment and
should use an appropriate secure scheme.

| Property | Type   | Required | Default | Details                                                                                                                                                                        |
|----------|--------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `url`    | string | Yes      |         | Target web URL to load inside the embedded frame. Address of the web document to load. The frame host must be able to reach the location; use a secure URL for remote content. |

### HtmlContent

Embedded frame content specified by raw inline HTML markup.

Inline document content supplied as a string. It is rendered by the host frame rather than fetched as a separate page;
callers should not assume access to the host application's privileges.

| Property | Type   | Required | Default | Details                                                                                                                                                                                                                                                 |
|----------|--------|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `html`   | string | Yes      |         | Raw HTML markup string to render directly inside the embedded frame. HTML source rendered as the frame document. The TypeSpec contract treats it as an opaque string and does not validate markup or grant access to the host application's privileges. |

### Ui

Complete specification for embedding a custom extension user interface within the front-end.

The front-end uses id to identify the view, integration to choose its host surface, and frameContent to load its
contents. dialogContent supplies optional header metadata where the selected integration supports it.

| Property        | Type                                                                                                                                                                               | Required | Default | Details                                                                                                                                                                                                                                                                           |
|-----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`            | string                                                                                                                                                                             | Yes      |         | Unique identifier for the UI instance or transient panel. Identifier for this view instance. Supply a stable identifier when the front-end should recognize the same registered view across invocations; otherwise use an identifier appropriate to the transient view lifecycle. |
| `integration`   | [UISidebarIntegration](#uisidebarintegration) \| [UIWindowIntegration](#uiwindowintegration) \| [UIModalIntegration](#uimodalintegration) \| [UITabIntegration](#uitabintegration) | Yes      |         | Placement strategy defining where and how the UI is mounted. Discriminated integration configuration. The anchor selects a supported host surface, while fields on that specific variant refine its presentation.                                                                 |
| `frameContent`  | [UrlContent](#urlcontent) \| [HtmlContent](#htmlcontent)                                                                                                                           | Yes      |         | Web content to render inside the frame — either a URL or raw HTML. Content source for the embedded frame. Supply one supported variant; use a URL for hosted application content or inline HTML for a self-contained document.                                                    |
| `dialogContent` | [DialogIconContent](#dialogiconcontent)                                                                                                                                            | No       |         | Optional header title, description, and icon metadata for the view. Optional display metadata associated with the embedded view. It does not control the integration anchor or the content rendered within the frame.                                                             |

### OpenBrowser

Parameters for opening an external web URL in the user's default browser.

This payload targets external browser navigation rather than an embedded UI frame. The operating system or front-end
handles the actual hand-off to the default browser.

| Property | Type   | Required | Default | Details                                                                                                                                       |
|----------|--------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| `url`    | string | Yes      |         | Destination web URL to open externally in the default browser. External destination passed to the platform's default browser. — Format: `url` |

### Frame

Embedded frame configuration rendered within a dialog modal.

The frame embeds URL- or HTML-based content in a dialog body. Its height is expressed as a percentage of the available
dialog height so that the front-end can adapt the frame to the dialog's rendered dimensions.

| Property  | Type                                                     | Required | Default | Details                                                                                                                                                                                                                                                                       |
|-----------|----------------------------------------------------------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `content` | [UrlContent](#urlcontent) \| [HtmlContent](#htmlcontent) | Yes      |         | Embedded web content to render inside the dialog frame. Source for the embedded content. The selected FrameContent variant determines whether the front-end loads a URL or renders supplied markup.                                                                           |
| `height`  | int                                                      | Yes      |         | Frame height expressed as a percentage of available dialog height (0 to 100). Relative height request, bounded from 0 through 100. A value of 100 requests the full available dialog height; the final rendered dimensions remain controlled by the front-end. — Range: 0–100 |

### DialogButtons

Button label configuration for interactive dialog actions.

Defines user-visible text for the dialog's affirmative choice and optional secondary choice. These labels are
presentation strings, not command identifiers.

| Property | Type   | Required | Default | Details                                                                                                                                                                                                           |
|----------|--------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `yes`    | string | Yes      |         | Label text for the primary affirmative / confirmation button. Text shown for the affirmative action. Keep it specific to the requested decision when possible.                                                    |
| `no`     | string | No       |         | Optional label text for the secondary negative / cancellation button. Text shown for the secondary choice, commonly a cancellation label. Omission leaves that choice to the front-end's default dialog behavior. |

### Dialog

Configuration for interactive modal dialogs displaying notices, confirmation questions, or embedded frames.

Defines the dialog's semantic type and user-facing content, with optional embedded content and button labels. Use
question for a decision that requires an explicit response; other types communicate status or errors.

Extends [DialogIconSizeContent](#dialogiconsizecontent).

| Property  | Type                            | Required | Default | Details                                                                                                                                                                                                                               |
|-----------|---------------------------------|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`    | [DialogType](#dialogtype)       | Yes      |         | Semantic dialog type — error, info, or question. Selects the dialog's interaction and visual treatment. Use question when the caller needs a yes/no choice, and error or info for non-question messages.                              |
| `frame`   | [Frame](#frame)                 | No       |         | Optional embedded HTML or URL frame rendered inside the dialog body. Optional embedded content displayed within the dialog. Omit it for text-only dialogs; when present, content should be suitable for the dialog's available space. |
| `buttons` | [DialogButtons](#dialogbuttons) | Yes      |         | Button label definitions for user response choices. Labels for the affirmative action and optional secondary cancellation action. The front-end determines the button behavior and returns the user's choice to the intent caller.    |

### Image

Individual image descriptor for gallery presentation.

An image entry references an existing image by identifier and may override or augment its displayed textual details.

| Property  | Type                                                | Required | Default | Details                                                                                                                                                                                                                                         |
|-----------|-----------------------------------------------------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `imageId` | string                                              | Yes      |         | Unique identifier of the image in repositories. Identifier used by the front-end to resolve the image from its repositories. This is a image identifier, not an image URL or binary payload.                                                    |
| `details` | [TitleDescriptionDetails](#titledescriptiondetails) | No       |         | Optional title, description, or detail text for the individual image. Optional display metadata associated with this image entry. The front-end can use it as a per-image caption or descriptive context without changing the referenced image. |

### ImagesContent

Content configuration for image gallery presentation containing title, subtitle, description, details, and an optional
icon.

Header metadata specialized for the image gallery tab. It reuses the common content fields so gallery presentation
follows the same title, text, and icon conventions as other views.

Extends [TitleSubtitleDescriptionDetailsIcon](#titlesubtitledescriptiondetailsicon).

_No properties._

### Images

Collection of image items displayed inside a dedicated gallery tab.

Pairs the gallery's image entries with the header content shown above them. Each entry points to an existing image; this
model does not carry image bytes.

| Property  | Type                            | Required | Default | Details                                                                                                                                                             |
|-----------|---------------------------------|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `images`  | [Image](#image)[]               | Yes      |         | List of image items to display in the gallery tab. Ordered gallery entries. The sequence supplied here is the order in which images are presented by the front-end. |
| `content` | [ImagesContent](#imagescontent) | Yes      |         | Header content configuration for the image gallery tab. Title, subtitle, description, details, and optional icon for the gallery view header.                       |

### Show

Navigation payload targeting a specific view, panel, or entity.

Combines a front-end-recognized view category with the identifier needed to resolve the destination. Valid identifier
formats depend on the selected view type.

| Property | Type                  | Required | Default | Details                                                                                                                                                                                                                                                                       |
|----------|-----------------------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`   | [ShowType](#showtype) | Yes      |         | Target view or entity category discriminator. Selects which front-end surface or entity resolver handles the navigation request. The id property must identify an entity compatible with this category.                                                                       |
| `id`     | string                | Yes      |         | Unique identifier of the target entity — such as an image ID, repository ID, sidebar UUID, or extension ID. Identifier consumed by the selected destination resolver, for example an image ID for image, repository ID for repository, or extension ID for extensionSettings. |

### Toast

Configuration payload for brief, non-intrusive toast notifications.

Toast content is intended for transient status feedback rather than a durable notification or an interaction requiring a
decision.

Extends [TitleSubtitle](#titlesubtitle).

| Property | Type                    | Required | Default | Details                                                                                                                                                                     |
|----------|-------------------------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`   | [ToastType](#toasttype) | Yes      |         | Visual style and severity variant of the toast. Controls the font-end-side visual treatment and communicates the message category; it does not alter the notification text. |

### Notification

Notification payload for notification center cards or native desktop notifications.

Provides content and delivery preferences for a notification. The consumer can route it to the in-app notification
center, the operating system notification manager, or both according to its supported behavior.

Extends [TitleSubtitle](#titlesubtitle).

| Property   | Type    | Required | Default | Details                                                                                                                                                                                                                                                                          |
|------------|---------|----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `title`    | string  | Yes      |         | Primary notification title heading. Short heading shown as the notification's primary label.                                                                                                                                                                                     |
| `body`     | string  | Yes      |         | Detailed notification message body. Main explanatory text shown with the notification title and subtitle. Keep the body understandable when the user sees it outside the surrounding application context.                                                                        |
| `silent`   | boolean | Yes      |         | Whether audio alert chimes and sounds should be suppressed. Set true when delivery should not produce an audible alert. This preference does not suppress the visual notification.                                                                                               |
| `icon`     | bytes   | No       |         | Optional raw binary image icon displayed with the notification. Image bytes supplied for the notification icon. The target notification surface may apply its own size and format constraints.                                                                                   |
| `isNative` | boolean | Yes      |         | Whether the notification is dispatched through the operating system native desktop notification manager. Selects native desktop notification delivery when true. When false, the front-end notification center is the target; actual OS behavior is subject to platform support. |

### ProcessCommand

Specification identifying an extension command for programmatic invocation.

A command is resolved within its owning extension, so both identifiers are required to avoid ambiguity across installed
extensions.

| Property      | Type   | Required | Default | Details                                                                                                                                                                                                           |
|---------------|--------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `extensionId` | string | Yes      |         | Unique identifier of the extension owning the target command. Identifier of the installed extension that registers the command. It scopes commandId to the correct extension.                                     |
| `commandId`   | string | Yes      |         | Unique identifier of the command to execute on the extension. Identifier of the command registered by the owning extension. The extension's command handler determines the accepted input and execution behavior. |

### Action

Interactive action card configuration bundling an executable intent triggered by a notification button.

Combines user-facing card content and an executable intent. The notification center can present the card and dispatch
the nested intent only after the user activates its action.

| Property        | Type                                                                                                                                           | Required | Default | Details                                                                                                                                                                                                                              |
|-----------------|------------------------------------------------------------------------------------------------------------------------------------------------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `intent`        | [ShowIntent](#showintent) \| [UiIntent](#uiintent) \| [OpenBrowserIntent](#openbrowserintent) \| [ProcessCommandIntent](#processcommandintent) | Yes      |         | Underlying intent executed when the user confirms the action button. Intent dispatched as the action's effect. Only the supported intent variants are accepted; the action itself does not execute or validate the nested operation. |
| `dialogContent` | [DialogIconSizeContent](#dialogiconsizecontent)                                                                                                | Yes      |         | Header title, description, details, icon, and sizing configuration for the action card. User-facing card content displayed with the action button.                                                                                   |
| `label`         | string                                                                                                                                         | No       |         | Optional label text for the action confirmation button. Optional concise text for the button that activates the nested intent.                                                                                                       |

### ServeBundle

Configuration for uploading and hosting a static web application bundle on the back-end.

The server accepts a ZIP archive of static assets and hosts it for use in an embedded frame. Configuration is passed to
the served application separately from the archive contents.

| Property   | Type                          | Required | Default | Details                                                                                                                                                                                                                                                                                                      |
|------------|-------------------------------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `content`  | bytes                         | Yes      |         | Binary ZIP archive payload containing static web application assets (HTML, CSS, JS). ZIP-encoded bundle containing the entry HTML document and its static dependencies. The archive must be suitable for extraction and static hosting; this property is the archive bytes, not a URL to an existing bundle. |
| `settings` | Record&lt;string, unknown&gt; | No       |         | Optional initial configuration parameters or settings forwarded to the served bundle. JSON-compatible key/value settings made available to the hosted application when it is initialized.                                                                                                                    |

### ReadFile

Parameters for prompting the user to select an existing file through a native file picker dialog.

Specifies the filters and prompt used by the host's file picker. The selected file content is returned by the
corresponding read-file operation.

| Property     | Type     | Required | Default | Details                                                                                                                                                                                                                                       |
|--------------|----------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `extensions` | string[] | No       |         | Optional list of allowed file extension filters (e.g. ['json', 'png']). File extensions offered as selection filters. Supply extensions without a leading dot; omit this field to leave the available file types unrestricted by the request. |
| `message`    | string   | Yes      |         | Informational dialog prompt message displayed to the user during file selection. User-facing prompt describing what file should be selected. It is informational and does not enforce the extension filters.                                  |

### WriteFile

Parameters for prompting the user to save a file to disk through a native file save dialog.

Specifies the suggested output name, extension, bytes, and prompt for a host-managed save dialog. The host controls the
destination path and confirms the write with the user.

| Property    | Type   | Required | Default | Details                                                                                                                                                                                                    |
|-------------|--------|----------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `name`      | string | Yes      |         | Default suggested filename without extension. Suggested base name shown in the save dialog. Keep the extension in its separate property to avoid a duplicated suffix.                                      |
| `extension` | string | Yes      |         | File extension to apply to the saved file. Suffix associated with the saved file. Supply the extension expected by the content format, without relying on the host to infer it from the bytes.             |
| `content`   | bytes  | Yes      |         | Binary byte content to write to disk upon user confirmation. Complete file payload written if the user confirms the save operation.                                                                        |
| `message`   | string | Yes      |         | Informational dialog prompt message displayed to the user during file saving. User-facing explanation of the file being saved. It supplements the suggested name and does not choose the destination path. |

## Enums

### UiAnchor

Target layout anchor where an embedded extension user interface should be integrated.

The selected anchor is the discriminator for the supported integration surface. Its string value is part of the
serialized intent contract and must match one of these declared choices.

| Member        | Value         | Description                                             |
|---------------|---------------|---------------------------------------------------------|
| `modal`       | `modal`       | Rendered inside a centered or full-screen modal dialog. |
| `sidebar`     | `sidebar`     | Docked within the collateral sidebar navigation.        |
| `window`      | `window`      | Rendered inside an independent floating desktop window. |
| `imageDetail` | `imageDetail` | Embedded within the image detail inspection view.       |
| `tab`         | `tab`         | Displayed within a dedicated tab.                       |

### DialogType

Semantic classification and visual styling category of a modal dialog.

| Member     | Value      | Description                                                       |
|------------|------------|-------------------------------------------------------------------|
| `error`    | `error`    | Error notice dialog indicating a failure or critical condition.   |
| `info`     | `info`     | Informational dialog displaying status, instructions, or notices. |
| `question` | `question` | Question or confirmation prompt requiring explicit user decision. |

### ShowType

Target view or entity type to display in the front-end.

| Member              | Value               | Description                               |
|---------------------|---------------------|-------------------------------------------|
| `sidebar`           | `sidebar`           | Registered collateral sidebar panel.      |
| `extensionSettings` | `extensionSettings` | Extension settings configuration modal.   |
| `image`             | `image`             | Full-screen image detail inspection view. |
| `repository`        | `repository`        | Repository details and contents view.     |

### ToastType

Visual style and severity variant for toast notifications.

| Member   | Value    | Description                                                             |
|----------|----------|-------------------------------------------------------------------------|
| `info`   | `info`   | Informational toast indicating general status or successful completion. |
| `cancel` | `cancel` | Cancellation toast indicating an operation was aborted or cancelled.    |
| `error`  | `error`  | Error toast indicating a failure or warning condition.                  |

## Unions

### Resource

Resource descriptor providing content either via URL or raw binary bytes.

Exactly one resource representation is selected by the union variant: a resolvable location or inline binary data.
Prefer URL references for reusable hosted assets and byte content when the payload must be self-contained.

| Variant | Type                                |
|---------|-------------------------------------|
| 1       | [ResourceUrl](#resourceurl)         |
| 2       | [ResourceContent](#resourcecontent) |

### UIIntegration

Union of supported UI integration placement strategies.

Discriminated by each integration model's anchor field. Use the matching variant model so the anchor and any
surface-specific settings remain consistent.

| Variant | Type                                          |
|---------|-----------------------------------------------|
| 1       | [UISidebarIntegration](#uisidebarintegration) |
| 2       | [UIWindowIntegration](#uiwindowintegration)   |
| 3       | [UIModalIntegration](#uimodalintegration)     |
| 4       | [UITabIntegration](#uitabintegration)         |

### FrameContent

Union of supported embedded frame content formats — URL or inline HTML.

Selects exactly one source for frame contents. The URL and inline HTML variants are alternative transport forms, not
fields to combine in one value.

| Variant | Type                        |
|---------|-----------------------------|
| 1       | [UrlContent](#urlcontent)   |
| 2       | [HtmlContent](#htmlcontent) |
