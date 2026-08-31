# Continuous integration (CI) & deployment (CD)

This document provides information about the automated CI / CD pipelines and scripts used for managing, building, testing, packaging, and releasing the application components.

---

## CI / CD npm scripts

The root [`package.json`](file:///Users/edouardmercier/wok/KoppaSoft-workspace/picteus/package.json) file defines dedicated npm scripts for automating the build, validation, packaging, and deployment pipelines across all application components.

All CI/CD automation scripts adhere to a unified naming convention using the `:ci` suffix (formatted as `<action>:<component>:ci`). These scripts should be used to automate pipeline workflows in continuous integration environments and avoid reliance on interactive or platform-specific local developer configurations:

### 1. Back-end pipeline

- **`npm run prerequisites:back-end:ci`**: prepares the build workspace, compiles shared core and back-end libraries, builds extension SDKs, and resolves back-end dependencies with link bindings ;
- **`npm run build:back-end:ci`**: generates the Prisma ORM client artifacts and compiles the back-end TypeScript source code ;
- **`npm run test:back-end:ci`**: runs the back-end automated test suite in non-interactive CI mode.

### 2. Electron desktop pipeline

- **`npm run prerequisites:electron:ci`**: installs and links all subproject dependencies across the repository ;
- **`npm run build:electron:ci`**: builds all submodules and compiles the Electron desktop application ;
- **`npm run distribute:electron:ci`**: packages, signs, and notarizes the desktop distribution bundle for the target operating system ;
- **`npm run deploy:electron:ci`**: uploads and releases the signed distribution package to cloud storage.

### 3. Docker container pipeline

- **`npm run prerequisites:docker:ci`**: builds shared libraries, extension runtimes, and the front-end web distribution required for embedding inside the container ;
- **`npm run build:docker:ci`**: executes the container image build via Docker ;
- **`npm run deploy:docker:ci`**: pushes the tagged container image to Docker Hub.

---

## GitHub Actions

The repository defines automated CI workflows using GitHub Actions:
- **Back-end CI** ([`.github/workflows/back-end.yml`](file:///Users/edouardmercier/wok/KoppaSoft-workspace/picteus/.github/workflows/back-end.yml)): validates dependencies, builds, and executes unit tests on pull requests and commits to the `master` branch ;
- **Electron CI** ([`.github/workflows/electron.yml`](file:///Users/edouardmercier/wok/KoppaSoft-workspace/picteus/.github/workflows/electron.yml)): builds, codesigns, notarizes, and deploys multi-platform desktop releases.

### Simulating workflows locally with `act`

You can simulate the GitHub Actions execution locally using [act](https://github.com/nektos/act):

- **Back-end CI workflow**:
  ```bash
  act --workflows .github/workflows/back-end.yml --container-architecture linux/amd64 -P macos-26=catthehacker/ubuntu:act-latest
  ```
- **Electron CI workflow**:
  ```bash
  act --workflows .github/workflows/electron.yml --container-architecture linux/amd64 -P macos-26=catthehacker/ubuntu:act-latest
  ```

#### Useful `act` execution flags:
- Use `--bind` to avoid copying the workspace to the container on every run, which saves time when handling many dependencies ;
- For the back-end workflow, pass `--env skip="true"` to bypass dependency reinstallation steps when already cached.
