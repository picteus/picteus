<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/static/img/logo-white.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/static/img/logo-black.svg">
    <img src="docs/static/img/logo-black.svg" alt="Picteus logo" width="80" height="80">
  </picture>

  <p>LOCAL-FIRST IMAGE INTELLIGENCE</p>
</div>

# Picteus

**Extensible local-first framework for indexing and orchestrating AI image assets.**

[![Documentation](https://img.shields.io/badge/docs-online-2ea44f?style=flat-square)](https://picteus.github.io/picteus/)
[![GitHub Release](https://img.shields.io/github/v/release/picteus/picteus?style=flat-square&label=release)](https://github.com/picteus/picteus/releases)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-informational?style=flat-square)](LICENSE)
[![Docker Image](https://img.shields.io/badge/docker-koppasoft%2Fpicteus-2496ed?style=flat-square&logo=docker&logoColor=white)](https://hub.docker.com/r/koppasoft/picteus)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.17.1-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/python-%3E%3D3.11-3776ab?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)

[Documentation](https://picteus.github.io/picteus/) • [Releases](https://github.com/picteus/picteus/releases) • [Installation](https://picteus.github.io/picteus/docs/setup/install) • [Container](https://picteus.github.io/picteus/docs/manual/container) • [Architecture](https://picteus.github.io/picteus/docs/developer/architecture) • [Build](https://picteus.github.io/picteus/docs/developer/build)

---

Picteus is a local-first desktop and server platform designed to catalog, inspect, annotate, and orchestrate AI-generated image assets. It provides an extensible backbone that bridges creative workflows with local and remote machine learning runtimes, backed by structured and vector persistence layers.

## Documentation entry points

Full documentation, manuals, and technical specifications are available at [picteus.github.io/picteus](https://picteus.github.io/picteus/):

- **[Installation and setup](https://picteus.github.io/picteus/docs/setup/install)**: hardware requirements, OS packages, initial startup sequences, and troubleshooting ;
- **[User manual](https://picteus.github.io/picteus/docs/manual/features)**: image indexing, faceted search, tag management, vector similarity search, and container deployment ;
- **[Extensions guide](https://picteus.github.io/picteus/docs/extensions/guide)**: authoring extensions using Python and TypeScript SDKs, manifest schema specifications, and Model Context Protocol (MCP) integrations ;
- **[Developer documentation](https://picteus.github.io/picteus/docs/developer/architecture)**: multi-component architecture, build processes, and continuous integration workflows.

## Download and desktop installation

Pre-packaged desktop binaries are distributed via the [GitHub Releases](https://github.com/picteus/picteus/releases) page under the "Assets" section:

- **Supported operating systems**: Windows x64 and macOS ARM 64 — Apple Silicon — with Linux and Windows ARM 64 on the roadmap ;
- **Hardware baseline**: at least a 4-core CPU, a dedicated GPU for local inference models, 3 GB of free disk space, and 2 GB of available RAM ;
- **Installation steps**: double-click the `.exe` installer on Windows, or unpack the `.app` bundle into `/Applications` on macOS.

For complete installation details and configuration flags, consult the [installation guide](https://picteus.github.io/picteus/docs/setup/install).

## Running with Docker

Picteus is also distributed as a container image for server deployments and headless evaluation:

```bash
# Create a persistent volume for internal runtime data
docker volume create picteus

# Start the Picteus container
docker run -d \
  --name picteus \
  -p 3001:3001 \
  -v picteus:/app/internal \
  -v /path/to/host/data:/app/external \
  -v /path/to/host/images:/app/files \
  -e filesMountPath=/path/to/host/images \
  koppasoft/picteus:latest
```

Once running, access the web interface and REST API at `http://localhost:3001`.

For complete volume mount details, Docker Compose definitions, and SSL configuration, read the [container documentation](https://picteus.github.io/picteus/docs/manual/container).

## Built-in integrations

Picteus connects to local engines and remote services through isolated extension runtimes:

- **Local generation and inference**: [ComfyUI](https://github.com/Comfy-Org/ComfyUI), [Automatic1111](https://github.com/AUTOMATIC1111/stable-diffusion-webui), [Ollama](https://ollama.com/), and local Stable Diffusion upscalers ;
- **Cloud providers and models**: Anthropic Claude, Google Gemini, Midjourney, and Replicate ;
- **Provenance and transformations**: C2PA content credentials, Bria background removal, and color embeddings ;
- **Agentic interoperability**: Model Context Protocol (MCP) server integration, exposing Picteus tools and image search to AI agents.

For developer guides on authoring custom integrations, consult the [extensions guide](https://picteus.github.io/picteus/docs/extensions/guide).

## Architecture overview

Picteus is structured across six primary components:

1. **`shared`**: compound libraries providing shared TypeScript models, back-end foundations, front-end helpers, and the `specification-factory` code emitters ;
2. **`back-end`**: NestJS and Node.js server exposing an OpenAPI v3.1 REST API, orchestrating extension runtimes and managing local persistence ;
3. **`extensions/sdk`**: official Python and TypeScript SDKs for developing decoupled plugins ;
4. **`extensions/instances`**: built-in extensions providing local machine learning model execution, third-party integrations, and MCP endpoints ;
5. **`front-end`**: React single-page interface leveraging Mantine UI for interactive exploration and asset management ;
6. **`electron`**: host shell embedding the front-end and back-end into a native desktop application.

Persistence relies locally on SQLite for relational metadata and generation parameters, and Chroma DB for high-dimensional vector embeddings.

For detailed component interaction diagrams and specifications, refer to the [architecture documentation](https://picteus.github.io/picteus/docs/developer/architecture).

## Building from source

### Prerequisites

- **Node.js**: v22.7.1+ with `npm` ;
- **Python**: v3.11+ for building Python extension modules ;
- **Java**: v17+ required in `PATH` for generating OpenAPI client contracts ;
- **Docker**: Required when assembling the server container image.

### Build sequence

Install root dependencies, link internal workspaces, and compile all artifacts:

```bash
# Install root package dependencies
npm install

# Resolve internal submodule dependencies across shared and back-end components
npm run prerequisites

# Build all components and extension bundles
npm run build
```

Compiled output is assembled under the `build/` directory — symlinked to `electron/build/`. To clean build artifacts or reset working directories:

```bash
# Deletes compiled binaries and bundles
npm run clean
# Restores the repository to a clean git checkout
npm run reset
```

For sub-package workflows, environment variables, and Docker container packaging, read the [build guide](https://picteus.github.io/picteus/docs/developer/build).

## Project vision and disclaimer

Picteus is maintained by engineers passionate about generative workflows and asset organization. To understand the design rationale, target audiences, and project philosophy, read the [disclaimer](DISCLAIMER.md).

## License

This project is licensed under the terms of the GNU Affero General Public License v3.0. Refer to [LICENSE](LICENSE) for details.
