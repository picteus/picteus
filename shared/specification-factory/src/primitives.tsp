import "./base.tsp";
import "./modifiers.tsp";

namespace Picteus.ViewKit;

@doc("Visual presentation style for string values.")
enum StringRepresentation {
  @doc("Standard inline text rendering")
  plain: "plain",

  @doc("Visual chip / tag pill representation")
  chip: "chip",

  @doc("Multiline text with preserved whitespace and line breaks")
  multiline: "multiline"
}

@doc("""
  Universal textual string primitive element.
  Supports plain text, compact chip pill, or multiline pre-wrapped presentation.
  """)
@uiWidget("string")
model StringElement extends UiElement {
  @doc("Discriminator type")
  type: "string";

  @doc("Text value")
  value: string;

  @doc("Display representation mode")
  representation?: StringRepresentation = StringRepresentation.plain;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Visual separator rendered between sequential elements or items.")
enum Separator {
  @doc("Vertical dividing bar")
  bar: "bar",

  @doc("Comma separator")
  comma: "comma",

  @doc("Bullet dot separator")
  dot: "dot",

  @doc("Forward slash separator")
  slash: "slash",

  @doc("Dash separator")
  dash: "dash",

  @doc("Space separator")
  space: "space"
}

@doc("""
  Collection of textual string values rendered as a sequence of inline items or chips.
  Supports visual separators (comma, dot, slash, bar, dash, space) and copyable affordance.
  """)
@uiWidget("strings")
model StringsElement extends UiElement {
  @doc("Discriminator type")
  type: "strings";

  @doc("Array of string values")
  values: string[];

  @doc("Display representation mode (plain text or visual chips)")
  representation?: StringRepresentation = StringRepresentation.plain;

  @doc("Optional visual separator rendered between sequential values")
  separator?: Separator;

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

  @doc("Aspect ratio numerical expression")
  value: decimal;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Image dimensions representation displaying formatted width and height in pixels.")
@uiWidget("dimensions")
model DimensionsElement extends UiElement {
  @doc("Discriminator type")
  type: "dimensions";

  @doc("Width in pixels")
  @minValue(1)
  width: integer;

  @doc("Height in pixels")
  @minValue(1)
  height: integer;

  @doc("Optional visual modifiers (copyable)")
  @uiModifiers
  modifiers?: BaseModifiers;
}

@doc("Single color representation with hex value, shape/size styling, text display toggle, and copy affordance.")
@uiWidget("color")
@dslAlias("color")
model ColourElement extends UiElement {
  @doc("Discriminator type")
  type: "color";

  @doc("Hexadecimal color code")
  value: string;

  @doc("Optional descriptive color name label")
  label?: string;

  @doc("Whether to display the textual color code or label next to the swatch")
  showText?: boolean = true;

  @doc("Visual shape of the color indicator")
  shape?: Shape = Shape.circle;

  @doc("Visual size of the color indicator")
  size?: Size = Size.medium;

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

@doc("Visual presentation style for boolean values.")
enum BooleanRepresentation {
  @doc("Standard inline text rendering (e.g. \"true\" / \"false\" or custom labels)")
  plain: "plain",

  @doc("Visual badge pill representation")
  badge: "badge"
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

@doc("""
  Universal boolean primitive element.
  Supports standard plain text or badge pill presentation with customizable labels and variants.
  """)
@uiWidget("boolean")
model BooleanElement extends UiElement {
  @doc("Discriminator type")
  type: "boolean";

  @doc("Boolean state value")
  value: boolean;

  @doc("Display representation mode")
  representation?: BooleanRepresentation = BooleanRepresentation.plain;

  @doc("Custom display label when true (defaults to \"true\")")
  trueLabel?: string = "true";

  @doc("Custom display label when false (defaults to \"false\")")
  falseLabel?: string = "false";

  @doc("Badge color tone when rendered as badge")
  variant?: BadgeVariant = BadgeVariant.neutral;

  @doc("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@doc("Presentation format styles for timestamp elements.")
enum TimestampFormat {
  @doc("Complete date and time display")
  datetime: "datetime",

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

  @doc("The timestamp in milliseconds")
  value: int64;

  @doc("Presentation date/time format")
  format?: TimestampFormat = TimestampFormat.datetime;

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
