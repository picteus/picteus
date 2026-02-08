import {
  ApplicationMetadata,
  Communicator,
  GenerationRecipe,
  Helper,
  type ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageMetadata,
  NotificationEvent,
  NotificationsDialogType,
  NotificationValue,
  PicteusExtension,
  PromptKind,
  Repository,
  SettingsValue
} from "@picteus/extension-sdk";

import {
  Configuration,
  type GetStyleTransferTaskStatus200Response,
  ImageUpscalerApi,
  ImageUpscaleRequestContentEngineEnum,
  ImageUpscaleRequestContentOptimizedForEnum,
  ImageUpscaleRequestContentScaleFactorEnum
} from "./generated";


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
      communicator.sendLog(`The repository '${name}' is available`, "info");
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
    else if (event === NotificationEvent.ImageRunCommand)
    {
      const commandId: string = value["commandId"];
      const imageIds: string[] = value["imageIds"];
      const parameters: Record<string, any> = value["parameters"];
      if (commandId === "magnifyImage")
      {
        await this.magnifyImages(communicator, parameters, imageIds);
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

  private async magnifyImages(communicator: Communicator, parameters: Record<string, any>, imageIds: string[]): Promise<void>
  {
    if ((await this.checkFreepikApiKey(communicator)) === false)
    {
      return;
    }
    const upscalerApi = new ImageUpscalerApi(new Configuration({ apiKey: this.freepikApiKey }));
    for (const imageId of imageIds)
    {
      // We retrieve the original image
      const blob = await this.getImageApi().imageDownload({
        id: imageId,
        stripMetadata: true
      });

      interface GenerationParameters
      {
        engine?: ImageUpscaleRequestContentEngineEnum;
        scaleFactor?: ImageUpscaleRequestContentScaleFactorEnum;
        optimizedFor?: ImageUpscaleRequestContentOptimizedForEnum;
        creativity?: number;
        hdr?: number;
        resemblance?: number;
        fractality?: number;
        prompt?: string;
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      const engine: ImageUpscaleRequestContentEngineEnum | undefined = parameters["engine"];
      const scaleFactor: ImageUpscaleRequestContentScaleFactorEnum | undefined = parameters["scaleFactor"];
      const optimizedFor: ImageUpscaleRequestContentOptimizedForEnum | undefined = parameters["optimizedFor"];
      const creativity: number | undefined = parameters["creativity"];
      const hdr: number | undefined = parameters["hdr"];
      const resemblance: number | undefined = parameters["resemblance"];
      const fractality: number | undefined = parameters["fractality"];
      const prompt: string | undefined = parameters["prompt"] === "" ? undefined : parameters["prompt"];
      const generationParameters: GenerationParameters =
        {
          engine,
          scaleFactor,
          optimizedFor,
          creativity,
          hdr,
          resemblance,
          fractality,
          prompt
        };
      const extractGeneratedUrls = (response: GetStyleTransferTaskStatus200Response): string[] =>
      {
        const status = response.data.status;
        if (status !== "COMPLETED" && status !== "FAILED")
        {
          return undefined;
        }
        else
        {
          return status === "FAILED" ? null : response.data.generated;
        }
      };
      const processImageUrls = async (taskId: string, urls: string[] | null): Promise<void> =>
      {
        if (urls === null)
        {
          // The processing generated an error
          await communicator.launchIntent<boolean>({
            dialog:
              {
                type: NotificationsDialogType.Error,
                title: "Generation error",
                description: "The image generation failed for an unknown error",
                details: "If this extension is not buggy, the issue comes the Freepik API server.",
                buttons: { yes: "OK" }
              }
          });
        }
        else
        {
          const downloadImageUrl = async (url: string): Promise<Blob> =>
          {
            // We fetch the generated image
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return new Blob([arrayBuffer], {});

          };
          const handleImageUrl = async (index: number | undefined, url: string): Promise<void> =>
          {
            const blob = await downloadImageUrl(url);
            const recipe: GenerationRecipe =
              {
                schemaVersion: Helper.GENERATION_RECIPE_SCHEMA_VERSION,
                modelTags: [`magnifik/${engine}`],
                software: "picteus",
                inputAssets: [imageId],
                url,
                prompt:
                  {
                    kind: PromptKind.Instructions,
                    value: generationParameters
                  }

              };
            const applicationMetadata: ApplicationMetadata =
              {
                items: [
                  {
                    extensionId: this.extensionId,
                    value: recipe
                  }
                ]
              };
            const image = await this.getRepositoryApi().repositoryStoreImage({
              id: this.repository!.id,
              nameWithoutExtension: `${taskId}${index === undefined ? "" : `-${index}`}`,
              parentId: imageId,
              applicationMetadata: JSON.stringify(applicationMetadata),
              sourceUrl: url,
              body: blob
            });
            await this.getImageApi().imageSetTags({
              id: image.id,
              extensionId: this.extensionId,
              requestBody: [this.extensionId]
            });
            const imageFeature: Array<ImageFeature> =
              [
                {
                  type: ImageFeatureType.Recipe,
                  format: ImageFeatureFormat.Json,
                  value: JSON.stringify(recipe)
                }
              ];
            if (prompt !== undefined)
            {
              imageFeature.push(
                {
                  type: ImageFeatureType.Description,
                  format: ImageFeatureFormat.String,
                  name: "prompt",
                  value: prompt
                }
              );
            }
            await this.getImageApi().imageSetFeatures({
              id: image.id,
              extensionId: this.extensionId,
              imageFeature
            });
          };

          for (let index = 0; index < urls.length; index++)
          {
            const url = urls[index];
            this.logger.info(`Handling the generated image with URL '${url}'`);
            await handleImageUrl(urls.length === 1 ? undefined : index, url);
          }
        }
      };

      this.logger.info("Running the Magnific model on the image with id '${imageId}'");
      const postResponse: GetStyleTransferTaskStatus200Response = await upscalerApi.v1AiImageUpscalerPost({
        imageUpscaleRequestContent: {
          image: buffer.toString("base64"), ...generationParameters
        }
      });
      {
        const urls = extractGeneratedUrls(postResponse);
        if (urls !== undefined)
        {
          await processImageUrls(postResponse.data.taskId, urls);
        }
        else
        {
          const interval = setInterval(async () =>
          {
            const idGetResponse: GetStyleTransferTaskStatus200Response = await upscalerApi.v1AiImageUpscalerTaskIdGet({ taskId: postResponse.data.taskId });
            const urls = extractGeneratedUrls(idGetResponse);
            if (urls !== undefined)
            {
              clearInterval(interval);
              await processImageUrls(idGetResponse.data.taskId, urls);
            }
          }, 1_000);
        }
      }
    }
  }

  private async checkFreepikApiKey(_communicator: Communicator): Promise<boolean>
  {
    return this.freepikApiKey !== undefined;
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
