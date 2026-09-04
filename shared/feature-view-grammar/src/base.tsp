namespace Picteus.ViewKit;

@doc("""
  Polymorphic root base model for all visual UI elements in Picteus feature views.
  Uses the @discriminator("type") decorator so all child models inheriting from UiElement
  are automatically recognized by schema emitters and SDK code generators.
  """)
@discriminator("type")
model UiElement {
  @doc("Discriminator property identifying the concrete visual component")
  type: string;
}

@doc("Polymorphic base model for interactive actions.")
@discriminator("type")
model UiAction {
  @doc("Discriminator property")
  type: string;

  @doc("Display label for the action")
  label: string;
}
