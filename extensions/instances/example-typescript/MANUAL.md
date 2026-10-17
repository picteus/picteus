# Summary
This is an example Picteus extension built with the TypeScript / Node.js SDK.

It exposes some commands which are there to showcase how the Picteus application may be extended, both graphically and through automated processing.

# Prerequisites
There is no prerequisite for that extension.

# Settings
This is placeholder which is displayed in the extension detail page and in the extension settings dialog box.

# Commands

## logDimensions

Logs the pixel dimensions of each selected image.

### Details

Each log entry identifies its image and reports its width and height. The command only reads image data; it does not
modify the images.

## convert

Converts selected images to a supported format and stores the converted copies in their original repository.

### Details

Choose `jpeg`, `png`, or `webp`. Width and height are optional positive pixel dimensions; if either is omitted, that
dimension is based on the original image. When resizing, `inbox` fits the result within the specified bounds, while
`outbox` scales it to cover them. The conversion can strip metadata; resizing is rejected if metadata stripping is
disabled.

Each result is stored as a new image with the original as its parent. The command returns the converted images.

## askForSomething

Collects an age and follow-up answers, then logs the answers.

### Details

The command first receives an age from 1 to 128. It then asks for a favorite color and whether chocolate is liked. The
favorite color can be pink, blue, yellow, or green; the chocolate answer is optional. The age is included in the
follow-up prompt's explanatory text and does not affect the available choices. The follow-up prompt receives up to three
image IDs returned by an image search as context, but does not modify those images. On completion, the chosen color and
chocolate answer are written to the application log.

## dialog

Asks a yes-or-no question and logs the answer.

### Details

The command supplies the three most recently imported image IDs as context to the question. Set `type` to `With HTML` to
include the HTML example in the dialog content; `Simple` omits it. The response is logged as either yes or no; images
are not changed.

## ui

Opens a dedicated UI using HTML content or the back-end Swagger UI page.

### Details

Choose a modal, sidebar, external sidebar, or separate window as the integration point. The content can be generated
HTML or the Swagger UI page at the extension's configured web services base URL. This command only opens the selected
UI.

## show

Opens an extension or Picteus resource.

### Details

The supported targets are this extension's sidebar, its settings, the most recently imported image, or the first
repository returned by the repository API. The image and repository options depend on those resources being available.
The command navigates to the selected target and does not update it.

## readFile

Reads a selected `.txt` or `.json` file and displays its contents.

### Details

The selected file is read as UTF-8 text. Its contents are shown in an informational dialog and are not saved or
otherwise modified by the command.

## writeFile

Writes the example text `Hello World!` to a selected `.txt` file.

### Details

The command proposes the filename `file.txt`; the destination is chosen when the command runs. It writes the fixed
example content rather than accepting content as a parameter.

## openBrowser

Opens a URL in the system browser.

### Details

The required `url` parameter must be a URI. The command passes that URL to the browser without changing Picteus data.

## toast

Displays an informational, cancellation, or error toast.

### Details

The command uses the supplied `type`, `title`, and `subtitle` to create the toast. It only displays a message and does
not modify application data.

## notification

Creates a notification with a title, subtitle, and body.

### Details

The notification includes the extension icon and is not silent. The `isNative` parameter determines whether it is shown
through the operating system's notification system or within Picteus. Unlike the `action` command, this notification has
no command-defined action.

## action

Creates an actionable notification in Picteus that runs the selected intent when the user chooses "Run".

### Details

The required `intent` parameter determines the action:

- `show` opens this extension's settings;
- `ui` opens a modal containing the example HTML content;
- `openBrowser` opens `https://www.picteus.com` in the browser;
- `command` runs this extension's `askForSomething` command.

The notification uses the extension icon. Selecting an intent may open a Picteus view, open the browser, or run the
command; creating the notification alone does not perform the selected action.

## application

Serves the bundled example web application and opens it within Picteus.

### Details

The extension serves `application.zip` and passes the IDs of up to 20 most recently imported images as application
settings. It then opens the bundle's `index.html` in an embedded frame. The example application can use the Picteus web
services; this command itself does not change image data.
