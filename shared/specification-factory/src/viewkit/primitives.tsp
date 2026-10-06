import "./base.tsp";
import "./modifiers.tsp";

namespace Picteus.ViewKit;

@summary("Visual presentation style for string values.")
enum StringRepresentation {
  @summary("Standard inline text rendering")
  plain: "plain",

  @summary("Visual chip / tag pill representation")
  chip: "chip",

  @summary("Multiline text with preserved whitespace and line breaks")
  multiline: "multiline"
}

@summary("Text value primitive with selectable inline, chip, or multiline presentation.")
@doc("Use this primitive for one textual value when a structured label/value row is unnecessary. Choose multiline for content whose line breaks should remain visible; modifiers apply presentation traits without changing the underlying value.")
@uiWidget("string")
model StringElement extends UiElement {
  @summary("Discriminator type")
  type: "string";

  @summary("Text value")
  @doc("Text to render. Supply plain text; this field is not a Markdown or HTML document.")
  value: string;

  @summary("Display representation mode")
  @doc("Selects inline, chip, or multiline rendering. The default is plain, so callers can omit this for ordinary text.")
  representation?: StringRepresentation = StringRepresentation.plain;

  @summary("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@summary("Visual separator rendered between sequential elements or items.")
enum Separator {
  @summary("Vertical dividing bar")
  bar: "bar",

  @summary("Comma separator")
  comma: "comma",

  @summary("Bullet dot separator")
  dot: "dot",

  @summary("Forward slash separator")
  slash: "slash",

  @summary("Dash separator")
  dash: "dash",

  @summary("Space separator")
  space: "space"
}

@summary("Collection of textual values rendered as an inline sequence or chips.")
@doc("Use this primitive when several related strings should be rendered as one compact sequence. The client preserves the array order and inserts the selected separator between values.")
@uiWidget("strings")
model StringsElement extends UiElement {
  @summary("Discriminator type")
  type: "strings";

  @summary("Array of string values")
  @doc("Values to render in order. Each array entry remains a distinct item for chip presentation and is not parsed as a delimited string.")
  values: string[];

  @summary("Display representation mode (plain text or visual chips)")
  @doc("Selects whether values appear as ordinary inline text or as separate visual chips. The default uses the plain representation.")
  representation?: StringRepresentation = StringRepresentation.plain;

  @summary("Optional visual separator rendered between sequential values")
  @doc("Separator inserted between adjacent values in plain representation. It does not become part of any value.")
  separator?: Separator;

  @summary("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@summary("Supported syntax highlighting languages for formatted code blocks.")
enum CodeLanguage {
  @summary("XML markup syntax")
  xml: "xml",

  @summary("JSON format syntax")
  json: "json",

  @summary("YAML format syntax")
  yaml: "yaml"
}

@summary("Monospace code block or formatted code snippet representation.")
@doc("Use for source-like or preformatted textual content that should be rendered in a code-oriented style. The language is a presentation hint; the content is not parsed or validated as code by this contract.")
@uiWidget("string-code")
@customRenderer
model StringCodeElement extends UiElement {
  @summary("Discriminator type")
  type: "string-code";

  @summary("Text value")
  @doc("Code or text snippet to display. Include any desired line breaks in this string.")
  value: string;

  @summary("Optional syntax highlighting language identifier")
  @doc("Optional syntax hint for the renderer. Supported values describe highlighting modes and do not validate the snippet's syntax.")
  language?: CodeLanguage;

  @summary("Optional visual modifiers (copyable)")
  @uiModifiers
  modifiers?: BaseModifiers;
}

@summary("XML markup code block element.")
@doc("Specialized code-oriented element for XML content. It uses the custom XML renderer rather than requiring consumers to construct a generic code block.")
@uiWidget("xml")
@dslAlias("xml")
@customRenderer
model XmlElement extends UiElement {
  @summary("Discriminator type")
  type: "xml";

  @summary("XML content value")
  @doc("XML markup to render. The contract carries the source text; it does not guarantee that the document is well-formed.")
  value: string;

  @summary("Optional visual modifiers (copyable)")
  @uiModifiers
  modifiers?: BaseModifiers;
}

@summary("JSON data or structure representation element.")
@doc("Specialized representation for JSON text. Supply serialized JSON when consumers should display a JSON document; this field is a string and is not structurally validated here.")
@uiWidget("json")
@dslAlias("json")
@customRenderer
model JsonElement extends UiElement {
  @summary("Discriminator type")
  type: "json";

  @summary("JSON content value")
  @doc("Serialized JSON text to render. No parsing or schema validation is implied by this element.")
  value: string;

  @summary("Optional visual modifiers (copyable)")
  @uiModifiers
  modifiers?: BaseModifiers;
}

@summary("Hyperlink representation for external or internal URL navigation.")
@doc("Use this element when displayed text should also behave as a link. Unlike StringElement, the value is a navigation destination and may be paired with a separate human-readable label.")
@uiWidget("string-url")
model StringUrlElement extends UiElement {
  @summary("Discriminator type")
  type: "string-url";

  @summary("Target URL or navigation destination")
  @doc("Destination associated with the link. Supply a URL or client-recognized navigation target supported by the renderer.")
  value: string;

  @summary("Optional custom anchor text label")
  label?: string;

  @summary("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@summary("Monospace semantic identifier representation.")
@doc("Use for identifiers, hashes, and other machine-oriented strings that benefit from monospace styling. The value remains text and is not resolved as a Picteus entity.")
@uiWidget("identifier")
model IdentifierElement extends UiElement {
  @summary("Discriminator type")
  type: "identifier";

  @summary("Identifier string value")
  @doc("Identifier text to display, such as an opaque ID or hash. Avoid embedding presentation markup in the value.")
  value: string;

  @summary("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@summary("Aspect ratio representation (e.g. \"16:9\", \"4:3\", \"1:1\").")
@doc("Displays a numeric aspect ratio as a ratio expression. Provide a positive value meaningful to the surrounding content; this type does not encode the source image dimensions.")
@uiWidget("ratio")
model RatioElement extends UiElement {
  @summary("Discriminator type")
  type: "ratio";

  @summary("Aspect ratio numerical expression")
  @doc("Numeric ratio value used by the renderer to produce an aspect-ratio display.")
  value: decimal;

  @summary("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@summary("Image dimensions representation displaying formatted width and height in pixels.")
@doc("Displays a width/height pair as image dimensions. Both values are positive pixel counts; together they describe dimensions, not an aspect ratio or a resize request.")
@uiWidget("dimensions")
model DimensionsElement extends UiElement {
  @summary("Discriminator type")
  type: "dimensions";

  @summary("Width in pixels")
  @doc("Horizontal pixel count. Values below one are rejected by the schema constraint.")
  @minValue(1)
  width: integer;

  @summary("Height in pixels")
  @doc("Vertical pixel count. Values below one are rejected by the schema constraint.")
  @minValue(1)
  height: integer;

  @summary("Optional visual modifiers (copyable)")
  @uiModifiers
  modifiers?: BaseModifiers;
}

@summary("Single color representation with hex value, shape/size styling, text display toggle, and copy affordance.")
@doc("Displays one color swatch with configurable geometry and optional adjacent text. Supply the color as a hexadecimal string; the schema leaves exact accepted hex formats to the renderer.")
@uiWidget("color")
@dslAlias("color")
model ColourElement extends UiElement {
  @summary("Discriminator type")
  type: "color";

  @summary("Hexadecimal color code")
  @doc("Color value used to draw the swatch. Use a hexadecimal representation supported by the client renderer.")
  value: string;

  @summary("Optional descriptive color name label")
  @doc("Human-readable color name available to the renderer when text is shown.")
  label?: string;

  @summary("Whether to display the textual color code or label next to the swatch")
  @doc("When true, allows the renderer to show the color's text label alongside the swatch. The default is true.")
  showText?: boolean = true;

  @summary("Visual shape of the color indicator")
  @doc("Geometry used for the swatch; defaults to a circle.")
  shape?: Shape = Shape.circle;

  @summary("Visual size of the color indicator")
  @doc("Relative size class for the swatch; defaults to medium.")
  size?: Size = Size.medium;

  @summary("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@summary("Plain unbounded numeric value primitive element.")
@doc("Displays a numeric value without a progress scale or rating interpretation. Use unit to communicate the measurement context; no range is imposed by this model.")
@uiWidget("number-unbounded")
model NumberUnboundedElement extends UiElement {
  @summary("Discriminator type")
  type: "number-unbounded";

  @summary("Numeric value")
  @doc("Number to display. Its meaning and any valid range are defined by the producing feature.")
  value: float64;

  @summary("Optional unit suffix (e.g. \"px\", \"ms\", \"MB\")")
  @doc("Short unit label appended or otherwise associated with the displayed value. Include only the unit text, not a second copy of the number.")
  unit?: string;

  @summary("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@summary("Bounded numeric rating represented as visual stars.")
@doc("Displays a score on a star scale. Keep value within the scale from zero through maximum; this model declares the scale metadata but does not impose a numeric validation bound.")
@uiWidget("number-stars")
@dslAlias("numberStars")
model NumberBoundedStarsElement extends UiElement {
  @summary("Discriminator type")
  type: "number-stars";

  @summary("Numeric rating score")
  @doc("Score represented by the filled portion of the star display.")
  value: float64;

  @summary("Maximum rating scale (defaults to 5)")
  @doc("Upper end of the rating scale. When omitted, the scale is five; value should use the same scale.")
  @uiMeterBound("maximum")
  maximum?: float64 = 5;

  @summary("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@summary("Bounded numeric meter representation (read-only progress / score bar).")
@doc("Displays a scalar value against a minimum-to-maximum range. Supply comparable bounds and a value in that range; optional label and unit customize the textual readout without changing the meter scale.")
@uiWidget("meter")
@dslAlias("numberMeter")
model NumberBoundedMeterElement extends UiElement {
  @summary("Discriminator type")
  type: "number-meter";

  @summary("Numeric value")
  @doc("Current measurement or score represented by the meter.")
  value: float64;

  @summary("Minimum scale bound (defaults to 0)")
  @doc("Lower end of the meter range. Defaults to zero when omitted.")
  @uiMeterBound("minimum")
  minimum?: float64 = 0;

  @summary("Maximum scale bound (e.g. 100)")
  @doc("Upper end of the meter range. Choose a bound consistent with value and minimum.")
  @uiMeterBound("maximum")
  maximum?: float64 = 100;

  @summary("Optional custom text label override (e.g. \"68 / 100\")")
  @doc("Optional readout text to use instead of a renderer-generated value and range label.")
  @uiMeterBound("label")
  label?: string;

  @summary("Optional unit suffix (e.g. \"%\")")
  @doc("Unit associated with the value, such as a percent sign. This affects display only and does not convert the numeric value.")
  @uiMeterBound("unit")
  unit?: string;

  @summary("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@summary("Visual presentation style for boolean values.")
enum BooleanRepresentation {
  @summary("Standard inline text rendering (e.g. \"true\" / \"false\" or custom labels)")
  plain: "plain",

  @summary("Visual badge pill representation")
  badge: "badge"
}

@summary("Visual color tone variants for badge pill representations.")
enum BadgeVariant {
  @summary("Neutral gray tone")
  neutral: "neutral",

  @summary("Success green tone")
  success: "success",

  @summary("Warning yellow/orange tone")
  warning: "warning",

  @summary("Danger red tone")
  danger: "danger"
}

@summary("Boolean value primitive with text or badge presentation.")
@doc("Displays a boolean state using text or a badge. The representation determines whether true/false labels or a colored badge are used; configured labels and variant are presentation choices only.")
@uiWidget("boolean")
model BooleanElement extends UiElement {
  @summary("Discriminator type")
  type: "boolean";

  @summary("Boolean state value")
  @doc("State to display. This remains a boolean value in the data model even when the renderer substitutes custom labels.")
  value: boolean;

  @summary("Display representation mode")
  @doc("Selects ordinary text or a badge pill. Badge color applies only to badge presentation.")
  representation?: BooleanRepresentation = BooleanRepresentation.plain;

  @summary("Custom display label when true (defaults to \"true\")")
  @doc("Text used for the true state in plain representation. Defaults to the literal text true.")
  trueLabel?: string = "true";

  @summary("Custom display label when false (defaults to \"false\")")
  @doc("Text used for the false state in plain representation. Defaults to the literal text false.")
  falseLabel?: string = "false";

  @summary("Badge color tone when rendered as badge")
  @doc("Semantic color treatment for badge presentation; it has no effect in plain representation.")
  variant?: BadgeVariant = BadgeVariant.neutral;

  @summary("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@summary("Presentation format styles for timestamp elements.")
enum TimestampFormat {
  @summary("Complete date and time display")
  datetime: "datetime",

  @summary("Date-only display")
  date: "date",

  @summary("Time-only display")
  time: "time",

  @summary("Relative time expression (e.g. \"5 minutes ago\")")
  relative: "relative"
}

@summary("Formatted date and time representation.")
@doc("Displays an epoch timestamp using a selected date/time format. The input is a count of milliseconds, not seconds; relative formatting is interpreted by the consumer.")
@uiWidget("timestamp")
model TimestampElement extends UiElement {
  @summary("Discriminator type")
  type: "timestamp";

  @summary("The timestamp in milliseconds")
  @doc("Unix epoch timestamp measured in milliseconds. Convert seconds-based timestamps before assigning this value.")
  value: int64;

  @summary("Presentation date/time format")
  @doc("Controls whether the timestamp is shown as date and time, date only, time only, or relative text. The default is datetime.")
  format?: TimestampFormat = TimestampFormat.datetime;

  @summary("Optional visual modifiers (copyable, truncate, emphasis, monospace)")
  @uiModifiers
  modifiers?: PrimitiveModifiers;
}

@summary("Thumbnail image reference with placeholder fallback handling.")
@doc("References an image source for thumbnail rendering and provides accessible text and a fallback source. The client determines loading, sizing, and placeholder behavior.")
@uiWidget("image-ref")
@dslAlias("imageRef")
model ImageReferenceElement extends UiElement {
  @summary("Discriminator type")
  type: "image-ref";

  @summary("Image source URI (HTTPS URL, base64 data URI, or asset path)")
  @doc("Source URI understood by the client renderer. Supported forms include HTTPS locations, base64 data URIs, and client asset paths; this field is not raw image bytes.")
  src: string;

  @summary("Accessible alternative description")
  @doc("Alternative text describing the image for assistive technology. Provide meaningful text when the image conveys information; omit it only when it is decorative.")
  alt?: string;

  @summary("Aspect ratio of the thumbnail container")
  @doc("Preferred ratio of the rendered thumbnail container, expressed as a ratio string such as 1:1. It controls presentation rather than modifying the source image.")
  aspectRatio?: string = "1:1";

  @summary("Fallback placeholder image URI")
  @doc("Optional source to display when the primary image cannot be loaded. It follows the same URI conventions as src.")
  placeholder?: string;
}
