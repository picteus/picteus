import "../dist/emitter/decorators.js";

using TypeSpec.Reflection;

namespace Picteus.FeatureViewGrammar;

/** Marks a model as the root composition container for fluent builder generation. */
extern dec dslRoot(target: Model);

/** Declares an ergonomic DSL function alias for this model. */
extern dec dslAlias(
  target: Model,
  name: valueof (
    | "multiSlot"
    | "labelValue"
    | "colorSwatch"
    | "numberStars"
    | "numberMeter"
    | "imageRef"
    | "dominantColors"
    | "markdown"
    | "html"
  )
);

/** Excludes a model from public DSL factory generation (e.g. internal specimen fixtures). */
extern dec dslIgnore(target: Model);

/** Declares the container layout strategy for a UI element model. */
extern dec uiLayout(
  target: Model,
  layout: valueof (
    | "card"
    | "row"
    | "row-slots"
    | "table"
    | "repeating-group"
    | "accordion"
  )
);

/** Declares the visual widget role for a primitive or leaf element. */
extern dec uiWidget(
  target: Model,
  widget: valueof (
    | "string-short"
    | "string-long"
    | "string-code"
    | "string-url"
    | "identifier"
    | "ratio"
    | "color-swatch"
    | "color-set"
    | "number-unbounded"
    | "number-stars"
    | "meter"
    | "boolean-plain"
    | "boolean-badge"
    | "timestamp"
    | "image-ref"
    | "divider"
    | "markdown"
    | "html"
    | "button-action"
    | "link-action"
  )
);

/** Marks a property as the muted descriptive key/label in a row/card layout. */
extern dec uiLabel(target: ModelProperty);

/** Marks a property as the primary nested value container (rendered via polymorphic dispatcher). */
extern dec uiValue(target: ModelProperty);

/** Marks a boolean property as a toggleable separator/divider. */
extern dec uiDivider(
  target: ModelProperty,
  orientation?: valueof ("horizontal" | "vertical")
);

/** Marks a property as a numeric scale bound or unit for meters/ratings. */
extern dec uiMeterBound(
  target: ModelProperty,
  bound: valueof ("minimum" | "maximum" | "label" | "unit")
);

/** Marks a property as carrying common primitive modifiers (copyable, truncate, emphasis, monospace). */
extern dec uiModifiers(target: ModelProperty);

