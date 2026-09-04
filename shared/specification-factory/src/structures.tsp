import "./base.tsp";
import "./modifiers.tsp";
import "./primitives.tsp";

namespace Picteus.ViewKit;

@doc("Single slot within a multi-slot horizontal row layout.")
model Slot {
  @doc("Optional slot label (e.g. \"Slot A\")")
  label?: string;

  @doc("Relative or fractional width proportion (e.g. \"1/3\", \"2/3\", \"100px\", \"auto\")")
  width?: string;

  @doc("Rendered content inside the slot")
  content: UiElement;
}

@doc("""
  Multi-slot horizontal row with declared column width proportions.
  Examples: "1/3 + 2/3", "equal thirds", "1/4 + 3/4".
  """)
@uiLayout("row-slots")
@dslAlias("multiSlot")
model MultiSlotRowElement extends UiElement {
  @doc("Discriminator type")
  type: "multi-slot";

  @doc("Proportions descriptor (e.g. \"1/3 + 2/3\", \"equal\", \"1/4 + 3/4\")")
  proportions?: string;

  @doc("List of slots comprising the row")
  slots: Slot[];
}

@doc("""
  Standard label and value row.
  Displays a muted label on the left and value representation on the right with a vertical dividing line.
  """)
@uiLayout("row")
@dslAlias("labelValue")
model LabelValueRowElement extends UiElement {
  @doc("Discriminator type")
  type: "label-value";

  @doc("Key or descriptive label displayed muted on the left")
  @uiLabel
  label: string;

  @doc("Rendered value element on the right")
  @uiValue
  value: UiElement;

  @doc("Whether to render a bottom border/hairline divider")
  @uiDivider("horizontal")
  withDivider?: boolean = false;
}

@doc("Text horizontal alignment options for table columns.")
enum TableColumnAlign {
  @doc("Left-aligned text")
  left: "left",

  @doc("Center-aligned text")
  center: "center",

  @doc("Right-aligned text")
  right: "right",
}

@doc("Column definition for structured tables.")
model TableColumn {
  @doc("Display header text")
  header?: string;

  @doc("Text horizontal alignment")
  align?: TableColumnAlign = TableColumnAlign.left;

  @doc("Optional width constraint")
  width?: string;
}

@doc("Single table row containing an array of cell values.")
model TableRow {
  @doc("Array of cell values corresponding to table columns")
  cells: UiElement[];
}

@doc("""
  Structured tabular data representation.
  Supports header/borderless modes, 2-column key-value tables, and 3-column data tables.
  """)
@uiLayout("table")
model TableElement extends UiElement {
  @doc("Discriminator type")
  type: "table";

  @doc("Whether to render a column header row")
  hasHeader?: boolean = true;

  @doc("Whether to render alternating row background colors")
  isStriped?: boolean = false;

  @doc("Whether to render vertical column separators")
  @uiDivider("vertical")
  withColumnSeparators?: boolean = false;

  @doc("Whether to render horizontal row separators")
  @uiDivider("horizontal")
  withRowSeparators?: boolean = false;

  @doc("Optional explicit column definitions")
  columns?: TableColumn[];

  @doc("Tabular data rows")
  rows: TableRow[];
}

@doc("Single entry within a repeating group.")
model RepeatingGroupEntry {
  @doc("Entry label")
  label: string;

  @doc("Primary entry value or nested elements")
  value?: UiElement;

  @doc("Nested elements for structured entries")
  elements?: UiElement[];
}

@doc("Repeating group container where entries share uniform structure and retain per-entry labels.")
@uiLayout("repeating-group")
model RepeatingGroupElement extends UiElement {
  @doc("Discriminator type")
  type: "repeating-group";

  @doc("Optional section header for the group")
  title?: string;

  @doc("List of repeated entry records")
  entries: RepeatingGroupEntry[];
}

@doc("Collapsible disclosure container (accordion) with summary badge.")
@uiLayout("accordion")
model CollapsibleGroupElement extends UiElement {
  @doc("Discriminator type")
  type: "collapsible-group";

  @doc("Group title (e.g. \"Show specimen details\")")
  title: string;

  @doc("Secondary summary indicator (e.g. \"2 neutral values\")")
  summary?: string;

  @doc("Whether the disclosure is open/expanded by default")
  defaultExpanded?: boolean = false;

  @doc("Nested content elements revealed when expanded")
  elements: UiElement[];
}

@doc("Visual styling variants for hairline dividers.")
enum DividerStyle {
  @doc("Subtle thin hairline border")
  hairline: "hairline",

  @doc("Solid standard divider line")
  solid: "solid",

  @doc("Dashed separator line")
  dashed: "dashed",
}

@doc("Visual hairline separator separating sections or element groups.")
@uiWidget("divider")
model DividerElement extends UiElement {
  @doc("Discriminator type")
  type: "divider";

  @doc("Line styling")
  style?: DividerStyle = DividerStyle.hairline;
}
