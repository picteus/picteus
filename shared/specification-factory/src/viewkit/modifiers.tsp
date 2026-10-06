namespace Picteus.ViewKit;

@summary("Typographic stroke weight styling.")
enum TextWeight {
  @summary("Thin / light text weight")
  thin: "thin",

  @summary("Standard text weight")
  normal: "normal",

  @summary("Heavy / bold text weight")
  heavy: "heavy"
}

@summary("Visual text color intensity and contrast.")
enum TextIntensity {
  @summary("Low visual contrast / subdued text color")
  low: "low",

  @summary("Standard text color")
  medium: "medium",

  @summary("High visual contrast / intense text color")
  high: "high"
}

@summary("Geometric shape representation for visual containers and indicators.")
enum Shape {
  @summary("Circular container shape")
  circle: "circle",

  @summary("Square container shape")
  square: "square"
}

@summary("Relative sizing scale for visual elements and indicators.")
enum Size {
  @summary("Compact small size")
  small: "small",

  @summary("Standard medium size")
  medium: "medium",

  @summary("Prominent large size")
  large: "large"
}

@summary("Truncation configuration for long textual content with optional expand affordance.")
@doc("Controls how a renderer abbreviates long text. The character limit is a presentation threshold rather than a validation limit; showMore lets the user reveal the remaining text.")
model TruncateOptions {
  @summary("Maximum number of characters to display before truncating")
  @doc("Threshold after which the renderer can shorten the displayed text. This does not constrain the stored string or remove its undisplayed content.")
  characterLimit: int32;

  @summary("Whether to render a \"Show more\" / \"Show less\" toggle affordance")
  @doc("When true, permits an expand/collapse control for text beyond the truncation threshold. Defaults to true.")
  showMore?: boolean = true;
}

@summary("Base modifier traits for elements that support copy affordance.")
@doc("Common optional presentation traits shared by primitive values and content renderers. Modifiers affect how content is displayed or copied; they do not transform the source value.")
model BaseModifiers {
  @summary("Adds an interactive copy button/action next to the rendered value")
  @doc("When true, exposes a copy affordance for the associated value where supported by the renderer.")
  copyable?: boolean;
}

@summary("Common modifier traits that can be attached to primitive elements.")
@doc("Extends BaseModifiers with text styling controls. Defaults provide normal weight, medium intensity, and proportional text unless a feature explicitly overrides them.")
model PrimitiveModifiers extends BaseModifiers {
  @summary("Configures character truncation threshold with show-more affordance")
  @doc("Optional text abbreviation behavior. The source text remains unchanged, and the renderer may offer expansion according to showMore.")
  truncate?: TruncateOptions;

  @summary("Typographic text weight")
  @doc("Relative font weight for textual rendering; defaults to normal.")
  weight?: TextWeight = TextWeight.normal;

  @summary("Visual text color intensity")
  @doc("Relative contrast treatment for the text; defaults to medium.")
  intensity?: TextIntensity = TextIntensity.medium;

  @summary("Whether to use monospace font rendering (for hashes, IDs, codes)")
  @doc("When true, requests a fixed-width font suitable for identifiers and code-like values. Defaults to false.")
  monospace?: boolean = false;
}
