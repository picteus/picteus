---
sidebar_position: 2
---

# Start

Once the application is installed, you can launch it:
- Windows: from the "Start Menu" or from `C:\Program Files\Picteus\Picteus.exe` ;
- macOS: from the "Applications" folder or from `/Applications/Picteus.app`.

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
/Applications/Picteus.app/Contents/MacOS/Picteus/Contents/MacOS/Picteus --help
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
/Applications/Picteus.app/Contents/MacOS/Picteus/Contents/MacOS/Picteus run --help
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
/Applications/Picteus.app/Contents/MacOS/Picteus/Contents/MacOS/Picteus
```

Starting the application from the command line enables you to access to its execution logs, which enable to understand what it is doing. The application is verbose and provides a wealth of details about its internal state, which allows following its execution steps.
