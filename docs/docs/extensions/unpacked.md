# Unpacked extensions

This document explains what an "unpacked" extension is and how to leverage unpacked directories during development.

---

## What is an unpacked extension?

An "unpacked" extension is functionally identical to a regular extension. The only difference resides in its shipping and installation mode: it does not require going through a packaging phase into an archive (`.zip` or `.tar.gz`). 

Instead, the raw file system directory containing the extension assets is provided directly to the back-end, which reads, installs, or updates the extension from the resources residing in that directory.

This workflow is designed for development and debugging, as it eliminates repetitive archiving steps.

## Unpacked extensions directory and CLI option

The Electron application (and the back-end application as well) exposes a command line (CLI) option `--unpackedExtensionsDirectoryPath <path>` to declare the directory holding unpacked extensions.

### Default location

When not explicitly specified on the command line, the default value of `<path>` is `<userHomeDirectory>/picteus`:
- **Windows**: `C:\Users\<username>\picteus` (where `<userHomeDirectory>` is `C:\Users\<username>`) ;
- **macOS**: `/Users/<username>/picteus` (where `<userHomeDirectory>` is `/Users/<username>`) ;
- **Linux**: `/home/<username>/picteus` (where `<userHomeDirectory>` is `/home/<username>`).

### Startup discovery and installation

At startup:
1. the back-end inspects all immediate subdirectory located at the root directory specified by the `--unpackedExtensionsDirectoryPath` CLI option ;
2. any directory containing a valid `manifest.json` file is considered an extension ;
3. the back-end automatically validates the manifest and installs or updates the corresponding extension.

### Customizing the directory via CLI

You can start Picteus from the terminal with a custom unpacked extensions directory using the `--unpackedExtensionsDirectoryPath` option:

````carousel
```bash title="macOS shell"
/Applications/Picteus.app/Contents/MacOS/Picteus run --unpackedExtensionsDirectoryPath /path/to/my/extensions
```
<!-- slide -->
```powershell title="Windows PowerShell"
Start-Process "C:\Program Files\Picteus\Picteus.exe" "run --unpackedExtensionsDirectoryPath C:\path\to\my\extensions" -Wait
```
<!-- slide -->
```batch title="Windows Command Prompt"
start /wait "" "C:\Program Files\Picteus\Picteus.exe" run --unpackedExtensionsDirectoryPath C:\path\to\my\extensions
```
````

## Directory naming constraint

An unpacked extension must reside in a file system directory whose name is **strictly identical** to the extension's identifier — specified through the `id` property in `manifest.json`.

Case sensitivity matters: if the directory name differs from the `id` property value — even by casing or character mismatch —, the back-end will reject the extension, and it will not install.

## Hot-Reloading Module (HMR) mechanism

When working with unpacked extensions, when the application is running, the back-end monitors the structure and content of the directory specified through the `unpackedExtensionsDirectoryPath` CLI option:
- whenever the `manifest.json` is modified and saved, the back-end automatically re-reads the configuration, in case of a TypeScript / Node.js extension, it compiles via its `build` script, and restarts the extension process, and the front-end application automatically takes into account the detected changes ;
- whenever a new directory lands as a direct child of the directory specified through the `unpackedExtensionsDirectoryPath` CLI option, the back-end inspects whether it has a manifest, that it is compliant, in which case it attempts to install the unpacked extension: this way, you may dynamically install an extension, without having to restart the application. If you delete that directory, the corresponding extension is uninstalled.

This way, the developer of the extension to iterate quickly and with efficiency while developing the extension. In particular, if any new command is declared in the manifest, or changed, those changes are immediately visible in the UI.

## Troubleshooting

When modifying an unpacked extension, you may break it for various reasons, including a malformed manifest JSON content, a manifest not observing its JSON Schema specifications, its code not to compile, its code raising unexpected errors / exception: in order to ease the root cause, it is advised to start the Picteus application from the command line (see [start.md](../setup/start.md#cli)) or to access its logs.
