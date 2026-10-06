# ViewKit models

Declarative UI specification and visual component kit for representing structured entity data, metrics, layouts, and
interactive actions.

ViewKit models are discriminated visual elements and structural containers that can be composed into cards and other
feature views. Primitive, layout, action, and root-container models are shared across the TypeScript, Python, React,
JSON Schema, and Markdown outputs generated from this namespace.

## Root models

### UiContainer

Root container holding an ordered list of visual elements.

Provides the shared root content collection inherited by cards and other root models. The order of elements is
significant and is preserved by the renderer.

Extends [Envelop](#envelop).

- Layout: `repeating-group`

| Property        | Type                      | Required | Default | Details                                                                                                                                                                                             |
|-----------------|---------------------------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `elements`      | [UiElement](#uielement)[] | Yes      |         | Ordered list of visual elements, structures, and content Top-level visual content in render order. Use a structural element to group related children and primitive elements for individual values. |
| `schemaVersion` | "1.0"                     | Yes      | `1.0`   | Schema specification version Version of the ViewKit envelope contract. It is a literal value and should be preserved when serializing or forwarding a document.                                     |

### UiCard

Root container for a complete feature card.

A complete card has a required title and ordered content inherited from UiContainer. It is designed for the feature-card
surface; description and actions supplement the content, with action controls rendered separately from the element list.

Extends [UiContainer](#uicontainer).

- Layout: `card`

| Property        | Type                      | Required | Default | Details                                                                                                                                                                                                                        |
|-----------------|---------------------------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `title`         | string                    | Yes      |         | Human-readable feature title displayed in the card header Primary heading for the card. Keep it concise enough for the card header; longer explanatory text belongs in description or elements.                                |
| `description`   | string                    | No       |         | Optional neutral subtitle / description for the feature Brief secondary context shown with the title. Use the content elements for detailed information rather than placing an entire report in this field.                    |
| `actions`       | [UiAction](#uiaction)[]   | No       |         | Optional card action buttons rendered at the base of the feature card Optional user-invokable actions shown after the card content. Their order is preserved and each action's own fields define its command or link behavior. |
| `elements`      | [UiElement](#uielement)[] | Yes      |         | Ordered list of visual elements, structures, and content Top-level visual content in render order. Use a structural element to group related children and primitive elements for individual values.                            |
| `schemaVersion` | "1.0"                     | Yes      | `1.0`   | Schema specification version Version of the ViewKit envelope contract. It is a literal value and should be preserved when serializing or forwarding a document.                                                                |

## UI elements

### StringElement

Text value primitive with selectable inline, chip, or multiline presentation.

Use this primitive for one textual value when a structured label/value row is unnecessary. Choose multiline for content
whose line breaks should remain visible; modifiers apply presentation traits without changing the underlying value.

Extends [UiElement](#uielement).

- Widget: `string`

| Property         | Type                                          | Required | Default | Details                                                                                                                                     |
|------------------|-----------------------------------------------|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------|
| `type`           | "string"                                      | Yes      |         | Discriminator type                                                                                                                          |
| `value`          | string                                        | Yes      |         | Text value Text to render. Supply plain text; this field is not a Markdown or HTML document.                                                |
| `representation` | [StringRepresentation](#stringrepresentation) | No       | `plain` | Display representation mode Selects inline, chip, or multiline rendering. The default is plain, so callers can omit this for ordinary text. |
| `modifiers`      | [PrimitiveModifiers](#primitivemodifiers)     | No       |         | Optional visual modifiers (copyable, truncate, emphasis, monospace) — UI modifiers                                                          |

### StringsElement

Collection of textual values rendered as an inline sequence or chips.

Use this primitive when several related strings should be rendered as one compact sequence. The client preserves the
array order and inserts the selected separator between values.

Extends [UiElement](#uielement).

- Widget: `strings`

| Property         | Type                                          | Required | Default | Details                                                                                                                                                                                |
|------------------|-----------------------------------------------|----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`           | "strings"                                     | Yes      |         | Discriminator type                                                                                                                                                                     |
| `values`         | string[]                                      | Yes      |         | Array of string values Values to render in order. Each array entry remains a distinct item for chip presentation and is not parsed as a delimited string.                              |
| `representation` | [StringRepresentation](#stringrepresentation) | No       | `plain` | Display representation mode (plain text or visual chips) Selects whether values appear as ordinary inline text or as separate visual chips. The default uses the plain representation. |
| `separator`      | [Separator](#separator)                       | No       |         | Optional visual separator rendered between sequential values Separator inserted between adjacent values in plain representation. It does not become part of any value.                 |
| `modifiers`      | [PrimitiveModifiers](#primitivemodifiers)     | No       |         | Optional visual modifiers (copyable, truncate, emphasis, monospace) — UI modifiers                                                                                                     |

### StringCodeElement

Monospace code block or formatted code snippet representation.

Use for source-like or preformatted textual content that should be rendered in a code-oriented style. The language is a
presentation hint; the content is not parsed or validated as code by this contract.

Extends [UiElement](#uielement).

- Widget: `string-code`
- Uses a custom renderer.

| Property    | Type                            | Required | Default | Details                                                                                                                                                                        |
|-------------|---------------------------------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`      | "string-code"                   | Yes      |         | Discriminator type                                                                                                                                                             |
| `value`     | string                          | Yes      |         | Text value Code or text snippet to display. Include any desired line breaks in this string.                                                                                    |
| `language`  | [CodeLanguage](#codelanguage)   | No       |         | Optional syntax highlighting language identifier Optional syntax hint for the renderer. Supported values describe highlighting modes and do not validate the snippet's syntax. |
| `modifiers` | [BaseModifiers](#basemodifiers) | No       |         | Optional visual modifiers (copyable) — UI modifiers                                                                                                                            |

### XmlElement

XML markup code block element.

Specialized code-oriented element for XML content. It uses the custom XML renderer rather than requiring consumers to
construct a generic code block.

Extends [UiElement](#uielement).

- Widget: `xml`
- Aliases: `xml`
- Uses a custom renderer.

| Property    | Type                            | Required | Default | Details                                                                                                                               |
|-------------|---------------------------------|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------|
| `type`      | "xml"                           | Yes      |         | Discriminator type                                                                                                                    |
| `value`     | string                          | Yes      |         | XML content value XML markup to render. The contract carries the source text; it does not guarantee that the document is well-formed. |
| `modifiers` | [BaseModifiers](#basemodifiers) | No       |         | Optional visual modifiers (copyable) — UI modifiers                                                                                   |

### JsonElement

JSON data or structure representation element.

Specialized representation for JSON text. Supply serialized JSON when consumers should display a JSON document; this
field is a string and is not structurally validated here.

Extends [UiElement](#uielement).

- Widget: `json`
- Aliases: `json`
- Uses a custom renderer.

| Property    | Type                            | Required | Default | Details                                                                                                        |
|-------------|---------------------------------|----------|---------|----------------------------------------------------------------------------------------------------------------|
| `type`      | "json"                          | Yes      |         | Discriminator type                                                                                             |
| `value`     | string                          | Yes      |         | JSON content value Serialized JSON text to render. No parsing or schema validation is implied by this element. |
| `modifiers` | [BaseModifiers](#basemodifiers) | No       |         | Optional visual modifiers (copyable) — UI modifiers                                                            |

### StringUrlElement

Hyperlink representation for external or internal URL navigation.

Use this element when displayed text should also behave as a link. Unlike StringElement, the value is a navigation
destination and may be paired with a separate human-readable label.

Extends [UiElement](#uielement).

- Widget: `string-url`

| Property    | Type                                      | Required | Default | Details                                                                                                                                                   |
|-------------|-------------------------------------------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`      | "string-url"                              | Yes      |         | Discriminator type                                                                                                                                        |
| `value`     | string                                    | Yes      |         | Target URL or navigation destination Destination associated with the link. Supply a URL or client-recognized navigation target supported by the renderer. |
| `label`     | string                                    | No       |         | Optional custom anchor text label                                                                                                                         |
| `modifiers` | [PrimitiveModifiers](#primitivemodifiers) | No       |         | Optional visual modifiers (copyable, truncate, emphasis, monospace) — UI modifiers                                                                        |

### IdentifierElement

Monospace semantic identifier representation.

Use for identifiers, hashes, and other machine-oriented strings that benefit from monospace styling. The value remains
text and is not resolved as a Picteus entity.

Extends [UiElement](#uielement).

- Widget: `identifier`

| Property    | Type                                      | Required | Default | Details                                                                                                                             |
|-------------|-------------------------------------------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------|
| `type`      | "identifier"                              | Yes      |         | Discriminator type                                                                                                                  |
| `value`     | string                                    | Yes      |         | Identifier string value Identifier text to display, such as an opaque ID or hash. Avoid embedding presentation markup in the value. |
| `modifiers` | [PrimitiveModifiers](#primitivemodifiers) | No       |         | Optional visual modifiers (copyable, truncate, emphasis, monospace) — UI modifiers                                                  |

### RatioElement

Aspect ratio representation (e.g. "16:9", "4:3", "1:1").

Displays a numeric aspect ratio as a ratio expression. Provide a positive value meaningful to the surrounding content;
this type does not encode the source image dimensions.

Extends [UiElement](#uielement).

- Widget: `ratio`

| Property    | Type                                      | Required | Default | Details                                                                                                        |
|-------------|-------------------------------------------|----------|---------|----------------------------------------------------------------------------------------------------------------|
| `type`      | "ratio"                                   | Yes      |         | Discriminator type                                                                                             |
| `value`     | float                                     | Yes      |         | Aspect ratio numerical expression Numeric ratio value used by the renderer to produce an aspect-ratio display. |
| `modifiers` | [PrimitiveModifiers](#primitivemodifiers) | No       |         | Optional visual modifiers (copyable, truncate, emphasis, monospace) — UI modifiers                             |

### DimensionsElement

Image dimensions representation displaying formatted width and height in pixels.

Displays a width/height pair as image dimensions. Both values are positive pixel counts; together they describe
dimensions, not an aspect ratio or a resize request.

Extends [UiElement](#uielement).

- Widget: `dimensions`

| Property    | Type                            | Required | Default | Details                                                                                         |
|-------------|---------------------------------|----------|---------|-------------------------------------------------------------------------------------------------|
| `type`      | "dimensions"                    | Yes      |         | Discriminator type                                                                              |
| `width`     | int                             | Yes      |         | Width in pixels Horizontal pixel count. Values below one are rejected by the schema constraint. |
| `height`    | int                             | Yes      |         | Height in pixels Vertical pixel count. Values below one are rejected by the schema constraint.  |
| `modifiers` | [BaseModifiers](#basemodifiers) | No       |         | Optional visual modifiers (copyable) — UI modifiers                                             |

### ColourElement

Single color representation with hex value, shape/size styling, text display toggle, and copy affordance.

Displays one color swatch with configurable geometry and optional adjacent text. Supply the color as a hexadecimal
string; the schema leaves exact accepted hex formats to the renderer.

Extends [UiElement](#uielement).

- Widget: `color`
- Aliases: `color`

| Property    | Type                                      | Required | Default  | Details                                                                                                                                                                        |
|-------------|-------------------------------------------|----------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`      | "color"                                   | Yes      |          | Discriminator type                                                                                                                                                             |
| `value`     | string                                    | Yes      |          | Hexadecimal color code Color value used to draw the swatch. Use a hexadecimal representation supported by the client renderer.                                                 |
| `label`     | string                                    | No       |          | Optional descriptive color name label Human-readable color name available to the renderer when text is shown.                                                                  |
| `showText`  | boolean                                   | No       | `true`   | Whether to display the textual color code or label next to the swatch When true, allows the renderer to show the color's text label alongside the swatch. The default is true. |
| `shape`     | [Shape](#shape)                           | No       | `circle` | Visual shape of the color indicator Geometry used for the swatch; defaults to a circle.                                                                                        |
| `size`      | [Size](#size)                             | No       | `medium` | Visual size of the color indicator Relative size class for the swatch; defaults to medium.                                                                                     |
| `modifiers` | [PrimitiveModifiers](#primitivemodifiers) | No       |          | Optional visual modifiers (copyable, truncate, emphasis, monospace) — UI modifiers                                                                                             |

### NumberUnboundedElement

Plain unbounded numeric value primitive element.

Displays a numeric value without a progress scale or rating interpretation. Use unit to communicate the measurement
context; no range is imposed by this model.

Extends [UiElement](#uielement).

- Widget: `number-unbounded`

| Property    | Type                                      | Required | Default | Details                                                                                                                                                                               |
|-------------|-------------------------------------------|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`      | "number-unbounded"                        | Yes      |         | Discriminator type                                                                                                                                                                    |
| `value`     | float                                     | Yes      |         | Numeric value Number to display. Its meaning and any valid range are defined by the producing feature.                                                                                |
| `unit`      | string                                    | No       |         | Optional unit suffix (e.g. "px", "ms", "MB") Short unit label appended or otherwise associated with the displayed value. Include only the unit text, not a second copy of the number. |
| `modifiers` | [PrimitiveModifiers](#primitivemodifiers) | No       |         | Optional visual modifiers (copyable, truncate, emphasis, monospace) — UI modifiers                                                                                                    |

### NumberBoundedStarsElement

Bounded numeric rating represented as visual stars.

Displays a score on a star scale. Keep value within the scale from zero through maximum; this model declares the scale
metadata but does not impose a numeric validation bound.

Extends [UiElement](#uielement).

- Widget: `number-stars`
- Aliases: `numberStars`

| Property    | Type                                      | Required | Default | Details                                                                                                                                                        |
|-------------|-------------------------------------------|----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`      | "number-stars"                            | Yes      |         | Discriminator type                                                                                                                                             |
| `value`     | float                                     | Yes      |         | Numeric rating score Score represented by the filled portion of the star display.                                                                              |
| `maximum`   | float                                     | No       |         | Maximum rating scale (defaults to 5) Upper end of the rating scale. When omitted, the scale is five; value should use the same scale. — Meter bound: `maximum` |
| `modifiers` | [PrimitiveModifiers](#primitivemodifiers) | No       |         | Optional visual modifiers (copyable, truncate, emphasis, monospace) — UI modifiers                                                                             |

### NumberBoundedMeterElement

Bounded numeric meter representation (read-only progress / score bar).

Displays a scalar value against a minimum-to-maximum range. Supply comparable bounds and a value in that range; optional
label and unit customize the textual readout without changing the meter scale.

Extends [UiElement](#uielement).

- Widget: `meter`
- Aliases: `numberMeter`

| Property    | Type                                      | Required | Default | Details                                                                                                                                                                         |
|-------------|-------------------------------------------|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`      | "number-meter"                            | Yes      |         | Discriminator type                                                                                                                                                              |
| `value`     | float                                     | Yes      |         | Numeric value Current measurement or score represented by the meter.                                                                                                            |
| `minimum`   | float                                     | No       |         | Minimum scale bound (defaults to 0) Lower end of the meter range. Defaults to zero when omitted. — Meter bound: `minimum`                                                       |
| `maximum`   | float                                     | No       |         | Maximum scale bound (e.g. 100) Upper end of the meter range. Choose a bound consistent with value and minimum. — Meter bound: `maximum`                                         |
| `label`     | string                                    | No       |         | Optional custom text label override (e.g. "68 / 100") Optional readout text to use instead of a renderer-generated value and range label. — Meter bound: `label`                |
| `unit`      | string                                    | No       |         | Optional unit suffix (e.g. "%") Unit associated with the value, such as a percent sign. This affects display only and does not convert the numeric value. — Meter bound: `unit` |
| `modifiers` | [PrimitiveModifiers](#primitivemodifiers) | No       |         | Optional visual modifiers (copyable, truncate, emphasis, monospace) — UI modifiers                                                                                              |

### BooleanElement

Boolean value primitive with text or badge presentation.

Displays a boolean state using text or a badge. The representation determines whether true/false labels or a colored
badge are used; configured labels and variant are presentation choices only.

Extends [UiElement](#uielement).

- Widget: `boolean`

| Property         | Type                                            | Required | Default   | Details                                                                                                                                          |
|------------------|-------------------------------------------------|----------|-----------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`           | "boolean"                                       | Yes      |           | Discriminator type                                                                                                                               |
| `value`          | boolean                                         | Yes      |           | Boolean state value State to display. This remains a boolean value in the data model even when the renderer substitutes custom labels.           |
| `representation` | [BooleanRepresentation](#booleanrepresentation) | No       | `plain`   | Display representation mode Selects ordinary text or a badge pill. Badge color applies only to badge presentation.                               |
| `trueLabel`      | string                                          | No       | `true`    | Custom display label when true (defaults to "true") Text used for the true state in plain representation. Defaults to the literal text true.     |
| `falseLabel`     | string                                          | No       | `false`   | Custom display label when false (defaults to "false") Text used for the false state in plain representation. Defaults to the literal text false. |
| `variant`        | [BadgeVariant](#badgevariant)                   | No       | `neutral` | Badge color tone when rendered as badge Semantic color treatment for badge presentation; it has no effect in plain representation.               |
| `modifiers`      | [PrimitiveModifiers](#primitivemodifiers)       | No       |           | Optional visual modifiers (copyable, truncate, emphasis, monospace) — UI modifiers                                                               |

### TimestampElement

Formatted date and time representation.

Displays an epoch timestamp using a selected date/time format. The input is a count of milliseconds, not seconds;
relative formatting is interpreted by the consumer.

Extends [UiElement](#uielement).

- Widget: `timestamp`

| Property    | Type                                      | Required | Default    | Details                                                                                                                                                  |
|-------------|-------------------------------------------|----------|------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`      | "timestamp"                               | Yes      |            | Discriminator type                                                                                                                                       |
| `value`     | int                                       | Yes      |            | The timestamp in milliseconds Unix epoch timestamp measured in milliseconds. Convert seconds-based timestamps before assigning this value.               |
| `format`    | [TimestampFormat](#timestampformat)       | No       | `datetime` | Presentation date/time format Controls whether the timestamp is shown as date and time, date only, time only, or relative text. The default is datetime. |
| `modifiers` | [PrimitiveModifiers](#primitivemodifiers) | No       |            | Optional visual modifiers (copyable, truncate, emphasis, monospace) — UI modifiers                                                                       |

### ImageReferenceElement

Thumbnail image reference with placeholder fallback handling.

References an image source for thumbnail rendering and provides accessible text and a fallback source. The client
determines loading, sizing, and placeholder behavior.

Extends [UiElement](#uielement).

- Widget: `image-ref`
- Aliases: `imageRef`

| Property      | Type        | Required | Default | Details                                                                                                                                                                                                                          |
|---------------|-------------|----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`        | "image-ref" | Yes      |         | Discriminator type                                                                                                                                                                                                               |
| `src`         | string      | Yes      |         | Image source URI (HTTPS URL, base64 data URI, or asset path) Source URI understood by the client renderer. Supported forms include HTTPS locations, base64 data URIs, and client asset paths; this field is not raw image bytes. |
| `alt`         | string      | No       |         | Accessible alternative description Alternative text describing the image for assistive technology. Provide meaningful text when the image conveys information; omit it only when it is decorative.                               |
| `aspectRatio` | string      | No       | `1:1`   | Aspect ratio of the thumbnail container Preferred ratio of the rendered thumbnail container, expressed as a ratio string such as 1:1. It controls presentation rather than modifying the source image.                           |
| `placeholder` | string      | No       |         | Fallback placeholder image URI Optional source to display when the primary image cannot be loaded. It follows the same URI conventions as src.                                                                                   |

### MarkdownBlockElement

Full Markdown fallback block rendered with core typographic hierarchy, spacing, and styling.

Use this custom-renderer escape hatch when the structured ViewKit elements cannot express the required rich text.
Markdown rendering is a presentation fallback; prefer typed elements when consumers need to inspect individual values.

Extends [UiElement](#uielement).

- Widget: `markdown`
- Aliases: `markdown`
- Uses a custom renderer.

| Property    | Type                            | Required | Default | Details                                                                                                                                                              |
|-------------|---------------------------------|----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`      | "markdown"                      | Yes      |         | Discriminator type                                                                                                                                                   |
| `content`   | string                          | Yes      |         | Raw Markdown markup content Markdown source consumed by the client renderer. The schema treats it as an opaque string and does not validate the markup or its links. |
| `modifiers` | [BaseModifiers](#basemodifiers) | No       |         | Optional visual modifiers (copyable) — UI modifiers                                                                                                                  |

### HtmlBlockElement

Sandboxed HTML rendering escape hatch.

Use only when structured elements or Markdown cannot represent the required content. Rendering occurs in a sandboxed
host context, but callers should still avoid embedding untrusted content and should not assume access to application
privileges.

Extends [UiElement](#uielement).

- Widget: `html`
- Aliases: `html`
- Uses a custom renderer.

| Property    | Type                            | Required | Default | Details                                                                                                                              |
|-------------|---------------------------------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------|
| `type`      | "html"                          | Yes      |         | Discriminator type                                                                                                                   |
| `content`   | string                          | Yes      |         | Raw HTML markup content HTML source passed to the custom renderer. This is an opaque string, not a typed or sanitized DOM structure. |
| `modifiers` | [BaseModifiers](#basemodifiers) | No       |         | Optional visual modifiers (copyable) — UI modifiers                                                                                  |

### MultiSlotElement

Horizontal row layout with individually sized slots.

Use this layout when a row needs explicit regions with independently controlled widths. Each slot contains one child
element; unlike FlowingElement, the layout does not automatically wrap a sequence of children.

Extends [UiElement](#uielement).

- Layout: `row-slots`
- Aliases: `multiSlot`

| Property | Type            | Required | Default | Details                                                                                                                                              |
|----------|-----------------|----------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`   | "multi-slot"    | Yes      |         | Discriminator type                                                                                                                                   |
| `slots`  | [Slot](#slot)[] | Yes      |         | List of slots comprising the row Ordered slots in the row. Each slot's width is a percentage; arrange slot definitions in the intended visual order. |

### FlowingElement

Inline layout container that wraps child elements.

Use for compact related values that should flow horizontally and wrap naturally at the available width. Child order is
preserved; an optional separator is placed between neighboring children.

Extends [UiElement](#uielement).

- Layout: `flowing`
- Aliases: `flowing`

| Property    | Type                      | Required | Default | Details                                                                                                                                                                                             |
|-------------|---------------------------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`      | "flowing"                 | Yes      |         | Discriminator type                                                                                                                                                                                  |
| `separator` | [Separator](#separator)   | No       |         | Optional visual separator rendered between sequential child elements Separator placed between adjacent elements. Omit it when spacing or the child renderers already provide sufficient separation. |
| `elements`  | [UiElement](#uielement)[] | Yes      |         | List of child elements rendered sequentially with line wrapping Ordered children rendered in the flow. The client wraps them as needed rather than requiring callers to calculate line breaks.      |

### LabelValueElement

Label and value row with an optional divider.

Represents one named value with a muted left-hand label and a right-hand visual element. Use it for a single field; use
TableElement for repeated rows or column-aligned data.

Extends [UiElement](#uielement).

- Layout: `row`
- Aliases: `labelValue`

| Property      | Type                    | Required | Default | Details                                                                                                                                                                        |
|---------------|-------------------------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`        | "label-value"           | Yes      |         | Discriminator type                                                                                                                                                             |
| `label`       | string                  | Yes      |         | Key or descriptive label displayed muted on the left Human-readable name for the value. This text is rendered as the row label rather than as a separate UiElement. — UI label |
| `value`       | [UiElement](#uielement) | Yes      |         | Rendered value element on the right Value content rendered in the right-hand region. It may be a primitive or a nested structural element. — UI value                          |
| `withDivider` | boolean                 | No       | `false` | Whether to render a bottom border/hairline divider Enables a horizontal separator beneath this row when true. Defaults to false. — Divider: `horizontal`                       |

### TableElement

Structured tabular data with optional columns and separators.

Use for data that benefits from aligned rows and columns, including key/value and multi-column tables. Supply rows in
display order; explicit columns are optional, and divider/striping flags independently control visual separators and
alternating backgrounds.

Extends [UiElement](#uielement).

- Layout: `table`

| Property               | Type                          | Required | Default | Details                                                                                                                                                                           |
|------------------------|-------------------------------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`                 | "table"                       | Yes      |         | Discriminator type                                                                                                                                                                |
| `isStriped`            | boolean                       | No       | `false` | Whether to render alternating row background colors Enables alternating backgrounds across successive rows to improve scanability. Defaults to false.                             |
| `withColumnSeparators` | boolean                       | No       | `false` | Whether to render vertical column separators Adds vertical dividers between columns when true. Defaults to false. — Divider: `vertical`                                           |
| `withRowSeparators`    | boolean                       | No       | `false` | Whether to render horizontal row separators Adds horizontal dividers between rows when true. Defaults to false. — Divider: `horizontal`                                           |
| `columns`              | [TableColumn](#tablecolumn)[] | No       |         | Optional explicit column definitions Optional ordered column metadata defining headers, alignment, and width. When omitted, the renderer may infer a basic layout from row cells. |
| `rows`                 | [TableRow](#tablerow)[]       | Yes      |         | Tabular data rows Ordered table rows. Each row's cells correspond positionally to the declared columns.                                                                           |

### RepeatingGroupElement

Repeating group container where entries share uniform structure and retain per-entry labels.

Groups a sequence of labeled entries under one optional section title. Use it when records have the same general
presentation but need their own labels.

Extends [UiElement](#uielement).

- Layout: `repeating-group`

| Property  | Type                                          | Required | Default | Details                                                                                                                           |
|-----------|-----------------------------------------------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------|
| `type`    | "repeating-group"                             | Yes      |         | Discriminator type                                                                                                                |
| `title`   | string                                        | No       |         | Optional section header for the group Heading displayed for the repeated section, separate from the labels of individual entries. |
| `entries` | [RepeatingGroupEntry](#repeatinggroupentry)[] | Yes      |         | List of repeated entry records Entries in display order. Each entry supplies its own label and content.                           |

### CollapsibleGroupElement

Collapsible disclosure container (accordion) with summary badge.

Groups nested content behind a disclosure control. The title names the group, summary can provide a compact status
indicator, and defaultExpanded controls only the initial state.

Extends [UiElement](#uielement).

- Layout: `accordion`

| Property          | Type                      | Required | Default | Details                                                                                                                                                                                   |
|-------------------|---------------------------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`            | "collapsible-group"       | Yes      |         | Discriminator type                                                                                                                                                                        |
| `title`           | string                    | Yes      |         | Group title (e.g. "Show specimen details") Text shown on the disclosure control. Use a concise action or section name that remains meaningful while the content is collapsed.             |
| `summary`         | string                    | No       |         | Secondary summary indicator (e.g. "2 neutral values") Compact contextual text shown alongside the title while the group is collapsed or expanded. It does not replace the nested content. |
| `defaultExpanded` | boolean                   | No       | `false` | Whether the disclosure is open/expanded by default Initial expanded state requested by the data. Defaults to false; subsequent interaction is managed by the client.                      |
| `elements`        | [UiElement](#uielement)[] | Yes      |         | Nested content elements revealed when expanded Ordered child elements made visible by expanding the group.                                                                                |

### DividerElement

Visual hairline separator separating sections or element groups.

A standalone visual separator for dividing adjacent sections or element groups. Use the divider flags on tables or rows
when the separator is part of that structure.

Extends [UiElement](#uielement).

- Widget: `divider`

| Property | Type                          | Required | Default    | Details                                                                                |
|----------|-------------------------------|----------|------------|----------------------------------------------------------------------------------------|
| `type`   | "divider"                     | Yes      |            | Discriminator type                                                                     |
| `style`  | [DividerStyle](#dividerstyle) | No       | `hairline` | Line styling Visual stroke treatment for the separator. Defaults to a subtle hairline. |

## Action elements

### ButtonActionElement

Interactive button action triggering an extension command.

When activated, the client dispatches commandId to the specified extension and may include target and parameters as
command input. disabled and variant affect presentation and availability, not the command's authorization.

Extends [UiAction](#uiaction).

- Widget: `button-action`

| Property      | Type                            | Required | Default     | Details                                                                                                                                                                                          |
|---------------|---------------------------------|----------|-------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`        | "button"                        | Yes      |             | Discriminator type                                                                                                                                                                               |
| `extensionId` | string                          | No       |             | Extension identifier owning the target command Extension that registers commandId. Omit only when the client can resolve the command in the current extension context.                           |
| `commandId`   | string                          | Yes      |             | Command identifier to invoke Identifier of the registered extension command to dispatch when the button is activated.                                                                            |
| `target`      | string                          | No       |             | Target entity or context identifier Optional entity or context identifier forwarded to the command handler. Its format is determined by the target extension.                                    |
| `parameters`  | Record&lt;string, unknown&gt;   | No       |             | Optional arbitrary parameters payload forwarded to the command handler JSON-compatible arguments passed to the extension command. Define and validate their shape in the command implementation. |
| `disabled`    | boolean                         | No       | `false`     | Whether the button is disabled / unavailable When true, the client renders the action as unavailable and should not dispatch it from user activation.                                            |
| `variant`     | [ButtonVariant](#buttonvariant) | No       | `secondary` | Button visual style variant Selects the button's emphasis style. Use danger for destructive operations and primary for the main recommended action; the variant does not change behavior.        |
| `label`       | string                          | Yes      |             | Display label for the action User-facing label shown on the control. Keep it short and action-oriented.                                                                                          |

### ExternalLinkActionElement

External link action distinct from inline URL text values.

Renders a user-invokable action that opens a destination externally. Use StringUrlElement for a link embedded in content
rather than an action control.

Extends [UiAction](#uiaction).

- Widget: `link-action`

| Property | Type            | Required | Default | Details                                                                                                                                                            |
|----------|-----------------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`   | "external-link" | Yes      |         | Discriminator type                                                                                                                                                 |
| `url`    | string          | Yes      |         | Target URL destination External destination opened when the user activates the link action. The client controls how external navigation is handed to the platform. |
| `label`  | string          | Yes      |         | Display label for the action User-facing label shown on the control. Keep it short and action-oriented.                                                            |

## Supporting models

### UiElement

Polymorphic root model for visual UI elements.

Every concrete visual element carries a type discriminator whose literal value selects its model and renderer. The
@discriminator ("type") metadata lets schema emitters and SDK generators represent derived models as a polymorphic
hierarchy. Consumers should dispatch on the discriminator and preserve unknown elements when round-tripping data where
possible.

| Property | Type   | Required | Default | Details                                                                                                                                                                                                                                |
|----------|--------|----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`   | string | Yes      |         | Discriminator property identifying the concrete visual component Concrete element tag. Derived models narrow this string to a literal such as string, table, or image-ref; it is used for polymorphic decoding and renderer selection. |

### UiAction

Polymorphic base model for interactive actions.

Shared action contract for user-invokable card controls. Concrete action models provide their own discriminator and
action-specific destination or command fields.

| Property | Type   | Required | Default | Details                                                                                                 |
|----------|--------|----------|---------|---------------------------------------------------------------------------------------------------------|
| `type`   | string | Yes      |         | Discriminator property Concrete action tag used by clients to select the action behavior.               |
| `label`  | string | Yes      |         | Display label for the action User-facing label shown on the control. Keep it short and action-oriented. |

### TruncateOptions

Truncation configuration for long textual content with optional expand affordance.

Controls how a renderer abbreviates long text. The character limit is a presentation threshold rather than a validation
limit; showMore lets the user reveal the remaining text.

| Property         | Type    | Required | Default | Details                                                                                                                                                                                                   |
|------------------|---------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `characterLimit` | int     | Yes      |         | Maximum number of characters to display before truncating Threshold after which the renderer can shorten the displayed text. This does not constrain the stored string or remove its undisplayed content. |
| `showMore`       | boolean | No       | `true`  | Whether to render a "Show more" / "Show less" toggle affordance When true, permits an expand/collapse control for text beyond the truncation threshold. Defaults to true.                                 |

### BaseModifiers

Base modifier traits for elements that support copy affordance.

Common optional presentation traits shared by primitive values and content renderers. Modifiers affect how content is
displayed or copied; they do not transform the source value.

| Property   | Type    | Required | Default | Details                                                                                                                                                          |
|------------|---------|----------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `copyable` | boolean | No       |         | Adds an interactive copy button/action next to the rendered value When true, exposes a copy affordance for the associated value where supported by the renderer. |

### PrimitiveModifiers

Common modifier traits that can be attached to primitive elements.

Extends BaseModifiers with text styling controls. Defaults provide normal weight, medium intensity, and proportional
text unless a feature explicitly overrides them.

Extends [BaseModifiers](#basemodifiers).

| Property    | Type                                | Required | Default  | Details                                                                                                                                                                                                 |
|-------------|-------------------------------------|----------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `truncate`  | [TruncateOptions](#truncateoptions) | No       |          | Configures character truncation threshold with show-more affordance Optional text abbreviation behavior. The source text remains unchanged, and the renderer may offer expansion according to showMore. |
| `weight`    | [TextWeight](#textweight)           | No       | `normal` | Typographic text weight Relative font weight for textual rendering; defaults to normal.                                                                                                                 |
| `intensity` | [TextIntensity](#textintensity)     | No       | `medium` | Visual text color intensity Relative contrast treatment for the text; defaults to medium.                                                                                                               |
| `monospace` | boolean                             | No       | `false`  | Whether to use monospace font rendering (for hashes, IDs, codes) When true, requests a fixed-width font suitable for identifiers and code-like values. Defaults to false.                               |
| `copyable`  | boolean                             | No       |          | Adds an interactive copy button/action next to the rendered value When true, exposes a copy affordance for the associated value where supported by the renderer.                                        |

### Slot

Single slot within a multi-slot horizontal row layout.

A slot combines an optional label, a relative width, and one visual child. Slot widths are percentages of the row and
should be chosen so the full row's widths form a usable layout.

| Property  | Type                    | Required | Default | Details                                                                                                                                               |
|-----------|-------------------------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| `label`   | string                  | No       |         | Optional slot label (e.g. "Slot A") Short text identifying this region of the row. It is independent of the rendered content.                         |
| `width`   | int                     | No       |         | Width percentage (1-100) Relative share of the row width. The schema constrains explicit values to the inclusive range 1 through 100.                 |
| `content` | [UiElement](#uielement) | Yes      |         | Rendered content inside the slot One visual element displayed in this slot. Use a nested layout element when the slot itself needs multiple children. |

### TableColumn

Column definition for structured tables.

Describes one table column and its visual sizing. When columns are supplied, their order corresponds to the position of
each cell in a row.

| Property    | Type                                          | Required | Default | Details                                                                                                                            |
|-------------|-----------------------------------------------|----------|---------|------------------------------------------------------------------------------------------------------------------------------------|
| `header`    | string                                        | No       |         | Display header text Optional header shown above values in this column. Omit when the table has no header row.                      |
| `align`     | [TableColumnAlign](#tablecolumnalign)         | No       | `left`  | Text horizontal alignment Horizontal alignment applied to cell content in the column. Defaults to left.                            |
| `width`     | int                                           | No       |         | Width percentage (1-100) Column width percentage used with widthMode. Explicit values are constrained to 1 through 100.            |
| `widthMode` | [TableColumnWidthMode](#tablecolumnwidthmode) | No       | `fixed` | Sizing mode for the provided width Determines whether width is a fixed percentage allocation or an upper bound. Defaults to fixed. |

### TableRow

Single table row containing an array of cell values.

A row's cell array is positional: cell at each index corresponds to the column at that index. Keep row lengths aligned
with the table's explicit column definitions when present.

| Property | Type                      | Required | Default | Details                                                                                                                                                                                         |
|----------|---------------------------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `cells`  | [UiElement](#uielement)[] | Yes      |         | Array of cell values corresponding to table columns Ordered contents for this row. Each cell is a UiElement so values can use the same primitive and layout renderers as other ViewKit content. |

### RepeatingGroupEntry

Single entry within a repeating group.

A repeating entry carries a stable display label and either one primary value or a list of nested elements, depending on
the shape needed by the feature.

| Property   | Type                      | Required | Default | Details                                                                                                                                   |
|------------|---------------------------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `label`    | string                    | Yes      |         | Entry label Short label identifying this entry within the repeated group.                                                                 |
| `value`    | [UiElement](#uielement)   | No       |         | Primary entry value or nested elements Optional primary visual value for a compact entry. Use elements for a multi-part structured entry. |
| `elements` | [UiElement](#uielement)[] | No       |         | Nested elements for structured entries Optional ordered content for entries that require more than one value element.                     |

### Envelop

Base envelope containing the schema version.

All root ViewKit documents extend this envelope so consumers can identify the schema contract version before processing
the root content.

| Property        | Type  | Required | Default | Details                                                                                                                                                         |
|-----------------|-------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `schemaVersion` | "1.0" | Yes      | `1.0`   | Schema specification version Version of the ViewKit envelope contract. It is a literal value and should be preserved when serializing or forwarding a document. |

## Enums

### TextWeight

Typographic stroke weight styling.

| Member   | Value    | Description              |
|----------|----------|--------------------------|
| `thin`   | `thin`   | Thin / light text weight |
| `normal` | `normal` | Standard text weight     |
| `heavy`  | `heavy`  | Heavy / bold text weight |

### TextIntensity

Visual text color intensity and contrast.

| Member   | Value    | Description                               |
|----------|----------|-------------------------------------------|
| `low`    | `low`    | Low visual contrast / subdued text color  |
| `medium` | `medium` | Standard text color                       |
| `high`   | `high`   | High visual contrast / intense text color |

### Shape

Geometric shape representation for visual containers and indicators.

| Member   | Value    | Description              |
|----------|----------|--------------------------|
| `circle` | `circle` | Circular container shape |
| `square` | `square` | Square container shape   |

### Size

Relative sizing scale for visual elements and indicators.

| Member   | Value    | Description          |
|----------|----------|----------------------|
| `small`  | `small`  | Compact small size   |
| `medium` | `medium` | Standard medium size |
| `large`  | `large`  | Prominent large size |

### StringRepresentation

Visual presentation style for string values.

| Member      | Value       | Description                                              |
|-------------|-------------|----------------------------------------------------------|
| `plain`     | `plain`     | Standard inline text rendering                           |
| `chip`      | `chip`      | Visual chip / tag pill representation                    |
| `multiline` | `multiline` | Multiline text with preserved whitespace and line breaks |

### Separator

Visual separator rendered between sequential elements or items.

| Member  | Value   | Description             |
|---------|---------|-------------------------|
| `bar`   | `bar`   | Vertical dividing bar   |
| `comma` | `comma` | Comma separator         |
| `dot`   | `dot`   | Bullet dot separator    |
| `slash` | `slash` | Forward slash separator |
| `dash`  | `dash`  | Dash separator          |
| `space` | `space` | Space separator         |

### CodeLanguage

Supported syntax highlighting languages for formatted code blocks.

| Member | Value  | Description        |
|--------|--------|--------------------|
| `xml`  | `xml`  | XML markup syntax  |
| `json` | `json` | JSON format syntax |
| `yaml` | `yaml` | YAML format syntax |

### BooleanRepresentation

Visual presentation style for boolean values.

| Member  | Value   | Description                                                             |
|---------|---------|-------------------------------------------------------------------------|
| `plain` | `plain` | Standard inline text rendering (e.g. "true" / "false" or custom labels) |
| `badge` | `badge` | Visual badge pill representation                                        |

### BadgeVariant

Visual color tone variants for badge pill representations.

| Member    | Value     | Description                |
|-----------|-----------|----------------------------|
| `neutral` | `neutral` | Neutral gray tone          |
| `success` | `success` | Success green tone         |
| `warning` | `warning` | Warning yellow/orange tone |
| `danger`  | `danger`  | Danger red tone            |

### TimestampFormat

Presentation format styles for timestamp elements.

| Member     | Value      | Description                                     |
|------------|------------|-------------------------------------------------|
| `datetime` | `datetime` | Complete date and time display                  |
| `date`     | `date`     | Date-only display                               |
| `time`     | `time`     | Time-only display                               |
| `relative` | `relative` | Relative time expression (e.g. "5 minutes ago") |

### ButtonVariant

Visual style variants for interactive button actions.

| Member      | Value       | Description                                                   |
|-------------|-------------|---------------------------------------------------------------|
| `primary`   | `primary`   | Primary emphasis button style for default/recommended actions |
| `secondary` | `secondary` | Secondary standard button style                               |
| `subtle`    | `subtle`    | Subtle low-contrast button style                              |
| `danger`    | `danger`    | Destructive / dangerous action button style                   |

### TableColumnAlign

Text horizontal alignment options for table columns.

Horizontal alignment applied within cells of a TableColumn. The alignment is a presentation choice and does not affect
the stored cell values.

| Member   | Value    | Description         |
|----------|----------|---------------------|
| `left`   | `left`   | Left-aligned text   |
| `center` | `center` | Center-aligned text |
| `right`  | `right`  | Right-aligned text  |

### TableColumnWidthMode

Width mode for table columns.

Controls how an optional TableColumn width is interpreted by the table renderer.

| Member    | Value     | Description                          |
|-----------|-----------|--------------------------------------|
| `fixed`   | `fixed`   | Fixed width constraint               |
| `maximum` | `maximum` | Maximum width upper bound constraint |

### DividerStyle

Visual styling variants for hairline dividers.

Selects the visual stroke treatment used by DividerElement.

| Member     | Value      | Description                 |
|------------|------------|-----------------------------|
| `hairline` | `hairline` | Subtle thin hairline border |
| `solid`    | `solid`    | Solid standard divider line |
| `dashed`   | `dashed`   | Dashed separator line       |

## UiElement variants

Polymorphic root model for visual UI elements.

Every concrete visual element carries a type discriminator whose literal value selects its model and renderer. The
@discriminator ("type") metadata lets schema emitters and SDK generators represent derived models as a polymorphic
hierarchy. Consumers should dispatch on the discriminator and preserve unknown elements when round-tripping data where
possible.

Discriminator property: `type`.

| Model | Discriminator value | Description |

| --- | --- | --- |

| [StringElement](#stringelement) | `string` | Text value primitive with selectable inline, chip, or multiline
presentation. Use this primitive for one textual value when a structured label/value row is unnecessary. Choose
multiline for content whose line breaks should remain visible; modifiers apply presentation traits without changing the
underlying value. |

| [StringsElement](#stringselement) | `strings` | Collection of textual values rendered as an inline sequence or chips.
Use this primitive when several related strings should be rendered as one compact sequence. The client preserves the
array order and inserts the selected separator between values. |

| [StringCodeElement](#stringcodeelement) | `string-code` | Monospace code block or formatted code snippet
representation. Use for source-like or preformatted textual content that should be rendered in a code-oriented style.
The language is a presentation hint; the content is not parsed or validated as code by this contract. |

| [XmlElement](#xmlelement) | `xml` | XML markup code block element. Specialized code-oriented element for XML content.
It uses the custom XML renderer rather than requiring consumers to construct a generic code block. |

| [JsonElement](#jsonelement) | `json` | JSON data or structure representation element. Specialized representation for
JSON text. Supply serialized JSON when consumers should display a JSON document; this field is a string and is not
structurally validated here. |

| [StringUrlElement](#stringurlelement) | `string-url` | Hyperlink representation for external or internal URL
navigation. Use this element when displayed text should also behave as a link. Unlike StringElement, the value is a
navigation destination and may be paired with a separate human-readable label. |

| [IdentifierElement](#identifierelement) | `identifier` | Monospace semantic identifier representation. Use for
identifiers, hashes, and other machine-oriented strings that benefit from monospace styling. The value remains text and
is not resolved as a Picteus entity. |

| [RatioElement](#ratioelement) | `ratio` | Aspect ratio representation (e.g. "16:9", "4:3", "1:1"). Displays a numeric
aspect ratio as a ratio expression. Provide a positive value meaningful to the surrounding content; this type does not
encode the source image dimensions. |

| [DimensionsElement](#dimensionselement) | `dimensions` | Image dimensions representation displaying formatted width
and height in pixels. Displays a width/height pair as image dimensions. Both values are positive pixel counts; together
they describe dimensions, not an aspect ratio or a resize request. |

| [ColourElement](#colourelement) | `color` | Single color representation with hex value, shape/size styling, text
display toggle, and copy affordance. Displays one color swatch with configurable geometry and optional adjacent text.
Supply the color as a hexadecimal string; the schema leaves exact accepted hex formats to the renderer. |

| [NumberUnboundedElement](#numberunboundedelement) | `number-unbounded` | Plain unbounded numeric value primitive
element. Displays a numeric value without a progress scale or rating interpretation. Use unit to communicate the
measurement context; no range is imposed by this model. |

| [NumberBoundedStarsElement](#numberboundedstarselement) | `number-stars` | Bounded numeric rating represented as
visual stars. Displays a score on a star scale. Keep value within the scale from zero through maximum; this model
declares the scale metadata but does not impose a numeric validation bound. |

| [NumberBoundedMeterElement](#numberboundedmeterelement) | `number-meter` | Bounded numeric meter representation
(read-only progress / score bar). Displays a scalar value against a minimum-to-maximum range. Supply comparable bounds
and a value in that range; optional label and unit customize the textual readout without changing the meter scale. |

| [BooleanElement](#booleanelement) | `boolean` | Boolean value primitive with text or badge presentation. Displays a
boolean state using text or a badge. The representation determines whether true/false labels or a colored badge are
used; configured labels and variant are presentation choices only. |

| [TimestampElement](#timestampelement) | `timestamp` | Formatted date and time representation. Displays an epoch
timestamp using a selected date/time format. The input is a count of milliseconds, not seconds; relative formatting is
interpreted by the consumer. |

| [ImageReferenceElement](#imagereferenceelement) | `image-ref` | Thumbnail image reference with placeholder fallback
handling. References an image source for thumbnail rendering and provides accessible text and a fallback source. The
client determines loading, sizing, and placeholder behavior. |

| [MarkdownBlockElement](#markdownblockelement) | `markdown` | Full Markdown fallback block rendered with core
typographic hierarchy, spacing, and styling. Use this custom-renderer escape hatch when the structured ViewKit elements
cannot express the required rich text. Markdown rendering is a presentation fallback; prefer typed elements when
consumers need to inspect individual values. |

| [HtmlBlockElement](#htmlblockelement) | `html` | Sandboxed HTML rendering escape hatch. Use only when structured
elements or Markdown cannot represent the required content. Rendering occurs in a sandboxed host context, but callers
should still avoid embedding untrusted content and should not assume access to application privileges. |

| [MultiSlotElement](#multislotelement) | `multi-slot` | Horizontal row layout with individually sized slots. Use this
layout when a row needs explicit regions with independently controlled widths. Each slot contains one child element;
unlike FlowingElement, the layout does not automatically wrap a sequence of children. |

| [FlowingElement](#flowingelement) | `flowing` | Inline layout container that wraps child elements. Use for compact
related values that should flow horizontally and wrap naturally at the available width. Child order is preserved; an
optional separator is placed between neighboring children. |

| [LabelValueElement](#labelvalueelement) | `label-value` | Label and value row with an optional divider. Represents one
named value with a muted left-hand label and a right-hand visual element. Use it for a single field; use TableElement
for repeated rows or column-aligned data. |

| [TableElement](#tableelement) | `table` | Structured tabular data with optional columns and separators. Use for data
that benefits from aligned rows and columns, including key/value and multi-column tables. Supply rows in display order;
explicit columns are optional, and divider/striping flags independently control visual separators and alternating
backgrounds. |

| [RepeatingGroupElement](#repeatinggroupelement) | `repeating-group` | Repeating group container where entries share
uniform structure and retain per-entry labels. Groups a sequence of labeled entries under one optional section title.
Use it when records have the same general presentation but need their own labels. |

| [CollapsibleGroupElement](#collapsiblegroupelement) | `collapsible-group` | Collapsible disclosure container
(accordion) with summary badge. Groups nested content behind a disclosure control. The title names the group, summary
can provide a compact status indicator, and defaultExpanded controls only the initial state. |

| [DividerElement](#dividerelement) | `divider` | Visual hairline separator separating sections or element groups. A
standalone visual separator for dividing adjacent sections or element groups. Use the divider flags on tables or rows
when the separator is part of that structure. |

## UiAction variants

Polymorphic base model for interactive actions.

Shared action contract for user-invokable card controls. Concrete action models provide their own discriminator and
action-specific destination or command fields.

Discriminator property: `type`.

| Model | Discriminator value | Description |

| --- | --- | --- |

| [ButtonActionElement](#buttonactionelement) | `button` | Interactive button action triggering an extension command.
When activated, the client dispatches commandId to the specified extension and may include target and parameters as
command input. disabled and variant affect presentation and availability, not the command's authorization. |

| [ExternalLinkActionElement](#externallinkactionelement) | `external-link` | External link action distinct from inline
URL text values. Renders a user-invokable action that opens a destination externally. Use StringUrlElement for a link
embedded in content rather than an action control. |
