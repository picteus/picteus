# Uninstallation

Before uninstalling Picteus, decide whether you need to keep its data. The application stores its databases and some extension-managed files in its internal directory. Deleting that directory permanently deletes those files.

## Back up important files

Quit Picteus before copying its data. Open the application's internal directory from the application's **Picteus > Application Folder** menu, or locate it using the paths in the [Files](files.md#applications-folder) documentation.

Copy any files you want to keep to a location outside the Picteus internal directory. In particular, consider saving:

- `database.db` — the SQLite database containing application data;
- the `chroma` directory — the vector database;
- the `repositories` directory — files created or managed by extensions.

Some image repositories refer to image files in other locations on your computer. Those original files are not deleted when the Picteus internal directory is removed, but they will no longer be available to Picteus after uninstalling. See [Your images files](files.md#your-images-files) for how repositories work.

> [!WARNING]
> Deleting the Picteus internal directory permanently removes `database.db`, the Chroma database, and any repository image files stored under `repositories`. Back up anything you need before deleting the directory. Copying the database files while Picteus is running may produce an inconsistent backup.

## Remove Picteus

Uninstall or remove the application using the usual method for your operating system:

- **Windows**: open **Settings > Apps > Installed apps**, select Picteus, and choose **Uninstall**;
- **macOS**: quit Picteus, then move `Picteus.app` from the Applications folder to the Trash. This removes the application bundle, but does not delete the application's folder — Picteus's internal data directory. See [Application's folder](files.md#applications-folder) for details.

Removing the application does not delete its internal data directory. To remove that data as well, first make and verify any needed backups, then delete the Picteus directory:

- **Windows**: `%APPDATA%\Picteus` — usually `C:\Users\<user>\AppData\Roaming\Picteus`;
- **macOS**: `~/Library/Application Support/Picteus` — usually `/Users/<user>/Library/Application Support/Picteus`.

Deleting the internal directory is optional if you want to preserve the data for later use. The directory also contains installed extensions, runtimes, and downloaded model files; see [Files](files.md#applications-folder) for its contents.
