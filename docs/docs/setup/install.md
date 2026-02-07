---
sidebar_position: 1
---

# Installation

Let's see how to download and install the application.

## Supported machines

Currently, only the **Windows x64** and **macOS ARM 64** (Apple Silicon) Operating Systems are supported:
- Windows ARM 64 is on the roadmap ;
- Linux as well ;
- unfortunately, Intel-based macOS will probably not be supported because most of the latest versions of the Machine Learning execution runtimes like PyTorch are not available for this architecture.

## Prerequisites

The application requires the minimal footprint:
- at least a 4-core CPU ;
- a "descent" GPU, because some extensions will perform some noticeable computations via AI models.

It will consume the following minimal resources:
- about 3 GB. of disk space (once all the built-in extensions are installed) ;
- about 2 GB. of memory (RAM): the application itself consumes about 0.5 GB, some extensions require picks of memory during their computation.

## Download

Download the installer of the latest version of the application from the ["Releases"](https://github.com/picteus/picteus/releases) page of the GitHub repository project, in the "Assets" section.

## Install

Once downloaded:
- Windows: double-click on the ".exe" file, which will open an installer ;
- macOS: open the ".zip" file, which contains the ".app" file, and drop it into the usual "Applications" folder.
