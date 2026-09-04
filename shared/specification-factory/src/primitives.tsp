import "./base.tsp";
import "./modifiers.tsp";

namespace Picteus.ViewKit;

@doc("Representation style for short string values.")
enum StringShortRepresentation {
  @doc("Standard plain text rendering")
  plain: "plain",

  @doc("Visual chip / tag pill representation")
  chip: "chip"
}

@doc("""
  Short string primitive element.
  Supports plain text or compact chip pill presentation.
  """)
@uiWidget("string-short")
model StringShortElement extends UiElement {
  @doc("Discriminator type")
  type: "string-short";

  @doc("Text value")
  value: string;

  @doc("Display representation mode")
  representation?: StringShortRepresentation = StringShortRepresentation.plain;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Multiline text block primitive element for descriptions, comments, or prose.")
@uiWidget("string-long")
model StringLongElement extends UiElement {
  @doc("Discriminator type")
  type: "string-long";

  @doc("Text value")
  value: string;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Supported syntax highlighting languages for formatted code blocks.")
enum CodeLanguage {
  @doc("XML markup syntax")
  xml: "xml",

  @doc("JSON format syntax")
  json: "json",

  @doc("YAML format syntax")
  yaml: "yaml"
}

@doc("Monospace code block or formatted code snippet representation.")
@uiWidget("string-code")
@customRenderer
model StringCodeElement extends UiElement {
  @doc("Discriminator type")
  type: "string-code";

  @doc("Text value")
  value: string;

  @doc("Optional syntax highlighting language identifier")
  language?: CodeLanguage;

  @doc("Optional visual modifiers (copyable)")
  @uiModifiers
  modifiers?: BaseModifiers;
}

@doc("XML markup code block element.")
@uiWidget("xml")
@dslAlias("xml")
@customRenderer
model XmlElement extends UiElement {
  @doc("Discriminator type")
  type: "xml";

  @doc("XML content value")
  value: string;

  @doc("Optional visual modifiers (copyable)")
  @uiModifiers
  modifiers?: BaseModifiers;
}

@doc("JSON data or structure representation element.")
@uiWidget("json")
@dslAlias("json")
@customRenderer
model JsonElement extends UiElement {
  @doc("Discriminator type")
  type: "json";

  @doc("JSON content value")
  value: string;

  @doc("Optional visual modifiers (copyable)")
  @uiModifiers
  modifiers?: BaseModifiers;
}

@doc("Hyperlink representation for external or internal URL navigation.")
@uiWidget("string-url")
model StringUrlElement extends UiElement {
  @doc("Discriminator type")
  type: "string-url";

  @doc("Target URL or navigation destination")
  value: string;

  @doc("Optional custom anchor text label")
  label?: string;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Monospace semantic identifier representation.")
@uiWidget("identifier")
model IdentifierElement extends UiElement {
  @doc("Discriminator type")
  type: "identifier";

  @doc("Identifier string value")
  value: string;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Aspect ratio representation (e.g. \"16:9\", \"4:3\", \"1:1\").")
@uiWidget("ratio")
model RatioElement extends UiElement {
  @doc("Discriminator type")
  type: "ratio";

  @doc("Aspect ratio textual expression")
  value: string;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Single color swatch representation with hex value and copy affordance.")
@uiWidget("color-swatch")
@dslAlias("colorSwatch")
model ColourElement extends UiElement {
  @doc("Discriminator type")
  type: "color-swatch";

  @doc("Hexadecimal color code")
  value: string;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Plain unbounded numeric value primitive element.")
@uiWidget("number-unbounded")
model NumberUnboundedElement extends UiElement {
  @doc("Discriminator type")
  type: "number-unbounded";

  @doc("Numeric value")
  value: float64;

  @doc("Optional unit suffix (e.g. \"px\", \"ms\", \"MB\")")
  unit?: string;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Bounded numeric rating represented as visual stars.")
@uiWidget("number-stars")
@dslAlias("numberStars")
model NumberBoundedStarsElement extends UiElement {
  @doc("Discriminator type")
  type: "number-stars";

  @doc("Numeric rating score")
  value: float64;

  @doc("Maximum rating scale (defaults to 5)")
  @uiMeterBound("maximum")
  maximum?: float64 = 5;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Bounded numeric meter representation (read-only progress / score bar).")
@uiWidget("meter")
@dslAlias("numberMeter")
model NumberBoundedMeterElement extends UiElement {
  @doc("Discriminator type")
  type: "number-meter";

  @doc("Numeric value")
  value: float64;

  @doc("Minimum scale bound (defaults to 0)")
  @uiMeterBound("minimum")
  minimum?: float64 = 0;

  @doc("Maximum scale bound (e.g. 100)")
  @uiMeterBound("maximum")
  maximum?: float64 = 100;

  @doc("Optional custom text label override (e.g. \"68 / 100\")")
  @uiMeterBound("label")
  label?: string;

  @doc("Optional unit suffix (e.g. \"%\")")
  @uiMeterBound("unit")
  unit?: string;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Plain boolean value representation (textual \"true\" / \"false\").")
@uiWidget("boolean-plain")
model BooleanPlainElement extends UiElement {
  @doc("Discriminator type")
  type: "boolean-plain";

  @doc("Boolean state value")
  value: boolean;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Visual color tone variants for badge pill representations.")
enum BadgeVariant {
  @doc("Neutral gray tone")
  neutral: "neutral",

  @doc("Success green tone")
  success: "success",

  @doc("Warning yellow/orange tone")
  warning: "warning",

  @doc("Danger red tone")
  danger: "danger"
}

@doc("Visual badge pill representation of a boolean state.")
@uiWidget("boolean-badge")
model BooleanBadgeElement extends UiElement {
  @doc("Discriminator type")
  type: "boolean-badge";

  @doc("Boolean state value")
  value: boolean;

  @doc("Custom display label when true (defaults to \"true\")")
  trueLabel?: string = "true";

  @doc("Custom display label when false (defaults to \"false\")")
  falseLabel?: string = "false";

  @doc("Badge color tone")
  variant?: BadgeVariant = BadgeVariant.neutral;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Presentation format styles for timestamp elements.")
enum TimestampFormat {
  @doc("Complete date and time display")
  full: "full",

  @doc("Date-only display")
  date: "date",

  @doc("Time-only display")
  time: "time",

  @doc("Relative time expression (e.g. \"5 minutes ago\")")
  relative: "relative"
}

@doc("Formatted date and time representation.")
@uiWidget("timestamp")
model TimestampElement extends UiElement {
  @doc("Discriminator type")
  type: "timestamp";

  @doc("ISO 8601 date string or epoch timestamp in milliseconds")
  value: string;

  @doc("Presentation date/time format")
  format?: TimestampFormat = TimestampFormat.full;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Thumbnail image reference with placeholder fallback handling.")
@uiWidget("image-ref")
@dslAlias("imageRef")
model ImageReferenceElement extends UiElement {
  @doc("Discriminator type")
  type: "image-ref";

  @doc("Image source URI (HTTPS URL, base64 data URI, or asset path)")
  src: string;

  @doc("Accessible alternative description")
  alt?: string;

  @doc("Aspect ratio of the thumbnail container")
  aspectRatio?: string = "1:1";

  @doc("Fallback placeholder image URI")
  placeholder?: string;
}

@doc("Dominant color set palette rendered in descending dominance order.")
@uiWidget("color-set")
@dslAlias("dominantColors")
model DominantColourSetElement extends UiElement {
  @doc("Discriminator type")
  type: "color-set";

  @doc("List of hexadecimal color strings in descending priority")
  colors: string[];
}
