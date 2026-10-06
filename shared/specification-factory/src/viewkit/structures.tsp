import "./base.tsp";
import "./modifiers.tsp";
import "./primitives.tsp";

namespace Picteus.ViewKit;

@summary("Single slot within a multi-slot horizontal row layout.")
@doc("A slot combines an optional label, a relative width, and one visual child. Slot widths are percentages of the row and should be chosen so the full row's widths form a usable layout.")
model Slot {
  @summary("Optional slot label (e.g. \"Slot A\")")
  @doc("Short text identifying this region of the row. It is independent of the rendered content.")
  label?: string;

  @summary("Width percentage (1-100)")
  @doc("Relative share of the row width. The schema constrains explicit values to the inclusive range 1 through 100.")
  @minValue(1)
  @maxValue(100)
  width?: integer;

  @summary("Rendered content inside the slot")
  @doc("One visual element displayed in this slot. Use a nested layout element when the slot itself needs multiple children.")
  content: UiElement;
}

@summary("Horizontal row layout with individually sized slots.")
@doc("Use this layout when a row needs explicit regions with independently controlled widths. Each slot contains one child element; unlike FlowingElement, the layout does not automatically wrap a sequence of children.")
@uiLayout("row-slots")
@dslAlias("multiSlot")
model MultiSlotElement extends UiElement {
  @summary("Discriminator type")
  type: "multi-slot";

  @summary("List of slots comprising the row")
  @doc("Ordered slots in the row. Each slot's width is a percentage; arrange slot definitions in the intended visual order.")
  slots: Slot[];
}

@summary("Inline layout container that wraps child elements.")
@doc("Use for compact related values that should flow horizontally and wrap naturally at the available width. Child order is preserved; an optional separator is placed between neighboring children.")
@uiLayout("flowing")
@dslAlias("flowing")
model FlowingElement extends UiElement {
  @summary("Discriminator type")
  type: "flowing";

  @summary("Optional visual separator rendered between sequential child elements")
  @doc("Separator placed between adjacent elements. Omit it when spacing or the child renderers already provide sufficient separation.")
  separator?: Separator;

  @summary("List of child elements rendered sequentially with line wrapping")
  @doc("Ordered children rendered in the flow. The client wraps them as needed rather than requiring callers to calculate line breaks.")
  elements: UiElement[];
}

@summary("Label and value row with an optional divider.")
@doc("Represents one named value with a muted left-hand label and a right-hand visual element. Use it for a single field; use TableElement for repeated rows or column-aligned data.")
@uiLayout("row")
@dslAlias("labelValue")
model LabelValueElement extends UiElement {
  @summary("Discriminator type")
  type: "label-value";

  @summary("Key or descriptive label displayed muted on the left")
  @doc("Human-readable name for the value. This text is rendered as the row label rather than as a separate UiElement.")
  @uiLabel
  label: string;

  @summary("Rendered value element on the right")
  @doc("Value content rendered in the right-hand region. It may be a primitive or a nested structural element.")
  @uiValue
  value: UiElement;

  @summary("Whether to render a bottom border/hairline divider")
  @doc("Enables a horizontal separator beneath this row when true. Defaults to false.")
  @uiDivider("horizontal")
  withDivider?: boolean = false;
}

@summary("Text horizontal alignment options for table columns.")
@doc("Horizontal alignment applied within cells of a TableColumn. The alignment is a presentation choice and does not affect the stored cell values.")
enum TableColumnAlign {
  @summary("Left-aligned text")
  left: "left",

  @summary("Center-aligned text")
  center: "center",

  @summary("Right-aligned text")
  right: "right"
}

@summary("Width mode for table columns.")
@doc("Controls how an optional TableColumn width is interpreted by the table renderer.")
enum TableColumnWidthMode {
  @summary("Fixed width constraint")
  fixed: "fixed",

  @summary("Maximum width upper bound constraint")
  maximum: "maximum"
}

@summary("Column definition for structured tables.")
@doc("Describes one table column and its visual sizing. When columns are supplied, their order corresponds to the position of each cell in a row.")
model TableColumn {
  @summary("Display header text")
  @doc("Optional header shown above values in this column. Omit when the table has no header row.")
  header?: string;

  @summary("Text horizontal alignment")
  @doc("Horizontal alignment applied to cell content in the column. Defaults to left.")
  align?: TableColumnAlign = TableColumnAlign.left;

  @summary("Width percentage (1-100)")
  @doc("Column width percentage used with widthMode. Explicit values are constrained to 1 through 100.")
  @minValue(1)
  @maxValue(100)
  width?: integer;

  @summary("Sizing mode for the provided width")
  @doc("Determines whether width is a fixed percentage allocation or an upper bound. Defaults to fixed.")
  widthMode?: TableColumnWidthMode = TableColumnWidthMode.fixed;
}

@summary("Single table row containing an array of cell values.")
@doc("A row's cell array is positional: cell at each index corresponds to the column at that index. Keep row lengths aligned with the table's explicit column definitions when present.")
model TableRow {
  @summary("Array of cell values corresponding to table columns")
  @doc("Ordered contents for this row. Each cell is a UiElement so values can use the same primitive and layout renderers as other ViewKit content.")
  cells: UiElement[];
}

@summary("Structured tabular data with optional columns and separators.")
@doc("Use for data that benefits from aligned rows and columns, including key/value and multi-column tables. Supply rows in display order; explicit columns are optional, and divider/striping flags independently control visual separators and alternating backgrounds.")
@uiLayout("table")
model TableElement extends UiElement {
  @summary("Discriminator type")
  type: "table";

  @summary("Whether to render alternating row background colors")
  @doc("Enables alternating backgrounds across successive rows to improve scanability. Defaults to false.")
  isStriped?: boolean = false;

  @summary("Whether to render vertical column separators")
  @doc("Adds vertical dividers between columns when true. Defaults to false.")
  @uiDivider("vertical")
  withColumnSeparators?: boolean = false;

  @summary("Whether to render horizontal row separators")
  @doc("Adds horizontal dividers between rows when true. Defaults to false.")
  @uiDivider("horizontal")
  withRowSeparators?: boolean = false;

  @summary("Optional explicit column definitions")
  @doc("Optional ordered column metadata defining headers, alignment, and width. When omitted, the renderer may infer a basic layout from row cells.")
  columns?: TableColumn[];

  @summary("Tabular data rows")
  @doc("Ordered table rows. Each row's cells correspond positionally to the declared columns.")
  rows: TableRow[];
}

@summary("Single entry within a repeating group.")
@doc("A repeating entry carries a stable display label and either one primary value or a list of nested elements, depending on the shape needed by the feature.")
model RepeatingGroupEntry {
  @summary("Entry label")
  @doc("Short label identifying this entry within the repeated group.")
  label: string;

  @summary("Primary entry value or nested elements")
  @doc("Optional primary visual value for a compact entry. Use elements for a multi-part structured entry.")
  value?: UiElement;

  @summary("Nested elements for structured entries")
  @doc("Optional ordered content for entries that require more than one value element.")
  elements?: UiElement[];
}

@summary("Repeating group container where entries share uniform structure and retain per-entry labels.")
@doc("Groups a sequence of labeled entries under one optional section title. Use it when records have the same general presentation but need their own labels.")
@uiLayout("repeating-group")
model RepeatingGroupElement extends UiElement {
  @summary("Discriminator type")
  type: "repeating-group";

  @summary("Optional section header for the group")
  @doc("Heading displayed for the repeated section, separate from the labels of individual entries.")
  title?: string;

  @summary("List of repeated entry records")
  @doc("Entries in display order. Each entry supplies its own label and content.")
  entries: RepeatingGroupEntry[];
}

@summary("Collapsible disclosure container (accordion) with summary badge.")
@doc("Groups nested content behind a disclosure control. The title names the group, summary can provide a compact status indicator, and defaultExpanded controls only the initial state.")
@uiLayout("accordion")
model CollapsibleGroupElement extends UiElement {
  @summary("Discriminator type")
  type: "collapsible-group";

  @summary("Group title (e.g. \"Show specimen details\")")
  @doc("Text shown on the disclosure control. Use a concise action or section name that remains meaningful while the content is collapsed.")
  title: string;

  @summary("Secondary summary indicator (e.g. \"2 neutral values\")")
  @doc("Compact contextual text shown alongside the title while the group is collapsed or expanded. It does not replace the nested content.")
  summary?: string;

  @summary("Whether the disclosure is open/expanded by default")
  @doc("Initial expanded state requested by the data. Defaults to false; subsequent interaction is managed by the client.")
  defaultExpanded?: boolean = false;

  @summary("Nested content elements revealed when expanded")
  @doc("Ordered child elements made visible by expanding the group.")
  elements: UiElement[];
}

@summary("Visual styling variants for hairline dividers.")
@doc("Selects the visual stroke treatment used by DividerElement.")
enum DividerStyle {
  @summary("Subtle thin hairline border")
  hairline: "hairline",

  @summary("Solid standard divider line")
  solid: "solid",

  @summary("Dashed separator line")
  dashed: "dashed"
}

@summary("Visual hairline separator separating sections or element groups.")
@doc("A standalone visual separator for dividing adjacent sections or element groups. Use the divider flags on tables or rows when the separator is part of that structure.")
@uiWidget("divider")
model DividerElement extends UiElement {
  @summary("Discriminator type")
  type: "divider";

  @summary("Line styling")
  @doc("Visual stroke treatment for the separator. Defaults to a subtle hairline.")
  style?: DividerStyle = DividerStyle.hairline;
}
