import * as fs from "node:fs";
import * as path from "node:path";

import AdmZip from "adm-zip";

import {
  type ApplicationMetadata,
  type CommandParameters,
  Communicator,
  type GenerationRecipe,
  Helper,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  IntentShowType,
  IntentToastType,
  PicteusExtension,
  PromptKind,
  type Repository,
  type SettingsValue
} from "@picteus/extension-sdk";

import { GeminiClient, type GenerateImageResult, type ReferenceImage } from "./geminiClient.js";


class GeminiExtension extends PicteusExtension
{

  private geminiApiKey?: string;

  private geminiClient?: GeminiClient;

  private repository?: Repository;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    this.setup(await this.getSettings());
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

  protected async onSettings(_communicator: Communicator, value: SettingsValue): Promise<void>
  {
    this.setup(value);
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

  protected async onImagesCommand(communicator: Communicator, commandId: string, imageIds: string[], parameters: CommandParameters): Promise<void>
  {
    if (commandId === "modify")
    {
      await this.generateImage(communicator, parameters, imageIds);
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
    const metadata = await this.getImageApi().imageGetMetadata({ id: imageId });
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

    const model: string = parameters["model"];
    const aspectRatio: string = parameters["aspectRatio"];
    const prompt: string = parameters["prompt"];
    communicator.sendLog(`Asking Gemini to generate an image with prompt '${prompt}'`, "debug");

    const referenceImages: ReferenceImage[] = [];
    if (imageIds !== undefined)
    {
      for (const imageId of imageIds)
      {
        const edge = 1_024;
        const blob: Blob = await this.getImageApi().imageDownload(
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

      await this.getImageApi().imageSetTags(
        {
          id: image.id,
          extensionId: this.extensionId,
          requestBody: [ this.extensionId ]
        }
      );

      await this.getImageApi().imageSetFeatures(
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
                  details: `It was generated through the '${model}' model with the ${aspectRatio} aspect ratio.`
                }
            }
        }
      );
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
      this.setup(value);
    }
    return this.geminiClient !== undefined;
  }

  private setup(value: SettingsValue): void
  {
    this.geminiApiKey = value["apiKey"];
    this.geminiClient = this.geminiApiKey === undefined ? undefined : new GeminiClient(this.geminiApiKey);
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
