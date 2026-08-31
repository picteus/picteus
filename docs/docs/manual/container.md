# Container image

Picteus can run inside containerized environments — such as Docker, Podman, or LXC / LXD. The container image bundles the back-end REST server, the embedded front-end web application UI, the Chroma vector database, the extension runtimes, and the SDKs in a single self-contained package.

---

## Fetching the image

The official Picteus container image is hosted on Docker Hub:

- **Repository**: [`koppasoft/picteus`](https://hub.docker.com/r/koppasoft/picteus) ;
- **Latest release tag**: `koppasoft/picteus:latest` ;
- **Versioned tags**: e.g. `koppasoft/picteus:0.11.0`.

To pull the latest image to your local machine or server:

```bash
docker pull koppasoft/picteus:latest
```

---

## Running the container

In this documentation, we focus on Docker as far as the commands are concerned, but it should be easy to translate them for other container technologies.

### Volume mounts

The container requires three distinct directory mappings:

1. **Internal data volume (`/app/internal`)**: stores internal runtime assets, installed extensions, AI models cache (`models`), and extension runtimes (`runtimes`). A named volume (e.g. `picteus`) or host directory should be mounted here ;
2. **External data directory (`/app/external`)**: stores the persistent SQLite database (`database.db`), Chroma vector database files (`chroma`), and internal extension repositories (`repositories`) ;
3. **Files directory (`/app/files`)**: the directory tree containing image files on the host that you want Picteus to index.

### Starting a container

Before starting the container, create a persistent Docker volume for internal runtime data:

```bash
docker volume create picteus
```

Run the container using the `docker run` command:

````carousel
```bash title="Standard Docker command (HTTP)"
docker run -d \
  --name picteus \
  -p 3001:3001 \
  -p 2999:2999 \
  -p 3002:3002 \
  -v picteus:/app/internal \
  -v /path/to/host/data:/app/external \
  -v /path/to/host/images:/app/files \
  -e filesMountPath=/path/to/host/images \
  -e useSsl=false \
  koppasoft/picteus:latest
```
<!-- slide -->
```yaml title="Docker Compose (docker-compose.yml)"
version: "3.8"

services:
  picteus:
    image: koppasoft/picteus:latest
    container_name: picteus
    restart: unless-stopped
    ports:
      - "3001:3001"
      - "2999:2999"
      - "3002:3002"
    volumes:
      - picteus_internal:/app/internal
      - /path/to/host/data:/app/external
      - /path/to/host/images:/app/files
    environment:
      - filesMountPath=/path/to/host/images
      - useSsl=false
      - requiresApiKeys=false

volumes:
  picteus_internal:
```
````

> [!IMPORTANT]
> **The `filesMountPath` environment variable is mandatory**
> : when Picteus stores repository paths in the database, it uses `filesMountPath` to map container paths (`/app/files/...`) back to host directory paths. If this variable is omitted, the container will refuse to start.

---

## Configuration & environment variables

The container behavior can be tuned at startup via environment variables transmitted to the container running the image:

| Environment variable | Default value | Description |
|:---|:---|:---|
| `filesMountPath` | *(none, required)* | Absolute host path mapped to `/app/files`. Used to resolve host filesystem paths in image repositories. |
| `apiServerPort` | `3001` | TCP port number for the back-end REST API HTTP server. |
| `webServerPort` | `2999` | TCP port number for the web server serving the front-end user interface. |
| `vectorDatabasePort` | `3002` | TCP port number for the embedded Chroma vector database HTTP server. |
| `useSsl` | `true` | Enables or disables SSL / TLS on the back-end server (`true` or `false`). |
| `requiresApiKeys` | `false` | When set to `true`, forces callers to authenticate with a valid API key. |

If you customize port numbers via environment variables, update the corresponding container port publishing arguments (`-p <host_port>:<container_port>`) accordingly.

---

## Accessing the application

Once the container is running, the application services are accessible over the network:

### 1. Front-end web application UI

Open your browser to:

```
http://localhost:2999/?webServicesBaseUrl=http://localhost:3001#/
```

The `webServicesBaseUrl` query parameter informs the front-end where to direct its REST API and WebSocket requests. If accessing Picteus from a remote client over the local network, replace `localhost` with the server host IP or domain name:

```
http://192.168.1.100:2999/?webServicesBaseUrl=http://192.168.1.100:3001#/
```

### 2. Swagger UI interactive API explorer

The back-end OpenAPI documentation and interactive endpoint explorer is available at:

```
http://localhost:3001/swaggerui
```

### 3. Chroma vector database REST endpoint

The Chroma vector database exposes its REST API directly at:

```
http://localhost:3002/api/v1/collections
```

---

## Limitations compared to the native Electron application

While the containerized deployment offers flexible server-side and headless hosting, it has specific functional differences compared to the native Electron desktop application:

- **No native desktop shell & system tray**: the container runs without a graphical desktop environment — there is no system tray menu, no dock badging, no native application menu bar, and no OS window minimize/restore state persistence ;
- **Filesystem boundaries & volume constraints**: the native desktop app can scan and open image files anywhere across local drives. In a container, only host directories explicitly mounted into `/app/files` can be scanned and indexed ;
- **Native OS dialogs & file explorers**: desktop features relying on native operating system prompts — such as "reveal in Finder / File Explorer" (`shell.showItemInFolder`) or native directory picker dialogs — are unavailable and fallback to standard browser-based file downloads or manual path inputs ;
- **No Chrome extension host runtime**: the native Electron application includes a dedicated runtime for loading and intercepting network traffic via packaged Chromium extensions. This capability is not embedded in the containerized web UI ;
- **Desktop auto-updates**: the container does not use the Electron background auto-updater. Upgrades are performed by stopping the container, pulling a newer Docker image tag, and recreating the container ;
- **SSL certificate validation in browser**: when `useSsl=true` is enabled with default self-signed certificates, accessing the front-end in a standard web browser may require manually accepting the self-signed certificate for the back-end API origin (`https://<host>:3001`) before the UI can establish WebSocket and REST connections. Setting `useSsl=false` avoids certificate prompts in trusted local networks.
