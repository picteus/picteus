import { Communicator, NotificationEvent, NotificationValue, PicteusExtension } from "@picteus/extension-sdk";


class TypeScriptExtension extends PicteusExtension
{

  protected async onEvent(communicator: Communicator, event: string, value: NotificationValue): Promise<any>
  {
    if (event === NotificationEvent.ImageCreated || event === NotificationEvent.ImageUpdated || event === NotificationEvent.ImageDeleted)
    {
      const imageId: string = value["id"];
      communicator.sendLog(`The image with id '${imageId}' was touched`, "info");
    }
    else if (event === NotificationEvent.ImageRunCommand)
    {
      const commandId: string = value["commandId"];
      const imageIds: string[] = value["imageIds"];
      const parameters: Record<string, any> = value["parameters"];
      communicator.sendLog(`Received an image command with id '${commandId}' for the image with ids '${imageIds}' and parameters '${JSON.stringify(parameters)}'`, "debug");
    }
  }

}

new TypeScriptExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
