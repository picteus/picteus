# Summary
This is an example Picteus extension built with the Python SDK.

It exposes some commands which are there to showcase how the Picteus application may be extended, both graphically and through automated processing.

# logDimensions
This showcases a command which takes 1 or multiple images, and which computes and logs their dimensions, which are visible in the bottom status bar of the application.

# convert
This showcases how easy it is to expose a command taking 1 or multiples images, and which resizes and changes their format.

# askForSomething
This showcases how to submit to the user a form asking for some inputs and depending on the answer to output another form customized with the value of the previous inputs.

# dialog
This showcases how to submit to the user a dialog box displaying image thumbnails, plus additional HTML content depending on the answer to a first submitted form.

# ui
This showcases how to submit and open to the user various User Interfaces (UI):
- a modal,
- a sidebar,
- a sidebar with opens an external window,
- an external window.

The content of the opened UI is either taken from a URL or taken as an HTML content.

# show
This showcases how to open a specific element to the user:
- a sidebar,
- an extension settings dialog box,
- an image detail page,
- a repository popup window.

# readFile
This showcases how to ask the user to pick a file with a given extension and to have access to its content.

# writeFile
This showcases how to ask the user to pick a file with a suggested name and extension and to write some content in it.

# notification
This showcases how to submit to the user a notification, which may be native — i.e. displayed at the level of the Operating System (OS) — or may be it displayed in the notifications center of the application.

# application
This showcases how to open an application within a dialog box, exposed by the extension. That application is self-contained within a zip file, which contains a single HTML file interacting with the Picteus back-end server via its web services, captured via OpenAPI specifications.
