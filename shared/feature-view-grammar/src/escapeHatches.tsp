import "./base.tsp";
import "./modifiers.tsp";

namespace Picteus.FeatureViewGrammar;

@doc("Full Markdown fallback block rendered with core typographic hierarchy, spacing, and styling.")
@uiWidget("markdown")
@dslAlias("markdown")
@customRenderer
model MarkdownBlockElement extends UiElement {
  @doc("Discriminator type")
  type: "markdown";

  @doc("Raw Markdown markup content")
  content: string;

  @doc("Optional visual modifiers (copyable)")
  @uiModifiers
  modifiers?: BaseModifiers;
}

@doc("Sandboxed HTML rendering escape hatch.")
@uiWidget("html")
@dslAlias("html")
@customRenderer
model HtmlBlockElement extends UiElement {
  @doc("Discriminator type")
  type: "html";

  @doc("Raw HTML markup content")
  content: string;

  @doc("Optional visual modifiers (copyable)")
  @uiModifiers
  modifiers?: BaseModifiers;
}
