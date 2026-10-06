import "./base.tsp";
import "./modifiers.tsp";

namespace Picteus.ViewKit;

@summary("Full Markdown fallback block rendered with core typographic hierarchy, spacing, and styling.")
@doc("Use this custom-renderer escape hatch when the structured ViewKit elements cannot express the required rich text. Markdown rendering is a presentation fallback; prefer typed elements when consumers need to inspect individual values.")
@uiWidget("markdown")
@dslAlias("markdown")
@customRenderer
model MarkdownBlockElement extends UiElement {
  @summary("Discriminator type")
  type: "markdown";

  @summary("Raw Markdown markup content")
  @doc("Markdown source consumed by the client renderer. The schema treats it as an opaque string and does not validate the markup or its links.")
  content: string;

  @summary("Optional visual modifiers (copyable)")
  @uiModifiers
  modifiers?: BaseModifiers;
}

@summary("Sandboxed HTML rendering escape hatch.")
@doc("Use only when structured elements or Markdown cannot represent the required content. Rendering occurs in a sandboxed host context, but callers should still avoid embedding untrusted content and should not assume access to application privileges.")
@uiWidget("html")
@dslAlias("html")
@customRenderer
model HtmlBlockElement extends UiElement {
  @summary("Discriminator type")
  type: "html";

  @summary("Raw HTML markup content")
  @doc("HTML source passed to the custom renderer. This is an opaque string, not a typed or sanitized DOM structure.")
  content: string;

  @summary("Optional visual modifiers (copyable)")
  @uiModifiers
  modifiers?: BaseModifiers;
}
