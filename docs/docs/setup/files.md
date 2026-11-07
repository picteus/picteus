# Files

Picteus uses a per-user application folder for its databases and other application-managed data. Your image files can remain in their existing locations; Picteus records the paths of image repositories that you add to the application. These locations serve different purposes and should be considered separately when backing up or removing data.

## Application's folder

The desktop application stores its internal data in the following per-user folder:

- **Windows**: `C:\Users\<user>\AppData\Roaming\Picteus`;
- **macOS**: `/Users/<user>/Library/Application Support/Picteus`.

Here, `<user>` is the name of the user's account. In the desktop application, choose **Picteus > Application Folder** to open this folder.

The folder contains application-managed files, including:

- `database.db` — the SQLite database, which stores application data such as settings, repository definitions, image records, and extension data;
- `chroma` — the Chroma vector database, which stores embeddings used for similarity search;
- `repositories` — files in repositories created or managed by extensions. This is not the location of every image repository added to Picteus;
- `extensions` — installed extensions;
- `models` — downloaded model files used by some extensions;
- `runtimes` — the Python and Node.js runtimes used by extensions.

The database and Chroma directory work together with the application. Avoid editing their contents directly; for database details and safe direct access, see [Databases](../manual/databases.md).

Application logs are stored separately from this folder. See [Traces](traces.md#accessing-logs-via-the-electron-menu) for their locations.

## Your images files

Image repositories are folders on your computer that you add to Picteus. Picteus indexes files in those folders and stores repository paths and image records in its database; it does not generally copy the original images into the application's folder. Keep the original image folders if you want to retain access to those images, and back them up separately.

Some extensions create or manage files in the internal `repositories` folder. Those files are distinct from the original images in repositories that you added from elsewhere on your computer.

## Backing up and restoring

To preserve Picteus's internal data, back up the application folder. This includes the database, vector index, extension-managed repository content, installed extensions, runtimes, and downloaded models. Back up any original image folders you need separately.

### Creating a backup

1. Quit Picteus completely before copying its files.
2. Copy the entire application folder to a separate backup location, keeping its directory structure intact.
3. If you also need the original images, back up their repository folders separately.

Copying the full application folder captures the SQLite database and Chroma data together. For SQLite-specific considerations, including write-ahead log files, see [Database backups](../manual/databases.md#performing-backups).

### Restoring a backup

1. Install Picteus, if it is not already installed, and make sure it is not running.
2. Locate the application folder using the path for your operating system above.
3. If an application folder already exists, move it aside as a temporary backup. Restore the backed-up `Picteus` folder to its expected location rather than merging its contents with another copy.
4. Restore any separately backed-up original image folders to their expected locations, then start Picteus.

Restoring only the database without its corresponding Chroma directory can leave vector search data out of sync. For database-only backup and restore details, see [Database backups](../manual/databases.md#performing-backups).

> [!NOTE]
> Container deployments use configured volume mounts rather than the desktop application's per-user paths. See the [container documentation](../manual/container.md#volume-mounts) for those locations.
