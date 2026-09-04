import "@typespec/json-schema";
import "./base.tsp";
import "./modifiers.tsp";
import "./primitives.tsp";
import "./structures.tsp";
import "./actions.tsp";
import "./escapeHatches.tsp";

using TypeSpec.JsonSchema;

namespace Picteus.ViewKit;

@doc("""
  Base envelope container model holding the schema version attribute.
  """)
model Envelop {
  @doc("Schema specification version")
  schemaVersion: "1.0" = "1.0";
}

@doc("""
  Container model representing an ordered list of visual elements.
  """)
@dslRoot
@uiLayout("repeating-group")
model UiContainer extends Envelop {
  @doc("Ordered list of visual elements, structures, and content")
  elements: UiElement[];
}

@doc("""
  Root Card container model.
  Represents a complete feature card rendered inside the 360px panel.
  """)
@jsonSchema
@dslRoot
@uiLayout("card")
model UiCard extends UiContainer {
  @doc("Human-readable feature title displayed in the card header")
  title: string;

  @doc("Optional neutral subtitle / description for the feature")
  description?: string;

  @doc("Optional card action buttons rendered at the base of the feature card")
  actions?: UiAction[];
}
