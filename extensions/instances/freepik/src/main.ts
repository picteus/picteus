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
  GetStyleTransferTaskStatus200Response,
  ImageExpandApi,
  ImageUpscalerApi,
  ImageUpscaleRequestContentEngineEnum,
  ImageUpscaleRequestContentOptimizedForEnum,
  ImageUpscaleRequestContentScaleFactorEnum
} from "./generated";


interface FreepikGenerationParameters
{
  model: string;
  prompt?: string;
}

interface FreepikApiInvoker
{

  computeGenerationParameters(parameters: Record<string, any>): FreepikGenerationParameters;

  post(generationParameters: FreepikGenerationParameters, buffer: Buffer): Promise<GetStyleTransferTaskStatus200Response>;

  idGet(taskId: string): Promise<GetStyleTransferTaskStatus200Response>;

}

class UpscaleInvoker
  implements FreepikApiInvoker
{

  private readonly api: ImageUpscalerApi;

  constructor(freepikApiKey: string)
  {
    this.api = new ImageUpscalerApi(new Configuration({ apiKey: freepikApiKey }));
  }

  computeGenerationParameters(parameters: Record<string, any>): FreepikGenerationParameters
  {
    const engine: ImageUpscaleRequestContentEngineEnum = parameters["engine"];
    const scaleFactor: ImageUpscaleRequestContentScaleFactorEnum = parameters["scaleFactor"];
    const optimizedFor: ImageUpscaleRequestContentOptimizedForEnum = parameters["optimizedFor"];
    const creativity: number = parameters["creativity"];
    const hdr: number = parameters["hdr"];
    const resemblance: number = parameters["resemblance"];
    const fractality: number = parameters["fractality"];
    const prompt: string | undefined = parameters["prompt"] === "" ? undefined : parameters["prompt"];

    interface UpscaleGenerationParameters
      extends FreepikGenerationParameters
    {
      engine?: ImageUpscaleRequestContentEngineEnum;
      scaleFactor?: ImageUpscaleRequestContentScaleFactorEnum;
      optimizedFor?: ImageUpscaleRequestContentOptimizedForEnum;
      creativity?: number;
      hdr?: number;
      resemblance?: number;
      fractality?: number;
    }

    return {
      prompt,
      model: `magnifik/${engine}`,
      engine,
      scaleFactor,
      optimizedFor,
      creativity,
      hdr,
      resemblance,
      fractality
    } as UpscaleGenerationParameters;
  }

  async post(generationParameters: FreepikGenerationParameters, buffer: Buffer): Promise<GetStyleTransferTaskStatus200Response>
  {
    return await this.api.v1AiImageUpscalerPost({
      imageUpscaleRequestContent: {
        image: buffer.toString("base64"), ...generationParameters
      }
    });
  }

  async idGet(taskId: string): Promise<GetStyleTransferTaskStatus200Response>
  {
    return await this.api.v1AiImageUpscalerTaskIdGet({ taskId });
  }

}

class ExpandInvoker
  implements FreepikApiInvoker
{

  private readonly api: ImageExpandApi;

  constructor(freepikApiKey: string)
  {
    this.api = new ImageExpandApi(new Configuration({ apiKey: freepikApiKey }));
  }

  computeGenerationParameters(parameters: Record<string, any>): FreepikGenerationParameters
  {
    const left: number = parameters["left"];
    const right: number = parameters["right"];
    const top: number = parameters["top"];
    const bottom: number = parameters["bottom"];
    const prompt: string | undefined = parameters["prompt"] === "" ? undefined : parameters["prompt"];

    interface ExpandGenerationParameters
      extends FreepikGenerationParameters
    {
      left: number;
      right: number;
      top: number;
      bottom: number;
    }

    return {
      prompt,
      model: `black-forest-labs/fluxpro`,
      left,
      right,
      top,
      bottom
    } as ExpandGenerationParameters;
  }

  async post(generationParameters: FreepikGenerationParameters, buffer: Buffer): Promise<GetStyleTransferTaskStatus200Response>
  {
    return await this.api.v1AiImageExpandFluxProPost({
      imageExpandRequest: {
        image: buffer.toString("base64"), ...generationParameters
      }
    });
  }

  async idGet(taskId: string): Promise<GetStyleTransferTaskStatus200Response>
  {
    return await this.api.v1AiImageExpandFluxProTaskIdGet({ taskId });
  }

}

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
        await this.processImages(communicator, parameters, imageIds, new UpscaleInvoker(this.freepikApiKey));
      }
      else if (commandId === "expandImage")
      {
        await this.processImages(communicator, parameters, imageIds, new ExpandInvoker(this.freepikApiKey));
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

  private async processImages(communicator: Communicator, parameters: Record<string, any>, imageIds: string[], invoker: FreepikApiInvoker): Promise<void>
  {
    if ((await this.checkFreepikApiKey(communicator)) === false)
    {
      return;
    }
    const processImageUrls = async (imageId: string, taskId: string, generationParameters: FreepikGenerationParameters, urls: string[] | null): Promise<void> =>
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
              modelTags: [generationParameters.model],
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
                value: generationParameters.prompt
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
    for (const imageId of imageIds)
    {
      // We retrieve the original image
      const blob = await this.getImageApi().imageDownload({
        id: imageId,
        stripMetadata: true
      });

      const buffer = Buffer.from(await blob.arrayBuffer());
      const generationParameters: FreepikGenerationParameters = invoker.computeGenerationParameters(parameters);
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

      communicator.sendLog(`Running a processing via Freepik on the image with id '${imageId}'`, "info");
      const postResponse: GetStyleTransferTaskStatus200Response = await invoker.post(generationParameters, buffer);
      {
        const urls = extractGeneratedUrls(postResponse);
        const taskId = postResponse.data.taskId;
        if (urls !== undefined)
        {
          await processImageUrls(imageId, taskId, generationParameters, urls);
        }
        else
        {

          const checkAndProcess = async () =>
          {
            communicator.sendLog(`Checking for the Freepik processing with id '${taskId}'`, "debug");
            const idGetResponse: GetStyleTransferTaskStatus200Response = await invoker.idGet(taskId);
            const urls = extractGeneratedUrls(idGetResponse);
            if (urls !== undefined)
            {
              await processImageUrls(imageId, taskId, generationParameters, urls);
            }
            else
            {
              setTimeout(checkAndProcess, 1_000);
            }
          };
          await checkAndProcess();
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
