# Installation

This page covers the supported platforms, installation prerequisites, and installer steps.

## Supported machines

Picteus currently supports Windows x64 and macOS ARM64 (Apple Silicon). Windows ARM64 and Linux are not currently supported.

### Unsupported platforms

There are no prebuilt releases for Windows ARM64 or Linux. Intel-based Macs are also unsupported because the machine-learning runtimes used by Picteus extensions are not available for this architecture. You can build Picteus from its source code; this is a developer workflow and does not imply that unsupported platforms are officially supported. See the [build guide](../developer/build.md) and the [Picteus GitHub project](https://github.com/picteus/picteus).

## Prerequisites

Before installing, make sure the computer has:

- an internet connection to download the installer and complete the initial setup. On first launch Picteus downloads its Python and Node.js runtimes, installs the shipped core extensions and their dependencies, and downloads model files required by some extensions. Installing or using additional extensions may require further downloads; see [Starting Picteus](start.md) for details;
- a 4-core CPU or better;
- at least 3 GB of free disk space for the application and shipped components. Additional extensions and model files require more space;
- at least 2 GB of available RAM. Some extensions may require more while processing;
- a dedicated GPU for extensions that run local inference models. Hardware requirements vary by extension.

## Download

Download the installer for your operating system from the "Assets" section of the [latest release](https://github.com/picteus/picteus/releases).

## Install

After downloading:

- **Windows**: run the `.exe` installer and follow its instructions;
- **macOS**: open the `.zip` archive and drag the included `.app` into the Applications folder.

Launch Picteus from the Start menu on Windows or the Applications folder on macOS.
