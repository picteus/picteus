import "@typespec/json-schema";
import "./base.tsp";
import "./modifiers.tsp";
import "./primitives.tsp";
import "./structures.tsp";
import "./actions.tsp";
import "./escapeHatches.tsp";

using TypeSpec.JsonSchema;

namespace Picteus.ViewKit;

@summary("Base envelope containing the schema version.")
@doc("All root ViewKit documents extend this envelope so consumers can identify the schema contract version before processing the root content.")
model Envelop {
  @summary("Schema specification version")
  @doc("Version of the ViewKit envelope contract. It is a literal value and should be preserved when serializing or forwarding a document.")
  schemaVersion: "1.0" = "1.0";
}

@summary("Root container holding an ordered list of visual elements.")
@doc("Provides the shared root content collection inherited by cards and other root models. The order of elements is significant and is preserved by the renderer.")
@jsonSchema
@dslRoot
@uiLayout("repeating-group")
model UiContainer extends Envelop {
  @summary("Ordered list of visual elements, structures, and content")
  @doc("Top-level visual content in render order. Use a structural element to group related children and primitive elements for individual values.")
  elements: UiElement[];
}

@summary("Root container for a complete feature card.")
@doc("A complete card has a required title and ordered content inherited from UiContainer. It is designed for the feature-card surface; description and actions supplement the content, with action controls rendered separately from the element list.")
@jsonSchema
@dslRoot
@uiLayout("card")
model UiCard extends UiContainer {
  @summary("Human-readable feature title displayed in the card header")
  @doc("Primary heading for the card. Keep it concise enough for the card header; longer explanatory text belongs in description or elements.")
  title: string;

  @summary("Optional neutral subtitle / description for the feature")
  @doc("Brief secondary context shown with the title. Use the content elements for detailed information rather than placing an entire report in this field.")
  description?: string;

  @summary("Optional card action buttons rendered at the base of the feature card")
  @doc("Optional user-invokable actions shown after the card content. Their order is preserved and each action's own fields define its command or link behavior.")
  actions?: UiAction[];
}
