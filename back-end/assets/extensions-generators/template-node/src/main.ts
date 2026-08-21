import { CommandParameters, Communicator, PicteusExtension } from "@picteus/extension-sdk";


class TypeScriptExtension extends PicteusExtension
{

  protected async onImageCreated(communicator: Communicator, imageId: string): Promise<void>
  {
    this.onImageTouched(communicator, imageId);
  }

  protected async onImageUpdated(communicator: Communicator, imageId: string): Promise<void>
  {
    this.onImageTouched(communicator, imageId);
  }

  protected async onImageDeleted(communicator: Communicator, imageId: string): Promise<void>
  {
    this.onImageTouched(communicator, imageId);
  }

  protected async onImagesCommand(communicator: Communicator, commandId: string, imageIds: string[], parameters: CommandParameters): Promise<void>
  {
    communicator.sendLog(`Received an image command with id '${commandId}' for the image with ids [${imageIds.join(", ")}] and parameters ${JSON.stringify(parameters)}`, "debug");
  }

  private onImageTouched(communicator: Communicator, imageId: string): void
  {
    communicator.sendLog(`The image with id '${imageId}' was touched`, "info");
  }

}

new TypeScriptExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
