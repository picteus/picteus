---
sidebar_position: 2
---

# Start

Once the application is installed, you can launch it:
- Windows: from the "Start Menu" or from `C:\Program Files\Picteus\Picteus.exe` ;
- macOS: from the "Applications" folder or from `/Applications/Picteus.app`.

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

Starting the application from the command line enables you to access to its execution logs, which enable to understand what it is doing. The application is verbose and provides a wealth of details about its internal state, which allows following its execution steps.

## Logs

The application yields logs: when starting it from its desktop icon, logs are not visible in a terminal, but when starting from the CLI, they are output directly to the terminal standard output.

- Log messages are color-coded depending on verbosity: DEBUG — blue —, INFO — green —, WARN — orange —, or ERROR — red ;
- The logs from the Electron wrapper application, the back-end server, and the front-end React.js application are all output in the standard process output.

### Log files location

Log messages are also persisted into log files on the local filesystem, namly in the following directory path:
- **Windows**: `C:\Users\<user>\AppData\Roaming\Picteus\logs`,
- **macOS**: `/Users/<user>/Library/Logs/Picteus`,
- **Linux**: `/home/<user>/.config/Picteus/logs`.

where `<user>` is the user's login.

The log files are split by component:
- the Electron application logs are written to the `picteus-electron.log` file ;
- the back-end server and front-end application logs are written together to the `picteus-back-end.log` file.

When a log file exceeds 1 MB., it is archived as new file with a `N.log` suffix instead, so that log files are rolled.

When troubleshooting the application or reporting issues, these log files provide a wealth of information.
