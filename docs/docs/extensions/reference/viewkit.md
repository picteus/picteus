# ViewKit

**ViewKit** is a visual grammar for describing how the UI features of an image should be displayed and laid out in the
Picteus front-end application. It describes presentation: the elements to render, their order, their grouping, and their
layout.

ViewKit complements the other types of image features. Those features are stored in a more **vectorial** manner: they
represent extracted or computed values that can be indexed, compared, searched, or used by processing algorithms.
ViewKit does not replace those values and is not an image embedding. It is a structured view of feature information for
people.

The ViewKit v1 JSON Schema is available at
[`https://picteus.github.io/picteus/jsonschema/viewkit-v1.schema.json`](https://picteus.github.io/picteus/jsonschema/viewkit-v1.schema.json),
which may be used to validate ViewKit documents — its source being located at [`docs/static/jsonschema/viewkit-v1.json`](https://raw.githubusercontent.com/picteus/picteus/refs/heads/main/docs/static/jsonschema/viewkit-v1.schema.json).

## When to use ViewKit

Use ViewKit when a feature needs a meaningful visual presentation in the front-end, for example:

- a title and summary for a feature card;
- a list of labels and values;
- a confidence score displayed as a meter or stars;
- a color palette, image thumbnail, timestamp, or aspect ratio;
- a table or a repeated group of records;
- a collapsible section containing additional details.

The same underlying feature can therefore have both a vectorial representation for machines and a ViewKit representation
for the UI.

## Document structure

A ViewKit document is a `UiContainer` object with the following envelope:

| Property        | Required | Description                                               |
|-----------------|----------|-----------------------------------------------------------|
| `schemaVersion` | Yes      | ViewKit schema version. Version 1 uses the value `"1.0"`. |
| `elements`      | Yes      | Ordered list of visual elements and layout structures.    |

`UiContainer` is the only supported root for now. It contains the ordered
`elements` list and the required ViewKit schema version.

Each element has a `type` discriminator. Unknown element types are allowed by the schema as long as they contain a
`type`, which lets the front-end remain forward-compatible with newer grammar elements.

## Element types

### Values and content

| Type               | Purpose                                                                           |
|--------------------|-----------------------------------------------------------------------------------|
| `string-short`     | Short text, optionally rendered as a `plain` value or a `chip`.                   |
| `string-long`      | Multiline text such as a description or comment.                                  |
| `string-code`      | Formatted code with optional `xml`, `json`, or `yaml` language highlighting.      |
| `xml`              | XML markup content.                                                               |
| `json`             | JSON data or structure.                                                           |
| `string-url`       | A URL with optional custom link text.                                             |
| `identifier`       | A semantic identifier, generally rendered in monospace.                           |
| `ratio`            | An aspect ratio such as `"16:9"` or `"1:1"`.                                      |
| `color-swatch`     | A hexadecimal color with a color swatch and copy affordance.                      |
| `number-unbounded` | A numeric value with an optional unit.                                            |
| `number-stars`     | A bounded numeric rating rendered as stars.                                       |
| `number-meter`     | A bounded numeric value rendered as a read-only meter.                            |
| `boolean-plain`    | A boolean rendered as plain text.                                                 |
| `boolean-badge`    | A boolean rendered as a colored badge.                                            |
| `timestamp`        | A date or time rendered as `full`, `date`, `time`, or `relative`.                 |
| `image-ref`        | An image thumbnail with alternative text, aspect ratio, and fallback placeholder. |
| `color-set`        | A palette of hexadecimal colors ordered by dominance.                             |
| `markdown`         | Markdown content rendered with the application's typography.                      |
| `html`             | Sandboxed HTML content for cases not covered by the other elements.               |

Primitive elements can use modifiers such as text intensity, weight, truncation, monospace rendering, or copy support.

### Layout and grouping

| Type                | Purpose                                                                                 |
|---------------------|-----------------------------------------------------------------------------------------|
| `multi-slot`        | Horizontal row with slots and declared proportions such as `"1/3 + 2/3"` or `"equal"`.  |
| `label-value`       | Label on the left and a rendered value on the right, optionally separated by a divider. |
| `table`             | Structured rows and optional columns, headers, striping, and separators.                |
| `repeating-group`   | Repeated entries sharing a common structure and retaining their labels.                 |
| `collapsible-group` | Expandable section with a title, summary, and nested elements.                          |
| `divider`           | A visual separator with `hairline`, `solid`, or `dashed` styling.                       |

Layout elements contain other `UiElement` values where appropriate. Their order is significant: the front-end renders
the elements in the order in which they occur in the document.

## Example

The following document presents a feature with a confidence meter, a label-value row, and an expandable details section:

```json
{
  "schemaVersion": "1.0",
  "elements": [
    {
      "type": "label-value",
      "label": "Primary object",
      "value": {
        "type": "string-short",
        "value": "Bicycle",
        "representation": "chip"
      }
    },
    {
      "type": "number-meter",
      "value": 0.92,
      "minimum": 0,
      "maximum": 1,
      "label": "Confidence"
    },
    {
      "type": "collapsible-group",
      "title": "Detection details",
      "summary": "2 regions",
      "defaultExpanded": false,
      "elements": [
        {
          "type": "string-long",
          "value": "The model detected two bicycle regions."
        }
      ]
    }
  ]
}
```

The values in this example remain structured data: `0.92` is still a numeric confidence value and `"Bicycle"` is still
text that can be processed or indexed independently of its visual representation. ViewKit adds the front-end grammar
that determines how those values are presented to the user.

## Best practices

When producing ViewKit from an extension, keep the document focused on display. Store searchable, comparable, or
algorithmic feature data through the regular feature APIs as well; use ViewKit to give that data a clear and useful
visual layout.
