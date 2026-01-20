# Picteus

## Disclaimer

Please, have a look at the [Disclaimer](DISCLAIMER.md) if you want to better understand what this project is about.

## Architecture

The application is made of 6 components:
1. "shared": a Node.js module which is injected as a dependency to both the "server" and "electron" components ;
2. "server": the Node.js HTTP server back-end application ;
3. "extensions/sdk": the Python and TypeScript SDKs ;
4. "extensions/instances": the built-in extensions for the server ;
5. "web": the React.js web front-end application ;
6. "electron": the wrapping Electron application which embeds the "server" and "web" previous components.

## Prerequisites

- Node.js v22.7.1+ with npm (tested) or pnpm or yarn for building the application's components and the extensions.
- Python v3.11+ for building the Python extensions.
- The server module requires Java v17+, which should be accessible as a first Java runtime through the `PATH`, when generating the OpenAPI client code.
- When building the container image, a Docker-like application should be up and running.

## Compiling and building

The following command should be run from the root `package.json` file.

- Run the traditional `npm run install` script for resolving the hereby package dependencies.
- Run the `npm run prerequisites` script for resolving all submodules' dependencies: do not run individually the `npm install` script on every module, because it will not properly install the "server" and "electron" components since the  `prerequisites` npm script resorts to the `--install-link` option, which installed the "shared/back-end" module dependencies.
- Run the `npm run build` script for building all artifacts.
- Run the `npm run start` script for starting the Electron application.
- Run the `npm run package` script for building the Electron package application.
- Run the `npm run clean` script for cleaning all artifacts coming from compilation and previous builds.
- Run the `npm run reset` script for resetting the state of the project's files to their git initial state — in particular, this deletes the `node_modules` directories.

Most of the artifact files are located under the `build` directory, which is a symbolic link pointing to the `electron/build` directory.

## Versions

The versions of the various components are specified through the root `package.json` file via the `config.applicationVersion`, `config.apiVersion` and `config.sdkVersion` properties:
- `config.applicationVersion`: the version of the Electron application ;
- `config.apiVersion`: the version of the server API and its OpenAPI web services contract ;
- `config.sdkVersion`: the version of the SDK.

Whenever changing any of those versions, think of running the `npm run updateVersion` script from the root directory to propagate the version changes to the relevant submodules, which updates the `src/constants.ts` file accordingly and the SDK version and the extensions' dependency version accordingly.

### Server

Its source-code and scripts are located under the `server` directory.

All the commands specified in that section should be run from the `server` subdirectory and all resource locations are expressed from that directory, unless stated otherwise explicitly.

#### Build

To build the server from scratch, run the following command from the root folder: `npm run server:prerequisites && npm run server:build`.

#### Start

To start the server, run the `npm run start` script. The environment variables which have an impact over the execution are described by running the `npm run start:help` script.

#### Development

- When changing the database Prisma schema:
  - run the `npm run prisma:generate` script to regenerate the Prisma client code,
  - then run the `npm run prisma:update` script to update the schema of the startup database file `database.db` and to add the new SQL migration script in the `prisma/migrations` directory,
  - and then run the `npm run prisma:seed` script to update the `settings` table value startup database file `database.db` with its settings set to the latest version of the migration.

- When changing the OpenAPI contract, run the `openApi:generateOpenApi` script to regenerate the `openapi.json` file.
  - Think of updating the `config.apiVersion` property.
  - The `npm run openApi:typeScript:generateAndPackage` script generates the TypeScript OpenAPI client library into the directory `../tmp/openapi/typescript-fetch`.
  - The `npm run openApi:python:generateAndPackage` script generates the Python OpenAPI client library into the directory `../tmp/openapi/python`.
  - The `npm run openApi:generateAndPackage` script generates the 2 previous packages.

- Whenever the database schema changes, a file in the `secrets` or `assets` directory changes, run the `npm run build:copy` script to update the Electron application `dist` directory.

### Extensions

The SDKs and extensions and scripts are located in the `extensions` directory and the commands in the rest of this section should be run from that directory:
- the SDKs are in the `sdk` subdirectory ;
- the extensions are in the `instances` subdirectory.

For building the SDKs and extensions:
- run the `npm run sdk:build` script to build the SDKs ;
- run the `npm run instances:build` script to build the extensions ;
- run the `npm run build` script to build both.

To publish a new version of the SDKs or extensions, run the `npm run sdk:publish` script, after having built the SDKs via the `sdk:public:build` script:
- for publishing the Node.js SDK package on npm, use the `npm login --scope=@koppasoft` command to log in first ;
- for publishing the Python SDK package on PyPi, declare an API token at https://pypi.org/manage/account/token/ beforehand.

### Web

Its source-code and scripts are located under the `web` directory.

- Run the `npm run start` script to start it on the local machine.
- Run the `npm run build` script to build it.

### Shared

Its source-code and scripts are located under the `shared` directory. It only contains a `back-end` folder, which contains code common between the "server" and "electron" modules.

- Run the `npm run build` script to build it, which will compile the code.

### Electron

Its source-code and scripts are located under the `electron` directory.

- Run the `npm run start` script to start it on the local machine.
- Run the `npm run build` script to build it for the same target OS as the hosting machine, which outputs a runnable artifact inside the `dist` directory.
- Run the `npm run package` script to package it for the same target OS as the hosting machine.

## Packaging and distributing

The Electron application:
1. is packaged via the `npm run package` script: this invokes the previously mentioned Electron `package` npm script ;
2. is distributed via the `npm run distribute` script — which also invokes the previous one —, which signs, zips and notarize the application distribution package on macOS, which should be executed with the following environment variables set, when run on macOS:
  - `MACOS_APPLICATION_CERTIFICATE_BASE64_CONTENT`: the base64 encoded content of the application certificate. This content is obtained via the `base64 -i <certificate.p12>` command, where `<certificate.p12>` is the path of the "Developer ID Application" certificate file in P12 format ;
  - `MACOS_APPLICATION_CERTIFICATE_PASSWORD`: the password of the previous certificate ;
  - `MACOS_NOTARIZE_APPLICATION_PASSWORD`: the [Apple application-specific](https://discussions.apple.com/thread/254805086?sortBy=rank) password related to the `Picteus` entry, used to notarize the application package ;
3. is deployed via the `npm run deploy` script, which uploads the previously generated application distribution package: the `gcloud login` command should have been run beforehand, with GCP credentials having permissions over the destination GCS bucket.

### Docker image

The container image specifications are classically defined through the `Dockerfile` file and the ignored files through the `.dockerignore` file.

To build the container image of the server application via Docker, run the `npm run docker:build` script from the root directory, which creates an image with the `koppasoft/picteus:latest` tag.

## Continuous Integration (CI)

The project is configured with GitHub Actions for CI. For simulating locally what the CI does, you can install [act](https://github.com/nektos/act) and resort to the following command lines, on macOS:
- for the "Server CI" chain: `act --workflows .github/workflows/server.yml --container-architecture linux/amd64 -P macos-latest=catthehacker/ubuntu:act-latest` ;
- for the "Electron CI" chain: `act --workflows .github/workflows/electron.yml --container-architecture linux/amd64 -P macos-latest=catthehacker/ubuntu:act-latest`.

- Use the `--bind` option if you wish to prevent act from copying the files to the container, which takes time because of the large number of files.
- Only for the `.github/workflows/server.yml` workflow, use the `--env skip="true` to skip the installation steps.

## Running

### Container image

When running the container image through Docker, you should beforehand declare a volume so that the application data are persisted beyond the container execution, use the `docker volume create picteus` command to create a Docker volume named `picteus`.

Then use the following command to run the container:
```
docker run -p 3001:3001 -p 2999:2999 -p 3002:3002 -v picteus:/app/internal -v <externalPath>:/app/external -v <filesPath>:/app/files -e filesMountPath=<filesPath> --name picteus koppasoft/picteus:latest
```
where:
- `<filesPath>` is the host path to the directory where you want the application to scan files ;
- `<externalPath>` is the host path to the directory where you want the application to store database files.

This will create a container with the name `picteus`, using the previously created `picteus` volume.

You may fine-tune the container with the following additional environment variables:
- `apiServerPort`: the port number of the API server, which defaults to `3001` ; if you change it, think of changing the port mapping accordingly ;
- `webServerPort`: the port number of the web server exposing the UI, which defaults to `2999` ; if you change it, think of changing the port mapping accordingly ;
- `vectorDatabasePort`: the port number of the vector database server, which defaults to `3002` ; if you change it, think of changing the port mapping accordingly ;
- `useSsl`: a boolean indicating whether the API server should use SSL / TLS, which defaults to `true` ;
- `requiresApiKeys`: a boolean indicating whether the API server only works with API keys, which defaults to `false`.
