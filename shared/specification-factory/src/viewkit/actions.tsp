import "./base.tsp";

namespace Picteus.ViewKit;

@summary("Visual style variants for interactive button actions.")
enum ButtonVariant {
  @summary("Primary emphasis button style for default/recommended actions")
  primary: "primary",

  @summary("Secondary standard button style")
  secondary: "secondary",

  @summary("Subtle low-contrast button style")
  subtle: "subtle",

  @summary("Destructive / dangerous action button style")
  danger: "danger"
}

@summary("Interactive button action triggering an extension command.")
@doc("When activated, the client dispatches commandId to the specified extension and may include target and parameters as command input. disabled and variant affect presentation and availability, not the command's authorization.")
@uiWidget("button-action")
model ButtonActionElement extends UiAction {
  @summary("Discriminator type")
  type: "button";

  @summary("Extension identifier owning the target command")
  @doc("Extension that registers commandId. Omit only when the client can resolve the command in the current extension context.")
  extensionId?: string;

  @summary("Command identifier to invoke")
  @doc("Identifier of the registered extension command to dispatch when the button is activated.")
  commandId: string;

  @summary("Target entity or context identifier")
  @doc("Optional entity or context identifier forwarded to the command handler. Its format is determined by the target extension.")
  target?: string;

  @summary("Optional arbitrary parameters payload forwarded to the command handler")
  @doc("JSON-compatible arguments passed to the extension command. Define and validate their shape in the command implementation.")
  parameters?: Record<unknown>;

  @summary("Whether the button is disabled / unavailable")
  @doc("When true, the client renders the action as unavailable and should not dispatch it from user activation.")
  disabled?: boolean = false;

  @summary("Button visual style variant")
  @doc("Selects the button's emphasis style. Use danger for destructive operations and primary for the main recommended action; the variant does not change behavior.")
  variant?: ButtonVariant = ButtonVariant.secondary;
}

@summary("External link action distinct from inline URL text values.")
@doc("Renders a user-invokable action that opens a destination externally. Use StringUrlElement for a link embedded in content rather than an action control.")
@uiWidget("link-action")
model ExternalLinkActionElement extends UiAction {
  @summary("Discriminator type")
  type: "external-link";

  @summary("Target URL destination")
  @doc("External destination opened when the user activates the link action. The client controls how external navigation is handed to the platform.")
  url: string;
}
