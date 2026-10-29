import * as fs from "node:fs";
import * as path from "node:path";

import AdmZip from "adm-zip";

import {
  type AiModel,
  type ApplicationMetadata,
  type CommandParameters,
  Communicator,
  type ComputeImageCaption,
  type ComputeImageEligibleTags,
  type GenerationRecipe,
  GenerationRecipeFromJSON,
  Helper,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageResizeRender,
  IntentShowType,
  IntentToastType,
  PicteusExtension,
  PromptKind,
  type Repository,
  type SettingsValue
} from "@picteus/extension-sdk";

import { GeminiClient, GeminiError, type GenerateImageResult, type ReferenceImage } from "./geminiClient.js";


class GeminiExtension extends PicteusExtension
{

  private geminiApiKey?: string;

  private maximumTokens?: number;

  private geminiClient?: GeminiClient;

  private repository?: Repository;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    await this.setup(communicator, await this.getSettings());
    await this.ensureRepository(communicator);
    try
    {
      await this.installChromeExtension();
    }
    catch (error: unknown)
    {
      communicator?.sendLog(`Could not install the Chrome extension. Reason: '${error instanceof Error ? error.message : String(error)}'`, "error");
    }
  }

  protected async onSettings(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    await this.setup(communicator, value);
    communicator.sendLog(`The ${this.toString()} settings updated`, "info");
  }

  protected async onImageCreated(_communicator: Communicator, imageId: string): Promise<void>
  {
    await this.computeTags(imageId);
  }

  protected async onImageUpdated(_communicator: Communicator, imageId: string): Promise<void>
  {
    await this.computeTags(imageId);
  }

  protected async onComputeImageTags(_communicator: Communicator, imageId: string): Promise<void>
  {
    await this.computeTags(imageId);
  }

  protected async onComputeImageEligibleTags(communicator: Communicator, imageId: string, eligibleTags: ComputeImageEligibleTags[]): Promise<void>
  {
    if (this.geminiClient === undefined)
    {
      communicator.sendLog("Gemini API key is not configured: skipping eligible tags computation", "warn");
      return;
    }

    const imageBase64: string = await this.downloadImageAsBase64Jpeg(imageId);
    const collectedTags: string[] = [];
    let hasComputedSuccessfully: boolean = false;

    for (const eligibleTag of eligibleTags)
    {
      const model: string = eligibleTag.aiModel.technicalId;
      communicator.sendLog(`Evaluating image against ${eligibleTag.tags.length} candidate tag(s) using model '${model}'…`, "info");

      try
      {
        const result = await this.geminiClient.extractTags(
          {
            model: model,
            imageBase64: imageBase64,
            tags: eligibleTag.tags,
            promptTemplate: eligibleTag.question,
            maxTokens: this.maximumTokens
          }
        );
        hasComputedSuccessfully = true;

        if (result.tags.length > 0)
        {
          communicator.sendLog(`Auto-tagging completed in ${result.durationInMilliseconds} ms. Selected ${result.tags.length} tag(s): [${result.tags.join(", ")}]`, "info");
          collectedTags.push(...result.tags);
        }
        else
        {
          communicator.sendLog(`Auto-tagging completed in ${result.durationInMilliseconds} ms. No candidate tags matched the image content.`, "info");
        }
      }
      catch (error: unknown)
      {
        communicator.sendLog(`Failed to compute tags for the image with model '${model}'. Reason: ${error instanceof Error ? error.message : String(error)}`, "error");
      }
    }

    if (hasComputedSuccessfully === true)
    {
      const uniqueTags: string[] = Array.from(new Set(collectedTags));
      await this.getImageApi().imageSetTags(
        {
          id: imageId,
          extensionId: this.extensionId,
          requestBody: uniqueTags
        }
      );
      communicator.sendLog(`Updated tags for image '${imageId}'`, "info");
    }
  }

  protected async onComputeImageCaptions(communicator: Communicator, imageId: string, captions: ComputeImageCaption[]): Promise<void>
  {
    if (this.geminiClient === undefined)
    {
      communicator.sendLog("Gemini API key is not configured: skipping image captions computation", "warn");
      return;
    }

    const imageBase64: string = await this.downloadImageAsBase64Jpeg(imageId);
    const generatedFeatures: Array<{ name: string; value: string }> = [];

    for (const caption of captions)
    {
      const model: string = caption.aiModel.technicalId;
      const question: string = caption.question;
      communicator.sendLog(`Generating caption for image '${imageId}' using model '${model}'…`, "info");

      try
      {
        const result = await this.geminiClient.generateChatCompletion(
          {
            model: model,
            prompt: question,
            imageBase64: imageBase64,
            maxTokens: this.maximumTokens
          }
        );

        communicator.sendLog(`The generated caption took ${result.durationInMilliseconds} ms and returned the response '${result.content}'`, "debug");

        if (result.content.length > 0)
        {
          generatedFeatures.push(
            {
              name: model,
              value: result.content
            }
          );
        }
      }
      catch (error: unknown)
      {
        if (error instanceof GeminiError && error.isApiKeyInvalid === true)
        {
          this.geminiClient = undefined;
        }
        communicator.sendLog(`Failed to compute caption for the image with model '${model}'. Reason: ${error instanceof Error ? error.message : String(error)}`, "error");
      }
    }

    if (generatedFeatures.length > 0)
    {
      await this.getImageApi().imageEnsureFeatures(
        {
          id: imageId,
          extensionId: this.extensionId,
          imageFeature: generatedFeatures.map(
            (feature) =>
            {
              return {
                type: ImageFeatureType.Caption,
                format: ImageFeatureFormat.String,
                name: feature.name,
                value: feature.value
              };
            }
          )
        }
      );
      communicator.sendLog(`Updated ${generatedFeatures.length} caption feature(s) for image '${imageId}'`, "info");
    }
  }

  protected async onImagesCommand(communicator: Communicator, commandId: string, imageIds: string[], parameters: CommandParameters): Promise<void>
  {
    if (commandId === "modify")
    {
      await this.generateImage(communicator, parameters, imageIds);
    }
    else if (commandId === "reindexFromApplicationMetadata")
    {
      await this.reindexFromApplicationMetadata(communicator, imageIds);
    }
  }

  protected async onProcessCommand(communicator: Communicator, commandId: string, parameters: CommandParameters): Promise<void>
  {
    if (commandId === "generate")
    {
      await this.generateImage(communicator, parameters);
    }
  }

  private async computeTags(imageId: string): Promise<void>
  {
    const metadata = await this.getImageApi().imageGetMetadata(
      {
        id: imageId
      }
    );
    let hasMatchingSoftwareMetadata: boolean = false;
    if (metadata.all !== undefined)
    {
      const json = JSON.parse(metadata.all);
      hasMatchingSoftwareMetadata = json["Software"] === "Picasa" || json["Credit"] === "Made with Google AI";
    }
    await this.getImageApi().imageSetTags(
      {
        id: imageId,
        extensionId: this.extensionId,
        requestBody: hasMatchingSoftwareMetadata === false ? [] : [ this.extensionId ]
      }
    );
  }

  private async generateImage(communicator: Communicator, parameters: CommandParameters, imageIds?: string[]): Promise<void>
  {
    if ((await this.checkGeminiApiKey(communicator)) === false || this.geminiClient === undefined)
    {
      return await communicator.launchIntent<void>(
        {
          toast:
            {
              type: IntentToastType.Cancel,
              subtitle: "The Gemini API key is not defined"
            }
        }
      );
    }

    const model: string = String(parameters["model"]);
    const aspectRatio: string = String(parameters["aspectRatio"]);
    const prompt: string = String(parameters["prompt"]);
    communicator.sendLog(`Asking Gemini to generate an image with prompt '${prompt}'`, "debug");

    const referenceImages: ReferenceImage[] = [];
    if (imageIds !== undefined)
    {
      for (const imageId of imageIds)
      {
        const edge = 1_024;
        const blob = await this.getImageApi().imageDownload(
          {
            id: imageId,
            format: ImageFormat.Png,
            stripMetadata: true,
            width: edge,
            height: edge
          }
        );
        const buffer = Buffer.from(await blob.arrayBuffer());
        referenceImages.push(
          {
            data: buffer.toString("base64"),
            mimeType: "image/png"
          }
        );
      }
    }

    let result: GenerateImageResult;
    try
    {
      result = await this.geminiClient.generateImage({ model, prompt, aspectRatio, referenceImages });
    }
    catch (error: unknown)
    {
      const subtitle = error instanceof Error ? error.message : String(error);
      return await communicator.launchIntent<void>(
        {
          toast:
            {
              type: IntentToastType.Error,
              subtitle: subtitle
            }
        }
      );
    }

    communicator.sendLog(`Gemini responded in ${result.durationInMilliseconds} ms with ${result.totalPartsCount} part(s)`, "debug");

    for (const generatedImage of result.images)
    {
      const buffer = Buffer.from(generatedImage.data, "base64");
      const blob = new Blob([ buffer ], {});
      const aspectRatioTokens = aspectRatio.split(":");
      const numericAspectRatio = Number.parseFloat(aspectRatioTokens[0]) / Number.parseFloat(aspectRatioTokens[1]);
      const recipe: GenerationRecipe =
        {
          schemaVersion: Helper.GENERATION_RECIPE_SCHEMA_VERSION,
          modelTags: [ `google/${model}` ],
          software: PicteusExtension.SOFTWARE,
          aspectRatio: Number.parseFloat(numericAspectRatio.toFixed(4)),
          prompt:
            {
              kind: PromptKind.Textual,
              text: prompt
            }
        };

      if (imageIds !== undefined)
      {
        recipe.inputAssets = imageIds;
      }

      const applicationMetadata: ApplicationMetadata =
        {
          items: [
            {
              extensionId: this.extensionId,
              value: recipe
            }
          ]
        };

      const image = await this.getRepositoryApi().repositoryStoreImage(
        {
          id: this.repository!.id,
          nameWithoutExtension: generatedImage.displayName,
          parentId: imageIds?.length === 1 ? imageIds[0] : undefined,
          applicationMetadata: JSON.stringify(applicationMetadata),
          body: blob
        }
      );

      await this.getImageApi().imageEnsureTags(
        {
          id: image.id,
          extensionId: this.extensionId,
          requestBody: [ this.extensionId ]
        }
      );

      await this.getImageApi().imageEnsureFeatures(
        {
          id: image.id,
          extensionId: this.extensionId,
          imageFeature: [
            {
              type: ImageFeatureType.Recipe,
              format: ImageFeatureFormat.Json,
              value: JSON.stringify(recipe)
            }
          ]
        }
      );

      await communicator.launchIntent<void>(
        {
          images:
            {
              images: [
                {
                  imageId: image.id,
                  details:
                    {
                      title: image.name,
                      description: prompt
                    }
                }
              ],
              content:
                {
                  title: "Generated Images",
                  subtitle: "1 generated image",
                  description: "This is the generated image.",
                  details: `It was generated through the \`${model}\` model with the ${aspectRatio} aspect ratio, from the following prompt:\n*${prompt.split("\n").map(line => `> ${line}`).join("\n")}`
                }
            }
        }
      );
    }
  }

  private async reindexFromApplicationMetadata(communicator: Communicator, imageIds: string[]): Promise<void>
  {
    for (const imageId of imageIds)
    {
      const imageMetadata = await this.getImageApi().imageGetMetadata({ id: imageId });
      const targetPrinterMetadataRaw = JSON.parse(imageMetadata.all)["TargetPrinter"];
      if (targetPrinterMetadataRaw !== undefined)
      {
        const targetPrinterMetadata = JSON.parse(targetPrinterMetadataRaw);
        const picteusMetadataItems = targetPrinterMetadata["picteus"];
        if (picteusMetadataItems !== undefined)
        {
          const picteusMetadata: Array<{
            extensionId: string,
            value: GenerationRecipe
          }> = picteusMetadataItems["items"];
          for (const picteusMetadatum of picteusMetadata)
          {
            if (picteusMetadatum.extensionId === this.extensionId)
            {
              const tags = await this.getImageApi().imageGetTags({ extensionId: this.extensionId, id: imageId });
              if (tags.filter(tag => tag === this.extensionId).length === 0)
              {
                const features = await this.getImageApi().imageGetFeatures({
                  extensionId: this.extensionId,
                  id: imageId
                });
                const recipe = features.find(feature => feature.type === ImageFeatureType.Recipe);
                if (recipe === undefined)
                {
                  communicator.forEntity({ type: "image", id: imageId });
                  communicator.sendLog(`Reverting the recipe`, "debug");
                  const metadataRecipe = GenerationRecipeFromJSON(picteusMetadatum.value);
                  await this.getImageApi().imageEnsureFeatures(
                    {
                      id: imageId,
                      extensionId: this.extensionId,
                      imageFeature: [
                        {
                          type: ImageFeatureType.Recipe,
                          format: ImageFeatureFormat.Json,
                          value: JSON.stringify(metadataRecipe)
                        }
                      ]
                    }
                  );
                  await this.getImageApi().imageEnsureTags(
                    {
                      id: imageId,
                      extensionId: this.extensionId,
                      requestBody: [ this.extensionId ]
                    }
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  private async installChromeExtension(): Promise<void>
  {
    const distributionDirectoryPath = path.join(PicteusExtension.getExtensionHomeDirectoryPath(), "dist");
    const fileNames = fs.readdirSync(distributionDirectoryPath);
    for (const fileName of fileNames)
    {
      if (fileName.endsWith(".zip") === true)
      {
        this.logger.debug("Repackaging the Chrome extension");
        // We need a fresh new zip to avoid issues with AdmZip when modifying entries
        const newZip: AdmZip = new AdmZip();
        {
          const zip: AdmZip = new AdmZip(fs.readFileSync(path.join(distributionDirectoryPath, fileName)));
          // We add all existing entries
          const entryPrefix = "package/";
          const entryName = `${entryPrefix}manifest.json`;
          for (const entry of zip.getEntries())
          {
            if (entry.entryName !== entryName)
            {
              newZip.addFile(entry.entryName.substring(entryPrefix.length), entry.getData(), entry.comment, entry.attr);
            }
          }
          const entry = zip.getEntry(entryName);
          const manifest = JSON.parse(entry.getData().toString("utf-8"));
          manifest["action"]["default_title"] = JSON.stringify(
            {
              webServicesBaseUrl: this.webServicesBaseUrl,
              apiKey: this.apiKey
            }
          );
          newZip.addFile(entryName.substring(entryPrefix.length), Buffer.from(JSON.stringify(manifest)));
        }

        const buffer: Buffer = await newZip.toBufferPromise();
        const blob = new Blob([ Buffer.from(buffer) ]);
        await this.getExtensionApi().extensionInstallChromeExtension(
          {
            id: this.extensionId,
            chromeExtensionName: "Picteus Gemini",
            body: blob
          }
        );
        break;
      }
    }
  }

  private async sendAvailableAiModels(communicator?: Communicator): Promise<void>
  {
    if (this.geminiClient !== undefined)
    {
      const modelDetails = await this.geminiClient.getAvailableModelDetails();
      const retrievedModels: AiModel[] = modelDetails.map(
        (detail) =>
        {
          return {
            technicalId: detail.id,
            name: detail.name ?? detail.id,
            comment: detail.comment
          };
        }
      );

      if (retrievedModels.length > 0)
      {
        await this.getExtensionApi().extensionSetAiModels(
          {
            id: this.extensionId,
            aiModel: retrievedModels
          }
        );
        communicator?.sendLog(`Registered ${retrievedModels.length} Gemini AI model(s) from the Gemini API`, "info");
      }
    }
  }

  private async downloadImageAsBase64Jpeg(imageId: string): Promise<string>
  {
    const edge: number = 1_024;
    const blob = await this.getImageApi().imageDownload(
      {
        id: imageId,
        format: ImageFormat.Jpeg,
        width: edge,
        height: edge,
        resizeRender: ImageResizeRender.Outbox,
        stripMetadata: true
      }
    );
    const arrayBuffer: ArrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString("base64");
  }

  private async checkGeminiApiKey(communicator: Communicator): Promise<boolean>
  {
    if (this.geminiClient === undefined)
    {
      let value: SettingsValue;
      try
      {
        value = await communicator.launchIntent<SettingsValue>(
          {
            show:
              {
                type: IntentShowType.ExtensionSettings,
                id: this.extensionId
              }
          }
        );
      }
      catch (error: unknown)
      {
        // The user has cancelled
        return false;
      }
      await this.setup(communicator, value);
    }
    return this.geminiClient !== undefined;
  }

  private async setup(communicator: Communicator | undefined, value: SettingsValue): Promise<void>
  {
    this.geminiApiKey = value["apiKey"];
    this.maximumTokens = value["maximumTokens"];

    if (typeof this.geminiApiKey === "string" && this.geminiApiKey.length > 0)
    {
      this.geminiClient = new GeminiClient(this.geminiApiKey);
    }
    else
    {
      this.geminiClient = undefined;
    }

    try
    {
      await this.sendAvailableAiModels(communicator);
    }
    catch (error: unknown)
    {
      const errorMessage = error instanceof Error ? error.message : String(error);
      communicator?.sendLog(`Could not fetch the models dynamically from the Gemini API. Reason: '${errorMessage}'`, "warn");
    }
  }

  private async ensureRepository(communicator?: Communicator): Promise<void>
  {
    const name = PicteusExtension.getManifest().name;
    this.repository = await this.getRepositoryApi().repositoryEnsure(
      {
        technicalId: this.extensionId,
        name: name,
        comment: `The ${name} repository`,
        watch: true
      }
    );
    communicator?.sendLog(`The repository '${name}' is available`, "info");
  }

}

new GeminiExtension().run().catch((error: unknown) =>
{
  console.error(error);
  throw error;
});
