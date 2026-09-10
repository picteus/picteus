# Summary
This extension provides a collection of utility operations for managing, transforming, annotating, and analyzing images stored in Picteus image repositories.

It adds the following capabilities:
- converting selected images between common image formats — including JPEG, PNG, WebP, GIF, AVIF, and HEIF — with optional metadata stripping and dimensional resizing ;
- rating images on a 1 to 5 scale and attaching free-form text comments, stored natively as image features ;
- tagging images interactively through an embedded graphical user interface with tag autocompletion and batch assignment ;
- computing collection analytics, generating distribution pie charts and historical trend line charts for selected tags.

# Commands

## convert
Converts one or multiple selected images into a target file format, with optional resizing and metadata removal, and saves the resulting images in the original image repository.

- `Format`: target image format (`jpeg`, `png`, `webp`, `gif`, `avif`, or `heif`).
- `Strip metadata?`: whether embedded EXIF and format metadata are stripped from the converted images.
- `Width`: optional target width in pixels. If omitted, the original image width is preserved.
- `Height`: optional target height in pixels. If omitted, the original image height is preserved.
- `Resize Render`: determines how the image is fitted when width or height is specified — either `inbox` (constrains dimensions inside the bounding box while maintaining aspect ratio) or `outbox`.

1. For each selected image, Picteus renders the converted image via the image service according to the selected format, dimensions, and metadata options.
2. If dimensional resizing (`Width` or `Height`) is requested, `Strip metadata?` must be enabled. If metadata stripping is disabled when specifying dimensions, an error dialog is presented and conversion stops.
3. Recipe metadata associated with the original image is preserved when converting to PNG or JPEG formats.
4. The converted image is added to the repository as a child of the original image (`parentId` set to the source image identifier).
5. Upon completion, an image preview dialog displays the converted images.

## rateAndComment
Enables users to assign a star rating and an optional textual comment to each selected image.

1. When invoked on one or more selected images, the command iterates through each image and presents an execution form dialog displaying the current image context.
2. The form provides the following input fields:
   - `Rating`: an integer rating from 1 to 5 presented as radio buttons. Defaults to the image's existing rating, or 3 if unrated.
   - `Comment`: a multi-line text area of up to 1,024 characters for descriptive notes or reviews. Defaults to any existing comment previously saved.
3. Ratings are saved as an image feature of type `Annotation` with the name `"Rating"`.
4. Non-empty comments are saved as an image feature of type `Comment` with the name `"Comment"`.
5. Cancelling the form for an image terminates processing without modifying remaining unsubmitted images.

## tag
Opens an embedded interactive tagging interface within a dialog box to inspect, assign, and manage tags across selected images.

1. When triggered on selected images, the extension serves an embedded web application bundle inside a modal dialog.
2. The user interface displays:
   - visual thumbnail cards for all selected images ;
   - existing tags assigned to each individual image ;
   - an input field with autocompletion based on known repository tags, enabling batch addition of tags to all selected images simultaneously ;
   - individual tag controls on each image card to remove or add specific tags.
3. Tag modifications are submitted directly to the Picteus back-end REST API and synchronized with the repository.

## analytics
Computes and visualizes the statistical breakdown and temporal distribution of selected tags across an entire image collection.

- `Collection`: the image collection whose images will be analyzed.
- `Tags`: the list of tag identifiers to analyze and compare.

1. The command queries the repository API for all images in the specified collection.
2. It aggregates tag counts across all matching images and computes two distinct analytical visualizations:
   - **Tag Distribution**: a standalone SVG pie chart illustrating the proportional distribution of the specified tags throughout the collection ;
   - **Historical Breakdown**: a standalone SVG multi-line trend chart depicting the monthly occurrence count of each tag over time, organized by image creation date.
3. The generated charts and interactive color-coded legends are presented directly inside an informational dialog box.
