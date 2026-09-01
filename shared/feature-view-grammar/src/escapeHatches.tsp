import "./base.tsp";

namespace Picteus.FeatureViewGrammar;

@doc("Full Markdown fallback block rendered with core typographic hierarchy, spacing, and styling.")
@dslAlias("markdown")
model MarkdownBlockElement extends UiElement {
  @doc("Discriminator type")
  type: "markdown";

  @doc("Raw Markdown markup content")
  content: string;
}

@doc("Sandboxed HTML rendering escape hatch.")
@dslAlias("html")
model HtmlBlockElement extends UiElement {
  @doc("Discriminator type")
  type: "html";

  @doc("Raw HTML markup content")
  content: string;
}
