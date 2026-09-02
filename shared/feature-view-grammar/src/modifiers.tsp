namespace Picteus.FeatureViewGrammar;

@doc("Text emphasis and visual weight styling.")
enum Emphasis {
  @doc("Subdued or secondary appearance with lower visual contrast")
  muted: "muted",

  @doc("Standard text weight and contrast")
  normal: "normal",

  @doc("Emphasized / bold text weight for prominence")
  strong: "strong",
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

  @doc("Text emphasis level")
  emphasis?: Emphasis = Emphasis.normal;

  @doc("Whether to use monospace font rendering (for hashes, IDs, codes)")
  monospace?: boolean = false;
}
