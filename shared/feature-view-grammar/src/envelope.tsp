import "@typespec/json-schema";
import "./base.tsp";
import "./modifiers.tsp";
import "./primitives.tsp";
import "./structures.tsp";
import "./actions.tsp";
import "./escapeHatches.tsp";

using TypeSpec.JsonSchema;

namespace Picteus.FeatureViewGrammar;

@doc("""
  Feature container model representing the visual elements and actions of an image feature.
  """)
@dslRoot
@uiLayout("repeating-group")
model Feature {
  @doc("Schema specification version")
  schemaVersion: "1.0" = "1.0";

  @doc("Ordered list of visual elements, structures, and content")
  elements: UiElement[];

  @doc("Optional card action buttons rendered at the base of the feature card")
  actions?: ActionElement[];
}

@doc("""
  Root Feature Block container model.
  Represents a complete feature card rendered inside the 360px panel.
  """)
@jsonSchema
@dslRoot
@uiLayout("card")
model FeatureBlock extends Feature {
  @doc("Human-readable feature title displayed in the card header")
  title: string;

  @doc("Optional neutral subtitle / description for the feature")
  description?: string;
}

