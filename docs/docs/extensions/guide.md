# Guide

This documentation walks you through the development of a Picteus extension.

## Programming language

In order to start developing an extension, you need to decide the programming language: either **TypeScript** (or JavaScript) with a Node.js runtime or **Python**. This choice depends on your programming experience or the AI coding agent you intend to use:

- **TypeScript / Node.js**: requires a compilation step to compile TypeScript into JavaScript — via the `npm run build` command. When developing unpacked extensions, code changes require recompilation before they are reloaded by the runtime ;
- **Python**: as an interpreted language, Python requires no compilation phase. Source code files are executed directly by the runtime upon the next reload, which makes the [Hot-Reloading Module (HMR)](./unpacked.md#hot-reloading-module-hmr-mechanism) cycle significantly faster and more seamless during development.

For more details on the hosted runtime environments and versions, see the [Language & runtime](./reference/overview.md#language--runtime) section in the reference documentation.

## Initial scaffolding

 The next step is to have the scaffolding of all the necessary resources of an extension, containing the 2 main resources described in [overview.md](reference/overview.md#extension-anatomy-what-you-need-to-build-an-extension).

### Via generation

The back-end API exposes a dedicated endpoint — `/extension/generate` (OpenAPI operation ID: `extension_generate`, method: `ExtensionApi.extensionGenerate`) — which generates from inputs specifying its identity, its name, its runtime environment — Node.js or Python — a zip archive containing all the extension resources, including the `manifest.json`, the source code, the `package.json` or `requirements.txt`, an icon, a MANUAL.md (the `tsconfig.json` file is also provided for Node.js).

That archive may be directly used to:
- install that extension from the UI, or even via the back-end API through the dedicated endpoint — `/extension/install` (OpenAPI operation ID: `extension_install`, method: `ExtensionApi.extensionInstall`) — which enables to tell whether it should be installed as a regular extension or as an unpacked extension via the `asUnpacked` parameter ;
- or to bootstrap a new extension project, that may be developed from an IDE or by an AI coding agent.

### Copy & paste

Picteus offers example extensions for every runtime, totally identical in terms of specifications, features, and processes, which is a good way to start developing an extension:

- **TypeScript / Node.js**: located in the [`extensions/instances/example-typescript`](https://github.com/picteus/picteus/tree/main/extensions/instances/example-typescript) directory ;
- **Python**: located in the [`extensions/instances/example-python`](https://github.com/picteus/picteus/tree/main/extensions/instances/example-python) directory.

Once you have retrieved their source code, you may copy their directory and paste its content as a new directory: just modify the `id` property of the `manifest.json`, and give the folder the exact same value as the `id` — case matters —, so that it does not enter into conflict with the sample extension, if it has already been installed.

## From scratch

If you prefer to learn in depth and understand in details the composition of an extension, you may create all the necessary resources "manually".

If you decide to go this way, you should:
- take as reference the JSON Schema associated to the manifest, see [The extension manifest — `manifest.json`](./reference/overview.md#the-extension-manifest--manifestjson) for more information ;
- inspect the source code of the SDKs, located in the `extensions/sdk` of the hereby git repository, and have a look at the `PicteusExtension` class public methods, in order to have a grasp of the API (documentation to come).

### Via an AI coding agent

If you decide to resort to an AI coding agent, Picteus offers a `picteus-extension-builder` skills located in the `skills/picteus-extension-builder` directory, containing its [SKILL.md](https://github.com/picteus/picteus/blob/main/skills/picteus-extension-builder/SKILL.md) main file: configure your AI agent with those skills and start requesting features.

## Iterate

As long as you are developing your extension, it is advised to install it as an "unpacked" extension, see [Unpacked extensions](unpacked.md), because it will make the iteration much faster: as soon as you have changed the code, touch the `manifest.json` file and your changes should take effect in the UI in a couple of seconds.

## Debugging

You may start your unpacked extension — supposedly already installed — from your IDE in debug mode: to achieve, just run your extension class from the debugging options from the IDE. The extension should connect to the back-end application and receive any command triggered through the UI.

## Troubleshooting checklist

| Symptom | Cause & solution                                                                                                                                                                                                             |
|:---|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Extension does not start or load** | The `manifest.json` does not strictly validate against `manifest-v2.schema.json`. Check for missing required fields (`categories`, `runtimes`, `instructions`, `settings`), regex mismatches on IDs, or invalid JSON syntax. |
| **Command button does not appear in UI** | Ensure the command `id` is properly declared under `instructions[].commands` with a valid `on.entity` (`"Process"`, `"Images"`, or `"Image"`), and verify `events` contains `process.runCommand` or `image.runCommand`.      |
| **Event hook method is not triggered** | Verify that the corresponding event name (e.g. `image.created`, `image.computeTags`) is explicitly listed in `instructions[].events` in `manifest.json`.                                                                     |
