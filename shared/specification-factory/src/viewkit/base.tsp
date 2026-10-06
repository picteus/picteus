namespace Picteus.ViewKit;

@summary("Polymorphic root model for visual UI elements.")
@doc("Every concrete visual element carries a type discriminator whose literal value selects its model and renderer. The @discriminator(\"type\") metadata lets schema emitters and SDK generators represent derived models as a polymorphic hierarchy. Consumers should dispatch on the discriminator and preserve unknown elements when round-tripping data where possible.")
@discriminator("type")
model UiElement {
  @summary("Discriminator property identifying the concrete visual component")
  @doc("Concrete element tag. Derived models narrow this string to a literal such as string, table, or image-ref; it is used for polymorphic decoding and renderer selection.")
  type: string;
}

@summary("Polymorphic base model for interactive actions.")
@doc("Shared action contract for user-invokable card controls. Concrete action models provide their own discriminator and action-specific destination or command fields.")
@discriminator("type")
model UiAction {
  @summary("Discriminator property")
  @doc("Concrete action tag used by clients to select the action behavior.")
  type: string;

  @summary("Display label for the action")
  @doc("User-facing label shown on the control. Keep it short and action-oriented.")
  label: string;
}
