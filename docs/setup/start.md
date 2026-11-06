# Start

> Once the application is installed, you can launch it:
> - Windows: from the "Start Menu" or from `C:\Program Files\Picteus\Picteus.exe` ;
> - macOS: from the "Applications" folder or from `/Applications/Picteus.app`.

Only one instance of the application is authorized to be running at the same time, and if you attempt to start another instance, you will get an error.

## First launch

During the first start-up of the application:
1. because the application relies on Python and Node.js runtimes, it will download those runtimes ;
2. because the application is extensible and ships built-in extensions, it will install them along with their dependencies ;
3. because some extensions rely on Machine Learning libraries, some large tensor files will be downloaded.

This is the reason why the first launch takes time, about 2 minutes, provided you have a descent Internet connection.

## CLI

You can start the application from the command line in your favorite terminal and fine-tune its configuration and behavior via options and commands. To discover what those options are, run the following command:
- Windows:
```batch title="Windows Command Prompt"
start /wait "" "C:\Program Files\Picteus\Picteus.exe" --help
```
```powershell title="Windows PowerShell"
Start-Process "C:\Program Files\Picteus\Picteus.exe" "--help" -Wait
```
- macOS:
```bash title="macOS shell"
/Applications/Picteus.app/Contents/MacOS/Picteus --help
```

For now, there is only one `run` command, which starts the application and to get the documentation of its options, run the following command:
- Windows:
```batch title="Windows Command Prompt"
start /wait "" "C:\Program Files\Picteus\Picteus.exe" run --help
```
```powershell title="Windows PowerShell"
Start-Process "C:\Program Files\Picteus\Picteus.exe" "run --help" -Wait
```
- macOS:
```bash title="macOS shell"
/Applications/Picteus.app/Contents/MacOS/Picteus run --help
```

Simply use the following command if you do not need to set options:
- Windows:
```batch title="Windows Command Prompt"
start /wait "" "C:\Program Files\Picteus\Picteus.exe"
```
```powershell title="Windows PowerShell"
Start-Process "C:\Program Files\Picteus\Picteus.exe" -Wait
```
- macOS:
```bash title="macOS shell"
/Applications/Picteus.app/Contents/MacOS/Picteus
```

Starting the application from the command line enables you to access its log output directly in the terminal. For a full description of the traces available in Picteus — including the front-end activities feed, the log stream configuration, and log file locations — refer to the [Traces](traces.md) documentation.

### Network access

By default, the application servers bind to `127.0.0.1` and are available only from the same machine. The `--host`
option changes the network interface address used by the internal servers. For example, `--host 0.0.0.0` binds to
all network interfaces, allowing other devices that can reach the machine to connect.

When the web interface is accessed from an additional origin, use `--allowedOrigins` to add its full origin to the
CORS and WebSocket allowlist. Specify the scheme, host, and port, with no path; separate multiple origins with commas:

```bash
Picteus run --host 0.0.0.0 --allowedOrigins http://192.168.1.20:2999
```

Replace the example address with the origin from which the web interface is served. Add only origins you trust.
Binding to a non-loopback interface can expose the application to other devices on the network; use it only on a
trusted network and configure appropriate transport security and API access controls for your deployment.
