---
sidebar_position: 3
---

# Files

The application takes great care not to pollute the computer it is installed. To that extent, it isolates and places all the files it downloads, installs and handles within a single folder.

## Application's folder

It installs the Python and Node.js runtimes, the extensions, their dependencies, the tensor files within a dedicated folder, the "Application's folder", which is located in the Operating System traditional directory, namely:
- Windows: `C:\Users\<user>\AppData\Roaming\Picteus`,
- macOS: `/Users/<user>/Library/Application Support/Picteus`,

where `<user>` is the user's login.

The application offers the "Picteus > Application Folder" menu entry which opens that opens the files' explorer to that location.

This folder holds the following resources:
- the SQLite regular SQL database `database.db` ;
- the Chroma vectorial database in folder `chroma` ;
- the `runtimes` folder, which contains a `node` and a `python` folder, which are additional runtimes for the extensions ;
- the `models` folder, which will contain the downloaded tensor files required by some extension resorting to AI models ;
- the `repositories` folder, which is an internal folder that will contain repositories dedicated to some extensions.

## Your images files

Picteus will access to the image files that are stored on the computer, hence you do not need to change their location or copy them elsewhere. You will need to declare image repositories within the application.
