import * as path from "node:path";
import * as fs from "node:fs";

import AdmZip from "adm-zip";
import { ApiError, GenerateContentResponse, GoogleGenAI } from "@google/genai";

import {
  type ApplicationMetadata,
  type CommandParameters,
  Communicator,
  type GenerationRecipe,
  Helper,
  ImageFeatureFormat,
  ImageFeatureType,
  IntentShowType,
  IntentToastType,
  PicteusExtension,
  PromptKind,
  type Repository,
  type SettingsValue
} from "@picteus/extension-sdk";


class GeminiExtension extends PicteusExtension
{

  private geminiApiKey: string;

  private repository?: Repository;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    this.setup(await this.getSettings());
    await this.ensureRepository(communicator);
    try
    {
      await this.installChromeExtension();
    }
    catch (error)
    {
      communicator?.sendLog(`Could not install the Chrome extension. Reason: '${error.message}'`, "error");
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
    await this.getImageApi().imageSetTags({
      id: imageId,
      extensionId: this.extensionId,
      requestBody: hasMatchingSoftwareMetadata === false ? [] : [ this.extensionId ]
    });
  }

  private async generateImage(communicator: Communicator, parameters: Record<string, any>, imageIds?: string[]): Promise<void>
  {
    if ((await this.checkGeminiApiKey(communicator)) === false)
    {
      return await communicator.launchIntent({
        toast: {
          type: IntentToastType.Cancel,
          subtitle: "The Gemini API key is not defined"
        }
      });
    }
    const ai = new GoogleGenAI({ apiKey: this.geminiApiKey });
    const model: string = parameters["model"];
    const aspectRatio: string = parameters["aspectRatio"];
    const prompt: string = parameters["prompt"];
    communicator.sendLog(`Asking Gemini to generate an image with prompt '${prompt}'`, "debug");
    const milliseconds = Date.now();
    const contents: any[] = [ { text: prompt } ];
    if (imageIds !== undefined)
    {
      for (const imageId of imageIds)
      {
        const blob = await this.getImageApi().imageDownload({
          id: imageId,
          format: "PNG",
          stripMetadata: true,
          width: 1_024,
          height: 1_024
        });
        const buffer = Buffer.from(await blob.arrayBuffer());
        contents.push({ inlineData: { mimeType: "image/png", data: buffer.toString("base64") } });
      }
    }
    let response: GenerateContentResponse;
    try
    {
      response = await ai.models.generateContent({
        model,
        contents,
        config: { candidateCount: 1, imageConfig: { aspectRatio } }
      });
    }
    catch (error)
    {
      const apiError = error as ApiError;
      let subtitle = apiError.message;
      if (apiError.status === 400)
      {
        try
        {
          const jsonError = JSON.parse(error.message).error;
          subtitle = jsonError.message;
          if (jsonError?.details.filter((detail: {
            reason?: string
          }) => detail.reason === "API_KEY_INVALID").length > 0)
          {
            subtitle = "The Gemini API key is invalid: cannot generate an image!";
          }
        }
        catch (innerError)
        {
          // We take the default message
        }
      }
      return await communicator.launchIntent({
        toast: {
          type: IntentToastType.Error,
          subtitle
        }
      });
    }
    const candidate = response.candidates[0];
    communicator.sendLog(`Gemini responded in ${Date.now() - milliseconds} ms with ${candidate.content.parts.length} part(s)`, "debug");
    for (const part of candidate.content.parts)
    {
      if (part.text !== undefined)
      {
        this.logger.debug(part.text);
      }
      else if (part.inlineData !== undefined)
      {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        const blob = new Blob([ buffer ], {});
        const aspectRatioTokens = aspectRatio.split(":");
        const numericAspectRatio = Number.parseFloat(aspectRatioTokens[0]) / Number.parseFloat(aspectRatioTokens[1]);
        const recipe: GenerationRecipe =
          {
            schemaVersion: Helper.GENERATION_RECIPE_SCHEMA_VERSION,
            modelTags: [ `google/${model}` ],
            software: PicteusExtension.SOFTWARE,
            aspectRatio: Number.parseFloat(numericAspectRatio.toFixed(4)),
            prompt: { kind: PromptKind.Textual, text: prompt }
          };
        if (imageIds !== undefined)
        {
          recipe.inputAssets = imageIds;
        }
        const applicationMetadata: ApplicationMetadata = {
          items: [ {
            extensionId: this.extensionId,
            value: recipe
          } ]
        };
        const image = await this.getRepositoryApi().repositoryStoreImage({
          id: this.repository!.id,
          nameWithoutExtension: part.inlineData.displayName,
          parentId: imageIds?.length === 1 ? imageIds[0] : undefined,
          applicationMetadata: JSON.stringify(applicationMetadata),
          body: blob
        });
        await this.getImageApi().imageSetTags({
          id: image.id,
          extensionId: this.extensionId,
          requestBody: [ this.extensionId ]
        });
        await this.getImageApi().imageSetFeatures({
          id: image.id,
          extensionId: this.extensionId,
          imageFeature:
            [
              {
                type: ImageFeatureType.Recipe,
                format: ImageFeatureFormat.Json,
                value: JSON.stringify(recipe)
              },
              {
                type: ImageFeatureType.Description,
                format: ImageFeatureFormat.String,
                name: "prompt",
                value: prompt
              }
            ]
        });
        await communicator.launchIntent({
          images: {
            images: [ { imageId: image.id, dialogContent: { title: image.name, description: prompt } } ],
            dialogContent:
              {
                title: "Generated Images",
                description: "These are generated images",
                details: `part.text=${part.text}\npart.inlineData.displayName=${part.inlineData.displayName}\npart.inlineData.mimeType=${part.inlineData.mimeType}\n`
              }
          }
        });
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
          manifest["action"]["default_title"] = JSON.stringify({
            webServicesBaseUrl: this.webServicesBaseUrl,
            apiKey: this.apiKey
          });
          newZip.addFile(entryName.substring(entryPrefix.length), Buffer.from(JSON.stringify(manifest)));
        }

        const buffer: Buffer = await newZip.toBufferPromise();
        const blob = new Blob([ Buffer.from(buffer) ]);
        await this.getExtensionApi().extensionInstallChromeExtension({
          id: this.extensionId,
          chromeExtensionName: "Picteus Gemini",
          body: blob
        });
        break;
      }
    }
  }

  private async checkGeminiApiKey(communicator: Communicator): Promise<boolean>
  {
    if (this.geminiApiKey === undefined)
    {
      let value: SettingsValue;
      try
      {
        value = await communicator.launchIntent({
          show: {
            type: IntentShowType.ExtensionSettings,
            id: this.extensionId
          }
        });
      }
      catch (error)
      {
        // The user has cancelled
        return false;
      }
      this.setup(value);
    }
    return true;
  }

  private setup(value: SettingsValue): void
  {
    this.geminiApiKey = value["apiKey"];
  }

  private async ensureRepository(communicator?: Communicator): Promise<void>
  {
    const name = PicteusExtension.getManifest().name;
    this.repository = await this.getRepositoryApi().repositoryEnsure({
      technicalId: this.extensionId,
      name,
      comment: `The ${name} repository`,
      watch: true
    });
    communicator.sendLog(`The repository '${name}' is available`, "info");
  }

}

new GeminiExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
