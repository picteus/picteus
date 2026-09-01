import "./base.tsp";

namespace Picteus.FeatureViewGrammar;

@doc("Visual style variants for interactive button actions.")
enum ButtonVariant {
  @doc("Primary emphasis button style for default/recommended actions")
  primary: "primary",

  @doc("Secondary standard button style")
  secondary: "secondary",

  @doc("Subtle low-contrast button style")
  subtle: "subtle",

  @doc("Destructive / dangerous action button style")
  danger: "danger",
}

@doc("Interactive button action triggering an extension command.")
model ButtonActionElement extends ActionElement {
  @doc("Discriminator type")
  type: "button";

  @doc("Extension identifier owning the target command")
  extensionId?: string;

  @doc("Command identifier to invoke")
  commandId: string;

  @doc("Target entity or context identifier")
  target?: string;

  @doc("Optional arbitrary parameters payload forwarded to the command handler")
  parameters?: Record<unknown>;

  @doc("Whether the button is disabled / unavailable")
  disabled?: boolean = false;

  @doc("Button visual style variant")
  variant?: ButtonVariant = ButtonVariant.secondary;
}

@doc("External link action distinct from inline URL text values.")
model ExternalLinkActionElement extends ActionElement {
  @doc("Discriminator type")
  type: "external-link";

  @doc("Target URL destination")
  url: string;
}
