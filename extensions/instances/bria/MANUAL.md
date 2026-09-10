# Summary
This extension connects Picteus with the [Bria AI RMBG v1.4](https://huggingface.co/briaai/RMBG-1.4) deep learning model, providing automated background removal on images running entirely on local hardware.

It provides the following capabilities:
- isolating foreground subjects and removing backgrounds from selected images with high accuracy ;
- generating transparent PNG images preserving the original aspect ratio and resolution ;
- storing the generated background-less images directly in the source repository as children of the original images, maintaining full lineage ;
- recording generation recipes containing model provenance (`briaai/RMBG-1.4`) directly into the image features and metadata ;
- displaying the newly created background-less images in an interactive preview dialog upon completion.

The extension executes locally via Python and PyTorch. Model weights are retrieved from Hugging Face on initial execution and cached locally in the Picteus extension cache directory, allowing all subsequent background removal tasks to operate completely offline.

# Prerequisites
An active internet connection is required during the initial execution to download the [Bria AI RMBG v1.4](https://huggingface.co/briaai/RMBG-1.4) model weights from Hugging Face into the local extension cache. Once downloaded, the model operates completely offline without external network dependencies.

# Commands

## removeBackground
Isolates the foreground subject and removes the background from one or multiple selected images using the local Bria RMBG-1.4 segmentation model.

1. When invoked on one or more selected images, the command processes each image sequentially through the Bria AI segmentation pipeline.
2. The image is downloaded from the repository in PNG format and passed to the neural network pipeline, which extracts the foreground subject and produces a transparent PNG.
3. The background-less image is stored in the same repository as the source image, with `_backgroundless` appended to the original filename and the parent relationship preserved (`parentId` linked to the original image).
4. A generation recipe documenting the model identifier (`briaai/RMBG-1.4`), input image asset, and aspect ratio is attached to the new image as a `Recipe` image feature and embedded in application metadata.
5. Once all selected images are processed, a "Background-less images" dialog box opens, displaying the newly generated transparent images.
