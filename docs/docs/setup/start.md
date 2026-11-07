# Start

Once installed, launch Picteus from the Windows Start menu or the macOS Applications folder. To start it from a terminal, see the CLI instructions below.

Only one instance can run at a time. Starting another instance while Picteus is running returns an error.

## First launch

During its first launch, Picteus downloads the Python and Node.js runtimes and installs only the core extensions shipped with the application, along with their dependencies. It also downloads large tensor files required by some extensions. An internet connection is required for these downloads.

The first launch usually takes about 3 minutes with a decent internet connection. The actual time depends on the connection and the downloads required.

## Installing extensions

Only the core extensions shipped with Picteus are installed automatically. Install other extensions to add capabilities and integrations that expand the application's functional scope; deferring these installs keeps the initial setup shorter. Some tasks and workflows require a specific extension.

To add extensions, open **Extensions** from the application's main navigation. Install an available marketplace extension from the list, or use **Install** to add an extension package. Review an extension's description and requirements before installing it; some extensions may need additional downloads, credentials, or external services. For extension development and unpacked extensions, see the [Extensions documentation](../extensions.md).

## CLI

The CLI starts Picteus and lets you set options. The `run` command is the default, so it can be omitted when starting the application without options.

### Help

Use `--help` to display the available commands and general usage. Use `run --help` to display the options for the `run` command.

**General help — Windows**:
```powershell title="Windows PowerShell"
& "C:\Program Files\Picteus\Picteus.exe" --help
```

**General help — macOS**:
```bash title="macOS shell"
/Applications/Picteus.app/Contents/MacOS/Picteus --help
```

**`run` command help — Windows**:
```powershell title="Windows PowerShell"
& "C:\Program Files\Picteus\Picteus.exe" run --help
```

**`run` command help — macOS**:
```bash title="macOS shell"
/Applications/Picteus.app/Contents/MacOS/Picteus run --help
```

To start Picteus without setting options:

**Windows**:
```powershell title="Windows PowerShell"
& "C:\Program Files\Picteus\Picteus.exe"
```

**macOS**:
```bash title="macOS shell"
/Applications/Picteus.app/Contents/MacOS/Picteus
```

Starting the application from the command line enables you to access its log output directly in the terminal. For a full description of the traces available in Picteus — including the front-end activities feed, the log stream configuration, and log file locations — refer to the [Traces](traces.md) documentation.

### Network access

By default, the application servers bind to `127.0.0.1` and are available only from the same machine. The web interface is served at `http://127.0.0.1:2999`, and the API server uses port `3001`. The `--host` option changes the network interface address used by the internal servers. For example, `--host 0.0.0.0` binds to all network interfaces. Other devices can then access the application using the host machine's network address, provided the required ports are allowed by its firewall. The address `0.0.0.0` is a bind address, not an address to enter in a browser.

When accessing the web interface from an additional origin, use `--allowedOrigins` to add its full origin to the CORS and WebSocket allowlist. Specify the scheme, host, and port, with no path. Separate multiple origins with commas. Replace the example address with the origin from which the web interface is served:

**Windows**:
```powershell title="Windows PowerShell"
& "C:\Program Files\Picteus\Picteus.exe" run --host 0.0.0.0 --allowedOrigins http://192.168.1.20:2999
```

**macOS**:
```bash title="macOS shell"
/Applications/Picteus.app/Contents/MacOS/Picteus run --host 0.0.0.0 --allowedOrigins http://192.168.1.20:2999
```

Add only origins you trust. The allowlist does not authenticate users or prevent non-browser clients from connecting. Binding to a non-loopback interface can expose the application to other devices on the network; use it only on a trusted network and configure appropriate transport security and API access controls for your deployment.
