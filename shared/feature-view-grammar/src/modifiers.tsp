namespace Picteus.FeatureViewGrammar;

@doc("Typographic stroke weight styling.")
enum TextWeight {
  @doc("Thin / light text weight")
  thin: "thin",

  @doc("Standard text weight")
  normal: "normal",

  @doc("Heavy / bold text weight")
  heavy: "heavy",
}

@doc("Visual text color intensity and contrast.")
enum TextIntensity {
  @doc("Low visual contrast / subdued text color")
  low: "low",

  @doc("Standard text color")
  medium: "medium",

  @doc("High visual contrast / intense text color")
  high: "high",
}

@doc("Truncation configuration for long textual content with optional expand affordance.")
model TruncateOptions {
  @doc("Maximum number of characters to display before truncating")
  characterLimit: int32;

  @doc("Whether to render a \"Show more\" / \"Show less\" toggle affordance")
  showMore?: boolean = true;
}

@doc("Base modifier traits for elements that support copy affordance.")
model BaseModifiers {
  @doc("Adds an interactive copy button/action next to the rendered value")
  copyable?: boolean;
}

@doc("Common modifier traits that can be attached to primitive elements.")
model PrimitiveModifiers extends BaseModifiers {
  @doc("Configures character truncation threshold with show-more affordance")
  truncate?: TruncateOptions;

  @doc("Typographic text weight")
  weight?: TextWeight = TextWeight.normal;

  @doc("Visual text color intensity")
  intensity?: TextIntensity = TextIntensity.medium;

  @doc("Whether to use monospace font rendering (for hashes, IDs, codes)")
  monospace?: boolean = false;
}
