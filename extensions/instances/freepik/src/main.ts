import {
  Communicator,
  ImageMetadata,
  NotificationEvent,
  NotificationValue,
  PicteusExtension,
  Repository,
  SettingsValue
} from "@picteus/extension-sdk";

import { Configuration, ResourcesApi, SearchResourcesOrderEnum } from "./generated";


class FreepikExtension extends PicteusExtension
{

  private freepikApiKey: string;

  private repository?: Repository;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    await this.setup(await this.getSettings());
    const ensureRepository = async (): Promise<void> =>
    {
      const name = PicteusExtension.getManifest().name;
      this.repository = await this.getRepositoryApi().repositoryEnsure({
        technicalId: this.extensionId,
        name,
        comment: `The ${name} repository`,
        watch: true
      });
      communicator.sendLog(`The repository '${name}' was created`, "info");
    };
    await ensureRepository();
  }

  protected async onSettings(_communicator: Communicator, value: SettingsValue): Promise<void>
  {
    await this.setup(value);
  }

  protected async onEvent(communicator: Communicator, event: string, value: NotificationValue): Promise<any>
  {
    if (event === NotificationEvent.ImageCreated || event === NotificationEvent.ImageUpdated || event === NotificationEvent.ImageComputeTags)
    {
      const imageId: string = value["id"];
      const metadata = await this.getImageApi().imageGetMetadata({ id: imageId });
      await this.computeTags(imageId, metadata);
    }
    else if (event === NotificationEvent.ProcessRunCommand)
    {
      const commandId: string = value["commandId"];
      const parameters: Record<string, any> = value["parameters"];
      // The OpenAPI YAML specifications file has been retrieved from https://docs.freepik.com/authentication
      const response = await new ResourcesApi(new Configuration({ apiKey: this.freepikApiKey })).searchResources({
        order: SearchResourcesOrderEnum.Recent,
        filters: { contentType: { photo: 1 }, author: 1 }
      });
      for (const datum of response.data)
      {
        this.logger.debug(`Found ${datum.id} ${datum.url} ${datum.image.type}`);
      }
    }
  }

  private async computeTags(imageId: string, metadata: ImageMetadata): Promise<void>
  {
    let hasMatchingMakeMetadata: boolean = false;
    if (metadata.all !== undefined)
    {
      hasMatchingMakeMetadata = JSON.parse(metadata.all)["Make"] === "Ideogram AI";
    }
    await this.getImageApi().imageSetTags({
      id: imageId,
      extensionId: this.extensionId,
      requestBody: hasMatchingMakeMetadata === false ? [] : [this.extensionId]
    });
  }

  private async setup(value: SettingsValue): Promise<void>
  {
    this.freepikApiKey = value["apiKey"]!;
  }

}

new FreepikExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
