# Continuous Integration (CI)

This document provides information about the CI platform used for managing the application.

## GitHub Actions

The project is configured with GitHub Actions for CI. For simulating locally what the CI does, you can install [act](https://github.com/nektos/act) and resort to the following command lines, on macOS:
- for the "Back-end CI" chain: `act --workflows .github/workflows/back-end.yml --container-architecture linux/amd64 -P macos-26=catthehacker/ubuntu:act-latest` ;
- for the "Electron CI" chain: `act --workflows .github/workflows/electron.yml --container-architecture linux/amd64 -P macos-26=catthehacker/ubuntu:act-latest`.

- Use the `--bind` option if you wish to prevent "act" from copying the files to the container, which takes time because of the large number of files.
- Only for the `.github/workflows/back-end.yml` workflow, use the `--env skip="true"` to skip the installation steps.
