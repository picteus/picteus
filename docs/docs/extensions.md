# Extensions documentation

The extensions documentation describes how Picteus extensions are designed, authored, packaged, installed, and integrated with the application. It covers both conceptual guidance and the detailed contracts exposed by the extension SDKs and manifest format.

## Documentation in this section

- [Extensions guide](extensions/guide.md) — learn the extension model and follow the end-to-end authoring workflow;
- [Extension reference](extensions/reference/overview.md) — consult the reference documentation for the extension manifest, class, API, user interface, intents, and manual contracts;
- [Unpacked extensions](extensions/unpacked.md) — develop and load extensions directly from a directory during iteration.

## Guidance

Begin with the [Extensions guide](extensions/guide.md) for the complete workflow. Use the [Extension reference](extensions/reference/overview.md) to identify the relevant contract and navigate to the focused reference page for the manifest, class, API, UI, intent, or manual feature you are implementing. Use [Unpacked extensions](extensions/unpacked.md) when developing locally without packaging an archive.

An extension must provide a `manifest.json` file and an implementation class inheriting from `PicteusExtension`. Keep those two contracts aligned as you add event subscriptions, capabilities, commands, settings, and UI integrations.
