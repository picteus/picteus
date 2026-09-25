# Extensions documentation

Extensions are a central part of Picteus because they allow the application to evolve without requiring changes to its core. An extension can add or adapt application features, contribute image-processing and enrichment workflows, and change how users interact with the application through additional UI and UX integrations. These capabilities are exposed through application contracts rather than through a fixed set of built-in behaviors, so extensions can be developed and operated autonomously from the core application.

Extensions may be authored by software developers who need to integrate specialist tools, automate domain-specific workflows, or provide functionality for a wider user community. They may also be created by individual users with the help of AI-assisted vibe-coding. This lowers the threshold for adapting Picteus to a particular working method: a user can describe a need, produce a focused extension, and refine it as their workflow changes. In this way, each user can maintain a distinct version of the application — a personal flavor shaped around their own requirements, data, tools, and preferred interactions.

Extensions also provide a bridge between Picteus and the complementary software around it. An extension can embed or use
other APIs, making it straightforward to connect Picteus with third-party applications and services. It can translate
between their contracts, pass data and actions across the boundary, and bring the result back into Picteus as part of a
coherent workflow. This makes extensions an efficient way to build the integration glue that lets the platform
collaborate with the tools users already rely on.

The extensions documentation describes how these extensions are designed, authored, packaged, installed, and integrated with the application. It covers both conceptual guidance and the detailed contracts exposed by the extension SDKs and manifest format.

## Documentation in this section

- [Extensions guide](extensions/guide.md) — learn the extension model and follow the end-to-end authoring workflow;
- [Extension reference](extensions/reference/overview.md) — consult the reference documentation for the extension manifest, class, API, user interface, intents, and manual contracts;
- [Unpacked extensions](extensions/unpacked.md) — develop and load extensions directly from a directory during iteration.

## Guidance

Begin with the [Extensions guide](extensions/guide.md) for the complete workflow. Use the [Extension reference](extensions/reference/overview.md) to identify the relevant contract and navigate to the focused reference page for the manifest, class, API, UI, intent, or manual feature you are implementing. Use [Unpacked extensions](extensions/unpacked.md) when developing locally without packaging an archive.

An extension must provide a `manifest.json` file and an implementation class inheriting from `PicteusExtension`. Keep those two contracts aligned as you add event subscriptions, capabilities, commands, settings, and UI integrations.
